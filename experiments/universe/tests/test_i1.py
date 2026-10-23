"""I-1 tests, tier T1 (constructed document structures; mechanics only, no page content).

Acquisition proposes items and never decides; MS1 rules and the model service answer from universe items only.
"""
import ast
import pathlib
import re
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(HERE), str(HERE.parent / "s1core")]

from s1core import units  # noqa: E402
from universe import acquisition, contract, loader  # noqa: E402
from universe.store import Item, Store  # noqa: E402

S, D = "C:operating_setting", "C:distance_to_source"
BUYER = {"source": "test", "holder": "buyer", "basis": "stated requirement"}
USAGE = {"source": "test", "holder": "buyer", "basis": "assumption"}
HARNESS = {"source": "test", "holder": "harness", "basis": "definition"}


def cell(r, c, text, links=()):
    return {"row": r, "col": c, "rowspan": 1, "colspan": 1, "header": False, "scope": None, "text": text,
            "links": list(links), "locator": f"t/{r}/{c}"}


def doc(tables, names=(("Alpha One", "title_segment"),), headings=(), blocks=()):
    return {"url": "https://example.org/a", "sha256": "0" * 64, "lang": "en", "sourceTypeOperatorAsserted": "test",
            "names": [{"text": t, "source": s} for t, s in names], "headings": list(headings), "blocks": list(blocks),
            "tables": [{"index": i, "locator": f"t{i}", "caption": None, "sectionPath": [], "headingPath": [],
                        "cells": cs} for i, cs in enumerate(tables)]}


def store_with(d):
    st = Store()
    loader.load_general_knowledge(st)
    summ = acquisition.acquire_document(st, d)
    return st, summ


def complete(st, summ):
    return [st.get(c) for c in summ["contents"] if "incomplete" not in st.get(c).body]


def ent(st, label):
    return next(e.id for e in st.of("entity") if e.body["label"] == label)


def ask(st, qid, roles, q, conditions=None, definition=None, givens=()):
    if definition:
        st.acquire(Item(f"D:{qid}", "content", dict(definition, form="class_definition", **{"class": f"K:{qid}"}), BUYER))
        q = dict(q, **{"class": f"K:{qid}"})
    st.acquire(Item(f"Q:{qid}", "question", q, BUYER))
    st.acquire(Item(f"I:{qid}", "inquiry", {"question": f"Q:{qid}", "roles": roles, "conditions": conditions or {},
                                           "scope_assumptions": []}, HARNESS))
    for n, (role, kind, lo, hi, unit) in enumerate(givens):
        st.acquire(Item(f"I:{qid}:g{n}", "content", {"form": "quantity", "bearer": roles[role], "kind": kind, "lo": lo,
                                                    "hi": hi, "unit": unit, "conditions": {}, "scope": "invariant",
                                                    "invariance": "datum", "holds_of": "individual"}, USAGE,
                        {"situation": f"I:{qid}"}))
    return contract.inquire(st, f"I:{qid}")


PRODUCT_NAME = (("Alpha One", "json-ld-product"),)  # structured product data names the subject


# a table with settings in the column headers and a measuring distance in the row label, and one with products named
# by links in rows and a setting in a column header
SETTINGS = [cell(0, 0, ""), cell(0, 1, "SETTING 1"), cell(0, 2, "SETTING 2"),
            cell(1, 0, "NOISE LEVEL (from 1 m away)"), cell(1, 1, "30.0 dBA"), cell(1, 2, "40.0 dBA"),
            cell(2, 0, "POWER IN WATTS"), cell(2, 1, "5 W"), cell(2, 2, "9 W")]
PRODUCTS = [cell(0, 0, "MODEL"), cell(0, 1, "POWER AT TOP SPEED (watts)"),
            cell(1, 0, "Alpha One", ["Alpha One"]), cell(1, 1, "20 watts"),
            cell(2, 0, "Beta Two X-7", ["Beta Two X-7"]), cell(2, 1, "35 watts")]


