"""R-1 P0 (PROTOCOL §3): does the Markdown -> HTML adapter preserve every table for Crawler's 1F/1G?
Usage: python3 p0.py <out.json>   (the output holds positions and counts, never cell text)"""
import json
import re
import sys

import common
import crawler_tables


def norm(s):
    return " ".join(str(s or "").replace("\\|", "|").split())


def check():
    docs = common.documents()
    assert common.split_check(docs), "the split does not reproduce PROTOCOL §2"
    rows = []
    for key in common.KEYS:
        md = docs[key]
        cr = crawler_tables.read_markdown(common.text_of(key))
        r = {"doc": key, "tables_markdown": len(md["tables"]), "tables_1f": len(cr["tables"]), "tables": []}
        for t, c in zip(md["tables"], cr["tables"]):
            mc = {(x["row"], x["col"]): x for x in t["cells"]}
            cc = {(x["row"], x["col"]): x for x in c["cells"] if x["row"] is not None and not x["dropped"]}
            shape = lambda d: (max(k[0] for k in d) + 1, max(k[1] for k in d) + 1) if d else (0, 0)  # noqa: E731
            diffs = []
            for k in sorted(set(mc) | set(cc)):
                a, b = mc.get(k), cc.get(k)
                if a is None or b is None:
                    diffs.append({"cell": k, "kind": "missing in " + ("markdown" if a is None else "1F")})
                    continue
                if bool(a["header"]) != bool(b["header"]):
                    diffs.append({"cell": k, "kind": "header flag"})
                if norm(a["text"]) != norm(b["text"]):
                    diffs.append({"cell": k, "kind": "text"})
                if sorted(a.get("links") or []) != sorted(b.get("links") or []):
                    diffs.append({"cell": k, "kind": "links"})
                if b["rowspan"] != 1 or b["colspan"] != 1:
                    diffs.append({"cell": k, "kind": "span"})
            r["tables"].append({"table": t["index"], "shape_markdown": shape(mc), "shape_1f": shape(cc),
                                "status_1f": c["status"], "heading_path_equal": t["headingPath"] == c["headingPath"],
                                "cells": len(mc), "links": sum(len(x.get("links") or []) for x in mc.values()),
                                "differences": diffs})
        rows.append(r)
    ok = all(r["tables_markdown"] == r["tables_1f"] and all(
        t["shape_markdown"] == t["shape_1f"] and t["status_1f"] == "complete" and t["heading_path_equal"]
        and not t["differences"] for t in r["tables"]) for r in rows)
    return {"schema": "pee.r1.p0.v1", "passes": ok, "documents": rows}


if __name__ == "__main__":
    res = check()
    json.dump(res, open(sys.argv[1], "w"), indent=1)
    for r in res["documents"]:
        bad = [t for t in r["tables"] if t["differences"] or t["shape_markdown"] != t["shape_1f"]
               or t["status_1f"] != "complete" or not t["heading_path_equal"]]
        print(r["doc"], "tables", r["tables_markdown"], "/", r["tables_1f"], "failing", len(bad),
              "cells", sum(t["cells"] for t in r["tables"]), "links", sum(t["links"] for t in r["tables"]))
        for t in bad[:5]:
            print("   table", t["table"], t["shape_markdown"], t["shape_1f"], t["status_1f"], t["heading_path_equal"],
                  [(d["cell"], d["kind"]) for d in t["differences"][:6]])
    print("P0", "PASSES" if res["passes"] else "FAILS")
