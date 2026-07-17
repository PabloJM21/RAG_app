
import time

from itertools import cycle
from openai import OpenAI, APIError, RateLimitError, AuthenticationError, APITimeoutError

from app.rag_apis.model_enums import CHAT_SUBCATEGORIES, MODEL_CONTEXT_LENGTHS, DEFAULT_CONTEXT_LENGTH, CONTEXT_RESERVE
from loguru import logger as AgentLogger
from app.rag_services.helpers import ExtractionError


# ============================================================
# Token estimation
# ============================================================

def _estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token (conservative for multilingual)."""
    return max(1, len(text) // 3)


def _truncate_history(
    system_prompt: str,
    history: list[dict],
    user_prompt: str,
    context_limit: int,
) -> list[dict]:
    """
    Drop oldest history messages (in user/assistant pairs) until the total
    estimated token count fits within context_limit - CONTEXT_RESERVE.
    Always keeps the most recent pairs.
    """
    budget = context_limit - CONTEXT_RESERVE
    # Account for system + user prompt first
    used = _estimate_tokens(system_prompt) + _estimate_tokens(user_prompt)

    if used >= budget:
        # Even without history we're close to the limit — return empty history
        AgentLogger.warning(
            "System+user prompt already near context limit; dropping all history",
            extra={"estimated_tokens": used, "budget": budget},
        )
        return []

    # Walk history from newest to oldest, accumulate tokens, keep what fits
    kept: list[dict] = []
    for msg in reversed(history):
        msg_tokens = _estimate_tokens(msg.get("content", ""))
        if used + msg_tokens > budget:
            break
        kept.append(msg)
        used += msg_tokens

    kept.reverse()
    dropped = len(history) - len(kept)
    if dropped:
        AgentLogger.warning(
            "History truncated to fit context window",
            extra={"dropped_messages": dropped, "kept_messages": len(kept),
                   "estimated_tokens": used, "context_limit": context_limit},
        )
    return kept




# # ============================================================
# # Chat Models and Categorization
# # ============================================================
# class ChatModels(str, Enum):
#     LLAMA_3_1_8B_RAG = "meta-llama-3.1-8b-rag"
#     LLAMA_3_1_8B_INSTRUCT = "meta-llama-3.1-8b-instruct"
#     LLAMA_3_3_70B_INSTRUCT = "llama-3.3-70b-instruct"
#     GEMMA_3_27B_IT = "gemma-3-27b-it"
#     MEDGEMMA_27B_IT = "medgemma-27b-it"
#     QWEN3_32B = "qwen3-32b"
#     QWEN3_235B_A22B = "qwen3-235b-a22b"
#     QWEN3_OMNI_30B_A3B = "Qwen3-Omni-30B-A3B-Instruct"
#     DEEPSEEK_R1 = "deepseek-r1"
#     QWQ_32B = "qwq-32b"
#     OPENAI_GPT_OSS_120B = "openai-gpt-oss-120b"
#     MISTRAL_LARGE_INSTRUCT = "mistral-large-instruct"
#     QWEN_OMNI_INSTRUCT = "Qwen3-Omni-30B-A3B-Instruct"
#
#
# MODEL_PRIORITY = {
#     "reasoner": [
#         ChatModels.LLAMA_3_3_70B_INSTRUCT,
#         ChatModels.QWEN3_235B_A22B,
#         ChatModels.DEEPSEEK_R1,
#         ChatModels.QWEN3_OMNI_30B_A3B,
#     ],
#     "generator": [
#         ChatModels.LLAMA_3_1_8B_INSTRUCT,
#         ChatModels.GEMMA_3_27B_IT,
#         ChatModels.QWQ_32B,
#     ],
#     "classifier": [
#         ChatModels.MISTRAL_LARGE_INSTRUCT,
#         ChatModels.QWEN3_32B,
#         ChatModels.LLAMA_3_1_8B_RAG,
#     ],
#     "thinker": [
#         ChatModels.OPENAI_GPT_OSS_120B,
#         ChatModels.MEDGEMMA_27B_IT,
#         ChatModels.QWEN_OMNI_INSTRUCT,
#     ],
# }
# ============================================================
# API KEYS
# ============================================================

"""
load_dotenv()
FIRST_API_KEY = os.getenv("API_KEY")

API_KEYS = [k for k in [
    FIRST_API_KEY,
    os.getenv("ALT_KEY_1"),
    os.getenv("ALT_KEY_2"),
] if k]

