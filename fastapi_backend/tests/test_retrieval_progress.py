import pytest

from app.rag_services import retrieval_service


class StubLogger:
    def log_step(self, **kwargs):
        return None


class DummyRetriever(retrieval_service.BaseRetriever):
    def __init__(self, db, logger):
        super().__init__(
            db=db,
            logger=logger,
            user_id="user-1",
            project_id="project-1",
            level="title",
            retrieval_amount=2,
            query_transformation_model="",
            query_transformation_prompt="",
            doc_id=None,
        )

    async def init_chat_client(self):
        return None

    async def filter_retrieval_content(self, filter_ids=()):
        return {
            "retrieval_id": ["chunk-1", "chunk-2"],
            "content": ["first chunk", "second chunk"],
        }

    async def run_retriever(self, query, retrieval_dict):
        return retrieval_dict["retrieval_id"]


@pytest.mark.asyncio
async def test_base_retriever_emits_progress_messages(monkeypatch):
    async def fake_get_retrieval_content(db, user_id, project_id, retrieval_output_ids):
        return {"retrieval_id": retrieval_output_ids, "content": ["first", "second"]}

    monkeypatch.setattr(retrieval_service, "get_retrieval_content", fake_get_retrieval_content)

    events = []

    async def progress(message):
        events.append(message)

    retriever = DummyRetriever(db=None, logger=StubLogger())
    output = await retriever.run_retrieval(query="hello", progress=progress)

    assert output["retrieval_id"] == ["chunk-1", "chunk-2"]
    assert events == ["Scanning title chunks", "2 chunks retrieved"]
