"""F-1 E3/E4 reading measure: the spent product pages (V1 and X2 structures) read under one knowledge arm.

Every page is acquired into one store holding the arm's knowledge (as in the I-2 regression). Reported per page group
(air purifiers, robot vacuums, other categories; groups fixed by file name before the first run): quantity contents,
complete contents (no ``incomplete`` reason), complete contents per kind, and the reasons that leave contents
incomplete. The complete contents themselves (record, kind, bearer, conditions) are written to the private output so
that the contents that differ between arms can be checked by hand (development material: the pages are spent).

Usage: python3 read_pages.py <arm> <structure dir> [<structure dir> ...] <out.json>
"""
import glob
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core"), str(HERE)]

from answer import base_store  # noqa: E402
from universe import acquisition  # noqa: E402

GROUPS = (("air purifiers", r"^(A-|B-|C-ap|O-or|W-lv|s80-)"), ("robot vacuums", r"^(C-rv|C-rb|L-rv|rv-)"),
          ("other categories", r"."))


def group(name):
    return next(g for g, p in GROUPS if re.match(p, name))


def run(arm, *args):
    dirs, out = args[:-1], args[-1]
    st, _ = base_store(arm)
    seen, pages = set(), []
    for d in dirs:
        for p in sorted(glob.glob(str(pathlib.Path(d) / "*.json"))):
            doc = json.loads(pathlib.Path(p).read_text())
            if doc["url"] in seen:
                continue
            seen.add(doc["url"])
            pages.append((pathlib.Path(p).stem, doc))
    res = {"arm": arm, "groups": {}, "complete": []}
    for name, doc in pages:
        s = acquisition.acquire_document(st, doc)
        g = res["groups"].setdefault(group(name), {"pages": 0, "contents": 0, "complete": 0, "kinds": {},
                                                   "incomplete_reasons": {}})
        g["pages"] += 1
        for cid in s["contents"]:
            b = st.get(cid).body
            g["contents"] += 1
            if b.get("incomplete"):
                for r in b["incomplete"]:
                    key = r.split(":")[0]
                    g["incomplete_reasons"][key] = g["incomplete_reasons"].get(key, 0) + 1
                continue
            g["complete"] += 1
            g["kinds"][b["kind"]] = g["kinds"].get(b["kind"], 0) + 1
            rec = st.get(b["interprets"]).body
            res["complete"].append({"page": name, "group": group(name), "record": b["interprets"], "kind": b["kind"],
                                    "kind_label": st.get(b["kind"]).body.get("label") if st.has(b["kind"]) else None,
                                    "bearer": st.get(b["bearer"]).body.get("label") if st.has(b["bearer"]) else None,
                                    "lo": b["lo"], "hi": b["hi"], "unit": b["unit"], "conditions": b["conditions"],
                                    "unspecified": sorted(b.get("unspecified") or {}), "methods": b.get("methods"),
                                    "text": rec.get("text"), "headers": list(rec.get("column_headers") or []) +
                                    list(rec.get("row_headers") or []) + ([rec["inner_label"]] if rec.get("inner_label")
                                                                      else [])})
    pathlib.Path(out).write_text(json.dumps(res, indent=1, default=str))
    return res


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    r = run(*sys.argv[1:])
    print(json.dumps({"arm": r["arm"], "groups": {g: {k: v for k, v in x.items() if k != "kinds"}
                                                  for g, x in r["groups"].items()}}, indent=1))
