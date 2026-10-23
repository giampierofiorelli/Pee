#!/usr/bin/env python3
"""Phase228-237: volatile, bounded PDF/DOCX manufacturer specification leads.
Reads original bytes from stdin, emits ONLY structured claims/provenance JSON.
Phase229 reconstructs only strict two-column PDF rows from Poppler coordinates.
No OCR, no general PDF table reconstruction, no document/text retention.
Phase231 includes strictly scoped numeric component-column leads.
Phase233 adds bounded source-authored numeric intervals with section/condition scope.
Phase234 adds explicit, scoped standard/optional accessory and feature leads.
Phase235 adds multi-product catalogue grid leads and quarantined technical-table units.
Phase236 isolates explicit conditional configuration-use rules and manufacturer
operating-program settings; neither denotes an included accessory or a performance test.
Phase237 reads bounded authored programme grids without treating recipe/test data as device performance.
No third party Python dependencies; PDF text uses optional Poppler pdftotext.
"""
import argparse
import hashlib
import io
import json
import re
import subprocess
import sys
import zipfile
from xml.etree import ElementTree as ET

PDF_MAX_BYTES = 40_000_000
DOCX_MAX_BYTES = 6_000_000
MAX_OUTPUT = 90
ATTR = re.compile(r'^(?P<label>(?:total |usable |internal |individual |compartment |bin |shoe |item )?(?:capacity|volume|weight|mass|height|width|depth|length|power|energy consumption|noise level|dimensions))\s*[:=\-]\s*(?P<value>\d{1,7}(?:\.\d{1,3})?)\s*(?P<unit>mm|cm|kg|g|l|litres?|liters?|dba?|w|kw|kwh)\b', re.I)
VALUE_CELL = re.compile(r'^\s*(?P<value>\d{1,7}(?:\.\d{1,3})?)\s*(?P<unit>mm|cm|kg|g|l|litres?|liters?|dba?|w|kw|kwh|v|wh|ah|rpm|hours?)\s*$', re.I)
MODEL = re.compile(r'^\s*(?:model(?: number| no\.?| name)?|sku|product code)\s*(?:[:=\-]\s*|\s+)([A-Za-z0-9][A-Za-z0-9._/\- ]{1,55})\s*$', re.I)
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

# Named, explicitly declared quantitative specifications in author-supplied units.
# Preserve qualifiers in the complete label; no mathematical unit conversion.
LABEL_HINT = re.compile(r'\b(?:height|width|depth|length|diameter|weight|mass|power|voltage|capacity|current|noise|sound|airflow|frequency|speed|energy|charging|consumption|flow rate)\b', re.I)
METRIC_VALUE = re.compile(r'(?P<value>\d{1,7}(?:\.\d{1,3})?)\s*(?P<unit>km/h|cm/s|mm/s|m/s|l/s|mm|cm|kg|g|l|litres?|liters?|dba?|kw|kwh|wh|w|v|ah|rpm|hours?)(?![\w/])', re.I)
DUAL_UNITS = re.compile(r'\b\d{1,7}(?:\.\d{1,3})?\s*(?:in(?:ches)?|lbs?|ft)\s*\(\s*(?P<metric>\d{1,7}(?:\.\d{1,3})?\s*(?:mm|cm|kg|g))\s*\)',re.I)
EXPLICIT_FIELD = re.compile(r'(?P<label>[A-Za-z][A-Za-z0-9() /+\-]{1,90}?)\s*:\s*(?P<body>.+)',re.I)
MULTI_FIELD_SPLIT = re.compile(r',\s*(?=[A-Z][a-zA-Z ]{1,22}:\s*\d)')
COLUMN_SPLIT = re.compile(r'\s{6,}')
DIMENSION_START = re.compile(r'^(?:height|width|depth|length|base diameter)\s*:',re.I)

def parse_spec(line):
    m = ATTR.match(line.strip())
    if m:
        return ' '.join(m.group('label').lower().split()), float(m.group('value')), m.group('unit').lower()
    m = EXPLICIT_FIELD.fullmatch(line.strip())
    if not m: return None
    label = ' '.join(m.group('label').lower().split())
    if not LABEL_HINT.search(label): return None
    body = m.group('body').strip()
    # Scalar claims must never truncate author-written intervals.
    if re.match(r'^\d{1,7}(?:\.\d+)?\s*(?:[-–—]|to)\s*\d', body, re.I): return None
    # Only numbers appearing immediately after the label can be attributed.
    # A document-authored metric value in parentheses is kept as stated,
    # without silently converting the imperial number ourselves.
    dual = DUAL_UNITS.match(body)
    candidate = dual.group('metric') if dual else body
    q = METRIC_VALUE.match(candidate)
    if not q: return None
    value = float(q.group('value'))
    if not 0 <= value <= 1e7: return None
    return label,value,q.group('unit').lower()


# Phase232: explicit model=value statements in multi-variant spec sections.
# A candidate has an authored variant identifier, numeric quantity and unit.
# These are *not* independently verified model/SKU assignments.
VARIANT_WEIGHT_LABEL = re.compile(r'^(?P<label>net weight|packaged weight|unit weight|shipping weight)\s*:\s*(?P<body>.+)$', re.I)
VARIANT_CODE = r'[A-Z]{1,6}[0-9]{2,5}(?:-[A-Z0-9]{1,8})?'
VARIANT_WEIGHT_ENTRY = re.compile(rf'(?P<model>{VARIANT_CODE})\s*=\s*(?:(?:[0-9]{{1,5}}(?:\.[0-9]{{1,3}})?)\s*lbs?\s*/\s*)?(?P<value>[0-9]{{1,5}}(?:\.[0-9]{{1,3}})?)\s*(?P<unit>kg)\s*',re.I)
VARIANT_LINE_START = re.compile(rf'^{VARIANT_CODE}\s*=', re.I)

def variant_weight_chunks232(page_text, page, reasons):
    """Find explicit variant-scoped weight statements, not implicit table scopes.

    Handles a single wrapped continuation only when the previous authored field
    ends in a semicolon, and the immediately following left-column line starts
    with another model assignment. Any unparsed or duplicate item invalidates
    the entire field, rather than cherry-picking safe-looking pieces.
    """
    physical=[]
    for li,line in enumerate(page_text.splitlines()[:400],1):
        if len(line)>250: physical.append((li,''));continue
        physical.append((li,COLUMN_SPLIT.split(line.strip())[0].strip()))
    result=[];i=0
    while i<len(physical):
        lineno,left=physical[i]
        m=VARIANT_WEIGHT_LABEL.fullmatch(left)
        if not m: i+=1;continue
        label=' '.join(m.group('label').lower().split())
        body=m.group('body').strip()
        consumed=1
        if body.endswith(';'):
            # Poppler may insert an empty layout line for a wrapped visual row.
            # Permit at most one, never cross an unrelated heading or text.
            look=i+1
            if look<len(physical) and not physical[look][1]: look+=1
            if look<len(physical) and VARIANT_LINE_START.match(physical[look][1]):
                body+=' '+physical[look][1]
                consumed=look-i+1
        # Require >=2 *different* explicitly written variant codes.
        # No blanket application to the parent product or nearby accessories.
        parts=body.split(';')
        parsed=[];bad=False
        for part in parts:
            e=VARIANT_WEIGHT_ENTRY.fullmatch(part.strip())
            if not e: bad=True;break
            parsed.append((e.group('model').upper(),float(e.group('value')),e.group('unit').lower()))
        if bad or len(parsed)<2 or len(set(x[0] for x in parsed))!=len(parsed):
            reasons.add('pdf_variant_weight_scope_ambiguous');i+=consumed;continue
        if any(not 0<x[1]<=10000 for x in parsed):
            reasons.add('pdf_variant_weight_scope_ambiguous');i+=consumed;continue
        for model,value,unit in parsed:
            result.append({'structuredSpec':(label,value,unit),'variantModel':model,
                'locator':{'page':page,'line':lineno},
                'extractionMethod':'pdf_explicit_variant_weight_candidate'})
        reasons.add('pdf_explicit_variant_weight_claims_unverified')
        i+=consumed
    return result

# Phase233: typed intervals. Each value remains an interval, never a scalar.
# Narrow recognizer for author-explicit technical fields only. No implicit
# component inference from filenames, labels elsewhere or nearby pictures.
INTERVAL233 = re.compile(
    r'^(?P<low>\d{1,7}(?:\.\d{1,3})?)\s*(?:[-–—]|to)\s*'
    r'(?P<high>\d{1,7}(?:\.\d{1,3})?)\s*'
    r'(?P<unit>mm|cm|kg|g|v|a|w|kw|hz|mhz|psi|rpm|seconds?|hours?)\b', re.I)
TEMPERATURE_INTERVAL233 = re.compile(
    r'^(?P<low>\d{1,3})\s*[°˚]\s*(?:c)?\s*[-–—]\s*'
    r'(?P<high>\d{1,3})\s*[°˚]\s*c\b', re.I)
RANGE_LABEL233 = re.compile(
    r'^(?:source[ -]image distance|water pressure required|input voltage|'
    r'voltage range|operating temperature range|operation range|'
    r'table height \(min\.-max\.\)|frequency range|maximum operating range)$',re.I)
DUAL_VOLTAGE233 = re.compile(
    r'^low voltage\s*=\s*(?P<low>\d{1,5}\s*[-–—]\s*\d{1,5}\s*v)\s*,\s*'
    r'high voltage\s*=\s*(?P<high>\d{1,5}\s*[-–—]\s*\d{1,5}\s*v)\s*$',re.I)
IMPERIAL_EQUIVALENT233 = re.compile(
    r'^\s*\(\s*[0-9.]+\s*[-–—]\s*[0-9.]+\s*(?:inches?|inch|in|ft|lbs?)\s*\)\s*$',re.I)


