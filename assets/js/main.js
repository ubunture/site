    // ===== Mobile menu =====
    const nav = document.querySelector('.nav');
    const btn = document.querySelector('.menu-btn');
    const menu = document.getElementById('menu');

    function updateMenuState() {
      if (!nav || !menu) return;
      const open = nav.classList.contains('open');
      // Full-screen menu: lock page scroll while it is open (the menu scrolls itself)
      document.documentElement.classList.toggle('nav-lock-scroll', open);
      document.body.classList.toggle('nav-lock-scroll', open);
    }

    btn?.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      if (!open) document.querySelectorAll('.has-dropdown.open').forEach(li => li.classList.remove('open'));
      updateMenuState();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 880) {
        if (nav && nav.classList.contains('open')) {
          nav.classList.remove('open');
          btn?.setAttribute('aria-expanded', 'false');
          updateMenuState();
        }
        document.querySelectorAll('.has-dropdown.open').forEach(li => li.classList.remove('open'));
      } else {
        if (nav && nav.classList.contains('open')) {
          updateMenuState();
        }
      }
    });

    // Handle Back/Forward cache (BFCache) page restores
    window.addEventListener('pageshow', () => {
      if (nav && !nav.classList.contains('open')) {
        updateMenuState();
      }
    });

    // ===== Active link on scroll =====
    const sectionIds = ['about','project','team','news','support'];
    const links = Array.from(menu.querySelectorAll('a'));
    const io = new IntersectionObserver(entries => {
      const vis = entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!vis) return;
      const id = vis.target.id;
      const hasHashLinks = links.some(a => {
        const href = a.getAttribute('href');
        return href && href.startsWith('#');
      });
      if (hasHashLinks) {
        links.forEach(a=>a.classList.toggle('active', a.getAttribute('href') === '#' + id));
      }
    }, { rootMargin: '-40% 0px -55% 0px', threshold:[0,.2,.5,1]});
    sectionIds.forEach(id=>{ const el = document.getElementById(id); if(el) io.observe(el); });

    // ===== Reveal-on-scroll =====
    const reve = document.querySelectorAll('.reveal');
    const rio = new IntersectionObserver(es => {
      es.forEach(e => { if(e.isIntersecting){ e.target.classList.add('show'); rio.unobserve(e.target); } });
    }, { rootMargin:'0px 0px -10% 0px', threshold:.15 });
    reve.forEach(el => rio.observe(el));

    // Close menu after click (mobile) — skip dropdown toggles, handled separately below
    links.filter(a => !a.classList.contains('dropdown-toggle')).forEach(a=>a.addEventListener('click', ()=>{
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
      updateMenuState();
    }));

    // ===== Mobile dropdown toggles (About / Team / Contact) =====
    const dropdowns = Array.from(document.querySelectorAll('.has-dropdown'));
    dropdowns.forEach(li => {
      const toggle = li.querySelector(':scope > .dropdown-toggle');
      if (!toggle) return;
      toggle.addEventListener('click', (e) => {
        if (window.innerWidth > 880) return; // desktop: hover handles it, let the link navigate
        if (!li.classList.contains('open') || toggle.classList.contains('no-link')) {
          if (li.classList.contains('open')) { li.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); updateMenuState(); e.preventDefault(); return; }
          e.preventDefault();
          dropdowns.forEach(other => {
            if (other !== li) {
              other.classList.remove('open');
              other.querySelector(':scope > .dropdown-toggle')?.setAttribute('aria-expanded', 'false');
            }
          });
          li.classList.add('open');
          toggle.setAttribute('aria-expanded', 'true');
          updateMenuState();
        } else {
          // Already open: let this tap navigate, and close the mobile nav panel
          nav.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    });

(function(){
  const root = document.querySelector('#voices');
  if(!root) return;
  const track = root.querySelector('.voices-track');
  const slides = Array.from(root.querySelectorAll('.voice-slide'));
  const prevBtn = root.querySelector('.voices-btn.prev');
  const nextBtn = root.querySelector('.voices-btn.next');
  const viewport = root.querySelector('.voices-viewport');
  const dotsWrap = root.querySelector('.voices-dots');
  const total = slides.length;
  let index = 0;
  let autoTimer = null;
  let isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Build dots
  slides.forEach((_, i)=>{
    const dot = document.createElement('button');
    dot.setAttribute('role','tab');
    dot.setAttribute('aria-controls', `slide-${i+1}`);
    dot.id = `voices-dot-${i+1}`;
    dot.title = `${i+1} / ${total}`;
    dot.addEventListener('click', ()=> goTo(i));
    dotsWrap.appendChild(dot);
  });

  function updateAria(){
    slides.forEach((s,i)=>{
      s.setAttribute('aria-label', `${i+1} / ${total}`);
      s.classList.toggle('current', i===index);
    });
    const dots = dotsWrap.querySelectorAll('[role="tab"]');
    dots.forEach((d,i)=> d.setAttribute('aria-selected', i===index ? 'true':'false'));
    prevBtn.disabled = (index===0);
    nextBtn.disabled = (index===total-1);
  }

  function goTo(i){
    index = Math.max(0, Math.min(total-1, i));
    const x = -index * viewport.clientWidth;
    track.style.transform = `translate3d(${x}px,0,0)`;
    updateAria();
  }

  function next(){ goTo(index+1); }
  function prev(){ goTo(index-1); }

  // Buttons
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  // Keyboard (left/right)
  viewport.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if(e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
  });

  // Swipe (pointer events)
  let startX=0, dx=0, dragging=false;
  const threshold = 40; // px
  function onDown(e){ dragging=true; startX = (e.touches? e.touches[0].clientX : e.clientX); dx=0; }
  function onMove(e){ if(!dragging) return; const x=(e.touches? e.touches[0].clientX : e.clientX); dx = x-startX; const curX = -index * viewport.clientWidth + dx; track.style.transform = `translate3d(${curX}px,0,0)`; }
  function onUp(){ if(!dragging) return; dragging=false; if(Math.abs(dx) > threshold){ dx<0 ? next() : prev(); } else { goTo(index); } }
  viewport.addEventListener('pointerdown', onDown);
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);
  viewport.addEventListener('pointerleave', onUp);
  viewport.addEventListener('touchstart', onDown, {passive:true});
  viewport.addEventListener('touchmove', onMove, {passive:true});
  viewport.addEventListener('touchend', onUp);
  viewport.addEventListener('touchcancel', onUp);

  // Auto-advance (pause on hover/focus/hidden)
  function startAuto(){
    if(isReduced) return; 
    stopAuto();
    autoTimer = setInterval(()=>{
      if(index < total-1) next(); else goTo(0);
    }, 6000);
  }
  function stopAuto(){ if(autoTimer) { clearInterval(autoTimer); autoTimer=null; } }
  root.addEventListener('mouseenter', stopAuto);
  root.addEventListener('mouseleave', startAuto);
  root.addEventListener('focusin', stopAuto);
  root.addEventListener('focusout', startAuto);
  document.addEventListener('visibilitychange', ()=> document.hidden ? stopAuto() : startAuto());

  // Init
  goTo(0);
  startAuto();
  window.addEventListener('resize', () => {
    isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    goTo(index);
  });
})();

