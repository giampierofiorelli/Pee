#!/usr/bin/env python3
"""Builds quantity-knowledge.v2.json = v1 + the GK2 additions below (2026-10-18). v1 is never edited: it is the
knowledge identity of the published first runs. Every addition names its source; 'verification' says how it was
checked (official source read, secondary sources consistent, or physics/definition). Package provenance names the owner
research package section that prompted the entry (private packages; no text copied)."""
import json,sys,os
here=os.path.dirname(os.path.abspath(__file__));root=os.path.dirname(here)
d=json.load(open(os.path.join(root,'quantity-knowledge.v1.json')))
d['version']='qk.2.3'
d['statement']+=" v2 (2026-10-18) adds test methods with their fixed conditions, physical and definitional relations, ordinal class scales, and label-reading language; entries prompted by the owner's category research packages are verified against the sources they name before inclusion."
def src(i,title,url,use,licence,verification):d['sources'].append({'id':i,'title':title,'url':url,'use':use,'licence':licence,'verification':verification})
src('energystar_dehumidifier','US EPA ENERGY STAR: Dehumidifier testing and capacity','https://www.energystar.gov/products/dehumidifier_testing_and_capacity',
 'the DOE test procedure (10 CFR 430 subpart B appendix X1, standards effective June 2019) tests portable dehumidifiers at 65 °F instead of 80 °F; capacity is water removed per 24 h at test conditions in pints/day; Integrated Energy Factor replaces Energy Factor','US government work; facts only','official source read')
src('doe_2015_dehumidifier_tp','US DOE final rule, Energy Conservation Program: Test Procedures for Dehumidifiers (2015): appendix X kept, appendix X1 created with new dry-bulb conditions for portable and whole-home units; ANSI/AHAM DH-1-2008 single rating condition 80 °F / 60 % RH','https://www.energy.gov/eere/buildings/articles/issuance-2015-06-26-energy-conservation-program-test-procedures',
 'the 2008 AHAM rating condition (80 °F, 60 % RH) and the existence of two procedures','US government work; facts only','official source read (summary page)')
src('eu_rescale_2021','European Commission: the improved EU energy label (2021-02-16)','https://commission.europa.eu/news-and-media/news/focus-improved-eu-energy-label-paving-way-more-innovative-and-energy-efficient-products-2021-02-16_en',
 'from 1 March 2021 the A-G scale applies to fridges, dishwashers, washing machines and televisions (light sources from 1 September 2021); an old A+++ product may be B or E on the new scale: classes of the two scales are not comparable','EU institution content, reuse with acknowledgement (Decision 2011/833/EU); facts only','official source read')
src('eu_tumble_dryer_label','European Commission, Energy-efficient products: tumble dryers','https://energy-efficient-products.ec.europa.eu/product-list/tumble-dryers_en',
 'A+++ to D labels until 30 June 2025, A-G from 1 July 2025 (Delegated Regulation 2023/2534 repealing 392/2012); energy now per 100 ECO cycles; old and new values and classes are not directly comparable','EU institution content, reuse with acknowledgement; facts only','official source read')
src('iso_3741_3744','ISO 3741 (reverberation room, precision) and ISO 3744 (enveloping surface over a reflecting plane, engineering) — determination of sound power levels from sound pressure','https://www.iso.org/standard/52053.html',
 'a sound power level is determined from sound pressure measured over a defined surface or in a reverberation room; a single sound level meter reading is a sound pressure level','cited as a reference only; catalogue descriptions read','standard catalogue descriptions read (AFNOR, ANSI webstore)')
src('en_1822','EN 1822-1 high-efficiency air filters (EPA, HEPA, ULPA) classes; ISO 29463','https://www.freudenberg-filter.com/en/markets/industrial/standards-and-certifications/classification-of-air-filters/din-en-1822/',
 'classes E10-U17 by integral efficiency at the most penetrating particle size; H13 >= 99.95 %, H14 >= 99.995 %: a property of the filter medium/element, not of the whole air cleaner','cited as a reference; class values from consistent industry summaries','secondary sources consistent (standard text not read)')
src('iec_62885_7','IEC/ASTM 62885-7:2020+AMD1:2022 Surface cleaning appliances — dry cleaning robots: methods for measuring the performance','https://webstore.iec.ch/publication/76953',
 'robot performance is measured as debris removal on hard floors and carpets (straight-line tests), fibre removal and energy; no performance requirement is set','cited as a reference; scope read','standard catalogue scope read')
src('espresso_pressure_secondary','Espresso brewing pressure (about 9 bar at the coffee) versus advertised pump pressure (15-20 bar)','https://www.tastingtable.com/1890478/ideal-pressure-perfect-shot-espresso',
 'the advertised pump rating is not the pressure at the coffee bed; about 9 bar is the conventional brewing pressure','facts only','secondary sources consistent; INEI tolerance not verified')
src('physics','Physical definitions and laws (definitions of power, energy, flow; inverse-square spreading of sound in a free field; P = V²/R)',None,
 'relations that follow from definitions or elementary physics, stated with their assumptions','facts only','physics/definition')
src('energystar_air_cleaner','US EPA ENERGY STAR: How to choose a room air cleaner; EPA Guide to Air Cleaners in the Home (2nd ed., 2018)','https://energystar.gov/products/ask-the-experts/how-choose-room-air-cleaner',
 'recommended room size corresponds to at least 4.8 air changes per hour; CADR and ACH claims are substantiated only under ANSI/AHAM AC-1; sizing charts assume an 8-foot ceiling','US government work; facts only','official source read (summary)')
