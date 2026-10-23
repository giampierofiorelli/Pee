"""R-1: the interface to Crawler's table readers (1F, 1G, 1G + quantity knowledge), unchanged in ``engine-ts/``.

Two parts:
- ``markdown_to_html``: a Pee-authored rendering of a Markdown document as HTML (headings, paragraphs, list items,
  code blocks, pipe tables, links, emphasis, code spans), so that readers written for HTML can read it. It is written
  independently of ``markdown.py``; R-1's check P0 compares the two parses table by table.
- ``read_html``: runs ``engine-ts/pee-tools/tables-bridge.mjs`` (Node, compiled ``dist/``) and returns its JSON. When
  Node or the build is missing it raises ``CrawlerUnavailable``: there is no silent fallback to another reader.

The outputs are Crawler's readings, not knowledge: what enters the universe is decided by the caller under S0/MS1.
"""
import html as _html
import json
import pathlib
import re
import shutil
import subprocess

ENGINE = pathlib.Path(__file__).resolve().parents[2] / "engine-ts"
BRIDGE = ENGINE / "pee-tools" / "tables-bridge.mjs"


class CrawlerUnavailable(RuntimeError):
    """Crawler's compiled readers cannot be run (Node missing, or ``engine-ts`` not built: ``npx tsc``)."""


# --- Markdown -> HTML ------------------------------------------------------------------------------------------------

_SEP = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$")
_HEAD = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
_ITEM = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+(.*)$")


def _inline(raw):
    """HTML of an inline span: code spans first (their content is literal), then links, strong, emphasis."""
    out = []
    for p in re.split(r"(`[^`]+`)", raw):
        if p.startswith("`") and p.endswith("`") and len(p) > 1:
            out.append("<code>" + _html.escape(p[1:-1], quote=False) + "</code>")
            continue
        s = _html.escape(p, quote=False)
        s = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)",
                   lambda m: f'<a href="{_html.escape(m.group(2))}">{m.group(1)}</a>', s)
        s = re.sub(r"(\*\*|__)(.+?)\1", r"<strong>\2</strong>", s)
        s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
        out.append(s)
    return "".join(out)


def _row(line):
    """The cells of a pipe-table row: split at unescaped pipes outside code spans."""
    s = line.strip()
    s = s[1:] if s.startswith("|") else s
    s = s[:-1] if s.endswith("|") and not s.endswith("\\|") else s
    cells, cur, in_code, k = [], [], False, 0
    while k < len(s):
        ch = s[k]
        if ch == "\\" and k + 1 < len(s) and s[k + 1] == "|":
            cur.append("|")
            k += 2
            continue
        if ch == "`":
            in_code = not in_code
        if ch == "|" and not in_code:
            cells.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
        k += 1
    cells.append("".join(cur).strip())
    return cells


def markdown_to_html(text, title=None):
    lines = text.splitlines()
    out = ['<!doctype html><html><head><meta charset="utf-8">']
    if title:
        out.append(f"<title>{_html.escape(title)}</title>")
    out.append("</head><body>")
    para, items = [], []

    def flush():
        if para:
            out.append("<p>" + _inline(" ".join(para)) + "</p>")
            para.clear()
        if items:
            out.append("<ul>" + "".join(f"<li>{_inline(x)}</li>" for x in items) + "</ul>")
            items.clear()

    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        if not line.strip():
            flush()
            i += 1
            continue
        m = _HEAD.match(line)
        if m:
            flush()
            k = len(m.group(1))
            out.append(f"<h{k}>{_inline(m.group(2))}</h{k}>")
            i += 1
            continue
        if line.strip().startswith("```"):
            flush()
            buf = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            out.append("<pre><code>" + _html.escape("\n".join(buf), quote=False) + "</code></pre>")
            i += 1
            continue
        if line.strip().startswith("|"):
            flush()
            block = []
            while i < n and lines[i].strip().startswith("|"):
                block.append(lines[i])
                i += 1
            header = len(block) > 1 and _SEP.match(block[1]) is not None
            rows = [b for b in block if not _SEP.match(b)]
            parts = []
            for r, row in enumerate(rows):
                tag = "th" if header and r == 0 else "td"
                tr = "<tr>" + "".join(f"<{tag}>{_inline(c)}</{tag}>" for c in _row(row)) + "</tr>"
                parts.append(f"<thead>{tr}</thead><tbody>" if tag == "th" else tr)
            out.append("<table>" + ("" if header else "<tbody>") + "".join(parts) + "</tbody></table>")
            continue
        m = _ITEM.match(line)
        if m:
            if para:
                flush()
            items.append(m.group(1))
            i += 1
            continue
        if items:
            flush()
        para.append(line.strip())
        i += 1
    flush()
    out.append("</body></html>")
    return "\n".join(out)


