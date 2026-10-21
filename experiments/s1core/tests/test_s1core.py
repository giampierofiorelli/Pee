"""Tests for the S1 model-based inference core.

* ``Integrity*`` classes check properties that do not depend on any scientific reading: acquisition validation,
  traceability, determinism, invariance under renaming, unit changes and item order, and absence of example
  vocabulary in the mechanism.
* ``Regression*`` classes were added in the architectural correction. Each one fixes a defect demonstrated on the
  code at commit dfa16d9: applicability scope, inheritance, provenance and standing, mutation after acquisition,
  premises and assumptions, and combination of evidence.
* ``Interpretation*`` classes check outcomes whose expected values the developer (Claude) computed by hand. They are
  development-level (T1) tests on examples chosen by the developer, NOT independent validation and not evidence of
  scientific generality.
"""
import dataclasses
import pathlib
import random
import re
import unittest

from s1core import infer, knowledge as K
from s1core.examples import build_kb, given, later_acquisitions, situations

STATUSES = {"SUPPORTED", "UNRESOLVED", "REFUSED", "CONFLICT"}

QUERIES = [  # (situation, role, kind)
    ("silt_20C", "particle", "speed"), ("silt_20C", "particle", "travel_time"),
    ("coarse_sand_20C", "particle", "speed"), ("fine_sand_20C", "particle", "speed"),
    ("silt_10C", "particle", "speed"), ("silt_no_temperature", "particle", "speed"),
    ("fog_droplet", "particle", "speed"), ("fog_droplet_no_pressure", "particle", "speed"),
    ("microfibre", "particle", "speed"), ("grain_sizing", "particle", "radius"),
    ("cs137_soil", "population", "remaining_fraction"), ("caffeine_adult", "population", "remaining_fraction"),
    ("caffeine_adult_unmeasured", "population", "remaining_fraction"),
    ("caffeine_neonate", "population", "remaining_fraction"), ("ethanol_saturated", "population", "remaining_fraction"),
]


def run(kb, sits, q):
    s, role, kind = q
    return infer.infer(kb, sits[s], role, kind)


def snapshot(kb, sits):
    out = []
    for q in QUERIES:
        o = run(kb, sits, q)
        iv = (round(o.interval.lo, 12), round(o.interval.hi, 12)) if o.interval else None
        out.append((o.status, iv))
    return out


def sit_ids(sit):
    return {x.id for x in tuple(sit.givens) + tuple(sit.assumptions)}


class IntegrityAcquisition(unittest.TestCase):
    def test_dimensionally_wrong_model_form_is_rejected(self):
        kb = build_kb()
        bad = dataclasses.replace(kb.items["M-stokes"], id="M-bad", forms={"v": "2*(rho_p-rho_f)*g*r/(9*mu)"})
        with self.assertRaises(K.AcquisitionError):
            kb.add(bad)

    def test_value_with_unit_of_wrong_dimension_is_rejected(self):
        kb = build_kb()
        with self.assertRaises(K.AcquisitionError):
            kb.add(dataclasses.replace(kb.items["V-water-viscosity-20C"], id="V-bad", unit="m/s"))

    def test_unknown_unit_and_duplicate_id_rejected(self):
        kb = build_kb()
        v = kb.items["V-water-viscosity-20C"]
        with self.assertRaises(K.AcquisitionError):
            kb.add(dataclasses.replace(v, id="V-bad2", unit="furlong"))
        with self.assertRaises(K.AcquisitionError):
            kb.add(v)

    def test_form_using_undeclared_variable_rejected(self):
        kb = build_kb()
        with self.assertRaises(K.AcquisitionError):
            kb.add(dataclasses.replace(kb.items["M-stokes"], id="M-bad3", forms={"v": "2*(rho_p-rho_f)*g*r^2/(9*nu)"}))