def _bounded_interval233(body):
    """Reject partial matches, descending bounds and mixed-unit ambiguity."""
    body=body.strip()
    metric=None
    if '/' in body and re.search(r'[°˚]\s*f', body, re.I):
        # Dual Fahrenheit/Celsius notation: select the author-written Celsius
        # span, never calculate a conversion or borrow an endpoint.
        lhs,rhs=body.split('/',1)
        if not re.fullmatch(r'\s*\d{1,3}\s*[°˚]\s*[-–—]\s*\d{1,3}\s*[°˚]\s*f\s*',lhs,re.I):
            return None
        metric=TEMPERATURE_INTERVAL233.fullmatch(rhs.strip())
    else:
        metric=INTERVAL233.match(body)
        if metric:
            remaining=body[metric.end():]
            if remaining.strip():
                if IMPERIAL_EQUIVALENT233.fullmatch(remaining):pass
                elif re.fullmatch(r'\s*\([^)]{5,45}\)\s*,\s*motorized and manual movement\s*',remaining,re.I) and IMPERIAL_EQUIVALENT233.fullmatch(remaining.split('),')[0]+')'):
                    pass
                else:return None
        else:
            metric=TEMPERATURE_INTERVAL233.fullmatch(body)
    if not metric:return None
    low=float(metric.group('low'));high=float(metric.group('high'))
    if not (0<=low<high<=10000000):return None
    unit='celsius' if metric.re is TEMPERATURE_INTERVAL233 else metric.group('unit').lower()
    return {'lower':low,'upper':high,'unit':unit}


def interval_chunks233(page_text,page,reasons):
    """Read explicit manufacturer intervals preserving section and condition."""
    section=None;chunks=[]
    for li,line in enumerate(page_text.splitlines()[:400],1):
        if len(line)>220:continue
        left=COLUMN_SPLIT.split(line.strip())[0].strip()
        normalized=' '.join(left.lower().split())
        if normalized in ('technical specifications frontal c-arm',
                          'technical specifications lateral l-arc'):
            section='frontal c-arm' if 'frontal' in normalized else 'lateral l-arc'
            continue
        # Keep the author-declared section scoped to this page only.
        if ':' in left:
            label,body=left.split(':',1)
        else:
            m=re.fullmatch(r'(?P<label>.+?)\s{2,}(?P<body>.+)',line.strip())
            if not m:continue
            label,body=m.group('label'),m.group('body')
            # Never move across layout columns when assigning an interval.
            body=COLUMN_SPLIT.split(body)[0].strip()
        label=' '.join(label.lower().split())
        if not RANGE_LABEL233.fullmatch(label):continue
        # An earlier C-arm heading must not leak onto unrelated parameters.
        local_scope=section if label in ('source image distance','source-image distance') else None
        found=[]
        if label=='input voltage':
            qualified=DUAL_VOLTAGE233.fullmatch(body.strip())
            if qualified:
                for condition,segment in (('low voltage',qualified.group('low')),
                    ('high voltage',qualified.group('high'))):
                    rng=_bounded_interval233(segment)
                    if rng:found.append((rng,condition))
            else:
                rng=_bounded_interval233(body)
                if rng:found.append((rng,None))
        else:
            rng=_bounded_interval233(body)
            if rng:found.append((rng,None))
        if not found:
            # A rejected interval is not converted to a single measurement.
            if re.search(r'\d\s*(?:[-–—]|to)\s*\d',body,re.I):
                reasons.add('pdf_interval_ambiguous_or_unhandled')
            continue
        for rng,condition in found:
            chunks.append({'structuredRange':rng,'rangeLabel':label,
                'scopeComponent':local_scope,'condition':condition,
                'locator':{'page':page,'line':li},
                'extractionMethod':'pdf_explicit_scoped_interval_candidate'})
        reasons.add('pdf_numeric_interval_claims_unverified')
    return chunks

# Phase234: author-explicit accessory/feature availability, not inferred SKU proof.
# These claims are categorical, never a numerical specification or measured test.
OPTIONAL_FEATURE234 = re.compile(r'^(?:\d+(?:\.\d+)*\s+)?(?P<name>[A-Za-z][A-Za-z0-9 /+\-]{3,68}?)\s*\((?P<status>optional|standard)\)$', re.I)
ACCESSORY_HEAD234 = re.compile(r'^(?P<status>standard|optional) accessories\s*(?:\((?P<scope>[A-Za-z][A-Za-z ]{2,38})\)|\*)?$', re.I)
ACCESSORY_ITEM234 = re.compile(r'^[A-Za-z][A-Za-z0-9 /,+\-]{2,77}(?:\s*\(\d+ pieces\))?$',re.I)
ACCESSORY_BANNED234 = re.compile(r'(?i)\b(?:if |when |unless |only with|depending on|requires?|optional|standard)\b|\*')


def authored_status_chunks234(page_text,page,reasons):
    """Only a marked feature on its OWN line or an explicitly bounded,
    same-column standard/optional accessory list qualifies. Never promote
    list-membership to a verified base-product/SKU configuration.
    """
    lines=page_text.splitlines()[:400]
    out=[]
    section=None  # (status, declared component, left offset)
    for li,raw in enumerate(lines,1):
        if len(raw)>210:section=None;continue
        if not raw.strip():continue
        # Respect visual column boundaries in Poppler -layout. Do NOT borrow
        # an adjacent column's status heading to mark this column's products.
        columns=[]
        for m in re.finditer(r'\S(?:.*?)(?=\s{6,}\S|$)',raw.rstrip()):
            piece=m.group().strip()
            if piece: columns.append((m.start(),piece))
        if not columns:continue
        for x,cell in columns:
            if section and abs(x-section[2])<5:
                head=ACCESSORY_HEAD234.fullmatch(cell)
                if head:
                    # A scope declared in the first heading survives only a
                    # contiguous switch of status on the SAME column/page.
                    scope=(head.group('scope') or section[1]).lower()
                    section=(head.group('status').lower(),scope,x)
                    continue
                if cell.startswith('*') or cell.casefold().startswith(('note:','1.','1.4 ','1.5 ')):
                    section=None;continue
                if (ACCESSORY_ITEM234.fullmatch(cell.replace('incl.','incl')) and
                    not ACCESSORY_BANNED234.search(cell) and
                    len(cell.split())<=10 and
                    not re.fullmatch(r'[0-9. ]+',cell)):
                    out.append({'availabilityLabel':cell.lower(),'availabilityKind':'accessory',
                        'optionStatus':section[0],'scopeComponent':section[1],
                        'locator':{'page':page,'line':li},
                        'extractionMethod':'pdf_authored_accessory_list_candidate'})
                    reasons.add('pdf_explicit_accessory_status_unverified')
                    continue
                # An explicitly conditional accessory is skipped, without
                # deleting the still-valid list heading for following items.
                if re.fullmatch(r'[A-Za-z][A-Za-z0-9 ,/+\-]{2,75}\s*\(if [^)]+\)',cell,re.I):
                    reasons.add('pdf_conditional_accessory_not_assigned')
                    continue
                # Do not roll through intervening explanatory sentences.
                if x>=section[2]-4:section=None
            head=ACCESSORY_HEAD234.fullmatch(cell)
            if head and head.group('scope') and head.group('status').lower()=='standard':
                section=('standard',head.group('scope').lower(),x)
                continue
            # An explicit (Optional) is a feature lead, including when a
            # second column is present. Exclude generic status headings.
            feature=OPTIONAL_FEATURE234.fullmatch(cell)
            if feature:
                name=' '.join(feature.group('name').lower().split())
                # A heading fragment like 'of pasta in the bowl (optional)'
                # is not a named device capability. Never turn prepositions
                # detached from a multi-column table into product features.
                if re.match(r'^(?:of|in|to|for|on|by|with|without|and|or|the|an|a)\b',name):
                    reasons.add('pdf_fragmentary_optional_heading_rejected')
                    continue
                if name in ('standard accessories','optional accessories','additional options'):
                    continue
                out.append({'availabilityLabel':name,'availabilityKind':'feature',
                    'optionStatus':feature.group('status').lower(),'scopeComponent':None,
                    'locator':{'page':page,'line':li},
                    'extractionMethod':'pdf_authored_feature_status_candidate'})
                reasons.add('pdf_explicit_feature_status_unverified')
    return out

# Scope-safe multi-component table reader. Model names found in table columns
# identify candidate COMPONENTS, never exact verified main-product variants.
COMPONENT_CODE = re.compile(r'^[A-Z][A-Za-z0-9]*[0-9][A-Za-z0-9.-]{0,14}$')
COMPONENT_FIELDS = {
    'number of elements': 'count',
    'scanplane aperture': 'mm',
    'field of view': 'degrees',
    'pixel pitch': 'mm',
}
COMPONENT_VALUE = re.compile(r'^([0-9]{1,7}(?:[.,][0-9]{1,3})?)\s*(mm|cm|°|º|degrees?)?$', re.I)

