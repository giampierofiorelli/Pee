"""D-2 regression tests (REPORT.md §2). For each fix: (a) correct knowledge given directly to the universe, (b) the
full path through the reader, (c) a counterexample that must not change. Constructed cases only; D-1's cases are
reused unchanged from experiments/d1/cases.py.

Run from experiments/d2: python3 -m unittest test_d2
"""
import gc
import pathlib
import sys
import unittest
import weakref

D2 = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(D2.parent / "d1"), str(D2)]
import audit as A  # noqa: E402  (D-1's harness: build, base)
import question_format as QF  # noqa: E402
from cases import CASES, unit  # noqa: E402
from universe import acquisition, knowledge_acquisition as ka, markdown, propositions, recognition, rules  # noqa: E402
from universe.store import Item  # noqa: E402

C = {c["id"]: c for c in CASES}
H = A.harness


def d(st, term):
    return recognition.designate(st, term)


def case(cid, docs, units=(), questions=()):
    return {"id": cid, "docs": docs, "units": list(units), "questions": list(questions)}


def ask(st, qtype, **a):
    return H.answer(st, {"id": "q", "type": qtype, "ask": a})


class F1Cache(unittest.TestCase):
    def test_a_two_universes_never_share_an_index(self):
        self.assertIsInstance(recognition._INDEX, weakref.WeakKeyDictionary)
        for _ in range(30):  # no clearing: the cache itself must not leak
            a = A.base()
            ka.represent(a, C["K12"]["units"], "document:K12", "soil handbook")
            self.assertTrue(d(a, "soil compaction"))
            del a
            gc.collect()
            b = A.base()
            ka.represent(b, C["K3"]["units"], "document:K3", "geology handbook")
            self.assertEqual(d(b, "soil compaction"), set())

    def test_c_one_universe_asked_twice_and_after_a_change(self):
        st, _, _ = A.build(C["K12"], use_reader=False)
        self.assertEqual(d(st, "soil compaction"), d(st, "soil compaction"))
        self.assertEqual(d(st, "porosity"), set())
        ka.represent(st, [unit("x", "porosity", "decreases", "bulk density")], "document:more", "soil handbook")
        self.assertTrue(d(st, "porosity"))  # a new store state reads a new index


class F2Evidence(unittest.TestCase):
    def test_a_unexamined_cited_source_never_meets_an_independent_requirement(self):
        st, _, _ = A.build(C["K7"], use_reader=False)
        p = rules.propositions(st)[0]
        r = rules.evidence_assessment(st, p, "E:original_measurement")
        self.assertEqual((r["satisfied"], r["reason"]), (False, "cited source not examined"))

    def test_b_through_the_reader(self):
        st, _, _ = A.build(C["K7"], use_reader=True)
        self.assertFalse(any(rules.satisfies_evidence(st, p, "E:original_measurement") for p in rules.propositions(st)))

    def test_c_first_hand_measurement_and_examined_sources(self):
        st = A.base()
        src = {"source": "s", "holder": "h", "basis": "document statement"}
        st.acquire(Item("A:2", "content", {"form": "attribution", "reports": "R:2", "evidence": "measured"}, src))
        self.assertTrue(rules.satisfies_evidence(st, Item("C:2", "content", {"form": "quantity", "interprets": "R:2"},
                                                          src), "measured"))  # MS1, unchanged
        for extra, ok in (({"cited_sources_examined": True, "independence": "independent", "method": "M:1"}, True),
                          ({"cited_sources_examined": True, "independence": "independent"}, False),
                          ({"cited_sources_examined": True, "method": "M:1"}, False)):
            b = {"form": "attribution", "reports": "R:3", "content": "P:3", "attitude": "reported",
                 "evidence_classes": ["E:original_measurement"], "cites": ["S:1"]}
            b.update(extra)
            s2 = A.base()
            s2.acquire(Item("A:3", "content", b, src))
            r = rules.evidence_assessment(s2, Item("P:3", "content", {"form": "proposition"}, src),
                                          "E:original_measurement")
            self.assertEqual(r["satisfied"], ok, extra)


