from typing import Any


def merge_context(chunks: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for chunk in chunks:
        metadata = chunk["metadata"]
        lines.append(f"[{metadata['source_type']}:{metadata['source_id']}] {chunk['document']}")
    return "\n".join(lines)
