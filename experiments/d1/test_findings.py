"""D-1 reproductions (REPORT.md §5). Each test asserts the CURRENT, defective behaviour on a constructed case, so the
defect stays reproducible. When a defect is corrected (a separate, authorised change), its test fails and is
replaced by a test of the corrected behaviour. Nothing here corrects anything.

Run from experiments/d1: python3 -m unittest test_findings
"""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import audit as A  # noqa: E402
from universe import rules, recognition  # noqa: E402

C = {c["id"]: c for c in A.cases.CASES}


def d(st, term):
    return recognition.designate(st, term)


def setUpModule():
    recognition._INDEX.clear()


class StructuralDefects(unittest.TestCase):
    def setUp(self):
        recognition._INDEX.clear()  # SD9: never let a freed store's index answer for this one

    @unittest.expectedFailure  # corrected by D-2 (experiments/d2/REPORT.md)
    def test_sd9_recognition_index_can_leak_between_universes(self):
        """The cache key (id(store), store.seq) can collide when a store is freed and a new one is built."""
        import gc
        seen = []

        class NoClear(dict):  # the harness clears the cache in build(); the reproduction must not
            def clear(self):
                pass
        saved = recognition._INDEX
        recognition._INDEX = NoClear()
        self.addCleanup(setattr, recognition, "_INDEX", saved)
        for _ in range(30):
            a, _, _ = A.build(C["K12"], use_reader=False)
            recognition.designate(a, "soil compaction")
            key = (id(a), a.seq)
            del a
            gc.collect()
            b, _, _ = A.build(C["K3"], use_reader=False)
            recognition._index(b) if (id(b), b.seq) != key else None
            if (id(b), b.seq) == key:
                seen.append(recognition.designate(b, "soil compaction"))  # a geology universe holds no such term
                break
        if not seen:
            self.skipTest("no id collision in 30 trials on this interpreter run")
        self.assertTrue(seen[0])
    @unittest.expectedFailure  # corrected by D-2 (experiments/d2/REPORT.md)
    def test_sd1_unstated_condition_is_dropped(self):
        st, _, _ = A.build(C["K13"], use_reader=False)  # correct knowledge: holds only when the soil is saturated
        p = rules.propositions(st)[0]
        self.assertTrue(rules.conditions_fit(st, p, {})[1])  # the caveat exists …
        r = rules.influence(st, d(st, "heavy rainfall"), d(st, "surface runoff"))
        self.assertEqual(r["answer"], "increases")  # … but the answer carries no trace of it
        self.assertNotIn("caveats", r)

    @unittest.expectedFailure  # corrected by D-2 (experiments/d2/REPORT.md)
    def test_sd2_influence_ignores_a_contrary_source(self):
        st, _, _ = A.build(C["K16"], use_reader=False)
        m, s = d(st, "mulch"), d(st, "soil moisture")
        self.assertEqual(rules.holds(st, m, "increases", s)["answer"], "undetermined")  # holds sees the conflict
        self.assertEqual(rules.influence(st, m, s)["answer"], "increases")  # influence does not

    # D-2 (F6): still passes. The rule is called here with the union of both holders' concepts, which `designate`
    # still returns; the correction is `recognition.readings` and the per-reading harness (experiments/d2)
    def test_sd3_homonyms_of_two_holders_are_merged_by_recognition(self):
        st, _, _ = A.build(C["K11"], use_reader=False)
        ids = d(st, "resolution")
        self.assertEqual(len({st.get(i).body.get("holder") for i in ids}), 2)
        self.assertEqual(rules.holds(st, ids, "defined_as", d(st, "number of pixels"))["answer"], "yes")

    @unittest.expectedFailure  # corrected by D-2 (experiments/d2/REPORT.md)
    def test_sd4_a_reported_cited_result_meets_the_independent_evidence_requirement(self):
        st, _, _ = A.build(C["K7"], use_reader=False)
        p = rules.propositions(st)[0]
        att = rules.attributions(st, p.id)[0].body
        self.assertFalse(att.get("cited_sources_examined"))
        self.assertTrue(rules.satisfies_evidence(st, p, "E:original_measurement"))

    @unittest.expectedFailure  # corrected by D-2 (experiments/d2/REPORT.md)
    def test_sd5_a_declared_value_is_answered_as_a_value(self):
        st, _, _ = A.build(C["K8"], use_reader=False)
        r = rules.value(st, d(st, "battery life"))
        self.assertEqual(r["answer"], {"number": 20, "unit": "h"})
        self.assertNotIn("evidence", r)

    @unittest.expectedFailure  # corrected by D-2 (experiments/d2/REPORT.md)
    def test_sd6_a_prohibition_draws_no_inference(self):
        st, _, _ = A.build(C["K4"], use_reader=False)
        self.assertEqual(rules.holds(st, d(st, "pipetting by mouth"), "recommends", None)["answer"], "undetermined")

    @unittest.expectedFailure  # corrected by D-2 (experiments/d2/REPORT.md)
    def test_sd7_a_property_table_in_a_teaching_document_is_not_acquired(self):
        st, _, _ = A.build(C["K10"], use_reader=True)
        self.assertEqual(d(st, "yield strength"), set())

    @unittest.expectedFailure  # corrected by D-2 (experiments/d2/REPORT.md)
    def test_sd8_reader_conditions_cannot_meet_query_conditions(self):
        st, _, units = A.build(C["K1"], use_reader=True)
        self.assertEqual(units[0]["conditions"], [{"concept": "soil is saturated", "value": "when"}])
        q = C["K1"]["questions"][1]  # dry soil: the document says nothing
        self.assertEqual(A.harness.answer(st, q)["answer"], "increases")

    @unittest.expectedFailure  # corrected by D-2 (experiments/d2/REPORT.md)
    def test_sd8b_reader_values_lose_their_condition(self):
        st, _, _ = A.build(C["K2"], use_reader=True)
        q = C["K2"]["questions"][1]  # 2 atm: the document says nothing
        self.assertEqual(A.harness.answer(st, q)["answer"], {"number": 100.0, "unit": "degC"})


class CorrectKnowledgeIsKept(unittest.TestCase):
    """Counter-checks: with correct units, representation and rules behave as expected (S4–S6 not at fault)."""

    def setUp(self):
        recognition._INDEX.clear()

    def test_condition_conflict_with_correct_units(self):
        st, _, _ = A.build(C["K1"], use_reader=False)
        self.assertEqual(A.harness.answer(st, C["K1"]["questions"][1])["answer"], "undetermined")

    def test_value_condition_with_correct_units(self):
        st, _, _ = A.build(C["K2"], use_reader=False)
        self.assertEqual(A.harness.answer(st, C["K2"]["questions"][1])["answer"], "undetermined")

    def test_negation_hypothesis_illustration_and_force(self):
        for k, qi, exp in (("K3", 0, "no"), ("K14", 0, "undetermined"), ("K14", 1, "hypothesised"),
                           ("K15", 0, "undetermined"), ("K5", 1, "undetermined")):
            st, _, _ = A.build(C[k], use_reader=False)
            self.assertEqual(A.harness.answer(st, C[k]["questions"][qi])["answer"], exp, k)


if __name__ == "__main__":
    unittest.main()