src('aham_room_size','AHAM: Tips for choosing the ideal portable room air cleaner (2024-12-04): the two-thirds rule','https://blog.aham.org/tips-for-choosing-the-ideal-portable-room-air-cleaner/',
 'choose a smoke CADR of at least two thirds of the room area in square feet (8-foot ceiling): room sizes follow from the smoke CADR','AHAM content; facts only','official source read (search summary of the AHAM blog)')
src('itu_bt2020','ITU-R BT.2020 and SMPTE/DCI-P3 reference colour gamuts','https://www.itu.int/rec/R-REC-BT.2020',
 'a gamut coverage percentage is relative to a named reference gamut in a named chromaticity diagram; values for different references or diagrams are different quantities','cited as a reference (definition)','definition')
K={k['id']:k for k in d['kinds']}
def kind(**k):d['kinds'].append(k)
kind(id='electric_current',dim={'I':1},terms=['current','amperage','amps','breaker'],qudt='quantitykind:ElectricCurrent',source='si')
kind(id='electrical_resistance',dim={'L':2,'M':1,'T':-3,'I':-2},terms=['impedance','resistance','ohms'],qudt='quantitykind:Resistance',source='si')
kind(id='volume_per_energy',dim={'L':1,'M':-1,'T':2},terms=['energy factor','litres per kwh','efficiency'],discriminators=['energy factor','integrated energy factor','l/kwh'],note='Water removed per unit of electrical energy (L/kWh): dehumidifier energy factor.',source='physics')
kind(id='colour_difference',dim={},unitOnly=True,terms=['delta e','delta-e','colour accuracy','color accuracy'],note='A colour difference (ΔE) is dimensionless and depends on the formula (CIE76, CIE94, CIEDE2000): values from different formulas are different quantities.',source='physics')
# units
U=d['units']
U.append({'id':'A','forms':['A'],'dim':{'I':1},'factor':1,'cs':True,'standalone':False,'source':'si'})
U.append({'id':'amp','forms':['amp','amps','ampere','amperes'],'dim':{'I':1},'factor':1,'source':'si'})
U.append({'id':'ohm','forms':['ohm','ohms','\u03a9','\u2126'],'dim':{'L':2,'M':1,'T':-3,'I':-2},'factor':1,'source':'si'})
U.append({'id':'deltaE','forms':['ΔE','ΔE00','ΔE2000'],'dim':{},'factor':1,'kindHint':'colour_difference','cs':True,'source':'physics'})
U.append({'id':'pint_uk','forms':['UK pint','UK pints','imperial pint','imperial pints'],'dim':{'L':3},'factor':0.00056826125,'note':'UK (imperial) pint','source':'nist_sp811'})
# conditions and methods
A=d['conditionAxes']
A.append({'id':'method','values':{},'source':'pee','note':'the test method or rating scheme a value was produced under; filled from the methods section'})
A.append({'id':'inlet_air_state','valueKind':'temperature','cues':['at','°c','°f','inlet','ambient'],'source':'energystar_dehumidifier','note':'dry-bulb temperature and relative humidity of the air a dehumidifier processes; capacity depends on both'})
A.append({'id':'reference_gamut','values':{'rec2020':['rec. 2020','rec.2020','rec 2020','bt.2020','bt2020'],'dci_p3':['dci-p3','dci p3','p3'],'srgb':['srgb','rec. 709','rec.709','bt.709']},'source':'itu_bt2020'})
A.append({'id':'signal_mode','freeText':['hz','4k','1080p','game mode','hdr','sdr'],'source':'pee','note':'input resolution, refresh rate and picture/game mode of a display latency or motion test'})
A.append({'id':'floor_type','values':{'hard_floor':['hard floor','hard floors','tile','wood floor','laminate'],'carpet':['carpet','rug','carpets']},'source':'iec_62885_7'})
A.append({'id':'drive_level','valueKind':'power','cues':['at','input','drive','1 w','2.83 v'],'source':'physics','note':'the electrical input at which a loudspeaker level is measured (1 W, or 2.83 V = 1 W into 8 Ω)'})
M=d['metrics']
M.append({'id':'dehumidifier_capacity','label':'moisture removal capacity','kind':'periodic_volume','terms':['extraction','extraction rate','daily extraction','moisture removal','water removal','dehumidification capacity','capacity per day','removal capacity'],'requires':['inlet_air_state','method'],'notEquivalentTo':['tank_capacity'],'note':'Water removed per day at stated air conditions; a warmer, wetter rating point gives a much larger figure, so capacities under different conditions are not comparable.','source':'energystar_dehumidifier'})
M.append({'id':'tank_capacity','label':'water tank capacity','kind':'volume','terms':['water tank capacity','tank capacity','water tank','tank size','bucket capacity'],'requires':[],'notEquivalentTo':['dehumidifier_capacity'],'note':'How much water the container holds before emptying; not how much the machine removes.','source':'pee'})
M.append({'id':'dehumidifier_energy_factor','label':'(integrated) energy factor','kind':'volume_per_energy','terms':['energy factor','integrated energy factor','ief'],'requires':['method'],'source':'energystar_dehumidifier'})
M.append({'id':'hepa_filter_class','label':'filter efficiency class (EN 1822 / ISO 29463)','kind':'ratio','terms':['filter efficiency','filtration efficiency','mpps efficiency','filter class'],'requires':[],'notEquivalentTo':['cadr'],'note':'The filter medium or element efficiency at the most penetrating particle size; it says nothing about the whole device airflow, bypass or the clean air delivered. "HEPA" names the filter (a class on en_1822_filter_class), not a percentage: a percentage near the word is not this efficiency unless efficiency is named (KN correction 2026-10-18).','source':'en_1822'})
M.append({'id':'robot_suction_pressure','label':'advertised suction (Pa)','kind':'pressure','terms':['suction','suction power','suction pressure'],'requires':[],'notEquivalentTo':['robot_debris_pickup'],'note':'A manufacturer figure; the standard robot performance tests measure debris removal, not suction pressure.','source':'iec_62885_7'})
M.append({'id':'robot_debris_pickup','label':'debris removal (IEC/ASTM 62885-7)','kind':'ratio','terms':['debris removal','dust pickup','pickup','pick-up','dust removal'],'requires':['floor_type'],'source':'iec_62885_7'})
M.append({'id':'pump_pressure','label':'pump pressure rating','kind':'pressure','terms':['pump pressure','pump','bar pump'],'requires':[],'notEquivalentTo':['brew_pressure'],'note':'The pump rating, not the pressure at the coffee bed.','source':'espresso_pressure_secondary'})
M.append({'id':'brew_pressure','label':'brewing pressure at the group','kind':'pressure','terms':['brew pressure','brewing pressure','extraction pressure'],'requires':[],'notEquivalentTo':['pump_pressure'],'source':'espresso_pressure_secondary'})
M.append({'id':'colour_gamut_coverage','label':'colour gamut coverage','kind':'ratio','terms':['gamut coverage','colour gamut','color gamut','gamut'],'requires':['reference_gamut'],'note':'A percentage of a named reference gamut; coverage of different references is a different quantity.','source':'itu_bt2020'})
M.append({'id':'display_colour_error','label':'colour error ΔE','kind':'colour_difference','terms':['delta e','delta-e','δe','colour accuracy','color accuracy','de2000'],'requires':[],'unitless':True,'source':'physics'})
M.append({'id':'input_lag','label':'input lag','kind':'duration','terms':['input lag','input latency','latency'],'requires':['signal_mode'],'source':'pee'})
M.append({'id':'speaker_sensitivity','label':'loudspeaker sensitivity','kind':'sound_pressure_level','terms':['sensitivity','spl/w','db/w/m','db @ 1w/1m'],'requires':['drive_level','measurement_distance'],'note':'Sound pressure at 1 m for 1 W or for 2.83 V input; 2.83 V delivers 1 W only into 8 Ω (2 W into 4 Ω), so the two ratings differ for low-impedance speakers.','source':'physics'})
M.append({'id':'speaker_impedance','label':'nominal impedance','kind':'electrical_resistance','terms':['impedance','nominal impedance'],'requires':[],'source':'si'})
for m in M:
  if m['id']=='peak_luminance':m['terms']+=['sdr brightness','hdr brightness','brightness']
