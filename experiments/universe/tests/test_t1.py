"""T-1 W3/W4 tests (T1: constructed fixtures, mechanics only) on a domain never used in design: laboratory chemistry
and pharmacology. Each principle is tested on a positive case and a counterexample; metamorphic variants rename the
concepts (`pee-scientific-learning` §3.4)."""
import pathlib
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(HERE), str(HERE.parent / "s1core")]

from universe import acquisition, knowledge_acquisition as ka, loader, markdown, propositions, rules  # noqa: E402
from universe.store import Store  # noqa: E402

DOC = """# Laboratory practice

## 1. Titration

A titration establishes the acid concentration. There is no safe threshold for lead exposure. Phenolphthalein indicators are not only cheap but also stable. [L1] [L2]

If the burette has no calibration record, repeat the blank. Avoid pipetting by mouth. Record the volume, rinse the flask, do not reuse the indicator.

Interim results should not be reported as final. A validated method must use certified reference materials.

## 2. Assay procedure

1. Measure the pH with two buffers.
2. Always check the seal.

## 3. PROPOSED stability protocol

Store samples at 4 °C. The current method is not an ISO standard.

## 4. Worked examples

E1: A supplier promises a shelf life of 24 months.

## 5. Field notes

Field studies across wetlands with seasonal sampling.

## References

[L1] Example Handbook, 2020.

[L2] Example Review, 2021.
"""


def store():
    st = Store()
    loader.load_general_knowledge(st, legacy=False)
    return st


def read(text):
    st = store()
    lex = acquisition.Lexicon(st)
    doc = markdown.read(text, "document:t1", "holder")
    return st, lex, doc, propositions.read_propositions(doc, lex)["units"]


def clause(text, **ctx):
    st = store()
    fr = propositions.Frame(acquisition.Lexicon(st))
    out = []
    for s in propositions.sentences(text):
        for cl in propositions._clauses(fr, s):
            out += [c for c in propositions.read_clause(fr, cl, dict({"previous": None, "heading": None}, **ctx))
                    if not c.get("unresolved")]
    return out


class Negation(unittest.TestCase):
    def test_coordinated_imperatives_keep_their_own_polarity(self):
        c = clause("Record the dose, check renal function, do not exceed the daily limit.")
        self.assertEqual([x["relation"] for x in c], ["recommends", "recommends", "other:prohibits"])
        self.assertTrue(all(x["polarity"] == "affirmed" for x in c))

    def test_negative_verb_is_one_operator(self):
        for t in ("Avoid pipetting by mouth.", "Avoid heating sealed vessels."):  # metamorphic renaming
            c = clause(t)[0]
            self.assertEqual((c["relation"], c["polarity"]), ("other:prohibits", "affirmed"))
            self.assertNotIn("avoid", c["subject"].lower())

    def test_negation_in_a_fronted_condition_stays_there(self):
        c = clause("If the assay differs from the reference method, do not discard the sample.")[0]
        self.assertEqual((c["relation"], c["polarity"]), ("other:prohibits", "affirmed"))
        self.assertEqual(c["conditions"][0]["marker"], "if")

    def test_negative_determiner_anywhere(self):
        c = clause("There is no safe threshold for lead exposure.")[0]
        self.assertEqual((c["relation"], c["polarity"]), ("occurs", "negated"))

    def test_additive_not_only_is_not_a_negation(self):
        c = clause("The method requires not only calibration but also blanks.")[0]
        self.assertEqual(c["polarity"], "affirmed")

    def test_but_without_negation_is_not_a_flip(self):
        c = clause("Bone density remains stable but fracture risk may differ.")
        self.assertTrue(all(x["polarity"] == "affirmed" for x in c))

    def test_contrast_after_negation_still_flips(self):  # counterexample: the A-1 contrast rule is preserved
        c = clause("Organic matter is not a fertiliser, but a soil conditioner.")
        self.assertEqual({(x["object"], x["polarity"]) for x in c},
                         {("fertiliser", "negated"), ("soil conditioner", "affirmed")})


class Force(unittest.TestCase):
    def test_declarative_modals(self):
        self.assertEqual(clause("A validated method must use certified reference materials.")[0]["relation"],
                         "requires")
        self.assertEqual(clause("Interim results should not be reported as final.")[0]["relation"],
                         "other:prohibits")
        self.assertEqual(clause("Laboratories should keep duplicate records.")[0]["relation"], "recommends")

    def test_advice_is_a_recommendation_for_the_user(self):
        c = clause("For pregnant patients, choose a lower dose.")[0]
        self.assertEqual((c["relation"], c["norm_bearer"]), ("recommends", "user"))
        self.assertEqual(c["conditions"][0]["marker"], "for")

    def test_procedural_step_without_necessity_is_uncertain(self):
        c = clause("Measure the pH with two buffers.", procedural=True, heading="assay procedure")[0]
        self.assertEqual((c["relation"], c["norm_bearer"], c["states"]), ("uncertain", "procedure",
                                                                         {"relation": "uncertain"}))

    def test_a_directive_verb_outside_the_frame_is_not_read(self):  # a known limit, kept visible
        self.assertEqual(clause("Calibrate the pH meter with two buffers.", procedural=True), [])

    def test_procedural_step_with_necessity_binds_the_procedure(self):
        c = clause("Always check the seal.", procedural=True, heading="assay procedure")[0]
        self.assertEqual((c["relation"], c["subject"], c["norm_bearer"]), ("requires", "assay procedure", "procedure"))


