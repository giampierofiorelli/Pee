"""T-1 freeze step: structural selection of the sealed passage, run in an isolated process.

The script reads the package bytes, but prints and writes only structural numbers: line ranges, counts, overlaps and
whole-file hashes. It never prints or stores document text, headings or fragment hashes. It reuses O-2's rules
(`experiments/o2/REPORT.md` §1.2-1.3): prose lines, top-level sections, the source register found by shingle
overlap, a split fixed by a hash of each section's first line number.

Usage:
  python3 -I freeze.py check-o2 <speakers.zip> <o2 meta.json>      reproduce O-2's split (validation, spent)
  python3 -I freeze.py select <package.zip> <spent-zips-dir> <private-out.json> <public-out.json> [<inventory.json>]

The optional inventory (a paraphrased Crawler-era inventory of the same package) is measured, never used to exclude:
it is Claude exposure in Crawler, not exposure of the Pee reader.
"""
import hashlib
import io
import json
import re
import sys
import zipfile

COMPENDIUM = "COMPLETE-RESEARCH-COMPENDIUM.md"
REGISTER = "SOURCE-REGISTER.md"
SHINGLE = 8
REGISTER_OVERLAP = 0.9   # a top-level section belongs to the register when this share of its shingles is in it
EXPOSURE_MAX = 0.2       # a section is exposed when this share of its prose shingles occurs in spent documents
TARGET_PROSE = 160       # R2: sections in hash order until at least this many prose lines; the rest is a reserve
SALT = "t1-r2-soundbars-section-"


def sha(b):
    return hashlib.sha256(b).hexdigest()


def kinds(lines):
    """Per line: heading, table, code, blank, rule or prose. O-2 counted every non-blank line that is neither a heading
    nor a table row (code and rules included): ``O2_PROSE``. T-1 scores only ``prose``."""
    out, fence = [], False
    for ln in lines:
        s = ln.strip()
        if s.startswith("```"):
            out.append("code")
            fence = not fence
        elif fence:
            out.append("code")
        elif not s:
            out.append("blank")
        elif s.startswith("#"):
            out.append("heading")
        elif s.startswith("|"):
            out.append("table")
        elif re.fullmatch(r"[-*_]{3,}", s):
            out.append("rule")
        else:
            out.append("prose")
    return out


O2_PROSE = ("prose", "code", "rule")


def sections(lines):
    """Top-level sections (`#` or `##`), as 1-based inclusive line ranges, with the first line's text."""
    starts = [i for i, ln in enumerate(lines) if re.match(r"^#{1,2}\s", ln)]
    out = []
    for k, i in enumerate(starts):
        j = (starts[k + 1] if k + 1 < len(starts) else len(lines)) - 1
        out.append((i + 1, j + 1))
    return out


def shingles(text):
    w = re.findall(r"[a-z0-9]+", text.lower())
    return {" ".join(w[i:i + SHINGLE]) for i in range(len(w) - SHINGLE + 1)}


def zip_docs(path):
    z = zipfile.ZipFile(path)
    return {n: z.read(n) for n in sorted(z.namelist()) if n.lower().endswith(".md")}


def choose(docs):
    """The compendium by name, as in O-2; otherwise none (stop and report)."""
    hits = [n for n in docs if n.endswith(COMPENDIUM)]
    return hits[0] if len(hits) == 1 else None


def register_start(lines, secs, docs):
    reg = [b for n, b in docs.items() if n.endswith(REGISTER)]
    if not reg:
        return None
    rs = shingles(reg[0].decode("utf-8", "replace"))
    for a, b in secs:
        s = shingles("\n".join(lines[a - 1:b]))
        if s and len(s & rs) / len(s) >= REGISTER_OVERLAP:
            return a
    return None


def analyse(docs):
    name = choose(docs)
    if name is None:
        return None, None, None
    text = docs[name].decode("utf-8")
    lines = text.split("\n")
    kd = kinds(lines)
    secs = sections(lines)
    reg = register_start(lines, secs, docs)
    return name, lines, (kd, secs, reg)


def check_o2(zip_path, meta_path):
    docs = zip_docs(zip_path)
    name, lines, (kd, secs, reg) = analyse(docs)
    meta = json.load(open(meta_path))
    dev, sealed = set(), set()
    for a, b in secs:
        if reg and a >= reg:
            continue
        prose = [i for i in range(a, b + 1) if kd[i - 1] in O2_PROSE]
        if not prose:
            continue
        h = int(sha(("o2-speakers-compendium-section-" + str(a)).encode()), 16) % 5
        (dev if h in (0, 1) else sealed).update(prose)
    res = {"register_start": reg,
           "dev_equal": sorted(dev) == sorted(meta["dev"]["scored_lines"]),
           "sealed_equal": sorted(sealed) == sorted(meta["sealed"]["scored_lines"]),
           "dev": [len(dev), len(meta["dev"]["scored_lines"])],
           "sealed": [len(sealed), len(meta["sealed"]["scored_lines"])]}
    print(json.dumps(res))