# methods
d['methods']=[
 {'id':'doe_x1_portable_dehumidifier','label':'US DOE 10 CFR 430 appendix X1 (portable dehumidifiers, from June 2019)','terms':['doe','energy star','appendix x1'],'measures':['dehumidifier_capacity','dehumidifier_energy_factor'],'fixedConditions':{'inlet_air_state':'65 °F (18.3 °C), 60 % RH'},'source':'energystar_dehumidifier'},
 {'id':'aham_dh1_2008','label':'ANSI/AHAM DH-1-2008 rating condition (DOE appendix X, before June 2019)','terms':['aham','dh-1'],'measures':['dehumidifier_capacity'],'fixedConditions':{'inlet_air_state':'80 °F (26.7 °C), 60 % RH'},'supersededBy':'doe_x1_portable_dehumidifier','source':'doe_2015_dehumidifier_tp'},
 {'id':'eu_dishwasher_label_2019','label':'EU energy label for household dishwashers (Delegated Regulation 2019/2017, from 1 March 2021)','terms':['energy label','eu label','eco 40-60','eco programme'],'measures':['eu_label_noise_emission'],'fixedConditions':{'programme':'eco'},'source':'eu_2019_2017'},
 {'id':'eu_tumble_dryer_label_2025','label':'EU energy label for tumble dryers (Delegated Regulation 2023/2534, from 1 July 2025)','terms':['energy label','eco programme','per 100 cycles'],'measures':['eu_label_noise_emission'],'fixedConditions':{'programme':'eco'},'source':'eu_tumble_dryer_label'},
 {'id':'aham_ac1','label':'ANSI/AHAM AC-1 (portable room air cleaners)','terms':['aham','ac-1','aham verifide','energy star'],'measures':['cadr'],'fixedConditions':{},'source':'aham_ac1'},
 {'id':'iso_3741_3744_sound_power','label':'ISO 3741 / ISO 3744 sound power determination','terms':['iso 3741','iso 3744','sound power','iec 60704'],'measures':['eu_label_noise_emission'],'fixedConditions':{},'note':'Sound power is computed from sound pressure measured over an enveloping surface or in a reverberation room.','source':'iso_3741_3744'},
 {'id':'iec_62885_7_robots','label':'IEC/ASTM 62885-7 robot performance','terms':['iec 62885-7','62885-7'],'measures':['robot_debris_pickup'],'fixedConditions':{},'source':'iec_62885_7'}]
for k in d['kinds']:
  # KN correction (owner review 2026-10-18): published qk.2 also set notDirectlyMeasured, and the reader concluded that any
  # publisher's own reading was sound pressure. Unjustified: a laboratory or a label (EU 2019/2017, dB(A) re 1 pW) reports a
  # determined sound power as its own result. Only the source's words (a meter at a distance; LWA, re 1 pW) decide the kind.
  if k['id']=='sound_power_level':k['note']+=' It is determined from sound pressure measured over an enveloping surface or in a reverberation room (ISO 3741/3744) and is reported as a result by laboratories and on EU labels (dB(A) re 1 pW); that a source measured a value does not say whether it reports pressure or power.';k['determinedBy']='iso_3741_3744_sound_power'
