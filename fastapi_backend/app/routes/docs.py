from uuid import UUID
from pydantic import BaseModel

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship


from app.database import User, get_async_session, create_db_and_tables
from app.users import current_active_user
from app.models import DocPipelines

from typing import List
from uuid import uuid4


router = APIRouter(tags=["docs"])


class DocResponse(BaseModel):
    name: str
    doc_id: UUID


class DocCreate(BaseModel):
    name: str


@router.post("/", response_model=DocResponse)
async def create_doc(
    doc: DocCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    db_doc = await DocPipelines.insert_data(data_dict={"name": doc.name, "user_id": user.id}, db=db) #"path": None

    await db.commit()
    await db.refresh(db_doc)


    return {
        "name": db_doc.name,
        "doc_id": db_doc.doc_id,
    }
















from app.models import ApiKey
from app.rag_services.helpers import encrypt_key, decrypt_key
from fastapi import Request
from dotenv import load_dotenv
load_dotenv()


from loguru import logger as AgentLogger
class KeyData(BaseModel):
    base_key: str
    api_key: str


@router.post("/api_keys/")
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



@router.delete("/api_keys/{key_id}")
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



class KeyReadData(BaseModel):
    key_id: UUID
    base_key: str
    api_key: str

@router.get("/api_keys/", response_model=List[KeyReadData])
async def read_api_key(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    rows, _ = await ApiKey.get_all(
        columns=["key_id", "base_api", "encrypted_key"],
        where_dict={"user_id": user.id},
        db=db,
    )

    return [
        KeyReadData(
            key_id=row["key_id"],
            base_key=row["base_api"],
            api_key=decrypt_key(row["encrypted_key"]),
        )
        for row in rows
    ]








@router.post("/uploads/{doc_id}")
async def upload_doc_file(
    doc_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):

    row = await DocPipelines.get_row(where_dict={"doc_id": doc_id, "user_id": user.id}, db=db) #"path": None

    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # 2️⃣ Compute path (server-owned logic)
    base_path = Path("shared-data/uploads")
    doc_dir = base_path / str(row.user_id) / str(row.doc_id)
    doc_dir.mkdir(parents=True, exist_ok=True)

    file_path = doc_dir / row.name

    # 3️⃣ Write file to disk
    with file_path.open("wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    # 4️⃣ Persist path atomically
    row.path = str(file_path)

    await db.commit()
    await db.refresh(row)

    return {
        "status": "ok"
    }








@router.delete("/{doc_id}")
async def delete_doc(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):


    row = await DocPipelines.get_row(where_dict={"doc_id": doc_id, "user_id": user.id}, db=db) #"path": None


    if not row:
        raise HTTPException(status_code=404, detail="Doc not found or not authorized")

    # delete file first
    file_path = Path(row.path).resolve()
    if file_path.exists():
        file_path.unlink()
    parent = file_path.parent
    parent.rmdir()


    await db.delete(row)
    await db.commit()

    return {"message": "Doc successfully deleted"}



class DocResponse(BaseModel):
    name: str
    doc_id: UUID



@router.get("/", response_model=List[DocResponse])
async def read_doc_list(
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    rows, _ = await DocPipelines.get_all(columns=["name", "doc_id"], where_dict={"user_id": user.id}, db=db) #"path": None

    return [
        DocResponse(
            name=row["name"],
            doc_id=row["doc_id"],
        )
        for row in rows
    ]