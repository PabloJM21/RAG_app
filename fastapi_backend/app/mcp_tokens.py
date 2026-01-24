import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import jwt

from app.config import settings


MCP_TOKEN_ALGORITHM = "HS256"

# Recommended: use a dedicated secret
# fallback to ACCESS_SECRET_KEY if you want
MCP_TOKEN_SECRET = getattr(
    settings,
    "MCP_SECRET_KEY",
    settings.ACCESS_SECRET_KEY,
)

class MCPTokenError(Exception):
    pass



def create_jwt_token(
    *,
    subject: str,
    scope: str,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Create a short-lived, signed JWT for MCP usage.

    - subject: user_id (string)
    - scope: must be "mcp"
    """

    now = datetime.now(tz=timezone.utc)

    if expires_delta is None:
        expires_delta = timedelta(minutes=30)

    payload: Dict[str, Any] = {
        "iss": "your-app-name",
        "sub": subject,
        "scope": scope,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }

    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(
        payload,
        MCP_TOKEN_SECRET,
        algorithm=MCP_TOKEN_ALGORITHM,
    )

    return token



def decode_and_validate_mcp_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            MCP_TOKEN_SECRET,
            algorithms=[MCP_TOKEN_ALGORITHM],
            options={"require": ["exp", "sub", "scope"]},
        )
    except jwt.ExpiredSignatureError:
        raise MCPTokenError("MCP token expired")
    except jwt.InvalidTokenError:
        raise MCPTokenError("Invalid MCP token")

    if payload.get("scope") != "mcp":
        raise MCPTokenError("Invalid token scope")

    return payload