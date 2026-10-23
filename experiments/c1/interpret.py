"""C-1: a local language model as interpreter (arm L) and as verifier (arms A+V, L+V), feeding the O-2 path.

The model reads one prose sentence at a time, with its heading path and the previous sentence as context, and writes
proposition units in the schema of ``experiments/a1/annotation-guide.md``. Its output is constrained by a JSON schema
(llama.cpp grammar). The same model, as verifier, answers whether a sentence states a given proposition; a unit the
verifier does not confirm is held back with its reason, never repaired.

Segmentation is A-1's (``propositions._segments`` and ``propositions.sentences``): every arm sees the same sentences.
Citations written as Markdown links ``[R05](url)`` are given to the model as ``[R05]``. Nothing is persisted.

Runs inside the C-1 virtual environment (llama-cpp-python), outside every repository.

Usage:
  python interpret.py read   <model.gguf> <document.md> <scored lines json> <split> <out units.json> [--limit N]
  python interpret.py verify <model.gguf> <document.md> <units.json> <out verified.json>
"""
import json
import pathlib
import re
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
EXP = HERE.parent
sys.path[:0] = [str(EXP / "universe"), str(EXP / "s1core")]

from universe import markdown, propositions  # noqa: E402

URL = "document:SPEAKERS-COMPENDIUM"
HOLDER = "owner research package author"
RELATIONS = ["increases", "decreases", "affects", "causes", "prevents", "enables", "depends_on", "determines",
             "correlates_with", "is_a", "part_of", "has_property", "defined_as", "measures", "establishes",
             "does_not_establish", "requires", "recommends", "indicates", "applies_to", "exceeds", "less_than",
             "equals", "differs_from", "has_value", "occurs", "explains", "other"]
KINDS = ["causal", "dependence", "association", "definition", "classification", "quantitative", "comparison",
         "method", "norm", "scope", "explanation", "identity", "existence", "unknown"]
ATT = ["asserted", "proposed", "hypothesised", "questioned", "denied", "reported"]
EVID = ["synthesis", "original_measurement", "standard_or_regulation", "expert_judgement", "guidance", "proposal",
        "hypothesis", "none_stated"]
LINK = re.compile(r"\[([A-Za-z]{1,4}\d{1,4})\]\([^)]*\)")

SCHEMA = {"type": "object", "properties": {"propositions": {"type": "array", "maxItems": 8, "items": {
    "type": "object", "properties": {
        "content_kind": {"type": "string", "enum": KINDS},
        "relation": {"type": "string", "enum": RELATIONS},
        "verb": {"type": "string"},
        "subject": {"type": "string"}, "object": {"type": "string"},
        "polarity": {"type": "string", "enum": ["affirmed", "negated"]},
        "modality": {"type": "string", "enum": ["actual", "possible", "necessary", "typical"]},
        "conditions": {"type": "array", "maxItems": 4, "items": {"type": "object", "properties": {
            "concept": {"type": "string"}, "value": {"type": "string"}}, "required": ["concept", "value"]}},
        "document_attitude": {"type": "string", "enum": ATT},
        "evidence_kind": {"type": "string", "enum": EVID},
        "attributed_to": {"type": "array", "maxItems": 8, "items": {"type": "string"}}},
    "required": ["content_kind", "relation", "verb", "subject", "object", "polarity", "modality", "conditions",
                 "document_attitude", "evidence_kind", "attributed_to"]}}}, "required": ["propositions"]}

SYSTEM = (
    "You translate one sentence of a scientific teaching document into the propositions it states. "
    "One proposition is one claim; a sentence may state several (at most 8). Record only what the sentence states: "
    "never add knowledge, never summarise, never judge truth.\n"
    "Fields: content_kind; relation (one of the listed relations; use 'other' only when none fits, and then give the "
    "document's verb in 'verb'); subject and object as short noun phrases in the document's words (object may be "
    "empty when the relation needs none); polarity 'negated' when the sentence says the claim does NOT hold "
    "(a prohibition such as 'do not use X' is relation 'recommends', polarity 'negated'); modality (possible for "
    "can/may, necessary for must/always, typical for usually/often); conditions under which it holds; "
    "document_attitude (asserted, proposed for a proposal or protocol the author puts forward, hypothesised, "
    "questioned, reported when the author reports a source without endorsing it); evidence_kind: the kind of "
    "support the sentence gives for this claim (synthesis = the author's scientific account; original_measurement "
    "= a measured result of an identified study or test; standard_or_regulation; expert_judgement; guidance; "
    "proposal; hypothesis; none_stated = no support at all); attributed_to: the cited source identifiers such as "
    "R05 that the sentence attributes this claim to (empty list if none). A citation never makes a synthesis an "
    "original measurement. If the sentence states no scientific claim, return an empty list.")

