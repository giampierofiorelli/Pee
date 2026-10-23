/** Phase 153: open-class English commercial-name hypotheses, independent of an
 * installed model or product catalogue. Signals are correlated heuristics, not
 * probabilities, external verification or permission to infer product identity.
 * Every returned literal is an exact, hash-checked source-text span.
 */
import {createHash} from 'node:crypto';
import {inspectReferenceSurfaceSafety152, type SurfaceSafetyReport152, type SafetyDecision152} from './phase152_product_surface_safety.js';
import type {ReaderInput139} from './phase139_unmarked_english_candidate_reader.js';
import type {EvidenceSpan144} from './phase144_cross_category_observation_graph.js';
const sha=(t:string)=>createHash('sha256').update(t).digest('hex');
const norm=(t:string)=>t.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const caps=(s:string)=>/^\p{Lu}/u.test(s);
const hasDigit=(s:string)=>/\d/.test(s);
const allCaps=(s:string)=>/^[A-Z]{2,8}$/.test(s);
const words=(t:string)=>[...t.matchAll(/[\p{L}\p{N}]+(?:['’/-][\p{L}\p{N}]+)*/gu)].map(m=>({literal:m[0],start:m.index!,end:m.index!+m[0].length}));
const sourceSpan=(text:string,a:number,b:number):EvidenceSpan144=>({start:a,end:b,literal:text.slice(a,b),sha256:sha(text.slice(a,b))});
const stopFirst=new Set(['a','an','the','this','that','these','those','our','your','its','their','we','i','it','as','although','because','while','when','in','on','by','with','for','after','before','and','or','but','if','also','another','compared','however','during','according','test','tested','review','reviews','best','top','most','some','all','versus','vs','new','updated','premium','standard','high','low','heavy','light','eco','turbo','auto','manual','fast','quick','peak','native','full','digital']);
const technologyFirst=new Set(['hdr','sdr','usb','pcm','dsd','iso','hdmi','dolby','wifi','wi-fi','bluetooth','fps','rgb','oled','qled','uhd','4k','8k','hz','khz','watts','watt','kwh','db','ip','rpm','wifi6']);
const techniqueTerms=new Set(['mode','modes','setting','settings','cycle','cycles','programme','program','programs','test','tests','testing','reading','readings','measurement','measurements','temperature','brightness','contrast','watts','seconds','minutes','hours','degrees','db','hz','rpm','mpa','bars','celsius','fahrenheit','filter','brush','sensor','basket','lid','panel','dock','battery','remote','screen','grinder','frother','steam','wand','toasting','browning','coverage','speed','power','light','heavy','duty']);
const familyTail=new Set(['series','range','line','generation','gen']);
const variantTail=new Set(['pro','plus','max','ultra','mini','lite','compact','xl','ii','iii','iv','2026','2025']);
const reviewVerbs=/\b(?:reviewed|tested|evaluated|compared|released|replaced|succeeded|model|machine|player|product|device|toaster|air fryer|speaker|washer|television|oven|laptop)\b/i;
function isProductish(t:string){return !techniqueTerms.has(t.toLowerCase())&&!technologyFirst.has(t.toLowerCase());}
function sameArea(text:string,a:number,b:number){
 const between=text.slice(Math.min(a,b),Math.max(a,b));return !/\n\s*\n/.test(between);
}
const separate=(text:string,end:number,start:number)=>/^\s+$/.test(text.slice(end,start));
export type SurfaceKind153='possible_product'|'possible_family'|'possible_variant'|'possible_component_or_setting'|'unresolved_shorthand';
export type SurfaceSignal153='open_class_name'|'structured_phase152'|'phase148_anchor'|'caller_alias'|'page_title_correspondence'|'local_product_context'|'repeated_surface';
export interface Mention153{ id:string;span:EvidenceSpan144;nameKey:string;kind:SurfaceKind153;
 signals:SurfaceSignal153[];basis:'unverified_span_hypothesis';recognizedByBaseline:boolean;
 commercialIdentityVerified:false;sourceAuthenticityVerified:false;canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface SurfaceGroup153{id:string;surfaceKey:string;mentionIds:string[];relation:'same_written_surface_not_identity';identityVerified:false;}
export interface VariantWarning153{leftMentionId:string;rightMentionId:string;relation:'possible_family_or_variant_not_mergeable';identityVerified:false;}
export type Decision153=SafetyDecision152|'abstain_unindexed_commercial_name_153'|'abstain_entity_inventory_incomplete_153';
export interface Link153{id:string;mention:EvidenceSpan144;phase152Decision:SafetyDecision152;decision:Decision153;interferingMentionIds:string[];reasons:string[];identityVerified:false;scientificReviewRequired:true;canonicalWriteAuthorized:false;rankingAuthorized:false;}
export interface Inventory153{phase:153;sourceId:string;originalDocumentId:string;documentSha256:string;
 baseline152:SurfaceSafetyReport152;mentions:Mention153[];groups:SurfaceGroup153[];variantWarnings:VariantWarning153[];
 links:Link153[];truncated:boolean;truncationReasons:string[];sourceAuthenticated:false;
 independentGoldAnnotations:0;precision:null;recall:null;canonicalWriteAuthorized:false;rankingAuthorized:false;}
interface Draft {start:number;end:number;signals:Set<SurfaceSignal153>}
/** Retain exact source spans; aliases are caller assertions, never lookup results. */
export function discoverEntityInventory153(input:ReaderInput139,maxMentions=240,maxSurfaces152=120):Inventory153{
 if(!Number.isSafeInteger(maxMentions)||maxMentions<1||maxMentions>600)throw Error('invalid_entity_cap_153');
 const base=inspectReferenceSurfaceSafety152(input,maxSurfaces152);
 const text=input.document.text;
 if(sha(text)!==base.documentSha256)throw Error('document_digest_mismatch_153');
 const tok=words(text);const drafts=new Map<string,Draft>();
 const draftLimit=Math.max(48,maxMentions*4);let discoveryBudgetExceeded=false;
 const add=(start:number,end:number,signal:SurfaceSignal153)=>{
  if(start<0||end<=start||end>text.length)return;
  const key=`${start}:${end}`,old=drafts.get(key);
  if(old)old.signals.add(signal);else if(drafts.size>=draftLimit)discoveryBudgetExceeded=true;
  else drafts.set(key,{start,end,signals:new Set([signal])});
 };
 for(const s of base.possibleSurfaces)add(s.span.start,s.span.end,'structured_phase152');
 for(const a of base.baseline151.baseline149.baseline148.anchors)add(a.span.start,a.span.end,'phase148_anchor');
 // Source-asserted aliases are matched by exact text and word boundaries, not
 // substring similarity or an assumed manufacturer-catalogue identity.
 for(const alias of input.pageIdentity?.reviewedAliases??[]){
  if(typeof alias!=='string'||alias.length<3||alias.length>120)continue;
  const lower=text.toLocaleLowerCase('en'),q=alias.toLocaleLowerCase('en');let at=0;
  while((at=lower.indexOf(q,at))>=0){const end=at+alias.length;
   if((at===0||!/[\p{L}\p{N}]/u.test(text[at-1]))&&(end===text.length||!/[\p{L}\p{N}]/u.test(text[end])))add(at,end,'caller_alias');
   at=end;
  }
 }
 // A candidate lattice, not regex per appliance. A model surface must begin
 // with a non-generic proper token, and subsequent proper/model tokens must be
 // contiguous. Numeric/model tokens may occur anywhere after the first token.
 for(let i=0;i<tok.length;i++){
  const first=tok[i],f=first.literal,low=f.toLowerCase();
  if(!caps(f)||stopFirst.has(low)||technologyFirst.has(low)||!isProductish(low))continue;
  const chain=[first];
  for(let j=i+1;j<tok.length&&chain.length<9;j++){
   const current=tok[j],prev=chain[chain.length-1];
   if(!separate(text,prev.end,current.start))break;
   const w=current.literal,l=w.toLowerCase();
   if(technologyFirst.has(l)&&!allCaps(w))break;
   // Common non-product or prose tails are not model suffixes.
   if(techniqueTerms.has(l)&&!caps(w))break;
   if(!caps(w)&&!hasDigit(w))break;
   if(/^20\d\d$/.test(w)&&!chain.some(x=>hasDigit(x.literal))&&chain.length<2)break;
   chain.push(current);
  }
  if(chain.length<2)continue;
  // A second capitalized token alone is insufficient outside a page-title
  // match; long all-word product names can still be nominated by typography.
  const title=norm(input.document.source.title??'');
  const tryLengths=new Set<number>([chain.length]);
  if(chain.length>2){for(let k=2;k<chain.length;k++)if(hasDigit(chain[k-1].literal)||familyTail.has(chain[k-1].literal.toLowerCase())||variantTail.has(chain[k-1].literal.toLowerCase()))tryLengths.add(k);}
  for(const n of tryLengths){
   const last=chain[n-1],raw=text.slice(first.start,last.end),key=norm(raw);
   const titleMatch=title.includes(key)&&key.length>=6;
   const numeric=chain.slice(1,n).some(x=>hasDigit(x.literal));
   const multiword=n>=3;const lexemes=chain.slice(1,n).filter(x=>isProductish(x.literal));
   if((numeric||multiword||titleMatch||(/[’']/.test(first.literal)&&n>=2))&&lexemes.length>0){
    if(n===2&&!numeric&&!titleMatch&&!/[’']/.test(first.literal))continue;
    // Reject obvious unit/cycle or diagnostic labels even if title-cased.
    if(techniqueTerms.has(chain[1].literal.toLowerCase())&&!titleMatch)continue;
    add(first.start,last.end,'open_class_name');
   }
  }
  i+=chain.length-1;
 }
 // A standalone model shorthand can be recorded without assuming brand or
 // variant. Only when it occurs explicitly in the page title or follows an
 // already captured named surface in the same paragraph.
 for(let i=0;i<tok.length;i++){
  const t=tok[i];if(!/^\d{3,5}[a-z]?$/i.test(t.literal))continue;
  const nearby=[...drafts.values()].some(d=>d.end<=t.start&&sameArea(text,d.end,t.start)&&t.start-d.end<260);
  const titled=new RegExp(`(?:^|\\s)${t.literal}(?:\\s|$)`,'i').test(input.document.source.title??'');
  const before=text.slice(Math.max(0,t.start-15),t.start);
  const after=text.slice(t.end,t.end+95);
  const isUnit=/^\s*(?:rpm|Hz|kHz|MHz|watts?|W|ml|L|mm|cm|°C|°F|dB|seconds?|minutes?|hours?)\b/i.test(after);
  // Without a named predecessor, 'The 3200 is a ... device' is a weak
  // product-reference hypothesis; '3200 rpm' and '3200 number' are not.
  const descriptor=/^\s+is\s+(?:an?\s+)?(?:[a-z-]+\s+){0,6}(?:device|model|machine|purifier|toaster|player|speaker|oven|washer|appliance)\b/i.test(after);
  if(!isUnit&&(titled||((nearby||descriptor)&&/\b(?:the|this)\s+$/i.test(before))))add(t.start,t.end,'local_product_context');
 }
 // Permit a repeated two-word family head even without a numeric code, but
 // only if a longer *separately observed* candidate shares that written head.
 // Never merge the head with its Pro/Plus/size sibling.
 const candidateNames=[...drafts.values()].map(d=>norm(text.slice(d.start,d.end)));
 for(let i=0;i+1<tok.length;i++){
  const a=tok[i],b=tok[i+1];
  if(!caps(a.literal)||!caps(b.literal)||!separate(text,a.end,b.start)||
    stopFirst.has(a.literal.toLowerCase())||technologyFirst.has(a.literal.toLowerCase())||
    techniqueTerms.has(b.literal.toLowerCase()))continue;
  const key=norm(text.slice(a.start,b.end));
  if(candidateNames.some(v=>v.startsWith(key+' ')))add(a.start,b.end,'open_class_name');
 }
 const sorted=[...drafts.values()].sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));
 // Longest-overlap selection, except keep distinct disjoint adjacent surfaces.
 // A nested older Phase148 partial span is not a competing product.
 const selected:Draft[]=[];
 for(const d of sorted){const at=selected.findIndex(v=>d.start<v.end&&v.start<d.end);
  if(at<0){selected.push(d);continue;}
  const old=selected[at];
  if(d.start<=old.start&&d.end>=old.end&&(d.end-d.start>old.end-old.start)){
   d.signals=new Set([...old.signals,...d.signals]);selected[at]=d;
  }else if(old.start<=d.start&&old.end>=d.end){for(const signal of d.signals)old.signals.add(signal);}
 }
 selected.sort((a,b)=>a.start-b.start||a.end-b.end);
 const clipped=selected.length>maxMentions;
 const kept=selected.slice(0,maxMentions);
 const baselineAnchors=base.baseline151.baseline149.baseline148.anchors;
 const titleKey=norm(input.document.source.title??'');
 const mentions:Mention153[]=kept.map(d=>{
  const literal=text.slice(d.start,d.end),key=norm(literal),tokens=literal.split(/\s+/),tail=tokens.at(-1)?.toLowerCase()??'';
  if(titleKey.includes(key)&&key.length>=6)d.signals.add('page_title_correspondence');
  if(reviewVerbs.test(text.slice(Math.max(0,d.start-65),Math.min(text.length,d.end+80))))d.signals.add('local_product_context');
  if(selected.filter(x=>norm(text.slice(x.start,x.end))===key).length>=2)d.signals.add('repeated_surface');
  const recognized=baselineAnchors.some(a=>a.span.start<=d.start&&a.span.end>=d.end)||
   base.possibleSurfaces.some(s=>s.span.start<=d.start&&s.span.end>=d.end&&s.recognizedByBaseline);
  const kind:SurfaceKind153=/^\d{3,5}[a-z]?$/i.test(literal)||(/^[A-Z]{2,4}\s+\d+$/.test(literal)&&!d.signals.has('caller_alias'))?'unresolved_shorthand':
   familyTail.has(tail)?'possible_family':
   variantTail.has(tail)||(/\d/.test(literal)&&tokens.length>2&&hasDigit(tokens.at(-1)!))?'possible_variant':
   techniqueTerms.has(tail)?'possible_component_or_setting':'possible_product';
  return {id:`m153_${d.start}_${d.end}`,span:sourceSpan(text,d.start,d.end),nameKey:key,kind,
   signals:[...d.signals].sort(),basis:'unverified_span_hypothesis',recognizedByBaseline:recognized,
   commercialIdentityVerified:false,sourceAuthenticityVerified:false,canonicalWriteAuthorized:false,rankingAuthorized:false};
 });
 const surfaceKeys=[...new Set(mentions.map(m=>m.nameKey))];
 const groups:SurfaceGroup153[]=surfaceKeys.map((key,i)=>({id:`g153_${i}`,surfaceKey:key,
  mentionIds:mentions.filter(m=>m.nameKey===key).map(m=>m.id),relation:'same_written_surface_not_identity',identityVerified:false}));
 const variants:VariantWarning153[]=[];
 for(let i=0;i<mentions.length;i++)for(let j=i+1;j<mentions.length;j++){
  const a=mentions[i],b=mentions[j];if(a.nameKey===b.nameKey)continue;
  const aa=a.nameKey.split(' '),bb=b.nameKey.split(' ');
  if(Math.min(aa.length,bb.length)>=2&&aa[0]===bb[0]&&aa[1]===bb[1]&&
   (a.nameKey.startsWith(b.nameKey+' ')||b.nameKey.startsWith(a.nameKey+' ')))
   variants.push({leftMentionId:a.id,rightMentionId:b.id,relation:'possible_family_or_variant_not_mergeable',identityVerified:false});
 }
 const truncated=base.truncated||clipped||discoveryBudgetExceeded;
 const links:Link153[]=base.links.map(l=>{
  const anchors=l.candidateAnchorIds.map(id=>baselineAnchors.find(a=>a.id===id)).filter((a):a is typeof baselineAnchors[number]=>!!a);
  // The local context is the paragraph of the reference and of each proposed
  // anchor. Only high-evidence plausible new names are allowed to veto.
  const nearby=mentions.filter(m=>
   (sameArea(text,m.span.start,l.mention.start)||anchors.some(a=>sameArea(text,m.span.start,a.span.start)))&&
   !m.recognizedByBaseline&&m.kind!=='possible_component_or_setting'&&m.kind!=='unresolved_shorthand'&&
   !anchors.some(a=>a.span.start<=m.span.start&&a.span.end>=m.span.end)&&
   (m.signals.includes('page_title_correspondence')||m.signals.includes('caller_alias')||
    (m.signals.includes('open_class_name')&&m.span.literal.split(/\s+/).length>=3)));
  const canLink=l.decision==='retained_phase149'||l.decision.endsWith('candidate_unverified');
  let decision:Decision153=l.decision;const reasons=[...l.reasons];
  if((clipped||discoveryBudgetExceeded)&&canLink){decision='abstain_entity_inventory_incomplete_153';reasons.push(discoveryBudgetExceeded?'phase153_discovery_budget_exceeded':'phase153_entity_cap_exceeded');}
  else if(canLink&&nearby.length){decision='abstain_unindexed_commercial_name_153';reasons.push('unindexed_named_surface_requires_review');}
  return {id:`l153_${l.mention.start}_${l.mention.end}`,mention:l.mention,phase152Decision:l.decision,decision,
   interferingMentionIds:decision==='abstain_unindexed_commercial_name_153'?nearby.map(m=>m.id):[],reasons,
   identityVerified:false,scientificReviewRequired:true,canonicalWriteAuthorized:false,rankingAuthorized:false};
 });
 return {phase:153,sourceId:base.sourceId,originalDocumentId:base.originalDocumentId,
  documentSha256:base.documentSha256,baseline152:base,mentions,groups,variantWarnings:variants,links,
  truncated,truncationReasons:[...base.truncationReasons,...(clipped?['phase153_entity_cap_exceeded']:[]),...(discoveryBudgetExceeded?['phase153_discovery_budget_exceeded']:[])],
  sourceAuthenticated:false,independentGoldAnnotations:0,precision:null,recall:null,
  canonicalWriteAuthorized:false,rankingAuthorized:false};
}