def component_table_candidates231(lines_by_page, reasons):
    """Numeric cells underneath explicit per-component headers, based on word geometry.

    This narrow recognizer requires a 'Name' row with >=3 distinct model codes,
    left-side named field rows at the same Y coordinates, disjoint column
    boundaries and exactly one numeric value per cell. Refuses merged, ambiguous,
    cross-column or out-of-section values. No model/variant approval results.
    """
    claims=[]
    for page, lines in lines_by_page.items():
        headers=[l for l in lines if l['text'].strip().casefold()=='name' and l['x0']<190]
        if len(headers)!=1: continue
        header=headers[0]
        models=sorted([l for l in lines if abs(l['yc']-header['yc'])<=2.5 and
            l['x0']>header['x1']+25 and COMPONENT_CODE.fullmatch(l['text'])],key=lambda l:l['x0'])
        if not (3<=len(models)<=12): continue
        names=[m['text'] for m in models]
        if len(set(names))!=len(names) or any(models[i+1]['x0']-models[i]['x0']<30 for i in range(len(models)-1)):
            reasons.add('pdf_component_header_ambiguous');continue
        centers=[(m['x0']+m['x1'])/2 for m in models]
        boundaries=[(centers[i]+centers[i+1])/2 for i in range(len(centers)-1)]
        rows=sorted([l for l in lines if l['x0']<=header['x0']+4 and
            header['yc']+8<l['yc']<header['yc']+125],key=lambda l:l['yc'])
        stop=next((l['yc'] for l in rows if l['text'].casefold() in
            ('application','applications','application guide','exam type')),header['yc']+125)
        for label in rows:
            if label['yc']>=stop:break
            name=' '.join(label['text'].lower().split())
            expected=COMPONENT_FIELDS.get(name)
            if not expected:continue
            per_column={}
            for cell in lines:
                if cell['x0']<models[0]['x0']-25 or abs(cell['yc']-label['yc'])>2.0:continue
                if cell['x0']>models[-1]['x1']+30:continue
                midpoint=(cell['x0']+cell['x1'])/2
                k=sum(midpoint>=bound for bound in boundaries)
                left=boundaries[k-1] if k else models[0]['x0']-30
                right=boundaries[k] if k<len(boundaries) else models[-1]['x1']+30
                if cell['x0']<left-2 or cell['x1']>right+2:continue
                per_column.setdefault(k,[]).append(cell)
            for k,cells in per_column.items():
                # Refuse a cell with multiple numeric or textual tokens.
                # Picking the first would silently attribute an arbitrary value.
                if len(cells)!=1:
                    reasons.add('pdf_component_cell_ambiguous');continue
                cell=cells[0]
                m=COMPONENT_VALUE.fullmatch(cell['text'].strip())
                if not m:continue
                unit=(m.group(2) or '').lower()
                if expected=='count' and unit:continue
                if expected=='mm' and unit!='mm':continue
                if expected=='degrees' and unit not in ('°','º','degree','degrees'):continue
                value=float(m.group(1).replace(',','.'))
                if len(claims)>=MAX_OUTPUT:break
                claims.append({'structuredSpec':(name,value,expected),
                    'componentModel':names[k],'componentType':'document_declared_subcomponent',
                    'locator':{'page':page,'box':[round(label['x0'],2),round(min(label['y0'],cell['y0']),2),
                        round(cell['x1'],2),round(max(label['y1'],cell['y1']),2)]},
                    'extractionMethod':'poppler_scoped_component_table_candidate'})
    if claims: reasons.add('pdf_component_column_claims_unverified')
    return claims

# Phase235: bounded, product-column grids from publisher catalogues.
# Columns require full, disjoint author-written identifiers and a row key with
# an explicit physical unit. No inherited option or SKU availability inference.
CATALOG_MODEL235 = re.compile(r'^[A-Z]{2,4}\s+[0-9]{3,5}(?:\s+[A-Za-z][A-Za-z0-9*\-]{0,18})?$')
CATALOG_ROWS235 = {'capacity (kg)':('rated capacity','kg'),
                   'net weight (kg)':('net weight','kg'),
                   'spin speed (rpm)':('spin speed','rpm')}
SHEET_ROWS235 = re.compile(r'^(?P<label>load in kg|weight in kg|dimensions in mm \(width\)|dimensions in mm \(height\)|dimensions in mm \(depth\)|weighted water consumption per cycle in l|weighted energy consumption per 100 operating cycles for the wash cycle in kwh)\s*$',re.I)
SHEET_INTERVAL_FIELDS235={'voltage in v':('voltage','v'), 'total rated load in kw':('total rated load','kw')}
SHEET_DIMENSIONS235 = re.compile(r'^dimensions \(h x w x d\) in mm$',re.I)
SHEET_UNITS235={'load in kg':('nominal load','kg',None),
 'weight in kg':('weight','kg',None),
 'dimensions in mm (width)':('width','mm',None),
 'dimensions in mm (height)':('height','mm',None),
 'dimensions in mm (depth)':('depth','mm',None),
 'weighted water consumption per cycle in l':('weighted water consumption','l','per cycle'),
 'weighted energy consumption per 100 operating cycles for the wash cycle in kwh':('weighted energy consumption','kwh','per 100 operating cycles; wash cycle')}

def _columns235(line):
    return [(m.start(),m.group().strip()) for m in
        re.finditer(r'\S(?:.*?)(?=\s{3,}\S|$)',line.rstrip()) if m.group().strip()]

def catalog_grid_chunks235(page_text,page,reasons):
    """Read stable multi-model tables only where row/key/unit and model agree."""
    lines=page_text.splitlines()[:400];out=[]
    for header_i,line in enumerate(lines):
        cols=_columns235(line)
        if not cols or cols[0][1].casefold()!='product code':continue
        models=cols[1:]
        if not 3<=len(models)<=9 or any(not CATALOG_MODEL235.fullmatch(n) for _,n in models):
            continue
        names=[n for _,n in models]
        starts=[x for x,_ in models]
        if len(set(names))!=len(names) or any(starts[k+1]-starts[k]<9 for k in range(len(starts)-1)):
            reasons.add('pdf_catalog_model_columns_ambiguous');continue
        boundaries=[(starts[j]+starts[j+1])/2 for j in range(len(starts)-1)]
        found_rows=0;local=[]
        for ri,raw in enumerate(lines[header_i+1:header_i+18],header_i+2):
            parts=_columns235(raw)
            if not parts:continue
            label=parts[0][1].casefold()
            if label in ('product code','other comments'):break
            # Printed two-column labels can have only three spaces before
            # column one, so Poppler may join e.g. 'Net Weight (kg)   99'.
            # Split that case only when the complete unit-bearing row label
            # is author-written; do not infer a missing column or unit.
            inline_first=None
            if label not in CATALOG_ROWS235:
                m=re.fullmatch(r'(?P<key>capacity \(kg\)|net weight \(kg\)|spin speed \(rpm\))\s{2,}(?P<first>[0-9]{1,5}(?:\.[0-9]{1,2})?)',parts[0][1],re.I)
                if m:
                    label=m.group('key').casefold();inline_first=float(m.group('first'))
            config=CATALOG_ROWS235.get(label)
            if not config:continue
            entries=parts[1:];matches={};valid=True
            if inline_first is not None:matches[0]=inline_first
            for x,cell in entries:
                if not re.fullmatch(r'[0-9]{1,5}(?:\.[0-9]{1,2})?',cell):
                    valid=False;break
                k=sum(x>=b for b in boundaries)
                if k in matches or x<starts[k]-3 or x>starts[k]+8:
                    valid=False;break
                matches[k]=float(cell)
            if not valid or len(matches)!=len(models):
                reasons.add('pdf_catalog_numeric_row_ambiguous');continue
            found_rows+=1
            for k,value in sorted(matches.items()):
                local.append({'structuredSpec':(config[0],value,config[1]),
                   'catalogModel':names[k],'catalogType':'document_declared_catalog_product',
                   'locator':{'page':page,'line':ri},
                   'extractionMethod':'pdf_explicit_catalog_model_column_candidate'})
        # Multiple consistent typed rows must be present; a single apparent
        # aligned number row on its own does not establish a real model grid.
        if found_rows>=2:
            out.extend(local)
        elif local:
            reasons.add('pdf_catalog_insufficient_rows')
    if out:reasons.add('pdf_catalog_product_columns_unverified')
    return out

def technical_sheet_chunks235(page_text,page,reasons):
    """Strict two-column typed spec leads; author-written units only."""
    lines=page_text.splitlines()[:400];out=[]
    for li,raw in enumerate(lines,1):
        parts=_columns235(raw)
        # Parallel table/marketing columns are allowed only when the left
        # key and its numeric value are the final adjacent two table cells.
        for i in range(len(parts)-1):
            x,label=parts[i];val=parts[i+1][1].strip();key=label.casefold()
            config=SHEET_UNITS235.get(key)
            if config and re.fullmatch(r'[0-9]{1,7}(?:[.,][0-9]{1,2})?',val):
                if any(k in ('weight in kg','load in kg') for k in [key]) and float(val.replace(',','.'))>10000:
                    continue
                out.append({'structuredSpec':(config[0],float(val.replace(',','.')),config[1]),
                    **({'measurementBasis':config[2]} if config[2] else {}),
                    'locator':{'page':page,'line':li},
                    'extractionMethod':'pdf_typed_technical_sheet_candidate'})
            typed_interval=SHEET_INTERVAL_FIELDS235.get(key)
            if typed_interval:
                m=re.fullmatch(r'(?P<low>\d{1,7}(?:\.\d{1,2})?)\s*[-–—]\s*(?P<high>\d{1,7}(?:\.\d{1,2})?)',val)
                if m:
                    low=float(m.group('low'));high=float(m.group('high'))
                    if 0<=low<high<=10000000:
                        out.append({'structuredRange':{'lower':low,'upper':high,'unit':typed_interval[1]},
                            'rangeLabel':typed_interval[0],'scopeComponent':None,'condition':None,
                            'locator':{'page':page,'line':li},
                            'extractionMethod':'pdf_typed_sheet_interval_candidate'})
            if SHEET_DIMENSIONS235.fullmatch(label) and re.fullmatch(r'\d{2,5}\s*[x×]\s*\d{2,5}\s*[x×]\s*\d{2,5}',val,re.I):
                nums=[int(n) for n in re.findall(r'\d+',val)]
                if all(1<=n<=30000 for n in nums):
                    out.append({'structuredVector':{'axes':['height','width','depth'],'values':nums,'unit':'mm'},
                       'vectorLabel':'dimensions (h x w x d)','locator':{'page':page,'line':li},
                       'extractionMethod':'pdf_explicit_three_axis_dimension_candidate'})
        # A value may stand on the previous physical line while the explicit
        # measurement unit is on a single immediately following continuation.
        # Require both parts, same visual left alignment, and a unique number.
        if li<len(lines):
            left=_columns235(raw)
            next_line=_columns235(lines[li])
            if len(left)==2 and len(next_line)==1 and abs(left[0][0]-next_line[0][0])<=2:
                if left[0][1].casefold()=='weighted energy consumption per 100 operating cycles for' and \
                   next_line[0][1].casefold()=='the wash cycle in kwh' and \
                   re.fullmatch(r'\d{1,7}(?:\.\d{1,2})?',left[1][1]):
                    out.append({'structuredSpec':('weighted energy consumption',float(left[1][1]),'kwh'),
                        'measurementBasis':'per 100 operating cycles; wash cycle',
                        'locator':{'page':page,'line':li},
                        'extractionMethod':'pdf_typed_technical_sheet_candidate'})
    if out:reasons.add('pdf_typed_technical_sheet_claims_unverified')
    return out

