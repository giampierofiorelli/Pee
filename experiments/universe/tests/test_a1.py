"""A-1 tests (T1: constructed fixtures, mechanics only) on a domain never used in design: soil water.

Reader, coverage ledger, representation and integration, persistence and the retention guard, the document
lifecycle, and the rule services over propositions, including the evidence requirement.
"""
import hashlib
import pathlib
import sys
import tempfile
import unittest
import zipfile

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(HERE), str(HERE.parent / "s1core")]

from universe import (acquisition, assimilate, knowledge_acquisition as ka, loader, markdown,  # noqa: E402
                      persist, propositions, recognition, rules)
from universe.store import Item, Store  # noqa: E402

DOC = """# Soil water

## 1. Infiltration

Soil compaction reduces infiltration rate. Infiltration rate increases groundwater recharge. Surface runoff rises as infiltration rate falls. Mulch does not affect soil salinity. It also lowers evaporation [S1].

Organic matter is not a fertiliser, but a soil conditioner.

Heavy rainfall can cause surface runoff when the soil is saturated.

## 2. Field protocol

PROPOSED protocol: measure infiltration rate with a double-ring infiltrometer. Do not irrigate during the test.

## 3. Open questions

The effect of biochar on infiltration rate is not established.

## 4. Values

The field capacity of loam is about 30%. A meta-analysis reported an odds ratio of 1.5 (95% CI 1.2–1.9) [S2].

## References

[S1] Example Soil Survey, 2020.

[S2] Example Review, 2021.
"""

SECOND = """# Notes

Soil compaction reduces infiltration rate.
"""


def store():
    st = Store()
    loader.load_general_knowledge(st, legacy=False)
    return st


def read(text=DOC, url="document:soil"):
    st = store()
    lex = acquisition.Lexicon(st)
    doc = markdown.read(text, url, "fixture author")
    return st, lex, doc, propositions.read_propositions(doc, lex)


def claims(units, subject=None, relation=None):
    return [u for u in units if (subject is None or u["subject"].lower() == subject)
            and (relation is None or u["relation"] == relation)]


class Reader(unittest.TestCase):
    def setUp(self):
        self.st, self.lex, self.doc, self.r = read()
        self.u = self.r["units"]

    def test_causal_claims_and_direction(self):
        self.assertTrue(claims(self.u, "soil compaction", "decreases"))
        self.assertTrue(claims(self.u, "infiltration rate", "increases"))

    def test_change_verbs_read_as_signed_influence(self):
        c = [x for x in self.u if x["subject"].lower() == "infiltration rate" and x["object"]
             and x["object"].lower() == "surface runoff"]
        self.assertEqual([x["relation"] for x in c], ["decreases"])

    def test_negation_and_anaphora(self):
        neg = claims(self.u, "mulch", "affects")
        self.assertEqual(neg[0]["polarity"], "negated")
        ana = [x for x in self.u if x.get("resolution")]
        self.assertTrue(any(x["resolution"]["resolved_to"].lower() == "mulch" and x["relation"] == "decreases"
                            for x in ana))

    def test_contrast_gives_both_polarities(self):
        c = claims(self.u, "organic matter", "is_a")
        self.assertEqual({(x["object"], x["polarity"]) for x in c}, {("fertiliser", "negated"),
                                                                     ("soil conditioner", "affirmed")})

    def test_modality_and_conditions(self):
        c = claims(self.u, "heavy rainfall", "causes")[0]
        self.assertEqual(c["modality"], "possible")
        self.assertTrue(c["conditions"] and c["conditions"][0]["value"] == "when")

    def test_proposal_and_prohibition(self):
        norms = [x for x in self.u if x["content_kind"] == "norm"]
        self.assertTrue(norms and all(x["document_attitude"] == "proposed" for x in norms))
        # T-1 (W2 D5): a prohibition is the controlled form `other: prohibits`, affirmed, never a negated norm
        self.assertTrue(any(x["relation"] == "other:prohibits" and x["polarity"] == "affirmed"
                            and "irrigate" in x["subject"].lower() for x in norms))
        self.assertFalse(any(x["polarity"] == "negated" and x["relation"] == "recommends" for x in norms))

    def test_unknown_is_kept_as_unknown(self):
        self.assertTrue(any(x["content_kind"] == "unknown" for x in self.u))

    def test_values_with_confidence_interval(self):
        v = [x for x in self.u if x["relation"] == "has_value"]
        self.assertTrue(any(x["value"].get("ci95") == [1.2, 1.9] for x in v))
        self.assertTrue(any(x["value"].get("unit") == "%" and x["value"].get("number") == 30.0 for x in v))

    def test_ledger_accounts_every_sentence_without_text(self):
        led = self.r["ledger"]
        n = sum(1 for _, _, t, _ in propositions._segments(self.doc) for s in propositions.sentences(t)
                if propositions.WORD.search(propositions._strip_cites(s)[0]))
        self.assertEqual(len(led), n)
        self.assertTrue(all(e["status"] in ("acquired", "partial", "unresolved") for e in led))
        self.assertFalse(any("text" in e for e in led))


