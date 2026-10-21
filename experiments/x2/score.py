"""Score X2 arms against the sealed adjudicated reference (PREREGISTRATION.md section 5). Written before any run.

Usage: python3 score.py <questions.json> <reference.json> <out.json> A=<answers> B2-flat=<answers> B2=<answers>
       B2S=<answers>
The output holds counts only (no record text or values) and may be published.
"""
import json
import sys

ND = "not_determinable"
ARMS = ("A", "B2-flat", "B2", "B2S")


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


def contribution(more, less, sel, ref):
    """Reuse verdict (prereg section 5): 'more' is the arm with the reused structure, 'less' the one without."""
    jc = lambda a, i: a[i]["verdict"] != ND and a[i]["verdict"] == ref[i]["verdict"]  # noqa: E731
    uc = lambda a, i: a[i]["verdict"] != ND and a[i]["verdict"] != ref[i]["verdict"]  # noqa: E731
    gained = [i for i in sel if jc(more, i) and not jc(less, i)]
    lost = [i for i in sel if jc(less, i) and not jc(more, i)]
    added_unjustified = [i for i in sel if uc(more, i) and not uc(less, i)]
    more_j, less_j = sum(jc(more, i) for i in sel), sum(jc(less, i) for i in sel)
    if added_unjustified:
        verdict = "harms"
    elif more_j > less_j:
        verdict = "contributes"
    else:
        verdict = "neutral"
    return {"verdict": verdict, "justified_with": more_j, "justified_without": less_j, "items_gained": len(gained),
            "items_lost": len(lost), "unjustified_added": len(added_unjustified)}


def main(argv):
    if len(argv) != 8:
        sys.exit(__doc__)
    q = {x["id"]: x for x in json.load(open(argv[1]))["items"]}
    ref = {x["id"]: x for x in json.load(open(argv[2]))["items"]}
    paths = dict(a.split("=", 1) for a in argv[4:])
    arms = {n: {a["id"]: a for a in json.load(open(paths[n]))["answers"]} for n in ARMS}
    ids = sorted(q)
    excluded = [i for i in ids if ref[i].get("excluded_ambiguous")]
    scored = [i for i in ids if i not in excluded]
    cats = sorted({q[i]["category"] for i in ids})
    a_has = {i: arms["A"][i].get("reason") not in ("no_criterion", "no_comparison_capability") for i in ids}
    out = {"excluded_ambiguous": {t: sum(1 for i in excluded if q[i]["type"] == t) for t in ("limit", "compare")},
           "arms": {}}
    for name, ans in arms.items():
        res = {}
        for typ in ("limit", "compare"):
            sel = [i for i in scored if q[i]["type"] == typ]
            pair = lambda s: counts([(ans[i]["verdict"], ref[i]["verdict"]) for i in s])  # noqa: E731
            block = {"all": pair(sel)}
            for c in cats:
                block[c] = pair([i for i in sel if q[i]["category"] == c])
            if typ == "limit":
                block["crawler_has_criterion"] = pair([i for i in sel if a_has[i]])
                block["crawler_has_no_criterion"] = pair([i for i in sel if not a_has[i]])
            res[typ] = block
        out["arms"][name] = res
    L = {n: out["arms"][n]["limit"]["all"] for n in ARMS}
    lim = [i for i in scored if q[i]["type"] == "limit"]
    out["decision"] = {
        "S1_B2S_unjustified_conclusions": L["B2S"]["unjustified_conclusions"],
        "S1_pass": L["B2S"]["unjustified_conclusions"] == 0,
        "S2_B2S_justified": L["B2S"]["justified_conclusions"],
        "S2_A_justified": L["A"]["justified_conclusions"],
        "S2_pass": L["B2S"]["justified_conclusions"] >= L["A"]["justified_conclusions"],
        "S3_B2S_justified": L["B2S"]["justified_conclusions"],
        "S3_reference_concludes": L["B2S"]["reference_concludes"],
        "S3_pass": L["B2S"]["reference_concludes"] > 0 and
        3 * L["B2S"]["justified_conclusions"] >= 2 * L["B2S"]["reference_concludes"],
        "S4_S5": "checked separately (tests, static checks, preservation record)",
    }
    out["reuse"] = {"value_segmentation_B2S_vs_B2": contribution(arms["B2S"], arms["B2"], lim, ref),
                    "record_context_B2_vs_B2flat": contribution(arms["B2"], arms["B2-flat"], lim, ref)}
    with open(argv[3], "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps({"decision": out["decision"], "reuse": out["reuse"]}, indent=1))


if __name__ == "__main__":
    main(sys.argv)