# --- Crawler's readers ------------------------------------------------------------------------------------------------

def available():
    return shutil.which("node") is not None and (ENGINE / "dist" / "src" / "table_interpreter1g_knowledge.js").exists()


def read_html(html_text):
    """Crawler's 1F/1G/1G+qk readings of one HTML document (``pee.r1.crawler-tables.v1``)."""
    if not available():
        raise CrawlerUnavailable("node or engine-ts/dist missing: run `npm ci && npx tsc -p tsconfig.json` in engine-ts")
    p = subprocess.run(["node", str(BRIDGE)], input=html_text, capture_output=True, text=True, timeout=600)
    if p.returncode != 0:
        raise CrawlerUnavailable(f"tables bridge failed: {p.stderr.strip()[:500]}")
    return json.loads(p.stdout)


def read_markdown(text, title=None):
    """Crawler's readings of a Markdown document, through ``markdown_to_html``."""
    return read_html(markdown_to_html(text, title))


# --- R-1 arm S: values of table cells, from the recovered capability, under Pee's checks ----------------------------
# Structure: Crawler's 1F grid (P0 shows it identical to markdown.py's on the owner documents). Values: the elements
# 1G reads in a cell, reconciled with Pee's value parser; a value is kept only with a unit (a number without a unit or
# scale names no quantity: identifiers, indices and counts are left out). Description: the words of the value's own
# clause in the cell. Entity: the row's label, as a condition, never a merged entity. Pee's general checks: a value
# inside quotation marks is reported speech, not the document's assertion; a column whose header is negated (what a
# thing does not establish) is not read as stating its values. Crawler's evidence classes are never adopted.

_QUOTES = ("\u201c", "\u201d", '"')


def _clause_words(text, start, end, stop):
    """Content words describing the value at [start, end): the nearest words before it in its clause (split at
    ; , ( ) and /), else the nearest after it."""
    lo = max([text.rfind(ch, 0, start) for ch in ";,(/"] + [-1]) + 1
    his = [k for k in (text.find(ch, end) for ch in ";,)/") if k >= 0]
    hi = min(his) if his else len(text)
    pat = r"[A-Za-z][A-Za-z0-9\u2082\-]*"
    before = [w for w in re.findall(pat, text[lo:start]) if w.lower() not in stop]
    after = [w for w in re.findall(pat, text[end:hi]) if w.lower() not in stop]
    return before[-3:] or after[:3]


def _quoted(text, pos, end=None):
    """Whether a value is reported speech: inside double quotation marks, or wrapped by single ones."""
    if end is not None and pos > 0 and text[pos - 1] in "'\u2018" and text[end:end + 1] in ("'", "\u2019"):
        return True
    opened = False
    for k, ch in enumerate(text[:pos]):
        if ch == "\u201c" or (ch == '"' and not opened):
            opened = True
        elif ch == "\u201d" or (ch == '"' and opened):
            opened = False
    return opened


