from uuid import UUID
from pydantic import BaseModel

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

from app.models import MainPipeline
from app.database import User, get_async_session
from app.users import current_active_user

from typing import List, Dict, Any
from uuid import uuid4
import json

router = APIRouter(tags=["main-pipeline"])






MethodSpec = Dict[str, Any]

class PipelineResponse(BaseModel):
    router: MethodSpec
    reranker: MethodSpec
    generator: MethodSpec



@router.get("/pipeline/data/", response_model=PipelineResponse)
async def read_pipeline(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    pipeline = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)

    if pipeline is None:
        # Return default empty pipeline if none exists
        return PipelineResponse(
            router={},
            reranker={},
            generator={},
        )

    return PipelineResponse(
        router=json.loads(pipeline.router),
        reranker=json.loads(pipeline.reranker),
        generator=json.loads(pipeline.generator)
    )




@router.post("/pipeline/data/")
async def add_pipeline(
    pipeline: PipelineResponse,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    existing_pipeline = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)


    if existing_pipeline:
        existing_pipeline.router = json.dumps(pipeline.router)
        existing_pipeline.reranker = json.dumps(pipeline.reranker)
        existing_pipeline.generator = json.dumps(pipeline.generator)
    else:
        existing_pipeline = MainPipeline(
            router=json.dumps(pipeline.router),
            reranker=json.dumps(pipeline.reranker),
            generator=json.dumps(pipeline.generator),
            user_id=user.id,
        )
        db.add(existing_pipeline)

    await db.commit()
    await db.refresh(existing_pipeline)


    return {
        "status": "ok"
    }

