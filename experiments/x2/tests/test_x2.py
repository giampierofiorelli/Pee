"""X2 tests, tier T1 (constructed fixtures; mechanics only). Fixture and adapter checks copied from X1.

* Adapter fidelity (PREREGISTRATION.md section 4, criterion S4): verbatim transfer, quarantine of Crawler's
  interpretations, no domain vocabulary in the adapter.
* Architecture (S4): no domain vocabulary in B's mechanism code; the quarantined block is never read.
* Behaviour of B on constructed records: the semantic distinctions B must keep (bounds, conditions, components,
  variants, scale references, unlabelled axes, lists, disagreement), and the store discipline (records attributed,
  verdicts proposed with grounds, the requirement never an epistemic ground).

Set X1_SNAPSHOT (a snapshot copy, read-only) to a copy of a Crawler snapshot to also run the fidelity check on real data (read-only).
"""
import ast
import json
import os
import pathlib
import re
import sqlite3
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(HERE), str(HERE / "adapter")]

import export_crawler as A  # noqa: E402
from pee_x2 import service as S  # noqa: E402
from pee_x2.knowledge import Knowledge  # noqa: E402

SCHEMA = {
    "declarations": A.DECLARATION_RECORD + A.DECLARATION_INTERPRETATION,
    "products": A.PRODUCT_RECORD + A.PRODUCT_INTERPRETATION,
    "variants": A.VARIANT_RECORD,
    "revisions": A.REVISION_RECORD,
    "sources": A.SOURCE_RECORD + A.SOURCE_INTERPRETATION,
}


def make_db(path, decls, variants=()):
    con = sqlite3.connect(path)
    for t, cols in SCHEMA.items():
        con.execute(f"CREATE TABLE {t} ({', '.join(cols)})")
    con.execute("INSERT INTO sources (source_id, host, retention, created_at, source_type, source_type_basis) "
                "VALUES ('s1', 'example.org', 'r', 't', 'unknown', 'none')")
    con.execute("INSERT INTO revisions (revision_id, source_id, url, sha256, bytes, http_status, fetched_at, "
                "extractor_version, retention, state) VALUES ('r1', 's1', 'https://example.org/p', 'h', 1, 200, "
                "'2026-01-01', 'v', 'r', 'active')")
    con.execute("INSERT INTO products (product_id, name, category_hypotheses_json) VALUES ('p1', 'Thing', "
                "'[\"things\"]')")
    for v in variants:
        con.execute("INSERT INTO variants (variant_id, product_id, name) VALUES (?, ?, ?)", v)
    for n, d in enumerate(decls):
        row = {"declaration_id": f"d{n}", "revision_id": "r1", "product_id": "p1", "variant_id": None,
               "value_json": '{"kind":"text"}', "property_key": "k", "evidence_role": "x"}
        row.update(d)
        cols = list(row)
        con.execute(f"INSERT INTO declarations ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                    [row[c] for c in cols])
    con.commit()
    con.close()


class Fixture:
    def __init__(self, decls, variants=(), mode="seg"):
        self.dir = tempfile.TemporaryDirectory()
        db = os.path.join(self.dir.name, "s.sqlite")
        make_db(db, decls, variants=variants)
        self.export = os.path.join(self.dir.name, "e.json")
        with open(self.export, "w") as f:
            json.dump(A.export(db), f)
        self.records = S.Records(self.export)
        self.arm = S.ArmB(self.records, mode=mode)

    def limit(self, prop, op, value, unit, conditions=None, words="thing"):
        return self.arm.answer({"id": "q", "type": "limit", "category_words": words, "product_id": "p1",
                                "property": prop, "comparator": op, "value": value, "unit": unit,
                                "conditions": conditions})


class AdapterFidelity(unittest.TestCase):
    def test_verbatim_and_quarantined(self):
        with tempfile.TemporaryDirectory() as d:
            db = os.path.join(d, "s.sqlite")
            make_db(db, [{"property": "Weight (kg)", "raw_value": " 1,5 approx. ", "section": "Specs"}])
            out = A.export(db)
            rec = out["declarations"][0]
            self.assertEqual(rec["raw_value"], " 1,5 approx. ")  # nothing trimmed, converted or parsed
            self.assertEqual(rec["property"], "Weight (kg)")
            self.assertEqual(set(rec["crawler_interpretation"]), set(A.DECLARATION_INTERPRETATION))
            self.assertNotIn("value_json", rec)
            self.assertIn("category_hypotheses_json", out["products"][0]["crawler_interpretation"])
            self.assertNotIn("category_hypotheses_json", out["products"][0])

    @unittest.skipUnless(os.environ.get("X1_SNAPSHOT"), "set X1_SNAPSHOT to a snapshot copy")
    def test_real_snapshot_fidelity(self):
        path = os.environ["X1_SNAPSHOT"]
        out = A.export(path)
        con = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        cols = A.DECLARATION_RECORD + A.DECLARATION_INTERPRETATION
        rows = {r[0]: dict(zip(cols, r)) for r in con.execute(f"SELECT {', '.join(cols)} FROM declarations")}
        self.assertEqual(len(rows), len(out["declarations"]))
        for rec in out["declarations"]:
            src = rows[rec["declaration_id"]]
            for c in A.DECLARATION_RECORD:
                self.assertEqual(rec[c], src[c])
            for c in A.DECLARATION_INTERPRETATION:
                self.assertEqual(rec["crawler_interpretation"][c], src[c])


SCHEMA_NAMES = {c for cols in SCHEMA.values() for c in cols} | {"source_id"}
# Structural names, not meanings: the kinds of Crawler's value segmentation (its Value245 schema, prereg section 1)
# and the names of Pee's value forms. 'range' also became a lexical term in X2 (a distance concept), which is why it
# is listed explicitly.
STRUCTURAL_NAMES = {"quantity", "number", "range", "dimensions", "options", "price", "text"}


def _string_literals(path):
    tree = ast.parse(pathlib.Path(path).read_text())
    docs = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.ClassDef)) and ast.get_docstring(node):
            docs.add(id(node.body[0].value))
    return [n.value for n in ast.walk(tree) if isinstance(n, ast.Constant) and isinstance(n.value, str)
            and id(n) not in docs]


