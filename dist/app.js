import {STORAGE_KEY,MARKETS,LEADERS,initialState,restoreState,marketById,optionById,selectOutcome,setMode,placeBet,settleMarket,addBonus,totalOdds,potentialReturn,score,round} from './model.js';

const $ = selector => document.querySelector(selector);
const fmt = n => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
const odds = n => n.toFixed(2);
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  ticket:'<path d="M4 3h16v6a3 3 0 0 0 0 6v6H4v-6a3 3 0 0 0 0-6V3Z"/><path d="M12 6v2m0 3v2m0 3v2"/>',
  history:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6m3-3v5l3 2"/>',
  trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm5 11v5m-4 2h8M7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9L7.5 14 3 9.6l6.2-.9L12 3Z"/>',
  flask:'<path d="M9 3h6m-5 0v6L4 19a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2L14 9V3M7 14h10m-7 3h1m3 1h1"/>',
  book:'<path d="M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-14 4h3m4 0h3m-10 3h3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  robot:'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M1 12v4m22-4v4M8 16h8m-8-5v1m8-1v1"/><circle cx="12" cy="2" r="1"/>',
  code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  wifi:'<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r="1"/>',
  orbit:'<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)"/><path d="M8 3c4-1 9 2 12 7M4 14c3 6 8 9 12 7"/>',
  cup:'<path d="M4 8h13v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm13 1h2a3 3 0 0 1 0 6h-2M7 2v3m4-3v3m4-3v3"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  arrowUp:'<path d="M6 18 18 6M6 6h12v12"/>',
  search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  shield:'<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  refresh:'<path d="M20 7a9 9 0 0 0-16 1m0-5v5h5m-5 9a9 9 0 0 0 16-1m0 5v-5h-5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.grid}</svg>`;
let storageAvailable=true;
let warning='';
let state;
let savedState;
try {savedState=localStorage.getItem(STORAGE_KEY);}
catch {storageAvailable=false;warning='Браузер запретил сохранение. Игра работает до закрытия страницы.';}
try {state=restoreState(savedState);}
catch {state=initialState();warning='Сохранение не удалось прочитать. Начата новая демосессия с 1 000 токенов.';}

const ui={view:['markets','history','leaders','favorites'].includes(location.hash.slice(1))?location.hash.slice(1):'markets',category:'Все события',query:'',status:'all',historyFilter:'all',slipOpen:false,modal:null,demoMarket:null,demoOutcome:null};
let toastTimer;

