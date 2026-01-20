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




# API KEY SERVICE
from typing import Any, Dict, List, Optional, Iterable
from cryptography.fernet import Fernet
import json
from app.models import ApiKeys
# fastapi exceptions
from fastapi import HTTPException

fernet = Fernet(os.environ["FERNET_SECRET_KEY"])


def encrypt_key(key: str) -> str:
    return fernet.encrypt(key.encode()).decode()

def decrypt_key(token: str) -> str:
    return fernet.decrypt(token.encode()).decode()

from typing import List
from fastapi import HTTPException
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

async def get_user_api_keys(
    *,
    user_id: UUID,
    base_api: str,
    db: AsyncSession,
) -> List[str]:
    """
    Returns all decrypted API keys for a given user and base_api.
    Raises 400 if no keys are configured.
    """
    rows, _ = await ApiKeys.get_all(
        columns=["encrypted_key"],
        where_dict={
            "user_id": user_id,
            "base_api": base_api,
        },
        db=db,
    )

    if not rows:
        raise HTTPException(
            status_code=400,
            detail=f"No API keys configured for provider {base_api}",
        )

    decrypted_keys = [
        decrypt_key(row["encrypted_key"])
        for row in rows
    ]

    return decrypted_keys