class Architecture(unittest.TestCase):
    def vocabulary(self):
        k = Knowledge()
        words = set()
        for c in k.concepts_for(None).values():
            words |= {t for t in c["terms"] if len(t) >= 4}
        for cat in k.categories.values():
            words |= {t for t in cat["category"]["terms"] if len(t) >= 4}
            for c in cat["concepts"]:
                words |= {t for t in c["terms"] if len(t) >= 4}
        words |= {s for s, _ in k.surfaces if len(s) >= 4 and s.isalpha()}
        return words

    def check_no_domain_words(self, files):
        vocab = self.vocabulary()
        hits = []
        for f in files:
            for lit in _string_literals(f):
                if lit in SCHEMA_NAMES or lit in STRUCTURAL_NAMES:
                    continue  # Crawler's own column names are schema, not meaning
                for w in vocab:
                    if re.search(r"(?<![\w])" + re.escape(w) + r"(?![\w])", lit.lower()):
                        hits.append((pathlib.Path(f).name, w, lit[:40]))
        self.assertEqual(hits, [])

    def test_adapter_has_no_domain_vocabulary(self):
        self.check_no_domain_words([HERE / "adapter" / "export_crawler.py"])

    def test_mechanism_has_no_domain_vocabulary(self):
        self.check_no_domain_words([HERE / "pee_x2" / f for f in ("knowledge.py", "reading.py", "service.py")]
                                   + [HERE / "run_b.py", HERE / "score.py"])

    def test_quarantine_is_reached_only_through_segmentation_of(self):
        hits = sorted(p.name for p in (HERE / "pee_x2").glob("*.py") if "crawler_interpretation" in p.read_text())
        self.assertEqual(hits, ["service.py"])
        src = (HERE / "pee_x2" / "service.py").read_text()
        self.assertEqual(src.count("crawler_interpretation"), 1)  # the QUARANTINED constant only
        tree = ast.parse(src)
        users = {}
        for fn in ast.walk(tree):
            if isinstance(fn, ast.FunctionDef):
                for n in ast.walk(fn):
                    if isinstance(n, ast.Name) and n.id == "QUARANTINED":
                        users.setdefault(fn.name, 0)
                        users[fn.name] += 1
                    if isinstance(n, ast.Constant) and n.value == "value_json":
                        users.setdefault("value_json@" + fn.name, 0)
        self.assertEqual(set(users), {"strip_quarantine", "segmentation_of", "value_json@segmentation_of"})

    def test_interpretive_fields_are_never_read(self):
        forbidden = {"bound", "approximate", "qualifier", "alternative", "property_key", "evidence_role", "method",
                     "flags_json", "review_json", "verified_purposes_json", "ranking_authorized",
                     "independent_test_evidence", "category_hypotheses_json", "identity_review_json"}
        self.assertFalse(forbidden & set(S.SEGMENTATION_FIELDS))
        for f in ("service.py", "reading.py", "knowledge.py"):
            lits = set(_string_literals(HERE / "pee_x2" / f))
            self.assertFalse(forbidden & lits, f)
        row = {"crawler_interpretation": {"value_json": json.dumps(
            {"kind": "quantity", "number": 5, "unit": "kg", "bound": "max", "approximate": True,
             "qualifier": "x", "alternative": {"number": 9}}), "property_key": "k"}}
        self.assertEqual(S.segmentation_of(row), {"kind": "quantity", "number": 5, "unit": "kg"})

    def test_records_never_carry_crawler_interpretations(self):
        fx = Fixture([{"property": "Weight", "raw_value": "2 kg"}])
        for decls in fx.arm.rec.by_product.values():
            for d in decls:
                self.assertNotIn("crawler_interpretation", d)
        self.assertTrue(all("crawler_interpretation" not in p for p in fx.arm.rec.products.values()))


