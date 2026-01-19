from fastapi import FastAPI
from fastapi_pagination import add_pagination
from .users import auth_backend, fastapi_users, AUTH_URL_PATH
from .schemas import UserCreate, UserRead, UserUpdate
from fastapi.middleware.cors import CORSMiddleware
from .utils import simple_generate_unique_route_id
from app.routes.docs import router as docs_router
from app.routes.main_pipeline import router as main_pipeline_router
from app.routes.conversion import router as conversion_router
from app.routes.chunking import router as chunking_router
from app.routes.extraction import router as extraction_router
from app.routes.retrieval import router as retrieval_router
from app.config import settings
from app.database import create_db_and_tables, drop_tables


app = FastAPI(
    generate_unique_id_function=simple_generate_unique_route_id,
    openapi_url=settings.OPENAPI_URL,
)


#await drop_tables()

@app.on_event("startup")
async def on_startup():
    await drop_tables()
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
app.include_router(main_pipeline_router, prefix="/main-pipeline")
app.include_router(conversion_router, prefix="/conversion")
app.include_router(chunking_router, prefix="/chunking")
app.include_router(extraction_router, prefix="/extraction")
app.include_router(retrieval_router, prefix="/retrieval")
add_pagination(app)
