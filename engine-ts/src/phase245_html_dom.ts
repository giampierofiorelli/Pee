/** Phase245: small, dependency-free, bounded HTML tree builder for transient specification reading.
 * It follows the parts of the HTML parsing rules that matter for structure (void elements, raw-text
 * elements, implied end tags for p/li/dt/dd/tr/td/th/option, table sections) and ignores the rest.
 * It is NOT a conforming HTML5 parser and never executes scripts. Page text is processed in memory
 * only; nothing here is persisted.
 */
export interface Node245 {
 kind:'element'|'text';tag:string;attrs:Record<string,string>;children:Node245[];
 parent:Node245|null;text:string;
 /** Document order, used for deterministic locators. */
 order:number;
 /** Only with parseHtml245(html,{keepSource:true}): source offsets of the element (start of its start tag, end of its start
  * tag, end of the element: after its end tag, or where an implied end or end of input closed it), and, for text nodes,
  * the undecoded source text (concatenated when adjacent source runs merged into one node). Nothing else changes. */
 src?:{start:number;startTagEnd:number;end:number};rawText?:string;rawAttrs?:Record<string,string>;implied?:boolean;
}
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const RAW=new Set(['script','style','textarea','title','noscript','template','xmp','iframe','noembed','noframes']);
const BLOCK_CLOSES_P=new Set(['address','article','aside','blockquote','details','div','dl','fieldset','figcaption','figure',
 'footer','form','h1','h2','h3','h4','h5','h6','header','hr','main','menu','nav','ol','p','pre','section','table','ul']);
/** Implied end tags: opening KEY closes an open element in VALUE, but not across the given boundaries. */
const IMPLIED:Record<string,{closes:string[];boundary:string[]}>={
 li:{closes:['li'],boundary:['ul','ol','menu']},
 dt:{closes:['dt','dd'],boundary:['dl']},dd:{closes:['dt','dd'],boundary:['dl']},
 tr:{closes:['tr','td','th'],boundary:['table','thead','tbody','tfoot']},
 td:{closes:['td','th'],boundary:['tr','table']},th:{closes:['td','th'],boundary:['tr','table']},
 thead:{closes:['thead','tbody','tfoot','tr','td','th'],boundary:['table']},
 tbody:{closes:['thead','tbody','tfoot','tr','td','th'],boundary:['table']},
 tfoot:{closes:['thead','tbody','tfoot','tr','td','th'],boundary:['table']},
 option:{closes:['option'],boundary:['select','datalist']},
};
const NAMED:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',times:'×',deg:'°',
 ndash:'–',mdash:'—',minus:'−',frac12:'½',frac14:'¼',frac34:'¾',sup2:'²',sup3:'³',micro:'µ',euro:'€',pound:'£',
 yen:'¥',cent:'¢',reg:'®',trade:'™',copy:'©',hellip:'…',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',plusmn:'±',
 le:'≤',ge:'≥',prime:'′',Prime:'″',middot:'·',bull:'•',thinsp:' ',ensp:' ',emsp:' ',shy:'',
 rarr:'→',larr:'←',uarr:'↑',darr:'↓',harr:'↔',raquo:'»',laquo:'«',rsaquo:'›',lsaquo:'‹',sbquo:'‚',bdquo:'„',dagger:'†'};
export function decodeEntities245(s:string):string{
 if(!s.includes('&'))return s;
 return s.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z][a-z0-9]{1,10});?/gi,(m,k:string)=>{
  if(k[0]==='#'){const hex=k[1]==='x'||k[1]==='X';const n=parseInt(k.slice(hex?2:1),hex?16:10);
   return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'�';}
  return NAMED[k]??NAMED[k.toLowerCase()]??m;
 });
}
const MAX_NODES=250_000,MAX_DEPTH=400,MAX_TAG=2_000_000;
/** Returns [whole, slash, name, attributeText, selfClose] like the former regex, plus the end offset. */
function scanTag(html:string,start:number):{0:string;1:string;2:string;3:string;4:string;end:number}|null{
 const head=/^<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)/.exec(html.slice(start,start+256));
 if(!head)return null;
 let j=start+head[0].length;const limit=Math.min(html.length,start+MAX_TAG);let quote='';
 for(;j<limit;j++){const c=html[j];
  if(quote){if(c===quote)quote='';continue;}
  if(c==='"'||c==="'"){if(/[=\s]/.test(html[j-1]??'')||/=\s*$/.test(html.slice(Math.max(start,j-8),j)))quote=c;continue;}
  if(c==='>')break;
  if(c==='<'&&j>start+head[0].length&&!quote)return null; // a stray "<": not a well-formed tag
 }
 if(j>=limit)return null;
 const inner=html.slice(start+head[0].length,j);const selfClose=/\/\s*$/.test(inner)?'/':'';
 return {0:html.slice(start,j+1),1:head[1],2:head[2],3:selfClose?inner.replace(/\/\s*$/,''):inner,4:selfClose,end:j+1};
}
/** Parse HTML into a bounded tree. Throws only on unsupported input type; oversize input is truncated
 * at the node budget (the result notes this with `truncated`). */