# kind evidence (KN K9, owner review 2026-10-18): which words justify a kind, of what type, and whether a statement made
# once in a document (its test protocol or the scheme it declares under) covers values of a given evidence class.
src('iec_61672','IEC 61672-1:2013 Electroacoustics - Sound level meters - Part 1: Specifications','https://www.sis.se/en/produkter/metrology-and-measurement-physical-phenomena/acoustics-and-acoustic-measurements/electroacoustics/iec6167212013',
 'a sound level meter reports time- and frequency-weighted sound (pressure) levels at the measuring point; its readings are sound pressure levels, never sound power','cited as a reference; scope read','standard catalogue scope read (SIS, EN listing); owner review cited IEC 61672-1 and ISVR')
src('eu_2019_2017_noise','Commission Delegated Regulation (EU) 2019/2017, household dishwasher energy label: airborne acoustical noise emission in dB(A) re 1 pW','https://eur-lex.europa.eu/eli/reg_del/2019/2017/oj',
 'the label noise value is a sound power level re 1 pW','EU law; facts only','cited by the owner review; consistent with the eu_2019_2017 source already in the pack')
d['kindEvidence']=[
 {'kind':'sound_pressure_level','justification':'explicit','terms':['sound pressure','sound pressure level','spl'],'source':'iso_80000_8'},
 {'kind':'sound_pressure_level','justification':'documented_method','terms':['sound level meter','sound level metre','sound meter','decibel meter','db meter','noise meter','noise measurement tool','noise measuring device','noise measurement device'],'covers':['publisher_measured','unknown'],'source':'iec_61672','note':'an instrument reading is a sound pressure level at the measuring point; the distance stays a comparability condition'},
 {'kind':'sound_pressure_level','justification':'contextual','terms':['measured from','away','at a distance'],'source':'iso_80000_8'},
 {'kind':'sound_power_level','justification':'explicit','terms':['sound power','sound power level','lwa','re 1 pw'],'source':'iso_80000_8'},
 {'kind':'sound_power_level','justification':'standard','terms':['energy label','noise class','acoustical noise emission','airborne acoustical noise','acoustic airborne noise','airborne noise'],'covers':['manufacturer_declared','nominal_certified'],'source':'eu_2019_2017_noise','note':'EU label noise emission is sound power re 1 pW'}]
# relations
d['relations']=[
 {'id':'room_area_from_cadr','nature':'sizing_convention','caveat':'A consistency check between declared figures under the AHAM/ENERGY STAR sizing assumptions (smoke CADR, stated air changes, 8 ft ceiling, well-mixed room); it is not a measurement of how the purifier performs in a real room.','statement':'The floor area a clean air delivery rate serves at a given number of air changes per hour and ceiling height: area = CADR × 60 / (ACH × height).','output':{'metric':'room_coverage','unit':'ft^2'},'inputs':[{'name':'cadr','metric':'cadr','unit':'cfm','prefer':{'challenge_pollutant':'smoke'},'note':'AHAM sizes rooms by the smoke CADR'},{'name':'ach','axis':'air_changes_per_hour','unit':'ach'},{'name':'height','assumption':True,'default':8,'unit':'ft','note':'ENERGY STAR / EPA sizing assumes an 8-foot ceiling'}],'expression':'cadr*60/(ach*height)','tolerance':0.03,'source':'aham_room_size'},
 {'id':'energy_from_power_time','nature':'definition','caveat':'Exact for a constant power; a varying power needs the average over the time.','statement':'Energy is power multiplied by time.','output':{'kind':'energy','unit':'kWh'},'inputs':[{'name':'power','kind':'power','unit':'kW'},{'name':'hours','kind':'duration','unit':'h'}],'expression':'power*hours','tolerance':0.02,'source':'physics'},
 {'id':'per_cycle_from_per_100','nature':'definition','caveat':'Holds only for the same programme and conditions.','statement':'A value per 100 cycles divided by 100 is the value per cycle under the same programme and conditions.','output':{'kind':'energy_per_event','unit':'kWh/cycle'},'inputs':[{'name':'per100','kind':'energy_per_event','unit':'kWh/100 cycles'}],'expression':'per100','tolerance':0.001,'source':'physics'},
 {'id':'spl_distance_free_field','nature':'physical_law_idealised','caveat':'Free field and point source; indoors reflections make the fall-off smaller.','statement':'In a free field a point source loses 20·log10(d2/d1) dB of sound pressure level between distances d1 and d2 (about 6 dB per doubling); rooms add reflected sound, so this holds only approximately indoors.','output':{'kind':'sound_pressure_level','unit':'dB'},'inputs':[{'name':'L1','kind':'sound_pressure_level','unit':'dB'},{'name':'d1','kind':'length','unit':'m'},{'name':'d2','kind':'length','unit':'m'}],'expression':'L1-20*log10(d2/d1)','tolerance':0.5,'use':['explain'],'source':'physics'},
 {'id':'power_from_voltage_impedance','nature':'physical_law_idealised','caveat':'Resistive load; a loudspeaker impedance is nominal and varies with frequency.','statement':'Electrical power into a resistive load is V²/R: 2.83 V gives 1 W into 8 Ω and 2 W into 4 Ω.','output':{'kind':'power','unit':'W'},'inputs':[{'name':'v','kind':'voltage','unit':'V'},{'name':'r','kind':'electrical_resistance','unit':'ohm'}],'expression':'v*v/r','tolerance':0.02,'use':['explain'],'source':'physics'}]
