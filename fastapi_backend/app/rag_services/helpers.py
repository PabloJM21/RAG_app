import os
import pandas as pd
from pathlib import Path
# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocPipelines


async def get_doc_paths(user_id: UUID, doc_id: UUID, db: AsyncSession):
    row = await DocPipelines.get_row(where_dict={"user_id": user_id, "doc_id": doc_id}, db=db)
    source_path = row.path
    processed_path = os.path.join(os.path.dirname(source_path), "processed_markdown.md")


    return source_path, processed_path

async def get_doc_name(user_id: UUID, doc_id: UUID, db: AsyncSession):
    row = await DocPipelines.get_row(where_dict={"user_id": user_id, "doc_id": doc_id}, db=db)

    return row.name


async def get_log_paths(user_id: UUID, stage: str):

    # Compute log and output markdown path
    base_path = Path("shared-data/logs")
    log_dir = base_path / str(user_id)
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{stage}.log"
    log_md_path = log_dir / f"{stage}.md"

    return log_path, log_md_path