"""Process-local protection for legacy uploads; database FKs are the final guard."""
from collections import Counter
from contextlib import contextmanager
from threading import Lock

_uploads = Counter()
_lock = Lock()

def is_uploading(artifact_id: int) -> bool:
    with _lock: return _uploads[artifact_id] > 0

@contextmanager
def upload_operation(artifact_id: int):
    with _lock: _uploads[artifact_id] += 1
    try: yield
    finally:
        with _lock:
            _uploads[artifact_id] -= 1
            if _uploads[artifact_id] == 0: del _uploads[artifact_id]
