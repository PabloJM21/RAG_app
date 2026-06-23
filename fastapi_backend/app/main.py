from fastapi import FastAPI
from fastapi_pagination import add_pagination
from .users import auth_backend, fastapi_users, AUTH_URL_PATH
from .schemas import UserCreate, UserRead, UserUpdate
from fastapi.middleware.cors import CORSMiddleware
from .utils import simple_generate_unique_route_id
from app.routes.api_keys import router as api_router
from app.routes.projects import router as projects_router
from app.routes.docs import router as docs_router
from app.routes.main_pipeline import router as main_pipeline_router
from app.routes.settings import router as settings_router
from app.routes.conversion import router as conversion_router
from app.routes.chunking import router as chunking_router
from app.routes.extraction import router as extraction_router
from app.routes.retrieval import router as retrieval_router
from app.routes.chat import router as chat_router
from app.config import settings
from app.database import create_db_and_tables, drop_tables, drop_specific_table





app = FastAPI(
    generate_unique_id_function=simple_generate_unique_route_id,
    openapi_url=settings.OPENAPI_URL,
)


#await drop_specific_table("Retrievals")
#await drop_tables()

import os
@app.on_event("startup")
async def on_startup():
    print("DATABASE_URL =", settings.DATABASE_URL)
    print("CWD =", os.getcwd())
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
app.include_router(projects_router, prefix="/projects")
app.include_router(docs_router, prefix="/docs")
app.include_router(docs_router, prefix="/api_keys")
app.include_router(main_pipeline_router, prefix="/main-pipeline")
app.include_router(settings_router, prefix="/settings")
app.include_router(conversion_router, prefix="/conversion")
app.include_router(chunking_router, prefix="/chunking")
app.include_router(extraction_router, prefix="/extraction")
app.include_router(retrieval_router, prefix="/retrieval")
app.include_router(chat_router, prefix="/chat")


add_pagination(app)
