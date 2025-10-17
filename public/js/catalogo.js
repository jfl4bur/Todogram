// catalogo.js - muestra un catálogo completo en modal pantalla completa
// Dependencias: espera que en la página exista #catalogo-overlay, #catalogo-close, #catalogo-list, #catalogo-tabs, #catalogo-filter-dropdown

(function(){
  const overlay = document.getElementById('catalogo-overlay');
  const closeBtn = document.getElementById('catalogo-close');
  const listEl = document.getElementById('catalogo-list');
  const tabsEl = document.getElementById('catalogo-tabs');
  const filterBtn = document.getElementById('catalogo-filter-btn');
  const filterDropdown = document.getElementById('catalogo-filter-dropdown');
  // header buttons se buscarán y enlazarán después de que el header se inyecte
  let tiendaBtn = null;
  let tiendaBtnMobile = null;

  // Estado
  let data = [];
  let genres = new Set();
  let genreMap = {}; // slug -> display name
  let currentTab = 'peliculas';
  let currentGenre = 'all';
  let lastHashProcessed = null;
  let initialized = false;

  // Helpers
  function slugify(s){
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  }

  function openCatalogo(){
    // Abrir catálogo en pantalla completa (no debe tocar el hash aquí para evitar bucles)
    if (overlay.style.display === 'block') return; // ya abierto
    console.log('Catalogo: openCatalogo()');
    overlay.style.display = 'block';
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('no-scroll');
  }

  function closeCatalogo(){
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('no-scroll');
    // Quitar el hash sin navegar hacia atrás (replaceState no dispara hashchange)
    if (location.hash.startsWith('#catalogo')) {
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch(e) { /* noop */ }
    }
  }

  function setTab(tab, suppressHash=false){
    currentTab = tab;
    // update UI
    Array.from(tabsEl.querySelectorAll('.catalogo-tab')).forEach(b=>{
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    // set hash: #catalogo/peliculas o #catalogo/series etc
    const hash = `#catalogo/${tab}` + (currentGenre && currentGenre!=='all' ? `/${currentGenre}` : '');
    if (!suppressHash && location.hash !== hash) location.hash = hash;
    persistState();
    renderList();
  }

  function setGenre(genre, suppressHash=false){
    // allow suppressing hash changes when called as part of parseHash
    currentGenre = genre;
    // highlight in dropdown
    Array.from(filterDropdown.querySelectorAll('[data-genre]')).forEach(el=>{
      el.classList.toggle('selected', el.dataset.genre === genre);
    });
    // update hash
    const hash = `#catalogo/${currentTab}` + (genre && genre!=='all' ? `/${genre}` : '');
    if (!suppressHash && location.hash !== hash) location.hash = hash;
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
    // Seguir la misma estrategia que carousel.js/details-modal.js
    // 1) usar window.sharedData o window.allData si existen
    // 2) intentar fetch(DATA_URL) (DATA_URL definido en index.html)
    // 3) si success, asignar window.sharedData = data
    return (async function(){
      try{
        // Esperar por window.sharedData/window.allData (race condition con otros módulos)
        if (window.allData && Array.isArray(window.allData) && window.allData.length > 0){
          data = window.allData;
          console.log('Catalogo: usando window.allData');
        } else if (window.sharedData && Array.isArray(window.sharedData) && window.sharedData.length > 0){
          data = window.sharedData;
          console.log('Catalogo: usando window.sharedData');
        } else {
          // Intentar esperar a que otro módulo (carousel/slider) cargue la data y la exponga
          const maxAttempts = 15;
          let found = false;
          for (let i=0;i<maxAttempts;i++){
            if (window.sharedData && Array.isArray(window.sharedData) && window.sharedData.length > 0){
              data = window.sharedData; found = true; console.log('Catalogo: detected window.sharedData after wait'); break;
            }
            if (window.allData && Array.isArray(window.allData) && window.allData.length > 0){
              data = window.allData; found = true; console.log('Catalogo: detected window.allData after wait'); break;
            }
            await new Promise(r=>setTimeout(r,100));
          }
          if (!found){
            // No lo encontró, intentar fetch a DATA_URL
            const url = typeof DATA_URL !== 'undefined' ? DATA_URL : '/public/data.json';
            console.log('Catalogo: Haciendo fetch de datos desde', url);
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('Respuesta no OK: '+resp.status);
            const j = await resp.json();
            data = Array.isArray(j) ? j : (j.items || j.results || j);
            try{ window.sharedData = data; window.allData = data; }catch(e){}
          }
        }

        // extract genres
        data.forEach(it=>{
          const g = it.Genre || it.genre || it.genres;
          if (g){
            if (Array.isArray(g)) g.forEach(x=>{ if (x && x.toString().trim()) genres.add(x.toString().trim()); }); else g.toString().split(',').forEach(x=>{ const t = x.trim(); if(t) genres.add(t); });
          }
        });
        renderGenres();
        // parse hash to set initial tab/genre (abrir modal si corresponde)
        parseHash();
      }catch(err){
        console.error('Catalogo: fallo cargando datos', err);
        // Intentar rutas alternativas similares a details-modal
        const candidates = ['/public/data.json','/data.json','public/data.json','./public/data.json','./data.json','../public/data.json'];
        for (const path of candidates){
          try{
            const r = await fetch(path);
            if (!r.ok) { console.warn('Catalogo: ruta',path,'respondió',r.status); continue; }
            const jj = await r.json();
            data = Array.isArray(jj) ? jj : (jj.items || jj.results || jj);
            try{ window.sharedData = data; window.allData = data; }catch(e){}
            data.forEach(it=>{
              const g = it.Genre || it.genre || it.genres;
              if (g){
                if (Array.isArray(g)) g.forEach(x=>{ if (x && x.toString().trim()) genres.add(x.toString().trim()); }); else g.toString().split(',').forEach(x=>{ const t = x.trim(); if(t) genres.add(t); });
              }
            });
            renderGenres();
            parseHash();
            return;
          }catch(e){
            console.warn('Catalogo: fallo en ruta alternativa',path,e);
            continue;
          }
        }
        console.error('Catalogo: No se pudo cargar data.json en ninguna ruta probada');
      }
    })();
  }

  function parseHash(){
    const h = location.hash || '';
    if (!h.startsWith('#catalogo')) return;
    if (h === lastHashProcessed) return; // ya procesado, evitar bucles
    console.log('Catalogo: parseHash ->', h);
    // formats: #catalogo, #catalogo/peliculas, #catalogo/peliculas/accion
    const parts = h.replace(/^#/,'').split('/');
    // parts[0] === 'catalogo'
    const tab = parts[1] || localStorage.getItem('catalogo:lastTab') || 'peliculas';
    const genre = parts[2] || localStorage.getItem('catalogo:lastGenre') || 'all';
    // Cuando procesamos el hash queremos actualizar la UI sin volver a escribir el hash
    setTab(tab, true);
    setGenre(genre, true);
    openCatalogo();
    lastHashProcessed = h;
  }

  // Persistencia: guardar última selección
  function persistState(){
    try{
      localStorage.setItem('catalogo:lastTab', currentTab);
      localStorage.setItem('catalogo:lastGenre', currentGenre || 'all');
    }catch(e){/* noop */}
  }

  // Eventos para abrir el catálogo desde el header.
  function bindHeaderButtons(){
    tiendaBtn = document.getElementById('btn-tienda');
    tiendaBtnMobile = document.getElementById('btn-tienda-mobile');
    // También soportar enlaces que tengan href="#catalogo"
    const anyCatalogLinks = Array.from(document.querySelectorAll('a[href="#catalogo"], a[href^="#catalogo/"]'));

    if (tiendaBtn) {
      tiendaBtn.addEventListener('click', (e)=>{ e.preventDefault(); ensureInit().then(()=> { location.hash = '#catalogo/peliculas'; }); });
      console.log('Catalogo: bindHeaderButtons -> tiendaBtn bound');
    }
    if (tiendaBtnMobile) {
      tiendaBtnMobile.addEventListener('click', (e)=>{ e.preventDefault(); ensureInit().then(()=> { location.hash = '#catalogo/peliculas'; }); });
      console.log('Catalogo: bindHeaderButtons -> tiendaBtnMobile bound');
    }
    anyCatalogLinks.forEach(a=>{
      a.addEventListener('click', (e)=>{ e.preventDefault(); ensureInit().then(()=> { location.hash = '#catalogo/peliculas'; }); });
    });
    console.log('Catalogo: bindHeaderButtons -> anyCatalogLinks bound:', anyCatalogLinks.length);
  }

  window.addEventListener('hashchange', ()=>{
    const h = location.hash || '';
    if (h.startsWith('#catalogo')){
      // asegurar inicialización antes de procesar hash
      ensureInit().then(()=> parseHash()).catch(()=> parseHash());
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
    // Bind header buttons después de que header.js haya inyectado el header
    bindHeaderButtons();
    // Si la URL ya contiene #catalogo al cargar la página, inicializamos en background
    const h = location.hash || '';
    if (h.startsWith('#catalogo')){
      // inicializar y luego procesar hash
      ensureInit().then(()=> parseHash()).catch(()=> parseHash());
    }
  });

  // Garantizar inicialización única: carga de datos y marcas iniciales
  function ensureInit(){
    if (initialized) return Promise.resolve();
    return loadData().then(()=>{ initialized = true; }).catch(err=>{ console.warn('Catalogo: ensureInit fallo', err); initialized = true; });
  }

})();
