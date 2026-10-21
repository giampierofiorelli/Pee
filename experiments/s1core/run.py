"""Print the program's own conclusions, ablations and before/after acquisition. Run: python3 run.py [--trace]"""
import json
import sys

from s1core import infer, units
from s1core.examples import build_kb, later_acquisitions, situations

SHOW = [("silt_20C", "particle", "speed", "mm/s"), ("silt_20C", "particle", "travel_time", "h"),
        ("coarse_sand_20C", "particle", "speed", "mm/s"), ("fine_sand_20C", "particle", "speed", "mm/s"),
        ("silt_10C", "particle", "speed", "mm/s"), ("silt_no_temperature", "particle", "speed", "mm/s"),
        ("grain_sizing", "particle", "radius", "um"), ("fog_droplet", "particle", "speed", "mm/s"),
        ("fog_droplet_no_pressure", "particle", "speed", "mm/s"), ("microfibre", "particle", "speed", "mm/s"),
        ("cs137_soil", "population", "remaining_fraction", "1"),
        ("caffeine_adult", "population", "remaining_fraction", "1"),
        ("caffeine_neonate", "population", "remaining_fraction", "1"),
        ("ethanol_saturated", "population", "remaining_fraction", "1")]


def line(o, unit):
    if o.interval:
        lo, hi = units.from_si(o.interval.lo, o.interval.hi, unit)
        return f"{o.status} [{lo:.4g}, {hi:.4g}] {unit}"
    return o.status


def main(trace=False):
    kb, sits = build_kb(), situations()
    for s, role, kind, unit in SHOW:
        o = infer.infer(kb, sits[s], role, kind)
        print(f"\n== {s}: {kind} -> {line(o, unit)}")
        print("   grounds:", ", ".join(sorted(o.grounds)) or "-")
        for label, xs in (("needs", o.needs), ("reasons", o.reasons), ("caveats", o.caveats)):
            for x in xs:
                print(f"   {label}: {x}")
        if trace:
            print(json.dumps(o.trace, indent=1, ensure_ascii=False))
    print("\n== Ablation: remove one ground at a time")
    for s, role, kind in [("silt_20C", "particle", "travel_time"), ("cs137_soil", "population", "remaining_fraction")]:
        print(f"   {s} {kind}: " + "; ".join(f"-{g} -> {st}" for g, st in infer.ablate(kb, sits[s], role, kind)))
    print("\n== Acquisition of the knowledge named in the needs of silt_10C")
    before = infer.infer(kb, sits["silt_10C"], "particle", "speed")
    for item in later_acquisitions():
        kb.add(item)
    after = infer.infer(kb, sits["silt_10C"], "particle", "speed")
    print(f"   before: {line(before, 'mm/s')}; after: {line(after, 'mm/s')}")
    t = infer.infer(kb, sits["silt_10C"], "particle", "travel_time")
    print(f"   travel time over 1 m at 10 degC after acquisition: {line(t, 'h')}")


if __name__ == "__main__":
    main("--trace" in sys.argv)
