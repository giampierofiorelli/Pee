"""T1 tests of the T-1 evaluation interface (PROTOCOL.md §11). Constructed fixtures: mechanics only."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import score as S  # noqa: E402

REF = {"id": "B1", "lines": [5], "content_kind": "norm", "relation": "requires", "subject": "measurement record",
       "object": "sample date", "value": None, "polarity": "affirmed", "modality": "necessary", "conditions": [],
       "document_attitude": "asserted", "evidence_kind": "none_stated", "attributed_to": ["R03"]}
ITEM = {"item": "U1", "lines": [5], "subject": "measurement record", "relation": "requires", "object": "sample date",
        "value": None, "polarity": "affirmed", "modality": "necessary", "conditions": [],
        "document_attitude": "asserted", "evidence_kind": ["synthesis"], "attributed_to": []}


def g(item, ref=REF):
    return S.grade(item, ref, {})


class Interface(unittest.TestCase):
    def test_old_schema_item_without_source_is_missing(self):
        self.assertEqual(g(ITEM)["source_link"], "missing")

    def test_new_cited_sources_link_to_old_reference(self):
        self.assertEqual(g(dict(ITEM, cited_sources=["R03"]))["source_link"], "right")

    def test_string_sources_in_reference(self):
        self.assertEqual(g(dict(ITEM, cited_sources=["R01"]), dict(REF, attributed_to="R01, R03"))["source_link"],
                         "right")

    def test_specific_attribution_unscored_on_old_reference(self):
        self.assertEqual(g(dict(ITEM, cited_sources=["R03"], attributed_to=["R03"]))["_new"]["specific_attribution"],
                         "unscored")

    def test_specific_attribution_scored_on_new_reference(self):
        ref = dict(REF, cited_sources=["R03"], attributed_to=[])
        self.assertEqual(g(dict(ITEM, cited_sources=["R03"], attributed_to=[]), ref)["_new"]["specific_attribution"],
                         "right")
        self.assertEqual(g(dict(ITEM, cited_sources=["R03"], attributed_to=["R03"]), ref)["_new"]["specific_attribution"],
                         "wrong")

    def test_uncertain_relation_is_abstained_never_right(self):
        it = dict(ITEM, relation="other", states={"relation": "uncertain"}, relation_candidates=["requires"])
        gr = g(it)
        self.assertEqual((gr["relation"], gr["deontic_force"]), ("abstained", "abstained"))
        self.assertEqual(S.criticals(it, REF, gr), [])

    def test_not_read_polarity_is_abstained(self):
        self.assertEqual(g(dict(ITEM, states={"polarity": "not_read"}))["polarity"], "abstained")

    def test_recommends_with_necessary_modality_is_not_an_obligation(self):
        it = dict(ITEM, relation="recommends", object=None)
        ref = dict(REF, object=None)
        gr = g(it, ref)
        self.assertEqual((gr["relation"], gr["deontic_force"]), ("wrong", "wrong"))
        self.assertEqual(S.criticals(it, ref, gr), [7])

    def test_prohibition(self):
        ref = dict(REF, relation="other: prohibits", object=None)
        self.assertEqual(g(dict(ITEM, relation="other", verb="prohibits", object=None), ref)["deontic_force"], "right")
        gr = g(dict(ITEM, relation="recommends", polarity="negated", object=None), ref)
        self.assertEqual(gr["deontic_force"], "wrong")

    def test_negated_requires_is_not_a_prohibition(self):
        ref = dict(REF, relation="other: prohibits", object=None)
        self.assertEqual(S.normalize(dict(ITEM, polarity="negated"))["deontic_force"], "permission_to_omit")
        self.assertEqual(g(dict(ITEM, polarity="negated", object=None), ref)["deontic_force"], "wrong")

    def test_native_evidence_fields(self):
        it = dict(ITEM, evidence_nature="none_stated", statement_status="requirement", cited_sources=[])
        gr = g(it)
        self.assertEqual((gr["evidence_nature"], gr["statement_status"]), ("right", "right"))

    def test_norm_bearer_is_a_new_capability(self):
        gr = g(dict(ITEM, norm_bearer="procedure"), dict(REF, norm_bearer="procedure"))
        self.assertEqual(gr["_new"]["norm_bearer"], "right")
        self.assertNotIn("norm_bearer", S.SHARED)

    def test_unmatched_item_is_not_graded(self):
        self.assertIsNone(S.match(dict(ITEM, subject="unrelated thing", object="other words"), [REF]))
        self.assertIsNone(S.match(dict(ITEM, lines=[9]), [REF]))

    def test_does_not_establish_equals_negated_establishes(self):
        r = dict(REF, relation="does_not_establish", content_kind="method")
        self.assertEqual(g(dict(ITEM, relation="establishes", polarity="negated"), r)["relation"], "right")
        self.assertEqual(g(dict(ITEM, relation="establishes", polarity="negated"), r)["polarity"], "right")


if __name__ == "__main__":
    unittest.main()