class F3Caveats(unittest.TestCase):
    def test_a_the_unstated_condition_travels_with_the_answer(self):
        st, _, _ = A.build(C["K13"], use_reader=False)
        r = rules.influence(st, d(st, "heavy rainfall"), d(st, "surface runoff"))
        self.assertEqual(r["answer"], "increases")
        self.assertEqual([(c["label"], c["values"]) for c in r["conditional_on"]], [("soil", ["saturated"])])

    def test_b_through_the_reader(self):
        st, _, _ = A.build(C["K13"], use_reader=True)
        r = H.answer(st, C["K13"]["questions"][0])
        self.assertEqual(r["answer"], "increases")
        self.assertEqual([(c["label"], c["values"]) for c in r["conditional_on"]], [("soil", ["saturated"])])

    def test_c_stated_condition_and_unconditional_claim(self):
        st, _, _ = A.build(C["K1"], use_reader=False)
        r = H.answer(st, C["K1"]["questions"][0])  # the question states the soil is saturated
        self.assertEqual(r["answer"], "increases")
        self.assertNotIn("conditional_on", r)
        st, _, _ = A.build(C["K12"], use_reader=False)
        self.assertNotIn("conditional_on", rules.influence(st, d(st, "soil compaction"), d(st, "infiltration rate")))

    def test_c_a_chain_accumulates_the_conditions_of_its_links(self):
        k = case("F3c", [("hydrology notes", "")], [
            unit("a", "snowmelt", "increases", "river discharge", kind="causal", conditions=[("season", "spring")]),
            unit("b", "river discharge", "increases", "sediment transport", kind="causal",
                 conditions=[("channel", "unlined")])])
        st, _, _ = A.build(k, use_reader=False)
        r = rules.influence(st, d(st, "snowmelt"), d(st, "sediment transport"))
        self.assertEqual((r["answer"], r["inference"]), ("increases", "chain"))
        self.assertEqual(sorted(c["label"] for c in r["conditional_on"]), ["channel", "season"])


class F4Conflicts(unittest.TestCase):
    def test_a_a_contrary_source_is_a_conflict(self):
        st, _, _ = A.build(C["K16"], use_reader=False)
        r = rules.influence(st, d(st, "mulch"), d(st, "soil moisture"))  # both documents' concepts, as one
        self.assertEqual((r["answer"], r["why"]), ("undetermined", "the sources conflict"))

    def test_b_through_the_reader(self):
        st, _, _ = A.build(C["K16"], use_reader=True)
        r = H.answer(st, C["K16"]["questions"][0])
        self.assertEqual(r["answer"], "undetermined")
        # two documents: two readings (F6); if they name one thing, the sources conflict
        self.assertEqual(r["why"], "indeterminate reference")
        self.assertEqual(r["if_identical"]["why"], "the sources conflict")

    def test_c_one_source_only(self):
        k = case("F4c", [("agronomy report A", "")], [C["K16"]["units"][0]])
        st, _, _ = A.build(k, use_reader=False)
        self.assertEqual(rules.influence(st, d(st, "mulch"), d(st, "soil moisture"))["answer"], "increases")

    def test_c_a_denial_of_the_other_direction_is_no_conflict(self):
        k = case("F4c2", [("agronomy report A", "")], [
            unit("a", "mulch", "increases", "soil moisture", kind="causal"),
            unit("b", "mulch", "decreases", "soil moisture", kind="causal", polarity="negated")])
        st, _, _ = A.build(k, use_reader=False)
        self.assertEqual(rules.influence(st, d(st, "mulch"), d(st, "soil moisture"))["answer"], "increases")


