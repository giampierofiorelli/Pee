"""F-1: acquisition of knowledge from research documents (REPORT.md section 2.4). Constructed fixtures (T1): they
check mechanics only. The fixture domain (pond pumps) is in neither research package."""
import ast
import json
import pathlib
import re
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(HERE), str(HERE.parent / "s1core")]

from universe import acquisition, contract, dependencies, loader, markdown  # noqa: E402
from universe.store import Item, Store  # noqa: E402

DOC = """# Pond pump research

**Evidence labels:** `PHYSICS`, `ORIGINAL_TEST`, `MANUFACTURER_DECLARED`, `PROPOSED_TEST`.

## 1. Quantities

| Quantity | Definition / unit | Error to prevent |
|---|---|---|
| `Q_p(H,f)` | Delivered water flow, m³/h | Free-flow rating ≠ Q_p at head |
| `H` | Delivery head, m | |
| `f` | Supply frequency, Hz | |
| `L_WA`, `L_pA` | Sound power vs sound pressure, dB(A) | |
| `t_r` | Daily run time, h | |
| `V_d=Q_p×t_r` | Daily delivered volume, m³ | |
| `EF` | Litres moved per kWh over the stated boundary | |
| Basin depth | m, measured at the deepest point | |
| `S_x`, `S_y` | Spray reach for nozzles | |

## 2. Protocols

| Protocol | What it covers | What it does not establish |
|---|---|---|
| **PPT-7 2021** | Flow Q_p at 50 Hz, head 2 m | Noise |

The free-flow figure is a declaration [P01]. A lab measured flow at 2 m head [P02] `ORIGINAL_TEST`. See also [P09].

## Register

### P01 — Pump makers' association catalogue

- **Original source:** Association. **Class:** `STANDARD_CATALOGUE`. https://example.org/p01 , 3 March 2024.

### P02 — Independent pump test

- **Class:** `ORIGINAL_TEST`. https://example.org/p02
"""


def store(legacy=False):
    st = Store()
    loader.load_general_knowledge(st, legacy=legacy)
    return st


def acquire(st, text=DOC, url="package:test-pumps"):
    return acquisition.acquire_document(st, markdown.read(text, url, "author of test-pumps"))


def kind_by_symbol(st, sym, url="package:test-pumps"):
    """A kind the document defined, by its symbol (or by its label for one-letter symbols, which are no anchors)."""
    label = {"H": "Delivery head", "f": "Supply frequency"}.get(sym)
    hits = [k for k in st.of("quantity_kind") if k.body.get("document") == url
            and (sym in k.body.get("symbols", ()) or k.body.get("label") == label)]
    assert len(hits) == 1, (sym, hits)
    return hits[0]


class Reader(unittest.TestCase):
    def test_structure(self):
        d = markdown.read(DOC, "package:x")
        self.assertEqual(len(d["tables"]), 2)
        first = [c for c in d["tables"][0]["cells"] if c["row"] == 1][0]
        self.assertEqual(first["codes"], ["Q_p(H,f)"])
        self.assertTrue(all(c["header"] for c in d["tables"][0]["cells"] if c["row"] == 0))
        self.assertIn("P01", sum((b["cites"] for b in d["blocks"]), []))


class Definitions(unittest.TestCase):
    def setUp(self):
        self.st = store()
        self.s = acquire(self.st)["knowledge"]

    def test_kind_dimension_from_unit(self):
        q = kind_by_symbol(self.st, "Q_p")
        self.assertEqual(list(q.body["dims"])[:3], [3.0, 0.0, -1.0])
        self.assertEqual(self.st.get(f"ST:{q.id}").body["label"], "derived from attributed, unverified sources")

    def test_function_notation_gives_influence_quantities(self):
        q = kind_by_symbol(self.st, "Q_p")
        objs = {c.body["object"] for c in self.st.of("content", form="relation", subject=q.id)
                if self.st.get(c.body["relation"]).body.get("structural_role") == "influence"}
        self.assertEqual(objs, {kind_by_symbol(self.st, "H").id, kind_by_symbol(self.st, "f").id})

    def test_parallel_symbols_level_scale_and_no_duplicate(self):
        self.assertEqual(kind_by_symbol(self.st, "L_WA").body.get("scale"), "level")
        # "sound pressure" is a base kind's term: the document supports it instead of duplicating it
        self.assertIn("Q:sound_level", [c.body["kind"] for c in self.st.of("content", form="definition_support")])
        self.assertFalse([k for k in self.st.of("quantity_kind") if "L_pA" in k.body.get("symbols", ())])

    def test_rate_phrase_and_unitless_rows_give_no_kind(self):
        for sym in ("EF", "S_x"):
            self.assertFalse([k for k in self.st.of("quantity_kind") if sym in k.body.get("symbols", ())])
        self.assertTrue(self.s["abstained"])

    def test_name_row_with_base_head_noun_supports_base_kind(self):
        self.assertIn("Q:depth", [c.body["kind"] for c in self.st.of("content", form="definition_support")])

    def test_formula_becomes_a_checked_model(self):
        self.assertEqual(len(self.s["models"]), 1)
        m = self.st.get(self.s["models"][0]).body
        self.assertEqual(set(m["forms"]), {"y", "x0", "x1"})

    def test_formula_with_wrong_dimensions_is_refused(self):
        st = store()
        bad = DOC.replace("`V_d=Q_p×t_r`", "`V_d=Q_p×H`")
        s = acquire(st, bad, "package:bad")["knowledge"]
        self.assertEqual(s["models"], [])
        self.assertTrue(any(a["unit"] == "formula" and "refused" in a["why"] for a in s["abstained"]))

    def test_non_identity(self):
        d = [c for c in self.st.of("content", form="relation") if c.body.get("designations")]
        self.assertTrue(any(c.body["designations"][1] == "Q_p at head" for c in d))

    def test_method_with_its_condition_set(self):
        m = [x for x in self.st.of("method") if x.body.get("label") == "PPT-7 2021"][0].body
        self.assertEqual(list(m["editions"]), ["2021"])
        self.assertIn(kind_by_symbol(self.st, "Q_p").id, m["measures"])
        conds = m["condition_sets"][0]["conditions"]
        self.assertEqual(tuple(conds[kind_by_symbol(self.st, "f").id][:2]), (50.0, 50.0))
        self.assertTrue(m["negative_scope"])


