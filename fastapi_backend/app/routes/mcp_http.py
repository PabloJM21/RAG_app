from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Any, Dict, Optional, List, Callable, Awaitable
import inspect

from app.routes.mcp import current_mcp_user  # your dependency that validates Bearer MCP token
from app.models import User

router = APIRouter(prefix="/mcp-proto", tags=["mcp-proto"])

# ----------------------------
# JSON-RPC models
# ----------------------------

class JsonRpcRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[int | str] = None
    method: str
    params: Optional[Dict[str, Any]] = None

class JsonRpcError(BaseModel):
    code: int
    message: str
    data: Optional[Any] = None

def rpc_result(_id: Any, result: Any):
    return {"jsonrpc": "2.0", "id": _id, "result": result}

def rpc_error(_id: Any, code: int, message: str, data: Any = None):
    err = {"code": code, "message": message}
    if data is not None:
        err["data"] = data
    return {"jsonrpc": "2.0", "id": _id, "error": err}

# ----------------------------
# Tool registry (minimal)
# ----------------------------

ToolFn = Callable[..., Awaitable[Any]] | Callable[..., Any]

TOOLS: Dict[str, Dict[str, Any]] = {}

def tool(name: str, description: str = ""):
    def deco(fn: ToolFn):
        TOOLS[name] = {"fn": fn, "description": description}
        return fn
    return deco

# ----------------------------
# Example tools
# ----------------------------

@tool("ping", "Validate MCP auth and connectivity")
async def ping_tool(user: User):
    return {"ok": True, "user_id": str(user.id), "email": user.email}

@tool("rag_query", "Run RAG pipeline query")
async def rag_query_tool(user: User, query: str):
    # Call your internal function or your existing endpoint logic directly.
    # For now, keep it simple:
    return {"answer": f"Hello {user.email}. You asked: {query}", "sources": []}

# ----------------------------
# MCP JSON-RPC endpoint
# ----------------------------

@router.post("/")
async def mcp_jsonrpc(
    payload: JsonRpcRequest,
    user: User = Depends(current_mcp_user),
):
    """
    Minimal MCP-over-HTTP JSON-RPC endpoint:
    - tools/list
    - tools/call
    """
    method = payload.method
    params = payload.params or {}
    _id = payload.id

    # Basic protocol sanity
    if payload.jsonrpc != "2.0":
        return rpc_error(_id, -32600, "Invalid Request", "jsonrpc must be '2.0'")

    if method == "tools/list":
        tools_list = [
            {
                "name": name,
                "description": meta["description"],
                # optionally add input_schema later
            }
            for name, meta in TOOLS.items()
        ]
        return rpc_result(_id, {"tools": tools_list})

    if method == "tools/call":
        name = params.get("name")
        arguments = params.get("arguments") or {}
        if not name or name not in TOOLS:
            return rpc_error(_id, -32601, "Method not found", f"Unknown tool: {name}")

        fn = TOOLS[name]["fn"]

        # Call tool with (user, **arguments) if tool expects it
        try:
            if inspect.iscoroutinefunction(fn):
                result = await fn(user=user, **arguments)
            else:
                result = fn(user=user, **arguments)
            return rpc_result(_id, result)
        except TypeError as te:
            # Missing args, wrong args
            return rpc_error(_id, -32602, "Invalid params", str(te))
        except Exception as e:
            # Tool failure
            return rpc_error(_id, -32000, "Server error", str(e))

    return rpc_error(_id, -32601, "Method not found", f"Unknown method: {method}")