class F5Conditions(unittest.TestCase):
    def test_b_reader_conditions_meet_query_conditions(self):
        st, _, units = A.build(C["K1"], use_reader=True)
        self.assertEqual(units[0]["conditions"], [{"concept": "soil", "value": "saturated"}])
        self.assertEqual(H.answer(st, C["K1"]["questions"][1])["answer"], "undetermined")  # dry soil
        self.assertEqual(H.answer(st, C["K1"]["questions"][0])["answer"], "increases")  # saturated soil

    def test_b_reader_values_keep_their_condition_without_a_duplicate(self):
        st, _, units = A.build(C["K2"], use_reader=True)
        self.assertEqual([(u["relation"], u["conditions"]) for u in units],
                         [("has_value", [{"concept": "pressure", "value": "1 atm"}])])
        self.assertEqual(H.answer(st, C["K2"]["questions"][1])["answer"], "undetermined")  # 2 atm
        self.assertEqual(H.answer(st, C["K2"]["questions"][0])["answer"], {"number": 100.0, "unit": "degC"})

    def test_c_an_undecomposable_condition_is_kept_and_shown(self):
        k = case("F5c", [("climate notes", "# Fog\n\nCoastal fog increases visibility loss when the wind blows "
                                           "from the sea.\n")])
        st, _, units = A.build(k, use_reader=True)
        self.assertEqual(units[0]["conditions"], [{"concept": "wind blows from the sea", "value": "when"}])
        r = ask(st, "influence", cause="coastal fog", effect="visibility loss")
        self.assertEqual(r["answer"], "increases")
        self.assertEqual([c["label"] for c in r["conditional_on"]], ["wind blows from the sea"])


class F6Readings(unittest.TestCase):
    def test_a_homonyms_of_two_holders_are_two_readings(self):
        st, _, _ = A.build(C["K11"], use_reader=False)
        self.assertEqual(len(recognition.readings(st, d(st, "resolution"))), 2)
        r = H.answer(st, C["K11"]["questions"][0])
        self.assertEqual((r["answer"], r["why"]), ("undetermined", "indeterminate reference"))
        self.assertEqual(sorted(x["answer"] for x in r["readings"]), ["undetermined", "yes"])

    def test_b_through_the_reader(self):
        st, _, _ = A.build(C["K11"], use_reader=True)
        r = H.answer(st, C["K11"]["questions"][0])
        self.assertEqual((r["answer"], r["why"]), ("undetermined", "indeterminate reference"))

    def test_c_one_holder_is_one_reading(self):
        st, _, _ = A.build(C["K9"], use_reader=False)
        self.assertEqual(len(recognition.readings(st, d(st, "titration"))), 1)
        self.assertEqual(H.answer(st, C["K9"]["questions"][0])["answer"], "yes")

    def test_c_two_readings_that_agree_give_their_answer(self):
        k = case("F6c", [("display handbook", ""), ("monitor handbook", "")], [
            unit("a", "resolution", "defined_as", "number of pixels", kind="definition"),
            dict(unit("b", "resolution", "defined_as", "number of pixels", kind="definition"), doc=1)])
        st, _, _ = A.build(k, use_reader=False)
        r = H.answer(st, C["K11"]["questions"][0])
        self.assertEqual(r["answer"], "yes")
        self.assertEqual(len(r["readings"]), 2)  # one reading per holder

    def test_c_a_recorded_identity_joins_the_readings(self):
        st, _, _ = A.build(C["K11"], use_reader=False)
        ids = sorted(d(st, "resolution"))
        src = {"source": "s", "holder": "h", "basis": "document statement"}
        st.acquire(Item("CO:x", "content", {"form": "co_reference", "relata": ids, "verdict": "same"}, src))
        self.assertEqual(len(recognition.readings(st, set(ids))), 1)


