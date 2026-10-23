/** Phase245: HTML table grid reconstruction and conservative product/attribute interpretation.
 * Grid building follows the HTML table model: rows of the table's own sections, cells placed in the
 * first free slot, rowspan/colspan occupying later slots (rowspan=0 = to the end of the section).
 * Every cell keeps its original coordinates and span. Interpretation only promotes a value when its
 * product, property and (if any) variant are unambiguous; everything else is returned as an
 * explicit abstention with a reason. No product identity is verified here.
 */
import {type Node245,elementChildren245,textOf245,locator245} from './phase245_html_dom.js';

export interface GridCell245 {
 id:number;row:number;col:number;rowspan:number;colspan:number;header:boolean;scope:string|null;
 text:string;node:Node245;headersAttr:string[];
}
export interface TableGrid245 {
 rows:number;cols:number;cells:GridCell245[];
 /** slot[r][c] = cell id occupying that slot, or -1 when the source leaves it empty. */
 slot:number[][];
 /** Rows that came from <thead>. */
 theadRows:Set<number>;
 locator:string;caption:string|null;warnings:string[];
}
const MAX_SPAN=100,MAX_ROWS=400,MAX_COLS=60;

function sections(table:Node245):Node245[][]{
 // Rows belong to the table itself (directly or via thead/tbody/tfoot), never to nested tables.
 const out:Node245[][]=[];let loose:Node245[]=[];
 for(const c of elementChildren245(table)){
  if(c.tag==='tr'){loose.push(c);continue;}
  if(['thead','tbody','tfoot'].includes(c.tag)){
   if(loose.length){out.push(loose);loose=[];}
   out.push(elementChildren245(c).filter(r=>r.tag==='tr'));
  }
 }
 if(loose.length)out.push(loose);
 return out;
}
const spanAttr=(v:string|undefined,def:number)=>{
 if(v===undefined)return def;const n=Number.parseInt(v,10);
 return Number.isFinite(n)&&n>=0?n:def;
};
export function buildTableGrid245(table:Node245):TableGrid245|null{
 if(table.tag!=='table')return null;
 const cells:GridCell245[]=[];const slot:number[][]=[];const warnings:string[]=[];
 const theadRows=new Set<number>();
 let rowBase=0;
 const theadNode=elementChildren245(table).find(c=>c.tag==='thead');
 for(const sec of sections(table)){
  const isThead=!!theadNode&&sec.length>0&&sec[0].parent===theadNode;
  // Rows a rowspan=0 cell reaches: to the end of its own section.
  for(let r=0;r<sec.length;r++){
   const row=rowBase+r;if(row>=MAX_ROWS){warnings.push('row_limit');break;}
   if(isThead)theadRows.add(row);
   slot[row]??=[];
   let col=0;
   for(const td of elementChildren245(sec[r]).filter(x=>x.tag==='td'||x.tag==='th')){
    while((slot[row][col]??-1)>=0)col++;
    let colspan=Math.max(1,spanAttr(td.attrs.colspan,1));
    let rowspan=spanAttr(td.attrs.rowspan,1);
    if(rowspan===0)rowspan=sec.length-r;
    if(colspan>MAX_SPAN){colspan=MAX_SPAN;warnings.push('colspan_clamped');}
    if(rowspan>MAX_SPAN){rowspan=MAX_SPAN;warnings.push('rowspan_clamped');}
    rowspan=Math.max(1,Math.min(rowspan,sec.length-r));
    if(col+colspan>MAX_COLS){warnings.push('column_limit');break;}
    const id=cells.length;
    cells.push({id,row,col,rowspan,colspan,header:td.tag==='th',scope:td.attrs.scope?.toLowerCase()??null,
     text:textOf245(td,{skip:n=>n.tag==='table'}),node:td,
     headersAttr:(td.attrs.headers??'').split(/\s+/).filter(Boolean)});
    for(let dr=0;dr<rowspan;dr++){slot[row+dr]??=[];
     for(let dc=0;dc<colspan;dc++){
      if((slot[row+dr][col+dc]??-1)>=0)warnings.push('overlapping_cells');
      else slot[row+dr][col+dc]=id;
     }}
    col+=colspan;
   }
  }
  rowBase+=Math.min(sec.length,MAX_ROWS-rowBase);
 }
 const rows=slot.length,cols=Math.max(0,...slot.map(r=>r.length));
 if(!rows||!cols)return null;
 for(const r of slot)for(let c=0;c<cols;c++)if(r[c]===undefined)r[c]=-1;
 const cap=elementChildren245(table).find(c=>c.tag==='caption');
 return {rows,cols,cells,slot,theadRows,locator:locator245(table),caption:cap?textOf245(cap):null,warnings};
}

