import json

from app.retrieval.lightrag_retriever import LightRagRetriever
from app.retrieval.lightrag_doc_registry import LightRagDocRegistry, compute_lightrag_doc_id
from app.retrieval.lightrag_metadata_codec import (
    decode_document_with_metadata,
    encode_document_with_metadata,
)


def test_lightrag_query_normalizes_sources_shape():
    class DummyClient:
        def __init__(self):
            self.calls = []

        def query(self, text: str, top_k: int = 6):
            self.calls.append((text, top_k))
            return {
                "response": "answer text",
                "sources": [
                    {"content": "source text", "id": "s1", "title": "Doc"},
                ],
            }

        def insert_texts(self, texts):
            return None

    client = DummyClient()
    retriever = LightRagRetriever(client)

    chunks = retriever.query("what", top_k=4)

    assert client.calls == [("what", 4)]
    assert chunks == [
        {
            "document": "source text",
            "metadata": {
                "source_type": "lightrag",
                "source_id": "s1",
                "title": "Doc",
            },
        }
    ]


def test_lightrag_query_prefers_query_data_chunks_shape():
    encoded_content = encode_document_with_metadata(
        "paid, shipped, and completed orders can apply",
        {
            "source_type": "kb",
            "source_id": "kb:5:3:0",
            "document_id": 5,
            "chunk_id": 701,
            "chunk_index": 0,
            "category": "after_sales",
            "version": 3,
            "title": "KB After Sales Policy",
        },
    )

    class DummyClient:
        def __init__(self):
            self.query_data_calls = []

        def query_data(self, text: str, top_k: int = 6, chunk_top_k: int | None = None, enable_rerank: bool | None = None):
            self.query_data_calls.append((text, top_k, chunk_top_k, enable_rerank))
            return {
                "status": "success",
                "data": {
                    "chunks": [
                        {
                            "content": encoded_content,
                            "chunk_id": "chunk-1",
                            "file_path": "unknown_source",
                        }
                    ]
                },
            }

        def query(self, text: str, top_k: int = 6):
            raise AssertionError("legacy /query fallback should not be called when query_data succeeds")

        def insert_texts(self, texts):
            return None

    client = DummyClient()
    retriever = LightRagRetriever(client)

    chunks = retriever.query("what", top_k=4)

    assert client.query_data_calls == [("what", 4, 4, False)]
    assert chunks == [
        {
            "document": "paid, shipped, and completed orders can apply",
            "metadata": {
                "source_type": "kb",
                "source_id": "kb:5:3:0",
                "title": "KB After Sales Policy",
                "document_id": 5,
                "chunk_id": 701,
                "chunk_index": 0,
                "category": "after_sales",
                "version": 3,
            },
        }
    ]


def test_lightrag_query_falls_back_to_legacy_query_when_query_data_unavailable():
    class DummyClient:
        def __init__(self):
            self.query_calls = []

        def query_data(self, text: str, top_k: int = 6, chunk_top_k: int | None = None, enable_rerank: bool | None = None):
            raise RuntimeError("LightRAG request failed for /query/data: timed out")

        def query(self, text: str, top_k: int = 6):
            self.query_calls.append((text, top_k))
            return {
                "sources": [
                    {"content": "legacy source text", "id": "s1", "title": "Legacy Doc"},
                ]
            }

        def insert_texts(self, texts):
            return None

    client = DummyClient()
    retriever = LightRagRetriever(client)

    chunks = retriever.query("what", top_k=4)

    assert client.query_calls == [("what", 4)]
    assert chunks == [
        {
            "document": "legacy source text",
            "metadata": {
                "source_type": "lightrag",
                "source_id": "s1",
                "title": "Legacy Doc",
            },
        }
    ]


def test_lightrag_query_prefers_decoded_metadata_from_source_content():
    encoded_content = encode_document_with_metadata(
        "indexed chunk text",
        {
            "source_type": "kb",
            "source_id": "chunk-81",
            "document_id": "8",
            "chunk_id": "81",
            "chunk_index": "0",
            "category": "policy",
            "version": "2",
            "title": "Doc 8",
        },
    )

    class DummyClient:
        def query(self, text: str, top_k: int = 6):
            return {
                "sources": [
                    {
                        "id": "fallback-id",
                        "title": "fallback-title",
                        "content": encoded_content,
                    }
                ]
            }

        def insert_texts(self, texts):
            return None

    retriever = LightRagRetriever(DummyClient())
    chunks = retriever.query("what")

    assert chunks == [
        {
            "document": "indexed chunk text",
            "metadata": {
                "source_type": "kb",
                "source_id": "chunk-81",
                "title": "Doc 8",
                "document_id": 8,
                "chunk_id": 81,
                "chunk_index": 0,
                "category": "policy",
                "version": 2,
            },
        }
    ]


