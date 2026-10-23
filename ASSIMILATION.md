# Scientific Knowledge Assimilation — permanent architectural requirement (owner, 2026-10-23)

**Status.** The owner fixed this as a **permanent architectural requirement of Pee** on 2026-10-23. It sits beside
`MISSION.md` and does not replace it. It does not modify S0 (`spec/`), which stays the semantic authority.

- **What it authorises.** No work by itself. Each implementation phase needs its own explicit owner authorisation.
  The first is A-1 (`experiments/a1/REPORT.md`).
- **Language.** The English specification below is the owner's text, verbatim. The two closing paragraphs were
  written in Italian; they follow verbatim, each with an English translation.

---

## PEE — Scientific Knowledge Assimilation: Architectural Objective

### 1. The fundamental objective

I want to clarify a requirement that has not been communicated sufficiently clearly during the development of Pee.

Pee must not become a document library, a scientific search engine over stored documents, or a RAG system that
retrieves passages whenever it needs knowledge.

The scientific documents I provide are teaching material.

Their purpose is to transfer scientific knowledge into Pee's existing semantic universe.

Once that knowledge has been faithfully interpreted, structurally represented, linked, verified and admitted, Pee
must be able to use it without reopening or consulting the original document.

The temporary working copy of the document should then disappear, subject to rights, verification and retention
requirements. The owner's original files must never be deleted.

The lasting result must be the scientific knowledge itself, expressed in the semantic universe, together with the
provenance, epistemic standing, dependencies and minimal audit metadata needed to manage it responsibly.

This is an essential architectural requirement, not an optional optimisation.

### 2. Progressive translation, never summarisation

The acquisition process must work progressively through the document.

As Pee reads, it must identify each scientifically meaningful statement or proposition and translate its full meaning
into the existing semantic universe.

Never substitute summarisation for knowledge acquisition.

A sentence may express several propositions. One proposition may depend on information from previous sentences,
headings, figures, tables, captions or later qualifications.

Consequently, acquisition must preserve the necessary context while operating progressively.

For every relevant scientific statement, identify and represent, as applicable:

* Concepts, entities, properties, parts and relationships.
* Physical phenomena, processes, mechanisms and causal explanations.
* Quantitative measurements, units, ranges, tolerances and uncertainties.
* Qualitative findings, observations, expert judgments and their scope.
* Conditions, operating modes, experimental configurations and methodological assumptions.
* Methods, instruments, standards and criteria of validity.
* Comparisons, dependencies, derived quantities and competing explanations.
* Limitations, exceptions, contradictions, hypotheses and unknowns.
* Attribution, source identity, evidence type, authority and epistemic standing.

These elements must become actual semantic-universe items and relations, not merely strings, keywords, summaries or
embedded passages.

Maintain explicit accounting for statements that remain unresolved, incomplete or ambiguous. Never silently discard
scientifically relevant meaning.

Translations may be revised when later context clarifies an earlier statement. Nothing uncertain should be promoted
to established knowledge without its grounds.

### 3. The semantic universe is the actual memory

The existing S0/MS1 foundations must be the authoritative representation of knowledge.

Acquisition must produce universe-compatible contents, concepts, relationships, contextual conditions, models,
methods and provenance.

Inference rules must query and operate on those universe items.

Do not create another independently authoritative knowledge store, parallel ontology, category-specific interpreter
or system of keyword rules.

Embeddings or vectors may eventually assist candidate discovery or recognition, but they are not a substitute for
explicitly represented scientific meaning. Their use is optional, not an architectural prerequisite.

Temporary parsing structures are acceptable during acquisition. They must not become a second permanent source of
scientific truth.

Knowledge acquisition is complete only when the relevant meaning exists in the universe and its services can actually
use it.

### 4. Two input routes, one assimilation mechanism

There are two distinct ways in which Pee will encounter knowledge.

Route A — Scientific documents supplied by the owner

These include the extensive scientific category research already produced for the original Crawler project.

They should be acquired directly from their native formats, rather than being unnecessarily converted into Web pages
or forced through Crawler's currently limited HTML specification extractor.

These documents may contain extensive technical explanations, methodology, scientific relationships, expert
interpretation and cross-category knowledge.

They are valuable precisely because their content is substantially richer than individual product specification
pages.

Route B — Future autonomous research

Crawler's operational capabilities will eventually supply pages, articles, tables, reviews, test reports and other
authorised research material.

Crawler may contribute navigation, structural reading, product attribution, access controls and rights management.

Its interpretations must not automatically become scientific truth.

Both routes must converge on the same general semantic assimilation mechanism.

We may have different input readers, but we must have one scientific universe and one coherent mechanism for
integrating knowledge.

The weakness of today's Web reader must not prevent the scientific universe from growing through owner-supplied
documents.

Conversely, improvements in the universe's scientific knowledge should eventually be available to improve research,
reading, extraction and attribution.

That feedback loop is a future capability to implement and measure, not something already demonstrated.

### 5. Reuse the scientific research we already possess

Before commissioning broad new Web research, inventory the existing research packages from the original project.

Do not recreate files already available.

Do not assume that every previously discussed research package exists as a complete, accessible file. Establish the
exact paths, versions, completeness, provenance and access permissions.

The currently authorised teaching materials include the air purifier and dehumidifier research packages. Robot
vacuums are reserved as a transfer/comparison category under the existing authorisation.

The broader scientific research portfolio must be considered for subsequent acquisition, once its files and
permissions have been verified.

Preserve a strict distinction between:

* An original scientific source that was actually examined.
* A measured result or observation attributed to that source.
* A scientific explanation or synthesis prepared during our research.
* An expert's qualitative judgment.
* A hypothesis requiring further validation.

A teaching document is not automatically independent experimental evidence merely because it contains references.

