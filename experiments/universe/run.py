"""MS1 vertical slice: answer the sealed MS0 cases and compare the ported s1core path with direct s1core.

Run from this directory: python3 run.py
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE), str(HERE.parent / "s1core")]

from universe.contract import inquire  # noqa: E402
from universe.loader import import_s1core, load_material  # noqa: E402
from universe.store import Store  # noqa: E402

MATERIAL = HERE / "material" / "ms1_material.json"


def show(case, a):
    ans = (f"{a.status} [{a.interval[0]:.4g}, {a.interval[1]:.4g}] {a.interval[2]}" if a.interval else
           str(a.status))
    if a.verdict:
        ans = f"class '{a.question['class']}': {a.verdict} (from {ans})"
    elif a.value is not None or "attribute" in a.question:
        ans = f"value: {a.value}"
    print(f"{case['id']:3} {case['domain'][:26]:26} held-out={str(case['held_out']):5} -> {ans}"
          f" | question {a.question_status} | services {'+'.join(a.services)} | {a.standing}")
    for n in a.needs[:3]:
        print(f"      need: {n}")


def main():
    store = Store()
    data = load_material(MATERIAL, store)
    print("== MS0 sealed cases")
    for case in data["cases"]:
        show(case, inquire(store, f"I:{case['id']}"))
    print(f"\nstore: {store.seq} universe events; proposals "
          f"{sum(1 for e in store.events if e.type == 'propose')}")

    from s1core import infer as s1  # noqa: E402
    from s1core.examples import build_kb, situations  # noqa: E402
    queries = [("silt_20C", "particle", "speed"), ("silt_20C", "particle", "travel_time"),
               ("coarse_sand_20C", "particle", "speed"), ("fine_sand_20C", "particle", "speed"),
               ("silt_10C", "particle", "speed"), ("silt_no_temperature", "particle", "speed"),
               ("grain_sizing", "particle", "radius"), ("fog_droplet", "particle", "speed"),
               ("fog_droplet_no_pressure", "particle", "speed"), ("microfibre", "particle", "speed"),
               ("cs137_soil", "population", "remaining_fraction"),
               ("caffeine_adult", "population", "remaining_fraction"),
               ("caffeine_adult_unmeasured", "population", "remaining_fraction"),
               ("caffeine_neonate", "population", "remaining_fraction"),
               ("ethanol_saturated", "population", "remaining_fraction")]
    kb, sits = build_kb(), situations()
    s2 = Store()
    ids = import_s1core(s2, kb, sits, queries)
    print("\n== s1core examples: direct s1core vs ported path")
    same = 0
    for q in queries:
        d = s1.infer(kb, sits[q[0]], q[1], q[2])
        a = inquire(s2, ids[q])
        di = (round(d.interval.lo, 12), round(d.interval.hi, 12)) if d.interval else None
        ai = (round(a.interval[0], 12), round(a.interval[1], 12)) if a.interval else None
        ok = (d.status, di) == (a.status, ai)
        same += ok
        print(f"  {'=' if ok else 'DIFF'} {q[0]:26} {q[2]:20} direct {d.status:11} ported {a.status}")
    print(f"  {same}/{len(queries)} identical")


if __name__ == "__main__":
    main()
