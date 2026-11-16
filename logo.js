(() => {
  'use strict';
  const leaf = 'M100 101C85 87 52 68 62 45C70 26 91 31 100 46C109 31 130 26 138 45C148 68 115 87 100 101Z';
  const stem = '<path d="M98 98C96 142 128 157 108 190L116 195C142 157 111 140 108 98Z"/>';
  const leaves = [0, 90, 180, 270].map(angle => `<path d="${leaf}" transform="rotate(${angle} 100 100)"/>`).join('');
  const silhouette = stem + leaves;
  const front = `<svg class="clover-slice clover-front" viewBox="0 0 200 200"><defs>
    <linearGradient id="clover-jade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#edf0c4"/><stop offset=".2" stop-color="#afc18a"/><stop offset=".52" stop-color="#769761"/><stop offset=".8" stop-color="#486c43"/><stop offset="1" stop-color="#263f30"/></linearGradient>
    <linearGradient id="clover-gold" x1="0" x2="1"><stop stop-color="#7e6634"/><stop offset=".45" stop-color="#e3c88b"/><stop offset="1" stop-color="#9b793b"/></linearGradient>
    <radialGradient id="clover-glint"><stop stop-color="#ffffe5" stop-opacity=".85"/><stop offset="1" stop-color="#ffffe5" stop-opacity="0"/></radialGradient>
    </defs><g fill="url(#clover-gold)">${stem}</g><g fill="url(#clover-jade)" stroke="#bed09a" stroke-width=".7">${leaves}</g>
    <g fill="none" stroke-linecap="round">${[0,90,180,270].map(a => `<g transform="rotate(${a} 100 100)"><path d="M100 99Q90 76 80 54" stroke="#d3dfac" stroke-opacity=".65" stroke-width="1.1"/><path d="M68 48C72 37 84 37 90 44" stroke="#f6f6cf" stroke-opacity=".65" stroke-width="2.3"/><path d="M104 87Q128 65 131 52" stroke="#304c35" stroke-opacity=".25" stroke-width="1.5"/></g>`).join('')}</g>
    <ellipse cx="78" cy="49" rx="19" ry="13" fill="url(#clover-glint)"/><circle cx="100" cy="100" r="4" fill="#d7c18b"/>
  </svg>`;

  window.initHomeLogo = () => {
    const stage = document.getElementById('home-logo') || document.getElementById('about-logo');
    if (!stage) return;
    // Reinitialization is safe, including a return to Home through hash navigation.
    window.disposeHomeLogo?.();
    const object = stage.querySelector('.logo-object');
    stage.querySelector('.clover-emblem').innerHTML = Array.from({length:20}, (_, i) => `<svg class="clover-slice" viewBox="0 0 200 200" style="--depth:${i - 10}px;--edge:${i % 4 === 0 ? '#738858' : '#355039'}">${silhouette}</svg>`).join('') + front;
    const wordmark = stage.querySelector('.logo-wordmark');
    if (wordmark) {
      wordmark.querySelectorAll('.logo-letter-depth').forEach(layer => layer.remove());
      wordmark.insertAdjacentHTML('afterbegin', Array.from({length:12}, (_, i) => `<span class="logo-letter-depth" aria-hidden="true" style="--depth:${i - 6}px">KABILIN</span>`).join(''));
    }
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const events = new AbortController();
    const options = {signal:events.signal};
    let paused = reducedMotion.matches;
    let dragging = false, activePointer = null, lastX = 0, lastY = 0;
    let pitch = -9, yaw = -12, roll = 0, vx = 0, vy = 0;
    let frame = 0, previousTime = 0;
    let inView = true;
    const paint = () => { object.style.transform = `rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`; };
    const animate = time => {
      const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
      previousTime = time;
      if (!dragging && !document.hidden && inView) {
        if (!paused) {
          // A full turn takes 72 seconds; drag momentum gently falls away.
          yaw += (5 + vx) * dt;
          pitch += vy * dt;
          const damping = Math.exp(-4 * dt);
          vx *= damping; vy *= damping;
          roll = Math.sin(time / 9000) * 2;
        }
        paint();
      }
      if ((!paused || dragging) && !document.hidden && inView) frame = requestAnimationFrame(animate);
      else frame = 0;
    };
    const wake = () => { if (!frame) { previousTime = 0; frame = requestAnimationFrame(animate); } };
    stage.addEventListener('pointerdown', e => {
      if (!e.isPrimary || e.button !== 0 || !e.target.closest('.clover-emblem,.logo-wordmark')) return;
      dragging = true; activePointer = e.pointerId;
      lastX = e.clientX; lastY = e.clientY; vx = vy = 0;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
      stage.focus({preventScroll:true});
      wake();
    }, options);
    stage.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== activePointer) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      yaw += dx * .45; pitch -= dy * .45;
      vx = Math.max(-65, Math.min(65, dx * 7));
      vy = Math.max(-40, Math.min(40, -dy * 7));
      lastX = e.clientX; lastY = e.clientY;
      paint();
    }, options);
    const release = e => {
      if (e.pointerId !== activePointer) return;
      dragging = false; activePointer = null;
      stage.classList.remove('is-dragging');
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
    };
    stage.addEventListener('pointerup', release, options);
    stage.addEventListener('pointercancel', release, options);
    stage.addEventListener('lostpointercapture', release, options);
    stage.addEventListener('keydown', e => {
      if (e.code === 'Space') {
        e.preventDefault(); paused = !paused; vx = vy = 0; wake(); return;
      }
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)) return;
      e.preventDefault(); vx = vy = 0;
      if(e.key === 'ArrowLeft') yaw -= 12;
      if(e.key === 'ArrowRight') yaw += 12;
      if(e.key === 'ArrowUp') pitch += 12;
      if(e.key === 'ArrowDown') pitch -= 12;
      if(e.key === 'Home') { pitch = -9; yaw = -12; roll = 0; }
      paint();
    }, options);
    reducedMotion.addEventListener('change', e => { paused = e.matches; wake(); }, options);
    document.addEventListener('visibilitychange', () => {
      previousTime = 0;
      if (!document.hidden && inView) wake();
      else { cancelAnimationFrame(frame); frame = 0; }
    }, options);
    const visibility = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      previousTime = 0;
      if (inView && !document.hidden && !paused) wake();
      else if (!inView) { cancelAnimationFrame(frame); frame = 0; }
    }) : null;
    visibility?.observe(stage);
    window.disposeHomeLogo = () => { events.abort(); visibility?.disconnect(); cancelAnimationFrame(frame); window.disposeHomeLogo = null; };
    paint();
    if (!paused) wake();
  };
  window.initHomeLogo();
})();