def table_units(doc, readings, lex, tables=None):
    """Proposition units (``has_value``) and ledger entries for the cells of ``doc``'s tables (``tables``: indices,
    or all). ``readings`` is ``read_markdown``'s output for the same document."""
    from universe.acquisition import parse_values
    P = lex.lang.get("propositions") or {}
    neg = [n.lower() for n in P.get("negation") or ()]
    stop = set(lex.stop) | {x.lower() for x in P.get("determiners") or ()}
    obs = {}
    for o in readings.get("observations") or ():
        obs.setdefault(o["table"], []).append(o)
    grids = {t["index"]: {c["index"]: c for c in t["cells"]} for t in readings.get("tables") or ()}
    units, ledger, n = [], [], 0
    for t in doc["tables"]:
        if tables is not None and t["index"] not in tables:
            continue
        header = {c["col"]: c["text"] for c in t["cells"] if c["header"]}
        rows = {}
        for c in t["cells"]:
            rows.setdefault(c["row"], {})[c["col"]] = c
        g = grids.get(t["index"], {})
        cr = {}
        for o in obs.get(t["index"], ()):
            c = g.get(o["cell"])
            if c and o["kind"] in ("quantity", "range", "bound") and o.get("unit"):
                cr.setdefault((c["row"], c["col"]), []).append(o)
        for c in t["cells"]:
            if c["header"]:
                continue
            text = c["text"]
            head = header.get(c["col"], "")
            pv = [v for v in parse_values(text, lex)]
            numbers = {round(x[0], 9) for v in pv for x in v["numbers"]}
            extra = [o for o in cr.get((c["row"], c["col"]), ())
                     if round(o["value"] if o["value"] is not None else o["low"], 9) not in numbers]
            vals = [(v["start"], v["end"], v) for v in pv if v.get("unit")]
            for o in extra:  # a 1G quantity Pee's parser did not read: kept with 1G's unit and surface
                k = text.find(o["surface"])
                if k >= 0:
                    vals.append((k, k + len(o["surface"]), {"form": "range" if o["kind"] == "range" else "single",
                                                            "numbers": [[o["low"]], [o["high"]]] if o["kind"] == "range"
                                                            else [[o["value"]]], "unit": o["unit"], "bound": None,
                                                            "from": "1G"}))
            if not vals:
                continue
            entry = {"locator": c["locator"], "kind": "table cell values", "claims": []}
            if any(re.search(r"(?<![\w'])" + re.escape(w) + r"(?![\w'])", head.lower()) for w in neg):
                entry.update(status="not assimilated", reasons=["the column states what is not established"])
                ledger.append(entry)
                continue
            row_label = rows[c["row"]].get(0, {}).get("text") if c["col"] != 0 else None
            kind_of_row = header.get(0, "")
            for a, b, v in sorted(vals, key=lambda x: x[0]):
                nums = v["numbers"]
                val = {"lo": nums[0][0], "hi": nums[1][0], "unit": v["unit"]} if v["form"] == "range" and len(nums) == 2 \
                    else {"number": nums[0][0], "unit": v["unit"]}
                if v.get("bound") in ("upper", "lower"):
                    val["bound"] = v["bound"]
                words = _clause_words(text, a, b, stop)
                subject = " ".join(words) or re.sub(r"\([^)]*\)", " ", head).strip()
                if not subject:
                    continue
                conds = [{"concept": kind_of_row or "row", "value": row_label.lower()}] if row_label else []
                quoted = _quoted(text, a, b)
                n += 1
                u = {"type": "proposition", "id": f"R{n:05d}", "content_kind": "quantitative", "relation": "has_value",
                     "subject": subject, "object": None, "value": val, "polarity": "affirmed", "modality": "actual",
                     "generality": "generic", "conditions": conds,
                     "document_attitude": "reported" if quoted else "asserted",
                     "evidence_kind": "none_stated" if quoted else "synthesis", "attributed_to": [],
                     "cited_sources": list(c.get("cites") or ()), "depends_on": [], "explains": [], "qualifies": None,
                     "record": {"text": text, "locator": c["locator"], "section": list(t.get("headingPath") or ())},
                     "reading": {"table": t["index"], "row": c["row"], "col": c["col"], "value_from": v.get("from", "pee"),
                                 "column": head, "quoted": quoted}}
                units.append(u)
                entry["claims"].append(u["id"])
            entry["status"] = "acquired" if entry["claims"] else "not assimilated"
            ledger.append(entry)
    return units, ledger


__all__ = ["markdown_to_html", "read_html", "read_markdown", "available", "CrawlerUnavailable", "table_units"]