class Structure(unittest.TestCase):
    def test_no_verb_is_invented_in_a_telegraphic_item(self):
        self.assertEqual(clause("Field studies across wetlands with seasonal sampling."), [])

    def test_an_auxiliary_still_finds_its_verb_past_an_adverb(self):
        c = clause("The amplifier cannot safely drive low impedances.")[0]
        self.assertEqual((c["relation"], c["polarity"]), ("other:drive", "negated"))

    def test_reporting_participle_is_not_a_reporter(self):
        c = clause("Case reports observed in one clinic are not evidence of incidence.")
        self.assertFalse(any(x.get("reported_by") for x in c))
        c = clause("WHO guidance shows that noise exposure increases hearing loss.")[0]  # counterexample
        self.assertEqual(c["reported_by"], "WHO guidance")

    def test_sentence_split_before_a_quote(self):
        self.assertEqual(len(propositions.sentences("X is not the same as Y. 'Z' does not guarantee W.")), 2)


class Document(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.st, cls.lex, cls.doc, cls.u = read(DOC)

    def find(self, rel, word):
        return [x for x in self.u if x["relation"] == rel and word in (x["subject"] or "").lower() + " " +
                (x["object"] or "").lower()]

    def test_citation_block_is_cited_context_not_attribution(self):
        t = self.find("establishes", "titration")[0]
        self.assertEqual(t["cited_sources"], ["L1", "L2"])
        self.assertEqual(t["attributed_to"], [])

    def test_proposal_marker_governs_procedure_only(self):
        store_ = [x for x in self.u if "samples" in (x["subject"] or "").lower() + (x["object"] or "").lower()]
        self.assertTrue(store_ and all(x["document_attitude"] == "proposed" for x in store_))
        iso = self.find("is_a", "iso")[0]
        self.assertEqual(iso["document_attitude"], "asserted")

    def test_unmarked_ordered_procedure_is_not_asserted(self):
        cal = [x for x in self.u if "measure the ph" in ((x["subject"] or "") + " " + (x["object"] or "")).lower()]
        self.assertTrue(cal)
        self.assertTrue(all(x["document_attitude"] != "asserted" for x in cal))

    def test_illustrative_case(self):
        e = [x for x in self.u if x.get("statement_status") == "illustrative_example"]
        self.assertTrue(e)

    def test_represented_and_not_licensed(self):
        st = self.st
        ka.represent(st, ka.read_units(self.doc, self.lex) + self.u, "document:t1", "holder", self.lex)
        props = rules.propositions(st)
        ind = [p for p in props if p.body.get("indeterminate")]
        self.assertTrue(ind)
        self.assertFalse(any(rules._licensed(st, p) for p in ind))
        ill = [p for p in props if any(a.body.get("statement_status") == "illustrative_example"
                                       for a in rules.attributions(st, p.id))]
        self.assertTrue(ill and not any(rules._licensed(st, p) for p in ill))
        cited = [a for p in props for a in rules.attributions(st, p.id) if a.body.get("cited_context")]
        self.assertTrue(cited)
        self.assertTrue(any(rules._licensed(st, p) for p in props))  # ordinary assertions still license


if __name__ == "__main__":
    unittest.main()


class Recognition(unittest.TestCase):
    """W5: identity-preserving variants only (S0 3.6: a narrower or broader term names another concept)."""

    @classmethod
    def setUpClass(cls):
        cls.st, cls.lex, cls.doc, cls.u = read(DOC)
        ka.represent(cls.st, ka.read_units(cls.doc, cls.lex) + cls.u, "document:t1", "holder", cls.lex)

    def test_of_inversion_and_hyphens(self):
        from universe import recognition
        base = recognition.designate(self.st, "acid concentration", approximate=False)
        self.assertTrue(base)
        self.assertEqual(recognition.designate(self.st, "concentration of the acid", approximate=False), base)
        self.assertEqual(recognition.designate(self.st, "acid-concentration", approximate=False), base)

    def test_narrower_term_is_not_the_held_concept(self):
        from universe import recognition
        self.assertFalse(recognition.designate(self.st, "free acid concentration of seawater", approximate=False))