class IntegrityTrace(unittest.TestCase):
    def setUp(self):
        self.kb, self.sits = build_kb(), situations()

    def test_closed_status_set_and_grounds_are_real_premises(self):
        for q in QUERIES:
            o = run(self.kb, self.sits, q)
            self.assertIn(o.status, STATUSES, q)
            self.assertTrue(o.trace, q)
            for g in o.grounds:
                self.assertTrue(g in self.kb.items or g in sit_ids(self.sits[q[0]]) or g.startswith("scope:"), (q, g))
            if o.status == "SUPPORTED":
                self.assertIsNotNone(o.interval, q)
                self.assertTrue(o.grounds, q)
            else:
                self.assertTrue(o.reasons, q)

    def test_unresolved_outcomes_name_what_is_missing(self):
        for q in QUERIES:
            o = run(self.kb, self.sits, q)
            if o.status == "UNRESOLVED":
                self.assertTrue(o.needs, q)

    def test_deterministic_and_independent_of_item_order(self):
        base = snapshot(self.kb, self.sits)
        self.assertEqual(base, snapshot(build_kb(), situations()))
        items = list(self.kb.items.values())
        for seed in range(5):
            random.Random(seed).shuffle(items)
            kinds = [i for i in items if isinstance(i, K.QuantityKind)]
            rest = [i for i in items if not isinstance(i, K.QuantityKind)]
            self.assertEqual(base, snapshot(K.KB(kinds + rest), self.sits), seed)


class IntegrityGenerality(unittest.TestCase):
    def test_mechanism_contains_no_example_vocabulary(self):
        words = ["water", "air", "quartz", "silt", "sand", "stokes", "caffeine", "ethanol", "cs-137", "caesium",
                 "droplet", "fibre", "viscosity", "density", "half_life", "radius", "particle", "fluid"]
        pkg = pathlib.Path(__file__).resolve().parent.parent / "s1core"
        for f in pkg.glob("*.py"):
            if f.name == "examples.py":
                continue
            text = f.read_text().lower()
            for w in words:
                self.assertIsNone(re.search(r"\b" + re.escape(w) + r"\b", text), (f.name, w))

    def test_invariant_under_consistent_renaming(self):
        kb, sits = build_kb(), situations()
        keys = ("id", "bearer", "kind", "name", "entity", "target", "value")
        names = set()
        every = list(kb.items.values()) + [x for s in sits.values() for x in tuple(s.givens) + tuple(s.assumptions)]
        for it in every:
            for f in dataclasses.fields(it):
                if f.name in keys and isinstance(getattr(it, f.name), str):
                    names.add(getattr(it, f.name))
        for s in sits.values():
            names |= set(s.roles) | set(s.roles.values())
        mapping = {n: f"z{i:03d}" for i, n in enumerate(sorted(names))}
        r = lambda x: mapping.get(x, x) if isinstance(x, str) else x

        def conds(c):
            return None if c is None else {r(k): (r(v) if isinstance(v, str) else v) for k, v in c.items()}

        def ren(it):
            ch = {}
            for f in dataclasses.fields(it):
                val = getattr(it, f.name)
                if f.name in keys:
                    ch[f.name] = r(val)
                elif f.name == "conditions" and val is not None and not isinstance(val, tuple):
                    ch[f.name] = conds(val)
                elif f.name == "variables":
                    ch[f.name] = {s: (r(role), r(kd)) for s, (role, kd) in val.items()}
                elif f.name == "requirements":
                    ch[f.name] = tuple(K.Requirement(r(q.role), r(q.name), r(q.value)) for q in val)
            return dataclasses.replace(it, **ch)

        kb2 = K.KB([ren(i) for i in kb.items.values()])
        sits2 = {k: dataclasses.replace(s, roles={r(a): r(b) for a, b in s.roles.items()},
                                        conditions=conds(s.conditions), givens=tuple(ren(g) for g in s.givens),
                                        assumptions=tuple(ren(a) for a in s.assumptions),
                                        scope_assumptions=tuple(r(i) for i in s.scope_assumptions))
                 for k, s in sits.items()}
        base = snapshot(kb, sits)
        renamed = [(o.status, (round(o.interval.lo, 12), round(o.interval.hi, 12)) if o.interval else None)
                   for o in (infer.infer(kb2, sits2[s], r(role), r(kind)) for s, role, kind in QUERIES)]
        self.assertEqual(base, renamed)

    def test_invariant_under_change_of_units(self):
        kb, sits = build_kb(), situations()
        a = infer.infer(kb, sits["silt_20C"], "particle", "speed")
        d = kb.items["V-quartz-density"]
        kb2 = kb.without({d.id})
        kb2.add(dataclasses.replace(d, lo=d.lo * 1000, hi=d.hi * 1000, unit="kg/m3"))
        s = sits["silt_20C"]
        g = [x for x in s.givens if x.id == "G-silt-radius"][0]
        s2 = dataclasses.replace(s, givens=tuple(dataclasses.replace(x, lo=g.lo / 1000, hi=g.hi / 1000, unit="mm")
                                                 if x.id == g.id else x for x in s.givens))
        b = infer.infer(kb2, s2, "particle", "speed")
        self.assertEqual(a.status, b.status)
        self.assertAlmostEqual(a.interval.lo, b.interval.lo, delta=1e-12)
        self.assertAlmostEqual(a.interval.hi, b.interval.hi, delta=1e-12)


