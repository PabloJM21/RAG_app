from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from uuid import UUID
import json


from app.models import MainPipeline, DocPipelines


from app.users import current_active_user, get_user_manager, UserManager   # adjust import paths
from app.database import User, get_async_session            # adjust import paths

from app.rag_services.retrieval_service import run_retrieval
from app.mcp_tokens import create_jwt_token, decode_and_validate_mcp_token
from fastapi import Depends, HTTPException, Request

from datetime import timedelta


router = APIRouter(tags=["mcp"])




@router.post("/issue-url")
async def issue_mcp_url(
        user: User = Depends(current_active_user)
):

    token = create_jwt_token(
        subject=str(user.id),
        scope="mcp",
        expires_delta=timedelta(minutes=30),
    )

    return {
        "mcp_url": f"http://localhost:8000/mcp-proto/{token}"
    }






# ---------------------------------------
# Query
# ---------------------------------------

class MCPQueryRequest(BaseModel):
    query: str


class MCPSource(BaseModel):
    doc_id: UUID
    level_id: Optional[str]
    score: Optional[float]


class MCPQueryResponse(BaseModel):
    answer: str
    sources: Optional[List[MCPSource]] = None


MethodSpec = Dict[str, Any]

class PipelineResponse(BaseModel):
    router: MethodSpec
    reranker: MethodSpec
    generator: MethodSpec



async def current_mcp_user(
    request: Request,
    user_manager: UserManager = Depends(get_user_manager),
) -> User:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing MCP token")

    token = auth.removeprefix("Bearer ").strip()

    payload = decode_and_validate_mcp_token(token)

    # payload["sub"] is a string; fastapi-users expects UUID for your setup
    try:
        user_id = UUID(payload["sub"])
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid MCP token subject")

    user = await user_manager.get(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid MCP user")

    return user




@router.post("/query", response_model=MCPQueryResponse)
async def query_pipeline(
    payload: MCPQueryRequest,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_mcp_user),
):
    """
    MCP-compatible query endpoint.
    Executes the full RAG pipeline and returns a final answer.
    """


    # load main_pipeline configuration
    row = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)


    retrieval_dict = json.loads(row.doc_pipelines)
    retrieval_dict["router"] = json.loads(row.router)

    output_content = await run_retrieval(query=payload.query, retrieval_dict=retrieval_dict, user_id=user.id, db=db)




    return output_content




# --------- TEST ------------



class MCPPingResponse(BaseModel):
    ok: bool
    user_id: str
    email: str


@router.post("/ping", response_model=MCPPingResponse)
async def mcp_ping(
    user: User = Depends(current_mcp_user),
):
    """
    Minimal MCP auth test endpoint.
    Confirms MCP token is valid and user is resolved.
    """
    return {
        "ok": True,
        "user_id": str(user.id),
        "email": user.email,
    }



"""
curl -s -X POST "http://localhost/mcp/<TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"ping",
      "arguments":{}
    }
  }'


{"jsonrpc":"2.0","id":3,"result":{"answer":"Hello pablo.jahnen@stud.uni-goettingen.de. You asked: What documents do I have indexed?","sources":[]}}


"""
