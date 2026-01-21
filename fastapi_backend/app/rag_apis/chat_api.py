import os
import time
from enum import Enum
from itertools import cycle
from openai import OpenAI, APIError, RateLimitError, AuthenticationError, APITimeoutError

from app.rag_apis.model_enums import CHAT_SUBCATEGORIES
from loguru import logger as AgentLogger

from dotenv import load_dotenv

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

MAX_RETRIES = 3


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
        """Execute one chat completion call safely with retry and rotation handling."""
        AgentLogger.debug("Invoking model", extra={"model": model.value, "api_key": client.api_key[:6]})

        try:
            response = client.chat.completions.create(
                model=model.value,
                messages=messages,
                temperature=0.05,
                top_p=0.1,
            )
            AgentLogger.success("Model response received", extra={"model": model.value})
            return response.choices[0].message.content

        # -----------------------------
        # AUTHENTICATION ERRORS
        # -----------------------------
        except AuthenticationError as e:
            AgentLogger.error("Unauthorized (401)", extra={"error": str(e), "api_key": client.api_key[:6]})
            failure_count[client.api_key] = failure_count.get(client.api_key, 0) + 1
            if failure_count[client.api_key] >= 3:
                AgentLogger.warning("Switching API key after repeated 401", extra={"api_key": client.api_key[:6]})
                next_key = next(self.key_cycle)
                return self._safe_call(make_client(next_key, self.base_api), model, messages, model_queue, failure_count)
            else:
                AgentLogger.warning("Retrying same key once more", extra={"api_key": client.api_key[:6]})
                time.sleep(2)
                return self._safe_call(client, model, messages, model_queue, failure_count)

        # -----------------------------
        # RATE LIMITS
        # -----------------------------
        except RateLimitError as e:
            AgentLogger.warning("Rate limit hit — sleeping briefly", extra={"error": str(e)})
            time.sleep(10)
            if retry_num < self.max_retries:
                return self._safe_call(client, model, messages, model_queue, failure_count, retry_num + 1)
            next_key = next(self.key_cycle)
            return self._safe_call(make_client(next_key, self.base_api), model, messages, model_queue, failure_count)

        # -----------------------------
        # TIMEOUTS
        # -----------------------------
        except APITimeoutError as e:
            AgentLogger.warning("Timeout occurred", extra={"error": str(e)})
            if retry_num < self.max_retries:
                time.sleep(5)
                return self._safe_call(client, model, messages, model_queue, failure_count, retry_num + 1)
            next_key = next(self.key_cycle)
            AgentLogger.warning("Switching key after repeated timeout", extra={"next_key": next_key[:6]})
            return self._safe_call(make_client(next_key, self.base_api), model, messages, model_queue, failure_count)

        # -----------------------------
        # OTHER ERRORS
        # -----------------------------
        except APIError as e:
            status = getattr(e, "status_code", None)
            AgentLogger.error("API error", extra={"status": status, "error": str(e)})
            if status in (500, 502, 503, 504):
                if retry_num < self.max_retries:
                    time.sleep(5)
                    return self._safe_call(client, model, messages, model_queue, failure_count, retry_num + 1)
                elif model_queue:
                    next_model = model_queue.pop(0)
                    AgentLogger.warning("Switching to next model", extra={"next_model": next_model.value})
                    return self._safe_call(client, next_model, messages, model_queue, failure_count)
                else:
                    raise
            elif status == 401:
                return self._safe_call(make_client(next(self.key_cycle), self.base_api), model, messages, model_queue, failure_count)
            else:
                raise

        except Exception as e:
            AgentLogger.error("Unexpected error", extra={"error": str(e)})
            if retry_num < self.max_retries:
                time.sleep(3)
                return self._safe_call(client, model, messages, model_queue, failure_count, retry_num + 1)
            raise

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
        messages = [{"role": "system", "content": system_prompt}] + history + [
            {"role": "user", "content": user_prompt}
        ]
        AgentLogger.info("Starting chat with history", extra={"label": label, "history_len": len(history)})
        return self._run(label, messages)

    def _run(self, label, messages):
        if label not in CHAT_SUBCATEGORIES:
            AgentLogger.error("Unknown model label", extra={"label": label})
            raise ValueError(f"Unknown model label: {label}")

        model_queue = CHAT_SUBCATEGORIES[label].copy()
        current_model = model_queue.pop(0)
        failure_count = {}

        api_key = next(self.key_cycle)
        client = make_client(api_key, self.base_api)
        AgentLogger.debug("Running model pipeline", extra={"label": label, "current_model": current_model.value})
        return self._safe_call(client, current_model, messages, model_queue, failure_count)


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
