from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Any, Dict, Optional, List, Callable, Awaitable
import inspect

from app.routes.mcp import current_mcp_user  # your dependency that validates Bearer MCP token
from app.models import User


# helper for removing "color" from stored pipelines
from app.rag_services.helpers import load_doc_pipelines, load_pipeline

router = APIRouter(prefix="/mcp-proto", tags=["mcp-proto"])

# Retrieval Logic
from app.models import MainPipeline, DocPipelines
from app.rag_services.retrieval_service import run_retrieval
import json
# for db
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session

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
# Main tools
# ----------------------------

@tool("ping", "Validate MCP auth and connectivity")
async def ping_tool(user: User):
    return {"ok": True, "user_id": str(user.id), "email": user.email}




@tool("rag_query", "Run RAG pipeline query")
async def rag_query_tool(user: User, db: AsyncSession, query: str):
    # Call your internal function or your existing endpoint logic directly.
    # load main_pipeline configuration
    row = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)


    retrieval_dict = load_doc_pipelines(row.doc_pipelines)

    retrieval_dict.update({"router": load_pipeline(row.router), "reranker": load_pipeline(row.reranker), "generator": load_pipeline(row.generator)})

    output_answer, chunk_list = await run_retrieval(query=query, retrieval_dict=retrieval_dict, user_id=user.id, db=db)


    return {"answer": f"Hello {user.email}. You asked: {query}. Here is your answer:\n {output_answer}", "sources": chunk_list}







# ----------------------------
# MCP JSON-RPC endpoint
# ----------------------------


@router.post("/")
async def mcp_jsonrpc(
    payload: JsonRpcRequest,
    user: User = Depends(current_mcp_user),
    db: AsyncSession = Depends(get_async_session),
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
                result = await fn(user=user, db=db, **arguments)
            else:
                result = fn(user=user, db=db, **arguments)
            return rpc_result(_id, result)
        except TypeError as te:
            # Missing args, wrong args
            return rpc_error(_id, -32602, "Invalid params", str(te))
        except Exception as e:
            # Tool failure
            return rpc_error(_id, -32000, "Server error", str(e))

    return rpc_error(_id, -32601, "Method not found", f"Unknown method: {method}")
