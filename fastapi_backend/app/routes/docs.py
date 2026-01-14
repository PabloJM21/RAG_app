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
from app.models import Doc

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


    db_doc = Doc(
        name=doc.name,
        user_id=user.id,
        path=None,
    )

    db.add(db_doc)

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
    # 1️⃣ Fetch doc with ownership constraint
    stmt = select(Doc).filter(
        Doc.doc_id == doc_id,
        Doc.user_id == user.id,
    )

    result = await db.execute(stmt)
    doc = result.scalars().first()

    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # 2️⃣ Compute path (server-owned logic)
    base_path = Path("shared-data/uploads")
    doc_dir = base_path / str(user.id) / str(doc.doc_id)
    doc_dir.mkdir(parents=True, exist_ok=True)

    file_path = doc_dir / doc.name

    # 3️⃣ Write file to disk
    with file_path.open("wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    # 4️⃣ Persist path atomically
    doc.path = str(file_path)

    await db.commit()
    await db.refresh(doc)

    return {
        "status": "ok"
    }








@router.delete("/{doc_id}")
async def delete_doc(
    doc_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):


    stmt = select(Doc).filter(
        Doc.doc_id == doc_id,
        Doc.user_id == user.id,
    )

    result = await db.execute(stmt)

    doc = result.scalars().first()

    if not doc:
        raise HTTPException(status_code=404, detail="Doc not found or not authorized")

    # delete file first
    file_path = Path(doc.path).resolve()
    if file_path.exists():
        file_path.unlink()
    parent = file_path.parent
    parent.rmdir()


    await db.delete(doc)
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
    stmt = select(Doc).where(
        Doc.user_id == user.id,
    )

    result = await db.execute(stmt)
    docs = result.scalars().all()

    return [
        DocResponse(
            name=doc.name,
            doc_id=doc.doc_id,
        )
        for doc in docs
    ]