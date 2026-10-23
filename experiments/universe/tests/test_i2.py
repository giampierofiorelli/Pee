"""I-2 tests, tier T1 (constructed document structures; mechanics only, no page content).

One test class per mechanism of experiments/i2/REPORT.md section 2 (M1-M8), plus integration checks.
"""
import re
import unittest

from tests.test_i1 import HERE, cell, complete, doc  # noqa: F401 (sys.path set there)
from universe import acquisition, contract, loader, recognition, rules  # noqa: E402
from universe.store import Item, Store  # noqa: E402

S, D, TM, ACH = "C:operating_setting", "C:distance_to_source", "C:test_material", "C:air_change_rate"
BUYER = {"source": "test", "holder": "buyer", "basis": "stated requirement"}
USAGE = {"source": "test", "holder": "buyer", "basis": "assumption"}
HARNESS = {"source": "test", "holder": "harness", "basis": "definition"}
NAME = (("Alpha One", "json-ld-product"),)


def docu(tables, url="https://example.org/a", names=NAME, headings=()):
    d = doc(tables, names=names)
    d["url"] = url
    for i, t in enumerate(d["tables"]):
        t["headingPath"] = list(headings[i]) if i < len(headings) else []
    return d


def build(*docs):
    st = Store()
    loader.load_general_knowledge(st)
    return st, [acquisition.acquire_document(st, d) for d in docs]


def ref(st, label, url="https://example.org/a"):
    return next(e.id for e in st.of("entity") if e.body["label"] == label and e.body.get("document") == url)


def ask(st, qid, roles, q, conditions=None, definition=None, givens=(), **inquiry):
    if definition:
        st.acquire(Item(f"D:{qid}", "content", dict(definition, form="class_definition", **{"class": f"K:{qid}"}), BUYER))
        q = dict(q, **{"class": f"K:{qid}"})
    st.acquire(Item(f"Q:{qid}", "question", q, BUYER))
    for n, (role, kind, lo, hi, unit) in enumerate(givens):
        st.acquire(Item(f"I:{qid}:g{n}", "content", {"form": "quantity", "bearer": roles[role], "kind": kind, "lo": lo,
                                                    "hi": hi, "unit": unit, "conditions": {}, "scope": "invariant",
                                                    "invariance": "datum", "holds_of": "individual"}, USAGE,
                        {"situation": f"I:{qid}"}))
    st.acquire(Item(f"I:{qid}", "inquiry", dict({"question": f"Q:{qid}", "roles": roles, "conditions": conditions or {},
                                                 "scope_assumptions": []}, **inquiry), HARNESS))
    return contract.inquire(st, f"I:{qid}")


def kv(label, value):
    return [cell(0, 0, label), cell(0, 1, value)]


def one(st, summ):
    (c,) = [st.get(x) for x in summ["contents"]]
    return c


class M1Referents(unittest.TestCase):
    """Document-scoped referents; identity across documents only through an adopted reading."""

    def setUp(self):
        self.st, _ = build(docu([kv("Weight:", "5 kg")], "https://a.example/x"),
                           docu([kv("Weight:", "7 kg")], "https://b.example/y"))
        self.a = ref(self.st, "alpha one", "https://a.example/x")
        self.b = ref(self.st, "alpha one", "https://b.example/y")

    def test_same_name_in_two_documents_is_two_referents(self):
        self.assertNotEqual(self.a, self.b)

    def test_recognition_proposes_an_indeterminate_co_reference(self):
        (co,) = recognition.propose_coreference(self.st)
        b = self.st.get(co).body
        self.assertEqual((b["verdict"], b["evidence"], sorted(b["relata"])), ("indeterminate", "same designation",
                                                                              sorted([self.a, self.b])))

    def test_no_conclusion_across_documents_without_a_reading(self):
        recognition.propose_coreference(self.st)
        r = ask(self.st, "m1a", {"x": self.a}, {"role": "x"}, {}, {"kind": "Q:mass", "op": "<=", "bound": 6, "unit": "kg"})
        self.assertEqual(r.verdict, "applies")  # its own document's value only (5 kg)
        self.assertNotIn("conditional on assumptions", r.standing)

    def test_a_reading_is_a_ground_and_a_disagreement_stays_undetermined(self):
        (co,) = recognition.propose_coreference(self.st)
        rd = recognition.adopt_reading(self.st, "I:m1b", co, "buyer", "the buyer means one product")
        r = ask(self.st, "m1b", {"x": self.a}, {"role": "x"}, {}, {"kind": "Q:mass", "op": "<=", "bound": 6, "unit": "kg"},
                identity_readings=[rd])
        self.assertEqual(r.verdict, "undetermined")  # 5 kg and 7 kg disagree on the bound
        rd2 = recognition.adopt_reading(self.st, "I:m1c", co, "buyer", "the buyer means one product")
        r = ask(self.st, "m1c", {"x": self.a}, {"role": "x"}, {}, {"kind": "Q:mass", "op": "<=", "bound": 8, "unit": "kg"},
                identity_readings=[rd2])
        self.assertEqual((r.verdict, r.standing), ("applies", "conditional on assumptions"))
        self.assertIn(rd2, r.grounds)


