import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,restoreState,selectOutcome,setMode,placeBet,settleMarket,addBonus,totalOdds,potentialReturn,score,MARKETS} from '../dist/model.js';

const single=(m='danya',o='yes',stake=100)=>placeBet({...selectOutcome(initialState(),m,o),stake});
const combo=(pairs,stake=100)=>placeBet({...pairs.reduce((s,[m,o])=>selectOutcome(s,m,o),setMode(initialState(),'combo')),stake});

test('одинар: списание, выигрыш с возвратом внесённых токенов и неизменность исходного состояния',()=>{
  const original=initialState();
  const pending=placeBet(selectOutcome(original,'danya','yes'));
  assert.equal(original.balance,1000);assert.equal(pending.balance,900);assert.equal(pending.slip.length,0);
  const settled=settleMarket(pending,'danya','yes');
  assert.equal(settled.balance,1085);assert.equal(settled.bets[0].payout,185);assert.equal(settled.bets[0].status,'won');assert.equal(score(settled),85);
});
test('проигрыш не создаёт возврат',()=>{
  const s=settleMarket(single(),'danya','no');
  assert.equal(s.balance,900);assert.equal(s.bets[0].payout,0);assert.equal(s.bets[0].status,'lost');assert.equal(score(s),-100);
});
test('событие нельзя рассчитать или начислить дважды',()=>{
  const settled=settleMarket(single(),'danya','yes');
  assert.throws(()=>settleMarket(settled,'danya','yes'),/уже зафиксирован/);
  assert.equal(settleMarket(settled,'deadline','yes').balance,1085);
});
test('экспресс ждёт все исходы и использует показанный округлённый коэффициент',()=>{
  let s=combo([['danya','yes'],['deadline','yes']]);
  assert.equal(s.bets[0].totalOdds,3.05);
  s=settleMarket(s,'danya','yes');assert.equal(s.bets[0].status,'pending');assert.equal(s.balance,900);
  s=settleMarket(s,'deadline','yes');assert.equal(s.bets[0].status,'won');assert.equal(s.bets[0].payout,305);assert.equal(s.balance,1205);
});
test('отмена одного плеча экспресса даёт коэффициент 1.00',()=>{
  let s=combo([['danya','yes'],['deadline','no'],['webots','late']],250);
  s=settleMarket(s,'deadline','void');s=settleMarket(s,'webots','late');s=settleMarket(s,'danya','yes');
  assert.equal(s.bets[0].payout,1202.5);assert.equal(s.balance,1952.5);assert.equal(s.bets[0].status,'won');
});
test('отмена всех плеч полностью возвращает токены',()=>{
  let s=combo([['danya','yes'],['deadline','no']]);
  s=settleMarket(s,'deadline','void');s=settleMarket(s,'danya','void');
  assert.equal(s.balance,1000);assert.equal(s.bets[0].status,'void');assert.equal(score(s),0);
});
test('проигравший экспресс не оживает после последующих исходов',()=>{
  let s=combo([['danya','yes'],['deadline','yes']]);
  s=settleMarket(s,'danya','no');assert.equal(s.bets[0].status,'lost');
  s=settleMarket(s,'deadline','void');assert.equal(s.bets[0].status,'lost');assert.equal(s.balance,900);
});
test('валидация блокирует пустые, некорректные и неподъёмные прогнозы',()=>{
  assert.throws(()=>placeBet(initialState()),/выберите исход/);
  const selected=selectOutcome(initialState(),'danya','yes');
  for(const stake of [0,-10,9,10.5,NaN,Infinity])assert.throws(()=>placeBet({...selected,stake}),/целое число/);
  assert.throws(()=>placeBet({...selected,stake:1001}),/больше токенов/);
  assert.throws(()=>placeBet(setMode(selected,'combo')),/хотя бы 2/);
  assert.throws(()=>selectOutcome(initialState(),'robotstart','yes'),/закрыто/);
});
test('одинар заменяет выбор; экспресс не допускает противоречащих исходов и больше 5 событий',()=>{
  let s=selectOutcome(initialState(),'danya','yes');s=selectOutcome(s,'deadline','yes');
  assert.equal(s.slip.length,1);assert.equal(s.slip[0].marketId,'deadline');
  s=setMode(s,'combo');s=selectOutcome(s,'danya','yes');s=selectOutcome(s,'danya','no');
  assert.equal(s.slip.length,2);assert.equal(s.slip.find(l=>l.marketId==='danya').optionId,'no');
  s=selectOutcome(s,'webots','never');s=selectOutcome(s,'practice','cat');s=selectOutcome(s,'wifi','yes');
  assert.throws(()=>selectOutcome(s,'dropout','none'),/до 5/);
  assert.equal(selectOutcome(s,'wifi','yes').slip.length,4);
  assert.equal(setMode(s,'single').slip.length,1);
});
test('несколько прогнозов на одном рынке рассчитываются каждый ровно один раз',()=>{
  let s=single();s=placeBet({...selectOutcome(s,'danya','no'),stake:200});
  s=settleMarket(s,'danya','yes');
  assert.equal(s.balance,885);assert.deepEqual(s.bets.map(b=>b.status),['lost','won']);
});
test('сохранение полностью восстанавливает баланс, купон, историю и избранное',()=>{
  let s=single();s=settleMarket(s,'danya','yes');s=addBonus(s);s=selectOutcome(s,'webots','never');s.favorites=['danya','webots'];
  const restored=restoreState(JSON.stringify(s));assert.deepEqual(restored,s);assert.equal(score(restored),85);
  assert.deepEqual(restoreState(null),initialState());
});
test('повреждённые данные не приводят к скрытой некорректной истории',()=>{
  for(const raw of ['no-json','null','{}',JSON.stringify({...initialState(),balance:-10}),JSON.stringify({...initialState(),bets:[{}]})])assert.throws(()=>restoreState(raw));
  const s=single();s.bets[0].legs[0].odds=999;assert.throws(()=>restoreState(JSON.stringify(s)));
});
test('пульт убирает закрытый исход из купона, демобонус не влияет на рейтинг',()=>{
  let s=selectOutcome(initialState(),'danya','yes');s=settleMarket(s,'danya','void');assert.equal(s.slip.length,0);
  s=addBonus(s);assert.equal(s.balance,1500);assert.equal(score(s),0);
});
test('коэффициенты и максимальный экспресс дают конечный точный возврат',()=>{
  const legs=MARKETS.slice(0,5).map(m=>({marketId:m.id,optionId:m.options[0].id,odds:m.options[0].odds}));
  assert.equal(totalOdds(legs),18.66);assert.equal(potentialReturn(legs,1000),18660);
});
