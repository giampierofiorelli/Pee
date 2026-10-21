"""Tests for the S1 model-based inference core, written before the implementation.

* ``Integrity*`` classes check properties that do not depend on any scientific reading: acquisition validation,
  traceability, determinism, invariance under renaming, unit changes and item order, and absence of example
  vocabulary in the mechanism.
* ``Interpretation*`` classes check outcomes whose expected values the developer (Claude) computed by hand from the
  example knowledge before the first run. They show the mechanism behaves as intended on development examples.
  They are NOT independent validation: the examples were chosen by the same developer who wrote the mechanism.
"""
import dataclasses
import pathlib
import random
import re
import unittest

from s1core import infer, knowledge as K
from s1core.examples import build_kb, later_acquisitions, situations

STATUSES = {"SUPPORTED", "UNRESOLVED", "REFUSED", "CONFLICT"}

QUERIES = [  # (situation, role, kind)
    ("silt_20C", "particle", "speed"), ("silt_20C", "particle", "travel_time"),
    ("coarse_sand_20C", "particle", "speed"), ("fine_sand_20C", "particle", "speed"),
    ("silt_10C", "particle", "speed"), ("silt_no_temperature", "particle", "speed"),
    ("fog_droplet", "particle", "speed"), ("fog_droplet_no_pressure", "particle", "speed"),
    ("microfibre", "particle", "speed"), ("grain_sizing", "particle", "radius"),
    ("cs137_soil", "population", "remaining_fraction"), ("caffeine_adult", "population", "remaining_fraction"),
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


class IntegrityAcquisition(unittest.TestCase):
    def test_dimensionally_wrong_model_form_is_rejected(self):
        kb = build_kb()
        stokes = kb.items["M-stokes"]
        bad = dataclasses.replace(stokes, id="M-bad", forms={"v": "2*(rho_p-rho_f)*g*r/(9*mu)"})
        with self.assertRaises(K.AcquisitionError):
            kb.add(bad)

    def test_value_with_unit_of_wrong_dimension_is_rejected(self):
        kb = build_kb()
        v = kb.items["V-water-viscosity-20C"]
        with self.assertRaises(K.AcquisitionError):
            kb.add(dataclasses.replace(v, id="V-bad", unit="m/s"))

    def test_unknown_unit_and_duplicate_id_rejected(self):
        kb = build_kb()
        v = kb.items["V-water-viscosity-20C"]
        with self.assertRaises(K.AcquisitionError):
            kb.add(dataclasses.replace(v, id="V-bad2", unit="furlong"))
        with self.assertRaises(K.AcquisitionError):
            kb.add(v)

    def test_form_using_undeclared_variable_rejected(self):
        kb = build_kb()
        stokes = kb.items["M-stokes"]
        with self.assertRaises(K.AcquisitionError):
            kb.add(dataclasses.replace(stokes, id="M-bad3", forms={"v": "2*(rho_p-rho_f)*g*r^2/(9*nu)"}))


class IntegrityTrace(unittest.TestCase):
    def setUp(self):
        self.kb, self.sits = build_kb(), situations()

    def test_closed_status_set_and_grounds_are_real_items(self):
        for q in QUERIES:
            o = run(self.kb, self.sits, q)
            self.assertIn(o.status, STATUSES, q)
            self.assertTrue(o.trace, q)
            for g in o.grounds:
                self.assertIn(g, self.kb.items, q)
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
        names = set()
        for it in kb.items.values():
            for f in dataclasses.fields(it):
                if f.name in ("id", "bearer", "kind", "name", "entity", "target", "value") and isinstance(
                        getattr(it, f.name), str):
                    names.add(getattr(it, f.name))
        for s in sits.values():
            names |= set(s.roles) | set(s.roles.values())
        mapping = {n: f"z{i:03d}" for i, n in enumerate(sorted(names))}
        r = lambda x: mapping.get(x, x) if isinstance(x, str) else x

        def conds(c):
            return {r(k): (r(v) if isinstance(v, str) else v) for k, v in c.items()}

        def ren(it):
            ch = {}
            for f in dataclasses.fields(it):
                val = getattr(it, f.name)
                if f.name in ("id", "bearer", "kind", "name", "entity", "target", "value"):
                    ch[f.name] = r(val)
                elif f.name == "conditions" and isinstance(val, dict):
                    ch[f.name] = conds(val)
                elif f.name == "variables":
                    ch[f.name] = {s: (r(role), r(kd)) for s, (role, kd) in val.items()}
                elif f.name == "requirements":
                    ch[f.name] = tuple(K.Requirement(r(q.role), r(q.name), r(q.value)) for q in val)
            return dataclasses.replace(it, **ch)

        kb2 = K.KB([ren(i) for i in kb.items.values()])
        sits2 = {k: dataclasses.replace(s, roles={r(a): r(b) for a, b in s.roles.items()},
                                        conditions=conds(s.conditions),
                                        assumptions=tuple(ren(a) for a in s.assumptions))
                 for k, s in sits.items()}
        base = snapshot(kb, sits)
        renamed = [(o.status, (round(o.interval.lo, 12), round(o.interval.hi, 12)) if o.interval else None)
                   for o in (infer.infer(kb2, sits2[s], r(role), r(kind)) for s, role, kind in QUERIES)]
        self.assertEqual(base, renamed)

    def test_invariant_under_change_of_units(self):
        kb, sits = build_kb(), situations()
        q = ("silt_20C", "particle", "speed")
        a = run(kb, sits, q)
        r = kb.items["V-silt-radius"]
        d = kb.items["V-quartz-density"]
        kb2 = kb.without({r.id, d.id})
        kb2.add(dataclasses.replace(r, lo=r.lo / 1000, hi=r.hi / 1000, unit="mm"))
        kb2.add(dataclasses.replace(d, lo=d.lo * 1000, hi=d.hi * 1000, unit="kg/m3"))
        b = run(kb2, sits, q)
        self.assertEqual(a.status, b.status)
        self.assertAlmostEqual(a.interval.lo, b.interval.lo, delta=1e-12)
        self.assertAlmostEqual(a.interval.hi, b.interval.hi, delta=1e-12)


class InterpretationPositiveInference(unittest.TestCase):
    """Expected values computed by hand before the first run (see experiments/s1core/README.md)."""

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
        self.assertAlmostEqual(caf.interval.lo, 0.0625, places=4)
        self.assertAlmostEqual(caf.interval.hi, 0.30475, places=4)


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
        before = run(self.kb, self.sits, q)
        self.assertEqual(before.status, "UNRESOLVED")
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
