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
        // prefer absolute github URL if current origin seems to be a hosting that redirects
        const res = await fetch(p, {cache:'no-cache'});
        if(!res.ok){
          console.warn('carrusel-genero: fetch no ok for', p, res.status);
          continue;
        }
        const data = await res.json();
        if(Array.isArray(data)) return data;
      }catch(e){
        console.warn('carrusel-genero: fetch error for', p, e && e.message ? e.message : e);
      }
    }

    // Fallback: if JSON couldn't be fetched (CORS/hosting issues), build a local default list
    console.warn('carrusel-genero: usando fallback local para carrucat.json');
    const base = '/public/images/';
    const fallback = [
      { PortadaCat: base + 'todo.png', urlCat: '/catalogo/' },
      { PortadaCat: base + 'Acción.png', urlCat: '/catalogo/#catalogo?tab=Películas&genre=Acción' },
      { PortadaCat: base + 'Animación.png', urlCat: '/catalogo/#catalogo?tab=Películas&genre=Animación' },
      { PortadaCat: base + 'Animes.png', urlCat: '/catalogo/#catalogo?tab=Animes&genre=Todo+el+cat%C3%A1logo' },
      { PortadaCat: base + 'Aventura.png', urlCat: '/catalogo/#catalogo?tab=Películas&genre=Aventura' },
      { PortadaCat: base + 'Bélica.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=B%C3%A9lica' },
      { PortadaCat: base + 'CienciaFiccion.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Ciencia+Ficci%C3%B3n' },
      { PortadaCat: base + 'Comedia.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Comedia' },
      { PortadaCat: base + 'Crimen.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Crimen' },
      { PortadaCat: base + 'Documentales.png', urlCat: '/catalogo/#catalogo?tab=Documentales&genre=Todo+el+cat%C3%A1logo' },
      { PortadaCat: base + 'Drama.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Drama' },
      { PortadaCat: base + 'Familia.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Familia' },
      { PortadaCat: base + 'Fantasía.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Fantas%C3%ADa' },
      { PortadaCat: base + 'Historia.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Historia' },
      { PortadaCat: base + 'Misterio.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Misterio' },
      { PortadaCat: base + 'Música.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=M%C3%BAsica' },
      { PortadaCat: base + 'PelículasTV.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Pel%C3%ADculas+TV' },
      { PortadaCat: base + 'Romance.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Romance' },
      { PortadaCat: base + 'Suspense.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Suspense' },
      { PortadaCat: base + 'Terror.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Terror' },
      { PortadaCat: base + 'Western.png', urlCat: '/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Western' }
    ];
    return fallback;
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
  const minGapBaseline = 8;
  const maxGapAllowed = Math.max(minGapBaseline, Math.floor((vw - (peek * 2) - (itemsPerView * minItemWidth)) / Math.max(1, itemsPerView - 1)));
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

  // set viewport padding so the left/right "peek" is visible and native scrolling can be used
  try{
    viewport.style.paddingLeft = peek + 'px';
    viewport.style.paddingRight = peek + 'px';
  }catch(e){}
  // ensure track has no explicit margins; sizes/gap control spacing
  if(track){ track.style.marginLeft = '0px'; track.style.marginRight = '0px'; }

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

    // Calculate final scroll position based on currentIndex and step size
    const step = itemWidth + gap;
    const finalScroll = currentIndex * step;
    try{
      viewport.scrollTo({ left: finalScroll, behavior: skipAnim ? 'auto' : 'smooth' });
    }catch(e){
      viewport.scrollLeft = finalScroll;
    }
    updatePaginationActive();
  }

  function scrollToPage(direction){
    const viewport = q('.carrusel-generos-viewport');
    const track = q('#carrusel-generos-track');
    if(!viewport || !track) return;

    const containerWidth = viewport.clientWidth;
    const firstItem = track.querySelector('.carrusel-generos-item');
    if(!firstItem) return;
    const itemRect = firstItem.getBoundingClientRect();
    const itemW = Math.round(itemRect.width);

    // estimate gap using second element
    let gapEst = gap;
    const second = firstItem.nextElementSibling;
    if(second){
      const secondRect = second.getBoundingClientRect();
      gapEst = Math.round(secondRect.left - (itemRect.left + itemRect.width));
      if(isNaN(gapEst) || gapEst < 0) gapEst = gap;
    }

    const stepSize = itemW + gapEst;
    const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize));
    const currentFirst = Math.floor(viewport.scrollLeft / stepSize);

    let targetIndex;
    if(direction === 'prev') targetIndex = Math.max(0, currentFirst - itemsPerViewport);
    else targetIndex = currentFirst + itemsPerViewport;

    const totalItems = track.querySelectorAll('.carrusel-generos-item').length;
    const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);
    targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));

    currentIndex = targetIndex;
    updatePosition(false);
  }

  function prev(){ scrollToPage('prev'); }
  function next(){ scrollToPage('next'); }

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

  // Use native scrolling for drag/touch. Listen scroll to update pagination and currentIndex.
  let scrollDebounce;
  function onViewportScroll(){
    const viewport = q('.carrusel-generos-viewport');
    if(!viewport) return;
    // debounce updates while scrolling
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(()=>{
      const step = itemWidth + gap;
      const idx = Math.round((viewport.scrollLeft || 0) / step);
      currentIndex = clampIndex(idx);
      updatePaginationActive();
    }, 80);
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

    // attach native scroll handling so touch/drag feels like other carousels
    const viewport = q('.carrusel-generos-viewport');
    if(viewport){
      viewport.addEventListener('scroll', onViewportScroll, {passive:true});
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
