# saia_docling_client.py
import os
import asyncio
import httpx
import json
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, Optional

from loguru import logger as AgentLogger

#from dotenv import load_dotenv


# ───────────────────────────────────────────────
# Enums and Config
# ───────────────────────────────────────────────
class DoclingOutputType(Enum):
    MARKDOWN = "markdown"
    HTML = "html"
    JSON = "json"
    TOKENS = "tokens"





TIMEOUT = httpx.Timeout(    # more timeout for bigger documents
    300.0,
    connect=30.0,
    read=300.0,
    write=60.0
)

# ───────────────────────────────────────────────
# USER API KEY LOADING
# ───────────────────────────────────────────────

"""
BASE_API = os.getenv("BASE_API", "https://chat-ai.academiccloud.de/v1")
load_dotenv()
FIRST_API_KEY = os.getenv("API_KEY")
API_KEYS = [
    FIRST_API_KEY,
    "key_2",
    "key_3",
]

"""






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
# Main Manager
# ───────────────────────────────────────────────
class DoclingClient:
    def __init__(self, base_api: str, user_key_list: list[str]):
        self.base_api = base_api
        self.keys = user_key_list
        self.key_failures = {k: None for k in self.keys}
        self.key_index = 0
        self.lock = asyncio.Lock()
        AgentLogger.info("DoclingClient initialized", extra={"keys": len(self.keys)})

    async def convert(
        self,
        file_path: str,
        *,
        response_type: DoclingOutputType = DoclingOutputType.MARKDOWN,
        extract_tables_as_images: bool = False,
        image_resolution_scale: float = 1.0,
    ) -> Dict[str, Any]:
        async with self.lock:
            for attempt in range(MAX_RETRIES * len(self.keys)):
                key = self._current_key()
                try:
                    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                        resp, headers = await self._call_docling(
                            client, key, file_path, response_type, extract_tables_as_images, image_resolution_scale
                        )

                    # Handle rate limits
                    rate_headers = parse_rate_headers(headers)
                    scope, action, reset = decide_action(rate_headers)
                    if action == "sleep":
                        reset = min(reset or 60, 60)
                        AgentLogger.warning("Rate limit reached, sleeping", extra={"scope": scope, "seconds": reset})
                        await asyncio.sleep(reset)
                    elif action == "switch":
                        AgentLogger.warning("Rate limit — switching key", extra={"scope": scope, "key": key[:6]})
                        self._mark_key_limited(key)
                        self._rotate_key()
                        continue

                    AgentLogger.success("Docling conversion successful", extra={"key": key[:6], "file": file_path})
                    return resp

                except httpx.HTTPStatusError as e:
                    code = e.response.status_code
                    if code == 429:
                        AgentLogger.warning("Key hit rate limit", extra={"key": key[:6]})
                        self._mark_key_limited(key)
                        self._rotate_key()
                        await asyncio.sleep(2 ** (attempt % 4))
                        continue
                    elif code >= 500:
                        AgentLogger.error("Server error, retrying", extra={"code": code})
                        await asyncio.sleep(2 ** (attempt % 4))
                        continue
                    elif code == 401:
                        AgentLogger.error("Unauthorized key", extra={"key": key[:6]})
                        self._mark_key_limited(key)
                        self._rotate_key()
                        continue
                    else:
                        AgentLogger.error("Unhandled HTTP error", extra={"code": code, "error": repr(e)})
                        break

                except httpx.RequestError as e:
                    AgentLogger.warning("Network error, retrying", extra={"error": repr(e)})
                    await asyncio.sleep(2 ** (attempt % 4))
                    continue

                except Exception as e:
                    AgentLogger.error("Unexpected error", extra={"error": repr(e)})
                    await asyncio.sleep(2 ** (attempt % 4))
                    continue

            AgentLogger.critical("Failed after all retries", extra={"attempts": attempt})
            raise RuntimeError("Docling conversion failed after max retries for all keys.")

    async def _call_docling(
        self,
        client: httpx.AsyncClient,
        key: str,
        file_path: str,
        response_type: DoclingOutputType,
        extract_tables_as_images: bool,
        image_resolution_scale: float,
    ):
        url = f"{self.base_api.rstrip('/')}/documents/convert"
        headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
        params = {
            "response_type": response_type.value,
            "extract_tables_as_images": str(extract_tables_as_images).lower(),
            "image_resolution_scale": image_resolution_scale,
        }

        files = {"document": (os.path.basename(file_path), open(file_path, "rb"))}

        AgentLogger.debug("Calling Docling convert API", extra={"url": url, "key": key[:6]})
        resp = await client.post(url, headers=headers, params=params, files=files)
        resp.raise_for_status()

        try:
            data = resp.json()
        except Exception:
            data = {"raw_text": resp.text}

        return data, resp.headers

    def _current_key(self):
        for i, k in enumerate(self.keys):
            fail_time = self.key_failures.get(k)
            if fail_time and datetime.now() - fail_time > timedelta(minutes=5):
                AgentLogger.info("Key recovered", extra={"key": k[:6]})
                self.key_failures[k] = None
                self.key_index = i
                break
        return self.keys[self.key_index]

    def _rotate_key(self):
        self.key_index = (self.key_index + 1) % len(self.keys)
        AgentLogger.info("Switched key", extra={"index": self.key_index, "key": self.keys[self.key_index][:6]})

    def _mark_key_limited(self, key):
        self.key_failures[key] = datetime.now()
        AgentLogger.warning("Key temporarily limited", extra={"key": key[:6]})


# ───────────────────────────────────────────────
# Example Run
# ───────────────────────────────────────────────
if __name__ == "__main__":
    async def run_sample():
        client = DoclingClient()
        result = await client.convert(
            file_path="report.pdf",
            response_type=DoclingOutputType.MARKDOWN,
            extract_tables_as_images=True,
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))

    asyncio.run(run_sample())