def seg(**v):
    return json.dumps(v)


class P1ClosedReading(unittest.TestCase):
    def test_residual_word_narrows_the_quantity(self):
        fx = Fixture([{"property": "Weight", "raw_value": "2 kg carton"}])
        self.assertEqual(fx.limit("weight", "at_most", 3, "kg")["verdict"], "not_determinable")
        self.assertEqual(fx.limit("carton weight", "at_most", 3, "kg")["verdict"], "meets")

    def test_unexplained_symbol_blocks(self):
        fx = Fixture([{"property": "Weight", "raw_value": "2 kg §"}])
        self.assertEqual(fx.limit("weight", "at_most", 3, "kg")["verdict"], "not_determinable")

    def test_tolerance_is_an_interval(self):
        fx = Fixture([{"property": "Width", "raw_value": "10 ± 2 mm"}])
        self.assertEqual(fx.limit("width", "at_most", 13, "mm")["verdict"], "meets")
        self.assertEqual(fx.limit("width", "at_most", 11, "mm")["verdict"], "not_determinable")
        self.assertEqual(fx.limit("width", "at_least", 13, "mm")["verdict"], "fails")


class P2IntervalEnds(unittest.TestCase):
    def test_named_end_is_checked(self):
        fx = Fixture([{"property": "Speed", "raw_value": "300 - 600 rpm"}])
        self.assertEqual(fx.limit("speed", "at_least", 400, "rpm")["verdict"], "not_determinable")
        self.assertEqual(fx.limit("upper speed", "at_least", 500, "rpm")["verdict"], "meets")
        self.assertEqual(fx.limit("lowest speed", "at_least", 400, "rpm")["verdict"], "fails")
        a = fx.limit("highest speed", "at_most", 700, "rpm")
        self.assertEqual((a["verdict"], a["extent"]), ("meets", "upper"))

    def test_whole_range_on_one_side_decides(self):
        fx = Fixture([{"property": "Speed", "raw_value": "300 - 600 rpm"}])
        self.assertEqual(fx.limit("speed", "at_most", 700, "rpm")["verdict"], "meets")