class ChangeCycle(unittest.TestCase):
    """C1-C3, added after the A-1 first run (REPORT section 6)."""

    def test_concept_names_are_short_in_characters(self):
        long = "Extraordinarilylongcompoundedterminology " * 4 + "reduces infiltration rate."
        st, lex, doc, r = read("# T\n\n" + long)
        self.assertTrue(r["units"])
        self.assertTrue(all(len(u["subject"]) <= propositions.MAX_CHARS for u in r["units"]))

    def test_ledger_never_keeps_word_order(self):
        st, lex, doc, r = read()
        for e in r["ledger"]:
            if e.get("unexplained"):
                self.assertEqual(e["unexplained"], sorted(set(e["unexplained"])))

    def test_reported_guidance_has_guidance_evidence(self):
        st, lex, doc, r = read("# T\n\nThe national guidance states that ventilation reduces condensation.")
        u = [x for x in r["units"] if x["relation"] == "decreases"]
        self.assertEqual(u[0]["document_attitude"], "reported")
        self.assertEqual(u[0]["evidence_kind"], "E:guidance")


class Representation(unittest.TestCase):
    def setUp(self):
        self.st = store()
        lex = acquisition.Lexicon(self.st)
        self.s1 = ka.acquire_knowledge(self.st, markdown.read(DOC, "document:soil", "fixture author"), lex,
                                       propositions=True)

    def test_propositions_have_attributions_with_attitude_and_evidence(self):
        self.assertTrue(self.s1["propositions"])
        for a in self.s1["proposition_attributions"]:
            b = self.st.get(a).body
            self.assertIn(b["attitude"], ("asserted", "proposed", "hypothesised", "questioned", "reported"))
            self.assertFalse(b["cited_sources_examined"])

    def test_records_keep_no_statement_text(self):
        recs = [r for r in self.st.of("record", form="document statement")]
        self.assertTrue(recs)
        self.assertFalse(any("text" in r.body for r in recs))

    def test_restated_claim_is_integrated_not_duplicated(self):
        lex = acquisition.Lexicon(self.st)
        before = len(self.st.of("content", form="proposition"))
        s2 = ka.acquire_knowledge(self.st, markdown.read(SECOND, "document:notes", "fixture author"), lex,
                                  propositions=True)
        self.assertEqual(len(self.st.of("content", form="proposition")), before)
        pid = s2["restated"][0]
        self.assertEqual(len(rules.attributions(self.st, pid)), 2)

    def test_ledger_record(self):
        rec = self.st.get(self.s1["ledger_record"]).body
        self.assertEqual(rec["form"], "assimilation ledger")
        self.assertEqual(sum(rec["counts"].values()), rec["sentences"])


