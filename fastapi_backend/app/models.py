from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Integer, ForeignKey, Text, and_
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.inspection import inspect
from typing import TypeVar, Type, Dict, Any



T = TypeVar("T", bound="Base")
class Base(DeclarativeBase):

    @classmethod
    async def delete_data(
            cls: type[T],
            where_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> None:
        filters = [
            getattr(cls, key) == value
            for key, value in where_dict.items()
        ]

        result = await db.execute(select(cls).where(and_(*filters)))
        rows = result.scalars().all()
        for row in rows:
            await db.delete(row)

        await db.commit()

    @classmethod
    async def update_data(
            cls: type[T],
            data_dict: Dict[str, Any],
            where_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> None:
        filters = [
            getattr(cls, key) == value
            for key, value in where_dict.items()
        ]

        stmt = select(cls).where(and_(*filters))
        result = await db.execute(stmt)
        pipeline = result.scalars().first()
        if pipeline:
            for key, value in data_dict.items():
                setattr(pipeline, key, value)

            await db.commit()
            await db.refresh(pipeline)






# Define User with all tables

class User(SQLAlchemyBaseUserTableUUID, Base):
    # main page
    docs = relationship("Doc", back_populates="user", cascade="all, delete-orphan")
    main_pipeline = relationship("MainPipeline", back_populates="user", cascade="all, delete-orphan")

    # methods
    indexing_methods = relationship("IndexPipeline", back_populates="user", cascade="all, delete-orphan")
    extraction_methods = relationship("ExtractionPipeline", back_populates="user", cascade="all, delete-orphan")
    retrieval_methods = relationship("RetrievalPipeline", back_populates="user", cascade="all, delete-orphan")

    # rag ops
    paragraphs = relationship("Paragraph", back_populates="user", cascade="all, delete-orphan")
    retrievals = relationship("Retrieval", back_populates="user", cascade="all, delete-orphan") # also used for table
    #embeddings = relationship("Embedding", back_populates="user", cascade="all, delete-orphan")


# Docs

class Doc(Base):
    __tablename__ = "Docs"

    doc_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String, nullable=True)
    path = Column(String, nullable=True)

    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="docs")





# Main Pipeline

class MainPipeline(Base):
    __tablename__ = "MainPipeline"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    router = Column(String, nullable=True)
    reranker = Column(String, nullable=True)
    generator = Column(String, nullable=True)

    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="main_pipeline")



# Indexing

class IndexPipeline(Base):
    __tablename__ = "IndexingMethods"

    doc_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4) # doc_id
    indexer = Column(String, nullable=True) # string representing a Dict
    indexed = Column(Integer, nullable=True) # 0 or 1

    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="indexing_methods")


# Extraction

class ExtractionPipeline(Base):
    __tablename__ = "ExtractionMethods"

    doc_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4) # doc_id
    method_list = Column(String, nullable=True) # string representing List[Dict]
    extracted = Column(Integer, nullable=True) # 0 or 1

    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="extraction_methods")

# Retrieval

class RetrievalPipeline(Base):
    __tablename__ = "RetrievalMethods"

    doc_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4) # doc_id (by now this is the primary key, only one List[Dict] per doc)
    method_list = Column(String, nullable=True) # string representing List[Dict]
    embedded = Column(Integer, nullable=True) # 0 or 1

    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="retrieval_methods")


# -------RAG OPS-------

class Paragraph(Base):
    __tablename__ = "Paragraphs"

    paragraph_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    doc_id = Column(UUID(as_uuid=True), default=uuid4)
    paragraph = Column(Text, nullable=True)
    paragraph_metadata = Column(Text, nullable=True) # example: {"section_id": 1, "embedding_chunk_id": 2}

    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="paragraphs")

    @classmethod
    async def insert_data(
            cls: type[T],
            data_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> T:

        paragraph_dict = {"paragraph": data_dict.pop("paragraph"), "doc_id": data_dict.pop("doc_id")}
        paragraph_metadata = {"paragraph_metadata": data_dict}
        data_dict = paragraph_dict | paragraph_metadata

        new_row = cls(**data_dict)
        db.add(new_row)
        return new_row

    @classmethod
    async def get_all(
            cls: type[T],
            where_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> list[dict[str, Any]]:
        filters = [
            getattr(cls, key) == value
            for key, value in where_dict.items()
        ]

        stmt = select(cls).where(and_(*filters))
        result = await db.execute(stmt)
        rows = result.scalars().all()



        output_list = []
        for row in rows:
            raw_dict = {
                column.key: getattr(row, column.key)
                for column in inspect(row).mapper.column_attrs
            }

            meta_dict = json.loads(raw_dict.pop("paragraph_metadata"))
            output_list.append(raw_dict | meta_dict)


        return output_list


class Retrieval(Base):
    __tablename__ = "Retrievals"

    retrieval_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4) # retrieval_id
    doc_id = Column(UUID(as_uuid=True), default=uuid4)
    level_id = Column(UUID(as_uuid=True), default=uuid4)
    level = Column(String, nullable=True)
    title = Column(Text, nullable=True)
    content = Column(Text, nullable=True)

    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="retrievals")

    @classmethod
    async def insert_data(
            cls: type[T],
            data_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> T:
        new_row = cls(**data_dict)
        db.add(new_row)
        return new_row



    @classmethod
    async def get_all(
            cls: type[T],
            where_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> list[dict[str, Any]]:
        filters = [
            getattr(cls, key) == value
            for key, value in where_dict.items()
        ]

        stmt = select(cls).where(and_(*filters))
        result = await db.execute(stmt)
        rows = result.scalars().all()

        return [
            {
                column.key: getattr(row, column.key)
                for column in inspect(row).mapper.column_attrs
            }
            for row in rows
        ]