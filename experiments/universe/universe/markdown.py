"""Markdown reader (F-1, A0): the structure of a research document, in the form the acquisition service reads.

An input adapter, like the structural readers that exported the HTML pages for I-1 and I-2: it reads syntax only
(headings, paragraphs, list items, tables, code spans, bracketed identifiers, links) and interprets nothing. Every
block and table cell keeps its line locator. Emphasis marks are removed from text; code spans are kept in the text
without their backticks and listed separately, because notation (symbols, formulas, labels) is written in them.
"""
import hashlib
import re

SCHEMA = "pee.f1.markdown-structure.v1"
CODE = re.compile(r"`([^`]+)`")
LINK = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")
CITE = re.compile(r"\[([A-Za-z]{1,4}\d{1,4})\]")
HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
LIST = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+")
SEPARATOR_ROW = re.compile(r"^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$")


def _inline(raw):
    """Plain text of an inline span: (text, code spans, link urls, cited identifiers)."""
    codes = CODE.findall(raw)
    links = [u for _, u in LINK.findall(raw)]
    cites = CITE.findall(raw)
    text = LINK.sub(lambda m: m.group(1) if not CITE.fullmatch(f"[{m.group(1)}]") else f"[{m.group(1)}]", raw)
    text = CODE.sub(lambda m: m.group(1), text)
    text = re.sub(r"(\*\*|__)(.+?)\1", r"\2", text)
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"\1", text)
    return " ".join(text.split()), codes, links, cites


def _cells(line):
    s = line.strip()
    if s.startswith("|"):
        s = s[1:]
    if s.endswith("|") and not s.endswith("\\|"):
        s = s[:-1]
    parts, cur, code = [], "", False
    for ch in s:
        if ch == "`":
            code = not code
        if ch == "|" and not code and not cur.endswith("\\"):
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return [p.strip() for p in parts]


def read(text, url, holder=None):
    """The structure of a Markdown document. ``url`` names the document (a package path); ``holder`` is the
    author the caller knows the document to be from (its attribution)."""
    lines = text.splitlines()
    headings, blocks, tables = [], [], []
    path = []  # (level, heading index)

    def section():
        return [i for _, i in path]

    def heading_path():
        return [headings[i]["text"] for _, i in path]

    def block(raw, start, end, kind, **extra):
        t, codes, links, cites = _inline(raw)
        if t:
            blocks.append(dict({"index": len(blocks), "sectionPath": section(), "text": t, "kind": kind,
                                "codes": codes, "links": links, "cites": cites,
                                "locator": f"lines {start + 1}-{end + 1}"}, **extra))

    i, n = 0, len(lines)
    para, pstart = [], 0

    def flush(end):
        nonlocal para
        if para:
            block(" ".join(para), pstart, end, "paragraph")
            para = []

    while i < n:
        line = lines[i]
        m = HEADING.match(line)
        if m:
            flush(i - 1)
            level = len(m.group(1))
            t, codes, links, cites = _inline(m.group(2))
            idx = len(headings)
            while path and path[-1][0] >= level:
                path.pop()
            headings.append({"index": idx, "level": level, "text": t, "codes": codes, "cites": cites,
                             "sectionPath": section(), "locator": f"line {i + 1}"})
            path.append((level, idx))
            i += 1
            continue
        if line.strip().startswith("|"):
            flush(i - 1)
            start = i
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                if not SEPARATOR_ROW.match(lines[i].strip()):
                    rows.append((i, _cells(lines[i])))
                i += 1
            has_header = start + 1 < n and SEPARATOR_ROW.match(lines[start + 1].strip() or "x") is not None
            cells = []
            for r, (ln, row) in enumerate(rows):
                for c, raw in enumerate(row):
                    t, codes, links, cites = _inline(raw)
                    cells.append({"row": r, "col": c, "rowspan": 1, "colspan": 1, "header": has_header and r == 0,
                                  "scope": None, "text": t, "codes": codes, "links": links, "cites": cites,
                                  "locator": f"line {ln + 1} cell {c + 1}"})
            tables.append({"index": len(tables), "locator": f"lines {start + 1}-{i}", "caption": None,
                           "sectionPath": section(), "headingPath": heading_path(), "cells": cells})
            continue
        if line.strip().startswith("```"):  # T-1: a fenced block is code (notation), never prose
            flush(i - 1)
            start = i
            buf = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            block(" ".join(x.strip() for x in buf) or "code", start, min(i, n - 1), "code")
            i += 1
            continue
        if line.strip().startswith("\\["):
            flush(i - 1)
            start = i
            buf = []
            while i < n:
                buf.append(lines[i])
                if lines[i].strip().endswith("\\]"):
                    break
                i += 1
            block(" ".join(x.strip() for x in buf), start, i, "math")
            i += 1
            continue
        if not line.strip() or line.strip() == "---":
            flush(i - 1)
            i += 1
            continue
        stripped = re.sub(r"^\s*>\s?", "", line)
        if LIST.match(stripped):
            flush(i - 1)
            block(LIST.sub("", stripped, count=1), i, i, "list item",
                  ordered=bool(re.match(r"^\s*\d+[.)]\s", stripped)))
            i += 1
            continue
        if not para:
            pstart = i
        para.append(stripped.strip())
        i += 1
    flush(n - 1)
    return {"schema": SCHEMA, "url": url, "holder": holder, "sha256": hashlib.sha256(text.encode()).hexdigest(),
            "lang": "en", "sourceTypeOperatorAsserted": None, "names": [], "headings": headings, "blocks": blocks,
            "tables": tables}