# ordinal scales
d['scales']=[
 {'id':'eu_energy_class_2021','label':'EU energy class, rescaled A-G','values':['A','B','C','D','E','F','G'],'best':'A','terms':['energy class','energy rating','energy label','energy efficiency class','rated efficiency','efficiency class'],'regimes':[{'productGroups':['dishwashers','washing_machines','refrigerators','televisions'],'from':'2021-03-01'},{'productGroups':['light_sources'],'from':'2021-09-01'},{'productGroups':['tumble_dryers'],'from':'2025-07-01'}],'notComparableWith':['eu_energy_class_pre2021'],'source':'eu_rescale_2021'},
 {'id':'eu_energy_class_pre2021','label':'EU energy class, pre-rescaling (A+++ to D, or to G)','values':['A+++','A++','A+','A','B','C','D','E','F','G'],'best':'A+++','terms':['energy class','energy rating','energy label','energy efficiency class','rated efficiency','efficiency class'],'distinctive':['A+++','A++','A+'],'regimes':[{'productGroups':['dishwashers','washing_machines','refrigerators','televisions'],'until':'2021-02-28'},{'productGroups':['tumble_dryers'],'until':'2025-06-30'}],'notComparableWith':['eu_energy_class_2021'],'source':'eu_rescale_2021'},
 {'id':'eu_noise_class_dishwasher','label':'EU acoustic noise class (dishwashers)','values':['A','B','C','D'],'best':'A','terms':['noise class','acoustic class','noise emission class'],'thresholds':{'A':'< 39 dB(A)','B':'39 to < 45','C':'45 to < 51','D':'>= 51'},'metric':'eu_label_noise_emission','source':'eu_2019_2017'},
 {'id':'en_1822_filter_class','label':'EN 1822 filter class','values':['U17','U16','U15','H14','H13','E12','E11','E10'],'best':'U17','terms':['hepa','filter class','true hepa'],'distinctive':['H13','H14','U15','U16','U17','E10','E11','E12'],'metric':'hepa_filter_class','source':'en_1822'}]
en=d['language']['en']
en['labelUnitPrepositions']=['in','measured in','expressed in']
en['basisWords']={'daily':'day','per day':'day','a day':'day','annual':'year','annually':'year','yearly':'year','per year':'year','per annum':'year','a year':'year','monthly':'month','per month':'month','hourly':'h','per hour':'h','per cycle':'cycle','per wash':'cycle','per use':'cycle'}
en['axisLetters']=['W','H','D','L','Ø']
en['axisNote']='a single capital W, H, D or L between numbers joined by x or × names a dimension axis (width, height, depth, length), not a unit'
for u in d['units']:
  if u['id']=='W':u['note']='also the width axis letter in "20 W x 30 H": see language.axisLetters'

# ---------------------------------------------------------------------------------------------------------------------
# qk.2.3 (WD, 2026-10-18): whole-document reading.
# 1. Relative humidity is a quantity of dimension one (ISO 80000-5 lists it); a bare "%" stays a ratio and only words
#    ("relative humidity", "RH") refine it, so no percentage loses the kind it has today (specialisation, not a new
#    ambiguity). It is the second component of a dehumidifier's inlet air state (KV finding: rating-point grids).
src('iso_80000_5','ISO 80000-5:2019 Quantities and units - Part 5: Thermodynamics (relative humidity, dimension one)','https://www.iso.org/standard/64626.html',
 'relative humidity is a quantity of dimension one, the ratio of the partial pressure of water vapour to its saturation pressure at the same temperature','cited as a reference; catalogue scope read','standard catalogue description; definition consistent with secondary sources')
kind(id='relative_humidity',dim={},unitOnly=True,specialises='ratio',terms=['relative humidity','humidity','rh'],note='Relative humidity (%RH) is a ratio of dimension one; a percentage is relative humidity only when the words say so.',qudt='quantitykind:RelativeHumidity',source='iso_80000_5')
U.append({'id':'pct_rh','forms':['%RH','% RH','%rh','% rh','% r.h.','%r.h.'],'dim':{},'factor':0.01,'kindHint':'relative_humidity','source':'iso_80000_5'})
for a in A:
  if a['id']=='inlet_air_state':
    a['valueKinds']=['temperature','relative_humidity']
    a['note']+='; the two are read together as one condition (a rating point)'