def conditional_accessory_chunks235(page_text,page,reasons):
    out=[]
    for li,raw in enumerate(page_text.splitlines()[:400],1):
        # This exact grammatical construction signals an item available only
        # in some *unspecified* versions. It never denotes a bundled SKU.
        for _,cell in _columns235(raw):
            m=re.fullmatch(r'(?:\d+\s+)?(?P<name>[A-Za-z][A-Za-z ]{3,52}?)\s*\(on certain models only\)',cell,re.I)
            if not m:continue
            name=' '.join(m.group('name').lower().split())
            if not re.search(r'\b(?:bowl|basket|tray|lid|attachment|filter|adapter|hose|accessory)\b',name):continue
            out.append({'availabilityLabel':name,'availabilityKind':'accessory',
                'optionStatus':'conditional_unresolved','condition':'on certain models only',
                'scopeComponent':None,'locator':{'page':page,'line':li},
                'extractionMethod':'pdf_explicit_unresolved_model_condition_candidate'})
            reasons.add('pdf_conditional_accessory_model_identity_unresolved')
    return out

# Phase236: an author-authored, two-branch component-use dependency. No
# assumption that the optional trigger is included in a sale configuration.
# Require the complete IF/OTHERWISE pair and a locally declared component kit.
CONFIG_IF236 = re.compile(
    r'^If an? (?P<trigger>[A-Za-z][A-Za-z -]{2,35}) '
    r'\(optional (?:item|accessory)\) is combined with the '
    r'(?:machine|appliance), the (?P<inch>\d{1,3}(?:\.\d{1,2})?)'
    r'[”"″]\s*\((?P<metric>\d{1,4}(?:\.\d{1,2})?)\s*cm\) '
    r'(?P<item>tube|hose|cable) shall be used\.$',re.I)
CONFIG_ELSE236 = re.compile(
    r'^Otherwise, the (?P<inch>\d{1,3}(?:\.\d{1,2})?)'
    r'[”"″]\s*\((?P<metric>\d{1,4}(?:\.\d{1,2})?)\s*cm\) '
    r'(?P<item>tube|hose|cable) shall be used\.$',re.I)
CONFIG_KIT236 = re.compile(
    r'\bwith (?:two|2) (?P<qualifier>[A-Za-z]{2,22}) (?P<item>tubes|hoses|cables)\.$',re.I)

def configuration_use_chunks236(page_text,page,reasons):
    """Paired, explicitly conditional choice; never proof of a bundled SKU.

    A line-wrapped left PDF column may span two contiguous lines, but an
    unrelated heading/right column, missing OTHERWISE or a missing kit blocks
    both values. Do not use implicit contextual inference across pages.
    """
    cells=[]
    for li,raw in enumerate(page_text.splitlines()[:400],1):
        if len(raw)>250:cells.append((li,''));continue
        parts=_columns235(raw)
        # Only accept a single left text cell or an unambiguous left cell
        # before a separate, distant right column on the same physical line.
        cells.append((li,parts[0][1].strip() if parts and parts[0][0]<30 else ''))
    out=[]
    for i,(lineno,left) in enumerate(cells):
        if not re.fullmatch(r'If an? [A-Za-z][A-Za-z -]{2,35} \(optional (?:item|accessory)\) is combined with the',left,re.I):
            continue
        if i+2>=len(cells):continue
        if_line=left+' '+cells[i+1][1]
        branch=CONFIG_IF236.fullmatch(if_line)
        other=CONFIG_ELSE236.fullmatch(cells[i+2][1])
        if not branch or not other or branch.group('item').lower()!=other.group('item').lower():
            reasons.add('pdf_configuration_dependency_incomplete_or_ambiguous');continue
        antecedents=[CONFIG_KIT236.search(text) for _,text in cells[max(0,i-5):i]]
        kits=[k for k in antecedents if k and k.group('item').lower()==branch.group('item').lower()+'s']
        if len(kits)!=1:
            reasons.add('pdf_configuration_component_context_unresolved');continue
        label=kits[0].group('qualifier').lower()+' '+branch.group('item').lower()
        trigger=' '.join(branch.group('trigger').lower().split())
        present=float(branch.group('metric'));absent=float(other.group('metric'))
        inch_present=float(branch.group('inch'));inch_absent=float(other.group('inch'))
        # Only validate authored imperial/metric equivalent for obvious typos;
        # don't convert or infer unstated units.
        if not (0<present<1000 and 0<absent<1000 and present!=absent and
            abs(inch_present*2.54-present)<1.1 and abs(inch_absent*2.54-absent)<1.1):
            reasons.add('pdf_configuration_unit_or_branch_conflict');continue
        for val,state,loc_line in ((present,'present',lineno),(absent,'absent',cells[i+2][0])):
            out.append({'structuredSpec':(label+' length',val,'cm'),
                'scopeComponent':label,'condition':trigger+' '+state,
                'configurationDependency':{'triggerAccessory':trigger,'triggerState':state,
                    'requirement':'use_dimension_when_condition_met'},
                'locator':{'page':page,'line':loc_line},
                'extractionMethod':'pdf_explicit_conditional_component_use_candidate'})
        reasons.add('pdf_conditional_configuration_selection_unverified')
    return out

# Phase236: only author-written default plus adjustable minimum/maximum in
# prose scoped to ONE explicitly named cooking programme. These are machine
# control settings, NOT recipes, timed test results or expected food quality.
PROGRAM_HEAD236=re.compile(r'^([A-Z][A-Z /-]{2,28}) FUNCTION$')
PROGRAM_DEFAULT236=re.compile(r'\bdefault cooking time of (?P<value>\d{1,2}) hours?\.',re.I)
PROGRAM_BOUNDS236=re.compile(r'^The cooking time is adjustable from a minimum of (?P<low>\d{1,2}) hours? to a maximum of (?P<high>\d{1,2}) hours?\.$',re.I)

def operating_program_chunks236(page_text,page,reasons):
    """Never interpret rows of a cooking guide as device performance."""
    ls=[' '.join(_columns235(raw)[0][1].split()) if _columns235(raw) else ''
        for raw in page_text.splitlines()[:400]]
    heads=[(i,PROGRAM_HEAD236.fullmatch(t)) for i,t in enumerate(ls)]
    heads=[(i,m.group(1).lower()) for i,m in heads if m]
    if len(heads)!=1:return []
    program=heads[0][1];pos=heads[0][0]
    # Author-written two-sentence relationship, permitted across at most
    # three contiguous physical lines in the same text column.
    # Reject unrelated food/recipe guidance and unidentified programmes.
    candidates=[]
    pattern=re.compile(
        r'The screen displays the default cooking time of (?P<default>\d{1,2}) hours?\. '
        r'The cooking time is adjustable from a minimum of (?P<low>\d{1,2}) hours? '
        r'to a maximum of (?P<high>\d{1,2}) hours?\.',re.I)
    for i in range(pos+1,min(pos+81,len(ls)-2)):
        text=' '.join(ls[i:i+3])
        matches=list(pattern.finditer(text))
        if not matches:continue
        earlier=' '.join(ls[max(pos+1,i-2):i+1]).casefold()
        # One explicitly named machine menu mode, not an illustrative recipe.
        if not re.search(r'select [“\"«]?'+re.escape(program)+r'[”\"»]?',earlier,re.I):continue
        for m in matches:
            candidates.append((i,int(m.group('default')),int(m.group('low')),int(m.group('high'))))
    if len(candidates)!=1:return []
    line,default,lo,hi=candidates[0]
    if not 0<lo<=default<=hi<=48 or lo==hi:
        reasons.add('pdf_program_duration_ambiguous');return []
    reasons.add('pdf_operating_program_setting_not_product_performance')
    return [{'structuredRange':{'lower':lo,'upper':hi,'unit':'hours'},
        'rangeLabel':'cooking program adjustable duration',
        'scopeComponent':program+' program','condition':'user-adjustable',
        'programSetting':{'program':program,'setting':'cooking_duration',
            'defaultValue':default,'unit':'hours','context':'operating_instruction_not_test'},
        'locator':{'page':page,'line':line+1},
        'extractionMethod':'pdf_author_explicit_operating_program_candidate'}]