function persist(){
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true;}
  catch {storageAvailable=false;warning='Браузер не сохранил изменения. Текущая игра доступна до закрытия страницы.';}
  renderStorageWarning();
}
function renderStorageWarning(){const el=$('#storage-warning');el.hidden=!warning;el.textContent=warning;}
function notify(message,error=false){
  clearTimeout(toastTimer);
  $('#toasts').innerHTML=`<div class="toast${error?' error':''}" role="status">${icon(error?'info':'check')}${escape(message)}</div>`;
  toastTimer=setTimeout(()=>$('#toasts').replaceChildren(),4300);
}
function commit(transform,message){
  try {state=transform(state);persist();render();if(message)notify(typeof message==='function'?message():message);return true;}
  catch(e){notify(e.message,true);return false;}
}
function navMarkup(mobile=false){
  const pending=state.bets.filter(b=>b.status==='pending').length;
  const links=[['markets','grid',mobile?'Линия':'Линия событий',MARKETS.filter(m=>!state.results[m.id]).length],['history','history',mobile?'Прогнозы':'Мои прогнозы',pending],['leaders','trophy',mobile?'Лидеры':'Таблица лидеров',null],['favorites','star','Избранное',state.favorites.length]];
  return links.map(([view,i,label,n])=>`<button class="nav-button ${ui.view===view?'active':''}" data-action="view" data-view="${view}" ${ui.view===view?'aria-current="page"':''} aria-label="${label}">${icon(i)}<span class="nav-label">${label}</span>${n?`<span class="nav-count">${n}</span>`:''}</button>`).join('')+(mobile?`<button class="nav-button" data-action="demo" aria-label="Пульт симуляции">${icon('flask')}<span class="nav-label">Демо</span></button>`:'');
}
function renderChrome(){
  $('#navigation').innerHTML=navMarkup();
  $('#mobile-navigation').innerHTML=navMarkup(true);
  $('#sidebar-bottom').innerHTML=`<button class="nav-button" data-action="demo">${icon('flask')}<span class="nav-label">Пульт симуляции</span></button><button class="nav-button" data-action="rules">${icon('book')}<span class="nav-label">Как это работает</span></button>`;
  $('#wallet').innerHTML=`<span class="coin" aria-hidden="true">Т</span><strong>${fmt(state.balance)}</strong><span class="wallet-label">на балансе<b>токенов</b></span><span class="wallet-plus" aria-hidden="true">${icon('plus')}</span>`;
  $('#wallet').setAttribute('aria-label',`Баланс ${fmt(state.balance)} токенов. Получить ещё 500`);
  const mobileButton=$('#mobile-slip-button');
  mobileButton.hidden=ui.slipOpen||!state.slip.length;
  mobileButton.innerHTML=`<span>${icon('ticket')} Купон${state.slip.length?' · '+state.slip.length:''}</span><small>${state.slip.length?'Коэффициент '+odds(totalOdds(state.slip)):'Есть предчувствие?'}</small>`;
  syncSlip();
}
function syncSlip(){
  document.body.classList.toggle('slip-open',ui.slipOpen);
  $('#slip-backdrop').hidden=!ui.slipOpen;
  $('#mobile-slip-button').hidden=ui.slipOpen||!state.slip.length;
  document.body.classList.toggle('has-slip',state.slip.length>0);
  const coupon=$('.coupon');
  if(coupon){if(ui.slipOpen){coupon.setAttribute('role','dialog');coupon.setAttribute('aria-modal','true');coupon.setAttribute('aria-label','Купон прогноза');}else{coupon.removeAttribute('role');coupon.removeAttribute('aria-modal');coupon.removeAttribute('aria-label');}}
}
const viewTitles={markets:'Линия событий',history:'Мои прогнозы',leaders:'Таблица лидеров',favorites:'Избранные события'};
function render(){
  const focus=document.activeElement;
  const focusId=focus?.id;
  const focusKey=focus?.getAttribute('data-focus-key');
  renderChrome();
  $('#main').innerHTML=`<div class="page-heading"><h1>${viewTitles[ui.view]}</h1><span class="heading-right">${icon('orbit')} СЕЗОН 01 / УЧЕБНАЯ СИМУЛЯЦИЯ</span></div><div class="workspace"><section class="content-column" aria-label="${viewTitles[ui.view]}">${ui.view==='markets'||ui.view==='favorites'?marketsView():ui.view==='history'?historyView():leadersView()}</section><aside class="right-column" aria-label="Купон и статистика">${couponView()}${rightExtras()}</aside></div>`;
  if(ui.view==='markets'||ui.view==='favorites')renderMarketCards();
  renderSummary();syncSlip();renderStorageWarning();
  if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
  else if(focusKey)document.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus({preventScroll:true});
}
function marketsView(){
  const isFav=ui.view==='favorites';
  const open=MARKETS.filter(m=>!state.results[m.id]).length;
  return `${isFav?`<div class="view-intro"><div><span class="modal-label">ЛИЧНЫЙ РАДАР</span><h2>Держи их в поле зрения.</h2><p>События, которым ты поставил звёздочку. Предчувствия заслуживают отдельной вкладки.</p></div>${icon('star')}</div>`:`<section class="hero" aria-label="Высшая школа прогнозов"><div class="hero-copy"><span class="eyebrow">ПИРС × НЕОПРЕДЕЛЁННОСТЬ</span><h2>ВЫСШАЯ ШКОЛА<br><span>ПРОГНОЗОВ.</span></h2><p>Дедлайны плывут. Webots падает.<br>Твоя интуиция выходит на практику.</p><button class="hero-cta" data-action="scroll-events">Выбрать событие ${icon('arrowUp')}</button></div><img class="hero-art" src="assets/robot-arm.svg" alt="Чертёж роботизированной руки, держащей токен"><span class="hero-stamp">EST. 2026 / НЕОФИЦИАЛЬНО</span></section><div class="stats-strip"><div class="stat"><strong class="accent">${String(open).padStart(2,'0')}</strong><span>событий<br>в игре</span></div><div class="stat"><strong>∞</strong><span>поводов<br>надеяться</span></div><div class="stat"><strong>0 ₽</strong><span>настоящих<br>денег</span></div></div>`}
  <section id="events" aria-label="События"><div class="section-heading"><h2>${isFav?'Твои сигналы':'На что намекает интуиция?'}</h2><span class="section-note">КОЭФФИЦИЕНТЫ ИГРОВЫЕ</span></div><div class="filter-tabs" aria-label="Категории">${['Все события','Учёба','Роботы','Кампус','Мультивселенная'].map(c=>`<button class="filter-tab${ui.category===c?' active':''}" data-action="category" data-category="${c}" aria-pressed="${ui.category===c}" data-focus-key="category-${c}">${c}${c==='Все события'?`<span class="count">${isFav?state.favorites.length:MARKETS.length}</span>`:''}</button>`).join('')}</div><div class="market-toolbar"><label class="search">${icon('search')}<span class="sr-only">Поиск событий</span><input id="search" type="search" value="${escape(ui.query)}" placeholder="Найти повод для прогноза…" autocomplete="off"></label><label><span class="sr-only">Статус событий</span><select id="market-status">${[['all','Все статусы'],['open','Открытые'],['settled','Завершённые'],['void','Отменённые']].map(([v,l])=>`<option value="${v}"${ui.status===v?' selected':''}>${l}</option>`).join('')}</select></label></div><div class="markets-grid" id="markets-grid"></div><p class="results-count" id="results-count" aria-live="polite"></p></section>`;
}
function filteredMarkets(){
  return MARKETS.filter(m=>{
    const result=state.results[m.id];
    return (ui.view!=='favorites'||state.favorites.includes(m.id)) && (ui.category==='Все события'||m.category===ui.category) && (!ui.query||[m.title,m.description,m.category,...m.options.map(o=>o.label)].join(' ').toLocaleLowerCase('ru').includes(ui.query.toLocaleLowerCase('ru').trim())) && (ui.status==='all'||(ui.status==='open'&&!result)||(ui.status==='settled'&&result&&result!=='void')||(ui.status==='void'&&result==='void'));
  });
}
function renderMarketCards(){
  const grid=$('#markets-grid');if(!grid)return;
  const markets=filteredMarkets();
  grid.innerHTML=markets.length?markets.map(marketCard).join(''):`<div class="empty-state">${icon(ui.view==='favorites'?'star':'search')}<h3>${ui.view==='favorites'&&!state.favorites.length?'Пока без фаворитов':'Сигнал не найден'}</h3><p>${ui.view==='favorites'&&!state.favorites.length?'Нажми звёздочку на карточке события — и оно появится здесь.':'Попробуй другой запрос, категорию или статус события.'}</p><button class="secondary-button" data-action="${ui.view==='favorites'&&!state.favorites.length?'go-markets':'clear-filters'}">${ui.view==='favorites'&&!state.favorites.length?'К линии событий':'Сбросить фильтры'} ${icon('arrow')}</button></div>`;
  $('#results-count').textContent=`ПОКАЗАНО ${markets.length} / ${ui.view==='favorites'?state.favorites.length:MARKETS.length} · ВСЕ СОБЫТИЯ ДЕМОНСТРАЦИОННЫЕ`;
}
function marketCard(m){
  const result=state.results[m.id];const selected=state.slip.find(l=>l.marketId===m.id);const favorite=state.favorites.includes(m.id);
  return `<article class="market-card${result?' closed':''}${selected?' selected':''}" data-market="${m.id}"><div class="market-meta"><span class="market-icon">${icon(m.icon)}</span><span class="market-category">${m.category}</span>${m.hot&&!result?'<span class="hot-tag">ОБСУЖДАЕМОЕ</span>':''}<button class="favorite${favorite?' is-favorite':''}" data-action="favorite" data-market="${m.id}" data-focus-key="fav-${m.id}" aria-label="${favorite?'Убрать из избранного':'В избранное'}: ${m.title}" aria-pressed="${favorite}">${icon('star')}</button></div><h3>${m.title}</h3><p class="market-description">${m.description}</p>${m.fiction?'<p class="fiction-note">* Все персонажи вымышлены</p>':''}<div class="outcomes" style="--options:${m.options.length}">${m.options.map(o=>`<button class="outcome${selected?.optionId===o.id?' selected':''}${result===o.id?' winner':''}" data-action="outcome" data-market="${m.id}" data-option="${o.id}" data-focus-key="outcome-${m.id}-${o.id}" aria-label="${m.title} ${o.label}, коэффициент ${odds(o.odds)}" aria-pressed="${selected?.optionId===o.id}" ${result?'disabled':''}><span class="option-label">${o.label}</span><strong>${result===o.id?'✓ ':''}${odds(o.odds)}</strong></button>`).join('')}</div><div class="market-footer"><span>${m.time}</span><span class="market-state${result==='void'?' void':result?' settled':''}">${result==='void'?'↩ Возврат':result?'✓ Рассчитано':'<span class="status-dot"></span> Открыто'}</span></div></article>`;
}
function couponView(){
  return `<section class="coupon" aria-labelledby="coupon-title"><div class="coupon-head"><div class="coupon-title">${icon('ticket')}<h2 id="coupon-title">Купон</h2><span class="coupon-count">${state.slip.length}</span></div><div class="coupon-actions">${state.slip.length?`<button class="icon-button" data-action="clear-slip" aria-label="Очистить купон">${icon('trash')}</button>`:''}<button class="icon-button close-slip" data-action="close-slip" aria-label="Закрыть купон">${icon('close')}</button></div></div><div class="coupon-mode" aria-label="Тип прогноза"><button data-action="mode" data-mode="single" class="${state.mode==='single'?'active':''}" aria-pressed="${state.mode==='single'}">Одинар</button><button data-action="mode" data-mode="combo" class="${state.mode==='combo'?'active':''}" aria-pressed="${state.mode==='combo'}">Экспресс</button></div>${state.slip.length?`<div class="coupon-items">${state.slip.map(l=>`<div class="coupon-item"><div class="coupon-item-head"><h3>${marketById(l.marketId).title}</h3><button class="icon-button" data-action="remove-leg" data-market="${l.marketId}" aria-label="Убрать ${marketById(l.marketId).title}">${icon('close')}</button></div><div class="coupon-item-choice"><span>↗ ${optionById(l.marketId,l.optionId).label}</span><strong>${odds(l.odds)}</strong></div></div>`).join('')}</div>`:`<div class="coupon-empty"><div class="ticket-art">${icon('plus')}</div><h3>Есть предчувствие?</h3><p>Нажми на коэффициент события.<br>Интуиция сделает остальное.</p></div>`}<div class="coupon-body"><label class="stake-label" for="stake">Сколько токенов?<span>МИН. 10 Т</span></label><div class="stake-input"><input id="stake" name="stake" type="number" inputmode="numeric" min="10" step="1" value="${state.stake||''}" aria-describedby="coupon-error"><span class="coin" aria-hidden="true">Т</span></div><div class="stake-presets">${[50,100,250,500].map(v=>`<button data-action="stake-preset" data-value="${v}" aria-label="Поставить ${v} токенов">${v}</button>`).join('')}</div><div id="coupon-summary"></div><p id="coupon-error" class="coupon-error" role="status" hidden></p><button id="place-bet" class="primary-button" data-action="place">Зафиксировать прогноз ${icon('arrow')}</button><p class="coupon-disclaimer">Токены не имеют денежной стоимости.<br>Верить в себя — бесплатно.</p></div><div class="coupon-bottom">${icon('shield')} ТОЛЬКО ИГРОВЫЕ ОЧКИ</div></section>`;
}
function slipError(){
  if(!state.slip.length)return '';
  if(state.mode==='combo'&&state.slip.length<2)return 'Добавь ещё событие для экспресса.';
  if(!Number.isSafeInteger(state.stake)||state.stake<10)return 'Нужно целое число от 10 токенов.';
  if(state.stake>state.balance)return 'Не хватает токенов. Пополни демобаланс кнопкой «+».';
  return '';
}
function renderSummary(){
  const summary=$('#coupon-summary');if(!summary)return;
  const potential=state.slip.length&&state.stake>0?potentialReturn(state.slip,state.stake):0;
  summary.innerHTML=`<div class="coupon-line"><span>Общий коэффициент</span><strong>${state.slip.length?odds(totalOdds(state.slip)):'—'}</strong></div><div class="coupon-total"><span>Возможный возврат<small>Включая твои токены</small></span><strong>${fmt(potential)} <small>Т</small></strong></div>`;
  const error=slipError();$('#coupon-error').hidden=!error;$('#coupon-error').textContent=error;
  $('#place-bet').disabled=!state.slip.length||!!error;
}
function rightExtras(){
  return `<section class="mini-leaders"><div class="mini-section-header"><h3>Впереди планеты всей</h3><button class="text-link" data-action="view" data-view="leaders" aria-label="Вся таблица лидеров">Все ${icon('arrowUp')}</button></div>${LEADERS.slice(0,3).map((l,i)=>`<div class="mini-leader"><span class="leader-rank">${i+1}</span><span class="avatar ${l.color}">${l.avatar}</span><span class="mini-leader-name">${l.name}</span><span class="mini-leader-score">+${fmt(l.score)}</span></div>`).join('')}<p>Вымышленные ники. Воображаемый престиж.</p></section><section class="demo-card">${icon('flask')}<h3>Режиссёр своей сессии</h3><p>Задай исходы событий и проверь, куда заведёт твой прогноз.</p><button class="text-link" data-action="demo">Пульт симуляции ${icon('arrowUp')}</button></section>`;
}
const statusNames={pending:'В игре',won:'Зашёл',lost:'Не в этот раз',void:'Возврат'};
function historyView(){
  const pending=state.bets.filter(b=>b.status==='pending').length;
  const won=state.bets.filter(b=>b.status==='won').length;
  const net=score(state);
  const bets=state.bets.filter(b=>ui.historyFilter==='all'||b.status===ui.historyFilter);
  return `<div class="view-intro"><div><span class="modal-label">АРХИВ ПРЕДЧУВСТВИЙ</span><h2>«Я же говорил»<br>теперь с доказательствами.</h2><p>Каждый прогноз записан. Исходами управляет пульт симуляции — попробуй разные сценарии.</p></div>${icon('history')}</div><div class="history-stats">${[['Прогнозов',state.bets.length],['Сейчас в игре',pending],['Угадано',won],['Результат, Т',(net>0?'+':'')+fmt(net)]].map(([l,n],i)=>`<div class="history-stat"><span>${l}</span><strong class="${i===3&&net>0?'positive':''}">${n}</strong></div>`).join('')}</div><div class="filter-tabs" aria-label="Фильтр истории">${[['all','Все'],...Object.entries(statusNames)].map(([v,l])=>`<button class="filter-tab${ui.historyFilter===v?' active':''}" data-action="history-filter" data-value="${v}" aria-pressed="${ui.historyFilter===v}">${l}</button>`).join('')}</div><div class="history-list">${bets.length?bets.map(historyCard).join(''):`<div class="empty-state">${icon('ticket')}<h3>${state.bets.length?'Здесь пока тихо':'История начинается с предчувствия'}</h3><p>${state.bets.length?'Прогнозов с таким статусом пока нет.':'Выбери событие, добавь токены и зафиксируй прогноз. Здесь появится твой первый купон.'}</p><button class="primary-button" data-action="go-markets">К событиям ${icon('arrow')}</button></div>`}</div>`;
}
function historyCard(b){
  return `<article class="history-card"><div class="history-head"><span class="history-id">#${String(b.id).padStart(4,'0')}<span>${b.mode==='combo'?'ЭКСПРЕСС':'ОДИНАР'}</span></span><span class="status-pill ${b.status}">${b.status==='won'?'✓ ':b.status==='lost'?'× ':b.status==='void'?'↩ ':''}${statusNames[b.status]}</span></div>${b.legs.map(l=>{const result=state.results[l.marketId];return `<div class="history-leg"><div><h3>${marketById(l.marketId).title}</h3><p>${optionById(l.marketId,l.optionId).label}</p>${result?`<p class="leg-result">${result==='void'?'Событие отменено · коэффициент 1.00':'Исход: '+optionById(l.marketId,result).label}</p>`:''}</div><span>${odds(l.odds)}</span></div>`;}).join('')}<div class="history-footer"><span>Прогноз<strong>${fmt(b.stake)} Т</strong></span><span>${b.status==='pending'?'Возможно':b.status==='lost'?'Возврат':'Начислено'}<strong>${fmt(b.status==='pending'?potentialReturn(b.legs.filter(l=>state.results[l.marketId]!=='void'),b.stake):b.payout)} Т</strong></span><span class="date">${new Date(b.createdAt).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Moscow'})} МСК</span></div></article>`;
}
function leadersView(){
  const leaders=[...LEADERS,{name:'ты_сам',tag:'Это ты. Всё ещё можешь удивить.',score:score(state),avatar:'ТЫ',color:'ice',you:true}].sort((a,b)=>b.score-a.score);
  return `<div class="view-intro"><div><span class="modal-label">ЗАЛ ВООБРАЖАЕМОЙ СЛАВЫ</span><h2>Предвидели всё.<br>Кроме контрольной.</h2><p>Локальная таблица вымышленных участников. Твой результат меняется после расчёта прогнозов.</p></div>${icon('trophy')}</div><section class="leaders-panel" aria-label="Рейтинг по результату прогнозов"><div class="leader-table-head"><span>№</span><span>ПРОГНОЗИСТ</span><span>РЕЗУЛЬТАТ</span></div>${leaders.map((l,i)=>`<div class="leader-row${l.you?' you':''}"><span class="rank">${String(i+1).padStart(2,'0')}</span><div class="leader-person"><span class="avatar ${l.color}">${l.avatar}</span><div><strong>${l.name}${l.you?' · ты':''}</strong><p>${l.tag}</p></div></div><div class="leader-score">${l.score>0?'+':''}${fmt(l.score)}<small>токенов</small></div></div>`).join('')}</section><p class="leader-info">Результат = возвраты минус токены в рассчитанных прогнозах. Стартовые 1 000 Т и демобонусы не повышают рейтинг. Очки остальных участников заданы для примера.</p>`;
}
function navigate(view){
  if(!viewTitles[view])return;
  ui.view=view;ui.slipOpen=false;
  history.replaceState(null,'','#'+view);render();window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});
}
function goMarkets(){ui.category='Все события';ui.query='';ui.status='all';navigate('markets');}
function modalHeader(title,label){return `<header class="modal-head"><div><span class="modal-label">${label}</span><h2 id="modal-title">${title}</h2></div><button class="icon-button" data-action="close-modal" aria-label="Закрыть окно">${icon('close')}</button></header>`;}
function openModal(type){
  ui.modal=type;renderModal();
  if(!$('#modal').open)$('#modal').showModal();
}
function closeModal(){$('#modal').close();ui.modal=null;}
function renderModal(){
  const el=$('#modal');
  if(ui.modal==='rules')el.innerHTML=modalHeader('Интуиция по инструкции','ПРАВИЛА / README')+`<div class="modal-body"><ol class="rules-list"><li><strong>Это пародия на студенческую жизнь</strong><p>ПИРСBET не связан с НИУ ВШЭ. Все события — демонстрационные сценарии, а не сведения о реальных занятиях или студентах.</p></li><li><strong>Токены — только игровые очки</strong><p>На старте — 1 000 Т. Их нельзя купить, продать, обменять или вывести. Кнопка «+» бесплатно добавляет 500 Т для экспериментов.</p></li><li><strong>Один исход или целая теория</strong><p>В одинаре — одно событие. В экспрессе — от 2 до 5 разных событий; все выбранные исходы должны сойтись. Игровые коэффициенты перемножаются и округляются до сотых.</p></li><li><strong>Пульт управляет этой вселенной</strong><p>Зафиксируй прогноз, открой пульт симуляции и задай исход. Возврат равен токенам × коэффициент и включает внесённые токены. При отмене события его коэффициент становится 1.00; если отменены все — возвращается исходная сумма.</p></li><li><strong>Шутим о ботах, бережём людей</strong><p>Все персонажи и ники вымышлены. Сценарии об отчислении относятся только к ботам из вымышленной симуляции. Добавления настоящих студентов здесь нет.</p></li><li><strong>Всё остаётся в этом браузере</strong><p>Баланс, купон, история, избранное и исходы сохраняются локально. Общего сервера и реальных участников нет. Сброс демосессии удаляет этот игровой прогресс.</p></li></ol><button class="primary-button" data-action="close-modal">Понятно. Доверяюсь интуиции ${icon('arrow')}</button></div>`;
  if(ui.modal==='bonus')el.innerHTML=modalHeader('Стипендия от воображения','ДЕМОНСТРАЦИОННЫЙ БАЛАНС')+`<div class="modal-body"><p>Токены закончились раньше сессии? Бывает. Добавь ещё немного для экспериментов — бесплатно и без ограничений.</p><div class="bonus-display"><strong>+500</strong><span class="coin">Т</span></div><div class="modal-callout">Сейчас на балансе <strong>${fmt(state.balance)} Т</strong>. После пополнения — <strong>${fmt(state.balance+500)} Т</strong>.<br>Этот бонус не влияет на место в таблице лидеров.</div><button class="primary-button" data-action="claim-bonus">Получить 500 токенов ${icon('plus')}</button></div>`;
  if(ui.modal==='demo'){
    const open=MARKETS.filter(m=>!state.results[m.id]);
    if(!open.some(m=>m.id===ui.demoMarket)){ui.demoMarket=open[0]?.id;ui.demoOutcome=null;}
    const m=marketById(ui.demoMarket);
    if(m&&!m.options.some(o=>o.id===ui.demoOutcome)&&ui.demoOutcome!=='void')ui.demoOutcome=m.options[0].id;
    el.innerHTML=modalHeader('Пульт симуляции','LOCAL / ТЫ ЗДЕСЬ РЕЖИССЁР')+`<div class="modal-body"><p>Пара отменяется по щелчку. Webots слушается тебя. Зафиксируй исход — связанные прогнозы рассчитаются автоматически.</p>${m?`<div class="modal-form"><label for="demo-market">Событие</label><select id="demo-market">${open.map(x=>`<option value="${x.id}"${x.id===m.id?' selected':''}>${x.title}</option>`).join('')}</select><label for="demo-outcome">Что случилось в этой вселенной?</label><select id="demo-outcome">${m.options.map(o=>`<option value="${o.id}"${o.id===ui.demoOutcome?' selected':''}>${o.label}</option>`).join('')}<option value="void"${ui.demoOutcome==='void'?' selected':''}>Отменить событие · возврат токенов</option></select><div class="modal-callout">Исход фиксируется один раз. Открытые прогнозы будут рассчитаны, а событие исчезнет из купона. Чтобы начать заново, сбрось демосессию.</div><button class="primary-button" data-action="settle">Зафиксировать исход ${icon('check')}</button></div>`:`<div class="empty-state">${icon('check')}<h3>Симуляция завершена</h3><p>Все события рассчитаны. Можно посмотреть историю или начать новую демосессию.</p><button class="secondary-button" data-action="modal-history">Посмотреть историю</button></div>`}<div class="modal-bottom"><span>${MARKETS.length-open.length} из ${MARKETS.length} событий завершено</span><button class="secondary-button danger-button" data-action="reset-dialog">${icon('refresh')} Сбросить демосессию</button></div></div>`;
  }
  if(ui.modal==='reset')el.innerHTML=modalHeader('Начать с чистого купона?','СБРОС ДЕМОСЕССИИ')+`<div class="modal-body"><p>История, купон, избранное и выбранные исходы будут удалены из этого браузера. Баланс снова станет 1 000 токенов.</p><div class="modal-actions"><button class="secondary-button" data-action="demo">Оставить как есть</button><button class="primary-button" data-action="reset">Да, начать заново</button></div></div>`;
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const a=button.dataset.action;
  if(a==='view')navigate(button.dataset.view);
  if(a==='go-markets')goMarkets();
  if(a==='category'){ui.category=button.dataset.category;render();}
  if(a==='history-filter'){ui.historyFilter=button.dataset.value;render();}
  if(a==='clear-filters'){ui.category='Все события';ui.status='all';ui.query='';render();}
  if(a==='scroll-events'){$('#events').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});$('#search').focus({preventScroll:true});}
  if(a==='favorite')commit(s=>({...s,favorites:s.favorites.includes(button.dataset.market)?s.favorites.filter(id=>id!==button.dataset.market):[...s.favorites,button.dataset.market]}));
  if(a==='outcome'){
    const previous=state.slip.find(l=>l.marketId===button.dataset.market);
    const oldCount=state.slip.length;
    if(commit(s=>selectOutcome(s,button.dataset.market,button.dataset.option))){
      if(matchMedia('(max-width:760px)').matches)notify(previous?.optionId===button.dataset.option?'Исход убран из купона':state.mode==='single'&&oldCount?'Одинар обновлён. Для нескольких событий включи экспресс.':'Исход в купоне. Открой его внизу экрана.');
    }
  }
  if(a==='mode'){
    const trimmed=button.dataset.mode==='single'&&state.slip.length>1;
    commit(s=>setMode(s,button.dataset.mode),trimmed?'В одинаре осталось первое событие.':null);
  }
  if(a==='clear-slip')commit(s=>({...s,slip:[]}));
  if(a==='remove-leg')commit(s=>({...s,slip:s.slip.filter(l=>l.marketId!==button.dataset.market)}));
  if(a==='stake-preset')commit(s=>({...s,stake:Number(button.dataset.value)}));
  if(a==='place'){
    if(commit(s=>placeBet(s),()=>`Прогноз #${String(state.sequence).padStart(4,'0')} принят. Токены в деле.`)){
      ui.slipOpen=false;syncSlip();
      if(matchMedia('(max-width:760px)').matches)$('#mobile-navigation [data-view="history"]').focus();
    }
  }
  if(a==='slip'){clearTimeout(toastTimer);$('#toasts').replaceChildren();ui.slipOpen=true;syncSlip();$('.close-slip').focus();}
  if(a==='close-slip'){ui.slipOpen=false;syncSlip();$('#mobile-slip-button').focus();}
  if(['rules','bonus','demo'].includes(a))openModal(a);
  if(a==='close-modal')closeModal();
  if(a==='claim-bonus'){commit(addBonus,'На баланс добавлено 500 токенов.');closeModal();}
  if(a==='settle'){
    const oldBalance=state.balance;
    if(commit(s=>settleMarket(s,ui.demoMarket,ui.demoOutcome))){notify(`Исход зафиксирован.${state.balance>oldBalance?' Начислено '+fmt(round(state.balance-oldBalance))+' Т.':' История обновлена.'}`);ui.demoOutcome=null;renderModal();$('#demo-market')?.focus();}
  }
  if(a==='reset-dialog')openModal('reset');
  if(a==='reset'){state=initialState();ui.category='Все события';ui.status='all';ui.query='';ui.historyFilter='all';warning='';persist();closeModal();navigate('markets');notify('Чистый лист. 1 000 токенов. Снова верим.');}
  if(a==='modal-history'){closeModal();navigate('history');}
});
document.addEventListener('input',event=>{
  if(event.target.id==='search'){ui.query=event.target.value;renderMarketCards();}
  if(event.target.id==='stake'){state={...state,stake:Number.isFinite(Number(event.target.value))?Number(event.target.value):0};persist();renderSummary();}
});
document.addEventListener('change',event=>{
  if(event.target.id==='market-status'){ui.status=event.target.value;renderMarketCards();}
  if(event.target.id==='demo-market'){ui.demoMarket=event.target.value;ui.demoOutcome=null;renderModal();$('#demo-market').focus();}
  if(event.target.id==='demo-outcome')ui.demoOutcome=event.target.value;
});
document.addEventListener('keydown',event=>{
  if(!ui.slipOpen||$('#modal').open)return;
  if(event.key==='Escape'){ui.slipOpen=false;syncSlip();$('#mobile-slip-button').focus();}
  if(event.key==='Tab'){
    const elements=[...$('.coupon').querySelectorAll('button:not(:disabled),input,select')].filter(el=>el.getClientRects().length);
    const first=elements[0],last=elements.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const rect=e.target.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)closeModal();}});
$('#modal').addEventListener('close',()=>{ui.modal=null;});
window.addEventListener('hashchange',()=>{const view=location.hash.slice(1);if(viewTitles[view])navigate(view);});
window.addEventListener('storage',e=>{
  if(e.key===STORAGE_KEY||e.key===null){try{state=restoreState(e.newValue);render();if(ui.modal)renderModal();notify('Прогресс обновлён из другой вкладки.');}catch{notify('Не удалось прочитать изменения из другой вкладки.',true);}}
});
matchMedia('(max-width:760px)').addEventListener('change',e=>{if(!e.matches){ui.slipOpen=false;syncSlip();}});
render();
