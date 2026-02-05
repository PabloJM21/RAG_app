import os
import pandas as pd
from pathlib import Path
# Database ops
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocPipelines

#logs
from app.log_generator import InfoLogger

#typing
from typing import Any, Dict, List, Optional, Iterable


# API Keys

from cryptography.fernet import Fernet
import json
from app.models import ApiKey
# fastapi exceptions
from fastapi import HTTPException
from dotenv import load_dotenv
load_dotenv()


def load_pipeline_old(pipeline):


    def check_list(input_list: list):

        for method in input_list:
            if isinstance(method, dict):
                method.pop("color", None)

        return input_list



    if pipeline is None:
        return None

    if isinstance(pipeline, list):
        return check_list(pipeline)



    if isinstance(pipeline, dict):
        output_pipeline = pipeline.pop("color", None)
        if output_pipeline:
            return output_pipeline


        pipeline_items = pipeline.items()
        for k, v in pipeline_items:

            if isinstance(pipeline[k], dict):
                pipeline[k].pop("color", None)

    return pipeline




def load_pipeline(pipeline):
    if pipeline is None:
        return None
    return json.loads(pipeline)


def load_doc_pipelines(pipelines):

    if pipelines is None:
        return None

    pipelines = json.loads(pipelines)

    output_dict = {}

    for k, v in pipelines.items():
        try:
            output_dict[UUID(k)] = v
        except ValueError:
            # skip invalid UUID keys instead of crashing
            continue

    return output_dict




async def get_doc_paths(user_id: UUID, doc_id: UUID, db: AsyncSession):
    row = await DocPipelines.get_row(where_dict={"user_id": user_id, "doc_id": doc_id}, db=db)
    source_path = row.path
    processed_path = os.path.join(os.path.dirname(source_path), "processed_markdown.md")


    return source_path, processed_path

async def get_doc_title(user_id: UUID, doc_id: UUID, db: AsyncSession):
    row = await DocPipelines.get_row(where_dict={"user_id": user_id, "doc_id": doc_id}, db=db)

    return row.name


async def get_log_path(user_id: UUID, stage: str):

    # Compute log and output markdown path
    base_path = Path("shared-data/logs")
    log_dir = base_path / str(user_id)
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{stage}.log"



    return log_path


def log_pipeline_methods(logger: InfoLogger, input_pipeline: list[dict[str, Any]]):
    logger.log_step(task="info_text", layer=2, log_text=f"This Pipeline consists of following methods: ",
                            table_data=input_pipeline)
    for input_method in input_pipeline:
        logger.log_step(task="table", layer=2, table_data=input_method)







# -----------------------------------------
# API KEY SERVICE
# -----------------------------------------




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
    rows, _ = await ApiKey.get_all(
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












