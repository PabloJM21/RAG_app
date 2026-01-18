from uuid import UUID
from pydantic import BaseModel

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

from app.models import ChunkingPipeline, ExtractionPipeline, Doc
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
    stmt = select(ChunkingPipeline).filter(
        ChunkingPipeline.doc_id == doc_id,
        ChunkingPipeline.user_id == user.id,
    )
    result = await db.execute(stmt)
    pipeline = result.scalars().first()

    if pipeline is None:
        # Return default empty pipeline if none exists
        return {}

    return json.loads(pipeline.method_list)




@router.post("/{doc_id}/data")
async def add_chunking_pipeline(
    doc_id: UUID,
    pipeline: List[MethodSpec],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    # First we delete current pipeline if it's set
    stmt = select(ChunkingPipeline).filter(
        ChunkingPipeline.doc_id == doc_id,
        ChunkingPipeline.user_id == user.id,
    )

    result = await db.execute(stmt)

    existing_chunking_pipeline = result.scalars().first()

    if existing_chunking_pipeline:
        existing_chunking_pipeline.method_list = json.dumps(pipeline)
    else:
        existing_chunking_pipeline = ChunkingPipeline(
            method_list=json.dumps(pipeline),
        )

        db.add(existing_chunking_pipeline)

    await db.commit()
    await db.refresh(existing_chunking_pipeline)

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
    stmt = select(ChunkingPipeline).filter(
        ChunkingPipeline.doc_id == doc_id,
        ChunkingPipeline.user_id == user.id,
    )

    result = await db.execute(stmt)

    chunking_pipeline = result.scalars().first()

    # 2. filter: output error if the pipeline is created but not saved, and there is no previous pipeline
    if not chunking_pipeline:
        raise HTTPException(status_code=404, detail="No pipeline was saved")


    # ---------------
    # Avoid chunked=1 to be chunked again. This restriction should only apply to global chunking
    # ---------------
    # 3. filter: output error if the pipeline's "chunked" status is not zero,
    #if int(chunking_pipeline.chunked):
        #return {}
    # ------------

    # Run Chunking
    method_list = json.loads(chunking_pipeline.method_list)
    await run_chunking(method_list, user.id, [doc_id], db)

    # After Chunking

    # Set chunked=1
    chunking_pipeline.chunked = 1


    # Set extracted=0

    stmt = select(ExtractionPipeline).filter(
        ExtractionPipeline.id == doc_id,
        ExtractionPipeline.user_id == user.id,
    )

    result = await db.execute(stmt)

    extraction_pipeline = result.scalars().first()

    if extraction_pipeline:
        extraction_pipeline.extracted = 0

    # NEXT: Set embedded=0

    # Generate markdown files that make the logged data available

    # Compute path (server-owned logic)
    base_path = Path("shared-data/logs")
    log_dir = base_path / str(user.id) / str(doc_id)
    log_dir.mkdir(parents=True, exist_ok=True)
    LOG_FILE = log_dir / "validate.log"

    # in future more markdown files should capture logs at different surface levels
    OUTPUT_MD = log_dir / "indexing_report.md"


    SESSION_ID = find_session_id(LOG_FILE)

    generate_markdown_from_log(
        log_path=LOG_FILE,
        output_md_path=OUTPUT_MD,
        session_id=SESSION_ID,
    )

    return {
        "status": "ok"
    }


@router.get("/{doc_id}/levels", response_model=list[str])
async def read_index_levels(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    levels = await load_indexing_levels(user_id=user.id, doc_id=doc_id, db=db)

    return levels



@router.get("/{doc_id}/results", response_model=List[Dict[str, Any]])
async def read_chunking_results(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    results = await load_indexing_results(user_id=user.id, doc_id=doc_id, db=db)



    return results


@router.post("/{doc_id}/results")
async def add_chunking_results(
    doc_id: UUID,
    result_list: List[Dict[str, Any]],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    if result_list:
        await update_indexing_results(user_id=user.id, result_list=result_list, db=db)

        # NEXT: Set embedded=0 for (doc_id=doc_id, level=level) for each level in result_list

    return {
        "status": "ok"
    }


# Markdown Results


@router.get("/{doc_id}/markdown", response_model=List[Dict[str, Any]])
async def read_index_results(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    results = await load_markdown_results(user_id=user.id, doc_id=doc_id, db=db)



    return results



# ---------- ALL DOCs ----------
@router.post("/run")
async def run_index_pipeline(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    rows, columns = await Doc.get_all(where_dict={"user_id": user.id, "indexed": 0}, db=db)
    new_document_df = pd.DataFrame(rows, columns=columns)

    doc_ids =  new_document_df["doc_id"].tolist()