class Acquisition(unittest.TestCase):
    def test_slots_from_structure(self):
        st, summ = store_with(doc([SETTINGS, PRODUCTS]))
        got = {(st.get(c.body["bearer"]).body["label"], c.body["kind"], c.body["lo"], c.body["unit"],
                tuple(sorted((k, str(v)) for k, v in c.body["conditions"].items()))) for c in complete(st, summ)}
        self.assertIn(("alpha one", "Q:sound_level", 40.0, "dBA",
                       ((D, "(1.0, 1.0, 'm')"), (S, "setting 2"))), got)
        self.assertIn(("alpha one", "Q:electric_power", 5.0, "W", ((S, "setting 1"),)), got)
        self.assertIn(("beta two x 7", "Q:electric_power", 35.0, "W", ((S, "top speed"),)), got)

    def test_records_attributed_and_contents_interpret_them(self):
        st, summ = store_with(doc([SETTINGS]))
        for c in complete(st, summ):
            rec = st.get(c.body["interprets"])
            self.assertEqual((rec.kind, rec.provenance["basis"], rec.provenance["holder"]),
                             ("record", "document statement", "example.org"))
            grounds = st.get(f"ST:{c.id}").body["grounds"]
            self.assertTrue(any(st.get(g).body.get("form") == "attribution" for g in grounds if st.has(g)
                                and st.get(g).kind == "content"))

    def test_unplaced_header_words_make_a_content_incomplete_not_a_qualifier(self):
        st, summ = store_with(doc([[cell(0, 0, "Gizmo flux reading:"), cell(0, 1, "12 W")]]))
        (c,) = [st.get(x) for x in summ["contents"]]
        self.assertTrue(any("not placed" in r or "no quantity kind" in r for r in c.body["incomplete"]))
        self.assertNotIn("qualifiers", c.body)

    def test_name_with_digits_is_not_a_value_and_unknown_names_do_not_default_to_the_subject(self):
        st, summ = store_with(doc([[cell(0, 0, "MODEL"), cell(0, 1, "POWER IN WATTS"),
                                    cell(1, 0, "Gamma Q-9"), cell(1, 1, "50 W")]]))
        (c,) = [st.get(x) for x in summ["contents"]]
        # the row header names the bearer (the other axis names the quantity): the value is never the subject's
        self.assertNotIn("incomplete", c.body)
        self.assertEqual(st.get(c.body["bearer"]).body["label"], "gamma q 9")

    def test_names_on_both_axes_leave_the_bearer_undecided(self):
        st, summ = store_with(doc([[cell(0, 0, ""), cell(0, 1, "Scene One"), cell(1, 0, "Gamma Q-9"),
                                    cell(1, 1, "50 W")]]))
        (c,) = [st.get(x) for x in summ["contents"]]
        self.assertIn("incomplete", c.body)

    def test_thousands_notation_gives_alternatives(self):
        st, summ = store_with(doc([[cell(0, 0, "Battery capacity:"), cell(0, 1, "5.200 mAh")]], names=PRODUCT_NAME))
        cs = complete(st, summ)
        self.assertEqual(sorted(c.body["lo"] for c in cs), [5.2, 5200.0])
        self.assertEqual(len({c.body["alternative_of"] for c in cs}), 1)

    def test_title_alone_does_not_name_the_subject_of_a_key_value_table(self):
        # an article title is not corroborated as the subject unless a table header names it
        st, summ = store_with(doc([[cell(0, 0, "Battery capacity:"), cell(0, 1, "5200 mAh")]]))
        (c,) = [st.get(x) for x in summ["contents"]]
        self.assertIn("incomplete", c.body)

    def test_comparison_table_rows_are_never_the_subject_by_default(self):
        # rows name other things (one per row, right of a rank cell): the subject is not their default bearer
        rows = [cell(0, 0, "Rank"), cell(0, 1, "Model"), cell(0, 2, "Weight"),
                cell(1, 0, "1."), cell(1, 1, "Alpha One", ["Alpha One"]), cell(1, 2, "1.1 kg"),
                cell(2, 0, "2."), cell(2, 1, "Beta Two X-7", ["Beta Two X-7"]), cell(2, 2, "1.4 kg")]
        for c in rows[:3]:
            c["header"] = True
        st, summ = store_with(doc([rows], names=PRODUCT_NAME))
        self.assertEqual(complete(st, summ), [])

    def test_an_unread_unit_word_is_never_replaced_by_another_numbers_unit(self):
        st, summ = store_with(doc([[cell(0, 0, "Frequency:"), cell(0, 1, "38Hz – 20 QHz")]], names=PRODUCT_NAME))
        self.assertEqual(complete(st, summ), [])  # never 38 Hz to 20 Hz

    def test_range_with_bounds_out_of_order_is_incomplete(self):
        st, summ = store_with(doc([[cell(0, 0, "Power:"), cell(0, 1, "60 – 40 W")]], names=PRODUCT_NAME))
        (c,) = [st.get(x) for x in summ["contents"]]
        self.assertIn("range bounds out of order", c.body["incomplete"])

    def test_names_keep_their_identity(self):
        # no plural stemming of model codes, and "+" is part of a name
        k = acquisition._name_key
        self.assertEqual(k("Cove DW2450WS"), "cove dw2450ws")
        self.assertNotEqual(k("Oransi Mod+"), k("Oransi Mod"))
        self.assertEqual(k("Heated rinse + fan"), "heated rinse fan")

    def test_header_flags_decide_header_rows(self):
        # an unread body row under an empty flagged header row is not a column header
        t = [cell(0, 0, ""), cell(0, 1, ""), cell(1, 0, "Size"), cell(1, 1, "1 x 2 x 3 in"),
             cell(2, 0, "Weight"), cell(2, 1, "5 kg")]
        t[0]["header"] = t[1]["header"] = True
        st, summ = store_with(doc([t], names=PRODUCT_NAME))
        (c,) = [st.get(x) for x in summ["contents"] if st.get(st.get(x).body["interprets"]).body["row"] == 2]
        self.assertEqual(list(st.get(c.body["interprets"]).body["column_headers"]), [])
        self.assertNotIn("incomplete", c.body)

    def test_a_value_in_a_header_is_never_absorbed(self):
        # a variant column ("500GB") must not let the value become the subject's
        t = [cell(0, 0, "Product"), cell(0, 1, "500GB"), cell(1, 0, "Power"), cell(1, 1, "5 W")]
        t[0]["header"] = t[1]["header"] = True
        st, summ = store_with(doc([t], names=PRODUCT_NAME))
        (c,) = [st.get(x) for x in summ["contents"]]
        self.assertIn("incomplete", c.body)

    def test_list_paired_with_named_settings(self):
        st, summ = store_with(doc([[cell(0, 0, "Noise level (low – high):"), cell(0, 1, "40 – 60 dBA")]], names=PRODUCT_NAME))
        got = {(c.body["lo"], c.body["conditions"][S]) for c in complete(st, summ)}
        self.assertEqual(got, {(40.0, "low"), (60.0, "high")})

    def test_method_section_is_a_ground(self):
        d = doc([SETTINGS], headings=[{"index": 0, "level": 2, "text": "How we test"}],
                blocks=[{"index": 0, "sectionPath": [0], "text": "Measured with a meter."}])
        d["tables"][0]["sectionPath"] = [0]
        st, summ = store_with(d)
        self.assertEqual(len(summ["methods"]), 1)
        self.assertTrue(all(summ["methods"][0] in st.get(f"ST:{c.id}").body["grounds"] for c in complete(st, summ)))


