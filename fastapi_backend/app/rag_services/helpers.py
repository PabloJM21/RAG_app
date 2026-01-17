import os
import pandas as pd
from pathlib import Path
# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Doc


async def get_paths(user_id: UUID, doc_id: UUID, stage: str, db: AsyncSession):
    rows, columns = await Doc.get_all({"user_id": user_id, "doc_id": doc_id}, db)
    document_df = pd.DataFrame(rows, columns=columns)
    source_path = document_df["path"].iloc[0]
    processed_path = os.path.join(os.path.dirname(source_path), "processed_markdown.md")

    # Compute log and output markdown path
    base_path = Path("shared-data/logs")
    log_dir = base_path / str(user_id) / str(doc_id)
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{stage}.log"
    log_md_path = log_dir / f"{stage}.md"

    return source_path, processed_path, log_path, log_md_path