class Persistence(unittest.TestCase):
    def test_round_trip_and_retention_guard(self):
        st = store()
        ka.acquire_knowledge(st, markdown.read(DOC, "document:soil", "fixture author"), acquisition.Lexicon(st),
                             propositions=True)
        with tempfile.TemporaryDirectory() as d:
            path = pathlib.Path(d) / "u.gz"
            man = persist.save(st, path, documents=[DOC])
            self.assertTrue(man["retention"]["passed"])
            self.assertTrue(persist.same(persist.load(path), st))
            # a store holding a passage of the document is refused
            st.acquire(Item("R:leak", "record", {"form": "document statement", "note": DOC[30:400]},
                            {"source": "x", "holder": "y", "basis": "document statement"}))
            with self.assertRaises(persist.RetentionError):
                persist.save(st, pathlib.Path(d) / "v.gz", documents=[DOC])
            self.assertFalse((pathlib.Path(d) / "v.gz").exists())

    def test_tampered_snapshot_is_refused(self):
        st = store()
        with tempfile.TemporaryDirectory() as d:
            path = pathlib.Path(d) / "u.gz"
            persist.save(st, path)
            path.write_bytes(path.read_bytes() + b"\0")
            with self.assertRaises(ValueError):
                persist.load(path)


class Lifecycle(unittest.TestCase):
    def test_working_copy_removed_original_unchanged(self):
        with tempfile.TemporaryDirectory() as d:
            z = pathlib.Path(d) / "orig.zip"
            with zipfile.ZipFile(z, "w") as zf:
                zf.writestr("soil.md", DOC)
            before = hashlib.sha256(z.read_bytes()).hexdigest()
            st = store()
            rec, text = assimilate.assimilate(st, z, "fixture author", pathlib.Path(d) / "work", member="soil.md")
            self.assertTrue(rec["audit"]["every_sentence_accounted"])
            self.assertTrue(pathlib.Path(rec["working_copy"]).exists())
            res = assimilate.complete(st, [rec], [text], pathlib.Path(d) / "u.gz",
                                      {rec["document"]: (z, "soil.md")})
            self.assertTrue(res["ok"])
            self.assertFalse(pathlib.Path(rec["working_copy"]).exists())
            self.assertEqual(hashlib.sha256(z.read_bytes()).hexdigest(), before)
            loaded = persist.load(pathlib.Path(d) / "u.gz")
            cust = loaded.of("record", form="document custody")
            self.assertTrue(cust and cust[0].body["working_copy_removed"] and cust[0].body["original_unchanged"])


class Rules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.st = store()
        ka.acquire_knowledge(cls.st, markdown.read(DOC, "document:soil", "fixture author"),
                             acquisition.Lexicon(cls.st), propositions=True)

    def d(self, term):
        return recognition.designate(self.st, term)

    def test_direct_and_chain_influence(self):
        self.assertEqual(rules.influence(self.st, self.d("soil compaction"), self.d("infiltration rate"))["answer"],
                         "decreases")
        r = rules.influence(self.st, self.d("soil compaction"), self.d("groundwater recharge"))
        self.assertEqual((r["answer"], r["inference"]), ("decreases", "chain"))
        self.assertEqual(rules.influence(self.st, self.d("soil compaction"), self.d("surface runoff"))["answer"],
                         "increases")

    def test_negated_effect_and_contrary_claims(self):
        self.assertEqual(rules.influence(self.st, self.d("mulch"), self.d("soil salinity"))["answer"], "no effect")
        self.assertEqual(rules.holds(self.st, self.d("organic matter"), "is_a", self.d("fertiliser"))["answer"], "no")
        self.assertEqual(rules.consistent(self.st, self.d("organic matter"), "is_a", self.d("soil conditioner"),
                                          "negated")["answer"], "conflicts")

    def test_a_proposal_licenses_nothing(self):
        ps = [p for p in rules.propositions(self.st) if rules.attitudes(self.st, p.id) == {"proposed"}]
        self.assertTrue(ps)
        self.assertFalse(any(rules._licensed(self.st, p) for p in ps))

    def test_evidence_requirement(self):
        st = store()
        src = {"source": "s", "holder": "h", "basis": "document statement"}
        st.acquire(Item("A:1", "content", {"form": "attribution", "reports": "R:1", "evidence": "declared"}, src))
        st.acquire(Item("A:2", "content", {"form": "attribution", "reports": "R:2", "evidence": "measured"}, src))
        c1 = Item("C:1", "content", {"form": "quantity", "interprets": "R:1"}, src)
        c2 = Item("C:2", "content", {"form": "quantity", "interprets": "R:2"}, src)
        self.assertFalse(rules.satisfies_evidence(st, c1, "measured"))
        self.assertTrue(rules.satisfies_evidence(st, c2, "measured"))


if __name__ == "__main__":
    unittest.main()