class M2Parts(unittest.TestCase):
    def test_a_part_bears_its_quantity_and_is_designated_by_the_question(self):
        st, (s,) = build(docu([kv("Filter life:", "12 months")]))
        c = one(st, s)
        self.assertNotIn("incomplete", c.body)
        part = st.get(c.body["bearer"])
        a = ref(st, "alpha one")
        self.assertEqual((part.body["part_kind"], part.body["whole"]), ("P:filter", a))
        whole = ask(st, "m2a", {"x": a}, {"role": "x"}, {}, {"kind": "Q:service_life", "op": ">=", "bound": 6, "unit": "month"})
        self.assertEqual(whole.verdict, "undetermined")  # the filter's life is not the purifier's
        r = ask(st, "m2b", {"x": a}, {"role": "x", "part": "P:filter"}, {},
                {"kind": "Q:service_life", "op": ">=", "bound": 6, "unit": "month"})
        self.assertEqual(r.verdict, "applies")
        rel = [g for g in r.grounds if st.has(g) and st.get(g).body.get("form") == "relation"]
        self.assertTrue(rel)


class M2PartAsReference(unittest.TestCase):
    def test_a_kind_defined_relative_to_a_part_keeps_the_whole_as_bearer(self):
        st, (s,) = build(docu([kv("Battery runtime:", "10 h")]))
        c = one(st, s)
        self.assertEqual((c.body["bearer"], c.body["kind"]), (ref(st, "alpha one"), "Q:operating_time_per_charge"))


class M3BearerKind(unittest.TestCase):
    def test_a_kind_word_types_the_bearer_and_is_not_a_part(self):
        st, (s,) = build(docu([kv("Robot height:", "9.8 cm")]))
        c = one(st, s)
        a = ref(st, "alpha one")
        self.assertEqual((c.body["bearer"], c.body["kind"]), (a, "Q:height"))
        rels = [r.body for r in st.of("content", form="relation") if r.body["subject"] == a]
        self.assertEqual([(r["relation"], r["object"]) for r in rels], [("R:instance_of", "K:robot_vacuum")])


class M4Methods(unittest.TestCase):
    def test_standard_and_test_material_are_slots_not_words(self):
        st, (s,) = build(docu([kv("Smoke CADR (AHAM):", "200 cfm")]))
        c = one(st, s)
        self.assertEqual((c.body["kind"], c.body["conditions"][TM], list(c.body["methods"])),
                         ("Q:clean_air_delivery_rate", "V:smoke", ["MT:aham-ac-1"]))
        a = ref(st, "alpha one")
        d = {"kind": "Q:clean_air_delivery_rate", "op": ">=", "bound": 150, "unit": "cfm"}
        self.assertEqual(ask(st, "m4a", {"x": a}, {"role": "x"}, {TM: "V:smoke"}, d).verdict, "applies")
        self.assertEqual(ask(st, "m4b", {"x": a}, {"role": "x"}, {TM: "V:dust"}, d).verdict, "undetermined")

    def test_a_procedure_in_a_header_is_a_method_with_its_conditions(self):
        st, (s,) = build(docu([kv("Noise level (measured from 3 ft. away with a sound level meter):", "40 dBA")]))
        c = one(st, s)
        self.assertNotIn("incomplete", c.body)
        self.assertEqual(list(c.body["conditions"][D]), [3.0, 3.0, "ft"])
        (m,) = c.body["methods"]
        self.assertEqual(st.get(m).body["category"], "procedure")

    def test_different_methods_are_not_compared(self):
        t = [cell(0, 0, "MODEL"), cell(0, 1, "CADR (AHAM)"), cell(0, 2, "CADR"),
             cell(1, 0, "Alpha One", ["Alpha One"]), cell(1, 1, "200 cfm"), cell(1, 2, "100 cfm")]
        st, _ = build(docu([t]))
        cs = [c for c in st.of("content", form="quantity") if "incomplete" not in c.body]
        self.assertEqual({tuple(c.body["methods"]) for c in cs}, {("MT:aham-ac-1",), ()})