BASE_API = os.getenv("BASE_API", "https://chat-ai.academiccloud.de/v1/")
"""


# ============================================================
# Configuration
# ============================================================

MAX_RETRIES = 1  # reduced from 3 — fail fast and switch model/key sooner


# ============================================================
# Client Builder
# ============================================================
def make_client(api_key: str, base_api: str) -> OpenAI:
    return OpenAI(api_key=api_key, base_url=base_api, timeout=60.0)


# ============================================================
# Chat Orchestrator
# ============================================================
class ChatOrchestrator:
    def __init__(self, base_api: str, user_key_list: list[str]):
        self.key_cycle = cycle(user_key_list)
        self.base_api = base_api
        self.max_retries = MAX_RETRIES
        AgentLogger.info("ChatOrchestrator initialized", extra={"available_keys": len(user_key_list)})

    def _safe_call(self, client, model, messages, model_queue, failure_count, retry_num=0):
        """Execute one chat completion call safely with retry and rotation handling.

        Returns:
            str: model response content on success.

        Raises:
            ExtractionError: when all recovery attempts fail.
        """
        AgentLogger.debug("Invoking model", extra={"model": model.value, "api_key": client.api_key[:6]})

        try:
            response = client.chat.completions.create(
                model=model.value,
                messages=messages,
                temperature=0.05,
                top_p=0.1,
            )
            AgentLogger.success("Model response received", extra={"model": model.value})

            if not response.choices or not response.choices[0].message:
                AgentLogger.error("Empty or malformed response", extra={"model": model.value})
                raise ExtractionError("Empty or malformed response", status_code=502)

            return response.choices[0].message.content

        # -----------------------------
        # AUTHENTICATION ERRORS
        # -----------------------------
        except AuthenticationError as e:
            AgentLogger.error("Unauthorized (401)", extra={"error": str(e), "api_key": client.api_key[:6]})
            failure_count[client.api_key] = failure_count.get(client.api_key, 0) + 1

            if failure_count[client.api_key] >= 3:
                AgentLogger.warning("Switching API key after repeated 401", extra={"api_key": client.api_key[:6]})
                try:
                    next_key = next(self.key_cycle)
                    return self._safe_call(
                        make_client(next_key, self.base_api),
                        model,
                        messages,
                        model_queue,
                        failure_count,
                        retry_num,
                    )
                except ExtractionError:
                    raise
                except Exception as inner_e:
                    AgentLogger.error("Failed to rotate key after auth error", extra={"error": str(inner_e)})
                    raise ExtractionError(
                        f"Failed to rotate key after auth error: {str(inner_e)}",
                        status_code=401,
                    ) from inner_e
            else:
                AgentLogger.warning("Retrying same key once more", extra={"api_key": client.api_key[:6]})
                time.sleep(1)
        # -----------------------------
        # RATE LIMITS
        # -----------------------------
        except RateLimitError as e:
            AgentLogger.warning("Rate limit hit — switching model", extra={"error": str(e)})

            # Skip straight to the next model rather than sleeping and retrying
            if model_queue:
                next_model = model_queue.pop(0)
                AgentLogger.warning("Switching to next model after rate limit", extra={"next_model": next_model.value})
                return self._safe_call(client, next_model, messages, model_queue, failure_count, 0)

            # No more models — try rotating the API key as a last resort
            try:
                next_key = next(self.key_cycle)
                return self._safe_call(
                    make_client(next_key, self.base_api),
                    model,
                    messages,
                    model_queue,
                    failure_count,
                    0,
                )
            except ExtractionError:
                raise
            except Exception as inner_e:
                AgentLogger.error("Failed after rate-limit recovery", extra={"error": str(inner_e)})
                raise ExtractionError(
                    f"Failed after rate-limit recovery: {str(inner_e)}",
                    status_code=429,
                ) from inner_e

        # -----------------------------
        # TIMEOUTS
        # -----------------------------
        except APITimeoutError as e:
            AgentLogger.warning("Timeout — switching model", extra={"model": model.value})

            if model_queue:
                next_model = model_queue.pop(0)
                AgentLogger.warning("Switching to next model after timeout", extra={"next_model": next_model.value})
                return self._safe_call(client, next_model, messages, model_queue, failure_count, 0)

            # No more models — try once more with a key rotation
            if retry_num < self.max_retries:
                time.sleep(2)
                try:
                    next_key = next(self.key_cycle)
                    return self._safe_call(
                        make_client(next_key, self.base_api),
                        model,
                        messages,
                        model_queue,
                        failure_count,
                        retry_num + 1,
                    )
                except ExtractionError:
                    raise
                except Exception as inner_e:
                    raise ExtractionError("Timeout recovery failed", status_code=504) from inner_e

            raise ExtractionError("All models timed out", status_code=504)

        # -----------------------------
        # OTHER API ERRORS
        # -----------------------------
        except APIError as e:
            status = getattr(e, "status_code", None)
            # Log a short message — no raw API error body in the log
            AgentLogger.warning(
                "API error — trying next model",
                extra={"status": status, "model": model.value},
            )

            if status in (500, 502, 503, 504):
                if retry_num < self.max_retries:
                    time.sleep(2)
                    return self._safe_call(client, model, messages, model_queue, failure_count, retry_num + 1)
                elif model_queue:
                    next_model = model_queue.pop(0)
                    AgentLogger.warning("Switching to next model", extra={"next_model": next_model.value})
                    return self._safe_call(client, next_model, messages, model_queue, failure_count, 0)
                else:
                    raise ExtractionError("All models returned server errors", status_code=502) from e

            elif status == 401:
                try:
                    next_key = next(self.key_cycle)
                    return self._safe_call(
                        make_client(next_key, self.base_api),
                        model,
                        messages,
                        model_queue,
                        failure_count,
                        0,
                    )
                except ExtractionError:
                    raise
                except Exception as inner_e:
                    raise ExtractionError("Auth failure — no valid key", status_code=401) from inner_e

            else:
                # 404 (model not found) and other client errors — skip to next model
                if model_queue:
                    next_model = model_queue.pop(0)
                    AgentLogger.warning(
                        "Skipping unavailable model",
                        extra={"failed_model": model.value, "next_model": next_model.value, "status": status},
                    )
                    return self._safe_call(client, next_model, messages, model_queue, failure_count, 0)
                raise ExtractionError(f"All models exhausted (status {status})", status_code=status or 500) from e

        except ExtractionError:
            raise

        except Exception as e:
            AgentLogger.warning("Unexpected error — retrying", extra={"model": model.value})

            if retry_num < self.max_retries:
                time.sleep(1)
                return self._safe_call(client, model, messages, model_queue, failure_count, retry_num + 1)

            raise ExtractionError("Unexpected error — retries exhausted", status_code=500) from e
    # ========================================================
    # User-Facing Methods
    # ========================================================
    def call(self, label: str, system_prompt: str, user_prompt: str):
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        AgentLogger.info("Starting chat", extra={"label": label})
        return self._run(label, messages)

    def call_with_history(self, label: str, system_prompt: str, history: list, user_prompt: str):
        AgentLogger.info("Starting chat with history", extra={"label": label, "history_len": len(history)})
        return self._run(label, system_prompt=system_prompt, history=history, user_prompt=user_prompt)

    def _run(self, label, messages=None, *, system_prompt=None, history=None, user_prompt=None):
        if label not in CHAT_SUBCATEGORIES:
            AgentLogger.error("Unknown model label", extra={"label": label})
            raise ValueError(f"Unknown model label: {label}")

        # Build the primary model queue from the requested label.
        primary_queue = CHAT_SUBCATEGORIES[label].copy()

        # Build a fallback queue from all other named labels (skip explicit single-model entries).
        NAMED_LABELS = {"coder", "thinker", "classifier", "generator", "reasoner"}
        seen_models = set(primary_queue)
        fallback_queue: list = []
        for other_label in NAMED_LABELS:
            if other_label == label:
                continue
            for model in CHAT_SUBCATEGORIES.get(other_label, []):
                if model not in seen_models:
                    fallback_queue.append(model)
                    seen_models.add(model)

        full_queue = primary_queue + fallback_queue
        current_model = full_queue.pop(0)
        failure_count = {}

        # Resolve context limit for current model
        context_limit = MODEL_CONTEXT_LENGTHS.get(current_model.value, DEFAULT_CONTEXT_LENGTH)

        # Build final message list, truncating history if needed
        if messages is not None:
            # Called from call() — no history to truncate
            final_messages = messages
        else:
            # Called from call_with_history()
            truncated_history = _truncate_history(
                system_prompt or "",
                history or [],
                user_prompt or "",
                context_limit,
            )
            final_messages = (
                [{"role": "system", "content": system_prompt}]
                + truncated_history
                + [{"role": "user", "content": user_prompt}]
            )

        api_key = next(self.key_cycle)
        client = make_client(api_key, self.base_api)
        AgentLogger.debug(
            "Running model pipeline",
            extra={"label": label, "current_model": current_model.value,
                   "total_candidates": len(full_queue) + 1}
        )
        return self._safe_call(client, current_model, final_messages, full_queue, failure_count)


# ============================================================
# Example Usage
# ============================================================
if __name__ == "__main__":
    orchestrator = ChatOrchestrator()

    AgentLogger.info("=== Simple Reasoner Call (OpenAI client) ===")
    result = orchestrator.call(
        label="reasoner",
        system_prompt="You are an HPC reasoning assistant.",
        user_prompt="Explain how workspace allocation works on the cluster.",
    )
    print(result)

    AgentLogger.info("=== Chat with History (OpenAI client) ===")
    history = [
        {"role": "user", "content": "Hi"},
        {"role": "assistant", "content": "Hello! How can I help you today?"},
    ]
    result = orchestrator.call_with_history(
        label="generator",
        system_prompt="You are a helpful HPC assistant.",
        history=history,
        user_prompt="Generate a short guide on using SLURM partitions.",
    )
    print(result)