# 2. Qualitative evidence: the aspects a reviewer judges and the words that carry a judgement. This is PEE's working
#    vocabulary for reading (source 'pee'), never a scientific claim and never a product fact: an observation records who
#    said what about which product under which conditions; whether it holds is a separate question.
d['aspects']=[
 {'id':'noise','terms':['noise','noisy','loud','quiet','quieter','loudness','hum','whine','whining','drone','din','racket','buzzing','humming','rattling','grinding'],'positive':['quiet','quieter','whisper-quiet','near-silent','silent'],'negative':['noisy','loud','louder','whine','whining','whines','drone','droning','din','racket','buzzing','humming','rattling','grinding'],'kinds':['sound_pressure_level','sound_power_level'],'source':'pee'},
 {'id':'vibration','terms':['vibration','vibrations','vibrate','vibrates','vibrating','wobble','wobbles','rattle','rattles','shake','shakes'],'negative':['rattle','rattles','wobble','wobbles'],'source':'pee'},
 {'id':'cleaning_pickup','terms':['suction','pickup','pick-up','picked up','picks up','debris','crumbs','pet hair','carpet cleaning','mopping','mop','mops','dirt','dust pickup'],'source':'pee'},
 {'id':'navigation','terms':['navigation','navigates','obstacle avoidance','avoids obstacles','mapping','got stuck','gets stuck','stuck','lidar'],'negative':['got stuck','gets stuck','stuck'],'source':'pee'},
 {'id':'battery_runtime','terms':['battery life','runtime','run time','battery lasts','on a single charge'],'kinds':['duration'],'source':'pee'},
 {'id':'ease_of_use','terms':['easy to use','app','controls','set up','setup','intuitive','user-friendly','fiddly','interface'],'positive':['intuitive','user-friendly'],'negative':['fiddly'],'source':'pee'},
 {'id':'maintenance','terms':['easy to clean','to clean','cleaning the','dishwasher-safe','dishwasher safe','empty the tank','emptying','maintenance','self-emptying'],'source':'pee'},
 {'id':'build_quality','terms':['build quality','sturdy','flimsy','well made','well-made','plasticky','solidly built','feels cheap'],'positive':['sturdy','well made','well-made','solidly built'],'negative':['flimsy','plasticky','feels cheap'],'source':'pee'},
 {'id':'cooking_result','terms':['crisp','crispy','crispier','browned','browning','evenly cooked','soggy','burnt','undercooked','overcooked','juicy','golden'],'positive':['crisp','crispy','crispier','evenly cooked','juicy','golden'],'negative':['soggy','burnt','undercooked','overcooked'],'source':'pee'},
 {'id':'drying_dehumidifying','terms':['dried','drying','damp','condensation','moisture','dehumidifying','laundry'],'source':'pee'},
 {'id':'cleaning_result','terms':['spotless','residue','streaks','sparkling','clean dishes','cleaning performance','air cleaning','stains'],'positive':['spotless','sparkling'],'negative':['residue','streaks'],'source':'pee'},
 {'id':'picture_quality','terms':['picture','brightness','contrast','colours','colors','blooming','reflections','black levels','hdr'],'negative':['blooming'],'source':'pee'},
 {'id':'sound_quality','terms':['bass','treble','dialogue','soundstage','sound quality','audio quality','mids'],'source':'pee'},
 {'id':'running_cost','terms':['running cost','running costs','energy use','energy-efficient','cheap to run','expensive to run','energy consumption'],'positive':['cheap to run','energy-efficient'],'negative':['expensive to run'],'kinds':['energy','power','periodic_energy_consumption','energy_per_event'],'source':'pee'},
 {'id':'size_footprint','terms':['compact','bulky','footprint','takes up','space-saving'],'positive':['compact','space-saving'],'negative':['bulky'],'source':'pee'},
 {'id':'value_for_money','terms':['value for money','worth the price','worth the money','overpriced','pricey','bargain'],'positive':['bargain','worth the price','worth the money'],'negative':['overpriced','pricey'],'source':'pee'}]
en['evaluation']={'positive':['good','great','excellent','impressive','impressively','effective','effectively','well','strong','reliable','reliably','easy','quick','quickly','fast','superb','outstanding','solid','decent','perfect','perfectly','smooth','consistent','consistently','thorough','thoroughly','handy','convenient','efficient','brilliant','fantastic','admirably','top-notch','best'],
 'negative':['poor','poorly','bad','weak','disappointing','disappointed','annoying','annoyingly','irritating','struggled','struggles','struggle','failed','fails','missed','misses','problem','problems','issue','issues','awkward','slow','uneven','unevenly','inconsistent','frustrating','tangled','mediocre','lacklustre','lackluster','worse','worst','noticeable','distracting','unpleasant'],
 'negators':['not','never','no','hardly','barely',"isn't","wasn't","doesn't","didn't","don't","aren't","weren't","won't","can't","couldn't"],
 'hedges':['seems','seemed','appears','appeared','might','may','perhaps','somewhat','a little','slightly','fairly','reasonably'],
 'reportedBy':['users report','owners report','customers say','reviewers say','according to users','some users','many users','customer reviews'],
 'note':'polarity words; a negator within three words before flips the polarity; both polarities in one statement give mixed'}
# 3. Word forms seen in prose on the development pages (verbs where tables use nouns), and which axes are operating
#    conditions a judgement can be made under (a speed, a programme, a floor), as opposed to test materials or references.
for m in M:
  if m['id']=='dehumidifier_capacity':m['terms']+=['extracts','extract','extracting','extracted']
for m in d['metrics']:
  if m['id']=='room_coverage':m['terms']+=['rooms up to']
for a in A:
  if a['id'] in ('fan_setting','programme','floor_type','signal_mode'):a['operatingCondition']=True
# 4. A metric's conventional reporting basis: a moisture removal capacity is water removed per 24 hours (ENERGY STAR,
#    DOE appendix X1: pints/day); "Extraction rate: 20L" states that convention without printing it.
for m in M:
  if m['id']=='dehumidifier_capacity':m['conventionalBasis']={'per':'day','source':'energystar_dehumidifier','note':'capacity is reported per 24 h under the test procedures'}
# 5. QE (2026-10-18, development verdict check): "standby" is an operating state of its own (device on, not running); a
#    standby wattage and a speed-1 wattage are two tests.
for a in A:
  if a['id']=='fan_setting':a['values']['standby']=['standby','standby mode','stand-by']
#    A named setting is its own value: "speed 1", "sleep mode" and "lowest speed" were one value ("lowest"), so a speed-1
#    and a sleep-mode reading counted as one test. That speed 1 is the lowest speed is an inference about the product,
#    not the page's statement; "speed 1" is now read as its own setting (free text), sleep as its own value.
  if a['id']=='fan_setting':
    a['values']['lowest']=['lowest speed','low speed','minimum speed']
    a['values']['sleep']=['sleep mode','sleep','night mode']
# ---------------------------------------------------------------------------------------------------------------------
for a in d['aspects']:
  if a['id']=='vibration':a['terms']=[t for t in a['terms'] if t not in ('shake','shakes')]
