// catalogo.js - muestra un catálogo completo en modal pantalla completa
// Dependencias: espera que en la página exista #catalogo-overlay, #catalogo-close, #catalogo-list, #catalogo-tabs, #catalogo-filter-dropdown

(function(){
  const overlay = document.getElementById('catalogo-overlay');
  const closeBtn = document.getElementById('catalogo-close');
  const listEl = document.getElementById('catalogo-list');
  const tabsEl = document.getElementById('catalogo-tabs');
  const filterBtn = document.getElementById('catalogo-filter-btn');
  const filterDropdown = document.getElementById('catalogo-filter-dropdown');
  const tiendaBtn = document.getElementById('btn-tienda');
  const tiendaBtnMobile = document.getElementById('btn-tienda-mobile');

  // Estado
  let data = [];
  let genres = new Set();
  let genreMap = {}; // slug -> display name
  let currentTab = 'peliculas';
  let currentGenre = 'all';

  // Helpers
  function slugify(s){
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  }

  function openCatalogo(){
    overlay.style.display = 'block';
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('no-scroll');
    // set hash
    if (location.hash !== '#catalogo') location.hash = '#catalogo';
  }

  function closeCatalogo(){
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('no-scroll');
    // remove hash or go back
    if (location.hash.startsWith('#catalogo')) history.back();
  }

  function setTab(tab){
    currentTab = tab;
    // update UI
    Array.from(tabsEl.querySelectorAll('.catalogo-tab')).forEach(b=>{
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    // set hash: #catalogo/peliculas o #catalogo/series etc
    const hash = `#catalogo/${tab}` + (currentGenre && currentGenre!=='all' ? `/${currentGenre}` : '');
    if (location.hash !== hash) location.hash = hash;
    persistState();
    renderList();
  }

  function setGenre(genre){
    currentGenre = genre;
    // highlight in dropdown
    Array.from(filterDropdown.querySelectorAll('[data-genre]')).forEach(el=>{
      el.classList.toggle('selected', el.dataset.genre === genre);
    });
    // update hash
    const hash = `#catalogo/${currentTab}` + (genre && genre!=='all' ? `/${genre}` : '');
    if (location.hash !== hash) location.hash = hash;
    persistState();
    renderList();
  }

  function renderGenres(){
    filterDropdown.innerHTML = '';
    const all = document.createElement('div');
    all.className = 'catalogo-filter-item';
    all.dataset.genre = 'all';
    all.textContent = 'Todo el catálogo';
    all.addEventListener('click', ()=> setGenre('all'));
    filterDropdown.appendChild(all);

    Array.from(genres).sort().forEach(g=>{
      const s = slugify(g);
      genreMap[s] = g;
      const d = document.createElement('div');
      d.className = 'catalogo-filter-item';
      d.dataset.genre = s;
      d.textContent = g;
      d.addEventListener('click', ()=> setGenre(s));
      filterDropdown.appendChild(d);
    });
  }

  function renderList(){
    listEl.innerHTML = '';
    // filter by tab and genre
    const filtered = data.filter(item=>{
      // item.Type: "movie"/"series" etc (guess from data.json structure)
      const type = (item.Type || item.type || '').toLowerCase();
      let okType = true;
      if (currentTab === 'peliculas') okType = type === 'movie' || type === 'pelicula' || item.Category === 'Películas';
      if (currentTab === 'series') okType = type === 'series' || type === 'show' || item.Category === 'Series';
      if (currentTab === 'documentales') okType = (item.Genre||'').toLowerCase().includes('documental') || (type==='documentary');
      if (currentTab === 'animes') okType = (item.Genre||'').toLowerCase().includes('anime') || (item.IsAnime);
      if (!okType) return false;
      if (currentGenre && currentGenre !== 'all'){
        const itemGenres = (item.Genre || item.genres || '').toString().toLowerCase();
        return itemGenres.includes(currentGenre.replace(/-/g,' ')) || itemGenres.includes(currentGenre);
      }
      return true;
    });

    if (filtered.length === 0){
      listEl.innerHTML = '<p class="catalogo-empty">No hay resultados</p>';
      return;
    }

    filtered.forEach(item=>{
      const card = document.createElement('article');
      card.className = 'catalogo-card';
      card.dataset.id = item.id || item.ID || item.imdb_id || '';
      const img = document.createElement('img');
      img.className = 'catalogo-poster';
      img.src = item.Poster || item.PosterURL || item.poster || (item.Images && item.Images[0]) || '';
      img.alt = item.Title || item.title || '';
      card.appendChild(img);
      const title = document.createElement('h3');
      title.className = 'catalogo-card-title';
      title.textContent = item.Title || item.title || '';
      card.appendChild(title);

      // hover behaviour: show quick overlay
      card.addEventListener('mouseenter', ()=>{
        card.classList.add('hover');
      });
      card.addEventListener('mouseleave', ()=>{
        card.classList.remove('hover');
      });

      // click to open details modal existente
      card.addEventListener('click', ()=>{
        // reutilizar detalles modal existente: disparar evento personalizado con item data
        const evt = new CustomEvent('catalogo:openDetails', { detail: item });
        window.dispatchEvent(evt);
      });

      listEl.appendChild(card);
    });
  }

  // Cargar data.json
  function loadData(){
    const dataUrl = '/public/data.json';
    fetch(dataUrl).then(r=>r.json()).then(j=>{
      data = Array.isArray(j) ? j : (j.items || j.results || []);
      // extract genres
      data.forEach(it=>{
        const g = it.Genre || it.genre || it.genres;
        if (g){
          if (Array.isArray(g)) g.forEach(x=>{ if (x && x.toString().trim()) genres.add(x.toString().trim()); }); else g.toString().split(',').forEach(x=>{ const t = x.trim(); if(t) genres.add(t); });
        }
      });
      renderGenres();
      // parse hash to set initial tab/genre
      parseHash();
    }).catch(err=>{
      console.error('Error cargando data.json para catálogo', err);
    });
  }

  function parseHash(){
    const h = location.hash || '';
    if (!h.startsWith('#catalogo')) return;
    // formats: #catalogo, #catalogo/peliculas, #catalogo/peliculas/accion
    const parts = h.replace(/^#/,'').split('/');
    // parts[0] === 'catalogo'
    const tab = parts[1] || localStorage.getItem('catalogo:lastTab') || 'peliculas';
    const genre = parts[2] || localStorage.getItem('catalogo:lastGenre') || 'all';
    setTab(tab);
    setGenre(genre);
    openCatalogo();
  }

  // Persistencia: guardar última selección
  function persistState(){
    try{
      localStorage.setItem('catalogo:lastTab', currentTab);
      localStorage.setItem('catalogo:lastGenre', currentGenre || 'all');
    }catch(e){/* noop */}
  }

  // Eventos
  if (tiendaBtn) tiendaBtn.addEventListener('click', (e)=>{ e.preventDefault(); location.hash = '#catalogo/peliculas'; });
  if (tiendaBtnMobile) tiendaBtnMobile.addEventListener('click', (e)=>{ e.preventDefault(); location.hash = '#catalogo/peliculas'; });

  window.addEventListener('hashchange', ()=>{
    const h = location.hash || '';
    if (h.startsWith('#catalogo')){
      parseHash();
    } else {
      // si salimos del hash catalogo, cerramos
      if (overlay.style.display === 'block') closeCatalogo();
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeCatalogo);
  overlay.addEventListener('click', (e)=>{
    if (e.target === overlay) closeCatalogo();
  });

  // tabs
  Array.from(tabsEl.querySelectorAll('.catalogo-tab')).forEach(b=>{
    b.addEventListener('click', ()=> setTab(b.dataset.tab));
  });

  // filter dropdown toggle
  filterBtn.addEventListener('click', ()=>{
    const hidden = filterDropdown.getAttribute('aria-hidden') === 'true';
    filterDropdown.setAttribute('aria-hidden', String(!hidden));
  });

  // listen custom event to open details modal
  window.addEventListener('catalogo:openDetails', (e)=>{
    const item = e.detail;
    // disparar a detalles modal existente: si hay función global openDetailsModal usada por el carrusel
    if (window.openDetailsModal && typeof window.openDetailsModal === 'function'){
      window.openDetailsModal(item);
    } else {
      // fallback: mostrar alert
      alert(item.Title || item.title || 'Detalle');
    }
  });

  // Inicialización
  document.addEventListener('DOMContentLoaded', ()=>{
    loadData();
  });

})();
