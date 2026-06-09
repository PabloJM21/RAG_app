# ===========JWT Tokens==========
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Callable, Awaitable
import inspect

import jwt

from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.config import settings
from app.users import current_active_user, get_user_manager, UserManager
from app.database import User, get_async_session

from app.rag_services.helpers import ExtractionError

from app.rag_services.retrieval_service import run_retrieval


# ==============================
# OAuth Pre-Registered Clients
# ==============================
OAUTH_CLIENTS = {
    "claude-code": {
        "client_id": "claude-code",
        "client_secret": "dev-secret",
        "redirect_uris": ["http://localhost:*"],
    }
}


# ==============================
# JWT Tokens
# ==============================
MCP_TOKEN_ALGORITHM = "HS256"
MCP_TOKEN_SECRET = getattr(settings, "MCP_SECRET_KEY", settings.ACCESS_SECRET_KEY)

# Canonical MCP resource URL for local dev
MCP_RESOURCE_AUDIENCE = "http://localhost/mcp"
MCP_ISSUER = "http://localhost"


class MCPTokenError(Exception):
    pass


def create_jwt_token(
    *,
    subject: str,
    scope: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    now = datetime.now(tz=timezone.utc)

    if expires_delta is None:
        expires_delta = timedelta(minutes=30)

    payload: Dict[str, Any] = {
        "iss": MCP_ISSUER,
        "sub": subject,
        "scope": scope,
        "aud": MCP_RESOURCE_AUDIENCE,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }

    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, MCP_TOKEN_SECRET, algorithm=MCP_TOKEN_ALGORITHM)


def decode_and_validate_mcp_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            MCP_TOKEN_SECRET,
            algorithms=[MCP_TOKEN_ALGORITHM],
            audience=MCP_RESOURCE_AUDIENCE,
            options={"require": ["exp", "sub", "scope"]},
        )
    except jwt.ExpiredSignatureError:
        raise MCPTokenError("MCP token expired")
    except jwt.InvalidTokenError:
        raise MCPTokenError("Invalid MCP token")

    if payload.get("scope") != "mcp":
        raise MCPTokenError("Invalid token scope")

    return payload


# ==============================
# Router
# ==============================
# Mount with:
# app.include_router(mcp_router, prefix="/mcp")
router = APIRouter(tags=["mcp"])


# ==============================
# OAuth Endpoints
# ==============================

@router.get("/oauth/authorize")
async def authorize(
    response_type: str,
    client_id: str,
    redirect_uri: str,
    state: str,
    user: User = Depends(current_active_user),
):
    client = OAUTH_CLIENTS.get(client_id)
    if not client:
        raise HTTPException(status_code=400, detail="Unknown client")

    if response_type != "code":
        raise HTTPException(status_code=400, detail="Unsupported response_type")

    # Minimal redirect URI validation for pre-registered dev client
    allowed_redirects = client.get("redirect_uris", [])
    if redirect_uri not in allowed_redirects and "http://localhost:*" not in allowed_redirects:
        raise HTTPException(status_code=400, detail="Invalid redirect_uri")

    # Skip consent in dev mode
    code = create_jwt_token(
        subject=str(user.id),
        scope="mcp",
        expires_delta=timedelta(minutes=5),
        extra_claims={"type": "auth_code"},
    )

    return RedirectResponse(f"{redirect_uri}?code={code}&state={state}")


@router.post("/oauth/token")
async def token(
    grant_type: str = Form(...),
    code: str = Form(...),
    client_id: str = Form(...),
    client_secret: Optional[str] = Form(default=None),
):
    if grant_type != "authorization_code":
        raise HTTPException(status_code=400, detail="Unsupported grant")

    client = OAUTH_CLIENTS.get(client_id)
    if not client:
        raise HTTPException(status_code=400, detail="Unknown client")

    expected_secret = client.get("client_secret")
    if expected_secret and client_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid client credentials")

    payload = decode_and_validate_mcp_token(code)

    if payload.get("type") != "auth_code":
        raise HTTPException(status_code=400, detail="Invalid code")

    access_token = create_jwt_token(
        subject=payload["sub"],
        scope="mcp",
        expires_delta=timedelta(minutes=30),
    )

    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": 1800,
    }


# ==============================
# Metadata Endpoints
# ==============================

@router.get("/.well-known/oauth-authorization-server")
async def oauth_metadata():
    return {
        "issuer": MCP_ISSUER,
        "authorization_endpoint": f"{MCP_ISSUER}/mcp/oauth/authorize",
        "token_endpoint": f"{MCP_ISSUER}/mcp/oauth/token",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "code_challenge_methods_supported": ["S256"],
    }