def spec_out(fmt, chunks, file_hash, reasons):
    models = set()
    for c in chunks:
        m = MODEL.match(c.get('text','').strip())
        if m:
            candidate=m.group(1).strip()
            # Poppler may split 'Model identifier  WWI860...' into a
            # label cell and a separate value cell. 'identifier' is a field
            # name, never the device's model identifier.
            if candidate.casefold() not in ('identifier','number','code','name','type','no','no.'):
                models.add(candidate)
    # Never silently assign an unmarked table row to the wrong model.
    model = next(iter(models)) if len(models) == 1 else None
    if len(models) > 1: reasons.add('multiple_declared_models_unresolved')
    if not model: reasons.add('exact_product_model_not_established')
    results = []; seen = set()
    for chunk in chunks:
        is_range='structuredRange' in chunk
        is_status='availabilityLabel' in chunk
        is_vector='structuredVector' in chunk
        is_program_table='programTableSetting' in chunk
        is_guide='cookingGuideSetting' in chunk
        is_control='manualControlSetting' in chunk
        parsed=None if (is_range or is_status or is_vector or is_program_table or is_guide or is_control) else (chunk.get('structuredSpec') or parse_spec(chunk['text']))
        if not is_range and not is_status and not is_vector and not is_program_table and not is_guide and not is_control and not parsed: continue
        label,val,unit=(chunk['guideLabel'],None,'operating_recommendation') if is_guide else ((chunk['controlLabel'],None,'operating_control') if is_control else ((chunk['programTableLabel'],None,'operating_settings') if is_program_table else ((chunk['rangeLabel'],None,chunk['structuredRange']['unit']) if is_range else ((chunk['availabilityLabel'],None,'availability') if is_status else ((chunk['vectorLabel'],None,chunk['structuredVector']['unit']) if is_vector else parsed)))))
        locator = chunk['locator']
        scope=chunk.get('scopeComponent')
        condition=chunk.get('condition')
        # An interval and its endpoints cannot be counted as scalar duplicates.
        # Exact source-position/scope is part of the range identity.
        if is_guide:
            st=chunk['cookingGuideSetting'];key=('cooking_guide',st['food'],st['drawer'],st['foodLoad']['value'],st['foodLoad']['unit'],st['durationMinutes']['lower'],st['durationMinutes']['upper'],st['recommendedTemperatureCelsius'],locator.get('page'),locator.get('line'))
        elif is_control:
            st=chunk['manualControlSetting'];key=('manual_control',st['parameter'],st['lower'],st['upper'],st['unit'],locator.get('page'),locator.get('line'))
        elif is_program_table:
            st=chunk['programTableSetting']
            key=('programme_table',st['program'],st['foodType'],st['defaultDurationMinutes'],
                st['adjustableDurationMinutes']['lower'],st['adjustableDurationMinutes']['upper'],
                st['defaultTemperatureCelsius'],locator.get('page'),locator.get('line'))
        elif is_status:
            key=(label,'availability',chunk['availabilityKind'],chunk['optionStatus'],
                 chunk['scopeComponent'],locator.get('page'),locator.get('line'))
        elif is_vector:
            key=(label,'vector',tuple(chunk['structuredVector']['values']),unit,locator.get('page'),locator.get('line'))
        elif is_range:
            r=chunk['structuredRange']
            key=(label,'interval',r['lower'],r['upper'],unit,locator.get('page'),
                 locator.get('line'),scope,condition)
        else:
            key = (label,val,unit,locator.get('page'),chunk.get('componentModel'),chunk.get('variantModel'),chunk.get('catalogModel'),chunk.get('measurementBasis')) if fmt == 'pdf' else (label,val,unit,json.dumps(locator,sort_keys=True))
        if 'configurationDependency' in chunk:
            key=key+('conditional_component_use',scope,condition,chunk['configurationDependency']['triggerAccessory'])
        if chunk.get('extractionMethod')=='pdf_author_scoped_technical_english_candidate':
            key=key+('manual_scoped',scope,condition)
        if key in seen: continue
        seen.add(key)
        results.append({'claimId': hashlib.sha256(json.dumps([file_hash,key],sort_keys=True).encode()).hexdigest(),
            'label':label,'value':val,'unit':unit,'model':model if 'componentModel' not in chunk and 'variantModel' not in chunk and 'catalogModel' not in chunk and not is_range and not is_status and not is_vector and 'configurationDependency' not in chunk and 'programSetting' not in chunk and not is_program_table and not is_guide and not is_control and chunk.get('extractionMethod')!='pdf_author_scoped_technical_english_candidate' else None,
            'modelAssignment':'single_declared_model_unverified' if model and 'componentModel' not in chunk and 'variantModel' not in chunk and 'catalogModel' not in chunk and not is_range and not is_status and not is_vector and 'configurationDependency' not in chunk and 'programSetting' not in chunk and not is_program_table and not is_guide and not is_control and chunk.get('extractionMethod')!='pdf_author_scoped_technical_english_candidate' else 'unresolved',
            'locator': locator, 'extractionMethod':chunk.get('extractionMethod','plain_key_value'), 'sourceRole':'publisher_document_claim_unverified',
            **({'range':chunk['structuredRange'],'scopeComponent':scope,
                 'condition':condition,'optionStatus':'not_established'} if is_range else {}),
            **({'availabilityKind':chunk['availabilityKind'],
                 'optionStatus':chunk['optionStatus'],'scopeComponent':scope,
                 **({'condition':chunk['condition']} if 'condition' in chunk else {})} if is_status else {}),
            **({'vector':chunk['structuredVector']} if is_vector else {}),
            **({'measurementBasis':chunk['measurementBasis']} if 'measurementBasis' in chunk else {}),
            **({'condition':condition,'scopeComponent':scope,'optionStatus':'not_established'} if chunk.get('extractionMethod')=='pdf_author_scoped_technical_english_candidate' and not is_range else {}),
            **({'configurationDependency':chunk['configurationDependency'],
                'scopeComponent':scope,'condition':condition,'optionStatus':'not_established'} if 'configurationDependency' in chunk else {}),
            **({'programSetting':chunk['programSetting']} if 'programSetting' in chunk else {}),
            **({'cookingGuideSetting':chunk['cookingGuideSetting'],'scopeComponent':scope,'condition':condition,'optionStatus':'not_established'} if is_guide else {}),
            **({'manualControlSetting':chunk['manualControlSetting'],'scopeComponent':scope,'condition':condition,'optionStatus':'not_established'} if is_control else {}),
            **({'programTableSetting':chunk['programTableSetting'],'scopeComponent':scope,
               'condition':condition,'optionStatus':'not_established'} if is_program_table else {}),
            **({'componentModel':chunk['componentModel'],'componentType':chunk['componentType']} if 'componentModel' in chunk else {}),
            **({'variantModel':chunk['variantModel'],'variantType':'document_declared_product_variant'} if 'variantModel' in chunk else {}),
            **({'catalogModel':chunk['catalogModel'],'catalogType':chunk['catalogType']} if 'catalogModel' in chunk else {}),
            'testedPerformance':False,'methodReviewed':False,'exactVariantVerified':False,'rankingAuthorized':False})
        if len(results) >= MAX_OUTPUT:
            reasons.add('claim_limit_reached'); break
    prose=[c for c in results if c.get('programSetting')]
    tables=[c for c in results if c.get('programTableSetting')]
    if any(a['programSetting']['program']==b['programTableSetting']['program'] and
        (a['range']['lower']*60!=b['programTableSetting']['adjustableDurationMinutes']['lower'] or
         a['range']['upper']*60!=b['programTableSetting']['adjustableDurationMinutes']['upper'])
        for a in prose for b in tables):
        reasons.add('pdf_programme_table_vs_prose_conflict_unresolved')
    if not results: reasons.add('no_unambiguous_key_value_specifications')
    return {'schema':'pee228.document-claims.v1','format':fmt,'documentSha256':file_hash,
      'declaredModel':model,'claimCount':len(results),'claims':results,'reasonCodes':sorted(reasons),
      'rawTextStored':False,'rawDocumentStored':False,'scientificEvidenceAdmitted':False,'rankingAuthorized':False}

def pdf_geometry_chunks(data, reasons):
    """Find narrow, row-aligned label/value leads; NOT a general table interpreter.

    Poppler's -bbox-layout provides per-word positions in XHTML. A line is a
    column candidate, never a verified table cell. We demand at least two
    physically aligned rows and refuse rows with parallel numeric columns.
    Coordinates are only locators, not an independent experimental protocol.
    """
    try:
        p = subprocess.run(['pdftotext','-f','1','-l','24','-bbox-layout','-','-'],
            input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=12,check=False)
    except (FileNotFoundError,subprocess.TimeoutExpired):
        reasons.add('pdf_geometry_unavailable_or_timed_out');return []
    if p.returncode != 0 or len(p.stdout)>2_000_000:
        reasons.add('pdf_geometry_decode_or_size_failure');return []
    if b'<!ENTITY' in p.stdout.upper():
        reasons.add('pdf_geometry_invalid_markup');return []
    # Poppler may emit raw PDF control glyphs that XML 1.0 forbids. Strip only
    # those code points; do not repair structural/tag errors or trust the glyphs.
    clean=re.sub(rb'[\x00-\x08\x0b\x0c\x0e-\x1f]',b'',p.stdout)
    if clean!=p.stdout: reasons.add('pdf_geometry_control_glyphs_ignored')
    try:
        root=ET.fromstring(clean)
    except ET.ParseError:
        reasons.add('pdf_geometry_invalid_markup');return []
    lines_by_page={}
    for pi,page in enumerate(root.iter(),1):
        if page.tag.rsplit('}',1)[-1] != 'page': continue
        actual_page=len(lines_by_page)+1
        if actual_page>24: break
        lines=[]
        for line in page.iter():
            if line.tag.rsplit('}',1)[-1]!='line':continue
            words=[w for w in line if w.tag.rsplit('}',1)[-1]=='word']
            if not words or len(words)>25:continue
            try:
                x0=min(float(w.get('xMin')) for w in words)
                x1=max(float(w.get('xMax')) for w in words)
                y0=min(float(w.get('yMin')) for w in words)
                y1=max(float(w.get('yMax')) for w in words)
            except (ValueError,TypeError):continue
            if not (0<=x0<x1<=2000 and 0<=y0<y1<=3000):continue
            txt=' '.join(''.join(w.itertext()) for w in words).strip()
            if not txt or len(txt)>110:continue
            lines.append({'text':txt,'x0':x0,'x1':x1,'y0':y0,'y1':y1,'yc':(y0+y1)/2})
            if len(lines)>1200:break
        lines_by_page[actual_page]=lines
    candidate=[];ambiguous=False
    for page,lines in lines_by_page.items():
        candidates=[]
        for label in lines:
            # Labels must be complete; no substring matching or inferred units.
            label_text=label['text'].rstrip(':').strip()
            if not parse_spec(label_text+' : 1 cm'): continue
            neighbours=[v for v in lines if v is not label and abs(v['yc']-label['yc'])<=3.5
                and v['x0']>=label['x1']+15 and v['x0']-label['x1']<=320]
            nums=[v for v in neighbours if VALUE_CELL.fullmatch(v['text'])]
            # If a parallel model/measurement column is present, refuse the row.
            if len(nums)>1:
                ambiguous=True;continue
            if len(nums)!=1:continue
            value=nums[0]
            # A second label or other text between the label and value makes
            # two-column interpretation uncertain; multi-column pages abstain.
            between=[v for v in neighbours if v is not value and v['x0']<value['x0']+5]
            if between:
                ambiguous=True;continue
            candidates.append((label,value,label_text))
        # Keep only consecutively spaced, consistently column-aligned runs.
        candidates.sort(key=lambda t:(t[0]['yc'],t[0]['x0']))
        groups=[];current=[]
        for c in candidates:
            if current and (c[0]['yc']-current[-1][0]['yc']>65 or
                abs(c[0]['x0']-current[-1][0]['x0'])>8 or
                abs(c[1]['x0']-current[-1][1]['x0'])>10 or
                c[0]['yc']-current[-1][0]['yc']<8):
                groups.append(current);current=[]
            current.append(c)
        if current:groups.append(current)
        for group in groups:
            if len(group)<2:continue
            for label,value,txt in group:
                m=VALUE_CELL.fullmatch(value['text'])
                val=m.group('value');unit=m.group('unit')
                bbox=[round(label['x0'],2),round(min(label['y0'],value['y0']),2),
                      round(value['x1'],2),round(max(label['y1'],value['y1']),2)]
                candidate.append({'text':f'{txt}: {val} {unit}',
                    'locator':{'page':page,'box':bbox},'extractionMethod':'poppler_aligned_two_column_candidate'})
    candidate.extend(component_table_candidates231(lines_by_page, reasons))
    if ambiguous:reasons.add('pdf_parallel_or_ambiguous_columns_skipped')
    if candidate:reasons.add('pdf_coordinate_rows_unverified')
    else:reasons.add('pdf_no_stable_two_column_rows')
    return candidate[:MAX_OUTPUT]