class Rules(unittest.TestCase):
    def setUp(self):
        self.st, _ = store_with(doc([SETTINGS, PRODUCTS]))
        self.a, self.b = ent(self.st, "alpha one"), ent(self.st, "beta two x 7")

    def test_limit_needs_the_stated_condition(self):
        r = ask(self.st, "q1", {"x": self.a}, {"role": "x"}, {S: "setting 2", D: [1, 1, "m"]},
                {"kind": "Q:sound_level", "op": "<=", "bound": 45, "unit": "dB"})
        self.assertEqual(r.verdict, "applies")
        r = ask(self.st, "q2", {"x": self.a}, {"role": "x"}, {},
                {"kind": "Q:sound_level", "op": "<=", "bound": 45, "unit": "dB"})
        self.assertEqual(r.verdict, "undetermined")  # a value stated under conditions is not the unconditioned value

    def test_level_reference_must_fit(self):
        r = ask(self.st, "q3", {"x": self.a}, {"role": "x"}, {S: "setting 2", D: [1, 1, "m"]},
                {"kind": "Q:sound_level", "op": "<=", "bound": 45, "unit": "dBC"})
        self.assertEqual(r.verdict, "undetermined")

    def test_comparison_only_under_the_same_conditions(self):
        r = ask(self.st, "q4", {"x": self.a, "y": self.b}, {"role": "x", "compare": ["x", "y"],
                                                            "kind": "Q:electric_power"}, {S: "top speed"})
        self.assertEqual(r.value, "less")
        r = ask(self.st, "q5", {"x": self.a, "y": self.b}, {"role": "x", "compare": ["x", "y"],
                                                            "kind": "Q:electric_power"}, {S: "setting 1"})
        self.assertIsNone(r.value)

    def test_derived_quantity_from_acquired_content_and_requirement_is_not_a_ground(self):
        # the model binds its variables to the role "bearer" (MS1 models name their roles)
        r = ask(self.st, "q6", {"bearer": self.b}, {"role": "bearer"}, {S: "top speed"},
                {"kind": "Q:energy", "op": "<=", "bound": 300, "unit": "Wh"},
                givens=[("bearer", "Q:duration", 8, 8, "h")])
        self.assertEqual((r.verdict, r.services), ("applies", ["rules", "model"]))
        self.assertEqual(r.standing, "conditional on assumptions")
        self.assertNotIn("stated requirement", contract.premise_bases(self.st, r.grounds))

    def test_alternative_readings_must_agree(self):
        st, _ = store_with(doc([[cell(0, 0, "Battery capacity:"), cell(0, 1, "5.200 mAh")]], names=PRODUCT_NAME))
        x = ent(st, "alpha one")
        r = ask(st, "q7", {"x": x}, {"role": "x"}, {}, {"kind": "Q:electric_charge", "op": ">=", "bound": 5000, "unit": "mAh"})
        self.assertEqual(r.verdict, "undetermined")
        self.assertTrue(any("depends on the reading" in s for s in r.reasons))
        r = ask(st, "q8", {"x": x}, {"role": "x"}, {}, {"kind": "Q:electric_charge", "op": ">=", "bound": 1, "unit": "mAh"})
        self.assertEqual(r.verdict, "applies")  # every reading meets this bound

    def test_extent_end_must_match(self):
        st, _ = store_with(doc([[cell(0, 0, "Maximum power:"), cell(0, 1, "50 W")]], names=PRODUCT_NAME))
        x = ent(st, "alpha one")
        r = ask(st, "q9", {"x": x}, {"role": "x"}, {}, {"kind": "Q:electric_power", "op": "<=", "bound": 60, "unit": "W"})
        self.assertEqual(r.verdict, "undetermined")
        r = ask(st, "q10", {"x": x}, {"role": "x"}, {},
                {"kind": "Q:electric_power", "op": "<=", "bound": 60, "unit": "W", "end": "upper"})
        self.assertEqual(r.verdict, "applies")


