"""Safety invariants for the S0 executor, written before the reasoning rules.

Two classes of test are kept apart:

* ``Integrity*`` classes check logical and data-integrity properties: traces exist and point to real inputs,
  statuses come from the closed set, no closed-world negatives, identity is reflexive and symmetric, and
  inconsistent identity sets are never merged. These do not depend on any scientific interpretation.
* ``Interpretation*`` classes check outputs whose expected value was chosen by the programmer (Claude) from
  reading S0. They show the rules behave as intended. They are NOT independent validation.
"""
import itertools
import unittest

from s0exec import inputs, model, queries, identity

STATUSES = {"SUPPORTED", "NOT_ESTABLISHED", "UNRESOLVED", "REFUSED"}


def all_queries(kb, subject):
    """Run every query type over every quantity, mode and condition present in the KB.

    The combinations are generated from the data, not written by hand."""
    out = []
    qs = sorted({s.quantity for s in kb.statements if s.quantity})
    modes = sorted({s.conditions.get("mode") for s in kb.statements if s.conditions.get("mode")} | {"night"})
    conds = [dict(s.conditions) for s in kb.statements if s.conditions]
    for q in qs:
        for c in conds + [{"temperature_C": 21.5}, {}]:
            out.append(queries.value_at(kb, subject, q, c))
        for m in modes:
            out.append(queries.performance_in_mode(kb, subject, q, m))
        for var in sorted({k for c in conds for k in c}):
            out.append(queries.causal_effect(kb, subject, q, var))
    for unit in sorted(model.UNIT_DIMENSION) + ["mol/s"]:
        out.append(queries.derive(kb, subject, unit))
    ids = [s.id for s in kb.statements]
    for a, b in itertools.permutations(ids, 2):
        out.append(queries.same_condition(kb, a, b))
    out.extend(queries.evaluation_status(kb, subject))
    return out


class IntegrityTrace(unittest.TestCase):
    def setUp(self):
        self.kb = model.KB(inputs.review_statements())
        self.results = all_queries(self.kb, inputs.SUBJECT)

    def test_status_closed_set(self):
        for c in self.results:
            self.assertIn(c.status, STATUSES, c)

    def test_every_conclusion_has_trace_to_real_inputs_and_registered_rules(self):
        ids = {s.id for s in self.kb.statements}
        for c in self.results:
            self.assertTrue(c.rules, c)
            for r in c.rules:
                self.assertIn(r, queries.RULES, c)
            for g in c.grounds:
                self.assertIn(g, ids, c)

    def test_supported_quantity_conclusions_never_grounded_on_evaluation_function_or_gap(self):
        kinds = {s.id: s.kind for s in self.kb.statements}
        for c in self.results:
            if c.status == "SUPPORTED" and c.about == "quantity":
                for g in c.grounds:
                    self.assertEqual(kinds[g], "quantity", c)

    def test_no_closed_world_negative(self):
        # S0 4.10 / C11: absence is never read as negation. No conclusion may assert a negative finding.
        for c in self.results:
            self.assertFalse(c.negative, c)

    def test_inputs_not_mutated(self):
        before = [s.as_tuple() for s in self.kb.statements]
        all_queries(self.kb, inputs.SUBJECT)
        self.assertEqual(before, [s.as_tuple() for s in self.kb.statements])


class IntegrityProvenance(unittest.TestCase):
    def test_classification_follows_declared_method_only(self):
        for s in inputs.review_statements():
            cls = model.classify(s)
            if s.kind == "quantity" and s.method == "rated":
                self.assertEqual(cls, "specification")
            if s.kind == "quantity" and s.method == "measured":
                self.assertEqual(cls, "observation")
            if s.kind == "evaluation":
                self.assertEqual(cls, "evaluation")
            if s.kind == "function":
                self.assertEqual(cls, "function")
            if s.kind == "gap":
                self.assertEqual(cls, "gap")

    def test_no_statement_is_adopted(self):
        # S0 6.1 attribution before adoption: every input keeps its holder; nothing is adopted by the program.
        for s in inputs.review_statements():
            self.assertTrue(s.holder)
            self.assertEqual(model.standing(s), "attributed")


class IntegrityIdentity(unittest.TestCase):
    def concepts(self):
        """Deterministic enumeration of small concept descriptions (anchors, goals by level, paradigm cases)."""
        anchors = [frozenset({"a1"}), frozenset({"a2"}), frozenset({"a1", "a2"})]
        goals = [frozenset({"g"}), frozenset({"g", "h"}), frozenset({"g", "k"}), frozenset({"m"})]
        out = []
        for i, (an, gs) in enumerate(itertools.product(anchors, goals)):
            out.append(identity.Concept(f"c{i}", category="quantity", paradigm=an,
                                        goals={"specific": gs, "general": frozenset({"G"})}))
        return out

    def test_reflexive_both_versions(self):
        for v in ("2.0", "2.1"):
            for c in self.concepts():
                self.assertIn("same", identity.verdicts(v, c, c), (v, c))

    def test_symmetric_both_versions(self):
        cs = self.concepts()
        for v in ("2.0", "2.1"):
            for a, b in itertools.combinations(cs, 2):
                self.assertEqual(identity.verdicts(v, a, b), identity.verdicts(v, b, a), (v, a, b))

    def test_merge_never_unites_a_set_that_fails_transitivity(self):
        cs = self.concepts()
        for v in ("2.0", "2.1"):
            for triple in itertools.combinations(cs, 3):
                report = identity.check_consistency(v, list(triple))
                groups = identity.safe_merge(v, list(triple))
                if report["violations"] or report["ambiguous_pairs"]:
                    self.assertTrue(all(len(g) == 1 for g in groups), (v, triple, report))


