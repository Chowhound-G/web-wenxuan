from typing import Any

from app.retrieval.lightrag_doc_registry import LightRagDocRegistry, compute_lightrag_doc_id
from app.retrieval.lightrag_metadata_codec import (
    decode_document_with_metadata,
    encode_document_with_metadata,
)


class LightRagRetriever:
    def __init__(self, client, registry: LightRagDocRegistry | None = None):
        self.client = client
        self.registry = registry

    def query(self, text: str, top_k: int = 6) -> list[dict[str, Any]]:
        query_data = getattr(self.client, "query_data", None)
        if callable(query_data):
            try:
                result = query_data(text, top_k=top_k, chunk_top_k=top_k, enable_rerank=False)
            except RuntimeError:
                result = self.client.query(text, top_k=top_k)
        else:
            result = self.client.query(text, top_k=top_k)
        if not isinstance(result, dict):
            return []

        data = result.get("data")
        if isinstance(data, dict):
            chunks = _normalize_lightrag_chunks(data.get("chunks"))
            if chunks:
                return chunks

        sources = result.get("sources")
        chunks = _normalize_lightrag_chunks(sources)
        if chunks:
            return chunks

        answer = result.get("answer") or result.get("response")
        if isinstance(answer, str) and answer.strip():
            return [
                {
                    "document": answer,
                    "metadata": {
                        "source_type": "lightrag",
                        "source_id": "answer",
                        "title": "LightRAG answer",
                    },
                }
            ]

        return []

    def upsert(self, records: list[dict[str, Any]]) -> None:
        if not records:
            return

        documents = []
        for record in records:
            if not isinstance(record, dict) or not record.get("document"):
                continue
            metadata = record.get("metadata") if isinstance(record.get("metadata"), dict) else None
            encoded_document = encode_document_with_metadata(
                document=record["document"],
                metadata=metadata,
            )
            documents.append(encoded_document)
        if not documents:
            return

        self.client.insert_texts(documents)
        if self.registry is not None:
            doc_ids_by_document_id = _build_doc_ids_by_document_id(records)
            for document_id, doc_ids in doc_ids_by_document_id.items():
                self.registry.replace_document_doc_ids(document_id, doc_ids)

    def seed_registry_for_records(self, records: list[dict[str, Any]]) -> bool:
        if self.registry is None:
            return False

        doc_ids_by_document_id = _build_doc_ids_by_document_id(records)
        if not doc_ids_by_document_id:
            return False

        for document_id, doc_ids in doc_ids_by_document_id.items():
            self.registry.replace_document_doc_ids(document_id, doc_ids)
        return True

    def delete_document(self, document_id: int, require_existing: bool = False) -> None:
        if self.registry is None:
            if require_existing:
                raise LookupError(f"LightRAG document mapping is unavailable for document {document_id}")
            return

        doc_ids = self.registry.get_document_doc_ids(document_id)
        if not doc_ids:
            if require_existing:
                raise LookupError(f"LightRAG document mapping is missing for document {document_id}")
            return

        self.client.delete_documents(doc_ids)
        self.registry.remove_document(document_id)


def _coerce_document_id(metadata: dict[str, Any] | None) -> int | None:
    if not isinstance(metadata, dict):
        return None
    try:
        return int(metadata.get("document_id"))
    except (TypeError, ValueError):
        return None


def _build_doc_ids_by_document_id(records: list[dict[str, Any]]) -> dict[int, list[str]]:
    doc_ids_by_document_id: dict[int, list[str]] = {}
    for record in records:
        if not isinstance(record, dict) or not record.get("document"):
            continue
        metadata = record.get("metadata") if isinstance(record.get("metadata"), dict) else None
        document_id = _coerce_document_id(metadata)
        if document_id is None:
            continue
        encoded_document = encode_document_with_metadata(
            document=record["document"],
            metadata=metadata,
        )
        doc_ids_by_document_id.setdefault(document_id, []).append(compute_lightrag_doc_id(encoded_document))
    return doc_ids_by_document_id


def _normalize_lightrag_chunks(raw_chunks: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_chunks, list):
        return []

    chunks: list[dict[str, Any]] = []
    for source in raw_chunks:
        if not isinstance(source, dict):
            continue
        content = source.get("content")
        if not isinstance(content, str) or not content:
            continue
        document, decoded_metadata = decode_document_with_metadata(content)
        metadata: dict[str, Any] = {
            "source_type": "lightrag",
            "source_id": source.get("id") or source.get("chunk_id"),
            "title": source.get("title"),
        }
        if isinstance(decoded_metadata, dict):
            metadata.update(decoded_metadata)
        chunks.append({"document": document, "metadata": metadata})
    return chunks
