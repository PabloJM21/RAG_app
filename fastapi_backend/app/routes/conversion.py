from uuid import UUID
from pydantic import BaseModel

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

from app.models import IndexPipeline, ExtractionPipeline, Doc
from app.database import User, get_async_session
from app.users import current_active_user

from typing import List, Dict, Any
from uuid import uuid4
import json
import os
import pandas as pd

# Indexing service
from app.rag_services.indexing_service import run_conversion, load_indexing_results, update_indexing_results, load_indexing_levels

# Markdown generator
from app.generate_markdown import generate_markdown_from_log, find_session_id



router = APIRouter(tags=["conversion"])










@router.get("/{doc_id}/data", response_model=Dict[str, Any])
async def read_index_pipeline(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    stmt = select(IndexPipeline).filter(
        IndexPipeline.doc_id == doc_id,
        IndexPipeline.user_id == user.id,
    )
    result = await db.execute(stmt)
    pipeline = result.scalars().first()

    if pipeline is None:
        # Return default empty pipeline if none exists
        return {}

    return json.loads(pipeline.indexer)




@router.post("/{doc_id}/data")
async def add_index_pipeline(
    doc_id: UUID,
    pipeline: Dict[str, Any],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    # First we delete current pipeline if it's set
    stmt = select(IndexPipeline).filter(
        IndexPipeline.doc_id == doc_id,
        IndexPipeline.user_id == user.id,
    )

    result = await db.execute(stmt)

    existing_index_pipeline = result.scalars().first()

    if existing_index_pipeline:
        existing_index_pipeline.indexer = json.dumps(pipeline)
    else:
        existing_index_pipeline = IndexPipeline(
            id=doc_id,
            user_id=user.id,
            indexer=json.dumps(pipeline)
        )
        
        db.add(existing_index_pipeline)

    await db.commit()
    await db.refresh(existing_index_pipeline)


    return {
        "status": "ok"
    }



@router.post("/{doc_id}/run")
async def run_index_pipeline(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # 1. filter: this endpoint is only triggered when a pipeline is fetched or created from the UI
    stmt = select(IndexPipeline).filter(
        IndexPipeline.doc_id == doc_id,
        IndexPipeline.user_id == user.id,
    )

    result = await db.execute(stmt)

    index_pipeline = result.scalars().first()

    # 2. filter: output error if the pipeline is created but not saved, and there is no previous pipeline
    if not index_pipeline:
        raise HTTPException(status_code=404, detail="No pipeline was saved")


    # ---------------
    # Avoid indexed=1 to be indexed again. This restriction should only apply to global @indexing
    # ---------------
    # 3. filter: output error if the pipeline's "indexed" status is not zero,
    #if int(index_pipeline.indexed):
        #return {}
    # ------------

    # Run Indexing
    indexer = json.loads(index_pipeline.indexer)
    await run_indexing(indexer, user.id, [doc_id], db)

    # After @indexing

    # Set indexed=1
    index_pipeline.indexed = 1


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
async def read_index_results(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    results = await load_indexing_results(user_id=user.id, doc_id=doc_id, db=db)



    return results


@router.post("/{doc_id}/results")
async def add_index_results(
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