class F7Standing(unittest.TestCase):
    def test_a_a_declaration_stays_a_declaration(self):
        st, _, _ = A.build(C["K8"], use_reader=False)
        r = rules.value(st, d(st, "battery life"))
        self.assertEqual(r["answer"], {"number": 20, "unit": "h"})
        self.assertEqual(r["according_to"], ["manufacturer"])
        self.assertIn("attributed", r["standing"])

    def test_b_through_the_reader(self):
        st, _, units = A.build(C["K8"], use_reader=True)
        self.assertEqual((units[0]["subject"], units[0]["attributed_to"]), ("battery life", ["manufacturer"]))
        r = ask(st, "value", subject="battery life")
        self.assertEqual((r["answer"], r["according_to"]), ({"number": 20.0, "unit": "h"}, ["manufacturer"]))

    def test_c_an_asserted_value_has_no_according_to(self):
        st, _, _ = A.build(C["K10"], use_reader=False)
        r = rules.value(st, d(st, "yield strength"))
        self.assertNotIn("according_to", r)
        self.assertNotIn("standing", r)
        self.assertEqual(r["evidence"][0]["attitudes"], ["asserted"])


class F8Deontic(unittest.TestCase):
    def test_a_a_prohibition_excludes_recommendation_and_permission(self):
        st, _, _ = A.build(C["K4"], use_reader=False)
        s = d(st, "pipetting by mouth")
        self.assertEqual(rules.holds(st, s, "recommends", None)["answer"], "no")
        self.assertEqual(rules.holds(st, s, "other: permits", None)["answer"], "no")
        self.assertEqual(rules.holds(st, s, "requires", None)["answer"], "no")
        self.assertEqual(rules.holds(st, s, "other: prohibits", None)["answer"], "yes")

    def test_b_through_the_reader(self):
        st, _, units = A.build(C["K4"], use_reader=True)
        # the inference holds on the reader's universe, on the action the reader names ...
        s = d(st, units[0]["subject"])
        self.assertEqual(rules.holds(st, s, "recommends", None)["answer"], "no")
        # ... but the question's term ("pipetting by mouth") names no concept the reader made ("pipette by mouth"):
        # an open reader limit of designation (D-1 §6), not of deontic inference
        self.assertFalse(H.answer(st, C["K4"]["questions"][0])["informed"])

    def test_c_obligation_implies_permission_not_recommendation(self):
        st, _, _ = A.build(C["K5"], use_reader=False)
        self.assertEqual(H.answer(st, C["K5"]["questions"][1])["answer"], "undetermined")  # unchanged
        self.assertEqual(H.answer(st, C["K5"]["questions"][2])["answer"], "undetermined")  # unchanged
        k = case("F8c", [("laboratory manual", "")], [unit("a", "wearing gloves", "requires", None, kind="norm",
                                                           evidence="none_stated", norm_bearer="user")])
        st, _, _ = A.build(k, use_reader=False)
        s = d(st, "wearing gloves")
        self.assertEqual(rules.holds(st, s, "other: permits", None)["answer"], "yes")
        self.assertEqual(rules.holds(st, s, "recommends", None)["answer"], "undetermined")
        self.assertEqual(rules.holds(st, s, "other: prohibits", None)["answer"], "no")

    def test_c_a_discouragement_is_not_a_prohibition(self):
        k = case("F8c2", [("laboratory manual", "")], [unit("a", "heating the sample", "recommends", None,
                                                            kind="norm", polarity="negated", evidence="none_stated")])
        st, _, _ = A.build(k, use_reader=False)
        s = d(st, "heating the sample")
        self.assertEqual(rules.holds(st, s, "other: prohibits", None)["answer"], "undetermined")
        self.assertEqual(rules.holds(st, s, "recommends", None)["answer"], "no")  # stated directly

    def test_c_nothing_stated_and_other_bearers(self):
        st, _, _ = A.build(C["K3"], use_reader=False)
        self.assertEqual(rules.holds(st, d(st, "basalt"), "other: prohibits", None)["answer"], "undetermined")
        st, _, _ = A.build(C["K4"], use_reader=False)
        s = d(st, "pipetting by mouth")
        self.assertEqual(rules.holds(st, s, "recommends", None, bearer="laboratory")["answer"], "undetermined")
        k = case("F8c3", [("laboratory manual", "")], [
            unit("a", "opening the cabinet", "other: prohibits", None, kind="norm", evidence="none_stated",
                 norm_bearer="visitor"),
            unit("b", "opening the cabinet", "requires", None, kind="norm", evidence="none_stated",
                 norm_bearer="technician")])
        st, _, _ = A.build(k, use_reader=False)
        r = rules.holds(st, d(st, "opening the cabinet"), "other: permits", None)
        self.assertEqual((r["answer"], r["why"]), ("undetermined", "norms of different bearers"))
        self.assertEqual(rules.holds(st, d(st, "opening the cabinet"), "other: permits", None,
                                     bearer="technician")["answer"], "yes")