# Phase237: printed multi-axis cooking-programme control tables. We require
# entire printed header and consistent character-column layout from Poppler
# -layout; reject partial or wrapped axes rather than guessing table cells.
# Program labels and food types come from the document; no retail SKU is inferred.
PROGRAMME_HEADER237=re.compile(r'COOKING PROGRAMM?E? TABLE',re.I)
PROGRAMME_ROW237=re.compile(r'^ {4,8}(?P<program>[A-Za-z][A-Za-z /-]{2,18}?) {2,}(?P<automatic>[1-4])(?: {3,}|$)')
FOOD_ROW237=re.compile(r'^\s*(Veg|Fish|Poultry|Meat)\s+(\d{1,2}(?:h\d{1,2}min|h|min))\s*$',re.I)
FOOD_TYPES237={'veg','fish','poultry','meat'}
DURATION237=re.compile(r'(?P<n>\d{1,3})(?P<u>h|min)')
DURATION_RANGE237=re.compile(r'^\s*(?P<lo>\d{1,3}(?:h\d{1,2}min|h|min))\s*[-–]\s*(?P<hi>\d{1,3}(?:h\d{1,2}min|h|min))\s*$')

def _minutes237(s):
    s=s.strip().lower()
    m=re.fullmatch(r'(\d{1,3})h(?:(\d{1,2})min)?',s)
    if m: return int(m.group(1))*60+int(m.group(2) or '0')
    m=re.fullmatch(r'(\d{1,4})min',s)
    return int(m.group(1)) if m else None

def _range237(s):
    m=DURATION_RANGE237.fullmatch(s.strip())
    if not m:return None
    lo=_minutes237(m.group('lo'));hi=_minutes237(m.group('hi'))
    if lo is None or hi is None or not 0<lo<hi<=1440:return None
    return {'lower':lo,'upper':hi}

def _temperature237(s):
    m=re.fullmatch(r'\s*(\d{1,3})\s*°\s*C\s*',s,re.I)
    return int(m.group(1)) if m and 0<int(m.group(1))<=250 else None

def operating_programme_table_chunks237(page_text,page,reasons):
    lines=page_text.splitlines()[:400]
    headers=[i for i,line in enumerate(lines) if PROGRAMME_HEADER237.search(line)]
    if len(headers)!=1:return []
    h=headers[0]
    # Require full independent column-heading context. A 'cooking time'
    # recipe chart does not have programmes, temperatures and food axes.
    top=' '.join(lines[h:h+9]).casefold()
    if not all(x in top for x in ('programs automatic','cooking time','temperature (°c)','food','default','range')):
        reasons.add('pdf_programme_table_header_incomplete');return []
    candidates=[]
    for i in range(h+9,min(len(lines),h+105)):
        line=lines[i]
        if 'Programs' in line and 'TOTAL' in ' '.join(lines[i:i+2]):break
        m=PROGRAMME_ROW237.match(line)
        if m:candidates.append((i,m.group('program').strip().casefold(),int(m.group('automatic'))))
    if not candidates:return []
    out=[]
    for pos,(i,program,automatic_count) in enumerate(candidates):
        # Every settings row requires an authored range, and an authored
        # temperature in the stable header-defined column.
        row=lines[i]
        # Poppler can compress whitespace independently of the source font.
        # Use complete unambiguous tokens rather than fixed character offsets.
        spans=list(re.finditer(r'\d{1,3}(?:h\d{1,2}min|h|min)\s*[-–]\s*\d{1,3}(?:h\d{1,2}min|h|min)',row))
        if len(spans)!=1:
            reasons.add('pdf_programme_table_ambiguous_duration');continue
        range_match=spans[0]
        duration_range=_range237(range_match.group())
        temperatures=re.findall(r'(?<![\w/])(\d{1,3})\s*°\s*C(?!\w)',row,re.I)
        main_temp=int(temperatures[0]) if len(temperatures)==1 and 1<=int(temperatures[0])<=250 else None
        if not duration_range:
            reasons.add('pdf_programme_table_ambiguous_duration');continue
        if not main_temp and automatic_count!=4:
            reasons.add('pdf_programme_table_ambiguous_temperature');continue
        foods=[]
        if automatic_count==4:
            # A printed program cell spans multiple food rows. Collect at
            # most two before and two after; a single delayed-start wrap
            # line containing ~24h may be skipped. No other text can cross.
            indices=[]
            for k in range(i-1,max(h+7,i-5),-1):
                if len(indices)>=2:break
                if not lines[k].strip():continue
                if re.fullmatch(r'\s*~24h\s*',lines[k]):continue
                if PROGRAMME_ROW237.match(lines[k]):break
                if not re.match(r'^\s{15,}(?:Veg|Fish|Poultry|Meat)\s+\d',lines[k],re.I):break
                indices.insert(0,k)
            for k in range(i+1,min(len(lines),i+6)):
                if len(indices)>=4:break
                if not lines[k].strip():continue
                if re.fullmatch(r'\s*~24h\s*',lines[k]):continue
                if PROGRAMME_ROW237.match(lines[k]):break
                if not re.match(r'^\s{15,}(?:Veg|Fish|Poultry|Meat)\s+\d',lines[k],re.I):break
                indices.append(k)
            for k in indices:
                fm=re.fullmatch(r'\s{15,}(Veg|Fish|Poultry|Meat)\s+(\d{1,3}(?:h\d{1,2}min|h|min))(?:\s+.*)?',lines[k],re.I)
                if not fm:break
                minutes=_minutes237(fm.group(2))
                temps=re.findall(r'(?<![\w/])(\d{1,3})\s*°\s*C(?!\w)',lines[k],re.I)
                temp=int(temps[0]) if len(temps)==1 and 1<=int(temps[0])<=250 else None
                if minutes is None or not 0<minutes<=1440:break
                foods.append((fm.group(1).casefold(),minutes,temp,k))
            if len(foods)!=4 or {x[0] for x in foods}!=FOOD_TYPES237:
                reasons.add('pdf_programme_table_food_axis_incomplete');continue
            if main_temp is None and any(f[2] is None for f in foods):
                reasons.add('pdf_programme_table_temperature_axis_incomplete');continue
        else:
            # Exactly one authored default-time token between the program
            # count and the range; no recipe advice or extra numeric cells.
            prefix=row[m.end():range_match.start()]
            candidates=re.findall(r'(?<![\w])\d{1,3}(?:h\d{1,2}min|h|min)(?!\w)',prefix,re.I)
            default=_minutes237(candidates[0]) if len(candidates)==1 else None
            if default is None or not 0<default<=1440:
                reasons.add('pdf_programme_table_default_ambiguous');continue
            foods=[(None,default,main_temp,i)]
        for food,default,temp,food_row in foods:
            if not duration_range['lower']<=default<=duration_range['upper']:
                reasons.add('pdf_programme_table_default_outside_range');continue
            if temp is None:temp=main_temp
            if temp is None:continue
            out.append({'programTableSetting':{
                'program':program,'foodType':food,'defaultDurationMinutes':default,
                'adjustableDurationMinutes':duration_range,
                'defaultTemperatureCelsius':temp,
                'context':'manufacturer_programme_table_not_test'},
                'programTableLabel':'cooking programme control settings',
                'scopeComponent':program+' program',
                'condition':'food type: '+food if food else 'program default',
                'locator':{'page':page,'line':food_row+1,'row':i+1},
                'extractionMethod':'pdf_authored_multi_axis_programme_table_candidate'})
    if out:reasons.add('pdf_programme_table_operating_instructions_only')
    return out

# Phase238: bounded English specification-section intake from PDF manuals.
# Original manufacturer statements only, never independent outcomes. This
# covers dual imperial/metric presentations and explicitly conditional tanks.
# A missing paired condition, conflicting repeats or unknown units abstains.
_BLOCK_FIELDS238 = re.compile(r'^\s*[•*\-]\s*(Power supply|Nominal power|Dimensions|Water tank(?: removable type)?|Weight)\s*:\s*(.*)$',re.I)
_STANDBY238 = re.compile(r'\bIn (NETWORKED STANDBY|LOW POWER) mode the power consumption of the machine is\s+(\d{1,3}(?:\.\d{1,3})?)\s*W\b',re.I)