export function parseHtml245(html:string,opts:{keepSource?:boolean}={}):{root:Node245;nodeCount:number;truncated:boolean}{
 if(typeof html!=='string')throw Error('245_html_not_string');
 const keep=opts.keepSource===true;let tagStart=0;
 let order=0;
 const root:Node245={kind:'element',tag:'#document',attrs:{},children:[],parent:null,text:'',order:order++};
 const stack:Node245[]=[root];
 let truncated=false;
 const top=()=>stack[stack.length-1];
 const add=(n:Node245)=>{n.parent=top();top().children.push(n);};
 const addText=(t:string,raw?:string)=>{
  if(!t&&!(keep&&raw))return;const p=top();const last=p.children[p.children.length-1];
  if(last&&last.kind==='text'){last.text+=t;if(keep)last.rawText=(last.rawText??'')+(raw??t);return;}
  const n:Node245={kind:'text',tag:'#text',attrs:{},children:[],parent:null,text:t,order:order++};if(keep)n.rawText=raw??t;add(n);
 };
 // keepSource: an element closed by its own end tag ends after it (endPos); elements closed implicitly end where the
 // closing token starts.
 const pop=(i:number,endPos?:number)=>{if(keep)for(let k=stack.length-1;k>=i;k--){const e=stack[k];if(e.src)e.src.end=k===i&&endPos!==undefined?endPos:tagStart;}stack.length=i;};
 const closeTo=(tag:string,boundary:string[]=[],endPos?:number)=>{
  for(let i=stack.length-1;i>0;i--){const t=stack[i].tag;
   if(t===tag){pop(i,endPos);return true;}
   if(boundary.includes(t))return false;
  }
  return false;
 };
 let i=0;const n=html.length;
 while(i<n){
  if(order>MAX_NODES){truncated=true;break;}
  const lt=html.indexOf('<',i);
  if(lt<0){addText(decodeEntities245(html.slice(i)),html.slice(i));break;}
  if(lt>i)addText(decodeEntities245(html.slice(i,lt)),html.slice(i,lt));
  i=lt;tagStart=lt;
  if(html.startsWith('<!--',i)){const e=html.indexOf('-->',i+4);i=e<0?n:e+3;continue;}
  if(html[i+1]==='!'||html[i+1]==='?'){const e=html.indexOf('>',i);i=e<0?n:e+1;continue;}
  // Tag scan that respects quoted attribute values of any length (framework pages put large JSON
  // in attributes); a regex over a fixed window would turn such tags into text.
  const m=scanTag(html,i);
  if(!m){addText('<','<');i++;continue;}
  i=m.end;
  const tag=m[2].toLowerCase();
  if(m[1]){ // end tag
   if(tag==='p'||tag==='li'||tag==='dt'||tag==='dd'||tag==='td'||tag==='th'||tag==='tr'||tag==='option'){
    closeTo(tag,IMPLIED[tag]?.boundary??[],m.end);continue;}
   closeTo(tag,[],m.end);continue;
  }
  const attrs:Record<string,string>={};const rawAttrs:Record<string,string>={};
  for(const a of m[3].matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)){
   const k=a[1].toLowerCase();if(k in attrs)continue;
   attrs[k]=decodeEntities245(a[2]??a[3]??a[4]??'');if(keep)rawAttrs[k]=a[2]??a[3]??a[4]??'';
  }
  const imp=IMPLIED[tag];
  if(imp)for(const c of imp.closes){if(stack.some(s=>s.tag===c))closeTo(c,imp.boundary);}
  if(BLOCK_CLOSES_P.has(tag)&&stack.some(s=>s.tag==='p'))closeTo('p',['div','section','article','main','td','th','li','button','table']);
  if((tag==='td'||tag==='th')&&top().tag!=='tr'&&['table','thead','tbody','tfoot'].includes(top().tag)){
   const tr:Node245={kind:'element',tag:'tr',attrs:{},children:[],parent:null,text:'',order:order++};
   if(keep){tr.src={start:lt,startTagEnd:lt,end:n};tr.implied=true;tr.rawAttrs={};}add(tr);stack.push(tr);}
  const el:Node245={kind:'element',tag,attrs,children:[],parent:null,text:'',order:order++};
  if(keep){el.src={start:lt,startTagEnd:m.end,end:n};el.rawAttrs=rawAttrs;}
  add(el);
  if(VOID.has(tag)||m[4]){if(el.src)el.src.end=m.end;continue;}
  if(RAW.has(tag)){
   const close=new RegExp(`</${tag}\\s*>`,'ig');close.lastIndex=i;
   const e=close.exec(html);const end=e?e.index:n;
   el.text=html.slice(i,end);i=e?e.index+e[0].length:n;if(el.src)el.src.end=i;continue;
  }
  if(stack.length<MAX_DEPTH)stack.push(el);else if(el.src)el.src.end=m.end;
 }
 return {root,nodeCount:order,truncated};
}

