"""C-1 stage F': does a learned relation classifier read the relation of A-1's propositions better than A-1?

DESIGN.md section 15. Arms: B0 (A-1's own relation), B1 (bag-of-words logistic regression, standard library), B2
(nomic-embed-text-v1.5 sentence embeddings with logistic regression; SetFit-style without contrastive tuning).

Training examples: the adjudicated speakers references D and R (spent), each as (block text, subject, object) with its
reference relation. Test items: A-1's items the O-2 judgements matched to a reference proposition. Five folds grouped
by section. Scoring is mechanical: exact relation label, ``other: verb`` collapsed to ``other`` and
``does_not_establish`` read as ``establishes`` (polarity is not scored here).

Usage (inside the C-1 virtual environment):
  python relclass.py <document.md> <private-o2 dir> <embedding model.gguf> <out dir>
"""
import hashlib
import json
import math
import pathlib
import random
import re
import sys
from collections import Counter, defaultdict

STOP = set("the a an of to in and or for on with by is are be as at from that this these those it its can may "
           "not no than into over under per via".split())


def norm_rel(r):
    r = (r or "").strip().lower()
    if r.startswith("other"):
        return "other"
    if r in ("does_not_establish", "does not establish"):
        return "establishes"
    return r.replace(" ", "_")


def words(s):
    return [w for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if w not in STOP and len(w) > 1]


def block(lines, ls):
    if not ls:
        return ""
    a, b = min(ls), max(ls)
    return " ".join(lines[a - 1:b])[:1500]


def bow(text, subj, obj):
    f = Counter("t:" + w for w in words(text))
    f.update("s:" + w for w in words(subj))
    f.update("o:" + w for w in words(obj))
    low = (text or "").lower()
    i, j = low.find((subj or "").lower()[:20]), low.find((obj or "").lower()[:20])
    if i >= 0 and j >= 0 and subj and obj:
        a, b = sorted((i + len(subj) if i < j else j + len(obj), max(i, j)))
        f.update("b:" + w for w in words(low[a:b]))
    return {k: 1.0 for k in f}


class SoftmaxLR:
    """Multinomial logistic regression trained by SGD with L2 (sparse dict features)."""

    def __init__(self, epochs=30, lr=0.3, l2=1e-4, seed=0):
        self.epochs, self.lr, self.l2, self.seed = epochs, lr, l2, seed

    def fit(self, X, y):
        self.classes = sorted(set(y))
        self.W = {c: defaultdict(float) for c in self.classes}
        rnd = random.Random(self.seed)
        idx = list(range(len(X)))
        for ep in range(self.epochs):
            rnd.shuffle(idx)
            lr = self.lr / (1 + ep * 0.2)
            for i in idx:
                p = self.proba(X[i])
                for c in self.classes:
                    g = p[c] - (1.0 if y[i] == c else 0.0)
                    W = self.W[c]
                    for k, v in X[i].items():
                        W[k] -= lr * (g * v + self.l2 * W[k])
        return self

    def proba(self, x):
        s = {c: sum(self.W[c].get(k, 0.0) * v for k, v in x.items()) for c in self.classes}
        m = max(s.values())
        e = {c: math.exp(v - m) for c, v in s.items()}
        z = sum(e.values())
        return {c: v / z for c, v in e.items()}

    def predict(self, x):
        p = self.proba(x)
        return max(p, key=p.get)


def dense(vec):
    return {i: v for i, v in enumerate(vec)}


def macro_f1(gold, pred):
    labels = sorted(set(gold))
    f = []
    for c in labels:
        tp = sum(1 for g, p in zip(gold, pred) if g == c and p == c)
        fp = sum(1 for g, p in zip(gold, pred) if g != c and p == c)
        fn = sum(1 for g, p in zip(gold, pred) if g == c and p != c)
        pr = tp / (tp + fp) if tp + fp else 0.0
        rc = tp / (tp + fn) if tp + fn else 0.0
        f.append(2 * pr * rc / (pr + rc) if pr + rc else 0.0)
    return sum(f) / len(f) if f else None