def select(zip_path, spent_dir, priv_out, pub_out, inventory=None):
    import glob
    raw = open(zip_path, "rb").read()
    docs = zip_docs(zip_path)
    name, lines, parts = analyse(docs)
    pub = {"schema": "pee.t1.r2-selection.v1", "package_sha256": sha(raw), "package_bytes": len(raw),
           "md_entries": len(docs),
           "rules": {"document": f"the single entry ending {COMPENDIUM}", "prose": "O-2's section eligibility (any non-blank, non-heading, non-table line); scored lines exclude code blocks and rules",
                     "sections": "top-level # or ## sections", "register": f"first section with {REGISTER_OVERLAP} of its "
                     f"{SHINGLE}-word shingles in {REGISTER}; it and everything after are not scored",
                     "exposure": f"a section is excluded when more than {EXPOSURE_MAX} of its prose shingles occur in any "
                     "spent package (every other package in pee-knowledge/research-packages)",
                     "order": "sections sorted by sha256(salt + first line number), as O-2", "salt": SALT,
                     "r2": f"sections in that order until at least {TARGET_PROSE} prose lines; the rest is a reserve, untouched"}}
    if name is None:
        pub["stop"] = "no single compendium entry"
        json.dump(pub, open(pub_out, "w"), indent=1)
        print(json.dumps({"stop": pub["stop"]}))
        return
    kd, secs, reg = parts
    spent = set()
    for z in sorted(glob.glob(spent_dir + "/*.zip")):
        if sha(open(z, "rb").read()) == pub["package_sha256"]:
            continue
        for b in zip_docs(z).values():
            spent |= shingles(b.decode("utf-8", "replace"))
    rows = []
    for a, b in secs:
        if reg and a >= reg:
            continue
        o2 = [i for i in range(a, b + 1) if kd[i - 1] in O2_PROSE]
        prose = [i for i in o2 if kd[i - 1] == "prose"]
        if not o2:
            continue
        sh = shingles("\n".join(lines[i - 1] for i in prose))
        ov = round(len(sh & spent) / len(sh), 3) if sh else 0.0
        key = sha((SALT + str(a)).encode())  # the line number, as in O-2; no text is hashed
        rows.append({"lines": [a, b], "prose": len(prose), "table": sum(1 for i in range(a, b + 1) if kd[i - 1] == "table"),
                     "code_or_rule": len(o2) - len(prose),
                     "exposure": ov, "excluded": ov > EXPOSURE_MAX, "prose_lines": prose, "_key": key})
    eligible = sorted([r for r in rows if not r["excluded"]], key=lambda r: r["_key"])
    total, r2 = 0, []
    for r in eligible:
        if total >= TARGET_PROSE:
            break
        r2.append(r)
        total += r["prose"]
    for r in rows:
        r["set"] = "excluded" if r["excluded"] else "R2" if r in r2 else "reserve"
    file_bytes = docs[name]
    inv = None
    if inventory:
        ish = shingles(open(inventory, encoding="utf-8", errors="replace").read())
        r2sh = set().union(*(shingles("\n".join(lines[i - 1] for i in r["prose_lines"])) for r in r2)) if r2 else set()
        inv = {"inventory_sha256": sha(open(inventory, "rb").read()),
               "r2_prose_shingles_in_inventory": round(len(r2sh & ish) / len(r2sh), 3) if r2sh else 0.0}
    pub.update({"inventory_overlap_reported_only": inv})
    pub.update({"document": name.split("/")[-1], "document_sha256": sha(file_bytes), "document_bytes": len(file_bytes),
                "document_lines": len(lines), "register_start": reg,
                "sections": [{k: r[k] for k in ("lines", "prose", "code_or_rule", "table", "exposure", "set")} for r in sorted(rows, key=lambda r: r["lines"])],
                "counts": {s: {"sections": sum(1 for r in rows if r["set"] == s), "prose": sum(r["prose"] for r in rows if r["set"] == s)}
                           for s in ("R2", "reserve", "excluded")}})
    priv = dict(pub, keys={str(r["lines"][0]): r["_key"] for r in rows},
                r2_prose_lines=sorted(i for r in rows if r["set"] == "R2" for i in r["prose_lines"]),
                reserve_prose_lines=sorted(i for r in rows if r["set"] == "reserve" for i in r["prose_lines"]))
    json.dump(priv, open(priv_out, "w"), indent=1)
    json.dump(pub, open(pub_out, "w"), indent=1)
    print(json.dumps({"document_lines": len(lines), "register_start": reg, "counts": pub["counts"]}))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["check-o2"] and len(a) == 3:
        check_o2(a[1], a[2])
    elif a[:1] == ["select"] and len(a) in (5, 6):
        select(*a[1:])
    else:
        sys.exit(__doc__)