# 6. QE (2026-10-18): structured qualitative evidence. PEE's reading vocabulary (source 'pee'), never product facts.
#    - aspects for the remaining property families of the reference schema (the schema's list, fixed before annotation);
#    - aspect kinds: the quantity kinds that measure the property (a statement and a number on the same property);
#    - phenomena: observable descriptors, each on an aspect and a facet. A facet is a property of the observation that
#      recurs across categories (spatial uniformity, consistency across runs, tonal character, a transient event, a
#      failure event, residue). Facets are the reified second-order principle under test: "when a goal requires a
#      uniform result, observations of spatial or run-to-run variation are relevant", whatever the category.
for a in d['aspects']:
  if a['id']=='speed_or_time':pass
K2={'cooking_result':['temperature','duration'],'drying_dehumidifying':['periodic_volume','ratio','relative_humidity'],'picture_quality':['luminance','ratio'],
    'size_footprint':['length','volume','mass','area'],'cleaning_pickup':['ratio'],'ease_of_use':[]}
for a in d['aspects']:
  if a['id'] in K2 and K2[a['id']]:a['kinds']=sorted(set(a.get('kinds',[]))|set(K2[a['id']]))
d['aspects']+=[
 {'id':'heat_or_temperature','terms':['heat','heats up','temperature','hot','cool','warm','overheat','preheat','preheating','heat distribution'],'positive':['heats up quickly','stays cool'],'negative':['overheats','gets hot','too hot'],'kinds':['temperature'],'source':'pee'},
 {'id':'speed_or_time','terms':['cooks quickly','heats up quickly','dries quickly','cleans quickly','quick to heat','quick to cook','fast cooking','faster cooking','slower cooking','cooking time','cooking times','cycle time','cycle times','drying time','took ages','in no time','speedy'],'positive':['cooks quickly','heats up quickly','dries quickly','quick to heat','quick to cook','fast cooking','faster cooking','in no time','speedy'],'negative':['took ages','slower cooking'],'kinds':['duration'],'source':'pee'},
 {'id':'capacity','terms':['capacity','space','room for','fits','fit','large enough','big enough','basket size','load','loads','portion','portions','family-sized','spacious','cramped'],'positive':['spacious','roomy','generous'],'negative':['cramped','too small'],'kinds':['volume','mass'],'source':'pee'},
 {'id':'smell','terms':['smell','smells','odour','odor','odours','odors','fumes','plastic smell','burning smell'],'negative':['plastic smell','burning smell','fumes'],'source':'pee'},
 {'id':'safety','terms':['safe','safety','burn','burns','scald','child lock','cool-touch','fire','hazard'],'negative':['hazard','burn','burns','scald'],'source':'pee'},
 {'id':'connectivity_app','terms':['app','wi-fi','wifi','smart','alexa','google assistant','bluetooth','connectivity','smartphone','remote control'],'source':'pee'},
 {'id':'design_aesthetics','terms':['design','looks','stylish','sleek','attractive','ugly','finish','aesthetic','premium feel','chunky'],'positive':['stylish','sleek','attractive'],'negative':['ugly','chunky'],'source':'pee'},
 {'id':'reliability','terms':['reliable','reliability','broke','broken','faulty','fault','error','errors','stopped working','durable','durability','longevity'],'positive':['reliable','durable'],'negative':['broke','broken','faulty','stopped working'],'source':'pee'}]
d['phenomena']=[
 {'id':'uneven_result','terms':['uneven','unevenly','patchy','pale patches','hot spots','hotspots','cold spots','inconsistent results','streaky','missed spots','missed areas','not evenly'],'facet':'spatial_uniformity','polarity':'negative','source':'pee'},
 {'id':'even_result','terms':['evenly','even results','uniform','uniformly','consistent colour','all over','edge to edge','every corner'],'facet':'spatial_uniformity','polarity':'positive','source':'pee'},
 {'id':'run_to_run_variation','terms':['inconsistent','varied between','from batch to batch','each time','every time','repeatable','consistently'],'facet':'consistency_across_runs','source':'pee'},
 {'id':'tonal_noise','terms':['whine','whining','whistle','whistling','hum','humming','buzz','buzzing','drone','droning','high-pitched','rattle','rattling','clatter','clicking'],'facet':'tonal_character','polarity':'negative','source':'pee'},
 {'id':'transient_sound','terms':['beep','beeps','beeping','chime','alarm','loud bang','bursts','sudden noise','clunk'],'facet':'transient_event','polarity':'negative','source':'pee'},
 {'id':'residue_left','terms':['residue','left behind','leftover','left over','traces','film','crumbs left','hair left','still dirty','not fully clean','grease remained','stains remained','damp patches'],'facet':'residue','polarity':'negative','source':'pee'},
 {'id':'failure_event','terms':['got stuck','gets stuck','stopped','error message','failed','failure','jammed','tangled','tripped','shut off','crashed'],'facet':'failure_event','polarity':'negative','source':'pee'},
 {'id':'crisp_texture','terms':['crisp','crispy','crispier','crunchy','crunch','soggy','limp','chewy'],'facet':'surface_texture','source':'pee'},
 {'id':'browning','terms':['browned','browning','golden','golden brown','charred','burnt','pale'],'facet':'surface_colour','source':'pee'},
 {'id':'moisture_retained','terms':['juicy','moist','succulent','tender','dried out','dry','rubbery','overcooked','undercooked','raw in the middle'],'facet':'internal_state','source':'pee'},
 {'id':'blooming_halo','terms':['blooming','halo','haloing','halos','light bleed'],'facet':'spatial_uniformity','polarity':'negative','source':'pee'},
 {'id':'motion_artefact','terms':['judder','stutter','motion blur','smearing','soap opera effect','artefacts','artifacts'],'facet':'temporal_artefact','polarity':'negative','source':'pee'},
 {'id':'vibration_felt','terms':['vibrates','vibration','wobbles','walks across'],'facet':'mechanical_disturbance','polarity':'negative','source':'pee'}]