// ===== News slider =====
(function(){
  const root = document.querySelector('#news-slider');
  if(!root) return;
  const track = root.querySelector('.news-track');
  const slides = Array.from(root.querySelectorAll('.post'));
  const prevBtn = root.querySelector('.news-btn.prev');
  const nextBtn = root.querySelector('.news-btn.next');
  const viewport = root.querySelector('.news-viewport');
  const dotsWrap = document.querySelector('.news-dots');
  const total = slides.length;
  let index = 0;
  let visibleCount = 3;

  function getVisibleCount() {
    const w = window.innerWidth;
    if (w <= 640) return 1;
    if (w <= 980) return 2;
    return 3;
  }

  function setupSlider() {
    visibleCount = getVisibleCount();
    const maxIndex = total - visibleCount;
    
    // Check if slider is needed
    if (maxIndex <= 0) {
      root.classList.add('no-slide');
      track.style.transform = 'none';
      index = 0;
      dotsWrap.innerHTML = '';
      return;
    }
    
    root.classList.remove('no-slide');
    
    // Rebuild dots
    dotsWrap.innerHTML = '';
    const dotCount = maxIndex + 1;
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement('button');
      dot.setAttribute('role','tab');
      dot.setAttribute('aria-controls', `news-post-${i+1}`);
      dot.id = `news-dot-${i+1}`;
      dot.title = `${i+1} / ${dotCount}`;
      dot.addEventListener('click', ()=> goTo(i));
      dotsWrap.appendChild(dot);
    }
    
    if (index > maxIndex) {
      index = maxIndex;
    }
    goTo(index);
  }

  function updateAria(){
    const maxIndex = total - visibleCount;
    slides.forEach((s,i)=>{
      s.classList.toggle('current', i===index);
    });
    const dots = dotsWrap.querySelectorAll('[role="tab"]');
    dots.forEach((d,i)=> d.setAttribute('aria-selected', i===index ? 'true':'false'));
    prevBtn.disabled = (index===0);
    nextBtn.disabled = (index===maxIndex);
  }

  function goTo(i){
    const maxIndex = total - visibleCount;
    index = Math.max(0, Math.min(maxIndex, i));
    const card = slides[0];
    if (!card) return;
    const gap = 26; // match CSS gap
    const step = card.offsetWidth + gap;
    const x = -index * step;
    track.style.transform = `translate3d(${x}px,0,0)`;
    updateAria();
  }

  function next(){ goTo(index+1); }
  function prev(){ goTo(index-1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  viewport.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if(e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
  });

  // Swipe (pointer events)
  let startX=0, dx=0, dragging=false;
  const threshold = 40; // px
  function onDown(e){ 
    if (total - visibleCount <= 0) return;
    dragging=true; 
    startX = (e.touches? e.touches[0].clientX : e.clientX); 
    dx=0; 
  }
  function onMove(e){ 
    if(!dragging) return; 
    const x=(e.touches? e.touches[0].clientX : e.clientX); 
    dx = x-startX; 
    const card = slides[0];
    const gap = 26; // match CSS gap
    const step = card.offsetWidth + gap;
    const curX = -index * step + dx; 
    track.style.transform = `translate3d(${curX}px,0,0)`; 
  }
  function onUp(){ 
    if(!dragging) return; 
    dragging=false; 
    if(Math.abs(dx) > threshold){ 
      dx<0 ? next() : prev(); 
    } else { 
      goTo(index); 
    } 
  }
  viewport.addEventListener('pointerdown', onDown);
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);
  viewport.addEventListener('pointerleave', onUp);
  viewport.addEventListener('touchstart', onDown, {passive:true});
  viewport.addEventListener('touchmove', onMove, {passive:true});
  viewport.addEventListener('touchend', onUp);
  viewport.addEventListener('touchcancel', onUp);

  // Init
  setupSlider();
  window.addEventListener('resize', setupSlider);
})();

