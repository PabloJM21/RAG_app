from uuid import UUID
from pydantic import BaseModel

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

from app.models import DocPipelines, MainPipeline
from app.database import User, get_async_session
from app.users import current_active_user

from typing import List, Dict, Any
from uuid import uuid4
import json

# helper for removing "color" from stored pipelines
from app.rag_services.helpers import load_pipeline

# Retrieval service
from app.rag_services.retrieval_service import run_doc_embeddings

# Markdown generator
from app.generate_markdown import generate_markdown_from_log, find_session_id




router = APIRouter(tags=["retrieval"])

MethodSpec = Dict[str, Any]


@router.get("/{doc_id}/data", response_model=List[MethodSpec])
async def read_retrieval_pipeline(
        doc_id: UUID,
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)


    if row.retrieval_pipeline is None:
        # Return default empty pipeline if none exists
        return []

    retrieval_pipeline = json.loads(row.retrieval_pipeline)

    return retrieval_pipeline


@router.post("/{doc_id}/data")
async def add_retrieval_pipeline(
        doc_id: UUID,
        pipeline: List[MethodSpec],
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):
    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)
    row.retrieval_pipeline = json.dumps(pipeline)

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }






@router.post("/{doc_id}/run")
async def export_pipeline(
        doc_id: UUID,
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):
    # 1. filter: this endpoint is only triggered when a pipeline is fetched or created from the UI

    main_pipeline = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)
    document_pipelines = {}
    if main_pipeline.doc_pipelines:
        document_pipelines = json.loads(main_pipeline.doc_pipelines)


    row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)


    # 2. filter: output error if the pipeline is created but not saved, and there is no previous pipeline
    if not row.retrieval_pipeline:
        raise HTTPException(status_code=404, detail="No pipeline was saved")

    # same behavior if the "chunking" stage isn't fulfilled
    is_chunked = int(row.chunked)
    if not is_chunked:
        raise HTTPException(status_code=404, detail="No chunks exist or are outdated")

    # export pipeline to MainPipeline table

    retrieval_pipeline = json.loads(row.retrieval_pipeline)
    pipeline_valid = await run_doc_embeddings(retrieval_pipeline=retrieval_pipeline, user_id=user.id, doc_id=doc_id, db=db)

    if pipeline_valid:
        # update document_pipelines with this doc's pipeline
        for pipeline_method in retrieval_pipeline:
            pipeline_method.pop("color", None)

        document_pipelines[str(doc_id)] = retrieval_pipeline

        # NEXT: Set exported=1

        row.exported = 1

        # finally update main_pipeline with the created document_pipelines dict
        if document_pipelines:
            main_pipeline.doc_pipelines = json.dumps(document_pipelines)

    await db.commit()


    return {
        "status": "ok"
    }




# ---------- ALL DOCs ----------
@router.post("/run")
async def export_all(
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
):
    """
    1. Runs Embeddings for each doc_id where exported=0
    2. Bundles all retrieval pipelines and exports them to the MainPipeline table

    """

    main_pipeline = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)
    document_pipelines = {}
    if main_pipeline.doc_pipelines:
        document_pipelines = json.loads(main_pipeline.doc_pipelines)

    # Avoid exported=1 to be exported again.
    rows, _ = await DocPipelines.get_all(columns=["doc_id"], where_dict={"user_id": user.id, "exported": 0, "chunked": 1}, db=db)

    doc_ids = [row["doc_id"] for row in rows]

    for doc_id in doc_ids:
        row = await DocPipelines.get_row(where_dict={"user_id": user.id, "doc_id": doc_id}, db=db)


        # Doesn't trigger if the pipeline is created but not saved, and there is no previous pipeline
        if row.retrieval_pipeline:
            retrieval_pipeline = json.loads(row.retrieval_pipeline)

            # run embeddings for EmbeddingRetrievers
            pipeline_valid = await run_doc_embeddings(retrieval_pipeline=retrieval_pipeline, user_id=user.id, doc_id=doc_id, db=db)

            if pipeline_valid:
                # update document_pipelines with each doc's pipeline
                for pipeline_method in retrieval_pipeline:
                    pipeline_method.pop("color", None)

                document_pipelines[str(doc_id)] = retrieval_pipeline

                # NEXT: Set exported=1
                row.exported = 1


    
    # finally update main_pipeline with the created document_pipelines dict
    if document_pipelines:
        main_pipeline.doc_pipelines = json.dumps(document_pipelines)
    
    await db.commit()


    return {
        "status": "ok"
    }