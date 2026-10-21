"""MS1 vertical-slice tests.

* ``Integrity*``: properties that do not depend on any scientific reading (store, history, contract, provenance,
  generality, preservation of s1core behaviour). Tier T1.
* ``Sealed*``: the MS0 cases, whose expected outcomes were committed before any MS1 code (`7800f0b`). Tier T1:
  chosen and annotated by the developer, so not author-independent.
"""
import json
import pathlib
import re
import sys
import types
import unittest

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(HERE), str(HERE.parent / "s1core")]

from universe import contract, loader, model, rules, store as S  # noqa: E402
from universe.contract import inquire  # noqa: E402
from universe.store import Item, Store, StoreError  # noqa: E402

MATERIAL = HERE / "material" / "ms1_material.json"
with open(MATERIAL) as _f:
    DATA = json.load(_f)
PROV = {"source": "test", "holder": "test", "basis": "illustrative"}


def fresh(skip=()):
    st = Store()
    loader.load_material(MATERIAL, st, skip=skip)
    return st


class IntegrityStore(unittest.TestCase):
    def test_provenance_and_registered_kind_required(self):
        st = Store()
        with self.assertRaises(StoreError):
            st.acquire(Item("x", "content", {}, {"source": "", "holder": "h", "basis": "illustrative"}))
        with self.assertRaises(StoreError):
            st.acquire(Item("x", "content", {}, {"source": "s", "holder": "h", "basis": "trust me"}))
        with self.assertRaises(StoreError):
            st.acquire(Item("x", "no_such_kind", {}, PROV))
        st.register_kind("no_such_kind", "test")
        st.acquire(Item("x", "no_such_kind", {}, PROV))

    def test_append_only_and_idempotent(self):
        st = Store()
        st.acquire(Item("x", "content", {"a": 1}, PROV))
        n = st.seq
        st.acquire(Item("x", "content", {"a": 1}, PROV))
        self.assertEqual(st.seq, n)
        with self.assertRaises(StoreError):
            st.acquire(Item("x", "content", {"a": 2}, PROV))

    def test_proposals_and_acquisitions_cannot_swap_bases(self):
        st = Store()
        with self.assertRaises(StoreError):
            st.propose(Item("p", "content", {}, PROV), "test")
        with self.assertRaises(StoreError):
            st.acquire(Item("q", "content", {}, {"source": "s", "holder": "h", "basis": "derived"}))

    def test_items_are_read_only(self):
        it = Item("x", "content", {"a": {"b": [1, 2]}}, PROV)
        with self.assertRaises(TypeError):
            it.body["a"]["b"] = 3
        st = fresh()
        with self.assertRaises(TypeError):
            st.get("M:first-order").body["forms"]["f"] = "k*t"

    def test_invalid_knowledge_refused_at_acquisition(self):
        st = Store()
        loader.load_material(MATERIAL, st)
        bad = json.loads(json.dumps([k for k in DATA["knowledge"] if k["id"] == "M:first-order"][0]))
        bad["id"], bad["body"]["forms"]["f"] = "M:bad", "exp(-k)"
        with self.assertRaises(Exception):
            st.acquire(Item(bad["id"], "model", bad["body"], bad["provenance"]), validate=loader._validate)


class IntegrityHistory(unittest.TestCase):
    def test_earlier_state_is_reproduced(self):
        st = fresh(skip={"K:I131-half-life"})
        before = st.seq
        k = [k for k in DATA["knowledge"] if k["id"] == "K:I131-half-life"][0]
        st.acquire(Item(k["id"], k["kind"], k["body"], k["provenance"]), validate=loader._validate)
        self.assertEqual(inquire(st, "I:D1").status, "SUPPORTED")
        past = st.at(before)
        self.assertFalse(past.has("K:I131-half-life"))
        self.assertEqual(inquire(past, "I:D1").status, "UNRESOLVED")
        self.assertTrue(st.has("K:I131-half-life"))  # the present is untouched by the replay


class IntegrityContract(unittest.TestCase):
    def setUp(self):
        self.st = fresh()
        self.answers = {c["id"]: inquire(self.st, f"I:{c['id']}") for c in DATA["cases"]}

    def test_every_proposal_has_standing_and_real_grounds(self):
        proposals = [e.item for e in self.st.events if e.type == "propose" and e.item.kind == "content"]
        self.assertTrue(proposals)
        for p in proposals:
            st_item = self.st.get(f"ST:{p.id}")
            self.assertEqual(st_item.body["attitude"], "proposed")
            self.assertTrue(st_item.body["label"])
            for g in st_item.body["grounds"]:
                self.assertTrue(self.st.has(g), (p.id, g))
        for ir in self.st.of("inference_record"):
            for g in ir.body["premises"]:
                self.assertTrue(self.st.has(g), (ir.id, g))

    def test_records_are_kept_apart_from_their_interpretations(self):
        for c in self.st.of("content"):
            if "interprets" in c.body:
                self.assertEqual(self.st.get(c.body["interprets"]).kind, "record")

    def test_numerical_and_non_numerical_results_feed_each_other(self):
        b1 = self.answers["B1"]
        cls = self.st.get([p for p in b1.proposals if self.st.get(p).body.get("form") == "classification"][0])
        grounds = self.st.get(f"ST:{cls.id}").body["grounds"]
        model_props = [g for g in grounds if self.st.has(f"ST:{g}") and self.st.get(g).body.get("form") == "quantity"]
        self.assertTrue(model_props, "classification must rest on a model proposal")
        inner = self.st.get(f"ST:{model_props[0]}").body["grounds"]
        self.assertTrue(any(self.st.has(f"ST:{g}") and self.st.get(g).body.get("inherited_from") for g in inner),
                        "the model proposal must rest on a rule proposal")

    def test_services_keep_no_private_state(self):
        for mod in (rules, model, contract, loader):
            for name, val in vars(mod).items():
                if isinstance(val, (dict, list, set)) and not name.isupper() and not name.startswith("__"):
                    self.fail(f"{mod.__name__}.{name} is module-level mutable state")

    def test_conclusion_standing_reflects_weakest_premise(self):
        self.assertEqual(self.answers["A1"].standing, "illustrative only")   # situation data are illustrative
        self.assertEqual(self.answers["B4"].standing, "no conclusion")