d['useContexts']=[
 {'id':'night_bedroom','terms':['at night','overnight','in the bedroom','bedroom','while sleeping','light sleeper','night-time','nighttime']},
 {'id':'small_space','terms':['small kitchen','small flat','small apartment','limited counter space','compact kitchen','studio']},
 {'id':'family_household','terms':['family','families','household of four','for four people','larger households','kids','children']},
 {'id':'single_or_couple','terms':['singles','couples','one or two people','for two','solo']},
 {'id':'pets','terms':['pet owners','with pets','dog hair','cat hair','pet hair']},
 {'id':'daytime_living_room','terms':['during the day','living room','daytime']},
 {'id':'dark_room_viewing','terms':['dark room','darkened room','at night with the lights off','movie night']},
 {'id':'bright_room_viewing','terms':['bright room','sunlit room','daylight','bright living room']},
 {'id':'gaming','terms':['gaming','gamers','console','ps5','xbox']},
 {'id':'everyday_use','terms':['everyday use','daily use','day-to-day','weeknight','busy weekdays']}]
en['qualitative']={
 'observationVerbs':['noticed','found','saw','heard','felt','smelled','left','came out','turned out','ended up','emerged','remained','measured','recorded','showed','produced','picked up','cleared','missed'],
 'testCues':['in our test','in our tests','during testing','during our test','in testing','we tested','i tested','we cooked','i cooked','we ran','i ran','test batch','our testing','when we','when i','in my tests','in my testing'],
 'experienceCues':['after a week','after a month','over the past','i have been using','i\'ve been using','day-to-day','everyday use','daily use','living with','long-term','over several weeks'],
 'inferenceCues':['should suit','would suit','ideal for','perfect for','great for','means it','which means','so it','so you','making it','suggests','would be','should be','will suit'],
 'claimCues':['claims','claimed','promises','says it','according to','is said to','advertised','marketed','the brand says','the manufacturer'],
 'causeMarkers':['because','due to','thanks to','as a result of','caused by','owing to','which is why'],
 'comparativeCues':['than','compared to','compared with','versus','vs','unlike','next to','against'],
 'testMaterials':['chips','fries','chicken','wings','drumsticks','salmon','fish','steak','sausages','bacon','toast','bread','cake','muffins','vegetables','broccoli','potatoes','roast','frozen','towels','cottons','bedding','jeans','synthetics','wool','pots','pans','glasses','cutlery','plates','grease','egg','dog hair','cat hair','pet hair','cereal','rice','flour','sand'],
 'environmentCues':['dark room','bright room','in daylight','ambient temperature','cold room','warm room','small room','large room','with the lights off','hdr','sdr'],
 'note':'reading vocabulary for the structured qualitative model; a statement can be an observation (what was perceived), a judgement (an evaluation), or both'}
PA={'tonal_noise':'noise','transient_sound':'noise','vibration_felt':'vibration','crisp_texture':'cooking_result','browning':'cooking_result','moisture_retained':'cooking_result','blooming_halo':'picture_quality','motion_artefact':'picture_quality'}
for ph in d['phenomena']:
  if ph['id'] in PA:ph['aspect']=PA[ph['id']]
# facets with the words a buyer uses for them ("evenly cooked", "consistent results", "no whine"): the request side
# reads a need's facet and finds observations of that facet in any category
d['facets']=[
 {'id':'spatial_uniformity','needTerms':['evenly','even cooking','even results','uniform','every corner','whole floor','edge to edge','no hot spots','all over'],'statement':'when a goal requires a uniform result, observations of spatial variation are relevant','status':'hypothesis','source':'pee'},
 {'id':'consistency_across_runs','needTerms':['consistent','consistently','reliable results','every time','repeatable'],'statement':'when a goal requires the same result each time, observations of run-to-run variation are relevant','status':'hypothesis','source':'pee'},
 {'id':'tonal_character','needTerms':['no whine','no hum','not whiny','pleasant sound','unobtrusive noise'],'statement':'an annoyance from tonal noise is not captured by a level alone','status':'hypothesis','source':'pee'},
 {'id':'transient_event','needTerms':['no beeps','silent beeps','no sudden noise'],'statement':'transient sounds matter for night use beyond the steady level','status':'hypothesis','source':'pee'},
 {'id':'residue','needTerms':['spotless','no residue','completely clean','picks up everything'],'statement':'what is left behind is the observable of a cleaning goal','status':'hypothesis','source':'pee'},
 {'id':'failure_event','needTerms':['no fuss','hassle-free','does not get stuck','reliable'],'statement':'failure events are relevant to unattended operation','status':'hypothesis','source':'pee'}]
en['evaluation']['hedges']+=['probably','likely','possibly','presumably','we suspect','i suspect']
for a in d['aspects']:
  if a['id']=='cleaning_result':a['terms']+=['cleaning result','cleaning results','cleaned well','left clean']
d['aspects'].append({'id':'other','terms':[],'source':'pee'})
en['qualitative']['experienceCues']+=['in my kitchen','at home','i use it','weeks of use','months of use','every day','each morning','in daily use']
out=os.path.join(root,'quantity-knowledge.v2.json');json.dump(d,open(out,'w'),ensure_ascii=False,indent=1);open(out,'a').write('\n');print('wrote',out)
