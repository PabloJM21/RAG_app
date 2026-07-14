import os
from uuid import UUID, uuid4
from unittest.mock import AsyncMock

import pytest

os.environ.setdefault("FERNET_SECRET_KEY", "A" * 32)

from app.models import DocPipelines
from app.rag_services.helpers import get_doc_title


@pytest.mark.asyncio
async def test_get_doc_title_raises_when_row_missing(mocker):
    mocker.patch.object(DocPipelines, "get_row", AsyncMock(return_value=None))

    with pytest.raises(LookupError, match="No DocPipelines row found"):
        await get_doc_title(
            user_id=uuid4(),
            project_id=uuid4(),
            doc_id=uuid4(),
            db=object(),
        )


@pytest.mark.asyncio
async def test_get_doc_title_normalizes_string_doc_id(mocker):
    expected_row = type("FakeRow", (), {"name": "Test document"})()
    doc_id = str(uuid4())

    async def fake_get_row(*, where_dict, db):
        assert where_dict["doc_id"] == UUID(doc_id)
        return expected_row

    mocker.patch.object(DocPipelines, "get_row", AsyncMock(side_effect=fake_get_row))

    row = await get_doc_title(
        user_id=uuid4(),
        project_id=uuid4(),
        doc_id=doc_id,
        db=object(),
    )

    assert row == "Test document"
