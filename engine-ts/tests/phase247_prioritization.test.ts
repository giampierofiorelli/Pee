import test from 'node:test';import assert from 'node:assert/strict';
import {planBudgetedCategoryWave243,type CandidateResearch243,type WaveContext243} from '../src/phase243_budgeted_category_search.js';
const cand=(id:string,fam:string,strong=false):CandidateResearch243=>({product:{id,categoryId:'c',market:'uk',familyId:fam,stage:'discovery_stub',editorialAppearances:[],
 officialProductIdentityConfirmed:false,marketListingConfirmed:false,novelVerifiedTechnicalFeature:false,explicitNeedTriggered:false,validatedNicheFit:false,verifiedDiscontinued:false},
 researchState:strong?'cheap_screened':'unseen',signals:strong?[{kind:'reviewed_original_test_strength',originalSourceId:'lab_'+id,publisherId:'lab',sourceRevisionHash:'1'.repeat(64),
 reviewedOriginalMethod:true,reviewedForExactVariantAndMarket:true,productId:id,market:'uk'}]:[],suspendedUnderScope:null,reviewedHighPotential:false});
const ctx=(fams:string[]):WaveContext243=>({categoryId:'c',market:'uk',scopeKey:'c_uk',asOf:'2026-10-14T13:00:00Z',waveOrdinal:1,explicitUserNeedProductIds:[],
 changedSourceRevisionProductIds:[],recoveryMode:'normal',population:{categoryId:'c',market:'uk',enrichmentBudget:0,independentDiscoveryPasses:1,
 discoveredNewPlausibleInRecentPasses:10,reviewedFamilyIds:fams,demandMode:'general_launch_seed'},
 policy:{version:'t',mode:'lean_bootstrap',effortBudget:6,unitCost:{identity:1,cheap_screen:1,deep_review:4,revisit:2},minimumCredibleCandidateCount:2,
 reservedTailActionPercent:20,auditSuspendedMaxPerWave:1,auditEveryNWaves:5}});
test('equal-priority leads alternate between families: one prolific producer cannot fill a wave by tie-break',()=>{
 const cs=[...Array.from({length:12},(_,i)=>cand('a'+String(i).padStart(2,'0'),'big')),cand('z99','small')];
 const w=planBudgetedCategoryWave243(ctx(['big','small']),cs);
 assert.equal(w.totalActions,6);assert.ok(w.choices.some(c=>c.productId==='z99'));
 assert.equal(w.rankingAuthorized,false);assert.equal(w.marketCoverageCertified,false);
});
test('a lead carrying a reviewed original-test strength is resolved first even before its identity is verified',()=>{
 const cs=[...Array.from({length:10},(_,i)=>cand('a'+i,'f'+(i%3))),cand('s1','f2',true)];
 const w=planBudgetedCategoryWave243(ctx(['f0','f1','f2']),cs);
 assert.equal(w.choices[0].productId,'s1');
 assert.ok(w.productDecisions.find(d=>d.productId==='s1')!.reasons.includes('reviewed_original_test_positive_lead'));
});
