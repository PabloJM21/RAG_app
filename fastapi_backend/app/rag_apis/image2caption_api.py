
import os
import asyncio
import base64
import httpx
import json
from datetime import datetime, timedelta
from itertools import cycle
from app.rag_apis.model_enums import MULTIMODAL_SUBCATEGORIES
from app.rag_services.helpers import ExtractionError
from loguru import logger as AgentLogger

# ───────────────────────────────────────────────
# Config
# ───────────────────────────────────────────────
BASE_API = os.getenv("BASE_API", "https://chat-ai.academiccloud.de/v1")
TIMEOUT = httpx.Timeout(90.0, connect=10.0, read=90.0, write=10.0)

API_KEYS = [
    k for k in [
        "8790ad23d961a85390befe18a8f92194",
        os.getenv("ALT_KEY_1"),
        os.getenv("ALT_KEY_2"),
    ] if k
]

MAX_RETRIES = 5
RATE_LIMIT_BEHAVIOR = {"minute": "sleep", "hour": "switch", "day": "switch"}


# ───────────────────────────────────────────────
# Helpers
# ───────────────────────────────────────────────
def parse_rate_headers(headers):
    parsed = {}
    for k, v in headers.items():
        kl = k.lower()
        if "ratelimit" in kl:
            try:
                parsed[kl] = int(v)
            except ValueError:
                continue
    if "ratelimit-remaining" in parsed:
        parsed["x-ratelimit-remaining-minute"] = parsed["ratelimit-remaining"]
    if "ratelimit-reset" in parsed:
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





