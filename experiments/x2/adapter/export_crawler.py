"""X1 adapter: faithful, read-only export of retained declarations from a COPY of a Crawler store snapshot.

Owner correction 2 (PREREGISTRATION.md section 4): the adapter transfers data and provenance; it never reasons.
It does not convert, parse, normalise, classify, merge, filter by meaning or drop anything.
- Every value is copied verbatim from its source column.
- Columns that hold Crawler's own interpretations are copied verbatim into a separate ``crawler_interpretation``
  block, attributed to Crawler's reader. Pee's services never read that block.

Usage: python3 export_crawler.py <snapshot copy .sqlite> <output .json>
The output holds retained third-party values: write it to a private directory, never to this repository.
"""
import hashlib
import json
import sqlite3
import sys

# Verbatim columns, grouped by what they are. The names are Crawler's schema names, not Pee vocabulary.
DECLARATION_RECORD = ("declaration_id", "revision_id", "product_id", "variant_id", "property", "raw_value",
                      "section", "component", "locator", "retention", "state", "expires_at")
DECLARATION_INTERPRETATION = ("property_key", "value_json", "method", "flags_json", "evidence_role", "review_json",
                              "verified_purposes_json", "independent_test_evidence", "ranking_authorized")
PRODUCT_RECORD = ("product_id", "name", "brand", "declared_model", "identifiers_json", "first_seen", "last_seen")
PRODUCT_INTERPRETATION = ("key_basis", "identity_state", "identity_review_json", "category_hypotheses_json")
VARIANT_RECORD = ("variant_id", "product_id", "name", "identifiers_json", "attributes_json")
REVISION_RECORD = ("revision_id", "source_id", "url", "sha256", "bytes", "http_status", "fetched_at",
                   "extractor_version", "retention", "state")
SOURCE_RECORD = ("source_id", "host", "retention", "created_at")
SOURCE_INTERPRETATION = ("source_type", "source_type_basis")


def _rows(con, table, cols, key):
    q = f"SELECT {', '.join(cols)} FROM {table} ORDER BY {key}"
    return [dict(zip(cols, r)) for r in con.execute(q)]


def _split(rows, record_cols, interp_cols):
    out = []
    for r in rows:
        rec = {c: r[c] for c in record_cols}
        rec["crawler_interpretation"] = {c: r[c] for c in interp_cols}
        out.append(rec)
    return out


def export(snapshot_path):
    con = sqlite3.connect(f"file:{snapshot_path}?mode=ro", uri=True)
    try:
        data = {
            "declarations": _split(_rows(con, "declarations", DECLARATION_RECORD + DECLARATION_INTERPRETATION,
                                         "declaration_id"), DECLARATION_RECORD, DECLARATION_INTERPRETATION),
            "products": _split(_rows(con, "products", PRODUCT_RECORD + PRODUCT_INTERPRETATION, "product_id"),
                               PRODUCT_RECORD, PRODUCT_INTERPRETATION),
            "variants": _rows(con, "variants", VARIANT_RECORD, "variant_id"),
            "revisions": _rows(con, "revisions", REVISION_RECORD, "revision_id"),
            "sources": _split(_rows(con, "sources", SOURCE_RECORD + SOURCE_INTERPRETATION, "source_id"),
                              SOURCE_RECORD, SOURCE_INTERPRETATION),
        }
    finally:
        con.close()
    with open(snapshot_path, "rb") as f:
        snap = hashlib.sha256(f.read()).hexdigest()
    data["provenance"] = {
        "holder": "Crawler (giampierofiorelli/Crawler) retained store",
        "snapshot_sha256": snap,
        "exported_by": "experiments/x1/adapter/export_crawler.py",
        "interpretation_holder": "Crawler readers (their own versions per row); attributed, never adopted",
    }
    return data


def main(argv):
    if len(argv) != 3:
        sys.exit(__doc__)
    data = export(argv[1])
    with open(argv[2], "w") as f:
        json.dump(data, f, ensure_ascii=False, sort_keys=True)
    print(json.dumps({k: len(v) for k, v in data.items() if isinstance(v, list)}))


if __name__ == "__main__":
    main(sys.argv)