const HIDDEN_STYLE=/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i;
export const isHidden245=(n:Node245)=>n.kind==='element'&&('hidden' in n.attrs||n.attrs['aria-hidden']==='true'||
 HIDDEN_STYLE.test(n.attrs.style??''));
/** Text deliberately removed from the accessibility tree (icons, visual duplicates). Unlike `hidden`,
 * which also marks closed tabs and collapsed accordions whose content is still page content. */
export const isDecorative245=(n:Node245)=>n.kind==='element'&&n.attrs['aria-hidden']==='true';
/** Visible text of a subtree: raw-text elements, hidden subtrees and citation superscripts are skipped;
 * block boundaries become spaces. */
export function textOf245(n:Node245,opts:{skip?:(n:Node245)=>boolean}={}):string{
 const out:string[]=[];
 const walk=(x:Node245)=>{
  if(x.kind==='text'){out.push(x.text);return;}
  if(RAW.has(x.tag)||isDecorative245(x)||opts.skip?.(x))return;
  if(x.tag==='br'){out.push(' ');return;}
  // Citation markers ("[4]", "[a]") are reference links, not values.
  if(x.tag==='sup'&&/\breference\b/.test(x.attrs.class??''))return;
  // Footnote markers: a superscript that only links to an in-page note ("1.2 A<sup><a href=#note2>2</a></sup>").
  if(x.tag==='sup'&&isFootnoteMarker(x))return;
  for(const c of x.children)walk(c);
  if(x.tag!=='span'&&x.tag!=='a'&&x.tag!=='b'&&x.tag!=='strong'&&x.tag!=='em'&&x.tag!=='i'&&x.tag!=='sup'&&x.tag!=='sub')out.push(' ');
 };
 walk(n);
 return clean245(out.join(''));
}
function isFootnoteMarker(sup:Node245):boolean{
 const els=sup.children.filter(c=>c.kind==='element');const text=sup.children.filter(c=>c.kind==='text').map(c=>c.text).join('').trim();
 return els.length===1&&els[0].tag==='a'&&(els[0].attrs.href??'').startsWith('#')&&!text&&/^[\w*†‡§]{1,4}$/.test(els[0].children.map(c=>c.text).join('').trim());
}
export const clean245=(s:string)=>s.normalize('NFKC').replace(/\[(?:\d{1,3}|[a-z]|note \d+|citation needed)\]/gi,' ')
 .replace(/[​-‍﻿]/g,'').replace(/\s+/g,' ').trim();
export function* walk245(n:Node245):Generator<Node245>{
 yield n;for(const c of n.children)yield* walk245(c);
}
export const elementChildren245=(n:Node245)=>n.children.filter(c=>c.kind==='element');
/** Stable structural locator: tag path with sibling indexes (no text, no attribute values). */
export function locator245(n:Node245):string{
 const parts:string[]=[];let x:Node245|null=n;
 while(x&&x.parent){const sibs=elementChildren245(x.parent).filter(s=>s.tag===x!.tag);
  parts.push(sibs.length>1?`${x.tag}[${sibs.indexOf(x)+1}]`:x.tag);x=x.parent;}
 return parts.reverse().join('>');
}