# ───────────────────────────────────────────────
# Multi-Model Vision Client
# ───────────────────────────────────────────────
class MultiModalVisionClient:
    def __init__(self, base_api: str, user_key_list: list[str]):
        self.base_api = base_api
        self.key_cycle = cycle(user_key_list)
        self.max_retries = MAX_RETRIES
        AgentLogger.info("MultiModalVisionClient initialized", extra={"available_keys": len(API_KEYS)})

    async def _safe_call(
            self,
            client: httpx.AsyncClient,
            api_key: str,
            model,
            base64_img: str,
            question: str,
            model_queue,
            failure_count,
            retry_num=0,
            base64_format: str = "png",  # common format of pdf images
    ):
        url = f"{self.base_api.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        messages = [{
            "role": "user",
            "content": [
                {"type": "text", "text": question},
                {"type": "image_url", "image_url": {"url": f"data:image/{base64_format};base64,{base64_img}"}},
            ],
        }]

        body = {"model": model.value, "messages": messages}
        AgentLogger.debug(
            "Calling vision chat API",
            extra={"model": model.value, "key": api_key[:6], "retry": retry_num},
        )

        try:
            resp = await client.post(url, headers=headers, json=body)
            resp.raise_for_status()

            data = resp.json()
            answer = data["choices"][0]["message"]["content"]

            # rate-limit handling
            rate_headers = parse_rate_headers(resp.headers)
            scope, action, reset = decide_action(rate_headers)

            if action == "sleep":
                reset = min(reset or 60, 60)
                AgentLogger.warning(
                    "Rate limit reached, sleeping",
                    extra={"scope": scope, "seconds": reset, "model": model.value, "key": api_key[:6]},
                )
                await asyncio.sleep(reset)

            elif action == "switch":
                AgentLogger.warning(
                    "Rate limit — switching key",
                    extra={"scope": scope, "model": model.value, "key": api_key[:6]},
                )
                next_key = next(self.key_cycle)
                return await self._safe_call(
                    client,
                    next_key,
                    model,
                    base64_img,
                    question,
                    model_queue,
                    failure_count,
                    retry_num=retry_num,
                    base64_format=base64_format,
                )

            AgentLogger.success(
                "Image described successfully",
                extra={"model": model.value, "key": api_key[:6]},
            )
            return answer

        except httpx.HTTPStatusError as e:
            code = e.response.status_code
            response_text = e.response.text[:400] if e.response is not None else None

            AgentLogger.error(
                "Vision HTTP error",
                extra={
                    "code": code,
                    "model": model.value,
                    "key": api_key[:6],
                    "retry": retry_num,
                    "text": response_text,
                },
            )

            if code in (429, 401, 403):
                try:
                    next_key = next(self.key_cycle)
                    await asyncio.sleep(2 ** (retry_num % 4))
                    return await self._safe_call(
                        client,
                        next_key,
                        model,
                        base64_img,
                        question,
                        model_queue,
                        failure_count,
                        retry_num=retry_num,
                        base64_format=base64_format,
                    )
                except ExtractionError:
                    raise
                except Exception as inner_e:
                    raise ExtractionError(
                        f"Failed to recover from vision API auth/rate-limit error {code}: {str(inner_e)}",
                        status_code=429 if code == 429 else code,
                    ) from inner_e

            elif code >= 500:
                if retry_num < self.max_retries:
                    await asyncio.sleep(2 ** retry_num)
                    return await self._safe_call(
                        client,
                        api_key,
                        model,
                        base64_img,
                        question,
                        model_queue,
                        failure_count,
                        retry_num + 1,
                        base64_format=base64_format,
                    )
                else:
                    AgentLogger.error(
                        "Model retry limit exceeded — switching model",
                        extra={"model": model.value, "key": api_key[:6], "code": code},
                    )
                    if model_queue:
                        next_model = model_queue.pop(0)
                        return await self._safe_call(
                            client,
                            api_key,
                            next_model,
                            base64_img,
                            question,
                            model_queue,
                            failure_count,
                            retry_num=0,
                            base64_format=base64_format,
                        )

                    raise ExtractionError(
                        f"Vision model {model.value} failed repeatedly with status {code}: "
                        f"{response_text or str(e)}",
                        status_code=502,
                    ) from e

            raise ExtractionError(
                f"Unhandled vision HTTP error {code}: {response_text or str(e)}",
                status_code=code,
            ) from e

        except httpx.RequestError as e:
            AgentLogger.warning(
                "Network error during vision call",
                extra={"error": repr(e), "model": model.value, "key": api_key[:6], "retry": retry_num},
            )

            if retry_num < self.max_retries:
                await asyncio.sleep(2 ** retry_num)
                return await self._safe_call(
                    client,
                    api_key,
                    model,
                    base64_img,
                    question,
                    model_queue,
                    failure_count,
                    retry_num + 1,
                    base64_format=base64_format,
                )

            raise ExtractionError(
                f"Vision network error after retries: {str(e)}",
                status_code=503,
            ) from e

        except ExtractionError:
            raise

        except (KeyError, IndexError, TypeError, ValueError) as e:
            AgentLogger.error(
                "Malformed vision response",
                extra={"error": repr(e), "model": model.value, "key": api_key[:6], "retry": retry_num},
            )
            raise ExtractionError(
                f"Malformed vision response for model {model.value}: {str(e)}",
                status_code=502,
            ) from e

        except Exception as e:
            AgentLogger.error(
                "Unexpected error during vision call",
                extra={"error": repr(e), "model": model.value, "key": api_key[:6], "retry": retry_num},
            )

            if model_queue:
                next_model = model_queue.pop(0)
                return await self._safe_call(
                    client,
                    api_key,
                    next_model,
                    base64_img,
                    question,
                    model_queue,
                    failure_count,
                    retry_num=0,
                    base64_format=base64_format,
                )

            raise ExtractionError(
                f"Unexpected vision error for model {model.value}: {str(e)}",
                status_code=500,
            ) from e

    async def describe(self, base64_img: str, question: str = "What is in this image?", label: str = "multimodal"):
        """Describe an image using a multimodal model group."""
        if label not in MULTIMODAL_SUBCATEGORIES:
            AgentLogger.error("Unknown multimodal label", extra={"label": label})
            raise ValueError(f"Unknown multimodal label: {label}")

        model_queue = MULTIMODAL_SUBCATEGORIES[label].copy()
        current_model = model_queue.pop(0)
        failure_count = {}
        api_key = next(self.key_cycle)

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            return await self._safe_call(client, api_key, current_model, base64_img, question, model_queue, failure_count)


# ───────────────────────────────────────────────
# Example
# ───────────────────────────────────────────────
if __name__ == "__main__":
    async def main():
        client = MultiModalVisionClient()
        response = await client.describe("test.png", question="Describe the main object and its text captions in detail.", label="vision_only")
        print("Response:\n", response)

    asyncio.run(main())