Use existing knowledge to support interpretation, not to manufacture missing source verification.

### 6. What should happen after a document is assimilated?

Pee should be able to:

* Retrieve and use the acquired scientific concepts without consulting the original file.
* Follow relationships between quantities, phenomena, methods, conditions and outcomes.
* Recognise when two claims are compatible, conflicting or not comparable.
* Use knowledge acquired in one category when scientifically applicable to another.
* Apply existing inference services to newly acquired knowledge.
* Identify gaps and generate meaningful research questions.
* Incorporate subsequent evidence without losing history or provenance.
* Reconsider dependent knowledge when supporting evidence is corrected or withdrawn.

For example, knowledge about airflow, pressure, humidity, energy, sound and measurement uncertainty acquired from
air-purifier or dehumidifier research should become reusable scientific knowledge, not permanently isolated under
those product-category labels.

Do not assume that all such knowledge transfers: applicability conditions, differing physical mechanisms and
methodological constraints must be explicit.

### 7. No permanent dependency on the original document

The intended document lifecycle is:

Temporary input → contextual reading → proposition-level semantic translation → validation and integration →
completeness audit → removal of the temporary input copy.

The owner's original document remains untouched.

Pee retains the admissible structured scientific knowledge, its context, provenance, grounds, standing and minimal
document-identification or integrity metadata.

Do not retain the complete original document, extensive page text or an equivalent permanent passage archive as an
alternative knowledge source.

Do not remove a temporary working copy before its acquisition has been audited. If relevant content could not be
translated, explicitly record the gap and its cause without falsely claiming successful assimilation.

If temporary retention is necessary for correction, it must be authorised, limited and governed by the applicable
retention policy.

The acquisition process must also respect source rights. Owner permission to read a file does not automatically
authorise unrestricted retention or redistribution of everything within it.

### 8. Measure the correct capabilities at this stage

Do not use product recommendations or the overall number of buyer questions answered as the primary measure of
progress during scientific-universe formation.

Assess separately:

A. Translation fidelity. How many scientifically meaningful propositions are represented completely and correctly?
Which elements are missing, misplaced or ambiguous?

B. Semantic integration. Are new propositions connected to existing concepts, quantities, conditions and methods
without incorrect mergers or duplication?

C. Reasoning with supplied knowledge. When correct knowledge is already present, do MS1's rules derive justified
conclusions and abstain appropriately?

D. Knowledge-only improvement. With acquisition and inference code frozen, does adding only scientific knowledge
improve recognition, interpretation and inference?

E. Cross-category reuse. Does knowledge acquired in one field become operationally useful in another without
category-specific code changes?

F. Document independence. After the authorised temporary input is removed, can the same conclusions be derived from
universe items alone?

Clearly distinguish manual teaching, guided acquisition, autonomous acquisition and demonstrated learning. These are
different capabilities.

Do not claim autonomous learning merely because Claude has written knowledge items or because a prepared document
has been imported successfully.

### 9. Engineering and continuity constraints

Preserve all established architectural decisions and the results of X1, X2, V1, I-1 and I-2.

Crawler remains unchanged and available as the original product. Do not migrate or rewrite it.

Work within Pee, using S0 as the scientific-semantic contract and MS1's existing services wherever possible.

Before implementation, examine what the currently authorised scientific-teaching phase has already built. Do not
duplicate it.

Prefer general, reusable mechanisms over category-specific fixes, special-case dictionaries and disconnected
demonstrations.

Keep the implementation bounded, with a meaningful vertical test, explicit failure conditions, rights checks and
measured outcomes. Do not expand into multiple parallel development streams.

The first useful demonstration should be the faithful transformation of a real scientific passage containing several
linked propositions, not merely an isolated numerical specification.

After acquisition, show that its structured knowledge supports distinct inferences without access to the input
document.

### 10. What I want from the next phase

When the current scientific-teaching phase is complete, evaluate how closely its implementation meets this
specification.

Identify what already exists, what is genuinely missing and what would have to change.

Propose the smallest operational increment that achieves progressive, proposition-level assimilation of
owner-supplied scientific documents into the existing semantic universe, with no permanent document archive.

Make clear what attachments and permissions are required before execution.

Do not begin a new implementation, access additional private research packages, perform broad Web searches, delete
source documents or make irreversible changes merely because this specification has been supplied.

The next implementation requires its own explicit authorisation.

The ultimate objective is not to build a system that knows where scientific knowledge can be found. It is to build a
system in which scientifically justified knowledge has actually become part of the universe, can be reasoned over,
and can support further learning.

---

## Owner's closing paragraphs (Italian, verbatim, with English translation)

> Non voglio nemmeno che la traduzione diventi una procedura meccanica del tipo «una frase = una scheda». Una frase
> può contenere tre relazioni scientifiche, mentre una spiegazione causale può estendersi per cinque paragrafi.
>
> La fedeltà deve essere al significato scientifico, non alla forma grammaticale del documento.

*Translation.* Nor do I want translation to become a mechanical "one sentence = one card" procedure. A sentence can
contain three scientific relations, while a causal explanation can extend over five paragraphs. Fidelity must be to
the scientific meaning, not to the grammatical form of the document.

> E soprattutto, quando Pee avrà assimilato correttamente una conoscenza, non dovrebbe esserci differenza operativa
> tra una nozione insegnata dai nostri documenti e una acquisita successivamente tramite ricerca autonoma. Cambieranno
> origine e affidabilità, non il linguaggio dell'universo né le regole che possono utilizzarla.

*Translation.* Above all, once Pee has correctly assimilated a piece of knowledge, there should be no operational
difference between a notion taught by our documents and one acquired later through autonomous research. Their origin
and reliability will differ; the language of the universe and the rules that can use it will not.
