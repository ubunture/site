// ===== Mobile menu =====
    const nav = document.querySelector('.nav');
    const btn = document.querySelector('.menu-btn');
    const menu = document.getElementById('menu');
    btn?.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });

    // ===== Active link on scroll =====
    const sectionIds = ['about','project','team','news','support'];
    const links = Array.from(menu.querySelectorAll('a'));
    const io = new IntersectionObserver(entries => {
      const vis = entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!vis) return;
      const id = vis.target.id;
      links.forEach(a=>a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    }, { rootMargin: '-40% 0px -55% 0px', threshold:[0,.2,.5,1]});
    sectionIds.forEach(id=>{ const el = document.getElementById(id); if(el) io.observe(el); });

    // ===== Reveal-on-scroll =====
    const reve = document.querySelectorAll('.reveal');
    const rio = new IntersectionObserver(es => {
      es.forEach(e => { if(e.isIntersecting){ e.target.classList.add('show'); rio.unobserve(e.target); } });
    }, { rootMargin:'0px 0px -10% 0px', threshold:.15 });
    reve.forEach(el => rio.observe(el));

    // Close menu after click (mobile)
    links.forEach(a=>a.addEventListener('click', ()=>{ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }));