class RegressionScope(unittest.TestCase):
    """A. Unknown conditions are never read as universal validity."""

    def setUp(self):
        self.kb, self.sits = build_kb(), situations()
        v = self.kb.items["V-water-viscosity-20C"]
        d = self.kb.items["V-water-density-20C"]
        self.kb.add(dataclasses.replace(v, id="V-visc-unknown", conditions={}, scope="unknown"))
        self.kb.add(dataclasses.replace(d, id="V-dens-unknown", conditions={}, scope="unknown"))

    def test_unknown_scope_value_is_not_applied(self):
        o = run(self.kb, self.sits, ("silt_10C", "particle", "speed"))
        self.assertEqual(o.status, "UNRESOLVED")
        self.assertTrue(any("V-visc-unknown" in n for n in o.needs), o.needs)

    def test_explicit_scope_assumption_applies_it_as_a_recorded_premise(self):
        s = dataclasses.replace(self.sits["silt_10C"], scope_assumptions=("V-visc-unknown", "V-dens-unknown"))
        o = infer.infer(self.kb, s, "particle", "speed")
        self.assertEqual(o.status, "SUPPORTED")
        self.assertIn("scope:V-visc-unknown@silt_10C", o.grounds)
        self.assertEqual(o.standing["premises_by_basis"].get("assumption", 0) >= 2, True)

    def test_scope_must_be_declared_and_justified(self):
        v = self.kb.items["V-water-viscosity-20C"]
        for bad in (dict(scope=None), dict(conditions=None), dict(scope="conditional", conditions={}),
                    dict(scope="invariant", conditions={}, invariance=""), dict(holds_of=None)):
            with self.assertRaises(K.AcquisitionError, msg=bad):
                self.kb.add(dataclasses.replace(v, id="V-x", **bad))


