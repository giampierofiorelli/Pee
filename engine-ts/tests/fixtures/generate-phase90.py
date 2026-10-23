"""Controlled fiction only. No real manufacturer authorizations are implied."""
import json
from pathlib import Path
from phase87.html_recipes import proposal_inventory,qualify_proposal,approve_recipe
H='specs.testing.org';P='/products/'
f=[{'key':'battery_hours','unit':'h','review_id':'fixture_review'}]
def html(model,value):return (f'<html><body><h1>{model}</h1><table><tr><th>Battery life</th><td>{value}</td></tr></table></body></html>')
s=[{'url':f'https://{H}/products/x1','model':'Maker X1','html':html('Maker X1','20 hours'),
    'labelled_by':'independent_assessor_a','expected':{'battery_hours':{'value':20,'unit':'h'}}},
   {'url':f'https://{H}/products/x2','model':'Maker X2','html':html('Maker X2','14 hours'),
    'labelled_by':'independent_assessor_b','expected':{'battery_hours':{'value':14,'unit':'h'}}}]
c=proposal_inventory(s,H,P,f)['candidates'];assert len(c)==1
q=qualify_proposal(s,H,P,'headphones',f,[{'fieldKey':'battery_hours','candidateId':c[0]['id']}]);r=approve_recipe(q,'human_operator_fixture','fixture-approved-20261010')
record={'kind':'reviewed_html_v1','recipe':r,'context':{'battery_hours':{'declared_by':'manufacturer'}},
'registryReviewReference':'fixture_review','registrySchemaVersion':1}
p=Path(__file__).parent/'phase90-approved-html-record.json';p.write_text(json.dumps(record,indent=2))