class Architecture(unittest.TestCase):
    def test_acquisition_never_depends_on_rule_model_or_contract_services(self):
        tree = ast.parse((HERE / "universe" / "acquisition.py").read_text())
        mods = {a.name for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names}
        mods |= {f"{n.module}.{a.name}" if n.module else a.name for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)
                 for a in n.names}
        self.assertFalse({m for m in mods if re.search(r"\b(rules|model|contract)\b", m)}, mods)

    def test_acquisition_writes_no_verdict(self):
        st, summ = store_with(doc([SETTINGS, PRODUCTS]))
        forms = {st.get(c).body.get("form") for c in summ["contents"]}
        self.assertLessEqual(forms, {"quantity"})
        acq = [c for c in st.of("content") if c.provenance.get("source") == "acquisition service"]
        self.assertLessEqual({c.body.get("form") for c in acq}, {"quantity", "attribution"})

    def test_no_domain_vocabulary_in_code(self):
        """Literals of acquisition, standing and the rule functions I-1 added (docstrings excluded) name no term of the
        universe's knowledge: every word acquisition reads with comes from knowledge items."""
        import json
        gen = json.loads((HERE / "knowledge" / "general.json").read_text())
        vocab = {t for i in gen["items"] for t in list(i.get("terms", [])) + list(i.get("named", [])) if len(t) >= 4}
        i1_rules = {"applicable", "_interval", "_tolerance", "_reference_ok", "_verdict", "usable", "_decide_over",
                    "classify", "compare"}

        def literals(tree, only=None):
            docs = {id(n.body[0].value) for n in ast.walk(tree) if isinstance(n, (ast.Module, ast.FunctionDef))
                    and ast.get_docstring(n)}
            roots = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name in only] if only else [tree]
            return [n.value.lower() for r in roots for n in ast.walk(r)
                    if isinstance(n, ast.Constant) and isinstance(n.value, str) and id(n) not in docs]
        for f, only in (("acquisition.py", None), ("standing.py", None), ("rules.py", i1_rules)):
            lits = literals(ast.parse((HERE / "universe" / f).read_text()), only)
            hits = [(f, w) for w in vocab for lit in lits if re.search(rf"(?<!\w){re.escape(w)}(?!\w)", lit)]
            self.assertEqual(hits, [])

    def test_one_metrology(self):
        self.assertEqual(units.UNITS["degC"], (1.0, 273.15, units.dim(K=1)))
        self.assertEqual(units.UNITS["h"][0], 3600.0)
        code = [p.read_text() for p in (HERE / "universe").glob("*.py")]
        self.assertFalse(any("metrology.json" in c for c in code))  # services read units only through s1core.units


if __name__ == "__main__":
    unittest.main()