class InterpretationReviewQuestions(unittest.TestCase):
    """Expected answers chosen by the programmer from S0. Not independent validation."""

    def setUp(self):
        self.kb = model.KB(inputs.review_statements())
        self.S = inputs.SUBJECT

    def test_rated_value_not_asserted_outside_stated_conditions(self):
        c = queries.value_at(self.kb, self.S, "extraction_rate", {"temperature_C": 21.5})
        self.assertEqual(c.status, "NOT_ESTABLISHED")

    def test_rated_value_supported_as_attributed_at_its_own_conditions(self):
        c = queries.value_at(self.kb, self.S, "extraction_rate", {"temperature_C": 30, "rh_percent": 80})
        self.assertEqual(c.status, "SUPPORTED")
        self.assertIn("specification", c.claim)

    def test_humidity_drop_does_not_establish_volume_rate(self):
        c = queries.derive(self.kb, self.S, "L/day", exclude_quantities={"extraction_rate"})
        self.assertEqual(c.status, "NOT_ESTABLISHED")

    def test_function_does_not_establish_measured_quietness(self):
        c = queries.performance_in_mode(self.kb, self.S, "sound_level", "night")
        self.assertEqual(c.status, "UNRESOLVED")
        self.assertFalse(c.negative)

    def test_different_modes_are_not_the_same_condition(self):
        ids = {s.quantity_mode(): s.id for s in self.kb.statements if s.quantity == "sound_level"}
        c = queries.same_condition(self.kb, ids[("sound_level", "normal")], ids[("sound_level", "smart_laundry")])
        self.assertEqual(c.status, "REFUSED")

    def test_two_rated_points_do_not_isolate_temperature(self):
        c = queries.causal_effect(self.kb, self.S, "extraction_rate", "temperature_C")
        self.assertEqual(c.status, "UNRESOLVED")
        self.assertFalse(c.details.get("isolated_contrast"))

    def test_evaluation_is_incomplete_and_not_a_measurement(self):
        evs = queries.evaluation_status(self.kb, self.S)
        self.assertTrue(evs)
        for c in evs:
            self.assertEqual(c.about, "evaluation")
            self.assertIn("criterion", c.details["missing"])


class InterpretationIdentityCounterexample(unittest.TestCase):
    """The known S0 2.1 inclusion-rule chain (review of 2.0 vs 2.1, section 4.2)."""

    def triple(self):
        P = frozenset({"p1", "p2"})
        mk = lambda n, g: identity.Concept(n, "quantity", P, {"specific": frozenset(g), "general": frozenset({"G"})})
        return mk("A", {"g", "h"}), mk("B", {"g"}), mk("C", {"g", "k"})

    def test_v21_chain_detected_and_not_merged(self):
        A, B, C = self.triple()
        self.assertEqual(identity.verdicts("2.1", A, B), {"same"})
        self.assertEqual(identity.verdicts("2.1", B, C), {"same"})
        self.assertEqual(identity.verdicts("2.1", A, C), {"indeterminate"})
        rep = identity.check_consistency("2.1", [A, B, C])
        self.assertTrue(rep["violations"])
        self.assertTrue(all(len(g) == 1 for g in identity.safe_merge("2.1", [A, B, C])))

    def test_v20_reports_ambiguity_instead_of_a_unique_verdict(self):
        A, B, C = self.triple()
        self.assertGreater(len(identity.verdicts("2.0", A, B)), 1)


class InterpretationVariations(unittest.TestCase):
    """Same generic rules on changed inputs; no code changes between runs."""

    def test_other_numbers_labels_and_quantity_names(self):
        kb = model.KB(inputs.variant_statements())
        S = inputs.VARIANT_SUBJECT
        self.assertEqual(queries.value_at(kb, S, "moisture_flux", {"temperature_C": 15}).status, "NOT_ESTABLISHED")
        self.assertEqual(queries.value_at(kb, S, "moisture_flux", {"temperature_C": 35, "rh_percent": 70}).status,
                         "SUPPORTED")
        self.assertEqual(queries.performance_in_mode(kb, S, "acoustic_emission", "eco").status, "UNRESOLVED")

    def test_omitted_conditions_never_support_a_conditioned_query(self):
        kb = model.KB(inputs.variant_statements())
        c = queries.value_at(kb, inputs.VARIANT_SUBJECT, "unconditioned_capacity", {"temperature_C": 20})
        self.assertEqual(c.status, "UNRESOLVED")

    def test_reversed_comparison_same_status(self):
        kb = model.KB(inputs.review_statements())
        ids = [s.id for s in kb.statements]
        for a, b in itertools.permutations(ids, 2):
            self.assertEqual(queries.same_condition(kb, a, b).status, queries.same_condition(kb, b, a).status)

    def test_unknown_unit_refused(self):
        kb = model.KB(inputs.variant_statements())
        self.assertEqual(queries.derive(kb, inputs.VARIANT_SUBJECT, "furlong/fortnight").status, "UNRESOLVED")

    def test_isolated_contrast_flagged_but_causation_still_unresolved(self):
        kb = model.KB(inputs.variant_statements())
        c = queries.causal_effect(kb, inputs.VARIANT_SUBJECT, "moisture_flux", "temperature_C")
        self.assertTrue(c.details.get("isolated_contrast"))
        self.assertEqual(c.status, "UNRESOLVED")


if __name__ == "__main__":
    unittest.main()
