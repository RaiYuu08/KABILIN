(() => {
  'use strict';
  const app = document.getElementById('app');
  const cache = new Map(), scales = new Map(), cooking = new Map();
  const favoriteKey = 'kabilin:recipe-box';
  let persistent = true, modalRecipe, lastTrigger, timer = null, tick = 0;
  const findRecipe = id => R.find(recipe => recipe.id === id);
  function read(key, fallback) {
    if (cache.has(key)) return cache.get(key);
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch { persistent = false; return fallback; }
  }
  function write(key, value) {
    cache.set(key,value);
    try { localStorage.setItem(key,JSON.stringify(value)); return true; }
    catch { persistent = false; return false; }
  }
  function favorites() {
    const saved = read(favoriteKey,[]);
    return new Set(Array.isArray(saved) ? saved.filter(id => findRecipe(id)) : []);
  }
  const announce = document.createElement('div');
  announce.className = 'sr-only'; announce.setAttribute('role','status');
  document.body.append(announce);

  window.renderRecipeBox = () => {
    const saved = favorites();
    return `<div class="box-heading"><span class="eyebrow">Kept close, cooked often</span><h2>Lola’s Recipe Box</h2><p class="intro">A little collection of the dishes you want to come home to.</p></div>${saved.size ? `<p class="box-caption">${saved.size} ${saved.size===1?'recipe':'recipes'} tucked away${persistent?' on this device':' for this visit'}.</p>${grid(R.filter(recipe=>saved.has(recipe.id)))}` : '<div class="empty-state recipe-box-empty"><span class="hw">Your next family favorite belongs here.</span><p>Tap the bookmark on a recipe to tuck it into your box.</p><a class="btn" href="#recipes">Find something to cook</a></div>'}`;
  };
  function updateFavorites() {
    const saved = favorites();
    document.querySelectorAll('[data-save-recipe]').forEach(button => {
      const recipe = findRecipe(button.dataset.saveRecipe), active = saved.has(recipe.id);
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label',`${active?'Remove':'Save'} ${recipe.n} ${active?'from':'to'} recipe box`);
      button.title = active ? 'Remove from recipe box' : 'Save to recipe box';
      button.querySelector('span').textContent = active ? 'Saved in recipe box' : 'Save recipe';
    });
    const link = document.querySelector('nav a[href="#box"]');
    link.setAttribute('aria-label',`Recipe Box, ${saved.size} saved ${saved.size===1?'recipe':'recipes'}`);
    let count = link.querySelector('.box-count');
    if (!count) { count = document.createElement('span'); count.className='box-count'; count.setAttribute('aria-hidden','true'); link.append(count); }
    count.textContent = saved.size; count.hidden = !saved.size;
  }

  const fractions = {'¼':.25,'½':.5,'¾':.75,'⅓':1/3,'⅔':2/3};
  function number(value) {
    if (fractions[value]) return fractions[value];
    if (/\d[¼½¾]/.test(value)) return parseInt(value,10)+fractions[value.at(-1)];
    if (value.includes('/')) { const [n,d] = value.split('/').map(Number); return n/d; }
    return Number(value);
  }
  function amount(value) {
    const whole = Math.floor(value), part = Math.round((value-whole)*100)/100;
    const glyph = {'.25':'¼','.5':'½','.75':'¾'}[String(part).replace(/^0/,'')];
    if (glyph) return `${whole||''}${glyph}`;
    return String(Math.round(value*100)/100);
  }
  function scaledIngredient(recipe,index,factor) {
    const original = recipe.i[index];
    if (factor === 1) return original;
    if (recipe.id === 'lechon' && index === 0) return `${factor} young pigs (15–20 kg each)`;
    const scaled=original.replace(/\d+(?:\.\d+)?(?:\/\d+)?|[¼½¾⅓⅔]/g,quantity=>amount(number(quantity)*factor));
    return scaled.replace(/(\d+(?:\.\d+)?[¼½¾]?|[¼½¾]) (cup|head|tomato|onion|carrot|radish|egg|scoop|slice|pack|bunch|can)s?\b/g,(match,quantity,noun,offset,text)=>{
      if(noun==='egg' && /^ (?:whites|yolks)/.test(text.slice(offset+match.length))) return `${quantity} egg`;
      const plurals={tomato:'tomatoes',radish:'radishes',bunch:'bunches'};
      return `${quantity} ${number(quantity)>1?(plurals[noun]||noun+'s'):noun}`;
    });
  }
  function yieldText(recipe,factor) {
    const value = recipe.s.replace(/\d+/g,n=>amount(Number(n)*factor));
    return /pieces/.test(value) ? value : `${value} ${value==='1'?'serving':'servings'}`;
  }
  function applyScale(recipe) {
    const factor = scales.get(recipe.id) || 1;
    const controls = app.querySelector('[data-serving-controls]');
    controls.querySelector('output').textContent = yieldText(recipe,factor);
    const badge=app.querySelector('[data-recipe-yield]');
    if(badge) badge.textContent=`🍽 ${yieldText(recipe,factor)}`;
    controls.querySelector('[data-scale-reset]').textContent = `${amount(factor)}×`;
    controls.querySelector('[data-scale="-1"]').disabled = factor <= (recipe.id==='lechon'?1:.5);
    controls.querySelector('[data-scale="1"]').disabled = factor >= 4;
    app.querySelectorAll('.ck label').forEach((label,index) => {
      const target = label.querySelector('.ingredient-text') || label.lastChild;
      target.textContent = ` ${scaledIngredient(recipe,index,factor)}`;
    });
  }

  // Match actual ingredients, rather than recommending dishes for shared salt or water.
  const ingredients = {
    adobo:['chicken','pork','soy sauce','vinegar','garlic','bay leaves','peppercorns'],
    sinigang:['pork','tamarind','tomato','onion','radish','kangkong','long beans','green chilies','fish sauce'],
    lechon:['pork','lemongrass','garlic','scallions'],
    karekare:['oxtail','peanuts','rice','eggplant','bok choy','long beans','onion','garlic','shrimp paste'],
    pancit:['noodles','chicken','shrimp','carrot','cabbage','soy sauce','garlic','onion','calamansi'],
    lumpia:['pork','carrot','onion','garlic','eggs','lumpia wrappers'],
    sisig:['pork','onion','chilies','calamansi','soy sauce','eggs'],
    tinola:['chicken','ginger','green papaya','malunggay','onion','garlic','fish sauce'],
    bicol:['pork','coconut milk','coconut cream','chilies','shrimp paste','garlic','onion','ginger'],
    halohalo:['milk','jackfruit','sweet beans','nata de coco','ube','leche flan','sugar'],
    bibingka:['rice flour','coconut milk','sugar','eggs','cheese','banana leaves'],
    puto:['rice flour','sugar','milk','eggs','cheese'],
    lecheflan:['eggs','condensed milk','milk','vanilla','sugar','calamansi'],
    turon:['banana','lumpia wrappers','jackfruit','sugar']
  };
  function recommendations(recipe) {
    const common = new Set(['onion','garlic','sugar','soy sauce']);
    return R.filter(other=>other.id!==recipe.id).map(other=>{
      const shared = ingredients[recipe.id].filter(item=>ingredients[other.id].includes(item));
      return {other,shared,score:shared.reduce((sum,item)=>sum+(common.has(item)?1:3),0)};
    }).filter(match=>match.shared.length).sort((a,b)=>b.score-a.score || b.shared.length-a.shared.length).slice(0,3);
  }
  function extras(recipe) {
    const section = document.createElement('div'); section.id='recipe-extras';
    section.innerHTML = `<section class="kitchen-notes" aria-labelledby="notes-heading"><div class="section-heading"><h2 id="notes-heading">Your kitchen notes</h2><span class="eyebrow">A little more this, a little less that</span></div><label class="sr-only" for="recipe-notes">Personal notes for ${recipe.n}</label><textarea id="recipe-notes" maxlength="3000" rows="4" placeholder="Mama adds potatoes. A little less vinegar next time…" aria-describedby="notes-hint"></textarea><div class="notes-footer"><span id="notes-hint" role="status"></span><button type="button" class="text-button" data-clear-notes>Clear notes</button></div></section><section class="recipe-recommendations" aria-labelledby="recommendations-heading"><h2 id="recommendations-heading">From the same kitchen</h2><p>Other dishes you can make with some of these ingredients.</p><div class="recommendation-grid">${recommendations(recipe).map(({other,shared})=>`<a class="recommendation" href="#r-${other.id}"><img src="assets/recipes/${other.id}.jpg" alt="" width="84" height="74" loading="lazy"><div><h3>${other.n}</h3><p>Also uses ${shared.slice(0,2).join(' &amp; ')}.</p></div><span aria-hidden="true">↗</span></a>`).join('')}</div></section>`;
    app.append(section);
    const noteKey = `kabilin:notes:${recipe.id}`, input = section.querySelector('textarea');
    const stored = read(noteKey,''); input.value = typeof stored==='string' ? stored.slice(0,3000) : '';
    const status = section.querySelector('#notes-hint');
    const clear = section.querySelector('[data-clear-notes]');
    const describe = () => { status.textContent = persistent ? 'Your notes stay on this device.' : 'Your notes stay here for this visit.'; clear.disabled=!input.value; };
    describe();
    input.addEventListener('input',()=>{
      const saved = write(noteKey,input.value);
      status.textContent = saved ? 'Saved on this device.' : 'Saved for this visit.';
      clear.disabled=!input.value;
    });
    clear.addEventListener('click',()=>{ input.value=''; write(noteKey,''); describe(); input.focus(); });
  }
  window.enhanceKitchen = () => {
    updateFavorites();
    const page = app.querySelector('[data-recipe-id]');
    if (!page || page.dataset.kitchenReady) return;
    page.dataset.kitchenReady='true';
    const recipe = findRecipe(page.dataset.recipeId), controls=page.querySelector('[data-serving-controls]');
    controls.innerHTML = `<div class="serving-adjuster"><div><span class="eyebrow">Make room at the table</span><output aria-live="polite"></output></div><div class="portion-buttons" role="group" aria-label="Adjust recipe size"><button type="button" data-scale="-1" aria-label="Decrease recipe size">−</button><button type="button" data-scale-reset aria-label="Reset to original recipe size">1×</button><button type="button" data-scale="1" aria-label="Increase recipe size">+</button></div></div><p class="scaling-hint">${recipe.id==='lechon'?'Lechon scales by whole roasts; each pig stays 15–20 kg.':'Amounts scale; cooking times stay as written. Season to taste.'}</p>`;
    applyScale(recipe); extras(recipe);
  };

  const dialog = document.createElement('dialog');
  dialog.className='cooking-dialog'; dialog.setAttribute('aria-labelledby','cooking-title');
  document.body.append(dialog);
  const timerChip = document.createElement('button');
  timerChip.type='button'; timerChip.className='kitchen-timer-chip'; timerChip.hidden=true;
  document.body.append(timerChip);
  const formatTime = seconds => {
    const value=Math.max(0,Math.ceil(seconds));
    return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
  };
  function remaining() { return timer ? timer.running ? Math.max(0,(timer.deadline-Date.now())/1000) : timer.remaining : 0; }
  function timerUI() {
    if (timer?.running && remaining()<=0) {
      timer.running=false; timer.remaining=0; timer.finished=true;
      announce.textContent=`${findRecipe(timer.recipeId).n}: your kitchen timer is finished.`;
      clearInterval(tick); tick=0;
    }
    const output=dialog.querySelector('[data-timer-output]'), input=dialog.querySelector('[data-timer-minutes]');
    if (output) output.textContent=timer ? timer.finished ? 'Time’s up!' : formatTime(remaining()) : formatTime((Number(input?.value)||5)*60);
    const label=dialog.querySelector('[data-timer-label]');
    if (label) label.textContent=timer ? `${findRecipe(timer.recipeId).n} · kitchen timer` : 'Kitchen timer';
    const pause=dialog.querySelector('[data-timer-pause]');
    if (pause) { pause.disabled=!timer || timer.finished; pause.textContent=timer?.running?'Pause':'Resume'; }
    const reset=dialog.querySelector('[data-timer-reset]'); if(reset) reset.disabled=!timer;
    const start=dialog.querySelector('[data-timer-start]'); if(start) start.textContent=timer?(timer.recipeId===modalRecipe.id?'Restart timer':'Replace timer'):'Start timer';
    timerChip.hidden=!timer || dialog.open;
    if(timer) { timerChip.textContent=`◷ ${findRecipe(timer.recipeId).n} · ${timer.finished?'Time’s up!':formatTime(remaining())}`; timerChip.setAttribute('aria-label',`Open ${findRecipe(timer.recipeId).n} cooking timer, ${timer.finished?'finished':formatTime(remaining())}`); }
  }
  function stepMinutes(text) {
    const match=text.match(/(\d+(?:[½¼¾])?)(?:[–-](\d+))?\s*(minutes?|hours?)/i);
    return match ? Math.max(1,Math.round(number(match[1])*(match[3].toLowerCase().startsWith('hour')?60:1))) : 5;
  }
  function stateFor(recipe) {
    if (!cooking.has(recipe.id)) cooking.set(recipe.id,{index:0,done:new Set(),finished:false});
    return cooking.get(recipe.id);
  }
  function renderCooking(focus=false) {
    const recipe=modalRecipe, state=stateFor(recipe), factor=scales.get(recipe.id)||1;
    dialog.innerHTML=`<header class="cooking-header"><div><span class="eyebrow">A moment in your kitchen</span><h2 id="cooking-title">${recipe.n}</h2></div><button type="button" class="dialog-close" data-close-cooking aria-label="Close Cooking Mode">×</button></header>${state.finished?`<section class="cooking-finished"><span class="hw">Kain na!</span><p>You’ve finished ${recipe.n}. Gather everyone at the table.</p><button type="button" class="btn" data-close-cooking>Back to recipe</button><button type="button" class="text-button" data-cook-again>Cook again</button></section>`:`<div class="cooking-progress"><span>Step ${state.index+1} of ${recipe.p.length}</span><span>${state.done.size} done · ${yieldText(recipe,factor)}</span></div><div class="cooking-step" tabindex="-1"><span class="cooking-step-number" aria-hidden="true">${state.index+1}</span><p>${recipe.p[state.index]}</p></div><button type="button" class="step-done" data-step-done aria-pressed="${state.done.has(state.index)}">${state.done.has(state.index)?'✓ Step complete':'Mark this step done'}</button><div class="step-navigation" role="group" aria-label="Cooking steps">${recipe.p.map((_,index)=>`<button type="button" data-go-step="${index}" aria-label="Go to step ${index+1}${state.done.has(index)?', complete':''}" ${index===state.index?'aria-current="step"':''} class="${state.done.has(index)?'is-done':''}">${index+1}</button>`).join('')}</div><details class="cooking-ingredients"><summary>Ingredients · ${yieldText(recipe,factor)}</summary><ul>${recipe.i.map((_,index)=>`<li>${scaledIngredient(recipe,index,factor)}</li>`).join('')}</ul></details>`}<section class="timer-widget" aria-label="Kitchen timer"><div class="timer-heading"><span class="eyebrow" data-timer-label>Kitchen timer</span><output data-timer-output aria-label="Time remaining" aria-live="off">05:00</output></div><div class="timer-controls"><label><span class="sr-only">Timer minutes</span><input type="number" data-timer-minutes min="1" max="720" step="1" value="${stepMinutes(recipe.p[state.index])}"> min</label><button type="button" class="timer-start" data-timer-start>Start timer</button><button type="button" class="text-button" data-timer-pause>Pause</button><button type="button" class="text-button" data-timer-reset>Reset</button></div></section>${state.finished?'':`<footer class="cooking-footer"><button type="button" class="text-button" data-cook-prev ${state.index===0?'disabled':''}>← Previous</button><button type="button" class="btn" data-cook-next>${state.index===recipe.p.length-1?'Finish cooking':'Next step →'}</button></footer>`}`;
    timerUI();
    if (focus) dialog.querySelector('.cooking-step,.cooking-finished button').focus({preventScroll:true});
  }
  function openCooking(recipe,trigger) {
    modalRecipe=recipe; lastTrigger=trigger||document.activeElement;
    renderCooking(); dialog.showModal(); document.body.classList.add('cooking-open'); timerUI();
  }
  dialog.addEventListener('close',()=>{
    document.body.classList.remove('cooking-open'); timerUI();
    if(lastTrigger?.isConnected && lastTrigger.getClientRects().length) lastTrigger.focus({preventScroll:true});
    else app.focus({preventScroll:true});
  });
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('button'); if(!button) return;
    const state=stateFor(modalRecipe);
    if(button.hasAttribute('data-close-cooking')) dialog.close();
    if(button.hasAttribute('data-step-done')) { state.done.has(state.index)?state.done.delete(state.index):state.done.add(state.index);renderCooking();dialog.querySelector('[data-step-done]').focus(); }
    if(button.hasAttribute('data-go-step')) { state.index=Number(button.dataset.goStep);renderCooking(true); }
    if(button.hasAttribute('data-cook-prev')) { state.index=Math.max(0,state.index-1);renderCooking(true); }
    if(button.hasAttribute('data-cook-next')) { state.done.add(state.index);if(state.index===modalRecipe.p.length-1)state.finished=true;else state.index++;renderCooking(true); }
    if(button.hasAttribute('data-cook-again')) { cooking.set(modalRecipe.id,{index:0,done:new Set(),finished:false});renderCooking(true); }
    if(button.hasAttribute('data-timer-start')) {
      const input=dialog.querySelector('[data-timer-minutes]'); if(!input.reportValidity()||!input.value)return;
      const seconds=Number(input.value)*60;
      timer={recipeId:modalRecipe.id,remaining:seconds,deadline:Date.now()+seconds*1000,running:true,finished:false};
      clearInterval(tick); tick=setInterval(timerUI,250); timerUI();
    }
    if(button.hasAttribute('data-timer-pause')&&timer) {
      if(timer.running) { timer.remaining=remaining();timer.running=false;clearInterval(tick);tick=0; }
      else { timer.deadline=Date.now()+timer.remaining*1000;timer.running=true;tick=setInterval(timerUI,250); }
      timerUI();
    }
    if(button.hasAttribute('data-timer-reset')) { timer=null;clearInterval(tick);tick=0;timerUI(); }
  });
  dialog.addEventListener('input',event=>{ if(event.target.matches('[data-timer-minutes]')&&!timer)timerUI(); });
  timerChip.addEventListener('click',()=>{ if(timer)openCooking(findRecipe(timer.recipeId),timerChip); });
  document.addEventListener('visibilitychange',timerUI);

  app.addEventListener('click',event=>{
    const save=event.target.closest('[data-save-recipe]');
    if(save) {
      const id=save.dataset.saveRecipe, saved=favorites(), recipe=findRecipe(id);
      saved.has(id)?saved.delete(id):saved.add(id);write(favoriteKey,[...saved]);updateFavorites();
      announce.textContent=`${recipe.n} ${saved.has(id)?'saved to':'removed from'} your recipe box.`;
      if(location.hash==='#box') {
        app.innerHTML=window.renderRecipeBox();window.refreshExperience?.();
        const next=app.querySelector('[data-save-recipe],.recipe-box-empty a');next?.focus({preventScroll:true});
      }
      return;
    }
    const start=event.target.closest('[data-start-cooking]'); if(start)openCooking(findRecipe(start.dataset.startCooking),start);
    const scale=event.target.closest('[data-scale],[data-scale-reset]');
    if(scale) {
      const recipe=findRecipe(app.querySelector('[data-recipe-id]').dataset.recipeId);
      const current=scales.get(recipe.id)||1, step=recipe.id==='lechon'?1:.5;
      scales.set(recipe.id,scale.hasAttribute('data-scale-reset')?1:Math.max(step,Math.min(4,current+Number(scale.dataset.scale)*step)));
      applyScale(recipe);
    }
  });
  addEventListener('storage',event=>{
    if(event.key===favoriteKey) { cache.delete(favoriteKey);if(location.hash==='#box'){app.innerHTML=window.renderRecipeBox();window.refreshExperience?.();}else updateFavorites(); }
  });
  // Render once after this deferred module loads, including direct links to the box.
  route();
})();
