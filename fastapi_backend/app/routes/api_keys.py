from uuid import UUID
from pydantic import BaseModel

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

from app.models import ApiKey
from app.database import User, get_async_session
from app.users import current_active_user

from app.rag_services.helpers import encrypt_key, decrypt_key


from typing import List, Dict, Any
from uuid import uuid4
import json
import os
import pandas as pd

from dotenv import load_dotenv


load_dotenv()



router = APIRouter(tags=["api_keys"])



class KeyData(BaseModel):
    base_key: str
    api_key: str





from fastapi import Request

from loguru import logger as AgentLogger

@router.post("/")
async def save_api_key(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # Read raw JSON body
    body = await request.json()
    AgentLogger.info(f"DEBUG: raw body received: {body}")

    # Now you can validate manually
    base_key = body.get("base_key")
    api_key = body.get("api_key")
    AgentLogger.info(f"DEBUG: base_key: {base_key}, api_key: {api_key}")

    # Optional: validate with Pydantic manually
    from pydantic import ValidationError
    try:
        key_data = KeyData(base_key=base_key, api_key=api_key)
    except ValidationError as e:
        AgentLogger.info(f"DEBUG: ValidationError: {e.json()}")
        return {"error": "Invalid input", "details": e.errors()}

    encrypted_value = encrypt_key(key_data.api_key)

    row = await ApiKey.get_row(
        where_dict={
            "user_id": user.id,
            "base_api": key_data.base_key,
        },
        db=db,
    )

    if row:
        # Update existing key
        row.encrypted_key = encrypted_value
    else:
        # Insert new key
        row = await ApiKey.insert_data(
            data_dict={
                "user_id": user.id,
                "base_api": key_data.base_key,
                "encrypted_key": encrypted_value,
            },
            db=db,
        )

    await db.commit()

    return {"status": "ok"}




@router.get("/", response_model=List[KeyData])
async def read_api_key(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    rows, _ = await ApiKey.get_all(
        columns=["base_api", "encrypted_key"],
        where_dict={"user_id": user.id},
        db=db,
    )

    return [
        KeyData(
            base_key=row["base_api"],
            api_key=decrypt_key(row["encrypted_key"]),
        )
        for row in rows
    ]




@router.delete("/{key_id}")
async def delete_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    row = await ApiKey.get_row(
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

