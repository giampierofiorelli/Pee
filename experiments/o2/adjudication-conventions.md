# O-2 adjudication conventions

**When fixed.** After the six blind judgements, **before the arm labels were revealed**. The adjudicators do not know
which reader produced which list.

## Why these conventions exist

The two judges of each list applied the judge guide with different conventions on four points. The adjudicators
decide every disputed grade against R under the uniform conventions below. They apply the same conventions to all
three lists.

## The conventions

1. **Evidence kind.** R's label is the reference. A different label is `wrong`. U's `synthesis` against R's
   `none_stated` is also `wrong`.
   - **Exception: contested propositions.** For the propositions listed in `contested.json`, the label of the second,
     independent arbitration is also accepted as `right`. These are the 36 evidence-kind disagreements between the
     two reference adjudicators.
   - **Reporting.** Accuracy on the uncontested propositions is reported separately.
2. **Generic "limitation" items.** Suppose R states a negation, and U holds `other (limitation)` with affirmed
   polarity and the restricted content as object. Then the relation is `wrong` and the polarity is `missing`. This is
   not a type-1 error, because the restriction is signalled but not represented as a negation. If U affirms the
   restricted content with a plain relation (not `limitation`), the polarity is `wrong`, and this is type 1.
3. **Attribution.** An empty U attribution, where R cites sources, is `missing`. A source that R does not give for that
   proposition is `wrong`, and this is type 5.
4. **Modality.** A deontic encoding (the relation `requires` or `recommends`, or `necessary` with a norm) counts as
   `right` for a norm. Otherwise any difference in modality is `wrong`.
5. **Matches to non-scientific R propositions.** They are graded but not scored. A critical error on them is not kept.
6. **Merged lists.** A subject or object that joins several R concepts is `wrong`. It is type 6 only where the merge
   changes the meaning.
7. **Critical errors.**
   - One listed by both judges is kept.
   - One listed by a single judge is kept only if the adjudicator, reading R and U, confirms it under these
     conventions.
