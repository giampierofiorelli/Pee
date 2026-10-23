/**
 * A6 (first increment, owner authorisation 2026-10-21): where the default quantity-knowledge pack is, and its raw
 * content. Kept apart from quantity_knowledge.ts so that language_scope.ts (which quantity_knowledge uses) can read the
 * default scope words without importing quantity_knowledge: this removes the import cycle introduced by R3-P.
 * Validation of the pack stays in quantity_knowledge.loadQuantityKnowledge.
 */
import {readFileSync} from 'node:fs';
/** The default pack. v1 stays loadable (pass its JSON) to reproduce readings identified by qk.1. */
export const DEFAULT_QUANTITY_PACK='quantity-knowledge.v3.json';
/** The default pack as stored (unvalidated JSON). */
export function readDefaultQuantityPack():unknown{
 return JSON.parse(readFileSync(new URL('../../resources/quantity-knowledge/'+DEFAULT_QUANTITY_PACK,import.meta.url),'utf8'));
}
