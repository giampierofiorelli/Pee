# A-1 judge guide: does the universe hold what the passage states?

You compare two lists for the same passage (lines 713–924 of a teaching document):

- **R**, the adjudicated reference: every scientific proposition the passage states, in the annotation guide's schema
  (`annotation-guide.md`). Propositions flagged `non_scientific` are not scored.
- **U**, what the system holds after reading the passage. Each item is rendered **from the system's knowledge items**
  (not from the text): subject, relation, object or value, polarity (`NOT`), modality, conditions, the author's
  attitude, the evidence kind and the cited sources. Each item carries the passage lines its source sentence came from.

You do not see the passage. Judge meaning, not wording: a different but equivalent phrasing is the same concept; a
broader or narrower concept is not. A relation written `other` keeps the document's verb as `verb`.

## Step 1: match

For every U item, find the R proposition it expresses (`match`: an R id), or say it expresses none (`spurious`). Several
U items may express parts of one R proposition; one U item expresses at most one R proposition. Use the line numbers
to stay within the right part of the passage.

## Step 2: grade each matched U item, element by element

For each element (`subject`, `relation`, `object_or_value`, `polarity`, `modality_generality`, `conditions`,
`attitude`, `evidence_kind`, `attribution`), say `right`, `missing` (the item does not hold it) or `wrong` (it holds
something different). Then:

- **faithful**: no element wrong (elements may be missing);
- **unfaithful**: at least one element wrong.

## Step 3: grade each R proposition

- **complete**: matched U items together hold every element of the proposition, none wrong;
- **partial**: matched, with at least one element missing or wrong;
- **missed**: no U item matches it.

## Critical errors (list each, with the U and R ids)

1. Polarity flipped: U affirms what R negates, or the reverse.
2. Direction or sign inverted: cause and effect swapped, or increase read as decrease.
3. Promotion: a proposal, hypothesis or open question in R held as asserted in U.
4. A synthesis, guidance or expert judgement in R held as an original measurement in U.
5. A claim attributed to a source R does not attribute it to, or to a source that does not exist.
6. Two different concepts merged into one.

Write `{"judge": "...", "u_items": [{"pid": ..., "lines": [...], "match": "B012" | null, "verdict": "faithful" |
"unfaithful" | "spurious", "elements": {...}}], "r_items": [{"id": "B012", "verdict": "complete" | "partial" |
"missed", "missing_or_wrong": [...]}], "critical": [{"type": 1, "u": "...", "r": "...", "why": "..."}]}`.
