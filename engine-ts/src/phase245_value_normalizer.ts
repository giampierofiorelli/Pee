/** Phase245: conservative normalization of declared specification values.
 * The original text is always kept. A value is only turned into numbers when its form is
 * unambiguous; several quantities for different things ("600 mm sides / 900 mm back"), one cell
 * carrying values for several variants, and prose are reported as such, never collapsed.
 */
export type Value245=
 {kind:'quantity';number:number;unit:string;approximate:boolean;alternative?:{number:number;unit:string};
  /** "max. 30 kg" -> bound 'max'; trailing words such as "LPDDR5" are kept as a qualifier. */
  bound?:'max'|'min';qualifier?:string}|
 {kind:'range';min:number;max:number;unit:string;approximate:boolean}|
 {kind:'price';amount:number;maxAmount?:number;currency:string}|
 {kind:'dimensions';numbers:number[];unit:string;axes:string[]|null;approximate:boolean;qualifier?:string}|
 {kind:'options';numbers:number[];unit:string}|
 {kind:'number';number:number}|
 {kind:'text';text:string}|
 {kind:'boolean';value:boolean;qualifier:string|null}|
 {kind:'per_variant';segments:number}|
 {kind:'compound'}|
 {kind:'prose'}|
 {kind:'empty'};
/** Canonical unit symbols (case-insensitive aliases). Units are kept as authored, not converted,
 * except imperial compound weights which are only meaningful once combined. */