def test_lightrag_query_skips_non_string_source_content():
    class DummyClient:
        def query(self, text: str, top_k: int = 6):
            return {
                "sources": [
                    {"content": {"nested": "not-valid"}, "id": "s1", "title": "Doc 1"},
                    {"content": ["not-valid"], "id": "s2", "title": "Doc 2"},
                    {"content": "valid content", "id": "s3", "title": "Doc 3"},
                ]
            }

        def insert_texts(self, texts):
            return None

    retriever = LightRagRetriever(DummyClient())
    chunks = retriever.query("what")

    assert chunks == [
        {
            "document": "valid content",
            "metadata": {
                "source_type": "lightrag",
                "source_id": "s3",
                "title": "Doc 3",
            },
        }
    ]


def test_lightrag_query_keeps_fallback_metadata_when_no_envelope():
    class DummyClient:
        def query(self, text: str, top_k: int = 6):
            return {"sources": [{"content": "plain source text", "id": "s1", "title": "Doc"}]}

        def insert_texts(self, texts):
            return None

    retriever = LightRagRetriever(DummyClient())
    chunks = retriever.query("what")

    assert chunks == [
        {
            "document": "plain source text",
            "metadata": {
                "source_type": "lightrag",
                "source_id": "s1",
                "title": "Doc",
            },
        }
    ]


def test_lightrag_query_fallbacks_to_answer_text():
    class DummyClient:
        def query(self, text: str, top_k: int = 6):
            return {"answer": "answer text"}

        def insert_texts(self, texts):
            return None

    retriever = LightRagRetriever(DummyClient())

    chunks = retriever.query("what")

    assert chunks == [
        {
            "document": "answer text",
            "metadata": {
                "source_type": "lightrag",
                "source_id": "answer",
                "title": "LightRAG answer",
            },
        }
    ]


def test_lightrag_upsert_calls_insert_texts_with_documents():
    class DummyClient:
        def __init__(self):
            self.inserted = []

        def query(self, text: str, top_k: int = 6):
            return {}

        def insert_texts(self, texts):
            self.inserted.append(texts)

    client = DummyClient()
    retriever = LightRagRetriever(client)
    records = [
        {"id": "1", "document": "doc-1", "metadata": {"source_type": "faq", "source_id": "1"}},
        {"id": "2", "document": "doc-2", "metadata": {"source_type": "faq", "source_id": "2"}},
    ]

    retriever.upsert(records)

    assert len(client.inserted) == 1
    assert len(client.inserted[0]) == 2

    first_doc, first_metadata = decode_document_with_metadata(client.inserted[0][0])
    second_doc, second_metadata = decode_document_with_metadata(client.inserted[0][1])
    assert first_doc == "doc-1"
    assert first_metadata == {"source_type": "faq", "source_id": "1"}
    assert second_doc == "doc-2"
    assert second_metadata == {"source_type": "faq", "source_id": "2"}


def test_lightrag_delete_document_without_registry_is_noop():
    class DummyClient:
        def __init__(self):
            self.deleted_doc_ids = []

        def query(self, text: str, top_k: int = 6):
            return {}

        def insert_texts(self, texts):
            return None

        def delete_documents(self, doc_ids):
            self.deleted_doc_ids.append(doc_ids)

    client = DummyClient()
    retriever = LightRagRetriever(client)

    retriever.delete_document(5)

    assert client.deleted_doc_ids == []


