from uuid import UUID
from pydantic import BaseModel

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

from app.models import ExtractionPipeline, IndexPipeline
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
    stmt = select(ExtractionPipeline).filter(
        ExtractionPipeline.doc_id== doc_id,
        ExtractionPipeline.user_id == user.id,
    )
    result = await db.execute(stmt)
    pipeline = result.scalars().first()

    if pipeline is None:
        # Return default empty pipeline if none exists
        return []

    return json.loads(pipeline.method_list)


@router.post("/{doc_id}/data")
async def add_extraction_pipeline(
        doc_id: UUID,
        pipeline: List[MethodSpec],
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):
    # First we delete current pipeline if it's set
    stmt = select(ExtractionPipeline).filter(
        ExtractionPipeline.doc_id== doc_id,
        ExtractionPipeline.user_id == user.id,
    )

    result = await db.execute(stmt)

    existing_extraction_pipeline = result.scalars().first()

    if existing_extraction_pipeline:
        existing_extraction_pipeline.method_list = json.dumps(pipeline)
    else:
        existing_extraction_pipeline = ExtractionPipeline(
            method_list=json.dumps(pipeline),
        )

        db.add(existing_extraction_pipeline)

    await db.commit()
    await db.refresh(existing_extraction_pipeline)

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
    stmt = select(ExtractionPipeline).filter(
        ExtractionPipeline.doc_id== doc_id,
        ExtractionPipeline.user_id == user.id,
    )

    result = await db.execute(stmt)

    extraction_pipeline = result.scalars().first()

    # 2. filter: output error if the pipeline is created but not saved, and there is no previous pipeline
    if not extraction_pipeline:
        raise HTTPException(status_code=404, detail="No pipeline was saved")

    # ---------------
    # Avoid extracted=1 to be extracted again. This restriction should only apply to global @extraction
    # ---------------

    # 3. filter: output error if the pipeline's "extracted" status is not zero,
    #if int(extraction_pipeline.extracted):
        #return {}

    # ---------------

    # Run Extraction
    method_list = json.loads(extraction_pipeline.method_list)
    await run_extraction(method_list, user.id, doc_id, db)

    # After @extraction

    # Set extracted=1
    extraction_pipeline.extracted = 1

    # NEXT: Set embedded=0

    # Generate markdown files that present the logged data

    # Compute path (server-owned logic)
    base_path = Path("shared-data/logs")
    log_dir = base_path / str(user.id) / str(doc_id)
    log_dir.mkdir(parents=True, exist_ok=True)
    LOG_FILE = log_dir / "validate.log"

    # in future more markdown files should capture logs at different surface levels
    OUTPUT_MD = log_dir / "extraction_report.md"

    SESSION_ID = find_session_id(LOG_FILE)

    generate_markdown_from_log(
        log_path=LOG_FILE,
        output_md_path=OUTPUT_MD,
        session_id=SESSION_ID,
    )

    return {
        "status": "ok"
    }