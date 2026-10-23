"""The lifecycle of an owner-supplied teaching document (A-1; `ASSIMILATION.md` section 7).

Temporary input -> contextual reading -> proposition-level translation -> integration -> completeness audit ->
saved universe -> removal of the temporary copy.

* The **original** (a file, or a member of a zip archive) is only read; its SHA-256 is checked before and after.
* A **working copy** is made in a working directory and is the only file the reader opens.
* The **audit** checks that the coverage ledger has one entry per sentence the reader segmented, and that the
  retention guard of ``persist`` passes for the universe that will be saved.
* The universe is **saved**, **reloaded** and compared; only then is the working copy **removed**, and the removal is
  recorded as a lifecycle record (document identity and integrity metadata; never the text).
* If any step fails, the working copy is kept and the failure is returned.
"""
import hashlib
import pathlib
import shutil
import time
import zipfile

from . import acquisition, knowledge_acquisition, markdown, persist, propositions
from .store import Item

LIFECYCLE = {"source": "assimilation service", "holder": "program", "basis": "measurement record"}


def _sha(b):
    return hashlib.sha256(b).hexdigest()


def original_bytes(original, member=None):
    p = pathlib.Path(original)
    if member:
        with zipfile.ZipFile(p) as z:
            return z.read(member)
    return p.read_bytes()


def working_copy(original, member, workdir):
    """Copy the original (or one archive member) into the working directory; returns the copy's path."""
    workdir = pathlib.Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    data = original_bytes(original, member)
    name = pathlib.Path(member or original).name
    dest = workdir / f"{_sha(data)[:12]}-{name}"
    dest.write_bytes(data)
    return dest


def _sentence_count(doc, lex):
    frame = propositions.Frame(lex)
    n = 0
    for _, _, text, _ in propositions._segments(doc):
        for sent in propositions.sentences(text):
            body, _ = propositions._strip_cites(sent)
            if propositions.WORD.search(body):
                n += 1
    return n


def assimilate(store, original, holder, workdir, url=None, member=None):
    """Read one document through its working copy into ``store``. Returns the assimilation record (no text) and the
    working copy's text, which the caller passes to the retention guard and then discards."""
    before = _sha(original_bytes(original, member))
    copy = working_copy(original, member, workdir)
    text = copy.read_text()
    name = pathlib.Path(member or original).name
    url = url or f"document:{name}"
    doc = markdown.read(text, url, holder)
    lex = acquisition.Lexicon(store)
    expected = _sentence_count(doc, lex)
    # a teaching document is read for its knowledge; its tables are not product data (the page reader of Route B,
    # which keeps cell text as records, is not used here)
    k = knowledge_acquisition.acquire_knowledge(store, doc, lex, propositions=True)
    ledger = k.get("ledger") or []
    audit = {"sentences_segmented": expected, "ledger_entries": len(ledger),
             "every_sentence_accounted": len(ledger) == expected,
             "statuses": {s: sum(1 for e in ledger if e["status"] == s) for s in ("acquired", "partial", "unresolved")}}
    rec = {"document": url, "name": name, "holder": holder, "original_sha256": before,
           "working_copy": str(copy), "bytes": len(text.encode()), "read_at": time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                                                                            time.gmtime()),
           "audit": audit, "propositions": len(k.get("propositions") or []),
           "restated": len(k.get("restated") or []), "concepts": len(k.get("concepts") or []),
           "ledger_record": k.get("ledger_record")}
    return rec, text


def complete(store, records, texts, snapshot, originals):
    """Audit, save, reload and compare; then remove the working copies and record the removal; save again.
    ``originals`` maps each record's document to (original path, member) for the integrity check."""
    failures = [r["document"] for r in records if not r["audit"]["every_sentence_accounted"]]
    if failures:
        return {"ok": False, "why": "ledger incomplete", "documents": failures}
    try:
        man = persist.save(store, snapshot, documents=texts, note="before removal of the working copies")
    except persist.RetentionError as e:
        return {"ok": False, "why": "retention guard", "detail": str(e)}
    if not persist.same(persist.load(snapshot), store):
        return {"ok": False, "why": "reloaded universe differs"}
    removed = []
    for r in records:
        path, member = originals[r["document"]]
        copy = pathlib.Path(r["working_copy"])
        copy.unlink()
        after = _sha(original_bytes(path, member))
        rid = f"CUSTODY:{_sha((r['document'] + r['original_sha256']).encode())[:16]}"
        store.acquire(Item(rid, "record", {
            "form": "document custody", "document": r["document"], "name": r["name"], "holder": r["holder"],
            "original_sha256": r["original_sha256"], "original_unchanged": after == r["original_sha256"],
            "bytes": r["bytes"], "read_at": r["read_at"], "audit": r["audit"], "propositions": r["propositions"],
            "restated": r["restated"], "concepts": r["concepts"], "ledger_record": r["ledger_record"],
            "working_copy_removed": not copy.exists(),
            "removed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, LIFECYCLE),
            "the temporary working copy was read, audited and removed; the original is unchanged")
        removed.append({"document": r["document"], "removed": not copy.exists(),
                        "original_unchanged": after == r["original_sha256"]})
    man2 = persist.save(store, snapshot, documents=texts, note="after removal of the working copies")
    return {"ok": all(x["removed"] and x["original_unchanged"] for x in removed), "removed": removed,
            "first_save": {k: man[k] for k in ("sha256", "events", "items")}, "manifest": man2}


__all__ = ["assimilate", "complete", "working_copy", "original_bytes"]
