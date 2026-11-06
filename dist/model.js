export const STORAGE_KEY = 'pirsbet.local.v1';
export const START_BALANCE = 1000;
export const MARKETS = [
  {id:'danya',category:'Учёба',icon:'calendar',code:'EDU / 001',time:'Сценарий · 09:30',title:'Отменят ли пару Дани?',description:'В чате тишина. Но надежда, как известно, умирает после переклички.',hot:true,options:[{id:'yes',label:'Да, можно спать',odds:1.85},{id:'no',label:'Нет, идём на пару',odds:1.95}]},
  {id:'deadline',category:'Учёба',icon:'clock',code:'EDU / 002',time:'Сценарий · 23:59',title:'Перенесут ли дедлайн?',description:'Коллективное «мы почти доделали» уже набирается.',options:[{id:'yes',label:'Да, ещё денёк',odds:1.65},{id:'no',label:'Нет, git push сейчас',odds:2.30}]},
  {id:'webots',category:'Роботы',icon:'robot',code:'SYS / 003',time:'Сценарий · запуск',title:'Когда упадёт Webots?',description:'Симуляция стабильна. Пока на неё никто не смотрит.',hot:true,options:[{id:'early',label:'До 5-й минуты',odds:1.42},{id:'late',label:'Позже',odds:2.60},{id:'never',label:'Выживет',odds:5.80}]},
  {id:'practice',category:'Кампус',icon:'code',code:'LAB / 004',time:'Сценарий · практика',title:'Кто первым закроет практику?',description:'Все участники этой гонки — вымышленные персонажи.',fiction:true,options:[{id:'cat',label:'sudo_кот',odds:2.10},{id:'fault',label:'segfault_404',odds:3.40},{id:'robot',label:'робот_валера',odds:2.85}]},
  {id:'wifi',category:'Кампус',icon:'wifi',code:'NET / 005',time:'Сценарий · пара',title:'Доживёт ли Wi-Fi до конца пары?',description:'Подключено. Без доступа к уверенности в завтрашнем дне.',options:[{id:'yes',label:'Пакеты дойдут',odds:2.05},{id:'no',label:'Снова раздаём',odds:1.75}]},
  {id:'dropout',category:'Мультивселенная',icon:'orbit',code:'ALT / 006',time:'Вымышленная вселенная',title:'Кого отчислят из симуляции?',description:'Только вымышленные боты. В реальности всем желаем закрыть сессию.',fiction:true,options:[{id:'semen',label:'Бот Семён-404',odds:2.40},{id:'loop',label:'Бот Вечный Цикл',odds:2.40},{id:'none',label:'Никого',odds:1.80}]},
  {id:'robotstart',category:'Роботы',icon:'robot',code:'SYS / 007',time:'Сценарий завершён',title:'Робот поехал с первого запуска?',description:'Он поехал. В другую сторону. Считаем за опыт.',initialResult:'no',options:[{id:'yes',label:'Да',odds:4.50},{id:'no',label:'Разумеется, нет',odds:1.15}]},
  {id:'coffee',category:'Кампус',icon:'cup',code:'CUP / 008',time:'Сценарий отменён',title:'Хватит ли кофе до дедлайна?',description:'Дедлайн исчез из расписания. Токены возвращаются.',initialResult:'void',options:[{id:'yes',label:'Ещё одна чашка',odds:1.70},{id:'no',label:'Кофе закончился',odds:2.10}]}
];
export const LEADERS = [
  {name:'sudo_кот',tag:'На девятой жизни дедлайна',score:2140,avatar:'КТ',color:'purple'},
  {name:'segfault_404',tag:'Предвидел даже этот баг',score:1860,avatar:'SF',color:'blue'},
  {name:'робот_валера',tag:'Машинное предчувствие',score:1420,avatar:'РВ',color:'ice'},
  {name:'чайник.py',tag:'Кипит, но компилируется',score:780,avatar:'ЧП',color:'orange'},
  {name:'сонный_лидар',tag:'Сканирует возможности',score:390,avatar:'ЛД',color:'blue'}
];
export const marketById = id => MARKETS.find(m=>m.id===id);
export const optionById = (marketId,optionId) => marketById(marketId)?.options.find(o=>o.id===optionId);
export const round = n => Math.round((n+Number.EPSILON)*100)/100;
export function initialState() {
  return {version:1,balance:START_BALANCE,bonus:0,sequence:0,bets:[],results:Object.fromEntries(MARKETS.filter(m=>m.initialResult).map(m=>[m.id,m.initialResult])),slip:[],mode:'single',stake:100,favorites:[]};
}
export function restoreState(raw) {
  if (!raw) return initialState();
  const s = JSON.parse(raw);
  const validLeg = l=>l && !!optionById(l.marketId,l.optionId) && l.odds===optionById(l.marketId,l.optionId).odds;
  if (s.version!==1 || !Number.isFinite(s.balance) || s.balance<0 || !Number.isFinite(s.bonus) || s.bonus<0 || !Number.isSafeInteger(s.sequence) || s.sequence<0 || !Array.isArray(s.bets) || s.bets.length>10000 || !s.results || typeof s.results!=='object' || Array.isArray(s.results) || !Array.isArray(s.slip) || !Array.isArray(s.favorites) || !['single','combo'].includes(s.mode) || !Number.isFinite(s.stake)) throw new Error('Сохранение повреждено');
  if (Object.entries(s.results).some(([m,o])=>!marketById(m)||(o!=='void'&&!optionById(m,o)))) throw new Error('Неизвестный исход');
  if (s.bets.some(b=>!b || !Number.isSafeInteger(b.id) || b.id<1 || !['pending','won','lost','void'].includes(b.status) || !Number.isSafeInteger(b.stake) || b.stake<10 || !Number.isFinite(b.payout) || b.payout<0 || !Number.isFinite(b.totalOdds) || !['single','combo'].includes(b.mode) || !Number.isFinite(Date.parse(b.createdAt)) || !Array.isArray(b.legs) || !b.legs.length || b.legs.length>5 || b.legs.some(l=>!validLeg(l)) || new Set(b.legs.map(l=>l.marketId)).size!==b.legs.length)) throw new Error('История повреждена');
  if (new Set(s.bets.map(b=>b.id)).size!==s.bets.length || s.bets.some(b=>b.id>s.sequence)) throw new Error('История повреждена');
  s.slip=s.slip.filter(l=>validLeg(l)&&!s.results[l.marketId]).filter((l,i,a)=>a.findIndex(x=>x.marketId===l.marketId)===i).slice(0,s.mode==='single'?1:5);
  s.favorites=[...new Set(s.favorites.filter(id=>!!marketById(id)))];
  return s;
}
export function totalOdds(legs) {return round(legs.reduce((n,l)=>n*l.odds,1));}
export function potentialReturn(legs,stake) {return round(stake*totalOdds(legs));}
export function selectOutcome(state,marketId,optionId) {
  const option=optionById(marketId,optionId);
  if (!option || state.results[marketId]) throw new Error('Это событие уже закрыто');
  let slip=[...state.slip];
  const existing=slip.find(l=>l.marketId===marketId);
  if (existing?.optionId===optionId) return {...state,slip:slip.filter(l=>l.marketId!==marketId)};
  if (state.mode==='single') slip=[];
  else if (!existing && slip.length>=5) throw new Error('В экспресс можно добавить до 5 событий');
  slip=slip.filter(l=>l.marketId!==marketId);
  return {...state,slip:[...slip,{marketId,optionId,odds:option.odds}]};
}
export function setMode(state,mode) {
  if (!['single','combo'].includes(mode)) throw new Error('Неизвестный режим');
  return {...state,mode,slip:mode==='single'?state.slip.slice(0,1):state.slip};
}
export function placeBet(state, now=new Date().toISOString()) {
  if (!state.slip.length) throw new Error('Сначала выберите исход события');
  if (state.mode==='combo'&&state.slip.length<2) throw new Error('Для экспресса нужно хотя бы 2 события');
  if (!Number.isSafeInteger(state.stake)||state.stake<10) throw new Error('Введите целое число от 10 токенов');
  if (state.stake>state.balance) throw new Error('В купоне больше токенов, чем на балансе');
  if (state.slip.some(l=>state.results[l.marketId]||!optionById(l.marketId,l.optionId))) throw new Error('Одно из событий уже закрыто. Обновите купон');
  const bet={id:state.sequence+1,createdAt:now,mode:state.mode,stake:state.stake,legs:state.slip.map(l=>({...l})),totalOdds:totalOdds(state.slip),status:'pending',payout:0};
  return {...state,sequence:bet.id,balance:round(state.balance-state.stake),bets:[bet,...state.bets],slip:[]};
}
export function settleMarket(state,marketId,result) {
  if (!marketById(marketId) || (result!=='void'&&!optionById(marketId,result))) throw new Error('Выберите корректный исход');
  if (state.results[marketId]) throw new Error('Исход уже зафиксирован');
  const results={...state.results,[marketId]:result};
  let balance=state.balance;
  const bets=state.bets.map(b=>{
    if (b.status!=='pending') return b;
    if (b.legs.some(l=>results[l.marketId] && results[l.marketId]!=='void' && results[l.marketId]!==l.optionId)) return {...b,status:'lost',payout:0};
    if (!b.legs.every(l=>results[l.marketId])) return b;
    const active=b.legs.filter(l=>results[l.marketId]!=='void');
    const payout=active.length?potentialReturn(active,b.stake):b.stake;
    balance=round(balance+payout);
    return {...b,status:active.length?'won':'void',payout};
  });
  return {...state,results,bets,balance,slip:state.slip.filter(l=>l.marketId!==marketId)};
}
export function addBonus(state) {return {...state,balance:round(state.balance+500),bonus:state.bonus+500};}
export function score(state) {return round(state.bets.filter(b=>b.status!=='pending').reduce((n,b)=>n+b.payout-b.stake,0));}