def main(md, priv, model, outdir):
    priv, outdir = pathlib.Path(priv), pathlib.Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    lines = pathlib.Path(md).read_text().split("\n")
    meta = json.loads((priv / "passages" / "meta.json").read_text())
    sections = [(s[0], s[1], split) for split in ("dev", "sealed") for s in meta[split]["sections"]]
    fold_of = {(a, b): int(hashlib.sha256(f"c1-fold-{a}".encode()).hexdigest(), 16) % 5 for a, b, _ in sections}

    def section(ls):
        for a, b, split in sections:
            if ls and a <= min(ls) <= b:
                return (a, b)
        return None

    gold, train = {}, []
    for split, path in (("dev", priv / "annotations" / "D-ann.json"), ("sealed", priv / "annotations" / "R.json")):
        for p in json.loads(path.read_text())["propositions"]:
            if p.get("non_scientific"):
                continue
            sec = section(p.get("lines") or [])
            if sec is None:
                continue
            ex = {"id": p["id"], "split": split, "fold": fold_of[sec], "text": block(lines, p.get("lines")),
                  "subject": p.get("subject") or "", "object": p.get("object") or "",
                  "label": norm_rel(p.get("relation"))}
            gold[(split, p["id"])] = ex
            train.append(ex)
    tests = []
    for split, exp, jud in (("dev", "dev/A-dev.json", "dev/judge-list-K.json"),
                            ("sealed", "sealed/A.json", "sealed/final-Y.json")):
        items = {r["item"]: r for r in json.loads((priv / exp).read_text())["propositions"]}
        J = json.loads((priv / jud).read_text())
        J = J.get("judgement", J)
        for u in J["u_items"]:
            g = gold.get((split, u.get("match")))
            if not g or u.get("verdict") == "spurious" or u["pid"] not in items:
                continue
            a = items[u["pid"]]
            tests.append({"pid": u["pid"], "split": split, "fold": g["fold"], "label": g["label"],
                          "a1": norm_rel(a.get("relation")), "text": block(lines, a.get("lines")),
                          "subject": a.get("subject") or "", "object": a.get("object") or ""})
    cache = outdir / "embeddings.json"
    emb = json.loads(cache.read_text()) if cache.exists() else {}
    key = lambda x: f"{x['text']}||{x['subject']}||{x['object']}"
    need = [x for x in train + tests if key(x) not in emb]
    if need:
        from llama_cpp import Llama
        llm = Llama(model_path=str(model), embedding=True, n_ctx=2048, n_threads=4, verbose=False)
        for x in need:
            v = llm.embed(f"classification: {x['text']} || subject: {x['subject']} || object: {x['object']}")
            if v and isinstance(v[0], list):  # token-level output: mean-pool
                v = [sum(c) / len(v) for c in zip(*v)]
            n = math.sqrt(sum(t * t for t in v)) or 1.0
            emb[key(x)] = [t / n for t in v]
        cache.write_text(json.dumps(emb))
    E = lambda x: dense(emb[key(x)])
    preds = {"B1": {}, "B2": {}}
    for k in range(5):
        tr = [x for x in train if x["fold"] != k]
        te = [x for x in tests if x["fold"] == k]
        if not te:
            continue
        y = [x["label"] for x in tr]
        m1 = SoftmaxLR(epochs=30, lr=0.3).fit([bow(x["text"], x["subject"], x["object"]) for x in tr], y)
        m2 = SoftmaxLR(epochs=60, lr=0.5, l2=1e-5).fit([E(x) for x in tr], y)
        for x in te:
            preds["B1"][x["pid"] + x["split"]] = m1.predict(bow(x["text"], x["subject"], x["object"]))
            preds["B2"][x["pid"] + x["split"]] = m2.predict(E(x))

    def score(items, arm):
        if not items:
            return {"n": 0, "accuracy": None, "macro_f1": None}
        gl = [x["label"] for x in items]
        pr = [x["a1"] if arm == "B0" else preds[arm].get(x["pid"] + x["split"]) for x in items]
        return {"n": len(items), "accuracy": round(sum(1 for g, p in zip(gl, pr) if g == p) / len(items), 4),
                "macro_f1": round(macro_f1(gl, pr), 4)}
    res = {"schema": "pee.c1.stage-f-prime.v1", "train_examples": len(train), "test_items": len(tests),
           "labels": dict(Counter(x["label"] for x in train)), "results": {}}
    groups = {"all": tests, "dev": [x for x in tests if x["split"] == "dev"],
              "sealed": [x for x in tests if x["split"] == "sealed"],
              "norms": [x for x in tests if x["label"] in ("requires", "recommends")],
              "a1_other": [x for x in tests if x["a1"] == "other"]}
    for g, items in groups.items():
        res["results"][g] = {arm: score(items, arm) for arm in ("B0", "B1", "B2")}
    best = max(("B1", "B2"), key=lambda a: res["results"]["all"][a]["accuracy"])
    gain = lambda g: res["results"][g][best]["accuracy"] - res["results"][g]["B0"]["accuracy"]
    res["pass_rule"] = {"best": best, "gain_all": round(gain("all"), 4), "gain_dev": round(gain("dev"), 4),
                        "gain_sealed": round(gain("sealed"), 4),
                        "passed": gain("all") >= 0.10 and gain("dev") > 0 and gain("sealed") > 0}
    (outdir / "stage-f-prime.json").write_text(json.dumps(res, indent=1))
    print(json.dumps({k: res[k] for k in ("train_examples", "test_items", "pass_rule")}))
    for g, r in res["results"].items():
        print(g, {a: (v["n"], v["accuracy"], v["macro_f1"]) for a, v in r.items()})


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