class RegressionInheritance(unittest.TestCase):
    """B. Properties pass only along links appropriate to what they describe."""

    def setUp(self):
        self.kb, self.sits = build_kb(), situations()
        self.q = ("silt_20C", "particle", "speed")

    def test_material_property_does_not_pass_through_two_made_of_steps(self):
        qd = self.kb.items["V-quartz-density"]
        kb = self.kb.without({qd.id})
        kb.add(K.Link("L-q-si", "quartz", "made_of", "silicon", source="test", basis="illustrative"))
        kb.add(dataclasses.replace(qd, id="V-si", bearer="silicon", lo=2.32, hi=2.34))
        self.assertEqual(run(kb, self.sits, self.q).status, "UNRESOLVED")

    def test_licensed_chain_is_used_when_another_chain_to_the_same_bearer_is_barred(self):
        # defect reported by the owner: only the first chain to an ancestor was kept
        qd = self.kb.items["V-quartz-density"]
        kb = self.kb.without({qd.id})
        for l in (K.Link("L-quartz-silica", "quartz", "made_of", "silica", source="test", basis="illustrative"),
                  K.Link("L-zz-kind", "silt grain S1", "instance_of", "silt grain kind", source="test",
                         basis="illustrative"),
                  K.Link("L-zz-kind-silica", "silt grain kind", "made_of", "silica", source="test",
                         basis="illustrative")):
            kb.add(l)
        kb.add(dataclasses.replace(qd, id="V-silica-density", bearer="silica"))
        o = run(kb, self.sits, self.q)
        self.assertEqual(o.status, "SUPPORTED")
        self.assertIn("L-zz-kind-silica", o.grounds)
        self.assertNotIn("L-quartz-silica", o.grounds)

    def test_composite_does_not_inherit_a_constituent_property(self):
        self.kb.add(K.Link("L-S1-feld", "silt grain S1", "made_of", "feldspar", source="test", basis="illustrative"))
        self.kb.add(dataclasses.replace(self.kb.items["V-quartz-density"], id="V-feld", bearer="feldspar",
                                        lo=2.55, hi=2.65))
        o = run(self.kb, self.sits, self.q)
        self.assertEqual(o.status, "UNRESOLVED")
        self.assertTrue(any("composite" in r for r in o.reasons), o.reasons)

    def test_kind_property_does_not_pass_through_made_of(self):
        self.kb.add(dataclasses.replace(self.kb.items["A-fibre-shape"], id="A-quartz-shape", bearer="quartz",
                                        holds_of="kind"))
        self.assertEqual(run(self.kb, self.sits, self.q).status, "SUPPORTED")  # S1 keeps its own assumed shape

    def test_population_spread_is_not_a_bound_for_a_member(self):
        o = run(self.kb, self.sits, ("caffeine_adult_unmeasured", "population", "remaining_fraction"))
        self.assertEqual(o.status, "UNRESOLVED")
        self.assertTrue(any("population" in r for r in o.reasons), o.reasons)

    def test_individual_value_of_a_kind_is_not_inherited(self):
        s = self.sits["fine_sand_20C"]
        s2 = dataclasses.replace(s, givens=())
        self.kb.add(dataclasses.replace(s.givens[0], id="V-kind-radius", bearer="quartz", scope="invariant",
                                        holds_of="individual", conditions={}, basis="illustrative"))
        self.assertEqual(infer.infer(self.kb, s2, "particle", "speed").status, "UNRESOLVED")

    def test_extensive_quantity_cannot_be_a_material_property(self):
        g = self.sits["silt_20C"].givens[0]
        with self.assertRaises(K.AcquisitionError):
            self.kb.add(dataclasses.replace(g, id="V-mat-radius", bearer="quartz", holds_of="material"))


class RegressionProvenance(unittest.TestCase):
    """C. Knowledge needs provenance; conclusions keep the standing of their premises."""

    def test_missing_source_or_basis_is_refused(self):
        kb = build_kb()
        v = kb.items["V-water-viscosity-20C"]
        for bad in (dict(source=""), dict(basis=None), dict(basis="trust me")):
            with self.assertRaises(K.AcquisitionError, msg=bad):
                kb.add(dataclasses.replace(v, id="V-y", **bad))
        with self.assertRaises(K.AcquisitionError):
            kb.add(K.Link("L-noprov", "a", "made_of", "b"))

    def test_conclusion_standing_follows_its_weakest_premises(self):
        kb, sits = build_kb(), situations()
        o = run(kb, sits, ("silt_20C", "particle", "speed"))
        self.assertTrue(o.standing["label"].startswith("illustrative"))
        self.assertGreater(o.standing["unverified_premises"], 0)

    def test_verification_needs_a_matching_record_not_a_label(self):
        kb, sits = build_kb(), situations()
        s = sits["cs137_soil"]
        g = dataclasses.replace(s.givens[0], basis="measurement record")
        # make every knowledge premise non-illustrative, then attest each with a record matching its content
        kb2 = K.KB([dataclasses.replace(i, basis="published reference") if isinstance(i, K.Link) and
                    i.basis == "illustrative" else i for i in kb.items.values()])
        plain = infer.infer(kb2, dataclasses.replace(s, givens=(g,)), "population", "remaining_fraction")
        self.assertEqual(plain.standing["label"], "derived from unverified premises")
        for gid in sorted(plain.grounds):
            it = kb2.items.get(gid)
            if it is not None and it.basis != "definition":
                kb2.add(K.Verification(f"VF-{gid}", gid, K.fingerprint(it), "compared with cited source", it.source,
                                       holder="test reviewer", source="test record", basis="measurement record"))
        vg = K.Verification("VF-given", g.id, K.fingerprint(g), "independent measurement", "lab log",
                            holder="test reviewer", source="test record", basis="measurement record")
        o = infer.infer(kb2, dataclasses.replace(s, givens=(g,), verifications=(vg,)), "population",
                        "remaining_fraction")
        self.assertEqual(o.standing["label"], "derived from premises with attested verification records")
        self.assertIn("VF-given", o.standing["verifications"])


