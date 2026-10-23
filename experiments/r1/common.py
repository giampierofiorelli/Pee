"""R-1 shared helpers: the spent owner documents (private, read from pee-knowledge) and the table split (PROTOCOL §2)."""
import hashlib
import io
import json
import pathlib
import sys
import zipfile

R1 = pathlib.Path(__file__).resolve().parent
EXP = R1.parent
sys.path[:0] = [str(EXP / "universe"), str(EXP / "s1core"), str(EXP / "a1")]

import answer as harness  # noqa: E402  (A-1's harness: DOCS, HOLDER, answer)
from universe import markdown  # noqa: E402

KEYS = ("AP", "DH", "THREE-DH")
DEV = {("AP", 1), ("AP", 2), ("AP", 10), ("AP", 13), ("DH", 9), ("THREE-DH", 12)}
SEALED = {("AP", 0), ("AP", 3), ("AP", 4), ("AP", 6), ("AP", 11), ("AP", 16), ("DH", 7), ("DH", 8), ("THREE-DH", 2),
          ("THREE-DH", 8)}


def text_of(key):
    path, member = harness.DOCS[key]
    z = zipfile.ZipFile(path)
    if member in z.namelist():
        return z.read(member).decode()
    for n in z.namelist():
        if n.endswith(".zip"):
            zz = zipfile.ZipFile(io.BytesIO(z.read(n)))
            if member in zz.namelist():
                return zz.read(member).decode()
    return z.read(next(n for n in z.namelist() if n.endswith(member))).decode()


def table_sha(t):
    return hashlib.sha256(json.dumps([c["text"] for c in t["cells"]]).encode()).hexdigest()


def split_check(docs):
    """Recompute the protocol's split from the rule and confirm the fixed lists."""
    uniq = {}
    for key, doc in docs.items():
        for t in doc["tables"]:
            if any(any(ch.isdigit() for ch in c["text"]) for c in t["cells"]):
                uniq.setdefault(table_sha(t), (key, t["index"]))
    order = sorted(uniq, key=lambda s: hashlib.sha256(("R-1 split " + s).encode()).hexdigest())
    return {uniq[s] for s in order[:6]} == DEV and {uniq[s] for s in order[6:16]} == SEALED


def documents():
    return {k: markdown.read(text_of(k), f"document:{k}", harness.HOLDER) for k in KEYS}
