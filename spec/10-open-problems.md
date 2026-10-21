# 10. Open problems and the status of formal properties

Requirement addressed: R20.

## 10.1 Open theoretical problems

Each problem is stated with what S0 already provides and what remains unresolved.

| Id | Problem | What S0 provides | What remains open |
|---|---|---|---|
| **O1** | **Where the boundary between core and collateral lies.** When should a connection be demoted from core to collateral, as in E10? | The split is frame-relative and revisable (D5). Repair history is a ground for deeper revision (6.3). | No rule or criterion decides demotion. Whether one can exist without making Quine's objection return is unsettled. |
| **O2** | **Identity of meaning across frames**, including latent constructs and incommensurable frames | Graded relations, including "undetermined" and relations relative to a domain (3.5.1). Recognition evidence is ranked (3.5.2). | No sufficient conditions for identity across frames. Thresholds for treating structural congruence as co-reference. |
| **O3** | **Grounding for a system that does not perceive directly**, and the circularity of operational anchors, since instruments are themselves described by theories | Exemplar and operational anchors (D4). Epistemic iteration is accepted as a non-vicious form of circularity (Chang, 2004). | Whether anchors that pass through records and other people's instruments give *sufficient* grounding (Harnad, 1990). How the circle of instrument and theory is entered in practice. |
| **O4** | **Choice of uncertainty calculus**, and how kinds of uncertainty combine | Kinds of uncertainty are separated, and obligations are stated (4.9). | Which calculus or combination meets the obligations at acceptable cost. How to propagate between kinds, for example structural plus parameter uncertainty. |
| **O5** | **Vagueness** | Vagueness is listed as a distinct kind of uncertainty (4.9). Property spaces allow graded regions (A4). | Whether borderline cases are best treated by degrees, by supervaluation or by epistemicism (Williamson, 1994). How vagueness interacts with standing. |
| **O6** | **Combining heterogeneous evidence**: trials, mechanisms, observational data, expert judgement | The properties of evidence that any method needs are represented (5.8). | No combination method is specified. The weighting of mechanistic against statistical evidence remains debated. |
| **O7** | **Formal properties** of the representation | See section 10.2. | Everything that depends on S1. |
| **O8** | **Licensing analogy and transfer** | The conditions TC1–TC5 (6.4). | The conditions are necessary, not shown to be sufficient. Judging "relevant" similarity is not fully formalised (Bartha, 2010). |
| **O9** | **Relations between levels**: reduction, realisation, supervenience, emergence | Constitution is distinguished from causation (5.5). Whole properties are recorded on wholes (Op3). Levels are a context parameter (4.3). | No account of when properties at a higher level are reducible. What makes multi-scale model composition admissible beyond Op8's conditions. |
| **O10** | **Values and normative criteria** in evaluation | Values are explicit, relative to a holder and kept apart from facts (7.4). | How to represent trade-offs, incommensurable values and legitimate disagreement about weights. Where values legitimately enter inference, for example in evidence thresholds (Douglas, 2009). |
| **O11** | **Granularity of concepts**: one concept with several cores, or several concepts? | Both are representable, linked by lineage (E1, E3). | A criterion for choosing a granularity, or an argument that the choice is conventional. |
| **O12** | **Status of abstract structures** and of modal semantics | Abstract structures are representable as used in models (3.7). Both possible-worlds and dispositional semantics are admissible (4.8). | Realism, structuralism or fictionalism about mathematics. Which modal semantics fits which content type. |
| **O13** | **Reflexivity**: the universe assessing its own methods | A stratification requirement (7.5). | The form of stratification, and how to avoid regress while letting methods support each other. |
| **O14** | **Whether the meta-level is complete and minimal** | D1–D16 have been applied to the design examples E1–E11 (not evidence). | Whether D1–D16 suffice for the areas not covered (8.14), and whether some notion is redundant. |
| **O15** | **Tacit knowledge** | Its existence and its holders are representable (5.10). Methods allow procedures that are only partly described (7.3). | How far skills can be represented at all. How tacit knowledge figures in grounds. |
| **O16** | **Cost of explicitness.** T7 requires context, and T6 requires standing and grounds, for every content. This could be prohibitively heavy. | Degenerate models (D7). Context marked "unspecified" is allowed (4.3). | Whether declared defaults (for example a default frame for a domain) can reduce the cost without breaking T7 in practice. This needs to be studied in S1. |
| **O17** | **Interpreting scientific language**, including hedging, implicature and rhetorical structure. How hedges in texts map to standing (Hyland, *Hedging in Scientific Research Articles*, 1998). | Attribution before adoption. Interpretation is a hypothesis (6.1). | Systematic criteria for mapping linguistic hedges to the dimensions of standing. |
| **O18** | **Whether model-centred standing reduces to standing on contents** | Standing, revision and coherence apply to models, methods, records and frames (3.6). | Whether every such standing can be faithfully re-expressed as standing on finite or infinite sets of fit contents. If it can, the departure from an assertion-based model concerns organisation, not expressive power (V6). |