def english_manual_technical_chunks238(page_text,page,reasons):
    lines=page_text.splitlines()[:240]
    # Technical heading AND terminating subsequent heading are required to
    # avoid reclassifying usage instructions, procedures or ingredient amounts.
    technical=[i for i,s in enumerate(lines) if s.strip().casefold().startswith('technical specifications')]
    starter=[i for i,s in enumerate(lines) if s.strip().casefold()=='technical description']
    terminator=[i for i,s in enumerate(lines) if s.strip().casefold()=='communication module']
    out=[]
    if len(technical)==1 and len(starter)==1 and len(terminator)==1 and technical[0]<starter[0]<terminator[0] and terminator[0]-starter[0]<=35:
        values={}
        for idx in range(starter[0]+1,terminator[0]):
            match=_BLOCK_FIELDS238.match(lines[idx])
            if not match: continue
            key=' '.join(match.group(1).lower().split())
            if key in values: reasons.add('pdf_manual_duplicate_spec_field_ignored');return []
            values[key]=(match.group(2).strip(),idx+1)
        def put(label,number,unit,line,condition=None,scope=None):
            if not 0<number<=1000000:return
            out.append({'structuredSpec':(label,float(number),unit),'locator':{'page':page,'line':line},
                        'condition':condition,'scopeComponent':scope,
                        'extractionMethod':'pdf_author_scoped_technical_english_candidate'})
        def put_range(label,lo,hi,unit,line):
            if not 0<lo<hi<=100000:return
            out.append({'rangeLabel':label,'structuredRange':{'lower':float(lo),'upper':float(hi),'unit':unit},
                        'locator':{'page':page,'line':line},'condition':None,'scopeComponent':None,
                        'extractionMethod':'pdf_author_scoped_technical_english_candidate'})
        supply=values.get('power supply')
        if supply:
            m=re.fullmatch(r'(\d{2,4})\s*[-–]\s*(\d{2,4})\s*V\s*;\s*(\d{2,3})\s*[-–]\s*(\d{2,3})\s*Hz',supply[0],re.I)
            if m:
                put_range('input voltage',int(m[1]),int(m[2]),'v',supply[1]);put_range('input frequency',int(m[3]),int(m[4]),'hz',supply[1])
        nominal=values.get('nominal power')
        if nominal:
            m=re.fullmatch(r'(\d{1,5})\s*W',nominal[0],re.I)
            if m:put('nominal power',int(m[1]),'w',nominal[1])
        weight=values.get('weight')
        if weight:
            m=re.fullmatch(r'\d{1,5}(?:\.\d{1,2})?\s*(?:lb|lbs)\s*\(\s*(\d{1,4}(?:\.\d{1,2})?)\s*kg\s*\)',weight[0],re.I)
            if m:put('weight',float(m[1]),'kg',weight[1])
        dims=values.get('dimensions')
        if dims:
            pattern=r'\s*(Height|Width|Length)\s+\d{1,4}(?:\.\d{1,3})?\s*in\s*\(\s*(\d{1,5})\s*mm\s*\)\s*'
            parts=re.split(r'\s+-\s+',dims[0]);parsed=[re.fullmatch(pattern,part,re.I) for part in parts]
            if len(parts)==3 and all(parsed) and [m[1].casefold() for m in parsed]==['height','width','length']:
                vec=[int(m[2]) for m in parsed]
                if all(1<=v<=30000 for v in vec):
                    out.append({'vectorLabel':'dimensions (h x w x l)','structuredVector':{'axes':['height','width','length'],'values':vec,'unit':'mm'},
                        'locator':{'page':page,'line':dims[1]},'scopeComponent':None,'condition':None,
                        'extractionMethod':'pdf_author_scoped_technical_english_candidate'})
        tank=values.get('water tank removable type') or values.get('water tank')
        if tank:
            pattern=r'\s*\d{1,4}(?:\.\d{1,2})?\s*fl\s*oz\s*\(\s*(\d{1,3}(?:\.\d{1,2})?)\s*l\s*\)\s*(without|with)\s+filter\s*'
            parts=re.split(r'\s+-\s+',tank[0]);parsed=[re.fullmatch(pattern,x,re.I) for x in parts]
            if len(parts)==2 and all(parsed) and {m[2].casefold() for m in parsed}=={'with','without'}:
                for m in parsed:put('water tank capacity',float(m[1]),'l',tank[1],m[2].casefold()+' filter','water tank')
    # Power modes are read only from authored complete English sentences, and
    # require BOTH modes to be explicit on this page (never a default wattage).
    flattened=' '.join(' '.join(lines).split())
    modes=list(_STANDBY238.finditer(flattened))
    if len(modes)==2 and {x[1].casefold() for x in modes}=={'networked standby','low power'}:
        for m in modes:
            out.append({'structuredSpec':('power consumption',float(m[2]),'w'),
                 'condition':m[1].casefold(),'scopeComponent':None,
                 'locator':{'page':page,'line':next((i+1 for i,l in enumerate(lines) if m[1].casefold() in l.casefold()),1)},
                 'extractionMethod':'pdf_author_scoped_technical_english_candidate'})
    if out:reasons.add('pdf_manual_english_scoped_claims_unverified')
    return out


# Phase239. A cooking-guide row is an authored operating RECOMMENDATION,
# not a measured outcome. Never reconstruct a missing food or drawer from a
# nearby pictogram. Require an explicit 3-column heading and complete adjacent
# food -> drawer/duration/temp -> food load triple on the SAME PDF page.
GUIDE239_HEADER=re.compile(r'\bManual programme\s+Min-max\s+Temperature\b',re.I)
GUIDE239_ROW=re.compile(r'^Drawer\s+(?P<drawer>[12])\s+(?P<lo>\d{1,3})\s*[–-]\s*(?P<hi>\d{1,3})\s*min\s+(?P<temp>\d{2,3})\s*[°º]C\s*$',re.I)
GUIDE239_LOAD=re.compile(r'^(?P<weight>\d{1,4}(?:\.\d{1,2})?)\s*(?P<unit>g|kg|kilo)(?:\s+(?:skin on fillet salmon|fillet))?\s*$',re.I)
GUIDE239_FOOD=re.compile(r'^[A-Za-z][A-Za-z /-]{2,48}$')
CONTROL239_TEMPERATURE=re.compile(r'\bthermostat varies from\s+(\d{1,3})\s*[-–]\s*(\d{1,3})\s*[°º]C',re.I)
CONTROL239_TIMER=re.compile(r'\btimer can be\s+set for between\s+(\d{1,3})\s+and\s+(\d{1,3})\s+minutes',re.I)

def authored_cooking_guide_chunks239(page_text,page,reasons):
    if not GUIDE239_HEADER.search(page_text) or not re.search(r'\bCOOKING GUIDE\b',page_text,re.I):
        return []
    lines=[(i+1,s.strip()) for i,s in enumerate(page_text.splitlines()[:400]) if s.strip()]
    start=next((i for i,(_,s) in enumerate(lines) if GUIDE239_HEADER.search(s)),None)
    if start is None:return []
    end=next((i for i in range(start+1,len(lines)) if lines[i][1].upper() in ('TIPS','CLEANING','STORAGE','GUARANTEE AND SERVICE')),len(lines))
    entries=[];bad=0;seen=set();repeated=set()
    for i in range(start+1,end-2):
        lineno,food=lines[i]
        # Require strictly adjacent, unambiguous rendered triples. The
        # possibility of wrapped text or a missing axis is reason to abstain.
        d=GUIDE239_ROW.fullmatch(lines[i+1][1]);load=GUIDE239_LOAD.fullmatch(lines[i+2][1])
        if not d or not load:continue
        if not GUIDE239_FOOD.fullmatch(food) or food.lower().startswith(('drawer','manual','min-max')):
            bad+=1;continue
        lo,hi,temp=int(d['lo']),int(d['hi']),int(d['temp'])
        amount=float(load['weight']);unit='kg' if load['unit'].lower()=='kilo' else load['unit'].lower()
        if not (0<lo<=hi<=180 and 35<=temp<=240 and 0<amount<=1500):bad+=1;continue
        k=(food.casefold(),int(d['drawer']))
        if k in seen:bad+=1;repeated.add(k);continue
        seen.add(k)
        entries.append({'cookingGuideSetting':{'food':food.lower(),'drawer':int(d['drawer']),
           'foodLoad':{'value':amount,'unit':unit},'durationMinutes':{'lower':lo,'upper':hi},
           'recommendedTemperatureCelsius':temp,'context':'manufacturer_cooking_guide_not_test'},
           'guideLabel':'cooking guide recommendation','scopeComponent':'drawer '+d['drawer'],
           'condition':'food: '+food.lower(),
           'extractionMethod':'pdf_authored_cooking_guide_tuple_candidate',
           'locator':{'page':page,'line':lineno}})
    if repeated:
        entries=[c for c in entries if (c['cookingGuideSetting']['food'],c['cookingGuideSetting']['drawer']) not in repeated]
    if bad:reasons.add('pdf_guide_rows_incomplete_or_ambiguous_skipped')
    if entries:reasons.add('pdf_author_cooking_guide_unverified_not_performance_test')
    return entries

def authored_manual_controls239(page_text,page,reasons):
    if 'USING ONLY ONE DRAWER OF THE APPLIANCE' not in page_text or 'manual settings' not in page_text.lower():return []
    specs=[('thermostat',CONTROL239_TEMPERATURE,'°C'),('timer',CONTROL239_TIMER,'minutes')]
    out=[]
    for kind,pattern,unit in specs:
        matches=list(pattern.finditer(page_text))
        if len(matches)!=1:continue
        lo,hi=map(int,matches[0].groups())
        if not (0<=lo<hi and ((kind=='thermostat' and 30<=lo and hi<=250) or (kind=='timer' and hi<=240))):continue
        lineno=page_text[:matches[0].start()].count('\n')+1
        out.append({'manualControlSetting':{'program':'manual','parameter':kind,
                 'lower':lo,'upper':hi,'unit':unit,'context':'manufacturer_machine_control_not_test'},
           'controlLabel':'manual programme '+kind+' adjustment','scopeComponent':'manual program',
           'condition':'user adjustable','extractionMethod':'pdf_author_explicit_manual_control_candidate',
           'locator':{'page':page,'line':lineno}})
    if out:reasons.add('pdf_author_manual_control_unverified_not_performance_test')
    return out