class RegressionVerification(unittest.TestCase):
    """Verification is a checked, attributed record, not a free text field (defect reported by the owner)."""

    def setUp(self):
        self.kb = build_kb()
        self.v = self.kb.items["V-water-viscosity-20C"]

    def record(self, **kw):
        base = dict(id="VF-1", target=self.v.id, fingerprint=K.fingerprint(self.v), method="compared with cited source",
                    checked_against=self.v.source, holder="reviewer", source="review log", basis="measurement record")
        base.update(kw)
        return K.Verification(**base)

    def test_free_text_verification_field_no_longer_exists(self):
        with self.assertRaises(TypeError):
            dataclasses.replace(self.v, verified_by="anyone")

    def test_inconsistent_records_are_refused(self):
        for bad in (dict(fingerprint="0" * 64), dict(target="no-such-item"), dict(basis="illustrative"),
                    dict(holder=""), dict(method="looked plausible"), dict(checked_against="another source")):
            with self.assertRaises(K.AcquisitionError, msg=bad):
                self.kb.add(self.record(**bad))

    def test_record_does_not_cover_changed_content(self):
        self.kb.add(self.record())
        changed = [dataclasses.replace(i, hi=1.1) if i.id == self.v.id else i for i in self.kb.items.values()]
        with self.assertRaises(K.AcquisitionError):
            K.KB(changed)  # the record no longer matches the content it names

class RegressionImmutability(unittest.TestCase):
    """D. Acquired knowledge cannot change after validation."""

    def test_item_mappings_are_read_only(self):
        kb = build_kb()
        with self.assertRaises(TypeError):
            kb.items["M-stokes"].forms["v"] = "2*(rho_p-rho_f)*g*r/(9*mu)"
        with self.assertRaises(TypeError):
            kb.items["V-water-viscosity-20C"].conditions["temperature"] = (10.0, 10.0, "degC")
        with self.assertRaises(TypeError):
            kb.items["X"] = "anything"
        with self.assertRaises(TypeError):
            situations()["silt_20C"].conditions["temperature"] = (10.0, 10.0, "degC")

    def test_source_dict_changes_do_not_reach_the_item(self):
        forms = {"t": "d/v", "d": "v*t", "v": "d/t"}
        kb = build_kb()
        m = dataclasses.replace(kb.items["M-uniform-motion"], id="M-u2", forms=forms)
        kb.add(m)
        forms["v"] = "d"
        self.assertEqual(kb.items["M-u2"].forms["v"], "d/t")


