"""R-1 runner (PROTOCOL §5-§7).
Usage: python3 run.py dev <out_dir>        development tables: arm outputs only (no reference exists for them)
       python3 run.py sealed <out_dir>     sealed tables: arm outputs, scores M2-M6 and integration answers M7
Outputs hold cell text (private): write them outside the repository; only counts are published."""
import json
import pathlib
import sys

import common  # noqa: F401  (sets sys.path)
import arms
import common
import score
import crawler_tables
from universe import acquisition, knowledge_acquisition as ka, loader, recognition
from universe.store import Store


def base():
    st = Store()
    loader.load_general_knowledge(st, legacy=False)
    return st


def run(which, out):
    out = pathlib.Path(out)
    out.mkdir(parents=True, exist_ok=True)
    chosen = common.DEV if which == "dev" else common.SEALED
    docs = common.documents()
    lex = acquisition.Lexicon(base())
    res = {k: {"readings": [], "units": {}, "ledger": []} for k in ("O", "N", "S")}
    for key in common.KEYS:
        tables = {t for d, t in chosen if d == key}
        if not tables:
            continue
        cr = crawler_tables.read_markdown(common.text_of(key))
        o, ou = arms.arm_o(docs[key], cr, tables)
        n, nu = arms.arm_n(docs[key], lex, tables)
        s, su, led = arms.arm_s(docs[key], cr, lex, tables)
        for arm, rd, us in (("O", o, ou), ("N", n, nu), ("S", s, su)):
            for r in rd:
                r["doc"] = key
            res[arm]["readings"] += rd
            res[arm]["units"][key] = us
        res["S"]["ledger"] += [dict(e, doc=key) for e in led]
    for arm in res:
        (out / f"{which}-{arm}.json").write_text(json.dumps(res[arm], indent=1, ensure_ascii=False, default=str))
    if which != "sealed":
        return {a: {"readings": len(res[a]["readings"]), "units": sum(len(u) for u in res[a]["units"].values())}
                for a in res}
    ref = json.loads(pathlib.Path("/home/user/pee-knowledge/private-eval/pee-r1/reference.json").read_text())["items"]
    scores = {a: score.score(ref, res[a]["readings"], chosen) for a in res}
    scores["M7"] = integration(ref, res, docs)
    return scores


def integration(ref, res, docs):
    """M7: each reference item asked as a value question of each arm's universe (A-1's harness)."""
    out = {}
    for arm in res:
        recognition._INDEX.clear()
        st = base()
        for key, us in res[arm]["units"].items():
            if us:
                ka.represent(st, us, f"document:{key}:r1:{arm}", common.harness.HOLDER, acquisition.Lexicon(st))
        tally, rows = {"correct": 0, "wrong": 0, "uninformed": 0, "abstained": 0}, []
        for it in ref:
            head0 = next((c["text"] for c in docs[it["doc"]]["tables"][it["table"]]["cells"]
                          if c["header"] and c["col"] == 0), "")
            ask = {"subject": " ".join(it["property"][0])}
            if it["entity"]:
                ask["conditions"] = [{"concept": head0, "value": " ".join(it["entity"][0])}]
            a = common.harness.answer(st, {"id": it["id"], "type": "value", "ask": ask})
            ans = a.get("answer")
            if not a.get("informed"):
                k = "uninformed"
            elif isinstance(ans, dict):
                nums = [ans.get("number"), ans.get("lo"), ans.get("hi")]
                hit = any(x is not None and any(abs(float(x) - float(y)) < 1e-6 for y in it["numbers"]) for x in nums)
                k = "correct" if hit and score.unit(ans.get("unit")) == score.unit(it["unit"]) else "wrong"
            else:
                k = "abstained"
            tally[k] += 1
            rows.append({"id": it["id"], "outcome": k, "answer": ans, "why": a.get("why")})
        out[arm] = dict(tally, rows=rows)
    return out


if __name__ == "__main__":
    r = run(sys.argv[1], sys.argv[2])
    pathlib.Path(sys.argv[2], f"{sys.argv[1]}-scores.json").write_text(json.dumps(r, indent=1, default=str))
    print(json.dumps({a: ({k: v for k, v in x.items() if k != "rows"} if isinstance(x, dict) else x)
                      for a, x in r.items()}, indent=1, default=str)[:4000])
