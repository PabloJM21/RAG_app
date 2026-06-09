
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import User, get_async_session
from app.users import current_active_user

from app.rag_services.helpers import ExtractionError

from app.rag_services.retrieval_service import run_retrieval

from typing import List, Dict, Any
import json

router = APIRouter(tags=["chat"])


# API Endpoint

MethodSpec = Dict[str, Any]


@router.post("/generator", response_model=MethodSpec)
async def rag_query_tool(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    try:
        query = payload.get("query", "")

        history = payload.get("history", [])

        cleaned_history = []

        for message in history:
            role = message.get("role")
            content = message.get("content")

            if (
                role in ["user", "assistant"]
                and content
            ):
                cleaned_history.append({
                    "role": role,
                    "content": content,
                })

        output = await run_retrieval(
            db,
            user.id,
            query,
            history=cleaned_history,
        )

        if output:
            answer, sources = output

            return {
                "ok": True,
                "answer": answer,
                "sources": sources,
            }

        return {
            "ok": True,
            "answer": "No result",
        }

    except ExtractionError as e:
        raise HTTPException(
            status_code=e.status_code,
            detail=e.message,
        )