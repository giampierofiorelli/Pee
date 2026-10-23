"""O-2 tests (T1, constructed fixtures: mechanics only). The adapter mapping of REPORT.md section 2.2, the hybrid rule
of section 2.3, no category vocabulary, and one complete path from translator statements to universe items."""
import ast
import json
import pathlib
import re
import sys
import unittest

O2 = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(O2)]
import o2  # noqa: E402


def stmt(typ, subj, obj, line=1, **kw):
    s = {"type": typ, "subject": {"text": subj} if subj else None, "object": {"text": obj} if obj else None,
         "parts": [], "status": [], "refs": [], "polarity": "positive", "hedge": None, "selfCheck": [],
         "quote": f"{subj} {obj}", "provenance": {"line": line, "headings": ["H"], "block": "paragraph"}}
    s.update(kw)
    return s


class Adapter(unittest.TestCase):
    def units(self, *sts, lines=None):
        return o2.adapt(list(sts), lines or ["x"] * 10)

    def test_negation_types_and_double_negation(self):
        u, _ = self.units(stmt("is_not", "a", "b"), stmt("is_not", "a", "b", polarity="negative"),
                          stmt("depends_on", "a", "b", polarity="negative"))
        self.assertEqual([x["polarity"] for x in u], ["negated", "affirmed", "negated"])
        self.assertEqual(u[0]["relation"], "is_a")

    def test_not_sufficient_is_negated_establishes(self):
        u, _ = self.units(stmt("not_sufficient", "a test", "a claim"))
        self.assertEqual((u[0]["relation"], u[0]["polarity"], u[0]["content_kind"]), ("establishes", "negated", "method"))

    def test_measured_by_swaps_and_composed_of_splits(self):
        u, _ = self.units(stmt("measured_by", "x", "method m"),
                          stmt("composed_of", "whole", "p1, p2", parts=[{"text": "p1"}, {"text": "p2"}]))
        self.assertEqual((u[0]["subject"], u[0]["relation"], u[0]["object"]), ("method m", "measures", "x"))
        self.assertEqual([(x["subject"], x["object"]) for x in u[1:]], [("p1", "whole"), ("p2", "whole")])

    def test_status_never_upgraded_most_cautious_wins(self):
        u, _ = self.units(stmt("requires", "a", "b", status=["normative_rule", "proposed_method"]),
                          stmt("requires", "a", "b", status=["source_observation"]), stmt("requires", "a", "b"))
        self.assertEqual([(x["document_attitude"], x["evidence_kind"]) for x in u],
                         [("proposed", "proposal"), ("reported", "none_stated"), ("asserted", "synthesis")])

    def test_hedge_refs_conditions_self_check(self):
        u, acc = self.units(stmt("increases", "a", "b", hedge="may", refs=["R01"],
                                 object={"text": "b", "axes": [{"axis": "mode", "value": "eco"}]}),
                            stmt("increases", "a", "b", selfCheck=["negation_lost"]))
        self.assertEqual((u[0]["modality"], u[0]["attributed_to"], u[0]["conditions"]),
                         ("possible", ["R01"], [{"concept": "mode", "value": "eco"}]))
        self.assertEqual((acc["mapped"], acc["refused_self_check"], len(u)), (1, 1, 1))

    def test_block_range(self):
        lines = ["para one", "continues", "", "- item", "- item two", "|a|b|"]
        self.assertEqual(o2.block_range(lines, 1), (1, 2))
        self.assertEqual(o2.block_range(lines, 4), (4, 4))
        self.assertEqual(o2.block_range(lines, 6), (6, 6))


class Hybrid(unittest.TestCase):
    def setUp(self):
        self.a = {"id": "U1", "type": "proposition", "subject": "air flow", "object": "noise level",
                  "relation": "increases", "polarity": "affirmed", "modality": "actual", "conditions": [],
                  "document_attitude": "asserted", "evidence_kind": "synthesis", "attributed_to": ["R01"],
                  "record": {"locator": "lines 3-4 sentence 1"}}
        self.t, _ = o2.adapt([stmt("increases", "air flow", "noise level", line=3, status=["proposed_method"])],
                             ["x"] * 10)

    def test_choice_applies_only_where_t_holds(self):
        ch = {"groups": {"attitude": "T", "attribution": "T"}, "include_unaligned_T": False}
        out, info = o2.hybrid([self.a], self.t, ch)
        self.assertEqual(info["aligned"], 1)
        self.assertEqual(out[0]["document_attitude"], "proposed")  # T holds a status marker
        self.assertEqual(out[0]["attributed_to"], ["R01"])  # T has no reference: A's is kept

    def test_unaligned_t_only_when_admitted(self):
        far, _ = o2.adapt([stmt("requires", "x", "y", line=9)], ["x"] * 10)
        out, info = o2.hybrid([self.a], far, {"groups": {}, "include_unaligned_T": True})
        self.assertEqual((len(out), info["unaligned_T_added"]), (2, 1))
        out, _ = o2.hybrid([self.a], far, {"groups": {}, "include_unaligned_T": False})
        self.assertEqual(len(out), 1)


class Path(unittest.TestCase):
    def test_t_units_become_universe_items(self):
        md = "# Topic\n\nAir flow increases noise level.\n"
        tmp = pathlib.Path(self.id().replace(".", "_") + ".md")
        bridge = tmp.with_suffix(".json")
        try:
            tmp.write_text(md)
            bridge.write_text(json.dumps({"statements": [stmt("increases", "air flow", "noise level", line=3)]}))
            st, units, info = o2.build("T", tmp, bridge)
            rows = o2.export_store(st, [3])
            self.assertEqual((info["units"], info["represented"]), (1, 1))
            self.assertEqual(len(rows), 1)
            self.assertIn("increases", rows[0]["rendered"])
        finally:
            tmp.unlink(missing_ok=True)
            bridge.unlink(missing_ok=True)


class Architecture(unittest.TestCase):
    def test_no_category_vocabulary_in_adapter_or_hybrid(self):
        uni = O2.parent / "universe"
        items = [i for f in ("general.json", "legacy-i2-category.json")
                 for i in json.loads((uni / "knowledge" / f).read_text())["items"]]
        vocab = {t for i in items if i.get("category") != "evidence class"
                 for t in list(i.get("terms", [])) + list(i.get("named", [])) if len(t) >= 4}
        vocab |= {"speaker", "loudspeaker", "woofer", "tweeter", "soundbar", "subwoofer", "bluetooth", "audio",
                  "humid", "purif", "dehumid", "cadr"}
        tree = ast.parse((O2 / "o2.py").read_text())
        docs = {id(n.body[0].value) for n in ast.walk(tree)
                if isinstance(n, (ast.Module, ast.FunctionDef, ast.ClassDef)) and ast.get_docstring(n)}
        lits = [n.value.lower() for n in ast.walk(tree) if isinstance(n, ast.Constant) and isinstance(n.value, str)
                and id(n) not in docs and not n.value.startswith("document:")]
        hits = [w for w in vocab for lit in lits if re.search(rf"(?<!\w){re.escape(w)}", lit)]
        self.assertEqual(hits, [])


if __name__ == "__main__":
    unittest.main()
