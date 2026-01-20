from uuid import UUID
from pydantic import BaseModel

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

from app.models import DocPipelines
from app.database import User, get_async_session
from app.users import current_active_user

from typing import List, Dict, Any
from uuid import uuid4
import json


# Extraction service
from app.rag_services.extraction_service import run_extraction

# Markdown generator
from app.generate_markdown import generate_markdown_from_log, find_session_id





router = APIRouter(tags=["extraction"])

MethodSpec = Dict[str, Any]


@router.get("/{doc_id}/data", response_model=List[MethodSpec])
async def read_extraction_pipeline(
        doc_id: UUID,
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)


    if row.extraction_pipeline is None:
        # Return default empty pipeline if none exists
        return []

    extraction_pipeline = json.loads(row.extraction_pipeline)

    return extraction_pipeline


@router.post("/{doc_id}/data")
async def add_extraction_pipeline(
        doc_id: UUID,
        pipeline: List[MethodSpec],
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)
    row.extraction_pipeline = json.dumps(pipeline)

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }


@router.post("/{doc_id}/run")
async def run_extraction_pipeline(
        doc_id: UUID,
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):
    # 1. filter: this endpoint is only triggered when a pipeline is fetched or created from the UI
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)
    extraction_pipeline = json.loads(row.extraction_pipeline)
    
    


    # 2. filter: output error if the pipeline is created but not saved, and there is no previous pipeline
    if not extraction_pipeline:
        raise HTTPException(status_code=404, detail="No pipeline was saved")

    # Run extraction
    await run_extraction(extraction_pipeline, user.id, doc_id, db)

    # After extraction

    # Set extracted=1
    row.extracted = 1


    # NEXT: Set exported=0
    row.exported = 0

    await db.commit()


    return {
        "status": "ok"
    }


# ---------- ALL DOCs ----------
@router.post("/run")
async def extract_all(
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):

    # Avoid extracted=1 to be extracted again.

    rows, columns = await DocPipelines.get_all(columns=["doc_id"], where_dict={"user_id": user.id, "extracted": 0}, db=db)

    doc_ids = [row["doc_id"] for row in rows]

    for doc_id in doc_ids:
        row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)


        if row.extraction_pipeline:
            # Run extraction

            extraction_pipeline = json.loads(row.extraction_pipeline)
            await run_extraction(extraction_pipeline, user.id, doc_id, db)

            # After extraction

            # Set extracted=1
            row.extracted = 1

            # NEXT: Set exported=0
            row.exported = 0

    await db.commit()


    return {
        "status": "ok"
    }



