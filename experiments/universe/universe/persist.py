"""Persistence of the semantic universe (A-1; `ASSIMILATION.md` sections 1, 3 and 7).

The store is an append-only log of universe events (``store.py``). A snapshot is that log, written as gzip JSON, with
a manifest holding its SHA-256, its counts and the hashes of the code that wrote it. Loading replays the log, so the
universe after loading is exactly the universe that was saved, history included.

**Retention guard** (`experiments/a1/REPORT.md` section 1.4). A snapshot holds structured knowledge, never a
document. Before writing, every string in every item is checked:

* outside the developer's base knowledge, no string is longer than ``max_chars`` characters, except identifiers and
  hashes (strings without spaces);
* no run of ``shingle`` consecutive words of an assimilated document occurs in any string, except in the
  bibliographic identification of a cited source (its title as the citing register gives it).

A snapshot that fails the guard is not written: ``RetentionError`` names what failed.
"""
import gzip
import hashlib
import json
import pathlib
import re
import time

from .store import Event, Item, Store, thaw

FORMAT = "pee.universe.snapshot.v1"
CODE = pathlib.Path(__file__).resolve().parent


class RetentionError(ValueError):
    pass


def _strings(v):
    if isinstance(v, str):
        yield v
    elif isinstance(v, dict):
        for x in v.values():
            yield from _strings(x)
    elif isinstance(v, (list, tuple)):
        for x in v:
            yield from _strings(x)


def _words(s):
    return re.findall(r"\w+", s.lower())


def retention_report(store, documents=(), max_chars=200, shingle=12):
    """What the snapshot would hold that the policy forbids: long strings outside the base, and word runs of the
    documents. ``documents`` are the texts assimilated in this universe (used only for the check, never stored)."""
    grams = set()
    for text in documents:
        w = _words(text)
        grams |= {" ".join(w[i:i + shingle]) for i in range(len(w) - shingle + 1)}
    long_strings, copied = [], []
    longest = 0
    for it in store._items.values():
        base = it.provenance.get("holder") == "developer"
        # a cited source's register entry keeps its bibliographic identification (title, date, URL): checked for
        # length, not for word runs
        bibliographic = it.kind == "entity" and it.body.get("cited_id")
        for s in _strings(thaw(it.body)):
            if not base:
                longest = max(longest, len(s))
                if len(s) > max_chars and " " in s:
                    long_strings.append((it.id, len(s)))
            if grams and not bibliographic:
                w = _words(s)
                if len(w) >= shingle and any(" ".join(w[i:i + shingle]) in grams for i in range(len(w) - shingle + 1)):
                    copied.append(it.id)
    return {"max_chars": max_chars, "shingle": shingle, "documents_checked": len(documents),
            "longest_string_outside_base": longest, "long_strings": long_strings[:50],
            "long_string_count": len(long_strings), "copied_runs": copied[:50], "copied_run_count": len(copied),
            "passed": not long_strings and not copied}


def _item(it):
    return {"id": it.id, "kind": it.kind, "body": thaw(it.body), "provenance": thaw(it.provenance),
            "situating": thaw(it.situating)}


def code_hashes():
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(CODE.glob("*.py"))}


def save(store, path, documents=(), max_chars=200, shingle=12, note=None):
    """Write the universe to ``path`` (gzip JSON lines) and ``path``.manifest.json. Returns the manifest."""
    report = retention_report(store, documents, max_chars, shingle)
    if not report["passed"]:
        raise RetentionError(json.dumps({k: report[k] for k in ("long_string_count", "copied_run_count",
                                                                "long_strings", "copied_runs")})[:2000])
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps({"seq": e.seq, "type": e.type, "subject": e.subject, "reason": e.reason,
                         "item": _item(e.item) if e.item is not None else None}, sort_keys=True, ensure_ascii=False)
             for e in store.events]
    raw = ("\n".join(lines) + "\n").encode()
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(raw)
    from collections import Counter
    manifest = {"format": FORMAT, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "content_sha256": hashlib.sha256(raw).hexdigest(), "events": len(lines),
                "items": len(store._items), "kinds": dict(Counter(i.kind for i in store._items.values())),
                "forms": dict(Counter(i.body.get("form") for i in store._items.values() if i.kind == "content")),
                "written": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "code": code_hashes(),
                "retention": report, "note": note}
    pathlib.Path(str(path) + ".manifest.json").write_text(json.dumps(manifest, indent=1))
    return manifest


def load(path, verify=True):
    """The universe a snapshot holds, replayed event by event."""
    path = pathlib.Path(path)
    if verify:
        man = json.loads(pathlib.Path(str(path) + ".manifest.json").read_text())
        if man.get("format") != FORMAT or hashlib.sha256(path.read_bytes()).hexdigest() != man["sha256"]:
            raise ValueError(f"{path}: snapshot does not match its manifest")
    s = Store.__new__(Store)
    s._events, s._items, s._kinds = [], {}, set()
    with gzip.open(path, "rt") as f:
        for line in f:
            if not line.strip():
                continue
            e = json.loads(line)
            it = e.get("item")
            item = Item(it["id"], it["kind"], it["body"], it["provenance"], it.get("situating") or {}) if it else None
            s._events.append(Event(e["seq"], e["type"], e["subject"], e["reason"], item))
            if e["type"] == "register_kind":
                s._kinds.add(e["subject"])
            else:
                s._items[e["subject"]] = item
    return s


def same(a, b):
    """Whether two stores hold the same events and items."""
    return len(a.events) == len(b.events) and all(
        (x.seq, x.type, x.subject, x.item) == (y.seq, y.type, y.subject, y.item) for x, y in zip(a.events, b.events))


__all__ = ["save", "load", "same", "retention_report", "RetentionError", "code_hashes"]