const UNIT_ALIASES:[RegExp,string][]=[
 [/^(?:mm|millimet(?:er|re)s?)$/i,'mm'],[/^(?:cm|centimet(?:er|re)s?)$/i,'cm'],[/^(?:m|met(?:er|re)s?)$/i,'m'],
 [/^(?:km|kilomet(?:er|re)s?)$/i,'km'],[/^(?:in|inch|inches|"|″|'')$/i,'in'],[/^(?:ft|feet|foot|'|′)$/i,'ft'],
 // "g" is grams only in lower case: "20G" on a spec sheet is g-force (acceleration), not mass.
 [/^(?:mg)$/i,'mg'],[/^(?:g|gr|GR|grams?|grammes?|Grams?)$/,'g'],[/^(?:kg|kgs|kilo(?:gram)?s?)$/i,'kg'],[/^(?:lb|lbs|pounds?)$/i,'lb'],
 [/^(?:oz|ounces?)$/i,'oz'],[/^(?:ml|millilit(?:er|re)s?)$/i,'ml'],[/^(?:cl)$/i,'cl'],[/^(?:cc|cm3|cm³|ccm)$/i,'cm³'],[/^(?:m3|m³)$/i,'m³'],[/^(?:m²|sqm|sq m|sq\.? ?m)$/i,'m²'],[/^(?:hp|bhp)$/i,'hp'],[/^(?:l|ltr|lit(?:er|re)s?)$/i,'l'],
 [/^(?:gal|gallons?)$/i,'gal'],[/^(?:fl\.? ?oz)$/i,'fl oz'],[/^(?:mw)$/,'mW'],[/^(?:w|watts?)$/i,'W'],[/^(?:kw|kilowatts?)$/i,'kW'],
 [/^(?:wh)$/i,'Wh'],[/^(?:kwh)$/i,'kWh'],[/^(?:mah)$/i,'mAh'],[/^(?:v|volts?)$/i,'V'],[/^(?:mv)$/,'mV'],[/^(?:kv)$/i,'kV'],
 [/^(?:a|amps?|amperes?)$/i,'A'],[/^(?:ma|mA)$/,'mA'],[/^(?:ah)$/i,'Ah'],[/^(?:nm)$/,'nm'],[/^(?:Nm|N\.m|N·m)$/,'N·m'],
 [/^(?:ohms?|Ω|Ω)$/i,'Ω'],[/^(?:ms)$/,'ms'],[/^(?:l\/s)$/i,'l/s'],[/^(?:W\/m²|W\/m2)$/,'W/m²'],[/^(?:hz|hertz)$/i,'Hz'],[/^(?:khz)$/i,'kHz'],[/^(?:mhz)$/i,'MHz'],
 [/^(?:ghz)$/i,'GHz'],[/^(?:°c|℃|degc|deg c|c°)$/i,'°C'],[/^(?:°f|℉)$/i,'°F'],[/^(?:db|dba|db\(a\))$/i,'dB'],
 [/^(?:kb)$/i,'KB'],[/^(?:mb)$/i,'MB'],[/^(?:gb)$/i,'GB'],[/^(?:tb)$/i,'TB'],[/^(?:mbit|mbit\/s|mbps)$/i,'Mbit/s'],
 [/^(?:gbit|gbit\/s|gbps)$/i,'Gbit/s'],[/^(?:kb\/s|kbps)$/,'kB/s'],[/^(?:mb\/s|mbyte\/s)$/i,'MB/s'],[/^(?:gb\/s|gbyte\/s)$/i,'GB/s'],[/^(?:mp|megapixels?)$/i,'MP'],[/^(?:px|pixels?)$/i,'px'],[/^(?:%|percent)$/i,'%'],
 [/^(?:bar)$/i,'bar'],[/^(?:mbar)$/i,'mbar'],[/^(?:pa)$/i,'Pa'],[/^(?:kpa)$/i,'kPa'],[/^(?:psi)$/i,'psi'],
 [/^(?:rpm)$/i,'rpm'],[/^(?:km\/h|kph)$/i,'km/h'],[/^(?:mph)$/i,'mph'],[/^(?:s|sec|secs|seconds?)$/i,'s'],
 [/^(?:min|mins|minutes?)$/i,'min'],[/^(?:h|hr|hrs|hours?)$/i,'h'],[/^(?:lm|lumens?)$/i,'lm'],
 [/^(?:l\/min)$/i,'l/min'],[/^(?:m³\/h|m3\/h)$/i,'m³/h'],[/^(?:pin|pins)$/i,'pin'],[/^(?:cores?)$/i,'core'],
 [/^(?:servings?)$/i,'serving'],[/^(?:pieces?|pcs?)$/i,'piece'],[/^(?:ppm)$/i,'ppm'],[/^(?:bpm)$/i,'bpm'],
];
const LENGTH_UNITS=new Set(['mm','cm','m','km','in','ft','px']);
export function canonicalUnit245(raw:string):string|null{
 const u=raw.trim().replace(/\.$/,'');if(!u||u.length>12)return null;
 for(const [re,c] of UNIT_ALIASES)if(re.test(u))return c;
 return null;
}
const NUM='(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:[.,]\\d+)?)';
/** "1,234.5" -> 1234.5; "12,5" -> 12.5 (single comma with 1-2 decimals, no dot); else plain. */
export function parseNumber245(s:string):number|null{
 let t=s.trim();
 if(/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(t))t=t.replace(/,/g,'');
 else if(/^\d+,\d{1,2}$/.test(t))t=t.replace(',','.');
 else if(/,/.test(t))return null;
 const n=Number(t);return Number.isFinite(n)&&Math.abs(n)<=1e9?n:null;
}
const CURRENCY:Record<string,string>={'$':'USD','us$':'USD','usd':'USD','€':'EUR','eur':'EUR','£':'GBP','gbp':'GBP','¥':'JPY',
 'jpy':'JPY','chf':'CHF','a$':'AUD','aud':'AUD','c$':'CAD','cad':'CAD','kr':'SEK','sek':'SEK','nok':'NOK','dkk':'DKK','pln':'PLN','zł':'PLN'};
/** Unit or currency hinted by a property label, e.g. "Weight (kg)", "MSRP (US$)". */
export function labelUnitHint245(label:string):{unit?:string;currency?:string}{
 // "Weight (kg)", "Max. Torque [Nm]", "Sound Power [dB(A)]", "Unit Size (W x H x D in mm)".
 const m=/\(([^()]{1,8})\)\s*:?\s*$/.exec(label)??/\[([^\[\]]{1,8})\]\s*:?\s*$/.exec(label)??/\bin\s+([a-z"″]{1,4})\s*\)\s*:?\s*$/i.exec(label);if(!m)return {};
 const inner=m[1].trim().toLowerCase();
 if(CURRENCY[inner])return {currency:CURRENCY[inner]};
 const u=canonicalUnit245(m[1]);return u?{unit:u}:{};
}
const SENTENCE=(t:string)=>{const w=t.split(/\s+/).length;return w>=14||(w>=5&&/[.!?]$/.test(t)&&!/\b(?:oz|lb|lbs|in|ft|approx|no|max|min)\.$/i.test(t));};

export function normalizeValue245(raw:string,label=''):Value245{
 let t=raw.replace(/\s+/g,' ').trim();const original=t;
 if(!t||/^[-–—]+$/.test(t))return {kind:'empty'};
 if(t.length>160)return {kind:'prose'};
 // A trailing footnote marker ("4.5 kg 1)", "1200 W*", "35 dB¹") refers to a note, not to the value.
 // A closing ")" that has no opening "(" is a footnote reference; "264 g (Size 9)" keeps its bracket.
 if((t.match(/\(/g)?.length??0)<(t.match(/\)/g)?.length??0))t=t.replace(/\s+\d\)$/,'').trim();
 t=t.replace(/\s*(?:\*{1,3}|[¹²³†‡])$/u,'').trim();
 // "31.8 cm3" -> cm³ (a digit inside the unit), "1.1 in." -> in (abbreviation dot).
 t=t.replace(/(\d\s*(?:c|m|d)?m)([23])\b/gi,(_m,u,d)=>u+(d==='3'?'³':'²')).replace(/\b(in|ft|lb|lbs|oz|yd)\.$/i,'$1');
 // "29.3g / 1.0oz", "85.7mm x 54.6mm x 10.0mm / 3.4\" x 2.1\" x 0.4\"": the same value in two unit
 // systems. The first form is read; the second must parse to the same kind, else it is not a conversion.
 const conv=/^(.+?)\s+\/\s+(.+)$/.exec(t);
 if(conv&&/\d/.test(conv[1])&&/\d/.test(conv[2])){
  const a=normalizeValue245(conv[1],label),b=normalizeValue245(conv[2],label);
  if(a.kind===b.kind&&(a.kind==='quantity'||a.kind==='dimensions')&&(a as {unit:string}).unit!==(b as {unit:string}).unit&&
   (a.kind!=='dimensions'||(a as {numbers:number[]}).numbers.length===(b as {numbers:number[]}).numbers.length)){
   if(a.kind==='quantity'&&b.kind==='quantity')return {...a,alternative:{number:b.number,unit:b.unit}};
   return a;
  }
 }
 // Dimensions followed by the same dimensions in another unit in brackets: the first form is read.
 const dimConv=/^(.*\d.*?)\s*\(\s*([\d.,\s]+(?:[x×*]\s*[\d.,½¼¾\s]+){1,2}\s*[a-z"″]{1,6}\.?)\s*\)$/i.exec(t);
 if(dimConv){const a=normalizeValue245(dimConv[1],label),b=normalizeValue245(dimConv[2].replace(/\.$/,''),label);
  if(a.kind==='dimensions'&&b.kind==='dimensions'&&a.numbers.length===b.numbers.length&&a.unit!==b.unit)return a;}
 // Axis order given once after the numbers: "21.8 cm x 13.5 cm (length x height)", "... mm (WxHxD)".
 const axisNote=/^(.*\d.*?)\s*\(\s*((?:width|height|depth|length|w|h|d|l)(?:\s*[x×]\s*(?:width|height|depth|length|w|h|d|l)){1,3})\s*\)$/i.exec(t);
 if(axisNote){const inner=normalizeValue245(axisNote[1],label);const ax=axisNote[2].split(/\s*[x×]\s*/).map(a=>a[0].toUpperCase());
  if(inner.kind==='dimensions'&&inner.numbers.length===ax.length&&new Set(ax).size===ax.length)return {...inner,axes:ax};}
 // Axis marked on each number: "32.6(D) x 37.9(W) x 31.4(H) cm", "(W) 34.1 x 30(D) x 41.2(H) cm",
 // "35mm(W) x 145mm(L)"; an optional trailing note ("(front to back)") is kept as a qualifier.
 const AXIS_MARK=/\(\s*(width|height|depth|length|w|h|d|l)\s*\)/gi;
 const marks=[...t.matchAll(AXIS_MARK)];
 if(marks.length>=2&&/[x×]/i.test(t)){
  let rest=t.replace(AXIS_MARK,' ').replace(/\s+/g,' ').trim();let qualifier:string|undefined;
  const note=/^(.*\d.*?[a-z"″]*)\s*\(([^()\d]{2,40})\)$/i.exec(rest);if(note){rest=note[1].trim();qualifier='('+note[2].trim()+')';}
  const inner=normalizeValue245(rest,label);const ax=marks.map(m=>m[1][0].toUpperCase());
  if(inner.kind==='dimensions'&&inner.numbers.length===ax.length&&new Set(ax).size===ax.length)
   return {...inner,axes:ax,...(qualifier?{qualifier}:{})};
 }
 let approximate=false;let bound:'max'|'min'|undefined;
 const ap=/^(?:approx\.?|approximately|ca\.?|circa|about|~|≈)\s*/i.exec(t);if(ap){approximate=true;t=t.slice(ap[0].length);}
 const bd=/^(?:(max\.?|maximum|up to|≤)|(min\.?|minimum|at least|≥))\s*/i.exec(t);if(bd){bound=bd[1]?'max':'min';t=t.slice(bd[0].length);}
 const hint=labelUnitHint245(label);
 // Axis-labelled dimensions: "H: 147.6 mm W: 71.6 mm D: 7.8 mm", "W 40 x D 30 x H 65 cm".
 const axisRe=new RegExp(`\\b(width|height|depth|length|w|h|d|l)\\s*[:=]?\\s*${NUM}\\s*([a-z"″]{1,3})?(?:\\s*\\([^)]*\\))?`,'gi');
 const axes=[...t.matchAll(axisRe)];
 if(axes.length>=2&&axes.map(a=>a[0]).join('').replace(/[\sx×*,;/]/gi,'').length>=t.replace(/[\sx×*,;/]|\([^)]*\)/gi,'').length-2){
  const units=axes.map(a=>a[3]?canonicalUnit245(a[3]):null);const unit=units.find(Boolean)??hint.unit??null;
  const nums=axes.map(a=>parseNumber245(a[2]));
  const axisLetters=axes.map(a=>a[1][0].toUpperCase());
  // One object has each axis once: repeated axes mean several objects/variants in one cell.
  if(unit&&nums.every(n=>n!==null)&&units.every(u=>u===null||u===unit)&&new Set(axisLetters).size===axisLetters.length&&axes.length<=4)
   return {kind:'dimensions',numbers:nums as number[],unit,axes:axes.map(a=>a[1][0].toUpperCase()),approximate};
 }
 // Per-variant values packed in one cell: "15: 171 g … 15 Plus: 201 g".
 const segs=[...t.matchAll(/(?:^|\s)([A-Za-z0-9][\w +.-]{0,24}?)\s?:\s*[-+]?\d/g)].filter(m=>!canonicalUnit245(m[1].trim().split(' ').pop()!));
 if(segs.length>=2)return {kind:'per_variant',segments:segs.length};
 // A base value followed by a labelled alternative: "Jan 2021 W: Jun 2022", "US$4 W: US$6".
 const alt=/^(.*\d.*?)\s([A-Za-z][\w+.-]{0,12}):\s+(.*\d.*)$/.exec(t);
 if(alt)return {kind:'per_variant',segments:2}; // abstaining is the safe side even if the label looks like a unit
 // Booleans. A bare "Y"/"N" only answers a question-shaped label ("Reverse voltage protection?").
 const yn=/^(yes|no|y|n|true|false|included|not included)\b\s*(?:\((.{1,40})\))?$/i.exec(t);
 if(yn&&(/^(yes|no|true|false|included|not included)$/i.test(yn[1])||/\?\s*:?\s*$/.test(label)))
  return {kind:'boolean',value:/^(yes|y|true|included)$/i.test(yn[1]),qualifier:yn[2]??null};
 // Prices.
 const cur='(US\\$|A\\$|C\\$|\\$|€|£|¥|USD|EUR|GBP|CHF|AUD|CAD|SEK|NOK|DKK|PLN)';
 let m=new RegExp(`^${cur}\\s?${NUM}(?:\\s?[-–]\\s?${cur}?\\s?${NUM})?$`,'i').exec(t);
 if(m){const a=parseNumber245(m[2]),b=m[4]?parseNumber245(m[4]):null;const c=CURRENCY[m[1].toLowerCase()];
  if(a!==null&&c&&(b===null||b>a))return b!==null?{kind:'price',amount:a,maxAmount:b,currency:c}:{kind:'price',amount:a,currency:c};}
 m=new RegExp(`^${NUM}\\s?(€|£|EUR|USD|GBP|CHF|SEK|NOK|DKK|PLN|zł|kr)$`,'i').exec(t);
 if(m){const a=parseNumber245(m[1]);const c=CURRENCY[m[2].toLowerCase()];if(a!==null&&c)return {kind:'price',amount:a,currency:c};}
 // Imperial compound weight "2 lb. 12 oz." (only meaningful combined).
 m=/^(\d{1,3}(?:\.\d+)?)\s*lbs?\.?\s*(\d{1,3}(?:\.\d+)?)\s*oz\.?$/i.exec(t);
 if(m)return {kind:'quantity',number:Math.round((Number(m[1])*16+Number(m[2]))*28.349523125),unit:'g',approximate};
 // Unlabelled dimensions "80 x 28 x 202 cm" / "80x28x202cm".
 m=new RegExp(`^${NUM}\\s*([a-z"″]{1,3})?\\s*[x×*]\\s*${NUM}\\s*([a-z"″]{1,3})?(?:\\s*[x×*]\\s*${NUM})?\\s*([a-z"″]{1,3})?$`,'i').exec(t);
 if(m){const unit=[m[6],m[4],m[2]].map(u=>u?canonicalUnit245(u):null).find(Boolean)??hint.unit??null;
  const nums=[m[1],m[3],m[5]].filter(Boolean).map(x=>parseNumber245(x!));
  // Only lengths make dimensions: "1 x 36 V", "2W x 2" are a count of items, kept as declared text.
  if(unit&&nums.every(n=>n!==null)&&!LENGTH_UNITS.has(unit))return {kind:'text',text:original};
  if(unit&&nums.every(n=>n!==null))return {kind:'dimensions',numbers:nums as number[],unit,axes:null,approximate};}
 // Option lists "128 GB, 256 GB or 512 GB", "1, 2, 4 or 8 GB", "256 or 512 MB".
 // "1,000W" is one thousand watts (thousands separator), not the options 1 and 0.
 const thousands=/^\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*[a-zA-Z°%]{0,6}$/.test(t)||
  // "9,5 kg": a decimal comma (one comma, one or two digits after it, no space), not the options 9 and 5.
  /^\d+,\d{1,2}\s*[a-zA-Z°%]{1,6}$/.test(t);
 m=/^((?:\d+(?:[.,]\d+)?\s*[a-zA-Z]{0,4}\s*(?:,|\bor\b|\/)\s*)+\d+(?:[.,]\d+)?)\s*([a-zA-Z]{1,4})?(?:\s+[A-Za-z][\w-]{1,12})?$/.exec(t);
 if(m&&!thousands&&/(?:,|\bor\b|\/)/.test(m[1])){
  const parts=m[1].split(/\s*(?:,|\bor\b|\/)\s*/).map(p=>/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]{0,4})$/.exec(p.trim()));
  const unit=m[2]?canonicalUnit245(m[2]):(parts.find(p=>p&&p[2])?canonicalUnit245(parts.find(p=>p&&p[2])![2]):null);
  if(unit&&parts.every(p=>p&&(!p[2]||canonicalUnit245(p[2])===unit))){
   const nums=parts.map(p=>parseNumber245(p![1]));if(nums.every(n=>n!==null))return {kind:'options',numbers:nums as number[],unit};}
 }
 // Range "25–37 mbar", "80°C to 200°C", "35–85" (+ unit hint).
 m=new RegExp(`^${NUM}\\s*([^\\d\\s–-]{0,6})\\s*(?:-|–|—|to)\\s*${NUM}\\s*([^\\d\\s]{0,8})$`,'i').exec(t);
 if(m){const u1=m[2]?canonicalUnit245(m[2]):null,u2=m[4]?canonicalUnit245(m[4]):null;
  const a=parseNumber245(m[1]),b=parseNumber245(m[3]);
  if(a!==null&&b!==null&&b>a&&(!m[2]||u1)&&(!m[4]||u2)&&(!u1||!u2||u1===u2)){
   if(hint.currency&&!u1&&!u2)return {kind:'price',amount:a,maxAmount:b,currency:hint.currency};
   const unit=u2??u1??hint.unit;if(unit)return {kind:'range',min:a,max:b,unit,approximate};}
 }
 // Single quantity, optionally followed by a converted alternative in brackets: "147.6 mm (5.81 in)".
 m=new RegExp(`^${NUM}\\s*-?\\s*([^\\d\\s(]{1,10}(?:\\s?(?:oz|\\(a\\)))?)(?:\\s*\\(\\s*${NUM}\\s*([^\\d\\s)]{1,10})\\s*\\))?((?:\\s+[A-Za-z][\\w+-]{0,14}){0,2})$`,'i').exec(t);
 if(m){const unit=canonicalUnit245(m[2]);const n=parseNumber245(m[1]);
  if(unit&&n!==null){const alt=m[3]&&m[4]?{number:parseNumber245(m[3])!,unit:canonicalUnit245(m[4])??m[4]}:undefined;
   const q:Value245={kind:'quantity',number:n,unit,approximate};
   if(alt&&alt.number!==null)q.alternative=alt;if(bound)q.bound=bound;if(m[5]?.trim())q.qualifier=m[5].trim();
   return q;}}
 // A quantity with a bracketed condition that is not a unit conversion: "100 Watts (into 8 Ohms)".
 m=new RegExp(`^${NUM}\\s*([A-Za-z°%]{1,8})\\s*\\(([^()]{2,40})\\)$`).exec(t);
 if(m){const unit=canonicalUnit245(m[2]);const n=parseNumber245(m[1]);
  if(unit&&n!==null&&!/^\s*[\d.,]+\s*[A-Za-z"″]{1,5}\s*$/.test(m[3]))return {kind:'quantity',number:n,unit,approximate,qualifier:'('+m[3].trim()+')',...(bound?{bound}:{})};}
 // Bare number, with a unit or currency from the label when present.
 m=new RegExp(`^${NUM}$`).exec(t);
 if(m){const n=parseNumber245(m[1]);if(n!==null){
  if(hint.currency)return {kind:'price',amount:n,currency:hint.currency};
  if(hint.unit)return {kind:'quantity',number:n,unit:hint.unit,approximate};
  return {kind:'number',number:n};}}
 // A described quantity: "Water tank 1.9L (64 fl.oz)" -> 1.9 l, the leading words kept as a qualifier.
 m=new RegExp(`^([A-Za-z][A-Za-z ]{2,30}?)\\s+(${NUM}\\s*[A-Za-z°%.]{1,6}(?:\\s*\\([^()]{1,20}\\))?)$`).exec(t);
 if(m&&!/\d/.test(m[1])){const inner=normalizeValue245(m[2],label);
  if(inner.kind==='quantity'&&!inner.qualifier)return {...inner,qualifier:m[1].trim()};}
 // A count of named items: "6 Slices", "240 slices", "2 baskets". The noun is kept as the unit.
 m=new RegExp(`^${NUM}\\s+([A-Za-z]{3,15})$`).exec(t);
 if(m&&!canonicalUnit245(m[2])){const n=parseNumber245(m[1]);if(n!==null)return {kind:'quantity',number:n,unit:m[2].toLowerCase(),approximate,...(bound?{bound}:{})};}
 // Several quantities with words between them: different things, not one value.
 const qty=[...t.matchAll(new RegExp(`${NUM}\\s?([a-zA-Z°"″%]{1,5})\\b`,'g'))].filter(x=>canonicalUnit245(x[2]));
 if(qty.length>=2)return {kind:'compound'};
 if(SENTENCE(original))return {kind:'prose'};
 // Short declared text ("Gore-Tex", "Nubuck leather, mesh", "Apple A16 Bionic"), kept as authored.
 if(original.length<=60&&original.split(' ').length<=9&&!/[.!?]$/.test(original))return {kind:'text',text:original};
 return {kind:'prose'};
}
/** Whether a normalized value can stand as one declared fact. */
export const promotable245=(v:Value245)=>!['per_variant','compound','prose','empty'].includes(v.kind);
