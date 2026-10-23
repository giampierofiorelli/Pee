"""T-1 export: O-2's export from universe items (`experiments/o2/o2.py`, unchanged), plus the T-1 fields when the
universe holds them (PROTOCOL.md §11.1). The fields are read from the attributions and propositions, never from text:
``cited_sources`` (sources cited in context, distinct from attribution), ``norm_bearer``, ``statement_status``,
element ``states`` and ``relation_candidates`` (selective abstention, S0 M6).

Usage: python3 export.py <arm label> <document.md> <meta.json> <split> <out.json>
"""
import json
import pathlib
import sys

T1 = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(T1.parent / "o2")]
import o2  # noqa: E402
from universe import rules  # noqa: E402


def extras(store, pid):
    out = {}
    for a in rules.attributions(store, pid):
        b = a.body
        if b.get("document") != o2.URL:
            continue
        if "cited_context" in b:
            out["cited_sources"] = sorted({store.get(c).body.get("cited_id") for c in b["cited_context"]
                                           if store.has(c)} - {None}) + sorted(b.get("cited_context_unresolved") or ())
        for k in ("norm_bearer", "statement_status", "states", "relation_candidates"):
            if b.get(k):
                out[k] = b[k]
    return out


def main(label, md, meta, split, out):
    st, units, info = o2.build("A", md)
    scored = json.loads(pathlib.Path(meta).read_text())[split]["scored_lines"]
    rows = o2.export_store(st, scored)
    for r in rows:
        r.update(extras(st, r["pid"]))
    res = {"arm": label, "split": split, "info": info, "items": len(rows), "propositions": rows}
    pathlib.Path(out).write_text(json.dumps(res, indent=1, ensure_ascii=False))
    print(json.dumps({"arm": label, "split": split, "items": len(rows), "info": info}))


if __name__ == "__main__":
    if len(sys.argv) != 6:
        sys.exit(__doc__)
    main(*sys.argv[1:])
