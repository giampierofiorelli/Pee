/** Phase224 — *unverified* atomic claims from transient schema.org Product metadata.
 * This is NOT an extractor of free-text reviews, a rights grant, scientific test,
 * exact-market/variant authentication, or a recommendation/ranking module.
 * Publisher HTML exists only in the caller's stack; return no text passages.
 */
import {PAGE_MAX_BYTES} from './approved_web_reader.js';
import {createHash} from 'node:crypto';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const compact=(value:unknown,max:number):string|null=>{
 if(typeof value!=='string')return null;
 const s=value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
 return s.length>0&&s.length<=max&&!/[<>]/.test(s)?s:null;
};
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const schemaContext=(value:unknown):boolean=>{
 if(typeof value==='string')return /^https?:\/\/schema\.org\/?$/i.test(value);
 if(Array.isArray(value))return value.some(schemaContext);
 if(value&&typeof value==='object'&&!Array.isArray(value))return Object.values(value).some(schemaContext);
 return false;
};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const types=(v:unknown):string[]=> (Array.isArray(v)?v:[v]).filter((s):s is string=>typeof s==='string')
 .map(s=>s.split(/[\/#]/).pop()??'');
function brand(v:unknown):string|null{return compact(record(v)?v.name:v,100);}
function scalar(v:unknown):{value:number|string;valueType:'number'|'short_enum'}|null{
 if(typeof v==='number')return Number.isFinite(v)&&Math.abs(v)<=1e9?{value:v,valueType:'number'}:null;
 if(typeof v!=='string')return null;
 const s=v.trim();
 if(/^-?(?:\d{1,9})(?:\.\d{1,5})?$/.test(s)){
  const n=Number(s);return Number.isFinite(n)&&Math.abs(n)<=1e9?{value:n,valueType:'number'}:null;
 }
 // A deliberately narrow categorical attribute, not arbitrary review prose.
 if(s.length<=24&&!(/\d/.test(s)&&/\s/.test(s))&&/^[a-z0-9][a-z0-9 _./+\-]*$/i.test(s)&&s.split(/\s+/).length<=3)
  return {value:s,valueType:'short_enum'};
 return null;
}
export interface DeclaredAtomicClaim224{
 claimId:string;sourceUrl:string;productHypothesisKey:string;
 subject:{name:string;brand:string|null;model:string|null;sku:string|null};
 propertyKey:string;value:number|string;valueType:'number'|'short_enum';unit:string|null;
 claimStatus:'publisher_declaration_unverified';exactVariantAuthenticated:false;
 independentMeasurement:false;market:'unknown';rankingAuthorized:false;
}
export interface TransientClaims224{
 schema:'pee224.transient-declarations.v1';claims:readonly DeclaredAtomicClaim224[];
 conflictingPropertyKeys:readonly string[];subjectsWithWeakIdentity:number;
 truncated:boolean;sourceBodiesRetained:false;publisherClaimsAreNotMeasurements:true;
 rankingAuthorized:false;
}
/** Require a fully-qualified public source URL, but network authorization is
 * enforced by the Phase222 reader *before* this pure, in-memory parser runs. */
export function extractTransientClaims224(html:string,sourceUrl:string):TransientClaims224{
 const empty=():TransientClaims224=>({schema:'pee224.transient-declarations.v1',claims:[],
  conflictingPropertyKeys:[],subjectsWithWeakIdentity:0,truncated:false,
  sourceBodiesRetained:false,publisherClaimsAreNotMeasurements:true,rankingAuthorized:false});
 const out=empty();
 let url:URL;
 try{url=new URL(sourceUrl);}catch{return out;}
 if(url.protocol!=='https:'||url.username||url.password||url.port||sourceUrl.length>2048||html.length>PAGE_MAX_BYTES||!/<html\b/i.test(html))return out;
 const found:DeclaredAtomicClaim224[]=[];const seen=new Set<string>();
 const weak=new Set<string>();let count=0,truncated=false;
 const pushProduct=(obj:Record<string,unknown>)=>{
  const name=compact(obj.name,180);if(!name)return;
  const subject={name,brand:brand(obj.brand),model:compact(obj.model,100),sku:compact(obj.sku,100)};
  const identity=hash(JSON.stringify([norm(name),norm(subject.brand??''),norm(subject.model??''),norm(subject.sku??'')]));
  if(!subject.model&&!subject.sku)weak.add(identity);
  const props=Array.isArray(obj.additionalProperty)?obj.additionalProperty:[obj.additionalProperty];
  for(const prop of props.slice(0,40)){
   if(!record(prop)||!types(prop['@type']).includes('PropertyValue'))continue;
   const label=compact(prop.name,60)??compact(prop.propertyID,60);
   if(!label)continue;
   const propertyKey=norm(label);if(propertyKey.length<2||propertyKey.length>55||!/[a-z]/.test(propertyKey)||
    ['constructor','prototype','proto'].includes(propertyKey))continue;
   const value=scalar(prop.value);if(!value)continue;
   const rawUnit=prop.unitText??prop.unitCode;
   const unit=compact(rawUnit,24);
   if(rawUnit!==undefined&&!unit)continue;
   if(unit&&!/^[a-z0-9%°/ .\-]+$/i.test(unit))continue;
   const scopeKey=identity+':'+propertyKey;
   const claimId=hash(JSON.stringify([sourceUrl,scopeKey,value.value,unit]));
   if(seen.has(claimId))continue;
   if(found.length>=24){truncated=true;break;}
   seen.add(claimId);
   found.push({claimId,sourceUrl,productHypothesisKey:identity,subject,
    propertyKey,value:value.value,valueType:value.valueType,unit,
    claimStatus:'publisher_declaration_unverified',exactVariantAuthenticated:false,
    independentMeasurement:false,market:'unknown',rankingAuthorized:false});
  }
 };
 const scan=(obj:unknown,depth:number,context:boolean):void=>{
  if(++count>180||depth>7){truncated=true;return;}
  if(Array.isArray(obj)){for(const item of obj.slice(0,30))scan(item,depth+1,context);return;}
  if(!record(obj))return;
  const localContext=context||schemaContext(obj['@context']);
  if(!localContext)return;
  if(types(obj['@type']).some(t=>t==='Product'||t==='ProductModel'))pushProduct(obj);
  for(const k of ['@graph','mainEntity','itemReviewed','hasVariant','isVariantOf']){
   if(obj[k])scan(obj[k],depth+1,localContext);
  }
 };
 // Bound the JSON-LD blocks, not all scripts: retail pages often carry dozens of scripts before metadata.
 const scripts=[...html.matchAll(/<script\b([^>]{0,700})>([\s\S]*?)<\/script\s*>/gi)]
  .filter(m=>/\btype\s*=\s*(["'])application\/ld\+json\1/i.test(m[1])).slice(0,35);
 for(const [,attrs,raw] of scripts){
  if(!/\btype\s*=\s*(["'])application\/ld\+json\1/i.test(attrs)||raw.length>150000)continue;
  try{scan(JSON.parse(raw),0,false);}catch{ /* ignore invalid/untrusted publisher syntax */ }
 }
 const grouped=new Map<string,Set<string>>();
 for(const c of found){const key=c.productHypothesisKey+':'+c.propertyKey;
  const values=grouped.get(key)??new Set<string>();values.add(JSON.stringify([c.value,c.unit]));grouped.set(key,values);
 }
 return {...out,claims:found.sort((a,b)=>a.claimId.localeCompare(b.claimId)),
  conflictingPropertyKeys:[...grouped].filter(([,v])=>v.size>1).map(([k])=>k).sort(),
  subjectsWithWeakIdentity:weak.size,truncated};
}