class M5Determinables(unittest.TestCase):
    def test_a_dimension_class_is_blocked(self):
        st, (s,) = build(docu([kv("Frequency:", "30Hz – 20kHz")]))
        for c in [st.get(x) for x in s["contents"]]:
            self.assertTrue(any("dimension class" in r for r in c.body.get("incomplete", [])))

    def test_a_span_gives_its_two_limits(self):
        st, (s,) = build(docu([kv("Frequency response:", "30Hz – 20kHz")]))
        got = {(c.body["kind"], c.body["lo"], c.body["unit"], c.body["interval"]) for c in complete(st, s)}
        self.assertEqual(got, {("Q:lower_frequency_limit", 0.03, "kHz", "measurement"),
                               ("Q:upper_frequency_limit", 20.0, "kHz", "measurement")})

    def test_an_unspecified_defining_condition_does_not_answer_a_specific_question(self):
        st, (s,) = build(docu([kv("Clean air delivery rate:", "200 cfm")]))
        c = one(st, s)
        self.assertIn(TM, c.body["unspecified"])
        a = ref(st, "alpha one")
        d = {"kind": "Q:clean_air_delivery_rate", "op": ">=", "bound": 150, "unit": "cfm"}
        self.assertEqual(ask(st, "m5a", {"x": a}, {"role": "x"}, {}, d).verdict, "applies")
        self.assertEqual(ask(st, "m5b", {"x": a}, {"role": "x"}, {TM: "V:smoke"}, d).verdict, "undetermined")

    def test_coverage_is_defined_at_an_air_change_rate(self):
        st, (s,) = build(docu([kv("Recommended room size:", "562 sq. ft. (5 air changes per hour)")]))
        c = one(st, s)
        self.assertEqual((c.body["kind"], list(c.body["conditions"][ACH])), ("Q:coverage_area", [5.0, 5.0, "1/h"]))
        self.assertNotIn("incomplete", c.body)


class M6Intervals(unittest.TestCase):
    def test_a_range_without_settings_is_variation_and_never_equal(self):
        st, (s,) = build(docu([kv("Noise level:", "40 – 60 dBA")]))
        self.assertEqual(one(st, s).body["interval"], "variation")


class M7Contexts(unittest.TestCase):
    def test_headings_that_agree_name_the_bearer(self):
        d = docu([kv("Weight:", "5 kg")], names=(("Gamma Q-9 – Best overall", "heading"),),
                 headings=[["Gamma Q-9 – Best overall", "Specs: Gamma Q-9"]])
        st, (s,) = build(d)
        self.assertEqual(st.get(one(st, s).body["bearer"]).body["label"], "gamma q 9")

    def test_two_designations_of_one_setting_are_one_setting(self):
        st, (s,) = build(docu([[cell(0, 0, "Fan Speed"), cell(0, 1, "Alpha One (dBA)"),
                                cell(1, 0, "Speed 1 (Low)"), cell(1, 1, "40.7 dBA")]]))
        c = one(st, s)
        self.assertEqual((c.body["conditions"][S], list(c.body["setting_aliases"])), ("V:setting:speed 1", ["V:setting:low"]))

    def test_separators_and_unit_lists_are_not_words(self):
        st, (s,) = build(docu([kv("Weight (pounds / kg):", "13.2 lb (6 kg)")]))
        self.assertTrue(complete(st, s))
        self.assertEqual(len(complete(st, s)), len(s["contents"]))


