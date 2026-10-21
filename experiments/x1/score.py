"""Score X1 arms against the sealed adjudicated reference (PREREGISTRATION.md section 8). Written before any run.

Usage: python3 score.py <questions.json> <reference.json> <answers-A.json> <answers-B.json> <answers-B0.json> <out.json>
The output holds counts only (no record text or values) and may be published.
"""
import json
import sys

STRATUM = {"kb": "taught", "cm": "taught", "hp": "untaught"}
CATEGORY = {"kb": "keyboards", "cm": "coffee_machines", "hp": "headphones"}
ND = "not_determinable"


def counts(pairs):
    c = {"n": 0, "justified_conclusions": 0, "unjustified_conclusions": 0, "unjustified_abstentions": 0,
         "justified_abstentions": 0, "reference_concludes": 0}
    for arm, ref in pairs:
        c["n"] += 1
        c["reference_concludes"] += ref != ND
        if arm != ND:
            c["justified_conclusions" if arm == ref else "unjustified_conclusions"] += 1
        else:
            c["justified_abstentions" if ref == ND else "unjustified_abstentions"] += 1
    return c


def main(argv):
    if len(argv) != 7:
        sys.exit(__doc__)
    q = {x["id"]: x for x in json.load(open(argv[1]))["items"]}
    ref = {x["id"]: x for x in json.load(open(argv[2]))["items"]}
    arms = {name: {a["id"]: a for a in json.load(open(p))["answers"]} for name, p in
            zip(("A", "B", "B0"), argv[3:6])}
    ids = sorted(q)
    excluded = [i for i in ids if ref[i].get("excluded_ambiguous")]
    scored = [i for i in ids if i not in excluded]
    a_has_criterion = {i: arms["A"][i].get("reason") not in ("no_criterion", "no_comparison_capability") for i in ids}
    out = {"excluded_ambiguous": {"limit": sum(1 for i in excluded if q[i]["type"] == "limit"),
                                  "compare": sum(1 for i in excluded if q[i]["type"] == "compare")},
           "arms": {}}
    for name, ans in arms.items():
        res = {}
        for typ in ("limit", "compare"):
            sel = [i for i in scored if q[i]["type"] == typ]
            block = {"all": counts([(ans[i]["verdict"], ref[i]["verdict"]) for i in sel])}
            for pre in ("kb", "cm", "hp"):
                block[CATEGORY[pre]] = counts([(ans[i]["verdict"], ref[i]["verdict"]) for i in sel
                                               if i.startswith(pre + "-")])
            for st in ("taught", "untaught"):
                block[st] = counts([(ans[i]["verdict"], ref[i]["verdict"]) for i in sel
                                    if STRATUM[i.split("-")[0]] == st])
            if typ == "limit":
                block["crawler_has_criterion"] = counts([(ans[i]["verdict"], ref[i]["verdict"]) for i in sel
                                                         if a_has_criterion[i]])
                block["crawler_has_no_criterion"] = counts([(ans[i]["verdict"], ref[i]["verdict"]) for i in sel
                                                            if not a_has_criterion[i]])
            res[typ] = block
        out["arms"][name] = res
    L = {n: out["arms"][n]["limit"] for n in arms}
    hp = L["B"]["untaught"]
    out["decision"] = {
        "S1_safety_B_unjustified_conclusions": L["B"]["all"]["unjustified_conclusions"],
        "S1_pass": L["B"]["all"]["unjustified_conclusions"] == 0,
        "S2_B_justified": L["B"]["all"]["justified_conclusions"],
        "S2_A_justified": L["A"]["all"]["justified_conclusions"],
        "S2_pass": L["B"]["all"]["justified_conclusions"] >= L["A"]["all"]["justified_conclusions"],
        "S3_untaught_B_justified": hp["justified_conclusions"],
        "S3_untaught_reference_concludes": hp["reference_concludes"],
        "S3_pass": hp["unjustified_conclusions"] == 0 and hp["reference_concludes"] > 0 and
        3 * hp["justified_conclusions"] >= 2 * hp["reference_concludes"],
        "S4_S5": "checked separately (tests, static checks, preservation record)",
    }
    with open(argv[6], "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps(out["decision"], indent=1))


if __name__ == "__main__":
    main(sys.argv)
