from uuid import UUID
from pydantic import BaseModel

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

from app.models import Settings
from app.database import User, get_async_session
from app.users import current_active_user

from typing import List, Dict, Any
from uuid import uuid4
import json

router = APIRouter(tags=["settings"])




MethodSpec = Dict[str, Any]




@router.get("/colors/", response_model=MethodSpec)
async def read_colors(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await Settings.get_row(where_dict={"user_id": user.id}, db=db)

    if row is None or row.method_colors is None:
        # Return default empty pipeline if none exists
        return {}

    method_colors = json.loads(row.method_colors)

    return method_colors





@router.post("/colors/")
async def add_colors(
    method_colors: MethodSpec,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # First we delete current pipeline if it's set
    row = await Settings.get_row(where_dict={"user_id": user.id}, db=db)


    if row:
        # Update existing key
        row.method_colors = json.dumps(method_colors)
    else:
        # Insert new key
        row = await Settings.insert_data(
            data_dict={
                "user_id": user.id,
                "method_colors": json.dumps(method_colors),
            },
            db=db,
        )

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }


#============= THEMES =================


MethodSpec = Dict[str, Any]

@router.get("/themes/", response_model=MethodSpec)
async def read_themes(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await Settings.get_row(where_dict={"user_id": user.id}, db=db)

    if row is None or row.themes is None:
        return {"selectedTheme": "neutral"}

    themes = json.loads(row.themes)

    return themes


@router.post("/themes/")
async def add_themes(
    themes: MethodSpec,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await Settings.get_row(where_dict={"user_id": user.id}, db=db)

    if row:
        row.themes = json.dumps(themes)
    else:
        row = await Settings.insert_data(
            data_dict={
                "user_id": user.id,
                "themes": json.dumps(themes),
            },
            db=db,
        )

    await db.commit()
    await db.refresh(row)

    return {"status": "ok"}




