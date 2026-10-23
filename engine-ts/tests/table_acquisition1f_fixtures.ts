/** Boundary fixtures for the neutral table acquisition (src/table_acquisition1f.ts). FICTIONAL content. Used by
 * tests/table_acquisition1f.test.ts and by the independent Chromium comparison scripts/table-acquisition-1f-verify.mjs. */
const page=(body:string)=>`<!doctype html><html><head><title>t</title></head><body><article>${body}</article></body></html>`;
export const FIXTURES1F:Record<string,string>={
 nfkc:page(`<h2>Sizes</h2><p>Room sizes we used.</p><table><tr><th>Model</th><th>Area</th><th>Airflow</th></tr>
<tr><td>Alpha A1</td><td>21 m²</td><td>250 m³/h ½ speed</td></tr><tr><td>Beta B2 ﬁlter</td><td>１２ µm</td><td>4 Ω</td></tr></table>`),
 markers:page(`<h2>Results</h2><table><tr><th>Model</th><th>Noise</th></tr>
<tr><td>Alpha A1 <span aria-hidden="true">★</span></td><td>41 dB<sup class="reference">[3]</sup> [a]</td></tr>
<tr><td>Beta B2<span hidden>secret</span></td><td>£99 <span style="display:none">old £120</span><sup><a href="#fn1">1</a></sup></td></tr></table>
<ol><li id="fn1">Measured at 1 m.</li></ol>`),
 references:page(`<table><tr><th title="&notit; &amp=x">Ref</th><th>Text</th></tr>
<tr><td><a href="/p?a=1&copy=2&amp;b=3&notin">link</a></td><td>&hearts; &notit; &amp text &#128; &#0; &#x1F600; &AMP; &NotEqualTilde; &unknownref; &#xD800; a&#13;b</td></tr>
<tr><td>crlf</td><td>line1\r\nline2\rline3</td></tr></table>`),
 nested:page(`<table><tr><th>Outer</th><th>B</th></tr><tr><td>p<table><tr><td>inner 5 W</td></tr></table>q</td><td>1 W</td></tr></table>`),
 wide:page(`<table><tr>${[...Array(65).keys()].map(i=>`<th>h${i}</th>`).join('')}</tr><tr>${[...Array(65).keys()].map(i=>`<td>${i} W</td>`).join('')}</tr></table>`),
 many:page([...Array(42).keys()].map(i=>`<h2>T${i}</h2><table><tr><th>a</th><th>b</th></tr><tr><td>x${i}</td><td>${i} W</td></tr></table>`).join('')),
 merged:page(`<table><caption>Synthetic merged</caption><thead><tr><th rowspan="2">Model</th><th colspan="2">Noise (dBA)</th></tr><tr><th>Low</th><th>High</th></tr></thead>
<tbody><tr><td>Alpha A1<td>40<td rowspan="2">55</tr><tr><td>Beta B2</td><td>41</td></tr>
<tr><td colspan="3">Note: tested at 1 m</td></tr><tr><td>Gamma</td><td rowspan="0">all</td><td>x</td></tr><tr><td>Delta</td><td>y</td></tr></tbody></table>`),
 implied:page(`<table><tr><td>a<td>b<tr><td colspan=2>c<p>para<div>block</div></td></tr></table><pre>\nkeep</pre>`),
 foster:page(`<table><tr><td>a</td>stray text<td>b</td></tr><div>misplaced</div></table>`),
 raw_table:page(`<noscript><table><tr><td>hidden table</td></tr></table></noscript><table><tr><td>x</td><td>y</td></tr></table>`),
 figure:page(`<h1>Guide</h1><h2>Noise</h2><p>Before one.</p><figure><table><tr><th>M</th><th>dB</th></tr><tr><td>A</td><td>40</td></tr></table><figcaption>Figure 1: noise</figcaption></figure><p>After one.</p><h2>Next</h2><p>Other.</p>`),
};
