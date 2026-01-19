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
from app.rag_services.indexing_service import run_chunking, load_chunking_results, update_chunking_results, load_chunking_levels

# Markdown generator
from app.generate_markdown import generate_markdown_from_log, find_session_id



router = APIRouter(tags=["chunking"])






MethodSpec = Dict[str, Any]



@router.get("/{doc_id}/data", response_model=List[MethodSpec])
async def read_chunking_pipeline(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)

    if row.chunking_pipeline is None:
        # Return default empty pipeline if none exists
        return []

    chunking_pipeline = json.loads(row.chunking_pipeline)

    return chunking_pipeline




@router.post("/{doc_id}/data")
async def add_chunking_pipeline(
    doc_id: UUID,
    pipeline: List[MethodSpec],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)
    row.chunking_pipeline = json.dumps(pipeline)

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }



@router.post("/{doc_id}/run")
async def run_chunking_pipeline(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # 1. filter: this endpoint is only triggered when a pipeline is fetched or created from the UI
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)
    chunking_pipeline = json.loads(row.chunking_pipeline)

    # ---------------
    # Avoid chunked=1 to be chunked again. This restriction should only apply to global chunking
    # ---------------
    # 3. filter: output error if the pipeline's "chunked" status is not zero,
    #if int(chunking_pipeline.chunked):
        #return {}
    # ------------

    # 2. filter: output error if the pipeline is created but not saved, and there is no previous pipeline
    if not chunking_pipeline:
        raise HTTPException(status_code=404, detail="No pipeline was saved")

    # Run Chunking
    await run_chunking(chunking_pipeline, user.id, doc_id, db)

    # After Chunking

    # Set chunked=1
    row.chunked = 1

    # Set extracted=0
    row.extracted = 0

    # NEXT: Set exported=0
    row.exported = 0

    await db.commit()



    return {
        "status": "ok"
    }


@router.get("/{doc_id}/levels", response_model=list[str])
async def read_chunking_levels(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    levels = await load_chunking_levels(user_id=user.id, doc_id=doc_id, db=db)

    return levels



@router.get("/{doc_id}/results", response_model=List[Dict[str, Any]])
async def read_chunking_results(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    results = await load_chunking_results(user_id=user.id, doc_id=doc_id, db=db)



    return results


@router.post("/{doc_id}/results")
async def add_chunking_results(
    doc_id: UUID,
    result_list: List[Dict[str, Any]],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    if result_list:
        await update_chunking_results(user_id=user.id, result_list=result_list, db=db)



    return {
        "status": "ok"
    }


# Markdown Results

# trigger generation of markdown file

@router.get("/{doc_id}/markdown", response_model=List[Dict[str, Any]])
async def read_markdown_results(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

   pass



# ---------- ALL DOCs ----------
@router.post("/run")
async def run_chunking_pipeline(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    # Avoid chunked=1 to be chunked again.
    rows, _ = await DocPipelines.get_all(columns=["doc_id"], where_dict={"user_id": user.id, "chunked": 0}, db=db)


    doc_ids = [row["doc_id"] for row in rows]

    for doc_id in doc_ids:
        row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)
        chunking_pipeline = json.loads(row.chunking_pipeline)

        if chunking_pipeline:
            # Run Chunking
            await run_chunking(chunking_pipeline, user.id, doc_id, db)

            # After Chunking

            # Set chunked=1
            row.chunked = 1

            # Set extracted=0
            row.extracted = 0

            # Set exported=0
            row.exported = 0

    await db.commit()

    return {
        "status": "ok"
    }




