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

    @classmethod
    async def get_all(
            cls: type[T],
            where_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> tuple[list[dict[str, Any]], list[str]]:
        filters = [
            getattr(cls, key) == value
            for key, value in where_dict.items()
        ]

        stmt = select(cls).where(and_(*filters))
        result = await db.execute(stmt)
        rows = result.scalars().all()

        columns = [c.key for c in inspect(cls).mapper.column_attrs]

        data = [
            {
                column: getattr(row, column)
                for column in columns
            }
            for row in rows
        ]

        return data, columns





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
    async def get_all_old(
            cls: type[T],
            where_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> tuple[list[dict[str, Any]], list[str]]:
        filters = [
            getattr(cls, key) == value
            for key, value in where_dict.items()
        ]

        stmt = select(cls).where(and_(*filters))
        result = await db.execute(stmt)
        rows = result.scalars().all()
        columns = [c.key for c in inspect(cls).mapper.column_attrs]


        output_list = []
        for row in rows:
            raw_dict = {
                column: getattr(row, column)
                for column in columns
            }

            meta_dict = json.loads(raw_dict.pop("paragraph_metadata"))
            output_list.append(raw_dict | meta_dict)


        return output_list, columns

    @classmethod
    async def get_all(
            cls: Type[T],
            where_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> tuple[list[dict[str, Any]], list[str]]:
        """
        Generic filter method that:
        - Filters on normal columns (paragraph_id, doc_id, paragraph, user_id)
        - Filters on JSON metadata keys inside paragraph_metadata
        - Returns rows with metadata merged into the top-level dict
        """

        # 1. Define which keys belong to "real" columns (not metadata)
        paragraph_keys = ["paragraph_id", "paragraph", "user_id", "doc_id"]

        # 2. Split the incoming where_dict into:
        #    - paragraph_dict: filters for real columns
        #    - metadata_dict: filters for JSON metadata keys
        paragraph_dict: Dict[str, Any] = {
            key: value for key, value in where_dict.items() if key in paragraph_keys
        }
        metadata_dict: Dict[str, Any] = {
            key: value for key, value in where_dict.items() if key not in paragraph_keys
        }

        filters = []

        # 3. Build filters for normal columns
        for key, value in paragraph_dict.items():
            column = getattr(cls, key)

            # If the value is a list/tuple/set → use IN
            if isinstance(value, (list, tuple, set)):
                filters.append(column.in_(value))
            else:
                filters.append(column == value)

        # 4. Build filters for JSON metadata
        #    paragraph_metadata is a JSON/JSONB column, so we can index into it.
        #    Example: paragraph_metadata["section_id"].astext == "1"
        for key, value in metadata_dict.items():
            # JSON path expression for this metadata key
            json_expr = cls.paragraph_metadata[key].astext

            if isinstance(value, (list, tuple, set)):
                # Convert all values to strings, because .astext returns text
                filters.append(json_expr.in_(list(map(str, value))))
            else:
                filters.append(json_expr == str(value))

        # 5. Build the SELECT statement with all filters combined via AND
        stmt = select(cls)
        if filters:
            stmt = stmt.where(and_(*filters))

        # 6. Execute the query asynchronously
        result = await db.execute(stmt)
        rows = result.scalars().all()

        # 7. Get the list of column names defined on the model
        columns = [c.key for c in inspect(cls).mapper.column_attrs]

        # 8. For each row:
        #    - Build a dict of normal columns
        #    - Extract paragraph_metadata (JSON) and merge it into the dict
        output_list: list[dict[str, Any]] = []
        for row in rows:
            # Base dict with all "real" columns
            raw_dict = {
                column: getattr(row, column)
                for column in columns
            }

            # Pop the JSON metadata from the dict
            meta = raw_dict.pop("paragraph_metadata", None)

            # Ensure metadata is a dict (could be None)
            if isinstance(meta, dict):
                merged = {**raw_dict, **meta}
            else:
                merged = raw_dict

            output_list.append(merged)

        # 9. Return:
        #    - list of merged dicts (columns + metadata)
        #    - original column names (without expanded metadata keys)
        return output_list, columns


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
    ):
        new_row = cls(**data_dict)
        db.add(new_row)


    @classmethod
    async def get_all(
            cls: type[T],
            where_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> tuple[list[dict[str, Any]], list[str]]:

        filters = []
        for key, value in where_dict.items():
            column = getattr(cls, key)

            if isinstance(value, (list, tuple, set)):
                filters.append(column.in_(value))
            else:
                filters.append(column == value)

        stmt = select(cls).where(and_(*filters))
        result = await db.execute(stmt)
        rows = result.scalars().all()

        columns = [c.key for c in inspect(cls).mapper.column_attrs]

        data = [
            {column: getattr(row, column) for column in columns}
            for row in rows
        ]

        return data, columns




class Embedding(Base):
    __tablename__ = "Embeddings"

    embedding_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)  # retrieval_id
    doc_id = Column(UUID(as_uuid=True), default=uuid4)
    retrieval_id = Column(UUID(as_uuid=True), default=uuid4) # 1-to-1 relationship to pk
    level = Column(String, nullable=True)

    embedding = Column(Vec1536, nullable=False)

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


    @classmethod
    async def get_all(
            cls: type[T],
            columns: list,
            where_dict: Dict[str, Any],
            db: AsyncSession,
    ) -> tuple[list[dict[str, Any]], list[str]]:

        filters = []
        for key, value in where_dict.items():
            column = getattr(cls, key)

            if isinstance(value, (list, tuple, set)):
                filters.append(column.in_(value))
            else:
                filters.append(column == value)

        stmt = select(cls).where(and_(*filters))
        result = await db.execute(stmt)
        rows = result.scalars().all()

        if not columns:
            columns = [c.key for c in inspect(cls).mapper.column_attrs]

        data = [
            {column: getattr(row, column) for column in columns}
            for row in rows
        ]

        return data, columns