class P3AlternativeReadings(unittest.TestCase):
    def test_unlabelled_axes_conclude_only_when_every_reading_agrees(self):
        fx = Fixture([{"property": "Dimensions", "raw_value": "40 x 22 x 19 cm"}])
        a = fx.limit("width", "at_most", 50, "cm")
        self.assertEqual(a["verdict"], "meets")
        self.assertIn("independent of the axis reading", a["standing"])
        self.assertEqual(fx.limit("width", "at_most", 30, "cm")["verdict"], "not_determinable")
        fx2 = Fixture([{"property": "Dimensions", "raw_value": "40 x 22 cm"}])
        self.assertEqual(fx2.limit("width", "at_most", 50, "cm")["verdict"], "not_determinable")

    def test_verified_segmentation_adds_a_reading_pee_lacks(self):
        d = {"property": "Dimensions", "raw_value": "H 30cm x W 20cm x D 25cm",
             "value_json": seg(kind="dimensions", numbers=[30, 20, 25], unit="cm", axes=["H", "W", "D"])}
        self.assertEqual(Fixture([d], mode="struct").limit("depth", "at_most", 26, "cm")["verdict"],
                         "not_determinable")
        a = Fixture([d], mode="seg").limit("depth", "at_most", 26, "cm")
        self.assertEqual(a["verdict"], "meets")
        self.assertEqual(a["segmentation_sources"], ["crawler"])
        self.assertIn("hypothetical", a["standing"])  # it rests on Crawler's segmentation hypothesis

    def test_unverifiable_segmentation_is_ignored(self):
        for v in (seg(kind="quantity", number=7, unit="kg"),          # 7 does not occur in the text
                  seg(kind="quantity", number=2, unit="lb"),          # lb occurs neither in value nor label
                  seg(kind="quantity", number=2, unit="zork")):       # a symbol Pee's metrology does not know
            fx = Fixture([{"property": "Weight", "raw_value": "2 kg", "value_json": v}])
            a = fx.limit("weight", "at_most", 3, "kg")
            self.assertEqual((a["verdict"], a["segmentation_sources"]), ("meets", ["pee"]))

    def test_disagreeing_segmentations_conclude_only_when_both_do(self):
        d = {"property": "Weight", "raw_value": "5 kg (11 lb)", "value_json": seg(kind="quantity", number=11,
                                                                                 unit="lb")}
        fx = Fixture([d])
        self.assertEqual(fx.limit("weight", "at_most", 6, "kg")["verdict"], "meets")
        self.assertEqual(fx.limit("weight", "at_most", 4.995, "kg")["reason"], "segmentations_disagree")

    def test_crawler_bound_is_never_used(self):
        d = {"property": "Power", "raw_value": "1200 W",
             "value_json": json.dumps({"kind": "quantity", "number": 1200, "unit": "W", "bound": "max"})}
        a = Fixture([d]).limit("power", "at_least", 1100, "W")
        self.assertEqual(a["verdict"], "meets")  # an upper bound would have left this undetermined
        self.assertEqual(a["segmentation_sources"], ["crawler", "pee"])


