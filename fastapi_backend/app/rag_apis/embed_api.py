import os
import json
import asyncio
import httpx
import numpy as np
from datetime import datetime, timedelta
from itertools import cycle
from httpx import HTTPStatusError, RequestError

from src.RAG_project.apis.model_enums import EMBEDDING_SUBCATEGORIES
from loguru import logger as AgentLogger

from dotenv import load_dotenv
# -------------------------------------------------
# Config
# -------------------------------------------------
BASE_API = os.getenv("BASE_API", "https://chat-ai.academiccloud.de/v1")
TIMEOUT = httpx.Timeout(60.0, connect=10.0, read=60.0, write=10.0)

load_dotenv()
FIRST_API_KEY = os.getenv("API_KEY")

API_KEYS = [k for k in [
    FIRST_API_KEY,
    os.getenv("ALT_KEY_1"),
    os.getenv("ALT_KEY_2"),
] if k]

MAX_RETRIES = 5
RATE_LIMIT_BEHAVIOR = {"minute": "sleep", "hour": "switch", "day": "switch"}


# -------------------------------------------------
# Helpers
# -------------------------------------------------
def parse_rate_headers(headers):
    parsed = {}
    for k, v in headers.items():
        kl = k.lower()
        if "ratelimit" in kl:
            try:
                parsed[kl] = int(v)
            except ValueError:
                continue
    if "ratelimit-remaining" in parsed and "x-ratelimit-remaining-minute" not in parsed:
        parsed["x-ratelimit-remaining-minute"] = parsed["ratelimit-remaining"]
    if "ratelimit-reset" in parsed and "x-ratelimit-reset-minute" not in parsed:
        parsed["x-ratelimit-reset-minute"] = parsed["ratelimit-reset"]
    return parsed


def decide_action(rate_headers):
    remaining = {
        "minute": rate_headers.get("x-ratelimit-remaining-minute"),
        "hour": rate_headers.get("x-ratelimit-remaining-hour"),
        "day": rate_headers.get("x-ratelimit-remaining-day"),
    }
    reset = {
        "minute": rate_headers.get("x-ratelimit-reset-minute", rate_headers.get("ratelimit-reset")),
        "hour": rate_headers.get("x-ratelimit-reset-hour", rate_headers.get("ratelimit-reset")),
        "day": rate_headers.get("x-ratelimit-reset-day", rate_headers.get("ratelimit-reset")),
    }

    for scope, remain in remaining.items():
        if remain is not None and remain <= 0:
            return scope, RATE_LIMIT_BEHAVIOR.get(scope, "sleep"), reset.get(scope, 60)
    return None, None, None


# -------------------------------------------------
# Embedding Orchestrator
# -------------------------------------------------
class EmbeddingOrchestrator:
    def __init__(self):
        self.key_cycle = cycle(API_KEYS)
        self.max_retries = MAX_RETRIES
        AgentLogger.info("EmbeddingOrchestrator initialized", extra={"keys": len(API_KEYS)})

    async def _safe_call(self, client, api_key, model, inputs, model_queue, failure_count, retry_num=0):
        url = f"{BASE_API.rstrip('/')}/embeddings"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {"model": model.value, "input": inputs, "encoding_format": "float"}

        AgentLogger.debug("Calling embedding API", extra={"model": model.value, "key": api_key[:6]})
        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json().get("data", [])
            embeds = [d["embedding"] for d in data]

            # rate-limit handling
            rate_headers = parse_rate_headers(resp.headers)
            scope, action, reset = decide_action(rate_headers)
            if action == "sleep":
                reset = min(reset or 60, 60)
                AgentLogger.warning("Rate limit reached, sleeping", extra={"scope": scope, "seconds": reset})
                await asyncio.sleep(reset)
            elif action == "switch":
                AgentLogger.warning("Rate limit — switching key", extra={"scope": scope})
                next_key = next(self.key_cycle)
                return await self._safe_call(client, next_key, model, inputs, model_queue, failure_count)

            AgentLogger.success("Embedding retrieved successfully", extra={"model": model.value})
            return np.array(embeds, dtype=np.float32)

        except HTTPStatusError as e:
            code = e.response.status_code
            if code in (401, 403):
                AgentLogger.error("Unauthorized key", extra={"key": api_key[:6]})
                next_key = next(self.key_cycle)
                return await self._safe_call(client, next_key, model, inputs, model_queue, failure_count)
            if code == 429 or code >= 500:
                if retry_num < self.max_retries:
                    AgentLogger.warning("Retrying embedding call", extra={"code": code, "retry": retry_num})
                    await asyncio.sleep(2 ** retry_num)
                    return await self._safe_call(client, api_key, model, inputs, model_queue, failure_count, retry_num + 1)
                else:
                    AgentLogger.error("Max retries exceeded — switching model")
                    if model_queue:
                        next_model = model_queue.pop(0)
                        return await self._safe_call(client, api_key, next_model, inputs, model_queue, failure_count)
                    raise RuntimeError(f"Model {model.value} failed repeatedly.")
            raise

        except RequestError as e:
            AgentLogger.warning("Network error", extra={"error": repr(e)})
            if retry_num < self.max_retries:
                await asyncio.sleep(2 ** retry_num)
                return await self._safe_call(client, api_key, model, inputs, model_queue, failure_count, retry_num + 1)
            raise

        except Exception as e:
            AgentLogger.error("Unexpected error", extra={"error": repr(e), "model": model.value})
            if model_queue:
                next_model = model_queue.pop(0)
                return await self._safe_call(client, api_key, next_model, inputs, model_queue, failure_count)
            raise

    async def get_embedding(self, inputs, label="embeddings"):
        """Get embeddings for given inputs (uses model queue for the specified label)."""
        if isinstance(inputs, str):
            inputs = [inputs]

        if label not in EMBEDDING_SUBCATEGORIES:
            AgentLogger.error("Unknown embedding label", extra={"label": label})
            raise ValueError(f"Unknown embedding label: {label}")

        model_queue = EMBEDDING_SUBCATEGORIES[label].copy()
        current_model = model_queue.pop(0)
        failure_count = {}
        api_key = next(self.key_cycle)

        AgentLogger.debug("Running embedding pipeline", extra={"label": label, "model": current_model.value})
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            return await self._safe_call(client, api_key, current_model, inputs, model_queue, failure_count)


# -------------------------------------------------
# Example usage
# -------------------------------------------------
if __name__ == "__main__":
    async def main():
        orchestrator = EmbeddingOrchestrator()
        texts = ["The quick brown fox jumps over the lazy dog."]
        embeddings = await orchestrator.get_embedding(texts, label="embeddings")
        print("Embedding shape:", embeddings.shape)
        print("First 5 dims:", embeddings[0][:5])

    asyncio.run(main())