/** A promoted or abstained table reading. Coordinates are 0-based grid slots of the value cell. */
export interface TableReading245 {
 product:string|null;variant:string|null;propertyPath:string[];valueText:string;
 row:number;col:number;rowspan:number;colspan:number;
 /** Number of products/properties a single merged source cell was distributed to (1 = not shared). */
 sharedAcross:number;
 ambiguity:string[];
}
export interface TableInterpretation245 {
 mode:'key_value'|'products_in_columns'|'products_in_rows'|'unsupported';
 readings:TableReading245[];reasons:string[];
}
const QTY=/[-+]?\d+(?:[.,]\d+)?\s*(?:mm|cm|m|km|in|inch|inches|"|ft|g|kg|lb|lbs|oz|ml|l|litres?|liters?|w|kw|v|a|mah|wh|hz|khz|mhz|ghz|db|°c|°f|%|gb|tb|mb|mp|rpm|bar|pa|kpa|h|min|s|px|mbit|gbit|pin)\b/i;
const PRICE=/^[$€£¥]\s?\d|\d\s?(?:€|eur|usd|gbp)\b/i;
const quantitative=(t:string)=>QTY.test(t)||PRICE.test(t)||/^\d+(?:[.,]\d+)?$/.test(t.trim());
const uniq=(xs:string[])=>xs.filter((x,i)=>x&&xs.indexOf(x)===i);
/** Leading text of a header cell up to the first link or block that follows text: product names in
 * comparison headers are often followed by "Read review"/"Buy" links that are not part of the name. */
function leadText(x:GridCell245):string{
 const parts:string[]=[];let stop=false;
 const walk=(n:Node245)=>{
  if(stop)return;
  if(n.kind==='text'){parts.push(n.text);return;}
  if(n.tag==='br'){parts.push(' ');return;}
  if((n.tag==='a'||n.tag==='p'||n.tag==='div')&&parts.join('').trim()&&n!==x.node){stop=true;return;}
  if(n.kind==='element'&&(n.tag==='sup'&&/\breference\b/.test(n.attrs.class??'')||n.tag==='style'||n.tag==='script'))return;
  for(const c of n.children)walk(c);
 };
 walk(x.node);
 const t=stripCallToAction245(parts.join('').replace(/\s+/g,' ').trim());
 return t||stripCallToAction245(x.text);
}
/** Trailing call-to-action text in a product header ("KB892L View details →") is not part of the name. */
export function stripCallToAction245(t:string):string{
 return t.replace(/\s*(?:view|see|more|show)?\s*(?:details|more|product|specs)?\s*(?:→|›|»|>)\s*$/i,'')
  .replace(/\s+(?:view details|see details|learn more|shop now|buy now|read more|read review|more info)\s*$/i,'').trim();
}

/** Interpret a grid. Products are never invented: they come from header or key-column text. */
export function interpretTableGrid245(g:TableGrid245):TableInterpretation245{
 const cell=(r:number,c:number)=>{const id=g.slot[r]?.[c]??-1;return id>=0?g.cells[id]:null;};
 const reasons:string[]=[];
 if(g.warnings.includes('overlapping_cells'))return {mode:'unsupported',readings:[],reasons:['overlapping_cells']};
 if(g.rows<2||g.cols<2)return {mode:'unsupported',readings:[],reasons:['too_small']};
 // Full-width single-cell rows act as section titles (common in key/value spec tables).
 const fullWidth=(r:number)=>{const c=cell(r,0);return !!c&&c.colspan>=g.cols&&c.row===r;};
 // Header rows: leading rows made only of header cells (or explicitly thead rows).
 let headerRows=0;
 for(let r=0;r<g.rows;r++){
  // A full-width row is a table/section title, not a column header row.
  if(fullWidth(r))break;
  const ids=uniq(g.slot[r].map(String)).map(Number).filter(i=>i>=0);
  const allHeader=ids.length>0&&ids.every(i=>g.cells[i].header&&g.cells[i].scope!=='row');
  if(g.theadRows.has(r)||allHeader)headerRows=r+1;else break;
 }
 // Implicit header row for tables authored without <th>: a first row of short, non-numeric labels
 // (optionally with an empty corner) over a body that contains quantities.
 if(headerRows===0&&g.cols>2&&!g.cells.some(c=>c.header)){
  const first=[...Array(g.cols).keys()].map(c=>cell(0,c));
  const labels=first.slice(1);
  const ok=first.every(x=>!!x&&x.row===0&&x.rowspan===1)&&labels.every(x=>x!.text.length>0&&x!.text.length<=80&&!quantitative(x!.text))&&
   first[0]!.text.length<=40&&!quantitative(first[0]!.text)&&
   g.cells.some(x=>x.row>0&&quantitative(x.text));
  if(ok){headerRows=1;reasons.push('implicit_header_row');}
 }
 // Header columns in body rows: leading columns where body cells are th (or scope=row).
 let headerCols=0;
 for(let c=0;c<g.cols-1;c++){
  let header=0,total=0;
  for(let r=headerRows;r<g.rows;r++){if(fullWidth(r))continue;const x=cell(r,c);if(!x)continue;total++;if(x.header)header++;}
  if(total>0&&header===total)headerCols=c+1;else break;
 }
 const bodyRows=[...Array(g.rows).keys()].filter(r=>r>=headerRows&&!fullWidth(r));
 // Only header-cell (th) full-width rows name a section; full-width td rows (images, notes) are skipped.
 const sectionTitle=(r:number)=>{for(let x=r-1;x>=headerRows;x--)if(fullWidth(x)&&cell(x,0)!.header)return cell(x,0)!.text||null;return null;};
 // Product names use the leading text of a header (dropping trailing "Read review" links); property
 // labels keep their full text ("Ethernet (Max. <a>Mbit/s</a>)").
 const colHeaderPath=(c:number,product=false)=>uniq([...Array(headerRows).keys()].map(r=>cell(r,c)).filter(Boolean).map(x=>product?leadText(x!):x!.text));
 const rowHeaderPath=(r:number,upto:number,product=false)=>uniq([...Array(upto).keys()].map(c=>cell(r,c)).filter(Boolean).map(x=>product?leadText(x!):x!.text));
 const readings:TableReading245[]=[];
 const pushValue=(x:GridCell245,product:string|null,variant:string|null,propertyPath:string[],shared:number,amb:string[])=>{
  readings.push({product,variant,propertyPath,valueText:x.text,row:x.row,col:x.col,rowspan:x.rowspan,colspan:x.colspan,
   sharedAcross:shared,ambiguity:amb});
 };
 // ---- key/value: one value column after the label column(s).
 const labelCols=headerCols||1;
 if(g.cols-labelCols===1&&(headerRows===0||g.cols===2)){
  for(const r of bodyRows){
   const v=cell(r,labelCols);if(!v||v.row!==r)continue;
   const path=rowHeaderPath(r,labelCols);const title=sectionTitle(r);
   const amb:string[]=[];
   if(v.rowspan>1)amb.push('value_spans_multiple_properties');
   if(!path.length||!path.join('').trim())amb.push('missing_property_label');
   if(v.header)amb.push('value_cell_is_header');
   pushValue(v,null,null,title?[title,...path]:path,1,amb);
  }
  return {mode:'key_value',readings,reasons};
 }
 if(headerRows===0){return {mode:'unsupported',readings:[],reasons:['no_header_row_for_multi_column_table']};}
 const cornerCells=uniq([...Array(headerRows).keys()].flatMap(r=>[...Array(Math.max(1,headerCols)).keys()].map(c=>cell(r,c)?.text??'')));
 const cornerEmpty=cornerCells.every(t=>!t.trim());
 // Model/part codes across the header (single tokens mixing letters and digits, e.g. "21KC00FKMZ")
 // over word labels in the first column: products run across the columns.
 const CODE=/^(?=[^\s]*\d)(?=[^\s]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9._/-]{4,24}$/;
 const headerTexts=[...Array(g.cols).keys()].slice(1).map(c=>cell(headerRows-1,c)?.text??'');
 const firstColTexts=bodyRows.map(r=>cell(r,0)?.text??'').filter(Boolean);
 const codesAcross=headerTexts.length>=2&&headerTexts.filter(t=>CODE.test(t)).length>=headerTexts.length*0.8&&
  firstColTexts.filter(t=>/[a-z]{3}/i.test(t)&&!CODE.test(t)).length>=firstColTexts.length*0.8;
 if(codesAcross)reasons.push('product_codes_in_header_row');
 // Body rows headed by header cells name properties, so products run across the columns; a corner
 // text ("Version", "Model") then only labels the header row.
 // A header row of prices or "This item" pointers is a product comparison header: products run across the
 // columns (a price or a pointer cannot be a property label).
 const pointerHeaders=headerTexts.length>=2&&headerTexts.every(t=>PRICE.test(t.trim())||/^(?:this item|this product|current item|current product)$/i.test(t.trim()));
 if(pointerHeaders)reasons.push('price_or_pointer_header_row');
 if(cornerEmpty||headerCols>0||codesAcross||pointerHeaders){
  // S80 (symmetric to the row-key guard below): column headers that are settings or levels of one product ("SPEED 1",
  // "Level 2", "Low", "Sleep") or a single sentence-case column label ("Minimum lifespan") do not name products. In the
  // S80 first run such headers became product identities in the store ("SPEED 1".."SPEED 5", "Minimum lifespan").
  const SETTING=/^(?:(?:fan\s+)?(?:speed|level|mode|setting|stage|step|position|power level|program(?:me)?)\s*[#:]?\s*\d+[a-z]?|low|medium|med|high|max(?:imum)?|min(?:imum)?|turbo|boost|sleep|night|auto(?:matic)?|eco|silent|quiet|normal|standard|off|on|1st|2nd|3rd|\d+(?:st|nd|rd|th)\s+(?:speed|setting|level))$/i;
  const valueHeaders=headerTexts.map(t=>t.trim()).filter(Boolean);
  if(valueHeaders.length>=1&&valueHeaders.every(t=>SETTING.test(t)))
   return {mode:'unsupported',readings:[],reasons:['column_header_not_product_identity']};
  // every header a sentence-case phrase ("Minimum lifespan", "Price per 2-pack", "Estimated yearly cost"): property
  // labels across the columns (components or uses in the rows), not product names
  if(cornerEmpty&&!codesAcross&&valueHeaders.length>=1&&valueHeaders.every(t=>/^[A-Z][a-z]+(?:\s+(?:[a-z][a-z-]*|\d[\w-]*))+$/.test(t)))
   return {mode:'unsupported',readings:[],reasons:['column_header_not_product_identity']};
  // ---- products in columns: column header path = [product, ...variant levels]; row label = property.
  const firstValueCol=Math.max(1,headerCols);
  // Comparison widgets often put prices or "This item" in the header row and the product names in a body
  // row labelled "Name"/"Product"/"Model". A price or a generic pointer never names a product: the name row
  // does, and it is then identity, not a property. Without a name row such columns have no product key.
  const NAME_ROW=/^(?:name|product|product name|model|item|title)$/i;
  const GENERIC=/^(?:this item|this product|current item|current product|selected|you are viewing)$/i;
  const nameRow=bodyRows.find(r=>NAME_ROW.test((cell(r,0)?.text??'').trim()));
  const unusableHeader=(c:number)=>{const p=colHeaderPath(c,true);return !p.length||PRICE.test(p[0])||GENERIC.test(p[0].trim());};
  const useNameRow=nameRow!==undefined&&[...Array(g.cols).keys()].slice(firstValueCol).some(unusableHeader);
  const productPath=(c:number):string[]=>{
   if(useNameRow){const n=cell(nameRow!,c)?.text?.trim();return n?[n]:[];}
   return unusableHeader(c)?[]:colHeaderPath(c,true);
  };
  if(useNameRow)reasons.push('product_names_from_name_row');
  for(let c=firstValueCol;c<g.cols;c++){
   const path=productPath(c);
   for(const r of bodyRows){
    if(useNameRow&&r===nameRow)continue;
    const v=cell(r,c);if(!v||v.row!==r)continue;if(v.col!==c&&v.colspan>1)continue;
    const label=rowHeaderPath(r,firstValueCol);const title=sectionTitle(r);
    const amb:string[]=[];
    if(!path.length)amb.push('missing_product_header');
    if(!label.length)amb.push('missing_property_label');
    if(v.rowspan>1)amb.push('value_spans_multiple_properties');
    // A value spanning several product columns is shared by each of them (HTML table semantics).
    const span=Math.min(v.colspan,g.cols-c);
    for(let k=0;k<span;k++){
     const p=productPath(c+k);
     pushValue(v,p[0]??null,p.length>1?p.slice(1).join(' › '):null,title?[title,...label]:label,span,
      p.length?amb:[...new Set([...amb,'missing_product_header'])]);
    }
   }
  }
  return {mode:'products_in_columns',readings,reasons};
 }
 // ---- products in rows: a minimal leading key (1..3 columns) that is unique per body row.
 let keyCols=0;
 for(let k=1;k<=Math.min(3,g.cols-1);k++){
  const keys=bodyRows.map(r=>rowHeaderPath(r,k,true).join(' › '));
  // Bare numbers can be model identifiers ("1", "3+"); values with units or prices cannot be keys.
  const keyQuant=bodyRows.some(r=>{const x=cell(r,k-1);return !!x&&(QTY.test(x.text)||PRICE.test(x.text));});
  if(keyQuant)break;
  if(keys.every(Boolean)&&new Set(keys).size===keys.length){keyCols=k;break;}
 }
 if(!keyCols)return {mode:'unsupported',readings:[],reasons:['no_unique_product_key_column']};
 // A key column headed by a size system ("US", "EU", "Size") is a size chart, and one headed by a situation,
 // position or setting describes configurations of one product: neither names products.
 const keyHeader=headerRows?(cell(headerRows-1,0)?.text??'').trim():'';
 if(/^(?:us|uk|eu|eur|fr|it|jp|au|cm|mondo|sizes?|size chart|(?:men'?s|women'?s|kids'?)(?: size)?|situation|position|setting|settings|mode|condition|state|scenario|configuration|adjustment|step|stage|level|use case)$/i.test(keyHeader))
  return {mode:'unsupported',readings:[],reasons:['row_key_header_not_product_identity']};
 const propCols=[...Array(g.cols).keys()].filter(c=>c>=keyCols);
 const quantCols=propCols.filter(c=>bodyRows.some(r=>{const x=cell(r,c);return !!x&&quantitative(x.text);})).length;
 if(quantCols===0||quantCols*3<propCols.length)return {mode:'unsupported',readings:[],reasons:['too_few_quantitative_columns_for_product_rows']};
 for(const r of bodyRows){
  const product=rowHeaderPath(r,keyCols,true);
  for(const c of propCols){
   const v=cell(r,c);if(!v||v.col!==c)continue;
   // A rowspan value is shared by every product row it covers: emit it on each covered row.
   const amb:string[]=[];
   const label=colHeaderPath(c);
   if(!label.length)amb.push('missing_property_label');
   if(v.colspan>1)amb.push('value_spans_multiple_properties');
   pushValue(v,product.join(' › ')||null,null,label,v.rowspan,product.length?amb:[...amb,'missing_product_key']);
  }
 }
 return {mode:'products_in_rows',readings,reasons};
}