class F9Tables(unittest.TestCase):
    def test_b_a_property_value_table(self):
        st, _, _ = A.build(C["K10"], use_reader=True)
        self.assertEqual(H.answer(st, C["K10"]["questions"][0])["answer"], {"number": 250.0, "unit": "MPa"})

    def test_b_an_entity_matrix_gives_each_value_under_its_entity(self):
        k = case("F9b", [("materials handbook", "# Metals\n\n| Material | Yield strength (MPa) |\n|---|---|\n"
                                                "| Steel | 250 |\n| Aluminium | 95 |\n")])
        st, _, units = A.build(k, use_reader=True)
        self.assertEqual(len(units), 2)
        r = ask(st, "value", subject="yield strength", conditions=[{"concept": "material", "value": "aluminium"}])
        self.assertEqual(r["answer"], {"number": 95.0, "unit": "MPa"})
        self.assertEqual(ask(st, "value", subject="yield strength")["answer"], "undetermined")  # several values
        self.assertEqual(d(st, "steel"), set())  # the row entity is a condition value, never a merged entity

    def test_c_a_table_without_values_invents_nothing(self):
        st = A.base()
        doc = markdown.read("# Notes\n\n| Item | Remark |\n|---|---|\n| Steel | ductile |\n", "document:t", "h")
        r = propositions.read_propositions(doc, acquisition.Lexicon(st))
        self.assertEqual(r["units"], [])
        self.assertEqual([(e["status"], e["reasons"]) for e in r["ledger"]],
                         [("not assimilated", ["a cell that states no single value"])])


class F9Lifecycle(unittest.TestCase):
    """Post-check correction (REPORT.md §7.1): table rows are audited apart from sentences, so a document with a
    property table still completes the assimilation lifecycle."""

    def test_a_document_with_a_value_table_completes(self):
        import tempfile
        import zipfile
        from universe import assimilate
        md = ("# Steel\n\nSteel is an alloy of iron and carbon.\n\n| Property | Value |\n|---|---|\n"
              "| Yield strength | 250 MPa |\n| Remark | not stated here |\n")
        with tempfile.TemporaryDirectory() as tmp:
            z = pathlib.Path(tmp) / "orig.zip"
            with zipfile.ZipFile(z, "w") as zf:
                zf.writestr("steel.md", md)
            st = A.base()
            rec, text = assimilate.assimilate(st, z, "fixture author", pathlib.Path(tmp) / "work", member="steel.md")
            a = rec["audit"]
            self.assertTrue(a["every_sentence_accounted"])
            self.assertEqual((a["table_rows"], a["table_row_entries"], a["every_table_row_accounted"]), (2, 2, True))
            self.assertEqual(a["table_row_statuses"], {"acquired": 1, "not assimilated": 1})
            res = assimilate.complete(st, [rec], [text], pathlib.Path(tmp) / "u.gz", {rec["document"]: (z, "steel.md")})
            self.assertTrue(res["ok"], res)


