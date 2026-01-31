import httpx
from fastmcp import FastMCP

from app.config import settings

mcp = FastMCP("rag-mcp", stateless_http=True)  # streamable HTTP

@mcp.tool()
async def ping() -> dict:
    # Minimal tool to validate token plumbing.
    # The token will be forwarded to /mcp/ping by FastAPI (see dependency below).
    return {"ok": True}





@mcp.tool()
async def rag_query(query: str) -> dict:
    # Call your existing backend route internally (or call run_retrieval directly)
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{settings.backend_base_url}/mcp/query",
            json={"query": query},
        )
        r.raise_for_status()
        return r.json()