EXAMPLE_IN = ("Heading: Soil and water\nPrevious sentence: (none)\nSentence: Compacted soil does not absorb heavy "
              "rain, so surface runoff increases [R12].")
EXAMPLE_OUT = json.dumps({"propositions": [
    {"content_kind": "causal", "relation": "other", "verb": "absorb", "subject": "compacted soil",
     "object": "heavy rain", "polarity": "negated", "modality": "actual", "conditions": [],
     "document_attitude": "asserted", "evidence_kind": "synthesis", "attributed_to": ["R12"]},
    {"content_kind": "causal", "relation": "increases", "verb": "", "subject": "soil compaction",
     "object": "surface runoff", "polarity": "affirmed", "modality": "actual",
     "conditions": [{"concept": "rain", "value": "heavy"}], "document_attitude": "asserted",
     "evidence_kind": "synthesis", "attributed_to": ["R12"]}]})


def load(model):
    from llama_cpp import Llama
    return Llama(model_path=str(model), n_ctx=4096, n_threads=4, verbose=False, seed=0)


def sentences_of(md_text, scored):
    """(locator, line range, heading path, previous sentence, sentence) for prose sentences on scored lines, in A-1's
    segmentation."""
    doc = markdown.read(md_text, URL, HOLDER)
    scored = set(scored)
    out = []
    for locator, hp, text, kind in propositions._segments(doc):
        if kind == "table cell":
            continue
        m = re.search(r"lines? (\d+)(?:-(\d+))?", locator or "")
        if not m:
            continue
        a, b = int(m.group(1)), int(m.group(2) or m.group(1))
        if not set(range(a, b + 1)) & scored:
            continue
        prev = None
        for si, s in enumerate(propositions.sentences(text)):
            out.append({"locator": f"lines {a}-{b} sentence {si + 1}", "lines": [a, b], "headings": list(hp),
                        "previous": prev, "sentence": s})
            prev = s
    return out


def raw_sentence(md_lines, item):
    """The sentence as the model sees it: A-1's sentence text, with link citations restored as [R05] from the
    block's raw lines when A-1's text lost them."""
    raw = " ".join(md_lines[item["lines"][0] - 1:item["lines"][1]])
    cites = LINK.findall(raw)
    s = item["sentence"]
    if cites and not re.search(r"\[[A-Za-z]{1,4}\d{1,4}\]", s):
        # keep only citations whose link text occurs right after this sentence's last words in the raw block
        tail = re.escape(" ".join(s.split()[-3:])) if len(s.split()) >= 3 else None
        if tail and re.search(tail, LINK.sub(lambda m: f"[{m.group(1)}]", raw)):
            seg = LINK.sub(lambda m: f"[{m.group(1)}]", raw)
            k = re.search(tail, seg).end()
            follow = re.match(r"((?:\s*[,;]?\s*\[[A-Za-z]{1,4}\d{1,4}\])+)", seg[k:])
            if follow:
                s = s + follow.group(1)
    return s


