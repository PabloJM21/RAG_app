from uuid import UUID
from pydantic import BaseModel

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

from app.models import ApiKeys
from app.database import User, get_async_session
from app.users import current_active_user

from app.rag_service.helpers import encrypt_key, decrypt_key


from typing import List, Dict, Any
from uuid import uuid4
import json
import os
import pandas as pd


router = APIRouter(tags=["api_keys"])



class KeyData(BaseModel):
    base_key: str
    api_key_encrypted: str





@router.post("/data/")
async def save_api_key(
    input_key_list: List[KeyData],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    for item in input_key_list:
        encrypted_value = encrypt_key(item.api_key_encrypted)

        row = await ApiKeys.get_row(
            where_dict={
                "user_id": user.id,
                "base_api": item.base_key,
            },
            db=db,
        )

        if row:
            # Update existing key
            row.encrypted_key = encrypted_value
        else:
            # Insert new key
            row = await ApiKeys.insert_data(
                data_dict={
                    "user_id": user.id,
                    "base_api": item.base_key,
                    "encrypted_key": encrypted_value,
                },
                db=db,
            )

    await db.commit()

    return {"status": "ok"}




@router.get("/data/", response_model=List[KeyData])
async def read_api_key(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    rows, _ = await ApiKeys.get_all(
        columns=["base_api", "encrypted_key"],
        where_dict={"user_id": user.id},
        db=db,
    )

    return [
        KeyData(
            base_key=row["base_api"],
            api_key_encrypted=decrypt_key(row["encrypted_key"]),
        )
        for row in rows
    ]




@router.delete("/{key_id}")
async def delete_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await ApiKeys.get_row(
        where_dict={
            "user_id": user.id,
            "key_id": key_id,
        },
        db=db,
    )

    if not row:
        raise HTTPException(status_code=404, detail="API key not found")

    await db.delete(row)
    await db.commit()

    return {"message": "API key deleted"}