class M8Reuse(unittest.TestCase):
    T = [cell(0, 0, "MODEL"), cell(0, 1, "POWER AT TOP SPEED (watts)"), cell(0, 2, "NOISE AT TOP SPEED (dB)"),
         cell(1, 0, "Alpha One", ["Alpha One"]), cell(1, 1, "20 watts"), cell(1, 2, "40 dBA"),
         cell(2, 0, "Beta Two X-7", ["Beta Two X-7"]), cell(2, 1, "35 watts"), cell(2, 2, "50 dBA")]

    def setUp(self):
        self.st, _ = build(docu([self.T]))
        self.a, self.b = ref(self.st, "alpha one"), ref(self.st, "beta two x 7")

    def test_a_lifted_comparison_is_reused_and_retraction_propagates(self):
        r1 = ask(self.st, "r1", {"a": self.a, "b": self.b}, {"role": "a", "compare": ["a", "b"], "kind": "Q:sound_level"},
                 {S: "V:setting:top speed"})
        self.assertEqual(r1.value, "less")
        (g,) = r1.lifted
        r2 = ask(self.st, "r2", {"a": self.b, "b": self.a}, {"role": "a", "compare": ["a", "b"], "kind": "Q:sound_level"},
                 {S: "V:setting:top speed"})
        self.assertEqual((r2.value, r2.grounds), ("greater", [g]))  # reused, inverted, not recomputed
        premise = next(c for c in self.st.get(f"ST:{g}").body["grounds"] if c.startswith("P:"))
        contract.retract(self.st, premise, "harness", "test: a reading found wrong")
        self.assertFalse(rules.current(self.st, g))
        r3 = ask(self.st, "r3", {"a": self.b, "b": self.a}, {"role": "a", "compare": ["a", "b"], "kind": "Q:sound_level"},
                 {S: "V:setting:top speed"})
        self.assertIsNone(r3.value)  # one side's only content is retracted

    def test_a_selection_reuses_lifted_comparisons(self):
        r1 = ask(self.st, "s1", {"a": self.a, "b": self.b}, {"role": "a", "compare": ["a", "b"], "kind": "Q:sound_level"},
                 {S: "V:setting:top speed"})
        r2 = ask(self.st, "s2", {"a": self.a, "b": self.b}, {"role": "a", "select": ["a", "b"], "kind": "Q:sound_level",
                                                           "prefer": "lower"}, {S: "V:setting:top speed"})
        self.assertEqual((r2.value, r2.grounds), (self.a, r1.lifted))

    def test_a_lifted_derived_quantity_carries_the_assumption_as_a_condition(self):
        d1 = {"kind": "Q:energy", "op": "<=", "bound": 300, "unit": "Wh"}
        r1 = ask(self.st, "e1", {"bearer": self.a}, {"role": "bearer"}, {S: "V:setting:top speed"}, d1,
                 givens=[("bearer", "Q:duration", 8, 8, "h")])
        self.assertEqual((r1.verdict, r1.services), ("applies", ["rules", "model"]))
        lifted_q = [x for x in r1.lifted if self.st.get(x).body["form"] == "quantity"]
        self.assertTrue(lifted_q)
        self.assertEqual(list(self.st.get(lifted_q[0]).body["conditions"]["Q:duration"]), [8, 8, "h"])
        self.assertNotEqual(self.st.get(f"ST:{lifted_q[0]}").body["label"], "conditional on assumptions")
        d2 = {"kind": "Q:energy", "op": ">=", "bound": 100, "unit": "Wh"}
        r2 = ask(self.st, "e2", {"bearer": self.a}, {"role": "bearer"}, {S: "V:setting:top speed"}, d2,
                 givens=[("bearer", "Q:duration", 8, 8, "h")])
        self.assertEqual((r2.verdict, r2.services), ("applies", ["rules"]))  # no model run: the lifted value is used
        self.assertIn(lifted_q[0], r2.grounds)


class Integration(unittest.TestCase):
    def test_no_relation_or_kind_names_in_code(self):
        for f in (HERE / "universe").glob("*.py"):
            if f.name == "loader.py":
                continue
            text = f.read_text()
            self.assertIsNone(re.search(r"[\"'](Q|C|P|K|R|MT|V):[a-z_]", text.replace('"V:setting:', '"')),
                              f"{f.name} names a knowledge item")

    def test_acquisition_proposes_no_verdict(self):
        st, _ = build(docu([M8Reuse.T]))
        forms = {c.body.get("form") for c in st.of("content") if c.provenance.get("source") == "acquisition service"}
        self.assertLessEqual(forms, {"quantity", "attribution", "relation"})
