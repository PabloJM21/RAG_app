from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List
from uuid import UUID
import json

from app.database import get_async_session
from app.users import current_active_user
from app.models import User

# These are YOUR internal services
from app.rag_services.retrieval_service import retrieve_chunks
from app.models import MainPipeline, ChunkingPipeline, RetrievalPipeline


from typing import List, Dict, Any



router = APIRouter(prefix="/mcp", tags=["mcp"])


class MCPQueryRequest(BaseModel):
    pipeline_id: str
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

    # Extract doc_ids of docs that have been chunked
    doc_ids = await ChunkingPipeline.get_all(where_dict={"user_id": user.id, "chunked": 1}, columns=["doc_id"], db=db)

    # extract retrieval pipelines of those docs and store them into a dict
    retrieval_dict = {}
    for doc_id in doc_ids:
        pipeline_dict = await RetrievalPipeline.get_pipeline(where_dict={"user_id": user.id, "doc_id": doc_id}, columns=["method-list"], db=db)
        method_list = pipeline_dict["method-list"]
        if method_list:
            retrieval_dict[doc_id] = method_list

    # Finally, add router and run retrieval

    # load main_pipeline configuration
    main_pipeline = await MainPipeline.get_pipeline(where_dict={"user_id": user.id}, db=db)
    router_method = main_pipeline["router"]
    retrieval_dict["router"] = router_method




