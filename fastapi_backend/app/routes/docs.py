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