class P4Recognition(unittest.TestCase):
    def test_category_self_reference_is_neutral(self):
        fx = Fixture([{"property": "Weight (Thing)", "raw_value": "2 kg"}])
        self.assertEqual(fx.limit("weight of the thing itself", "at_most", 3, "kg")["verdict"], "meets")
        self.assertEqual(fx.limit("weight", "at_most", 3, "kg", words="gadget")["verdict"], "not_determinable")

    def test_unnamed_dimensioned_value_is_the_generic_quantity_of_the_named_thing(self):
        fx = Fixture([{"property": "Tank", "raw_value": "2 L"}])
        self.assertEqual(fx.limit("tank capacity", "at_least", 1.5, "L")["verdict"], "meets")
        self.assertEqual(fx.limit("bin capacity", "at_least", 1.5, "L")["verdict"], "not_determinable")

    def test_term_across_a_stopword_and_unit_named_in_label(self):
        fx = Fixture([{"property": "Refresh the rate", "raw_value": "120 Hz"}, {"property": "Bar Pressure",
                                                                               "raw_value": "20"}])
        self.assertEqual(fx.limit("refresh rate", "at_least", 100, "Hz")["verdict"], "meets")
        self.assertEqual(fx.limit("pressure", "at_least", 15, "bar")["verdict"], "meets")

    def test_number_multiplier(self):
        fx = Fixture([{"property": "Switch lifespan", "raw_value": "50 million keystrokes"}])
        self.assertEqual(fx.limit("switch lifespan", "at_least", 20, "million keystrokes")["verdict"], "meets")
        self.assertEqual(fx.limit("switch lifespan", "at_least", 60, "million keystrokes")["verdict"], "fails")


class Modes(unittest.TestCase):
    def test_flat_mode_drops_record_context(self):
        d = [{"property": "Weight", "raw_value": "5 kg", "component": "Box"}]
        self.assertEqual(Fixture(d, mode="struct").limit("weight", "at_most", 10, "kg")["verdict"],
                         "not_determinable")
        self.assertEqual(Fixture(d, mode="flat").limit("weight", "at_most", 10, "kg")["verdict"], "meets")

    def test_section_heading_may_name_the_quantity_but_not_narrow_it(self):
        d = [{"property": "Max", "raw_value": "40 dB(A)", "section": "Noise level"}]
        self.assertEqual(Fixture(d, mode="struct").limit("noise", "at_most", 45, "dB(A)")["verdict"], "meets")
        self.assertEqual(Fixture(d, mode="flat").limit("noise", "at_most", 45, "dB(A)")["verdict"],
                         "not_determinable")


class Regression(unittest.TestCase):
    """X1 behaviours kept."""

    def test_x1_distinctions(self):
        self.assertEqual(Fixture([{"property": "Power", "raw_value": "up to 1200 W"}])
                         .limit("power", "at_least", 1000, "W")["verdict"], "not_determinable")
        self.assertEqual(Fixture([{"property": "Weight", "raw_value": "2.4"}])
                         .limit("weight", "at_most", 3, "kg")["verdict"], "not_determinable")
        self.assertEqual(Fixture([{"property": "Noise level", "raw_value": "40 dB"}])
                         .limit("noise", "at_most", 45, "dB(A)")["verdict"], "not_determinable")
        fx = Fixture([{"property": "Weight", "raw_value": "1 kg", "variant_id": "v1"}],
                     variants=[("v1", "p1", "Large")])
        self.assertEqual(fx.limit("weight", "at_most", 2, "kg")["reason"], "variant_only")
        fx2 = Fixture([{"property": "Weight", "raw_value": "1 kg"}, {"property": "Weight", "raw_value": "3 kg"}])
        self.assertEqual(fx2.limit("weight", "at_most", 2, "kg")["reason"], "sources_disagree")


class StoreDiscipline(unittest.TestCase):
    def test_records_attributed_verdict_grounded_requirement_not_a_ground(self):
        fx = Fixture([{"property": "Weight", "raw_value": "2 kg"}])
        q = {"id": "q", "type": "limit", "category_words": "thing", "product_id": "p1", "property": "weight",
             "comparator": "at_most", "value": 3, "unit": "kg", "conditions": None}
        st, inq = fx.arm._store(q, ["p1"])
        rec = st.get("d0")
        self.assertEqual((rec.kind, rec.provenance["basis"], rec.provenance["holder"]),
                         ("record", "document statement", "example.org"))
        a = fx.arm.answer(q)
        self.assertEqual(a["verdict"], "meets")
        self.assertEqual(a["grounds"], ["d0"])
        self.assertIn("unverified", a["standing"])


if __name__ == "__main__":
    unittest.main()
