from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Integer, ForeignKey, Text, and_, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.inspection import inspect
from typing import TypeVar, Type, Dict, Any, Optional
from sqlalchemy.types import TypeDecorator, UserDefinedType

# used for vector embeddings
class Vec1536(UserDefinedType):
    def get_col_spec(self):
        return "VEC(1536)"



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
            columns: Optional[list] = None,
    ) -> tuple[list[dict[str, Any]], list[str]]:


        def build_filter(expr, value):
            if isinstance(value, (list, tuple, set)):
                return expr.in_(value)
            return expr == value

        # ------------------------
        # Build WHERE conditions
        # ------------------------
        filters = []

        for key, value in where_dict.items():
            filters.append(build_filter(getattr(cls, key), value))

        if columns:
            stmt = select(*(getattr(cls, col) for col in columns))
        else:
            stmt = select(cls)


        if filters:
            stmt = stmt.where(and_(*filters))

        # ------------------------
        # Execute query
        # ------------------------
        result = await db.execute(stmt)
        rows = result.mappings().all() # mappings avoid repeated getattr(row, ...) calls and simplify merging

        # ------------------------
        # Column handling
        # ------------------------
        if not columns:
            columns = [c.key for c in inspect(cls).mapper.column_attrs]

        data = [{k: row[k] for k in columns} for row in rows]

        return data, columns




    @classmethod
    async def get_row(
            cls: type[T],
            where_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> dict[str, Any]:

        filters = []
        for key, value in where_dict.items():
            column = getattr(cls, key)
            filters.append(column == value)

        stmt = select(cls).where(and_(*filters))
        result = await db.execute(stmt)
        row = result.scalars().first()

        return row






# Define User with all tables

class User(SQLAlchemyBaseUserTableUUID, Base):
    # main page
    doc_pipelines = relationship("DocPipelines", back_populates="user", cascade="all, delete-orphan")
    main_pipeline = relationship("MainPipeline", back_populates="user", cascade="all, delete-orphan")

    # rag ops
    paragraphs = relationship("Paragraph", back_populates="user", cascade="all, delete-orphan")
    retrievals = relationship("Retrieval", back_populates="user", cascade="all, delete-orphan") # also used for table
    embeddings = relationship("Embedding", back_populates="user", cascade="all, delete-orphan")


# Docs

class DocPipelines(Base):
    __tablename__ = "DocPipelines"

    doc_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String, nullable=True)
    path = Column(String, nullable=True)

    conversion_pipeline = Column(String, nullable=True)  # string representing a Dict
    converted = Column(Integer, nullable=True)  # 0 or 1

    chunking_pipeline = Column(String, nullable=True)  # string representing a List[Dict]
    chunked = Column(Integer, nullable=True)  # 0 or 1

    extraction_pipeline = Column(String, nullable=True) # string representing a List[Dict]
    extracted = Column(Integer, nullable=True) # 0 or 1

    retrieval_pipeline = Column(String, nullable=True) # string representing a List[Dict]
    exported = Column(Integer, nullable=True) # 0 or 1

    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="doc_pipelines")






# Main Pipeline

class MainPipeline(Base):
    __tablename__ = "MainPipeline"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    router = Column(String, nullable=True)
    doc_pipelines = Column(String, nullable=True)
    reranker = Column(String, nullable=True)
    generator = Column(String, nullable=True)

    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="main_pipeline")




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
    async def insert_paragraphs(
            cls: type[T],
            data_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> T:

        # 1. Define which keys belong to "real" columns (not metadata)
        paragraph_keys = ["paragraph_id", "paragraph", "user_id", "doc_id"]

        # 2. Split the incoming where_dict into:
        #    - paragraph_dict: filters for real columns
        #    - metadata_dict: filters for JSON metadata keys
        paragraph_dict: Dict[str, Any] = {
            key: value for key, value in data_dict.items() if key in paragraph_keys
        }
        metadata_dict: Dict[str, Any] = {
            key: value for key, value in data_dict.items() if key not in paragraph_keys
        }

        # 3. the new dict consists of paragraph_dict, plus the metadata_dict stored inside the "paragraph_metadata" key
        new_dict = paragraph_dict | {"paragraph_metadata": metadata_dict}
        new_row = cls(**new_dict)
        db.add(new_row)

    @classmethod
    async def get_all_paragraphs_old(
            cls: Type[T],
            where_dict: Dict[str, Any],
            db: AsyncSession,
            columns: Optional[list[str]] = None,
    ) -> tuple[list[dict[str, Any]], list[str]]:

        PARAGRAPH_KEYS = {"paragraph_id", "paragraph", "user_id", "doc_id"}

        def build_filter(expr, value):
            if isinstance(value, (list, tuple, set)):
                return expr.in_(value)
            return expr == value

        # ------------------------
        # Build WHERE conditions
        # ------------------------
        filters = []

        for key, value in where_dict.items():
            if key in PARAGRAPH_KEYS:
                filters.append(build_filter(getattr(cls, key), value))
            else:
                json_expr = cls.paragraph_metadata[key].astext
                filters.append(build_filter(json_expr, str(value)))

        stmt = select(cls)
        if filters:
            stmt = stmt.where(and_(*filters))

        # ------------------------
        # Execute query
        # ------------------------
        result = await db.execute(stmt)
        rows = result.mappings().all()

        # ------------------------
        # Column handling
        # ------------------------
        if not columns:
            columns = [c.key for c in inspect(cls).mapper.column_attrs]

        metadata_keys = set(columns) - PARAGRAPH_KEYS

        # ------------------------
        # Merge metadata
        # ------------------------
        output = []

        for row in rows:
            meta = row.get("paragraph_metadata") or {}
            merged = {
                **{k: row[k] for k in PARAGRAPH_KEYS if k in row},
                **{k: v for k, v in meta.items() if k in metadata_keys},
            }
            output.append(merged)

        return output, columns



    @classmethod
    async def get_all_paragraphs(
            cls,
            where_dict: dict[str, Any],
            db: AsyncSession,
            columns: list[str] | None = None,
    ):

        PARAGRAPH_KEYS = {"paragraph_id", "paragraph", "user_id", "doc_id"}

        if not columns:
            columns = [c.key for c in inspect(cls).mapper.column_attrs]

        raw_columns = [c for c in columns if c in PARAGRAPH_KEYS]
        metadata_columns = [c for c in columns if c not in PARAGRAPH_KEYS]

        # Projection
        select_columns = (
                [getattr(cls, c) for c in raw_columns]
                + [
                    func.json_extract(cls.paragraph_metadata, f"$.{c}").label(c)
                    for c in metadata_columns
                ]
        )

        # Filters
        filters = []
        for key, value in where_dict.items():
            if key in PARAGRAPH_KEYS:
                filters.append(getattr(cls, key) == value)
            else:
                filters.append(
                    func.json_extract(
                        cls.paragraph_metadata, f"$.{key}"
                    ) == value
                )

        stmt = select(*select_columns)
        if filters:
            stmt = stmt.where(and_(*filters))

        result = await db.execute(stmt)
        return result.mappings().all(), columns





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






class Embedding(Base):
    __tablename__ = "Embeddings"

    embedding_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)  # retrieval_id
    doc_id = Column(UUID(as_uuid=True), default=uuid4)
    retrieval_id = Column(UUID(as_uuid=True), default=uuid4) # 1-to-1 relationship to pk
    level = Column(String, nullable=True)

    embedding = Column(Vec1536, nullable=False)

    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)

    user = relationship("User", back_populates="embeddings")