## 10.2 Status of formal properties

S0 fixes **no formal language, logic or calculus**. Therefore **no decidability, complexity or expressiveness result
can be stated for S0 itself**. Any such statement would depend on S1 choices. What S0 can state precisely is
which known results become relevant under which conditions:

1. **First-order validity.** If S1 represents the general contents of section 4.2 in classical first-order logic
   with at least one binary relation symbol, validity is undecidable in general (Church, "A note on the Entscheidungsproblem", 1936; Turing, "On computable numbers, with
   an application to the Entscheidungsproblem", 1936). Validity, and therefore inconsistency, is semi-decidable: valid formulas can be
   enumerated. **Consistency (satisfiability), which checking C1 requires, is not semi-decidable.**
2. **Description logics.** If S1 restricts definitions to a description logic, decidable fragments exist. For
   example, the description logic SROIQ is decidable (Horrocks, Kutz and Sattler, "The even more irresistible
   SROIQ", 2006), and its satisfiability problem is N2EXPTIME-complete (Kazakov, "RIQ and SROIQ are harder than
   SHOIQ", 2008). Such fragments cannot express everything S0 requires, such as counterfactuals, opaque contexts
   and full quantity arithmetic, so they could serve only for parts of the universe.
3. **Belief revision.** If S1 uses propositional belief revision of the AGM family, deciding whether a formula
   follows from a revised knowledge base is Π₂ᵖ-complete for many standard revision operators (Eiter and Gottlob,
   "On the complexity of propositional knowledge base revision, updates, and counterfactuals", 1992).
4. **Probabilistic inference.** If S1 uses Bayesian networks over discrete variables, exact inference is NP-hard
   (Cooper, "The computational complexity of probabilistic inference using Bayesian belief networks", 1990).
   Exact inference is in fact #P-hard (Roth, "On the hardness of approximate reasoning", 1996). Approximating a
   conditional probability, given evidence, to within an absolute error smaller than 1/2 is also NP-hard (Dagum and
   Luby, "Approximating probabilistic inference in Bayesian belief networks is NP-hard", 1993).
5. **Self-reference.** Suppose the universe's language is interpreted classically, can represent enough arithmetic
   for diagonalisation (for example Robinson arithmetic), and is used to talk about its own contents. Then no
   formula of that language can define truth for that language, that is, satisfy the T-schema for all its sentences
   (Tarski, "Der Wahrheitsbegriff in den formalisierten Sprachen", 1936). This
   is why section 7.5 requires stratification.

**Consequence for S1 (stated as a conditional, not as a result).** S0 requires first-order generality with relations
(4.2), modalities and counterfactuals (4.6, 4.8), opaque contexts (Op9) and quantities with arithmetic (4.7). If all
of these are represented in a single classical logic, general reasoning over the universe will be undecidable. S1
will then have to choose between decidable fragments for particular tasks, bounded or approximate procedures with
stated guarantees, or both. S0 does not make that choice.

**Expressiveness** is likewise open. Whether the meta-level D1–D16 suffices is a question of coverage, tested by AQ1
(chapter 9). It is not a formal expressiveness result.