class RegressionPremises(unittest.TestCase):
    """E. Every premise is a ground, including situation assumptions; grounds are sufficient and necessary."""

    def setUp(self):
        self.kb, self.sits = build_kb(), situations()

    def test_situation_assumptions_are_grounds(self):
        o = run(self.kb, self.sits, ("silt_20C", "particle", "speed"))
        self.assertIn("assume-silt_20C-shape", o.grounds)
        self.assertIn("assume-silt_20C-motion", o.grounds)
        self.assertIn("G-silt-radius", o.grounds)

    def test_grounds_alone_reproduce_every_supported_result(self):
        kinds = [i for i in self.kb.items.values() if isinstance(i, K.QuantityKind)]
        for q in QUERIES:
            o = run(self.kb, self.sits, q)
            if o.status != "SUPPORTED":
                continue
            kb2 = K.KB(kinds + [self.kb.items[g] for g in sorted(o.grounds) if g in self.kb.items])
            s = self.sits[q[0]]
            s2 = dataclasses.replace(s, givens=tuple(x for x in s.givens if x.id in o.grounds),
                                     assumptions=tuple(x for x in s.assumptions if x.id in o.grounds))
            o2 = infer.infer(kb2, s2, q[1], q[2])
            self.assertEqual((o.status, repr(o.interval)), (o2.status, repr(o2.interval)), q)


class RegressionCombination(unittest.TestCase):
    """F. Different sources are not intersected into false precision; conflict is recorded, not a refusal."""

    def setUp(self):
        self.kb, self.sits = build_kb(), situations()
        self.v = self.kb.items["V-water-viscosity-20C"]

    def test_overlapping_sources_are_combined_by_hull(self):
        base = run(self.kb, self.sits, ("silt_20C", "particle", "speed"))
        self.kb.add(dataclasses.replace(self.v, id="V-visc-other", lo=1.0015, hi=1.05, source="another source"))
        o = run(self.kb, self.sits, ("silt_20C", "particle", "speed"))
        self.assertEqual(o.status, "SUPPORTED")
        self.assertLessEqual(o.interval.lo, base.interval.lo)
        self.assertGreaterEqual(o.interval.hi, base.interval.hi - 1e-15)

    def test_disjoint_sources_are_a_conflict_not_a_domain_refusal(self):
        self.kb.add(dataclasses.replace(self.v, id="V-visc-bad", lo=1.2, hi=1.3, source="another source"))
        o = run(self.kb, self.sits, ("silt_20C", "particle", "speed"))
        self.assertEqual(o.status, "UNRESOLVED")
        self.assertTrue(any("disagree" in r for r in o.reasons), o.reasons)


class InterpretationPositiveInference(unittest.TestCase):
    """Expected values computed by hand (see experiments/s1core/README.md)."""

    def setUp(self):
        self.kb, self.sits = build_kb(), situations()

    def q(self, *q):
        return run(self.kb, self.sits, q)

    def test_silt_settling_speed_and_time_are_derived(self):
        v = self.q("silt_20C", "particle", "speed")
        self.assertEqual(v.status, "SUPPORTED")
        self.assertTrue(v.interval.lo <= 8.98e-5 <= v.interval.hi)
        self.assertTrue(6e-5 < v.interval.lo and v.interval.hi < 1.2e-4)
        t = self.q("silt_20C", "particle", "travel_time")
        self.assertEqual(t.status, "SUPPORTED")
        self.assertTrue(t.interval.lo <= 1.113e4 <= t.interval.hi)
        self.assertIn("M-stokes", t.grounds)
        self.assertIn("M-uniform-motion", t.grounds)

    def test_idealising_assumptions_are_carried_as_caveats(self):
        v = self.q("silt_20C", "particle", "speed")
        self.assertTrue(any("assumed" in c for c in v.caveats))

    def test_same_model_transfers_to_a_droplet_in_air(self):
        v = self.q("fog_droplet", "particle", "speed")
        self.assertEqual(v.status, "SUPPORTED")
        self.assertTrue(v.interval.lo <= 3.0e-3 <= v.interval.hi)

    def test_same_model_answers_the_inverse_question(self):
        r = self.q("grain_sizing", "particle", "radius")
        self.assertEqual(r.status, "SUPPORTED")
        self.assertTrue(r.interval.lo <= 1.237e-5 <= r.interval.hi)

    def test_first_order_chain_in_two_unrelated_domains(self):
        cs = self.q("cs137_soil", "population", "remaining_fraction")
        self.assertEqual(cs.status, "SUPPORTED")
        self.assertTrue(cs.interval.lo <= 0.3978 <= cs.interval.hi)
        self.assertLess(cs.interval.hi - cs.interval.lo, 0.01)
        caf = self.q("caffeine_adult", "population", "remaining_fraction")
        self.assertEqual(caf.status, "SUPPORTED")
        self.assertAlmostEqual(caf.interval.lo, 2 ** (-12 / 4.8), places=6)
        self.assertAlmostEqual(caf.interval.hi, 2 ** (-12 / 5.2), places=6)


