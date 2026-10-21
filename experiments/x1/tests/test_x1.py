"""X1 tests, tier T1 (constructed fixtures; mechanics only).

* Adapter fidelity (PREREGISTRATION.md section 4, criterion S4): verbatim transfer, quarantine of Crawler's
  interpretations, no domain vocabulary in the adapter.
* Architecture (S4): no domain vocabulary in B's mechanism code; the quarantined block is never read.
* Behaviour of B on constructed records: the semantic distinctions B must keep (bounds, conditions, components,
  variants, scale references, unlabelled axes, lists, disagreement), and the store discipline (records attributed,
  verdicts proposed with grounds, the requirement never an epistemic ground).

Set X1_SNAPSHOT to a copy of a Crawler snapshot to also run the fidelity check on real data (read-only).
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
from pee_x1 import service as S  # noqa: E402
from pee_x1.knowledge import Knowledge  # noqa: E402

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
    def __init__(self, decls, variants=()):
        self.dir = tempfile.TemporaryDirectory()
        db = os.path.join(self.dir.name, "s.sqlite")
        make_db(db, decls, variants=variants)
        self.export = os.path.join(self.dir.name, "e.json")
        with open(self.export, "w") as f:
            json.dump(A.export(db), f)
        self.arm = S.ArmB(S.Records(self.export))

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
                if lit in SCHEMA_NAMES:
                    continue  # Crawler's own column names are schema, not meaning
                for w in vocab:
                    if re.search(r"(?<![\w])" + re.escape(w) + r"(?![\w])", lit.lower()):
                        hits.append((pathlib.Path(f).name, w, lit[:40]))
        self.assertEqual(hits, [])

    def test_adapter_has_no_domain_vocabulary(self):
        self.check_no_domain_words([HERE / "adapter" / "export_crawler.py"])

    def test_mechanism_has_no_domain_vocabulary(self):
        self.check_no_domain_words([HERE / "pee_x1" / f for f in ("knowledge.py", "reading.py", "service.py")])

    def test_quarantined_block_is_only_stripped(self):
        hits = sorted(p.name for p in (HERE / "pee_x1").glob("*.py") if "crawler_interpretation" in p.read_text())
        self.assertEqual(hits, ["service.py"])
        src = (HERE / "pee_x1" / "service.py").read_text()
        self.assertEqual(src.count("crawler_interpretation"), 1)  # the QUARANTINED constant only
        self.assertEqual(src.count("QUARANTINED"), 2)              # its definition and its single use: removal

    def test_records_never_carry_crawler_interpretations(self):
        fx = Fixture([{"property": "Weight", "raw_value": "2 kg"}])
        for decls in fx.arm.rec.by_product.values():
            for d in decls:
                self.assertNotIn("crawler_interpretation", d)
        self.assertTrue(all("crawler_interpretation" not in p for p in fx.arm.rec.products.values()))


class Behaviour(unittest.TestCase):
    def test_plain_value_meets_and_fails_with_unit_conversion(self):
        fx = Fixture([{"property": "Weight", "raw_value": "2.4 kg"}])
        self.assertEqual(fx.limit("weight", "at_most", 2500, "g")["verdict"], "meets")
        self.assertEqual(fx.limit("weight", "less_than", 2.4, "kg")["verdict"], "fails")  # strict bound

    def test_absence_is_not_failure(self):
        fx = Fixture([{"property": "Weight", "raw_value": "2.4 kg"}])
        a = fx.limit("width", "at_most", 40, "cm")
        self.assertEqual((a["verdict"], a["reason"]), ("not_determinable", "not_declared"))

    def test_upper_bound_decides_only_when_decisive(self):
        fx = Fixture([{"property": "Power", "raw_value": "up to 1200 W"}])
        self.assertEqual(fx.limit("power", "at_most", 1500, "W")["verdict"], "meets")
        self.assertEqual(fx.limit("power", "at_least", 1500, "W")["verdict"], "fails")
        self.assertEqual(fx.limit("power", "at_least", 1000, "W")["verdict"], "not_determinable")

    def test_stated_conditions_must_match(self):
        fx = Fixture([{"property": "Flow at 20°C", "raw_value": "8 l/day"}])
        self.assertEqual(fx.limit("flow", "at_least", 7, "litres per day", "20 °C")["verdict"], "meets")
        self.assertEqual(fx.limit("flow", "at_least", 7, "litres per day", "30 °C")["verdict"], "not_determinable")
        self.assertEqual(fx.limit("flow", "at_least", 7, "litres per day")["verdict"], "meets")

    def test_component_value_is_not_the_products(self):
        fx = Fixture([{"property": "Box weight", "raw_value": "5 kg"}])
        self.assertEqual(fx.limit("weight", "at_most", 10, "kg")["verdict"], "not_determinable")
        self.assertEqual(fx.limit("box weight", "at_most", 10, "kg")["verdict"], "meets")

    def test_variant_value_is_not_the_products(self):
        fx = Fixture([{"property": "Weight", "raw_value": "1 kg", "variant_id": "v1"}],
                     variants=[("v1", "p1", "Large")])
        self.assertEqual(fx.limit("weight", "at_most", 2, "kg")["reason"], "variant_only")

    def test_level_references_are_not_mixed(self):
        fx = Fixture([{"property": "Noise level", "raw_value": "40 dB"}])
        self.assertEqual(fx.limit("noise", "at_most", 45, "dB(A)")["verdict"], "not_determinable")
        fx2 = Fixture([{"property": "Noise level", "raw_value": "40 dB(A)"}])
        self.assertEqual(fx2.limit("noise", "at_most", 45, "dB(A)")["verdict"], "meets")

    def test_unlabelled_axes_are_not_guessed(self):
        fx = Fixture([{"property": "Dimensions", "raw_value": "40 x 22 x 19 cm"}])
        self.assertEqual(fx.limit("width", "at_most", 50, "cm")["verdict"], "not_determinable")
        fx2 = Fixture([{"property": "Dimensions (W x H x D)", "raw_value": "40 x 22 x 19 cm"}])
        self.assertEqual(fx2.limit("depth", "at_most", 20, "cm")["verdict"], "meets")

    def test_list_straddling_the_limit_and_disagreeing_sources(self):
        fx = Fixture([{"property": "Speed", "raw_value": "300 / 600 / 900 rpm"}])
        self.assertEqual(fx.limit("speed", "at_least", 500, "rpm")["verdict"], "not_determinable")
        self.assertEqual(fx.limit("speed", "at_least", 200, "rpm")["verdict"], "meets")
        fx2 = Fixture([{"property": "Weight", "raw_value": "1 kg"}, {"property": "Weight", "raw_value": "3 kg"}])
        self.assertEqual(fx2.limit("weight", "at_most", 2, "kg")["reason"], "sources_disagree")

    def test_missing_unit_is_never_assumed(self):
        fx = Fixture([{"property": "Weight", "raw_value": "2.4"}])
        self.assertEqual(fx.limit("weight", "at_most", 3, "kg")["verdict"], "not_determinable")

    def test_category_knowledge_is_used_only_for_its_category(self):
        fx = Fixture([{"property": "Pressure", "raw_value": "15 bar"}])
        with_cat = fx.limit("pump pressure", "at_least", 9, "bar", words="espresso machine")
        without = fx.limit("pump pressure", "at_least", 9, "bar", words="pressure washer")
        self.assertEqual(with_cat["verdict"], "meets")
        self.assertEqual(without["verdict"], "not_determinable")


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
