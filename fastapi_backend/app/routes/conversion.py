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
import os
import pandas as pd

# Indexing service
from app.rag_services.indexing_service import run_conversion

# Markdown generator
from app.generate_markdown import generate_markdown_from_log, find_session_id



router = APIRouter(tags=["conversion"])






MethodSpec = Dict[str, Any]



@router.get("/{doc_id}/data", response_model=MethodSpec)
async def read_conversion_pipeline(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)
    conversion_pipeline = json.loads(row.conversion_pipeline)

    if conversion_pipeline is None:
        # Return default empty pipeline if none exists
        return {}

    return conversion_pipeline




@router.post("/{doc_id}/data")
async def add_conversion_pipeline(
    doc_id: UUID,
    pipeline: MethodSpec,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # First we delete current pipeline if it's set
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)
    row.conversion_pipeline = json.dumps(pipeline)

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }



@router.post("/{doc_id}/run")
async def run_conversion_pipeline(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # 1. filter: this endpoint is only triggered when a pipeline is fetched or created from the UI
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)
    conversion_pipeline = json.loads(row.conversion_pipeline)

    # ---------------
    # Avoid converted=1 to be converted again. This restriction should only apply to global conversion
    # ---------------
    # 3. filter: output error if the pipeline's "converted" status is not zero,
    #if int(row.converted):
        #return {}
    # ------------

    # 2. filter: output error if the pipeline is created but not saved, and there is no previous pipeline
    if not conversion_pipeline:
        raise HTTPException(status_code=404, detail="No pipeline was saved")

    # Run conversion

    await run_conversion(conversion_pipeline, user.id, doc_id, db)

    # After conversion

    # Set converted=1
    row.converted = 1

    # Set chunked=0 (if chunking_pipeline exists)
    chunking_pipeline = json.loads(row.chunking_pipeline)

    if chunking_pipeline:
        row.chunked = 0

    # Set extracted=0 (if extraction_pipeline exists)
    extraction_pipeline = json.loads(row.extraction_pipeline)

    if extraction_pipeline:
        row.extracted = 0


    # NEXT: Set embeddings_required=1
    retrieval_pipeline = json.loads(row.retrieval_pipeline)
    method_types = [method["type"] for method in retrieval_pipeline]
    if "EmbeddingRetriever" in method_types:
        row.embeddings_required = 1

    await db.commit()


    return {
        "status": "ok"
    }




# ---------- ALL DOCs ----------
@router.post("/run")
async def run_conversion_pipeline(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # Avoid converted=1 to be converted again.

    rows, _ = await DocPipelines.get_all(where_dict={"user_id": user.id, "converted": 0}, db=db)

    doc_ids = [row["doc_id"] for row in rows]

    for doc_id in doc_ids:
        row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)
        conversion_pipeline = json.loads(row.conversion_pipeline)

        if conversion_pipeline:
            await run_conversion(conversion_pipeline, user.id, doc_id, db)

            # After conversion

            # Set converted=1
            row.converted = 1

            # Set chunked=0
            row.chunked = 0

            # Set extracted=0
            row.extracted = 0

            # Set exported=0
            row.exported = 0

    await db.commit()


    return {
        "status": "ok"
    }