def read(llm, items, md_lines):
    units, timing = [], []
    for i, it in enumerate(items):
        sent = raw_sentence(md_lines, it)
        user = (f"Heading: {' > '.join(h for h in it['headings'] if h) or '(none)'}\n"
                f"Previous sentence: {it['previous'] or '(none)'}\nSentence: {sent}")
        t0 = time.time()
        r = llm.create_chat_completion(messages=[
            {"role": "system", "content": SYSTEM}, {"role": "user", "content": EXAMPLE_IN},
            {"role": "assistant", "content": EXAMPLE_OUT}, {"role": "user", "content": user}],
            response_format={"type": "json_object", "schema": SCHEMA}, temperature=0.0, max_tokens=900)
        dt = time.time() - t0
        timing.append(dt)
        try:
            props = json.loads(r["choices"][0]["message"]["content"])["propositions"]
        except Exception as e:  # recorded, never repaired
            props, err = [], str(e)[:120]
        else:
            err = None
        for k, p in enumerate(props):
            rel = p["relation"]
            if rel == "other" and p.get("verb"):
                rel = f"other: {p['verb']}"
            pol = p["polarity"]
            if rel == "does_not_establish":  # A-1's encoding
                rel, pol = "establishes", "negated" if pol == "affirmed" else "affirmed"
            units.append({"type": "proposition", "id": f"L{len(units) + 1:05d}", "content_kind": p["content_kind"],
                          "relation": rel, "subject": p["subject"] or None, "object": p["object"] or None,
                          "value": None, "polarity": pol, "modality": p["modality"], "generality": "generic",
                          "conditions": [c for c in p["conditions"] if c.get("concept")],
                          "document_attitude": p["document_attitude"], "evidence_kind": p["evidence_kind"],
                          "attributed_to": p["attributed_to"], "depends_on": [], "explains": [], "qualifies": None,
                          "record": {"text": it["sentence"], "locator": it["locator"], "section": it["headings"]}})
        if err:
            units.append({"type": "read_error", "locator": it["locator"], "error": err})
        print(json.dumps({"i": i, "s": round(dt, 1), "props": len(props)}), file=sys.stderr, flush=True)
    return units, timing


VSCHEMA = {"type": "object", "properties": {"answer": {"type": "string", "enum": ["yes", "no", "unclear"]}},
           "required": ["answer"]}
VSYSTEM = ("You check a translation. Answer 'yes' only if the sentence states the proposition: the same subject and "
           "object, the same relation and direction, the same polarity (affirmed or negated), and the same attitude "
           "(asserted, proposed, reported...). Answer 'no' if any of these differs or the proposition adds content "
           "the sentence does not state. Answer 'unclear' if the sentence alone does not allow a decision.")


def render(u):
    neg = "NOT " if u.get("polarity") == "negated" else ""
    mod = "" if u.get("modality") in (None, "actual") else f"[{u['modality']}] "
    conds = "; ".join(f"{c.get('value')} {c.get('concept')}" for c in u.get("conditions") or ())
    s = f"{mod}{u.get('subject')} — {neg}{u.get('relation')} — {u.get('object') or ''}"
    return s + (f" | under: {conds}" if conds else "") + f" | attitude: {u.get('document_attitude')}"


def verify(llm, units):
    out, timing = [], []
    for u in units:
        if u.get("type") != "proposition":
            out.append(u)
            continue
        t0 = time.time()
        r = llm.create_chat_completion(messages=[
            {"role": "system", "content": VSYSTEM},
            {"role": "user", "content": f"Sentence: {u['record']['text']}\nProposition: {render(u)}"}],
            response_format={"type": "json_object", "schema": VSCHEMA}, temperature=0.0, max_tokens=12)
        timing.append(time.time() - t0)
        try:
            ans = json.loads(r["choices"][0]["message"]["content"])["answer"]
        except Exception:
            ans = "unclear"
        out.append(dict(u, verifier=ans))
    return out, timing


def main(argv):
    if argv[0] == "read":
        model, md, meta, split, outp = argv[1:6]
        limit = int(argv[argv.index("--limit") + 1]) if "--limit" in argv else None
        text = pathlib.Path(md).read_text()
        items = sentences_of(text, json.loads(pathlib.Path(meta).read_text())[split]["scored_lines"])
        if limit:
            items = items[:limit]
        llm = load(model)
        units, timing = read(llm, items, text.split("\n"))
        pathlib.Path(outp).write_text(json.dumps({"split": split, "sentences": len(items), "units": units,
                                                  "seconds": timing}, ensure_ascii=False))
        print(json.dumps({"sentences": len(items), "units": sum(1 for u in units if u["type"] == "proposition"),
                          "errors": sum(1 for u in units if u["type"] == "read_error"),
                          "mean_s": round(sum(timing) / max(1, len(timing)), 2), "max_s": round(max(timing or [0]), 1)}))
    elif argv[0] == "verify":
        model, md, unitsp, outp = argv[1:5]
        units = json.loads(pathlib.Path(unitsp).read_text())["units"]
        llm = load(model)
        out, timing = verify(llm, units)
        pathlib.Path(outp).write_text(json.dumps({"units": out, "seconds": timing}, ensure_ascii=False))
        from collections import Counter
        print(json.dumps({"verdicts": Counter(u.get("verifier") for u in out if u["type"] == "proposition"),
                          "mean_s": round(sum(timing) / max(1, len(timing)), 2)}))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