class Provenance(unittest.TestCase):
    def setUp(self):
        self.st = store()
        self.s = acquire(self.st)["knowledge"]

    def test_cited_sources_are_never_marked_examined(self):
        srcs = [self.st.get(e).body for e in self.s["sources"]]
        self.assertEqual({s["cited_id"] for s in srcs}, {"P01", "P02"})
        self.assertTrue(all(s["examined"] is False for s in srcs))
        p01 = [s for s in srcs if s["cited_id"] == "P01"][0]
        self.assertEqual((p01["url"], p01["date"], p01["evidence_class"]),
                         ("https://example.org/p01", "3 March 2024", "E:standard_description"))

    def test_missing_register_entry_is_never_invented(self):
        self.assertEqual(self.s["unresolved"], ["P09"])
        self.assertFalse([e for e in self.st.of("entity") if e.body.get("cited_id") == "P09"])

    def test_legend_labels_map_to_evidence_classes(self):
        got = {self.st.get(c).body["label"]: self.st.get(c).body["evidence_class"] for c in self.s["labels"]}
        self.assertEqual(got, {"PHYSICS": "E:physical_relation", "ORIGINAL_TEST": "E:original_measurement",
                               "MANUFACTURER_DECLARED": "E:manufacturer_declaration",
                               "PROPOSED_TEST": "E:proposed_method"})

    def test_statement_attribution_keeps_citation_and_class(self):
        atts = [self.st.get(a).body for a in self.s["attributions"]]
        lab = [a for a in atts if "E:original_measurement" in a["evidence_classes"] and a["cites"]]
        self.assertEqual(len(lab), 1)
        self.assertEqual(lab[0]["cited_sources_examined"], False)
        self.assertTrue(lab[0]["cites"])

    def test_retracting_a_cited_source_propagates(self):
        p02 = [e for e in self.s["sources"] if self.st.get(e).body["cited_id"] == "P02"][0]
        att = [a for a in self.s["attributions"] if p02 in self.st.get(a).body["cites"]]
        self.assertTrue(att)
        dependencies.retract(self.st, p02, "tester", "the register entry was wrong")
        self.assertFalse(any(dependencies.current(self.st, a) for a in att))


class Identity(unittest.TestCase):
    def test_same_symbol_in_two_documents_is_never_merged(self):
        st = store()
        acquire(st)
        acquire(st, DOC, "package:other-pumps")
        a, b = kind_by_symbol(st, "Q_p"), kind_by_symbol(st, "Q_p", "package:other-pumps")
        self.assertNotEqual(a.id, b.id)
        cos = [c.body for c in st.of("content", form="co_reference") if set(c.body["relata"]) == {a.id, b.id}]
        self.assertEqual([c["verdict"] for c in cos], ["indeterminate"])

    def test_a_value_row_is_not_a_definition(self):
        st = store()
        s = acquire(st, "| Quantity | Definition |\n|---|---|\n| `Z` | 30 m³/h at 2 m |\n", "package:v")
        self.assertFalse(s.get("knowledge", {}).get("kinds"))


def cell(r, c, text):
    return {"row": r, "col": c, "header": r == 0, "text": text, "locator": f"{r}.{c}"}


SHEET = {"url": "https://maker.example/pump-a", "sha256": "0", "names": [{"text": "Aqua P1", "source": "json-ld-product"}],
         "headings": [], "blocks": [], "sourceTypeOperatorAsserted": "manufacturer",
         "tables": [{"index": 0, "locator": "t0", "caption": None, "sectionPath": [], "headingPath": [], "cells": [
             cell(0, 0, "Spec"), cell(0, 1, "Value"), cell(1, 0, "Q_p"), cell(1, 1, "3 m³/h"),
             cell(2, 0, "Q_p at 2 m, 50 Hz"), cell(2, 1, "2 m³/h"), cell(3, 0, "Q_p (PPT-7)"), cell(3, 1, "1.8 m³/h")]}]}


