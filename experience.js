(() => {
  'use strict';
  const app = document.getElementById('app');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const prepared = new WeakSet();
  const memory = new Map();
  const pendingNodes = new Set();
  let observer, transition, regionAnimation;

  const reveal = node => {
    node.classList.add('is-revealed');
    observer?.unobserve(node);
    pendingNodes.delete(node);
  };
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
    }, {threshold:.06,rootMargin:'0px 0px 32px 0px'});
  }

  function prepareReveals() {
    // Do not animate an ancestor of the interactive 3D logo.
    document.querySelectorAll('#app > h2,#app > .intro,.hero .sub,.recipe-card,.story,.note,.stp,.reg > h3,.creators h2,.cc').forEach(node => {
      if (prepared.has(node)) return;
      prepared.add(node);
      if (reduced.matches || !observer) return;
      const siblings = node.parentElement.classList.contains('grid') ? [...node.parentElement.children] : [];
      const delay = Math.max(0,siblings.indexOf(node)) % 4 * 55;
      node.style.setProperty('--reveal-delay',`${delay}ms`);
      node.classList.add('motion-pending');
      pendingNodes.add(node);
      // Keep the new page visible in a view-transition snapshot.
      if (node.getBoundingClientRect().top < innerHeight && node.getBoundingClientRect().bottom > 0) {
        if (transition) reveal(node);
        else observer.observe(node);
      } else observer.observe(node);
    });
  }

  function ingredientKey() { return `kabilin:ingredients:${location.hash.slice(3)}`; }
  function savedIngredients(key) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch { return memory.get(key) || []; }
  }
  function updateIngredients(save = true) {
    const list = app.querySelector('.ck');
    if (!list) return;
    const inputs = [...list.querySelectorAll('input')];
    const count = inputs.filter(input => input.checked).length;
    inputs.forEach(input => input.closest('label').classList.toggle('is-checked',input.checked));
    const progress = app.querySelector('.ingredient-track');
    progress.setAttribute('aria-valuenow',count);
    progress.setAttribute('aria-valuemax',inputs.length);
    progress.style.setProperty('--progress',String(count / inputs.length));
    app.querySelector('#ingredient-count').textContent = `${count} of ${inputs.length} ingredients ready`;
    app.querySelector('[data-reset-ingredients]').disabled = count === 0;
    if (save) {
      const state = inputs.map(input => input.checked);
      memory.set(ingredientKey(),state);
      try { sessionStorage.setItem(ingredientKey(),JSON.stringify(state)); } catch { /* A private browser can still use memory. */ }
    }
  }
  function prepareIngredients() {
    const list = app.querySelector('.ck');
    if (!list || list.dataset.enhanced) return;
    list.dataset.enhanced = 'true';
    list.insertAdjacentHTML('beforebegin','<div class="ingredient-progress"><div class="ingredient-progress-header"><span id="ingredient-count" role="status" aria-live="polite"></span><button type="button" class="text-button" data-reset-ingredients>Reset</button></div><div class="ingredient-track" role="progressbar" aria-label="Ingredients prepared" aria-valuemin="0"><span class="ingredient-fill"></span></div></div>');
    const saved = savedIngredients(ingredientKey());
    list.querySelectorAll('input').forEach((input,index) => {
      input.checked = saved[index] === true;
      const label = input.closest('label');
      const text = document.createElement('span');
      text.className = 'ingredient-text';
      while (input.nextSibling) text.append(input.nextSibling);
      label.append(text);
    });
    updateIngredients(false);
  }

  window.refreshExperience = () => {
    // Release observer references to nodes discarded by search or navigation.
    pendingNodes.forEach(node => {
      if (!node.isConnected) { observer?.unobserve(node); pendingNodes.delete(node); }
      else if (reduced.matches || (transition && node.getBoundingClientRect().top < innerHeight && node.getBoundingClientRect().bottom > 0)) reveal(node);
    });
    window.enhanceKitchen?.();
    window.enhanceMusic?.();
    prepareReveals();
    prepareIngredients();
    const heading = app.querySelector('h1,h2');
    document.title = location.hash && location.hash !== '#home' && heading ? `${heading.textContent} · KABILIN` : 'KABILIN – A Filipino Recipe That Feels Like Home';
  };
  window.animateRegion = region => {
    if (!region || reduced.matches || !region.animate) return;
    regionAnimation?.cancel();
    regionAnimation = region.animate([{opacity:.35,translate:'0 7px'},{opacity:1,translate:'0 0'}],{duration:250,easing:'cubic-bezier(.22,1,.36,1)'});
  };
  window.navigateExperience = update => {
    transition?.skipTransition();
    if (document.startViewTransition && !reduced.matches && !document.hidden) {
      transition = document.startViewTransition(() => {
        update();
        // Moving focus away from a removed link keeps keyboard navigation useful.
        if (document.activeElement === document.body) app.focus({preventScroll:true});
      });
      const current = transition;
      current.ready.catch(() => {});
      current.finished.catch(() => {}).finally(() => { if (transition === current) transition = null; });
    } else {
      update();
      if (!reduced.matches) window.animateRegion(app);
    }
  };
  app.addEventListener('change',event => {
    if (event.target.matches('.ck input')) updateIngredients();
  });
  app.addEventListener('click',event => {
    if (event.target.closest('[data-reset-ingredients]')) {
      app.querySelectorAll('.ck input').forEach(input => { input.checked = false; });
      updateIngredients();
    }
  });
  document.querySelector('.skip-link').addEventListener('click',event => {
    event.preventDefault();
    app.focus({preventScroll:true});
    app.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
  });

  const backTop = document.createElement('button');
  backTop.type = 'button'; backTop.className = 'back-top'; backTop.textContent = '↑';
  backTop.setAttribute('aria-label','Back to top'); backTop.title = 'Back to top'; backTop.tabIndex = -1;
  document.body.append(backTop);
  backTop.addEventListener('click',() => {
    window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'});
    app.focus({preventScroll:true});
  });
  let scrollFrame = 0;
  const updateScroll = () => {
    document.body.classList.toggle('is-scrolled',scrollY > 12);
    const visible = scrollY > 600;
    backTop.classList.toggle('is-visible',visible);
    backTop.tabIndex = visible ? 0 : -1;
    scrollFrame = 0;
  };
  addEventListener('scroll',() => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); },{passive:true});
  const nav = document.getElementById('nav');
  const measureNav = () => document.documentElement.style.setProperty('--nav-height',`${nav.offsetHeight}px`);
  if ('ResizeObserver' in window) new ResizeObserver(measureNav).observe(nav);
  else addEventListener('resize',measureNav,{passive:true});
  reduced.addEventListener('change',() => {
    transition?.skipTransition();
    regionAnimation?.cancel();
    if (reduced.matches) document.querySelectorAll('.motion-pending').forEach(reveal);
  });
  measureNav(); updateScroll(); window.refreshExperience();
})();
