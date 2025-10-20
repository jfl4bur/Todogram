// Página de catálogo (sin modal) - public/js/catalogo.js
(async function(){
    const CATALOG_HASH = '#catalogo';

    function normalizeText(text){
        if(!text) return '';
        try{ return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''); }
        catch(e){ return String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'); }
    }

    async function loadData(){
        if(window.sharedData) return window.sharedData;
        try{ const res = await fetch(DATA_URL); if(!res.ok) throw new Error('No se pudo cargar data.json'); const data = await res.json(); window.sharedData = data; return data; }
        catch(e){ console.error('catalogo load error', e); return []; }
    }

    function buildItemFromData(d, index){
        const rawGenres = d['Géneros'] || d['Género'] || '';
        // Normalizar lista de géneros (divisores comunes: · , / | ;)
        const genresList = String(rawGenres).split(/·|\||,|\/|;/).map(s=>s.trim()).filter(Boolean);
        return {
            id: d['ID TMDB'] ? String(d['ID TMDB']) : `i_${index}`,
            title: d['Título'] || d['Título original'] || 'Sin título',
            originalTitle: d['Título original'] || '',
            description: d['Synopsis'] || d['Sinopsis'] || d['Descripción'] || '',
            posterUrl: d['Portada'] || '',
            postersUrl: d['Carteles'] || '',
            backgroundUrl: d['Carteles'] || d['Portada'] || '',
            category: d['Categoría'] || 'Películas',
            // item.genre es la propiedad que esperan los modales (una cadena legible)
            genre: genresList.length ? genresList[0] : '',
            // mantener también la lista completa
            genres: rawGenres || '',
            genresList: genresList,
            year: d['Año'] || '',
            duration: d['Duración'] || '',
            videoIframe: d['Video iframe'] || d['Video iframe 1'] || d['Video iframe1'] || '',
            videoUrl: d['Video'] || d['Enlace'] || d['Ver Película'] || '',
            trailerUrl: d['Trailer'] || d['TrailerUrl'] || '',
            cast: d['Reparto principal'] || d['Reparto'] || '',
            director: d['Director(es)'] || d['Director'] || '',
            writers: d['Escritor(es)'] || d['Escritor'] || '',
            tmdbUrl: d['TMDB'] || d['TMDB URL'] || d['TMDB_URL'] || '',
            audiosCount: d['Audios'] ? String(d['Audios']).split(',').length : 0,
            subtitlesCount: d['Subtítulos'] ? String(d['Subtítulos']).split(',').length : 0,
            audioList: d['Audios'] ? String(d['Audios']).split(',').map(s=>s.trim()) : [],
            subtitleList: d['Subtítulos'] ? String(d['Subtítulos']).split(',').map(s=>s.trim()) : [],
            raw: d
        };
    }

    function extractGenres(data, category){
        const s = new Set();
        (data||[]).forEach(d=>{
            if(category && d['Categoría'] && d['Categoría']!==category) return;
            const gens = d['Géneros'] || '';
            gens.split('·').map(g=>g.trim()).filter(Boolean).forEach(g=>s.add(g));
        });
        return Array.from(s).sort();
    }

    // state
    const state = { allItems: [], filteredItems: [], renderedCount:0, initialRows:5, subsequentRows:3, itemsPerRow:0, initialBatchSize:0, subsequentBatchSize:0, loading:false };

    function computeItemsPerRow(grid){
        if(!grid) return 6;
        const containerWidth = grid.clientWidth || document.documentElement.clientWidth;
        const rootStyles = getComputedStyle(document.documentElement);
        const itemW = parseInt(rootStyles.getPropertyValue('--item-width')) || 194;
        // Prefer column-gap (grid) otherwise fallback to gap
        const gridStyles = getComputedStyle(grid);
        const gapValue = gridStyles.getPropertyValue('column-gap') || gridStyles.getPropertyValue('gap') || rootStyles.getPropertyValue('--catalogo-gap') || '18px';
        const gap = parseInt(gapValue) || 18;
        // compute how many items fit per row
        return Math.max(1, Math.floor((containerWidth + gap) / (itemW + gap)));
    }

    function findExistingItemById(id){
        if(!id) return null;
        // Candidate sources where carousels keep their data
        const sources = [
            window.carousel && window.carousel.moviesData,
            window.seriesCarousel && window.seriesCarousel.seriesData,
            window.documentalesCarousel && window.documentalesCarousel.docuData,
            window.animesCarousel && window.animesCarousel.animeData,
            window.episodiosCarousel && window.episodiosCarousel.episodiosData,
            window.episodiosAnimesCarousel && window.episodiosAnimesCarousel.episodiosData,
            (window.sliderIndependent && typeof window.sliderIndependent.getSlidesData === 'function' && window.sliderIndependent.getSlidesData())
        ];
        for(const src of sources){
            if(!src || !Array.isArray(src)) continue;
            const found = src.find(x => String(x.id) === String(id));
            if(found) return found;
        }
        // fallback to catalog state
        const foundLocal = state.allItems.find(x => String(x.id) === String(id));
        return foundLocal || null;
    }

    function createCard(it){
        const d = document.createElement('div');
        d.className='catalogo-item';
        d.dataset.itemId = it.id;
        d.setAttribute('role','listitem');
        // Use poster-sized loader while image loads (same loader used in peliculas carousel)
        d.innerHTML = `
            <div class="poster-container">
                <img class="catalogo-card-image" loading="lazy" src="${it.posterUrl||'https://via.placeholder.com/194x271'}" alt="${it.title}">
                <div class="loader"><i class="fas fa-spinner"></i></div>
            </div>
            <div class="catalogo-item-title" style="display:none;">${it.title}</div>
        `;

        // Wire image load to hide loader and reveal title/image
        try {
            const imgEl = d.querySelector('.catalogo-card-image');
            const loaderEl = d.querySelector('.loader');
            const titleEl = d.querySelector('.catalogo-item-title');
            if (imgEl) {
                imgEl.style.opacity = '0';
                imgEl.onload = function() {
                    try { imgEl.style.opacity = '1'; } catch(e){}
                    try { if (loaderEl) loaderEl.style.display = 'none'; } catch(e){}
                    try { if (titleEl) titleEl.style.display = ''; } catch(e){}
                };
                imgEl.onerror = function() {
                    // hide loader on error and still show title
                    try { if (loaderEl) loaderEl.style.display = 'none'; } catch(e){}
                    try { if (titleEl) titleEl.style.display = ''; } catch(e){}
                    imgEl.src = imgEl.src; // no-op but keeps behavior
                };
            }
        } catch (e) { console.warn('catalogo: error wiring image loader', e); }

        // Helper to open details modal from any input (click, pointer, touch)
        const openDetails = () => {
            if(window.detailsModal && typeof window.detailsModal.show==='function'){
                const norm = normalizeText(it.title);
                try{
                    const existing = findExistingItemById(it.id);
                    const itemToShow = existing || it;
                    try { window.activeItem = itemToShow; } catch(e) { /* ignore */ }
                    try { if(!window.videoModal && typeof VideoModal === 'function') window.videoModal = new VideoModal(); } catch(e) {}
                    try {
                        const raw = itemToShow && itemToShow.raw ? itemToShow.raw : {};
                        const candidates = [
                            itemToShow.videoUrl,
                            itemToShow.videoIframe,
                            itemToShow.videoIframe1,
                            raw['Video iframe'],
                            raw['Video iframe 1'],
                            raw['Video'],
                            raw['Ver Pel\u00edcula'],
                            raw['Enlace']
                        ].filter(Boolean);
                        if (candidates.length) {
                            const preferred = candidates[0];
                            if (!itemToShow.videoUrl) itemToShow.videoUrl = preferred;
                            if (!itemToShow.videoIframe) itemToShow.videoIframe = preferred;
                        }
                        if (!itemToShow.trailerUrl) itemToShow.trailerUrl = itemToShow.trailerUrl || raw['Trailer'] || raw['TrailerUrl'] || '';
                        if (!itemToShow.shareUrl) {
                            try { itemToShow.shareUrl = (typeof window.generateShareUrl === 'function') ? window.generateShareUrl(itemToShow, window.location.href) : null; } catch(e) { itemToShow.shareUrl = null; }
                            if (!itemToShow.shareUrl) {
                                try { const u = new URL(window.location.href); u.hash = `id=${encodeURIComponent(itemToShow.id)}`; itemToShow.shareUrl = u.toString(); } catch(e) { itemToShow.shareUrl = window.location.href; }
                            }
                        }
                    } catch (e) { console.warn('catalogo: fallo al normalizar campos de video/share para item', e); }

                    // Persist state using the same hash format that carousels use (#id=...&title=...)
                    const detailHash = `id=${encodeURIComponent(itemToShow.id)}&title=${encodeURIComponent(norm)}`;
                    if (window.location.hash !== `#${detailHash}`) history.pushState({}, '', `#${detailHash}`);
                    try {
                        if (window.hoverModal) {
                            try { if (typeof window.hoverModal.cancelHide === 'function') window.hoverModal.cancelHide(); } catch(e){}
                            try { if (window.hoverModal.modalOverlay) { window.hoverModal.modalOverlay.style.display = 'none'; window.hoverModal.modalOverlay.style.pointerEvents = 'none'; } } catch(e){}
                        }
                        const genericOverlay = document.getElementById('modal-overlay');
                        if (genericOverlay) { genericOverlay.style.display = 'none'; genericOverlay.style.pointerEvents = 'none'; }
                    } catch(err) { console.warn('catalogo: fallo al limpiar overlays antes de abrir detailsModal', err); }

                    const res = window.detailsModal.show(itemToShow, d);
                    if(res && typeof res.then === 'function') {
                        res.catch((err) => {
                            console.error('detailsModal.show rejected', err);
                            try { if(window.detailsModal && typeof window.detailsModal.close === 'function') window.detailsModal.close(); } catch(e){}
                        });
                    }
                }catch(e){
                    console.error('Error al abrir detailsModal', e);
                    try { if(window.detailsModal && typeof window.detailsModal.close === 'function') window.detailsModal.close(); } catch(e){}
                }
            }
        };

        // Click handler (desktop)
        d.addEventListener('click', ()=>{
            if(window.detailsModal && typeof window.detailsModal.show==='function'){
                openDetails();
            }
        });

        // Tap vs scroll detection using pointer events
        // We record pointerdown coords, if pointer moves more than threshold we cancel the tap.
        let tapCancelled = false;
        let pointerId = null;
        let startX = 0, startY = 0;
        const MOVE_THRESHOLD = 8; // pixels

        d.addEventListener('pointerdown', (ev) => {
            if (ev.isPrimary === false) return;
            tapCancelled = false;
            pointerId = ev.pointerId;
            startX = ev.clientX;
            startY = ev.clientY;
            // capture pointer to continue receiving move/up even if finger leaves element
            try { d.setPointerCapture(pointerId); } catch (e) {}
        }, { passive: true });

        d.addEventListener('pointermove', (ev) => {
            if (ev.pointerId !== pointerId) return;
            const dx = Math.abs(ev.clientX - startX);
            const dy = Math.abs(ev.clientY - startY);
            if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
                tapCancelled = true;
            }
        }, { passive: true });

        d.addEventListener('pointerup', (ev) => {
            if (ev.pointerId !== pointerId) return;
            try { d.releasePointerCapture(pointerId); } catch (e) {}
            pointerId = null;
            if (!tapCancelled) {
                // Treat as tap
                openDetails();
            }
        }, { passive: true });

        // Fallback for older touch-only browsers: use touchstart/touchmove/touchend
        d.addEventListener('touchstart', (ev) => {
            const t = ev.touches && ev.touches[0];
            if (!t) return;
            tapCancelled = false;
            startX = t.clientX;
            startY = t.clientY;
        }, { passive: true });

        d.addEventListener('touchmove', (ev) => {
            const t = ev.touches && ev.touches[0];
            if (!t) return;
            const dx = Math.abs(t.clientX - startX);
            const dy = Math.abs(t.clientY - startY);
            if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) tapCancelled = true;
        }, { passive: true });

        d.addEventListener('touchend', (ev) => {
            if (!tapCancelled) openDetails();
        }, { passive: true });

        return d;
    }

    function resetPagination(grid){ state.itemsPerRow = computeItemsPerRow(grid); state.initialBatchSize = Math.max(1, state.itemsPerRow * state.initialRows); state.subsequentBatchSize = Math.max(1, state.itemsPerRow * state.subsequentRows); state.renderedCount = 0; grid.innerHTML=''; }

    function renderSlice(grid, start, end){ const f = document.createDocumentFragment(); for(let i=start;i<end&&i<state.filteredItems.length;i++){ f.appendChild(createCard(state.filteredItems[i])); } grid.appendChild(f); }

    function appendNextBatch(grid){
        if(state.loading) return;
        if(state.renderedCount >= state.filteredItems.length) return;
        state.loading = true;
        const isInitial = state.renderedCount === 0;
        const batch = isInitial ? state.initialBatchSize : state.subsequentBatchSize;
        const start = state.renderedCount;
        const end = Math.min(state.renderedCount + batch, state.filteredItems.length);
        renderSlice(grid, start, end);
        state.renderedCount = end;
        if (start === 0) {
            const sk = document.querySelector('#catalogo-skeleton-page'); if (sk) sk.style.display = 'none';
            console.info(`Catalogo: cargados ${state.renderedCount} items (inicial)`);
        } else {
            console.info(`Catalogo: cargados ${end - start} items, total ${state.renderedCount}`);
        }
        state.loading = false;
    }

    function applyFiltersAndRender(grid, data, tab, genre){
        state.allItems = (data||[]).map(buildItemFromData);
        state.filteredItems = state.allItems.filter(it=>{
            // category mismatch
            if(tab && it.category && it.category!==tab) return false;

            // Exclude episode rows from the main listings for certain tabs (Series, Animes, Documentales)
            // Many dataset rows representing episodes include fields like 'Título episodio' or similar.
            if(tab && (tab === 'Series' || tab === 'Animes' || tab === 'Documentales')){
                try{
                    const raw = it.raw || {};
                    const episodeKeys = ['Título episodio', 'Título episodio completo', 'Título episodio 1', 'Episodio', 'Título episodio (completo)'];
                    const hasEpisode = episodeKeys.some(k => raw[k] && String(raw[k]).trim() !== '');
                    if(hasEpisode) return false;
                }catch(e){ /* ignore and continue */ }
            }

            if(genre && genre!=='Todo el catálogo'){
                const gens = (it.genres||'').split('·').map(x=>x.trim()); if(!gens.includes(genre)) return false;
            }
            return true;
        });
        resetPagination(grid);
        appendNextBatch(grid);
    }

    function parseCatalogHash(){
        const raw = window.location.hash || '';
        if(!raw) return null;
        // Case 1: catalog-specific hash like '#catalogo?tab=...&id=...'
        if(raw.startsWith(CATALOG_HASH)){
            const q = raw.substring(CATALOG_HASH.length);
            if(!q) return {};
            const p = new URLSearchParams(q.replace(/^\?/,''));
            return { tab:p.get('tab')||null, genre:p.get('genre')||null, id:p.get('id')||null, title:p.get('title')||null };
        }
        // Case 2: plain hash used by carousels: '#id=...&title=...'
        const plain = raw.substring(1);
        if(plain.startsWith('id=') || plain.includes('id=')){
            const p = new URLSearchParams(plain);
            return { tab:null, genre:null, id:p.get('id')||null, title:p.get('title')||null };
        }
        return null;
    }

    function updateCatalogHash(tab, genre, preserve=false){ const params = new URLSearchParams(); if(tab) params.set('tab', tab); if(genre) params.set('genre', genre); const newHash = `${CATALOG_HASH}?${params.toString()}`; if(preserve) history.replaceState({}, '', newHash); else history.pushState({}, '', newHash); }

    async function initPage(rootSelector='#catalogo-page-root'){
        const root = document.querySelector(rootSelector); if(!root){ console.error('Catalogo: root no encontrado', rootSelector); return; }
        // Ensure modals exist (catalog page might be loaded standalone)
        try{ if(!window.hoverModal && typeof HoverModal === 'function') window.hoverModal = new HoverModal(); }catch(e){}
        try{ if(!window.detailsModal && typeof DetailsModal === 'function') window.detailsModal = new DetailsModal(); }catch(e){}
        try{ if(!window.videoModal && typeof VideoModal === 'function') window.videoModal = new VideoModal(); }catch(e){}
        try{ if(!window.shareModal && typeof ShareModal === 'function') window.shareModal = new ShareModal(); }catch(e){}
        root.innerHTML = `\n            <div class="catalogo-page">\n                <div class="catalogo-page-header">\n                    <div class="catalogo-controls">\n                        <div class="catalogo-genre-dropdown" id="catalogo-genre-dropdown-page">\n                            <button id="catalogo-genre-button-page" aria-haspopup="true" aria-expanded="false">Todo el catálogo ▾</button>\n                            <div id="catalogo-genre-list-page" class="catalogo-genre-list" style="display:none" role="menu"></div>\n                        </div>\n                    </div>\n                    <div class="catalogo-tabs" id="catalogo-tabs-page">\n                        <button data-tab="Películas" class="catalogo-tab active">Películas</button>\n                        <button data-tab="Series" class="catalogo-tab">Series</button>\n                        <button data-tab="Documentales" class="catalogo-tab">Documentales</button>\n                        <button data-tab="Animes" class="catalogo-tab">Animes</button>\n                    </div>\n                </div>\n                <div class="catalogo-page-body">\n                    <div class="skeleton-catalogo" id="catalogo-skeleton-page" style="display:flex;gap:12px;flex-wrap:wrap;">\n                        <div class="skeleton-item-catalogo"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                    </div>\n                    <div class="catalogo-grid" id="catalogo-grid-page" role="list" aria-busy="false"></div>\n                </div>\n            </div>\n        `;

        const tabsContainer = document.getElementById('catalogo-tabs-page');
        const genreBtn = document.getElementById('catalogo-genre-button-page');
        const genreList = document.getElementById('catalogo-genre-list-page');
    const grid = document.getElementById('catalogo-grid-page');
    if(grid){ grid.style.columnGap = grid.style.columnGap || getComputedStyle(document.documentElement).getPropertyValue('--catalogo-gap') || '18px'; grid.style.rowGap = grid.style.rowGap || getComputedStyle(document.documentElement).getPropertyValue('--catalogo-row-gap') || '48px'; }

        const data = await loadData();

        // Global fallback: si alguna promesa sin catch provoca un rejection, intentar limpiar modales abiertos
        if (!window.__catalogo_unhandledrejection_installed) {
            window.addEventListener('unhandledrejection', (ev) => {
                console.error('Unhandled rejection capturado en catálogo:', ev.reason);
                try { if (window.detailsModal && typeof window.detailsModal.close === 'function') window.detailsModal.close(); } catch(e){}
                try { if (window.shareModal && typeof window.shareModal.close === 'function') window.shareModal.close(); } catch(e){}
                document.body.style.overflow = 'auto';
            });
            window.__catalogo_unhandledrejection_installed = true;
        }

    function populateGenresForTabPage(tab, currentGenre){
        // currentGenre optional; if not provided, derive from the visible button text
        const gens = extractGenres(data, tab);
        genreList.innerHTML = '';
        const inferred = (typeof currentGenre === 'string' && currentGenre) ? currentGenre : (genreBtn && genreBtn.textContent ? genreBtn.textContent.replace(' ▾','') : 'Todo el catálogo');

        const allBtn = document.createElement('button');
        allBtn.textContent = 'Todo el catálogo';
        allBtn.classList.add('genre-item');
        if (inferred === 'Todo el catálogo') allBtn.classList.add('selected');
        allBtn.addEventListener('click', ()=>{
            // remove selected from others
            genreList.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));
            allBtn.classList.add('selected');
            genreBtn.textContent = 'Todo el catálogo ▾';
            genreList.style.display = 'none';
            updateCatalogHash(tab, 'Todo el catálogo');
            applyFiltersAndRender(grid, data, tab, 'Todo el catálogo');
        });
        genreList.appendChild(allBtn);

        gens.forEach(g=>{
            const b = document.createElement('button');
            b.textContent = g;
            b.classList.add('genre-item');
            if (inferred === g) b.classList.add('selected');
            b.addEventListener('click', ()=>{
                genreList.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));
                b.classList.add('selected');
                genreBtn.textContent = g + ' ▾';
                genreList.style.display = 'none';
                updateCatalogHash(tab, g);
                applyFiltersAndRender(grid, data, tab, g);
            });
            genreList.appendChild(b);
        });
    }

        tabsContainer.querySelectorAll('.catalogo-tab').forEach(btn=>{ btn.addEventListener('click', ()=>{ tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); const tab = btn.dataset.tab; populateGenresForTabPage(tab); const currentGenre = genreBtn.textContent.replace(' ▾','') || 'Todo el catálogo'; updateCatalogHash(tab, currentGenre); applyFiltersAndRender(grid, data, tab, currentGenre); }); });

        genreBtn.addEventListener('click', ()=>{
            const isHidden = genreList.style.display === 'none' || getComputedStyle(genreList).display === 'none';
            if (isHidden) {
                // Ensure list is populated and the current selection is applied when opening
                try {
                    const activeTabBtn = tabsContainer.querySelector('.catalogo-tab.active');
                    const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'Películas';
                    const currentGenre = (genreBtn && genreBtn.textContent) ? genreBtn.textContent.replace(' ▾','') : 'Todo el catálogo';
                    populateGenresForTabPage(activeTab, currentGenre);
                } catch (e) { /* ignore and continue */ }
            }
            genreList.style.display = isHidden ? 'grid' : 'none';
            genreBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        });

        const initial = parseCatalogHash();
        // Determine initial tab. If the hash includes a tab, use it.
        // If the hash only contains an id (from clicking an item), infer the tab/category from the raw data.
        let tab = 'Películas';
        let genre = 'Todo el catálogo';
        if (initial) {
            if (initial.tab) tab = initial.tab;
            if (initial.genre) genre = initial.genre;
        }

        // If hash contains only id (no tab specified), try to infer the category from the data
        if (initial && initial.id && (!initial.tab || initial.tab === null)) {
            try {
                // Build a quick map from data to find the item's category
                const tempItems = (data||[]).map(buildItemFromData);
                const found = tempItems.find(x => String(x.id) === String(initial.id));
                if (found && found.category) {
                    tab = found.category;
                    console.log('Catalogo: inferred tab from item id ->', tab);
                    // Also set genre to 'Todo el catálogo' unless we can infer differently
                    genre = 'Todo el catálogo';
                }
            } catch (e) { console.warn('catalogo: no se pudo inferir categoría desde id en hash', e); }
        }

        populateGenresForTabPage(tab);
        tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=> x.classList.toggle('active', x.dataset.tab===tab));
        genreBtn.textContent = genre + ' ▾';
        applyFiltersAndRender(grid, data, tab, genre);

        // Helper: try to open details modal for an item id present in the hash.
        function openDetailsForId(id, title){
            if(!id) return;
            const decodedTitle = title ? decodeURIComponent(title) : null;
            const normalize = (t) => normalizeText(String(t||''));

            // find index in filteredItems matching id and normalized title when possible
            let idx = -1;
            for(let i=0;i<state.filteredItems.length;i++){
                const it = state.filteredItems[i];
                if(String(it.id) === String(id)){
                    if(decodedTitle){
                        if(normalize(it.title) === normalize(decodedTitle)) { idx = i; break; }
                    } else { idx = i; break; }
                }
            }
            if(idx === -1) return;

            // ensure item is rendered (may require loading more batches)
            const tryOpen = () => {
                if(state.renderedCount > idx){
                    const el = grid.querySelector(`.catalogo-item[data-item-id="${CSS.escape(id)}"]`);
                    const item = findExistingItemById(id) || state.allItems.find(x=>String(x.id)===String(id));
                    if(el){
                        try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch(e){}
                    }
                    if((el || !grid) && item && window.detailsModal && typeof window.detailsModal.show === 'function'){
                        try { window.detailsModal.show(item, el); } catch(e){ console.error('catalogo openDetailsForId error', e); }
                    }
                    return;
                }
                // not rendered yet -> append next batch and retry shortly
                if(state.renderedCount < state.filteredItems.length){
                    appendNextBatch(grid);
                    setTimeout(tryOpen, 120);
                }
            };
            tryOpen();
        }

        // If initial hash includes an id, attempt to open the details modal for it
        if(initial && initial.id){
            // slight delay to ensure initial batch has been appended
            setTimeout(()=> openDetailsForId(initial.id, initial.title), 150);
        }

    // lazy load: listen to window scroll so long pages trigger loading
    let lazyTimer=null;
    function onCatalogScrollWindow(){ const threshold=700; const distanceFromBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight); if(distanceFromBottom < threshold){ if(lazyTimer) clearTimeout(lazyTimer); lazyTimer = setTimeout(()=>{ appendNextBatch(grid); lazyTimer=null; }, 120); } }
    window.addEventListener('scroll', onCatalogScrollWindow, { passive:true });
    if(grid) grid.addEventListener('scroll', ()=> onCatalogScrollWindow());

        // resize
        let resizeTimer=null; function onCatalogResize(){ if(resizeTimer) clearTimeout(resizeTimer); resizeTimer = setTimeout(()=>{ state.itemsPerRow = computeItemsPerRow(grid); state.initialBatchSize = Math.max(1, state.itemsPerRow * state.initialRows); state.subsequentBatchSize = Math.max(1, state.itemsPerRow * state.subsequentRows); if(state.renderedCount < Math.min(state.filteredItems.length, state.initialBatchSize)) appendNextBatch(grid); }, 120); }
        window.addEventListener('resize', onCatalogResize);

        // hash change: update filters and optionally open details if id present
        window.addEventListener('hashchange', ()=>{
            const parsed = parseCatalogHash();
            if(parsed){
                if(parsed.tab){
                    const tab = parsed.tab || 'Películas';
                    const genre = parsed.genre || 'Todo el catálogo';
                    tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=> x.classList.toggle('active', x.dataset.tab===tab));
                    genreBtn.textContent = genre + ' ▾';
                    populateGenresForTabPage(tab);
                    applyFiltersAndRender(grid, data, tab, genre);
                } else if(parsed.id && (!parsed.tab || parsed.tab === null)){
                    // infer category from data for this id
                    try {
                        const tempItems = (data||[]).map(buildItemFromData);
                        const found = tempItems.find(x => String(x.id) === String(parsed.id));
                        if (found && found.category) {
                            const tab = found.category || 'Películas';
                            const genre = 'Todo el catálogo';
                            tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=> x.classList.toggle('active', x.dataset.tab===tab));
                            genreBtn.textContent = genre + ' ▾';
                            populateGenresForTabPage(tab);
                            applyFiltersAndRender(grid, data, tab, genre);
                        }
                    } catch (e) { console.warn('catalogo: no se pudo inferir categoría desde id en hash (hashchange)', e); }
                }
                if(parsed.id){
                    // attempt to open the details modal for this id
                    setTimeout(()=> openDetailsForId(parsed.id, parsed.title), 150);
                }
            }
        });

    document.addEventListener('click', (e)=>{ if(!e.target.closest('.catalogo-genre-dropdown')){ genreList.style.display='none'; genreBtn.setAttribute('aria-expanded','false'); } });

        // Wrap createCard so we can later replace behaviour if needed; keep it lightweight (no per-item hover listeners)
        const originalCreateCard = createCard;
        createCard = function(it){
            return originalCreateCard(it);
        };

        // Delegated hover handlers: funcionan para items ya renderizados y para elementos que se agreguen posteriormente
        if (grid && !grid.__hover_delegation_installed) {
            // Show hover with a delay (match carousels behaviour)
            const HOVER_SHOW_DELAY = 900; // ms - same delay used in carousels
            grid.addEventListener('mouseover', (e) => {
                const itemEl = e.target.closest('.catalogo-item');
                if (!itemEl || !grid.contains(itemEl)) return;
                const itemId = itemEl.dataset.itemId;
                if (!itemId) return;
                const item = findExistingItemById(itemId) || state.allItems.find(x => String(x.id) === String(itemId));
                // clear any previous timer on this element
                try { if (itemEl._hoverTimer) { clearTimeout(itemEl._hoverTimer); itemEl._hoverTimer = null; } } catch(e){}
                if (item && window.hoverModal && typeof window.hoverModal.show === 'function') {
                    // schedule showing the hover modal after a short delay to match carousel behaviour
                    itemEl._hoverTimer = setTimeout(() => {
                        try { window.hoverModal.show(item, itemEl); if(window.hoverModal.cancelHide) window.hoverModal.cancelHide(); } catch(err) { console.error('hoverModal.show error', err); }
                        itemEl._hoverTimer = null;
                    }, HOVER_SHOW_DELAY);
                }
            });

            grid.addEventListener('mouseout', (e) => {
                const itemEl = e.target.closest('.catalogo-item');
                // clear any scheduled show timer for the element we left
                try { if (itemEl && itemEl._hoverTimer) { clearTimeout(itemEl._hoverTimer); itemEl._hoverTimer = null; } } catch(e){}
                const related = e.relatedTarget;
                if (related && related.closest && related.closest('.catalogo-item')) return;
                if (window.hoverModal && (typeof window.hoverModal.hide === 'function' || typeof window.hoverModal.close === 'function')) {
                    try { if(window.hoverModal.hide) window.hoverModal.hide(250); else window.hoverModal.close(); } catch(err) { console.error('hoverModal.hide error', err); }
                }
            });
            grid.__hover_delegation_installed = true;
        }
    }

    // Ensure initPage runs whether script is placed before or after DOMContentLoaded
    function safeInit(){ try{ initPage(); }catch(e){ console.error('catalogo page init error', e); } }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeInit);
    } else {
        // already loaded
        safeInit();
    }

    // expose a minimal API to allow manual init if needed
    window.Catalogo = { initPage };

})();