def test_lightrag_upsert_stores_doc_ids_in_registry_and_delete_uses_mapped_ids(tmp_path):
    class DummyClient:
        def __init__(self):
            self.inserted = []
            self.deleted_doc_ids = []

        def query(self, text: str, top_k: int = 6):
            return {}

        def insert_texts(self, texts):
            self.inserted.append(texts)

        def delete_documents(self, doc_ids):
            self.deleted_doc_ids.append(doc_ids)

    registry = LightRagDocRegistry(tmp_path / "lightrag-doc-registry.json")
    client = DummyClient()
    retriever = LightRagRetriever(client, registry=registry)
    records = [
        {
            "id": "kb:5:3:0",
            "document": "current policy",
            "metadata": {
                "source_type": "kb",
                "source_id": "kb:5:3:0",
                "document_id": 5,
                "chunk_id": 701,
                "chunk_index": 0,
                "version": 3,
                "title": "After Sales",
            },
        },
        {
            "id": "kb:5:3:1",
            "document": "second chunk",
            "metadata": {
                "source_type": "kb",
                "source_id": "kb:5:3:1",
                "document_id": 5,
                "chunk_id": 702,
                "chunk_index": 1,
                "version": 3,
                "title": "After Sales",
            },
        },
    ]

    retriever.upsert(records)

    stored_doc_ids = registry.get_document_doc_ids(5)
    expected_doc_ids = [compute_lightrag_doc_id(text) for text in client.inserted[0]]
    assert stored_doc_ids == expected_doc_ids

    raw_registry = json.loads((tmp_path / "lightrag-doc-registry.json").read_text(encoding="utf-8"))
    assert raw_registry == {"documents": {"5": expected_doc_ids}}

    retriever.delete_document(5)

    assert client.deleted_doc_ids == [expected_doc_ids]
    assert registry.get_document_doc_ids(5) == []


def test_lightrag_upsert_overwrites_existing_registry_mapping(tmp_path):
    class DummyClient:
        def __init__(self):
            self.inserted = []

        def query(self, text: str, top_k: int = 6):
            return {}

        def insert_texts(self, texts):
            self.inserted.append(texts)

        def delete_documents(self, doc_ids):
            return None

    registry = LightRagDocRegistry(tmp_path / "lightrag-doc-registry.json")
    registry.replace_document_doc_ids(5, ["doc-old-1", "doc-old-2"])
    client = DummyClient()
    retriever = LightRagRetriever(client, registry=registry)

    retriever.upsert(
        [
            {
                "id": "kb:5:4:0",
                "document": "fresh policy",
                "metadata": {
                    "source_type": "kb",
                    "source_id": "kb:5:4:0",
                    "document_id": 5,
                    "chunk_id": 801,
                    "chunk_index": 0,
                    "version": 4,
                },
            }
        ]
    )

    expected_doc_ids = [compute_lightrag_doc_id(client.inserted[0][0])]
    assert registry.get_document_doc_ids(5) == expected_doc_ids


def test_seed_registry_for_records_backfills_mapping_without_writing_to_lightrag(tmp_path):
    class DummyClient:
        def __init__(self):
            self.inserted = []

        def query(self, text: str, top_k: int = 6):
            return {}

        def insert_texts(self, texts):
            self.inserted.append(texts)

        def delete_documents(self, doc_ids):
            raise AssertionError("seeding registry should not delete remote docs")

    registry = LightRagDocRegistry(tmp_path / "lightrag-doc-registry.json")
    client = DummyClient()
    retriever = LightRagRetriever(client, registry=registry)
    records = [
        {
            "id": "kb:5:3:0",
            "document": "current policy",
            "metadata": {
                "source_type": "kb",
                "source_id": "kb:5:3:0",
                "document_id": 5,
                "chunk_id": 701,
                "chunk_index": 0,
                "version": 3,
            },
        }
    ]

    seeded = retriever.seed_registry_for_records(records)

    expected_doc_ids = [
        compute_lightrag_doc_id(
            encode_document_with_metadata(
                "current policy",
                {
                    "source_type": "kb",
                    "source_id": "kb:5:3:0",
                    "document_id": 5,
                    "chunk_id": 701,
                    "chunk_index": 0,
                    "version": 3,
                },
            )
        )
    ]
    assert seeded is True
    assert client.inserted == []
    assert registry.get_document_doc_ids(5) == expected_doc_ids


def test_lightrag_delete_document_requires_existing_mapping_for_explicit_delete(tmp_path):
    class DummyClient:
        def query(self, text: str, top_k: int = 6):
            return {}

        def insert_texts(self, texts):
            return None

        def delete_documents(self, doc_ids):
            raise AssertionError("client delete should not be called without a mapping")

    retriever = LightRagRetriever(
        DummyClient(),
        registry=LightRagDocRegistry(tmp_path / "lightrag-doc-registry.json"),
    )

    try:
        retriever.delete_document(77, require_existing=True)
        raised = None
    except LookupError as exc:
        raised = exc

    assert raised is not None
    assert "77" in str(raised)
