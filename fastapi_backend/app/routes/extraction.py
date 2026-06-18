from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DocPipelines
from app.database import User, get_async_session
from app.users import current_active_user

from typing import List, Dict, Any
import json

# helper for removing "color" from stored pipelines
from app.rag_services.helpers import load_pipeline, ExtractionError


# Extraction service
from app.rag_services.extraction_service import run_extraction

# Markdown generator
from app.generate_markdown import generate_markdown_from_log, find_session_id





router = APIRouter(tags=["extraction"])

MethodSpec = Dict[str, Any]


@router.get("/{project_id}/docs/{doc_id}/data", response_model=List[MethodSpec])
async def read_extraction_pipeline(
        project_id: UUID,
        doc_id: UUID,
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "project_id": project_id, "doc_id": doc_id}, db=db)


    if row.extraction_pipeline is None:
        # Return default empty pipeline if none exists
        return []

    extraction_pipeline = json.loads(row.extraction_pipeline)

    return extraction_pipeline


@router.post("/{project_id}/docs/{doc_id}/data")
async def add_extraction_pipeline(
        project_id: UUID,
        doc_id: UUID,
        pipeline: List[MethodSpec],
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "project_id": project_id, "doc_id": doc_id}, db=db)
    row.extraction_pipeline = json.dumps(pipeline)

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }


@router.post("/{project_id}/docs/{doc_id}/run")
async def run_extraction_pipeline(
        project_id: UUID,
        doc_id: UUID,
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):

    try:
        row = await DocPipelines.get_row(where_dict={"user_id": user.id, "project_id": project_id, "doc_id": doc_id}, db=db)

        if not row.extraction_pipeline:
            raise HTTPException(status_code=400, detail="No pipeline available")

        extraction_pipeline = load_pipeline(row.extraction_pipeline)

        await run_extraction(extraction_pipeline, user.id, project_id, doc_id, db)

        row.exported = False
        await db.commit()

        return {"status": "ok"}

    except ExtractionError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)