class IntegrityGenerality(unittest.TestCase):
    def test_mechanism_contains_no_example_vocabulary(self):
        words = ["caffeine", "ethanol", "botulinum", "n2o5", "iodine", "i-131", "radionuclide", "spore",
                 "half_life", "decimal_reduction_time", "12d", "made_of", "instance_of", "subkind_of", "rate_law"]
        for f in (HERE / "universe").glob("*.py"):
            if f.name == "loader.py":
                continue  # the importer names the s1core link types it re-expresses as knowledge
            text = f.read_text().lower()
            for w in words:
                self.assertIsNone(re.search(r"(?<![\w-])" + re.escape(w) + r"(?![\w-])", text), (f.name, w))


class IntegrityPreservation(unittest.TestCase):
    """Every s1core example query gives the same status and interval through the slice as through s1core."""

    def test_s1core_behaviour_preserved(self):
        from s1core import infer as s1
        from s1core.examples import build_kb, situations
        kb, sits = build_kb(), situations()
        queries = [(s, r, k) for s, r, k in [
            ("silt_20C", "particle", "speed"), ("silt_20C", "particle", "travel_time"),
            ("coarse_sand_20C", "particle", "speed"), ("fine_sand_20C", "particle", "speed"),
            ("silt_10C", "particle", "speed"), ("silt_no_temperature", "particle", "speed"),
            ("grain_sizing", "particle", "radius"), ("fog_droplet", "particle", "speed"),
            ("fog_droplet_no_pressure", "particle", "speed"), ("microfibre", "particle", "speed"),
            ("cs137_soil", "population", "remaining_fraction"), ("caffeine_adult", "population", "remaining_fraction"),
            ("caffeine_adult_unmeasured", "population", "remaining_fraction"),
            ("caffeine_neonate", "population", "remaining_fraction"),
            ("ethanol_saturated", "population", "remaining_fraction")]]
        st = Store()
        ids = loader.import_s1core(st, kb, sits, queries)
        for q in queries:
            d = s1.infer(kb, sits[q[0]], q[1], q[2])
            a = inquire(st, ids[q])
            self.assertEqual(d.status, a.status, q)
            if d.interval:
                self.assertAlmostEqual(d.interval.lo, a.interval[0], delta=1e-15 + 1e-9 * abs(d.interval.lo))
                self.assertAlmostEqual(d.interval.hi, a.interval[1], delta=1e-15 + 1e-9 * abs(d.interval.hi))


class SealedCases(unittest.TestCase):
    """Expected outcomes sealed in MS0 before implementation."""

    @classmethod
    def setUpClass(cls):
        cls.st = fresh()
        cls.answers = {c["id"]: inquire(cls.st, f"I:{c['id']}") for c in DATA["cases"]}

    def test_each_sealed_case(self):
        for c in DATA["cases"]:
            a, e = self.answers[c["id"]], c["expected"]
            with self.subTest(case=c["id"]):
                if "status" in e:
                    self.assertEqual(a.status, e["status"])
                if "contains" in e:
                    self.assertTrue(a.interval[0] <= e["contains"] <= a.interval[1])
                    self.assertGreaterEqual(a.interval[0], e["within"][0])
                    self.assertLessEqual(a.interval[1], e["within"][1])
                if "verdict" in e:
                    self.assertEqual(a.verdict, e["verdict"])
                if "value" in e:
                    self.assertEqual(a.value, e["value"])
                if "question" in e:
                    self.assertEqual(a.question_status, e["question"])
                if "need_mentions" in e:
                    self.assertTrue(any(e["need_mentions"] in n for n in a.needs), a.needs)
                for s in e.get("services", ()):
                    self.assertIn(s, a.services)


class SealedKnowledgeDependence(unittest.TestCase):
    """Removing the acquired knowledge a held-out conclusion rests on changes the result."""

    def test_rate_law_knowledge_is_needed(self):
        self.assertNotEqual(inquire(fresh(skip={"K:N2O5-first-order"}), "I:A1").status, "SUPPORTED")

    def test_relation_semantics_are_needed(self):
        self.assertNotEqual(inquire(fresh(skip={"R:made_of"}), "I:D1").status, "SUPPORTED")

    def test_class_definition_is_needed(self):
        self.assertEqual(inquire(fresh(skip={"K:def-12D"}), "I:B1").verdict, "undetermined")


if __name__ == "__main__":
    unittest.main()
