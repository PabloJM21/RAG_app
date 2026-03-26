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




@router.get("/generator/", response_model=MethodSpec)
async def read_generator(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)

    if row is None or row.generator is None:
        # Return default empty pipeline if none exists
        return {}

    generator = json.loads(row.generator)

    return generator


@router.get("/retrievers/", response_model=List[MethodSpec])
async def read_retrievers(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)

    retrievers = [{}, {}]


    if row is None:
        return retrievers

    if row.router is not None:
        retrievers[0] = json.loads(row.router)

    if row.reranker is not None:
        retrievers[1] = json.loads(row.reranker)

    return retrievers




@router.post("/generator/")
async def add_generator(
    generator: MethodSpec,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # First we delete current pipeline if it's set
    row = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)
    row.generator = json.dumps(generator)

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }


@router.post("/retrievers/")
async def add_retrievers(
    retrievers: List[MethodSpec],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # First we delete current pipeline if it's set
    row = await MainPipeline.get_row(where_dict={"user_id": user.id}, db=db)
    row.router, row.reranker = json.dumps(retrievers[0]), json.dumps(retrievers[1])

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }




