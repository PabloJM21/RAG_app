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


def json_str_to_dict(value: str | None) -> dict[str, Any]:
    """
    DB stores JSON as string (or NULL). Return {} if empty.
    Also guards against invalid JSON and non-dict JSON.
    """
    if value is None or value == "":
        return {}

    try:
        loaded = json.loads(value)
    except json.JSONDecodeError:
        return {}

    # You said these are MethodSpec (dict). If DB has list/etc, normalize to {}.
    return loaded if isinstance(loaded, dict) else {}


@router.get("/pipeline/data/", response_model=PipelineResponse)
async def read_pipeline(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    pipeline = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)

    if pipeline is None:
        return PipelineResponse(router={}, reranker={}, generator={})

    return PipelineResponse(
        router=json_str_to_dict(pipeline.router),
        reranker=json_str_to_dict(pipeline.reranker),
        generator=json_str_to_dict(pipeline.generator),
    )





class PipelineUpdate(BaseModel):
    router: Any | None = None
    reranker: Any | None = None
    generator: Any | None = None


@router.post("/pipeline/data/")
async def add_pipeline(
    payload: PipelineUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    existing = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)

    def to_json_or_none(value: Any | None) -> str | None:
        if value is None:
            return None
        return json.dumps(value)

    update_data = payload.model_dump(exclude_unset=True)
    update_router = update_data["router"] if "router" in update_data else None
    update_reranker = update_data["reranker"] if "reranker" in update_data else None
    update_generator = update_data["generator"] if "generator" in update_data else None

    if existing is None:
        existing = MainPipeline(user_id=user.id)

    # Apply only provided fields; allow explicit null to clear

    existing.router = to_json_or_none(update_router)
    existing.reranker = to_json_or_none(update_reranker)
    existing.generator = to_json_or_none(update_generator)


    db.add(existing)
    await db.commit()
    await db.refresh(existing)

    return {"status": "ok"}