// ===== Hero background rotator =====
(function(){
  const root = document.querySelector('.hero-bg');
  if(!root) return;
  const layers = Array.from(root.querySelectorAll('.layer'));
  if(layers.length < 2) return;
  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(isReduced) return;
  let index = layers.findIndex(l => l.classList.contains('is-active'));
  if(index < 0) index = 0;
  setInterval(() => {
    layers[index].classList.remove('is-active');
    index = (index + 1) % layers.length;
    layers[index].classList.add('is-active');
  }, 5500);
})();

// ===== Generic rotating-photo teaser (e.g. home Team section avatars) =====
(function(){
  const roots = Array.from(document.querySelectorAll('.avatar-rotator'));
  if(!roots.length) return;
  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  roots.forEach(root => {
    const layers = Array.from(root.querySelectorAll('.layer'));
    if(layers.length < 2) return;
    if(isReduced) return;
    let index = layers.findIndex(l => l.classList.contains('is-active'));
    if(index < 0) index = 0;
    setInterval(() => {
      layers[index].classList.remove('is-active');
      index = (index + 1) % layers.length;
      layers[index].classList.add('is-active');
    }, 2200);
  });
})();

// ===== Member slider (Team / Member page) =====
(function(){
  const root = document.querySelector('#member-slider');
  if(!root) return;
  const track = root.querySelector('.member-track');
  const slides = Array.from(root.querySelectorAll('.member-plate'));
  const prevBtn = root.querySelector('.member-btn.prev');
  const nextBtn = root.querySelector('.member-btn.next');
  const viewport = root.querySelector('.member-viewport');
  const dotsWrap = document.querySelector('.member-dots');
  const total = slides.length;
  let index = 0;
  let visibleCount = 1;
  let autoTimer = null;
  let isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // This slider always shows one member card at a time, on every screen size.
  function getVisibleCount(){
    return 1;
  }

  function setupSlider(){
    visibleCount = getVisibleCount();
    const maxIndex = total - visibleCount;

    if (maxIndex <= 0) {
      root.classList.add('no-slide');
      track.style.transform = 'none';
      index = 0;
      dotsWrap.innerHTML = '';
      syncHeight();
      return;
    }

    root.classList.remove('no-slide');
    dotsWrap.innerHTML = '';
    const dotCount = maxIndex + 1;
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement('button');
      dot.setAttribute('role','tab');
      dot.setAttribute('aria-controls', `member-plate-${i+1}`);
      dot.id = `member-dot-${i+1}`;
      dot.title = `${i+1} / ${dotCount}`;
      dot.addEventListener('click', ()=> { goTo(i); });
      dotsWrap.appendChild(dot);
    }

    if (index > maxIndex) index = maxIndex;
    goTo(index);
  }

  function updateAria(){
    const maxIndex = total - visibleCount;
    slides.forEach((s,i)=>{ s.classList.toggle('current', i===index); });
    const dots = dotsWrap.querySelectorAll('[role="tab"]');
    dots.forEach((d,i)=> d.setAttribute('aria-selected', i===index ? 'true':'false'));
    prevBtn.disabled = (index===0);
    nextBtn.disabled = (index===maxIndex);
  }

  // The track stretches every slide to match its tallest sibling (default
  // flex cross-axis sizing), which left a lot of blank space below short
  // bios. .member-track now opts out of that stretch (align-items:flex-start
  // in CSS), and this measures only the active slide so the viewport can be
  // sized to it instead of to whichever member has the longest bio.
  function syncHeight(){
    const card = slides[index];
    if (!card) return;
    viewport.style.height = card.offsetHeight + 'px';
  }

  function goTo(i){
    const maxIndex = total - visibleCount;
    index = Math.max(0, Math.min(maxIndex, i));
    const card = slides[0];
    if (!card) return;
    const gap = 0;
    const step = card.offsetWidth + gap;
    track.style.transform = `translate3d(${-index * step}px,0,0)`;
    updateAria();
    syncHeight();
  }

  function next(){ const maxIndex = total - visibleCount; goTo(index < maxIndex ? index+1 : 0); }
  function prev(){ const maxIndex = total - visibleCount; goTo(index > 0 ? index-1 : maxIndex); }

  prevBtn.addEventListener('click', ()=>{ prev(); });
  nextBtn.addEventListener('click', ()=>{ next(); });

  viewport.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if(e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
  });

  let startX=0, dx=0, dragging=false;
  const threshold = 40;
  function onDown(e){
    if (total - visibleCount <= 0) return;
    dragging=true; startX = (e.touches? e.touches[0].clientX : e.clientX); dx=0;
  }
  function onMove(e){
    if(!dragging) return;
    const x=(e.touches? e.touches[0].clientX : e.clientX);
    dx = x-startX;
    const card = slides[0];
    const gap = 0;
    const step = card.offsetWidth + gap;
    track.style.transform = `translate3d(${-index * step + dx}px,0,0)`;
  }
  function onUp(){
    if(!dragging) return;
    dragging=false;
    if(Math.abs(dx) > threshold){ dx<0 ? next() : prev(); } else { goTo(index); }
  }
  viewport.addEventListener('pointerdown', onDown);
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);
  viewport.addEventListener('pointerleave', onUp);
  viewport.addEventListener('touchstart', onDown, {passive:true});
  viewport.addEventListener('touchmove', onMove, {passive:true});
  viewport.addEventListener('touchend', onUp);
  viewport.addEventListener('touchcancel', onUp);

  // Auto-advance (pause on hover/focus/hidden)
  function startAuto(){
    if(isReduced) return;
    stopAuto();
    autoTimer = setInterval(()=>{ next(); }, 5000);
  }
  function stopAuto(){ if(autoTimer){ clearInterval(autoTimer); autoTimer=null; } }
  root.addEventListener('mouseenter', stopAuto);
  root.addEventListener('mouseleave', startAuto);
  root.addEventListener('focusin', stopAuto);
  root.addEventListener('focusout', startAuto);
  document.addEventListener('visibilitychange', ()=> document.hidden ? stopAuto() : startAuto());

  setupSlider();
  startAuto();
  window.addEventListener('resize', () => {
    isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setupSlider();
  });
})();

