(function(){
  // Multi-item slider inspirado en slider-independent pero mostrando varios items por vista.
  const DATA_PATHS = ['public/carrucat.json','/public/carrucat.json','https://jfl4bur.github.io/Todogram/public/carrucat.json'];
  let items = [];
  let currentIndex = 0; // index of the left-most visible item
  let itemsPerView = 1;
  let itemWidth = 160;
  let gap = 20;
  let peek = 0;
  // Reduce min/max item width to make carousel items smaller by default
  const minItemWidth = 64;
  const maxItemWidth = 180;
  let isDragging = false;
  let dragStartX = 0;
  let dragDelta = 0;

  function q(sel, ctx){ return (ctx||document).querySelector(sel); }
  function qa(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

  function extractName(entry){
    try{
      const u = entry.urlCat || '';
      if(u.includes('genre=')){
        const m = u.match(/[?&]genre=([^&]+)/);
        if(m && m[1]) return decodeURIComponent(m[1]).replace(/\+/g,' ');
      }
      if(u.endsWith('/catalogo/') || u.endsWith('/catalogo')) return 'Todo el catálogo';
      if(entry.PortadaCat){
        const seg = entry.PortadaCat.split('/').pop();
        if(seg){
          const name = seg.replace(/\.[^/.]+$/,'').replace(/[-_]/g,' ');
          return name;
        }
      }
    }catch(e){ }
    return 'Género';
  }

  async function fetchJson(){
    for(const p of DATA_PATHS){
      try{
        const res = await fetch(p, {cache:'no-cache'});
        if(!res.ok) continue;
        const data = await res.json();
        if(Array.isArray(data)) return data;
      }catch(e){ }
    }
    return [];
  }

  function buildItems(container){
    container.innerHTML = '';
    items.forEach((it, idx)=>{
      const a = document.createElement('a');
      a.className = 'carrusel-generos-item';
      a.href = it.urlCat || '#';
      a.setAttribute('data-index', idx);
      a.setAttribute('role','link');

      const imgWrap = document.createElement('div');
      imgWrap.className = 'carrusel-generos-img';
      const img = document.createElement('img');
      // normalize and protect image src: encodeURI to handle non-ASCII filenames
      try{
        img.src = it.PortadaCat ? encodeURI(it.PortadaCat) : '';
      }catch(e){
        img.src = it.PortadaCat || '';
      }
      // debug: log src for troubleshooting and fallback on error
      img.addEventListener('error', ()=>{
        console.error('carrusel-genero: imagen no cargada:', img.src, it);
        // fallback to local todo.png if available
        try{ img.src = '/public/images/todo.png'; }catch(e){}
      });
      img.addEventListener('load', ()=>{
        // small debug to confirm load
        // console.log('carrusel-genero: imagen cargada', img.src);
      });
      img.alt = extractName(it);
      img.loading = 'lazy';
      imgWrap.appendChild(img);

      const label = document.createElement('div');
      label.className = 'carrusel-generos-label';
      label.textContent = extractName(it);

      a.appendChild(imgWrap);
      a.appendChild(label);
      container.appendChild(a);
    });
  }

  // Calculate responsive dimensions similar to slider-independent but for multiple items
  function calculateLayout(){
    const viewport = q('.carrusel-generos-viewport');
    const prevBtn = q('#carrusel-prev');
    if(!viewport) return;
    const vw = Math.max(320, viewport.clientWidth || viewport.getBoundingClientRect().width);

    // breakpoint-based targets (user asked to mimic slider-independent look)
    if(vw >= 1400){ itemsPerView = 7; gap = 28; }
    else if(vw >= 1200){ itemsPerView = 6; gap = 26; }
    else if(vw >= 1000){ itemsPerView = 5; gap = 24; }
    else if(vw >= 760){ itemsPerView = 4; gap = 20; }
    else if(vw >= 480){ itemsPerView = 3; gap = 18; }
    else { itemsPerView = 2; gap = 12; }

    // measure arrow width for peek calculation
  const arrowW = prevBtn && prevBtn.getBoundingClientRect ? Math.round(prevBtn.getBoundingClientRect().width) : 44;
  const arrowPadding = 12;
  // set global peek (how much of adjacent items is visible)
  peek = Math.min(Math.round(vw * 0.08), arrowW + arrowPadding);
  // ensure a minimum peek so that the buttons always sit above a visible piece of the adjacent item
  // guarantee at least ~55% of the arrow width is visible as peek
  try{ peek = Math.max(peek, Math.round(arrowW * 0.55)); }catch(e){}

  // Ensure gap isn't so large that the right-side peek disappears.
  // Compute a maximum sensible gap so itemsPerView of minimum width still fit with peeks.
  const minGapAllowed = 8;
  const maxGapAllowed = Math.max(minGapAllowed, Math.floor((vw - (peek * 2) - (itemsPerView * minItemWidth)) / Math.max(1, itemsPerView - 1)));
  if(gap > maxGapAllowed) gap = maxGapAllowed;

    // compute itemWidth to fit itemsPerView inside available area
    const available = vw - (peek * 2) - ((itemsPerView - 1) * gap);
    let w = Math.floor(available / itemsPerView);
    w = Math.max(minItemWidth, Math.min(maxItemWidth, w));

    // If the computed width is too large, reduce itemsPerView
    while(w * itemsPerView + gap * (itemsPerView - 1) > available + (peek*2) && itemsPerView > 1){
      itemsPerView--;
      w = Math.floor((vw - (peek * 2) - ((itemsPerView - 1) * gap)) / itemsPerView);
      w = Math.max(minItemWidth, Math.min(maxItemWidth, w));
    }

  itemWidth = w;

  // After itemWidth is known, ensure gap is small enough so right-side peek remains visible.
  // Compute remaining space for gaps: viewport minus peeks and items.
  const availableForGaps = vw - (peek * 2) - (itemWidth * itemsPerView);
  const maxGapBasedOnWidth = Math.floor(availableForGaps / Math.max(1, itemsPerView - 1));
  const minGapAllowed = 6;
  if(!isNaN(maxGapBasedOnWidth) && maxGapBasedOnWidth > 0){
    if(gap > maxGapBasedOnWidth){
      gap = Math.max(minGapAllowed, maxGapBasedOnWidth);
    }
  }

  // debug log to inspect values in console (pages computed here)
  const pages = Math.max(1, Math.ceil(items.length / itemsPerView));
  try{ console.info('carrusel-genero layout', { vw, itemsPerView, itemWidth, gap, peek, pages }); }catch(e){}

  // Apply sizes to DOM items
    const track = q('#carrusel-generos-track');
    const itemEls = qa('.carrusel-generos-item');
    itemEls.forEach(el => {
      el.style.width = itemWidth + 'px';
      el.style.flexBasis = itemWidth + 'px';
    });
    if(track) track.style.gap = gap + 'px';

  // remove any inline padding on viewport (avoid runtime style conflicts)
  try{ viewport.style.removeProperty('padding-left'); viewport.style.removeProperty('padding-right'); }catch(e){}
  // ensure track has no margins; we position via translate with a peek offset so items overflow visibly
  if(track) {
    track.style.marginLeft = '0px';
    track.style.marginRight = '0px';
  }

  // update pagination
  renderPagination(pages);
  // debug info
  console.log('CarruselGenero: layout', { vw, itemsPerView, itemWidth, gap, peek, pages });
  }

  function renderPagination(pages){
    const pag = q('#carrusel-generos-pagination');
    if(!pag) return;
    pag.innerHTML = '';
    for(let i=0;i<pages;i++){
      const dot = document.createElement('div');
      dot.className = 'carrusel-dot';
      dot.setAttribute('data-page', i);
      dot.title = 'Página ' + (i+1);
      dot.addEventListener('click', ()=>{
        // jump to start index of that page
        currentIndex = Math.min(items.length - itemsPerView, i * itemsPerView);
        updatePosition(true);
      });
      pag.appendChild(dot);
    }
    updatePaginationActive();
  }

  function updatePaginationActive(){
    qa('.carrusel-dot').forEach(d=>d.classList.remove('active'));
    const page = Math.floor(currentIndex / itemsPerView);
    const active = q(`.carrusel-dot[data-page="${page}"]`);
    if(active) active.classList.add('active');
  }

  function clampIndex(i){
    return Math.max(0, Math.min(i, Math.max(0, items.length - itemsPerView)));
  }

  function updatePosition(skipAnim){
    const track = q('#carrusel-generos-track');
    const viewport = q('.carrusel-generos-viewport');
    if(!track || !viewport) return;

  // Translate based on item widths; subtract peek so items overflow left and right appropriately
  const translate = currentIndex * (itemWidth + gap) - peek;
    if(skipAnim){
      track.style.transition = 'none';
      track.style.transform = `translateX(${-translate}px)`;
      // force reflow
      track.offsetHeight;
      track.style.transition = '';
    } else {
      track.style.transform = `translateX(${-translate}px)`;
    }
    updatePaginationActive();
  }

  function prev(){
    // advance by a full page (itemsPerView)
    currentIndex = clampIndex(currentIndex - itemsPerView);
    updatePosition();
  }
  function next(){
    // advance by a full page (itemsPerView)
    currentIndex = clampIndex(currentIndex + itemsPerView);
    updatePosition();
  }

  function attachControls(){
    const prevBtn = q('#carrusel-prev');
    const nextBtn = q('#carrusel-next');
    if(prevBtn) prevBtn.addEventListener('click', prev);
    if(nextBtn) nextBtn.addEventListener('click', next);
    const section = q('.carrusel-generos-section');
    if(section){
      section.tabIndex = 0;
      section.addEventListener('keydown', (e)=>{
        if(e.key === 'ArrowLeft') prev();
        if(e.key === 'ArrowRight') next();
      });
    }
  }

  function onPointerDown(e){
    isDragging = true;
    dragStartX = e.clientX || e.touches && e.touches[0].clientX || 0;
    dragDelta = 0;
    const track = q('#carrusel-generos-track');
    if(track) track.style.transition = 'none';
  }
  function onPointerMove(e){
    if(!isDragging) return;
    const x = e.clientX || e.touches && e.touches[0].clientX || 0;
    dragDelta = x - dragStartX;
    const track = q('#carrusel-generos-track');
    if(track){
      // account for peek via translate offset; drag base uses same formula as translate
      const base = currentIndex * (itemWidth + gap) - peek;
      track.style.transform = `translateX(${-(base) + dragDelta}px)`;
    }
  }
  function onPointerUp(e){
    if(!isDragging) return;
    isDragging = false;
    const threshold = Math.max(10, itemWidth * 0.25);
    if(dragDelta < -threshold){
      currentIndex = clampIndex(currentIndex + itemsPerView);
    } else if(dragDelta > threshold){
      currentIndex = clampIndex(currentIndex - itemsPerView);
    }
    const track = q('#carrusel-generos-track');
    if(track) track.style.transition = '';
    updatePosition();
  }

  function observeResize(){
    let t;
    window.addEventListener('resize', ()=>{
      clearTimeout(t);
      t = setTimeout(()=>{
        calculateLayout();
        updatePosition(true);
      },120);
    });
  }

  async function init(){
    const track = q('#carrusel-generos-track');
    if(!track) return;
    items = await fetchJson();
    if(!items || items.length===0){
      track.innerHTML = '<div style="color:#fff;padding:12px">No hay géneros</div>';
      return;
    }
    buildItems(track);
    attachControls();

    // attach pointer events for drag
    const viewport = q('.carrusel-generos-viewport');
    if(viewport){
      viewport.addEventListener('mousedown', onPointerDown);
      viewport.addEventListener('touchstart', onPointerDown, {passive:true});
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('touchmove', onPointerMove, {passive:true});
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchend', onPointerUp);
    }

    calculateLayout();
    updatePosition(true);
    observeResize();
  }

  // Auto init
  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(()=>{ init(); }, 80);
  });

  // expose control
  window.carruselGenero = { init, recalc: calculateLayout };
})();
