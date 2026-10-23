"""R-1 interface tests on constructed documents (tier T1, mechanics). Run from experiments/r1:
python3 -m unittest test_r1   (the Crawler tests skip when Node or engine-ts/dist is missing)"""
import unittest

import common  # noqa: F401  (sets sys.path)
import crawler_tables as CT
from universe import acquisition, loader, markdown
from universe.store import Store

MD = """# Materials

## Strength

| Material | Yield strength | Note |
|---|---|---|
| Steel `S235` | 235 MPa | rated “up to 400 MPa” by its maker |
| Pipe \\| cell | **bold** text | [link](https://example.org/a) |

| Property | What it does not establish |
|---|---|
| Fatigue | 10 years of service |
"""


def lex():
    st = Store()
    loader.load_general_knowledge(st, legacy=False)
    return acquisition.Lexicon(st)


class Adapter(unittest.TestCase):
    def test_html_has_the_table_structure(self):
        h = CT.markdown_to_html(MD)
        self.assertEqual(h.count("<table>"), 2)
        self.assertIn("<th>Material</th>", h)
        self.assertIn('<a href="https://example.org/a">link</a>', h)
        self.assertIn("<code>S235</code>", h)
        self.assertIn("<td>Pipe | cell</td>", h)

    @unittest.skipUnless(CT.available(), "node or engine-ts/dist missing")
    def test_1f_reads_the_same_grid_as_markdown_py(self):
        cr = CT.read_markdown(MD)
        md = markdown.read(MD, "document:t", "h")
        for t, c in zip(md["tables"], cr["tables"]):
            a = {(x["row"], x["col"]): (x["header"], " ".join(x["text"].split())) for x in t["cells"]}
            b = {(x["row"], x["col"]): (x["header"], " ".join(x["text"].split())) for x in c["cells"]}
            self.assertEqual(a.keys(), b.keys())
            for k in a:
                self.assertEqual(a[k][0], b[k][0], k)
                if "|" not in a[k][1]:  # markdown.py keeps the backslash of an escaped pipe; 1F does not
                    self.assertEqual(a[k][1], b[k][1], k)
            self.assertEqual(t["headingPath"], c["headingPath"])
            self.assertEqual(c["status"], "complete")

    @unittest.skipUnless(CT.available(), "node or engine-ts/dist missing")
    def test_arm_s_rules(self):
        md = markdown.read(MD, "document:t", "h")
        units, ledger = CT.table_units(md, CT.read_markdown(MD), lex())
        got = {(u["value"].get("number"), u["document_attitude"]) for u in units}
        self.assertIn((235.0, "asserted"), got)
        self.assertIn((400.0, "reported"), got)  # inside quotation marks: reported speech
        # a column whose header is negated is not read as stating its values (the rule scopes over that column only;
        # a negated header in another column is not propagated: a limit of R-1's arm S)
        self.assertFalse(any(u["value"].get("number") == 10.0 for u in units))
        self.assertIn("the column states what is not established", [r for e in ledger for r in e.get("reasons", [])])
        steel = [u for u in units if u["value"].get("number") == 235.0][0]
        self.assertEqual(steel["conditions"], [{"concept": "Material", "value": "steel s235"}])


if __name__ == "__main__":
    unittest.main()
