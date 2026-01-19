from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List
from uuid import UUID
import json


from app.models import MainPipeline, DocPipelines
from app.database import User, get_async_session
from app.users import current_active_user


from app.rag_services.retrieval_service import run_retrieval


from typing import List, Dict, Any



router = APIRouter(prefix="/mcp", tags=["mcp"])


class MCPQueryRequest(BaseModel):
    query: str


class MCPSource(BaseModel):
    doc_id: UUID
    chunk_id: Optional[str]
    score: Optional[float]


class MCPQueryResponse(BaseModel):
    answer: str
    sources: Optional[List[MCPSource]] = None


MethodSpec = Dict[str, Any]

class PipelineResponse(BaseModel):
    router: MethodSpec
    reranker: MethodSpec
    generator: MethodSpec



@router.post("/query", response_model=MCPQueryResponse)
async def query_pipeline(
    payload: MCPQueryRequest,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
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





