from fastapi import FastAPI
from fastapi_pagination import add_pagination
from .users import auth_backend, fastapi_users, AUTH_URL_PATH
from .schemas import UserCreate, UserRead, UserUpdate
from fastapi.middleware.cors import CORSMiddleware
from .utils import simple_generate_unique_route_id
from app.routes.api_keys import router as api_router
from app.routes.docs import router as docs_router
from app.routes.main_pipeline import router as main_pipeline_router
from app.routes.conversion import router as conversion_router
from app.routes.chunking import router as chunking_router
from app.routes.extraction import router as extraction_router
from app.routes.retrieval import router as retrieval_router
from app.routes.mcp import router as mcp_router
from app.config import settings
from app.database import create_db_and_tables, drop_tables, drop_specific_table


"""
Docling compatibility patch.

Docling (>=2.60) unconditionally calls `torch.xpu.is_available()` when
selecting an accelerator device. This crashes on non-Intel PyTorch builds
(CUDA-only or CPU-only), because `torch.xpu` does not exist unless PyTorch
is built with Intel XPU support.

This patch provides a minimal stub for `torch.xpu` so that:
- `torch.xpu.is_available()` exists
- it safely returns False
- Docling correctly falls back to CUDA, MPS, or CPU

This must run BEFORE importing any docling modules.
Safe to remove once Docling guards access with `hasattr(torch, "xpu")`.
"""

import torch
import types

if not hasattr(torch, "xpu"):
    torch.xpu = types.SimpleNamespace(
        is_available=lambda: False
    )




app = FastAPI(
    generate_unique_id_function=simple_generate_unique_route_id,
    openapi_url=settings.OPENAPI_URL,
)


#await drop_tables()
#await drop_specific_table("Retrievals")

@app.on_event("startup")
async def on_startup():
    await create_db_and_tables()


# Middleware for CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication and user management routes
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix=f"/{AUTH_URL_PATH}/jwt",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix=f"/{AUTH_URL_PATH}",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix=f"/{AUTH_URL_PATH}",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix=f"/{AUTH_URL_PATH}",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

# Include routes
app.include_router(docs_router, prefix="/docs")
app.include_router(docs_router, prefix="/api_keys")
app.include_router(main_pipeline_router, prefix="/main-pipeline")
app.include_router(conversion_router, prefix="/conversion")
app.include_router(chunking_router, prefix="/chunking")
app.include_router(extraction_router, prefix="/extraction")
app.include_router(retrieval_router, prefix="/retrieval")
app.include_router(mcp_router, prefix="/mcp")

add_pagination(app)