@router.get("/.well-known/oauth-protected-resource")
async def resource_metadata():
    return {
        "resource": MCP_RESOURCE_AUDIENCE,
        "authorization_servers": [MCP_ISSUER],
    }


# ==============================
# Dev helper endpoint
# ==============================

@router.post("/issue-url")
async def issue_mcp_url(user: User = Depends(current_active_user)):
    token = create_jwt_token(
        subject=str(user.id),
        scope="mcp",
        expires_delta=timedelta(minutes=30),
    )

    return {"mcp_url": f"{MCP_RESOURCE_AUDIENCE}/{token}"}


# ==============================
# MCP Auth Dependency
# ==============================

async def current_mcp_user(
    request: Request,
    user_manager: UserManager = Depends(get_user_manager),
) -> User:
    auth = request.headers.get("Authorization")
    token = None

    if auth:
        if auth.startswith("Bearer "):
            token = auth.removeprefix("Bearer ").strip()
        elif auth.startswith("ApiKey "):
            token = auth.removeprefix("ApiKey ").strip()

    if not token:
        raise HTTPException(status_code=401, detail="Missing MCP token")

    try:
        payload = decode_and_validate_mcp_token(token)
    except MCPTokenError as e:
        raise HTTPException(status_code=401, detail=str(e))

    try:
        user_id = UUID(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid MCP token subject")

    user = await user_manager.get(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid MCP user")

    return user


# ==============================
# JSON-RPC Models
# ==============================

class JsonRpcRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[int | str] = None
    method: str
    params: Optional[Dict[str, Any]] = None


def rpc_result(_id: Any, result: Any):
    return {"jsonrpc": "2.0", "id": _id, "result": result}


def rpc_error(_id: Any, code: int, message: str, data: Any = None):
    err = {"code": code, "message": message}
    if data is not None:
        err["data"] = data
    return {"jsonrpc": "2.0", "id": _id, "error": err}


# ==============================
# Tool Registry
# ==============================

ToolFn = Callable[..., Awaitable[Any]] | Callable[..., Any]
TOOLS: Dict[str, Dict[str, Any]] = {}

def tool(name: str, description: str = "", input_schema: Optional[Dict[str, Any]] = None):
    def deco(fn: ToolFn):
        TOOLS[name] = {
            "fn": fn,
            "description": description,
            "inputSchema": input_schema or {
                "type": "object",
                "properties": {},
                "required": []
            },
        }
        return fn
    return deco


# ==============================
# MCP Endpoint
# ==============================

@router.post("/")
async def mcp_jsonrpc(
    payload: JsonRpcRequest,
    user: User = Depends(current_mcp_user),
    db: AsyncSession = Depends(get_async_session),
):
    method = payload.method
    params = payload.params or {}
    _id = payload.id

    if payload.jsonrpc != "2.0":
        return rpc_error(_id, -32600, "Invalid Request")

    if method == "initialize":
        return rpc_result(_id, {
            "protocolVersion": "2025-03-26",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "fastapi-mcp", "version": "1.0"},
        })

    if method == "tools/list":
        return rpc_result(_id, {
            "tools": [
                {
                    "name": name,
                    "description": meta["description"],
                    "inputSchema": meta["inputSchema"],
                }
                for name, meta in TOOLS.items()
            ]
        })

    if method == "tools/call":
        name = params.get("name")
        arguments = params.get("arguments") or {}

        if name not in TOOLS:
            return rpc_error(_id, -32601, "Unknown tool")

        fn = TOOLS[name]["fn"]

        try:
            if inspect.iscoroutinefunction(fn):
                result = await fn(user=user, db=db, **arguments)
            else:
                result = fn(user=user, db=db, **arguments)
            return rpc_result(_id, result)

        except TypeError as e:
            return rpc_error(_id, -32602, "Invalid params", str(e))
        except Exception as e:
            return rpc_error(_id, -32000, "Server error", str(e))

    return rpc_error(_id, -32601, "Unknown method")


# ==============================
# Tools
# ==============================

@tool("ping", "Validate MCP auth")
async def ping_tool(user: User, db: AsyncSession = None):
    return {
        "ok": True,
        "user_id": str(user.id),
        "email": getattr(user, "email", None),
    }


@tool(
    "rag_query",
    "Run RAG pipeline",
    input_schema={
        "type": "object",
        "properties": {
            "query": {"type": "string"}
        },
        "required": ["query"]
    }
)
async def rag_query_tool(user: User, db: AsyncSession, query: str):


    try:

        output = await run_retrieval(db, user.id, query)


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
        return {
            "ok": False,
            "error": {
                "type": "ExtractionError",
                "message": e.message,
                "status_code": e.status_code,
            }
        }

    except Exception as e:
        return {
            "ok": False,
            "error": {
                "type": "InternalError",
                "message": str(e),
            }
        }