def ask(st, ent, kind, op, bound, unit, conds, qid):
    req = {"source": "t", "holder": "buyer", "basis": "stated requirement"}
    st.acquire(Item(f"D:{qid}", "content", {"form": "class_definition", "class": f"K:{qid}", "kind": kind, "op": op,
                                             "bound": bound, "unit": unit}, req))
    st.acquire(Item(f"Q:{qid}", "question", {"role": "x", "class": f"K:{qid}"}, req))
    st.acquire(Item(f"I:{qid}", "inquiry", {"question": f"Q:{qid}", "roles": {"x": ent}, "conditions": conds,
                                            "scope_assumptions": []}, {"source": "t", "holder": "h",
                                                                       "basis": "definition"}))
    return contract.inquire(st, f"I:{qid}")


class Use(unittest.TestCase):
    """Knowledge acquired from a document changes how a later document is read and what the rules conclude."""

    def setUp(self):
        self.st = store()
        acquire(self.st)
        acquisition.acquire_document(self.st, SHEET)
        self.q = kind_by_symbol(self.st, "Q_p")
        self.h, self.f = kind_by_symbol(self.st, "H"), kind_by_symbol(self.st, "f")
        self.ent = [e.id for e in self.st.of("entity") if e.body.get("label") == "aqua p1"][0]
        self.vals = [c.body for c in self.st.of("content", form="quantity") if c.body.get("bearer") == self.ent]

    def test_influence_values_are_read_as_conditions(self):
        at = [v for v in self.vals if v["lo"] == 2.0][0]
        self.assertNotIn("incomplete", at)
        self.assertEqual(tuple(at["conditions"][self.h.id][:2]), (2.0, 2.0))
        self.assertEqual(tuple(at["conditions"][self.f.id][:2]), (50.0, 50.0))

    def test_a_value_without_them_leaves_them_unspecified(self):
        bare = [v for v in self.vals if v["lo"] == 3.0][0]
        self.assertIn(self.h.id, bare["unspecified"])

    def test_a_method_fixes_its_conditions(self):
        m = [v for v in self.vals if v["lo"] == 1.8][0]
        self.assertEqual(tuple(m["conditions"][self.f.id][:2]), (50.0, 50.0))
        self.assertTrue(m["methods"])

    def test_unspecified_influence_blocks_an_unjustified_decision(self):
        a = ask(self.st, self.ent, self.q.id, ">=", 1.5, "m3/h", {self.h.id: [4, 4, "m"]}, "u1")
        self.assertEqual(a.verdict, "undetermined")
        b = ask(self.st, self.ent, self.q.id, ">=", 1.5, "m3/h", {self.h.id: [2, 2, "m"], self.f.id: [50, 50, "Hz"]},
                "u2")
        self.assertEqual(b.verdict, "applies")

    def test_without_the_document_the_sheet_is_not_readable(self):
        st = store()
        acquisition.acquire_document(st, SHEET)
        self.assertTrue(all(c.body.get("incomplete") for c in st.of("content", form="quantity")))

    def test_question_conditions_are_read_with_the_kind(self):
        lex = acquisition.Lexicon(self.st)
        conds, left = acquisition.read_conditions("at 2 m and 50 Hz", lex, self.q.id)
        self.assertEqual(set(conds), {self.h.id, self.f.id})


class Architecture(unittest.TestCase):
    def test_no_domain_vocabulary_in_new_code(self):
        """The new modules' literals (docstrings excluded) name no term of the universe's knowledge nor of the
        fixture domain or the two taught categories."""
        items = [i for f in ("general.json", "legacy-i2-category.json")
                 for i in json.loads((HERE / "knowledge" / f).read_text())["items"]]
        vocab = {t for i in items if i.get("category") != "evidence class"
                 for t in list(i.get("terms", [])) + list(i.get("named", [])) if len(t) >= 4}
        vocab |= {"pump", "pond", "nozzle", "basin", "humid", "purif", "cadr", "aham", "energy star", "dehumid"}
        for f in ("knowledge_acquisition.py", "markdown.py"):
            tree = ast.parse((HERE / "universe" / f).read_text())
            docs = {id(n.body[0].value) for n in ast.walk(tree) if isinstance(n, (ast.Module, ast.FunctionDef,
                                                                                 ast.ClassDef))
                    and ast.get_docstring(n)}
            lits = [n.value.lower() for n in ast.walk(tree) if isinstance(n, ast.Constant)
                    and isinstance(n.value, str) and id(n) not in docs]
            hits = [(f, w) for w in vocab for lit in lits if re.search(rf"(?<!\w){re.escape(w)}", lit)]
            self.assertEqual(hits, [])


if __name__ == "__main__":
    unittest.main()
