(function(){
  // Carrusel de géneros. Carga public/carrucat.json y crea un slider circular con peeking lateral.
  const DATA_PATHS = ['public/carrucat.json','/public/carrucat.json','https://jfl4bur.github.io/Todogram/public/carrucat.json'];
  let items = [];
  let currentPage = 0;
  let itemsPerPage = 1;
  let itemWidth = 140;
  let gap = 24; // default gap, will be adjusted per breakpoint
  const minItemWidth = 92;
  const maxItemWidth = 240;

  function q(sel, ctx){ return (ctx||document).querySelector(sel); }
  function qa(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

  function extractName(entry){
    // Prefer genre param if exists
    try{
      const u = entry.urlCat || '';
      if(u.includes('genre=')){
        const m = u.match(/[?&]genre=([^&]+)/);
        if(m && m[1]) return decodeURIComponent(m[1]).replace(/\+/g,' ');
      }
      // fallback for common labels
      if(u.endsWith('/catalogo/') || u.endsWith('/catalogo')) return 'Todo el catálogo';
      // fallback to filename from PortadaCat
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
      }catch(e){/* ignore and try next */}
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
      // accessibility: link should open in same tab per request
      a.setAttribute('role','link');
      const imgWrap = document.createElement('div');
      imgWrap.className = 'carrusel-generos-img';
      const img = document.createElement('img');
      img.src = it.PortadaCat || '';
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

  function computeLayout(){
    const viewport = q('.carrusel-generos-viewport');
    const track = q('#carrusel-generos-track');
    const prevBtn = q('#carrusel-prev');
    const nextBtn = q('#carrusel-next');
    if(!viewport || !track) return;
    const containerWidth = Math.max(320, viewport.clientWidth || viewport.getBoundingClientRect().width);

    // Choose gap and target items per breakpoint to match the reference design
    if(containerWidth >= 1400){ gap = 28; }
    else if(containerWidth >= 1100){ gap = 26; }
    else if(containerWidth >= 900){ gap = 22; }
    else if(containerWidth >= 600){ gap = 20; }
    else { gap = 14; }

    // Desired peek: approximate space for arrows overlay
    const arrowW = (prevBtn && prevBtn.getBoundingClientRect) ? Math.round(prevBtn.getBoundingClientRect().width) : 44;
    const arrowPadding = 12;
    let desiredPeek = Math.min(Math.round(containerWidth * 0.10), arrowW + arrowPadding);
    desiredPeek = Math.max(12, desiredPeek);

    // Target visible items heuristic (matches image 2 feel)
    let targetVisible = 7; // desktop large
    if(containerWidth < 1400) targetVisible = 6;
    if(containerWidth < 1100) targetVisible = 5;
    if(containerWidth < 900) targetVisible = 4;
    if(containerWidth < 600) targetVisible = 3;
    if(containerWidth < 420) targetVisible = 2;

    // available space excluding peek both sides
    const available = containerWidth - (2*desiredPeek);

    // Compute item width so approx targetVisible fit, then clamp
    let chosenW = Math.floor((available - (targetVisible-1)*gap) / targetVisible);
    if(chosenW > maxItemWidth){
      // if too large reduce to max and increase items per page
      chosenW = maxItemWidth;
    }
    if(chosenW < minItemWidth){
      chosenW = minItemWidth;
    }

    // Deduce how many items actually fit with chosenW
    const chosenN = Math.max(1, Math.min(items.length, Math.floor((available + gap) / (chosenW + gap))));

  itemsPerPage = chosenN;
  itemWidth = chosenW;

    // Apply sizes
    const itemEls = qa('.carrusel-generos-item');
    itemEls.forEach((el, i)=>{
      el.style.width = itemWidth + 'px';
      el.style.flexBasis = itemWidth + 'px';
      el.style.height = (itemWidth + 24) + 'px'; // leave space for label
    });
    track.style.gap = gap + 'px';

    // If first page we don't want left peek (primer enlace flush), otherwise show peek both sides
    const leftPeek = (currentPage === 0) ? 0 : desiredPeek;
    viewport.style.paddingLeft = leftPeek + 'px';
    viewport.style.paddingRight = desiredPeek + 'px';

    // recompute pages
    const pages = Math.max(1, Math.ceil(items.length / itemsPerPage));
    if(currentPage >= pages) currentPage = pages-1;
    renderPagination(pages);
    updatePosition();
  }

  function renderPagination(pages){
    const pag = q('#carrusel-generos-pagination');
    if(!pag) return;
    pag.innerHTML = '';
    for(let i=0;i<pages;i++){
      const dot = document.createElement('div');
      dot.className = 'carrusel-dot' + (i===currentPage? ' active':'');
      dot.setAttribute('data-page', i);
      dot.title = 'Página ' + (i+1);
      dot.addEventListener('click', ()=>{
        currentPage = i; updatePosition();
      });
      pag.appendChild(dot);
    }
  }

  function updatePosition(){
    const track = q('#carrusel-generos-track');
    const viewport = q('.carrusel-generos-viewport');
    if(!track || !viewport) return;
    const totalItems = items.length;
  const fullStep = itemsPerPage * (itemWidth + gap);

  // When there is no left peek (first page), desired = 0
  // Otherwise we offset by desiredPeek so arrows overlay the peeking items
  const viewportRect = viewport.getBoundingClientRect();
  const desiredPeek = parseInt(window.getComputedStyle(viewport).paddingRight) || 0;
  let desired = currentPage * fullStep - ((currentPage === 0) ? 0 : desiredPeek);

  // compute maximum translate so last page doesn't leave blank space
  const totalWidth = totalItems * (itemWidth + gap) - gap; // total width of items
  const visibleWidth = viewport.clientWidth;
  const maxTranslate = Math.max(0, totalWidth - visibleWidth + 0); // clamp
  if(desired > maxTranslate) desired = maxTranslate;
  if(desired < 0) desired = 0;

  track.style.transform = `translateX(${-desired}px)`;
    // update active dot
    qa('.carrusel-dot').forEach(d=>d.classList.remove('active'));
    const active = q(`.carrusel-dot[data-page="${currentPage}"]`);
    if(active) active.classList.add('active');
  }

  function prev(){
    currentPage = Math.max(0, currentPage-1);
    updatePosition();
  }
  function next(){
    const pages = Math.max(1, Math.ceil(items.length / itemsPerPage));
    currentPage = Math.min(pages-1, currentPage+1);
    updatePosition();
  }

  function attachControls(){
    const prevBtn = q('#carrusel-prev');
    const nextBtn = q('#carrusel-next');
    if(prevBtn) prevBtn.addEventListener('click', prev);
    if(nextBtn) nextBtn.addEventListener('click', next);
    // keyboard support: left/right when focus inside section
    const section = q('.carrusel-generos-section');
    if(section){
      section.tabIndex = 0;
      section.addEventListener('keydown', (e)=>{
        if(e.key === 'ArrowLeft') prev();
        if(e.key === 'ArrowRight') next();
      });
    }
  }

  function observeResize(){
    let t;
    window.addEventListener('resize', ()=>{
      clearTimeout(t);
      t = setTimeout(()=>{
        computeLayout();
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
    computeLayout();
    observeResize();
  }

  // Auto init
  document.addEventListener('DOMContentLoaded', ()=>{
    // Defer slightly to ensure DOM insertion
    setTimeout(()=>{ init(); }, 80);
  });

  // Expose for debugging
  window.carruselGenero = { init };
})();