def pdf_chunks(data,reasons,visual_sink=None):
    if not data.startswith(b'%PDF-'):
        reasons.add('invalid_pdf_magic'); return []
    try:
        p = subprocess.run(['pdftotext','-f','1','-l','24','-layout','-enc','UTF-8','-','-'],
               input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=12,check=False)
    except (FileNotFoundError,subprocess.TimeoutExpired):
        reasons.add('pdf_text_extractor_unavailable_or_timed_out'); return []
    if p.returncode != 0:
        reasons.add('pdf_decode_failed_or_restricted'); return []
    if len(p.stdout) > 1_500_000:
        reasons.add('pdf_text_output_limit_exceeded'); return []
    txt = p.stdout.decode('utf8','replace')
    if not txt.strip():
        reasons.add('pdf_image_only_or_needs_ocr');return []
    pages = txt.split('\f')
    reasons.add('pdf_first_twenty_four_pages_only')
    if visual_sink is not None:visual_sink.extend(visual_slots240(data,pages,reasons))
    chunks=[]
    for pi,page in enumerate(pages[:24],1):
        chunks.extend(authored_cooking_guide_chunks239(page,pi,reasons))
        chunks.extend(authored_manual_controls239(page,pi,reasons))
        chunks.extend(english_manual_technical_chunks238(page,pi,reasons))
        chunks.extend(variant_weight_chunks232(page,pi,reasons))
        chunks.extend(interval_chunks233(page,pi,reasons))
        chunks.extend(authored_status_chunks234(page,pi,reasons))
        chunks.extend(catalog_grid_chunks235(page,pi,reasons))
        chunks.extend(technical_sheet_chunks235(page,pi,reasons))
        chunks.extend(conditional_accessory_chunks235(page,pi,reasons))
        chunks.extend(configuration_use_chunks236(page,pi,reasons))
        chunks.extend(operating_program_chunks236(page,pi,reasons))
        chunks.extend(operating_programme_table_chunks237(page,pi,reasons))
        within_filter_section=False
        for li,line in enumerate(page.splitlines()[:400],1):
            heading=line.strip().lower()
            if heading=='filter': within_filter_section=True
            if heading in ('operation','logistics','electrical','specifications'):
                within_filter_section=False
            if len(line)>250 or not line.strip():continue
            for column in COLUMN_SPLIT.split(line.strip()):
                if not column.strip(): continue
                # Comma-separated fields are safe only when the line starts
                # with a dimension label; component descriptions must not
                # leak their subcomponent weight into overall product weight.
                parts=MULTI_FIELD_SPLIT.split(column) if DIMENSION_START.match(column.strip()) else [column]
                for part in parts:
                    if within_filter_section and part.strip().lower().startswith(('net weight:', 'box weight:')):
                        reasons.add('component_weight_not_promoted_to_product_weight')
                        continue
                    chunks.append({'locator':{'page':pi,'line':li},'text':part.strip()})
    # Previous plain-key-value parser is retained, plus bounded geometry candidates.
    # Layout candidates remain manufacturer claims needing variant verification.
    chunks.extend(pdf_geometry_chunks(data,reasons))
    reasons.add('pdf_table_cell_geometry_not_verified')
    return chunks

# Phase240: evidence-preserving positional slots from icon-headed PDF tables.
# A visible duration WITHOUT a text-grounded column/food label is NOT a claim.
# These are inspection coordinates only, never inferred product programme evidence.
VISUAL240_FULL = re.compile(r'(?<!\d)(\d{1,2})\s+min\s+(\d{1,2})\s*s\b',re.I)
VISUAL240_RANGE = re.compile(r'(?<!\d)(\d{1,2})\s*[–—-]\s*(\d{1,2})\s*min\b',re.I)

def visual_slots240(data,pages,reasons):
    result=[]
    # Only English-authored page-level labels, never icon classification.
    # A duration-row heading or the author's explicit thickness qualifier must
    # appear before position capture is attempted.
    for pi,page in enumerate(pages[:24],1):
        layout_program = any(re.match(r'^\s*Program\b',row,re.I) and any(re.match(r'^\s*length\b',next_row,re.I) for next_row in page.splitlines()[i+1:i+4]) for i,row in enumerate(page.splitlines())) and len(VISUAL240_FULL.findall(page))>=3
        layout_grill = 'Depending on thickness' in page and len(VISUAL240_RANGE.findall(page))>=5
        if not (layout_program or layout_grill): continue
        if len(result)>=32:break
        try:
            proc=subprocess.run(['pdftotext','-f',str(pi),'-l',str(pi),'-bbox-layout','-','-'],
                input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=6,check=False)
            if proc.returncode or len(proc.stdout)>600_000:continue
            # Strip the Poppler-owned XHTML DTD. ElementTree performs no
            # external entity resolution, and the parser handles local XML.
            xml=re.sub(br'<!DOCTYPE[^>]*>',b'',proc.stdout,count=1).decode('utf8','replace')
            # Poppler XHTML can contain raw PDF control characters: reject
            # those bytes as XML characters without changing any numeric token.
            xml=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', xml)
            root=ET.fromstring(xml)
        except (FileNotFoundError,subprocess.TimeoutExpired,ET.ParseError,ValueError):continue
        ns={'h':'http://www.w3.org/1999/xhtml'}
        candidates=[]
        for line in root.findall('.//h:line',ns):
            words=line.findall('h:word',ns)
            spans=[];parts=[];cursor=0
            for w in words:
                token=''.join(w.itertext())
                if not token:continue
                begin=cursor;parts.append(token);cursor+=len(token)
                spans.append((begin,cursor,w));cursor+=1
            line_text=' '.join(parts)
            pattern=VISUAL240_FULL if layout_program else VISUAL240_RANGE
            for m in pattern.finditer(line_text):
                if layout_program:
                    minutes,secs=map(int,m.groups())
                    if not (0<minutes<=20 and 0<=secs<60):continue
                    low=high=60*minutes+secs
                    kind='unassigned_programme_duration'
                else:
                    low,high=map(int,m.groups());low*=60;high*=60
                    if not (0<low<=high<=180*60):continue
                    kind='unassigned_illustrated_food_time'
                attached=[w for a,b,w in spans if b>m.start() and a<m.end()]
                if not attached:continue
                try:
                    vals=[[float(w.attrib[k]) for k in ('xMin','yMin','xMax','yMax')] for w in attached]
                except (KeyError,ValueError):continue
                box=[round(min(v[0] for v in vals),2),round(min(v[1] for v in vals),2),
                     round(max(v[2] for v in vals),2),round(max(v[3] for v in vals),2)]
                if not(0<=box[0]<box[2]<=2000 and 0<=box[1]<box[3]<=2000):continue
                candidates.append({'page':pi,'box':box,'kind':kind,
                    'durationSeconds':{'lower':low,'upper':high},
                    'association':'unresolved_icon_or_column_heading',
                    'sourceRole':'manufacturer_layout_candidate_not_test',
                    'rankingAuthorized':False})
        # Geometric repeats can occur in PDF layout. Retain a candidate only
        # once per exact position; never interpret nearby image semantics.
        unique={tuple(c['box']):c for c in candidates}
        page_slots=sorted(unique.values(),key=lambda c:(c['box'][1],c['box'][0]))
        if (layout_program and len(page_slots)>=3) or (layout_grill and len(page_slots)>=5):
            result.extend(page_slots[:max(0,32-len(result))])
    if result:reasons.add('pdf_visual_table_unassigned_slots_require_image_label_review')
    return result

def docx_chunks(data,reasons):
    if not data.startswith(b'PK'):
        reasons.add('invalid_docx_magic'); return []
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            names=z.namelist()
            if len(names)>350 or any(n.startswith('/') or '..' in n.split('/') for n in names):
                reasons.add('docx_archive_security_rejected');return []
            info=z.infolist()
            if any(i.file_size>4_000_000 or (i.file_size>100_000 and i.compress_size and i.file_size/i.compress_size>120) for i in info):
                reasons.add('docx_bomb_risk_rejected');return []
            if 'word/document.xml' not in names or '[Content_Types].xml' not in names:
                reasons.add('invalid_docx_structure');return []
            if any(n.endswith(('vbaProject.bin','.exe','.js')) for n in names):
                reasons.add('active_content_present'); return []
            raw=z.read('word/document.xml')
            if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
                reasons.add('xml_entity_rejected');return []
            root=ET.fromstring(raw)
    except (zipfile.BadZipFile,ET.ParseError,RuntimeError,ValueError,KeyError):
        reasons.add('docx_decode_failed');return []
    chunks=[]; pos=0
    def word_text(node):
        return ''.join(n.text or '' for n in node.iter(W+'t')).strip()
    for p in root.iter(W+'p'):
        if len(chunks)>2400: reasons.add('docx_paragraph_limit');break
        # Parse outside tables below to avoid duplicate claims with unstable positions.
    body=root.find('.//'+W+'body')
    if body is None: return []
    for element in list(body)[:1200]:
        if element.tag == W+'p':
            pos+=1; s=word_text(element)
            if s and len(s)<250:chunks.append({'locator':{'paragraph':pos},'text':s})
        elif element.tag == W+'tbl':
            rows=list(element.findall(W+'tr'))[:100]
            table_id=pos+1
            for ri,row in enumerate(rows,1):
                cells=row.findall(W+'tc')
                if len(cells)!=2:
                    reasons.add('docx_non_two_column_table_unresolved');continue
                if any(c.find('.//'+W+'gridSpan') is not None or c.find('.//'+W+'vMerge') is not None for c in cells):
                    reasons.add('docx_merged_cells_unresolved');continue
                a,b=word_text(cells[0]),word_text(cells[1])
                if len(a)>100 or len(b)>100:continue
                s=a+' : '+b
                chunks.append({'locator':{'table':table_id,'row':ri},'text':s})
            pos+=1
    return chunks

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--format',required=True,choices=['pdf','docx'])
    args=parser.parse_args()
    max_bytes=PDF_MAX_BYTES if args.format=='pdf' else DOCX_MAX_BYTES
    data=sys.stdin.buffer.read(max_bytes+1)
    if not data or len(data)>max_bytes:
        print(json.dumps({'schema':'pee228.document-claims.v1','format':args.format,'documentSha256':None,
          'declaredModel':None,'claimCount':0,'claims':[],'reasonCodes':['binary_size_invalid'],
          'rawTextStored':False,'rawDocumentStored':False,'scientificEvidenceAdmitted':False,'rankingAuthorized':False}));return
    reasons=set(); digest=hashlib.sha256(data).hexdigest()
    visual=[]
    chunks=pdf_chunks(data,reasons,visual) if args.format=='pdf' else docx_chunks(data,reasons)
    output=spec_out(args.format,chunks,digest,reasons)
    if visual:output['visualTableSlots']=visual
    output['reasonCodes']=sorted(reasons)
    print(json.dumps(output,sort_keys=True,separators=(',',':')))

if __name__=='__main__':main()