class InterpretationProhibitedInference(unittest.TestCase):
    def setUp(self):
        self.kb, self.sits = build_kb(), situations()

    def q(self, *q):
        return run(self.kb, self.sits, q)

    def test_outside_domain_is_refused_not_extrapolated(self):
        o = self.q("coarse_sand_20C", "particle", "speed")
        self.assertEqual(o.status, "REFUSED")
        self.assertIsNone(o.interval)

    def test_uncertain_domain_boundary_stays_unresolved(self):
        self.assertEqual(self.q("fine_sand_20C", "particle", "speed").status, "UNRESOLVED")

    def test_measurement_at_other_conditions_is_not_used(self):
        o = self.q("silt_10C", "particle", "speed")
        self.assertEqual(o.status, "UNRESOLVED")
        self.assertTrue(any("dynamic_viscosity" in n and "water" in n for n in o.needs), o.needs)

    def test_missing_situation_condition_is_not_filled_silently(self):
        o = self.q("silt_no_temperature", "particle", "speed")
        self.assertEqual(o.status, "UNRESOLVED")
        self.assertTrue(any("temperature" in n for n in o.needs), o.needs)
        p = self.q("fog_droplet_no_pressure", "particle", "speed")
        self.assertEqual(p.status, "UNRESOLVED")
        self.assertTrue(any("pressure" in n for n in p.needs), p.needs)

    def test_structural_mismatch_is_refused(self):
        self.assertEqual(self.q("microfibre", "particle", "speed").status, "REFUSED")

    def test_population_outside_measured_group_is_unresolved(self):
        self.assertEqual(self.q("caffeine_neonate", "population", "remaining_fraction").status, "UNRESOLVED")

    def test_incompatible_rate_law_is_refused(self):
        self.assertEqual(self.q("ethanol_saturated", "population", "remaining_fraction").status, "REFUSED")


class InterpretationKnowledgeDependence(unittest.TestCase):
    def setUp(self):
        self.kb, self.sits = build_kb(), situations()

    def test_every_ground_of_a_supported_chain_is_needed(self):
        for q in [("silt_20C", "particle", "travel_time"), ("cs137_soil", "population", "remaining_fraction")]:
            base = run(self.kb, self.sits, q)
            self.assertEqual(base.status, "SUPPORTED")
            for item, status in infer.ablate(self.kb, self.sits[q[0]], q[1], q[2]):
                self.assertNotEqual(status, "SUPPORTED", (q, item))

    def test_acquiring_the_named_missing_knowledge_resolves_the_question(self):
        q = ("silt_10C", "particle", "speed")
        self.assertEqual(run(self.kb, self.sits, q).status, "UNRESOLVED")
        for item in later_acquisitions():
            self.kb.add(item)
        after = run(self.kb, self.sits, q)
        self.assertEqual(after.status, "SUPPORTED")
        self.assertTrue(after.interval.lo <= 6.885e-5 <= after.interval.hi)

    def test_refusal_depends_on_acquired_domain_knowledge(self):
        q = ("coarse_sand_20C", "particle", "speed")
        stokes = self.kb.items["M-stokes"]
        kb2 = self.kb.without({stokes.id})
        kb2.add(dataclasses.replace(stokes, conditions=()))
        self.assertEqual(run(kb2, self.sits, q).status, "SUPPORTED")  # without domain knowledge: over-reach
        self.assertEqual(run(self.kb, self.sits, q).status, "REFUSED")


if __name__ == "__main__":
    unittest.main()