class F10Time(unittest.TestCase):
    K = case("F10", [("reporting rules", "# Reporting\n\nFrom 18 February 2027, laboratories must report the "
                                         "measurement uncertainty.\n")],
             [unit("a", "laboratories", "requires", "report the measurement uncertainty", kind="norm",
                   evidence="none_stated", conditions=[("point in time", "from 2027-02-18")])])

    def check(self, use_reader):
        st, _, units = A.build(self.K, use_reader=use_reader)
        if use_reader:
            self.assertEqual(units[0]["conditions"], [{"concept": "point in time", "value": "from 2027-02-18"}])
        q = {"subject": "laboratories", "relation": "requires", "object": units[0]["object"]}
        at = [{"concept": "calendar date", "value": "2026-10-23"}]
        self.assertEqual(ask(st, "holds", **q, conditions=at)["answer"], "undetermined")
        self.assertEqual(ask(st, "holds", **q, conditions=[{"concept": "calendar date", "value": "2028-01-01"}])
                         ["answer"], "yes")
        self.assertEqual(ask(st, "holds", **q, conditions=[{"concept": "calendar date", "value": "18 February 2027"}])
                         ["answer"], "yes")
        r = ask(st, "holds", **q)
        self.assertEqual(r["answer"], "yes")
        self.assertEqual([(c["label"], c["values"]) for c in r["conditional_on"]],
                         [("point in time (calendar date)", ["from 2027-02-18"])])

    def test_a_correct_knowledge(self):
        self.check(False)

    def test_b_through_the_reader(self):
        self.check(True)

    def test_c_a_clause_before_an_event_is_unchanged(self):
        st = A.base()
        for md, cond in (("# Titration\n\nCheck the flask before titration.\n", {"concept": "titration",
                                                                                  "value": "before"}),
                         ("# Soil\n\nTillage increases erosion after harvest.\n", {"concept": "harvest",
                                                                                  "value": "after"})):
            u = propositions.read_propositions(markdown.read(md, "document:t", "h"), acquisition.Lexicon(st))["units"]
            self.assertEqual(u[0]["conditions"], [cond])

    def test_c_intervals(self):
        import datetime
        f, D = rules._date_fits, datetime.date
        self.assertTrue(f("until", D(2026, 1, 1), "on", D(2025, 6, 1)))
        self.assertFalse(f("before", D(2026, 1, 1), "on", D(2026, 1, 1)))
        self.assertTrue(f("from", D(2026, 1, 1), "from", D(2027, 1, 1)))
        self.assertFalse(f("until", D(2026, 1, 1), "from", D(2025, 1, 1)))  # only partly inside


class F11QuestionFormat(unittest.TestCase):
    def setUp(self):
        self.lex = QF._lexicon()

    def test_plain_terms_pass(self):
        for t in ("soil compaction", "boiling point of water", "filter", "resolution"):
            self.assertEqual(QF.term_issues(t, self.lex), [], t)

    def test_values_bounds_and_comparatives_are_flagged(self):
        r = QF.term_issues("noise level below 40 dB", self.lex)
        self.assertIn("a value with a unit", r)
        self.assertTrue(any(x.startswith("a bound") for x in r))
        self.assertIn("a comparative", QF.term_issues("filters cheaper than cartridges", self.lex))
        self.assertIn("a number", QF.term_issues("type 2 filter", self.lex))

    def test_old_questions_are_counted_not_rewritten(self):
        qs = [q for c in CASES for q in c.get("questions", ())]
        before = [dict(q) for q in qs]
        c = QF.count(qs, self.lex)
        self.assertEqual(qs, before)
        self.assertEqual(c["questions"], len(qs))
        self.assertEqual([r["id"] for r in c["rows"]], ["K5q1", "K5q2"])  # "0.2 µm filter" in a term


if __name__ == "__main__":
    unittest.main()
