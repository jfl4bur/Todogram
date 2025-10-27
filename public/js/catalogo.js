// Página de catálogo (sin modal) - public/js/catalogo.js
(async function(){
    const CATALOG_HASH = '#catalogo';

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
            // split on common separators: middle dot, pipe, comma, slash, semicolon
            gens.split(/·|\||,|\/|;/).map(g=>g.trim()).filter(Boolean).forEach(g=>s.add(g));
        });
        return Array.from(s).sort();
    }

    // state
    const state = { allItems: [], filteredItems: [], renderedCount:0, initialRows:5, subsequentRows:3, itemsPerRow:0, initialBatchSize:0, subsequentBatchSize:0, loading:false, currentQuery: '' };

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

    // Safe helper to find a rendered .catalogo-item by data-item-id without assuming CSS.escape exists
    function querySelectorByDataId(container, id){
        if(!container) return null;
        try{
            if(typeof CSS !== 'undefined' && typeof CSS.escape === 'function'){
                const sel = `.catalogo-item[data-item-id="${CSS.escape(String(id))}"]`;
                return container.querySelector(sel);
            }
            // Fallback: try naive escaping of double quotes and backslashes
            const naive = String(id).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
            const sel2 = `.catalogo-item[data-item-id="${naive}"]`;
            try { return container.querySelector(sel2); } catch(e) { /* continue to linear scan */ }
        } catch(e) { /* continue to linear scan */ }
        // Final fallback: linear scan by dataset
        const items = container.querySelectorAll('.catalogo-item');
        for(const it of items){ if(it.dataset && String(it.dataset.itemId) === String(id)) return it; }
        return null;
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
        `;

        // Wire image load to hide loader and reveal title/image
        try {
            const imgEl = d.querySelector('.catalogo-card-image');
            const loaderEl = d.querySelector('.loader');
            if (imgEl) {
                // start hidden to allow fade-in
                try { imgEl.style.opacity = '0'; } catch(e){}

                const hideLoader = () => { try { if (loaderEl) loaderEl.style.display = 'none'; } catch(e){} };
                const showImage = () => { try { imgEl.style.opacity = '1'; } catch(e){} };

                const onImageLoaded = function() {
                    showImage();
                    hideLoader();
                };

                const onImageError = function() {
                    // hide loader on error
                    hideLoader();
                };

                imgEl.addEventListener('load', onImageLoaded);
                imgEl.addEventListener('error', onImageError);

                // If the image was already cached/loaded before handlers were attached,
                // call the load handler immediately when appropriate.
                try {
                    if (imgEl.complete && imgEl.naturalWidth && imgEl.naturalWidth > 0) {
                        // already loaded
                        onImageLoaded();
                    }
                } catch(e){}

                // Failsafe: if load events never fire (rare), hide loader after 5s
                try {
                    setTimeout(() => { try { if (loaderEl && loaderEl.style && loaderEl.style.display !== 'none') loaderEl.style.display = 'none'; } catch(e){} }, 5000);
                } catch(e){}
            }
        } catch (e) { console.warn('catalogo: error wiring image loader', e); }

        // Helper to open details modal from any input (click, pointer, touch)
        const openDetails = () => {
            // Use the same simple flow as carousels: find an existing canonical item if available
            // and delegate entirely to DetailsModal.show so it performs normalization, URL updates
            // and UI wiring. Avoid mutating global overlays or window.activeItem here.
            if (window.detailsModal && typeof window.detailsModal.show === 'function') {
                try {
                    const existing = findExistingItemById(it.id);
                    const itemToShow = existing || it;
                    // Instrumentación: log y asegurar window.activeItem antes de delegar
                    try { window.activeItem = itemToShow; } catch(e){}
                    try { console.debug && console.debug('catalogo.openDetails -> calling detailsModal.show', { source: 'catalogo', id: itemToShow.id, title: itemToShow.title }); } catch(e){}
                    const res = window.detailsModal.show(itemToShow, d);
                    if (res && typeof res.then === 'function') {
                        res.catch((err) => {
                            console.error('detailsModal.show rejected', err);
                            try { if (window.detailsModal && typeof window.detailsModal.close === 'function') window.detailsModal.close(); } catch (e) {}
                        });
                    }
                } catch (e) {
                    console.error('Error al abrir detailsModal', e);
                    try { if (window.detailsModal && typeof window.detailsModal.close === 'function') window.detailsModal.close(); } catch (e) {}
                }
            }
        };

        // Click handler (desktop) - ignore non-left clicks (right-click/contextmenu)
        d.addEventListener('click', (e) => {
            // If the event has a button property and it's not the primary (0), ignore
            try { if (typeof e.button !== 'undefined' && e.button !== 0) return; } catch (err) {}
            if(window.detailsModal && typeof window.detailsModal.show==='function'){
                openDetails();
            }
        });

        // Tap vs scroll detection using pointer events with long-press suppression
        // We record pointerdown coords, cancel the tap if move threshold exceeded or long-press detected.
        let tapCancelled = false;
        let pointerId = null;
        let startX = 0, startY = 0;
        const MOVE_THRESHOLD = 8; // pixels
        let longPressTimer = null;
        let longPressed = false;
        const LONG_PRESS_MS = 500; // long-press threshold
        let lastPointerType = null;

        function clearLongPress() {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            longPressed = false;
        }

        d.addEventListener('pointerdown', (ev) => {
            if (ev.isPrimary === false) return;
            tapCancelled = false;
            longPressed = false;
            lastPointerType = ev.pointerType || null;
            pointerId = ev.pointerId;
            startX = ev.clientX;
            startY = ev.clientY;
            // capture pointer to continue receiving move/up even if finger leaves element
            try { d.setPointerCapture(pointerId); } catch (e) {}
            // start long-press timer to suppress long-press taps and context menu
            try {
                clearLongPress();
                longPressTimer = setTimeout(() => { longPressed = true; tapCancelled = true; }, LONG_PRESS_MS);
            } catch (e) {}
        }, { passive: true });

        d.addEventListener('pointermove', (ev) => {
            if (ev.pointerId !== pointerId) return;
            const dx = Math.abs(ev.clientX - startX);
            const dy = Math.abs(ev.clientY - startY);
            if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
                tapCancelled = true;
                clearLongPress();
            }
        }, { passive: true });

        d.addEventListener('pointerup', (ev) => {
            if (ev.pointerId !== pointerId) return;
            try { d.releasePointerCapture(pointerId); } catch (e) {}
            pointerId = null;
            clearLongPress();
            if (!tapCancelled && !longPressed) {
                // Treat as tap
                // debounce per element to avoid duplicate opens across events
                try {
                    const now = Date.now();
                    if (!d._lastOpenTime || (now - d._lastOpenTime) > 400) {
                        d._lastOpenTime = now;
                        openDetails();
                    }
                } catch (e) { openDetails(); }
            }
        }, { passive: true });

        d.addEventListener('pointercancel', (ev) => {
            if (ev.pointerId === pointerId) {
                try { d.releasePointerCapture(pointerId); } catch (e) {}
                pointerId = null;
            }
            tapCancelled = true;
            clearLongPress();
        });

        // Fallback for older touch-only browsers: use touchstart/touchmove/touchend/touchcancel
        d.addEventListener('touchstart', (ev) => {
            const t = ev.touches && ev.touches[0];
            if (!t) return;
            tapCancelled = false;
            longPressed = false;
            startX = t.clientX;
            startY = t.clientY;
            // start long-press timer
            clearLongPress();
            longPressTimer = setTimeout(() => { longPressed = true; tapCancelled = true; }, LONG_PRESS_MS);
        }, { passive: true });

        d.addEventListener('touchmove', (ev) => {
            const t = ev.touches && ev.touches[0];
            if (!t) return;
            const dx = Math.abs(t.clientX - startX);
            const dy = Math.abs(t.clientY - startY);
            if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
                tapCancelled = true;
                clearLongPress();
            }
        }, { passive: true });

        d.addEventListener('touchend', (ev) => {
            clearLongPress();
            if (!tapCancelled && !longPressed) {
                try {
                    const now = Date.now();
                    if (!d._lastOpenTime || (now - d._lastOpenTime) > 400) {
                        d._lastOpenTime = now;
                        openDetails();
                    }
                } catch (e) { openDetails(); }
            }
        }, { passive: true });

        d.addEventListener('touchcancel', (ev) => { tapCancelled = true; clearLongPress(); });

        // Prevent default contextmenu on touch long-press environments to avoid blocking UI
        d.addEventListener('contextmenu', (ev) => {
            try {
                // if lastPointerType indicates touch, or device likely touch-only, prevent contextmenu
                if (lastPointerType === 'touch' || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0 && window.matchMedia && window.matchMedia('(hover: none)').matches)) {
                    ev.preventDefault();
                }
            } catch (e) {}
        });

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
                const gens = (it.genres||'').split(/·|\||,|\/|;/).map(x=>x.trim()).filter(Boolean);
                if(!gens.includes(genre)) return false;
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
            return { tab:p.get('tab')||null, genre:p.get('genre')||null, id:p.get('id')||null, title:p.get('title')||null, q: p.get('q')||null };
        }
        // Case 2: plain hash used by carousels: '#id=...&title=...'
        const plain = raw.substring(1);
        if(plain.startsWith('id=') || plain.includes('id=')){
            const p = new URLSearchParams(plain);
            return { tab:null, genre:null, id:p.get('id')||null, title:p.get('title')||null };
        }
        return null;
    }

    function updateCatalogHash(tab, genre, q, preserve=false){ const params = new URLSearchParams(); if(tab) params.set('tab', tab); if(genre) params.set('genre', genre); if(q) params.set('q', q); const paramString = params.toString(); const newHash = paramString ? `${CATALOG_HASH}?${paramString}` : `${CATALOG_HASH}`; if(preserve) history.replaceState({}, '', newHash); else history.pushState({}, '', newHash); }

    async function initPage(rootSelector='#catalogo-page-root'){
        const root = document.querySelector(rootSelector); if(!root){ console.error('Catalogo: root no encontrado', rootSelector); return; }
        // Ensure modals exist (catalog page might be loaded standalone)
        try{ if(!window.hoverModal && typeof HoverModal === 'function') window.hoverModal = new HoverModal(); }catch(e){}
        try{ if(!window.detailsModal && typeof DetailsModal === 'function') window.detailsModal = new DetailsModal(); }catch(e){}
        try{ if(!window.videoModal && typeof VideoModal === 'function') window.videoModal = new VideoModal(); }catch(e){}
        try{ if(!window.shareModal && typeof ShareModal === 'function') window.shareModal = new ShareModal(); }catch(e){}
        root.innerHTML = `\n            <div class="catalogo-page">\n                <div class="catalogo-page-header">\n                    <div class="catalogo-controls">\n                        <div class="catalogo-genre-dropdown" id="catalogo-genre-dropdown-page">\n                            <button id="catalogo-genre-button-page" aria-haspopup="true" aria-expanded="false"><span class="label">Todo el catálogo</span>\n                                <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\n                            </button>\n                            <div id="catalogo-genre-list-page" class="catalogo-genre-list" style="display:none" role="menu"></div>\n                        </div>\n                    </div>\n                    <div class="catalogo-tabs" id="catalogo-tabs-page">\n                        <button data-tab="Películas" class="catalogo-tab active">Películas</button>\n                        <button data-tab="Series" class="catalogo-tab">Series</button>\n                        <button data-tab="Documentales" class="catalogo-tab">Documentales</button>\n                        <button data-tab="Animes" class="catalogo-tab">Animes</button>\n                    </div>\n                </div>\n                <div class="catalogo-page-body">\n                    <div class="skeleton-catalogo" id="catalogo-skeleton-page" style="display:flex;gap:12px;flex-wrap:wrap;">\n                        <div class="skeleton-item-catalogo"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item-catalogo"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item-catalogo"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item-catalogo"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item-catalogo"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item-catalogo"><div class="skeleton-spinner"></div></div>\n                    </div>\n                    <div class="catalogo-grid" id="catalogo-grid-page" role="list" aria-busy="false"></div>\n                </div>\n            </div>\n        `;

    const tabsContainer = document.getElementById('catalogo-tabs-page');
    const genreBtn = document.getElementById('catalogo-genre-button-page');
    const genreList = document.getElementById('catalogo-genre-list-page');
    // Remove any inline style that would block CSS transitions (templates might include display:none)
    try{ if(genreList && genreList.getAttribute && genreList.getAttribute('style')) { genreList.removeAttribute('style'); } }catch(e){}
    // ensure container classes are clean
    try{ const containerInit = document.getElementById('catalogo-genre-dropdown-page'); if(containerInit) { containerInit.classList.remove('open','closing'); } }catch(e){}
    // helpers to read/write the visible label inside the button (keeps chevron separate)
    function getGenreLabel(){ try{ const lbl = genreBtn && genreBtn.querySelector && genreBtn.querySelector('.label'); return lbl ? lbl.textContent.trim() : (genreBtn ? genreBtn.textContent.replace(' ▾','').trim() : 'Todo el catálogo'); }catch(e){ return 'Todo el catálogo'; } }
    function setGenreLabel(text){ try{ if(!genreBtn) return; const lbl = genreBtn.querySelector && genreBtn.querySelector('.label'); if(lbl) lbl.textContent = text; else genreBtn.textContent = text + ' ▾'; }catch(e){} }
    const grid = document.getElementById('catalogo-grid-page');
    if(grid){ grid.style.columnGap = grid.style.columnGap || getComputedStyle(document.documentElement).getPropertyValue('--catalogo-gap') || '18px'; grid.style.rowGap = grid.style.rowGap || getComputedStyle(document.documentElement).getPropertyValue('--catalogo-row-gap') || '48px'; }

        const data = await loadData();

        // Global fallback: registrar promesas rechazadas para debugging.
        // NO cerrar automáticamente los modales aquí — hacerlo provoca que
        // cualquier rejection no relacionado cierre el modal de detalles
        // inmediatamente después de abrirse. Si necesitas cerrar el modal en
        // casos concretos, implementa comprobaciones específicas sobre ev.reason.
        if (!window.__catalogo_unhandledrejection_installed) {
            window.addEventListener('unhandledrejection', (ev) => {
                try {
                    console.error('Unhandled rejection capturado en catálogo:', ev.reason, ev);
                } catch (e) {
                    try { console.error('Unhandled rejection (log fallo):', e); } catch (_) {}
                }
                // Asegurar que la página no quede con scroll bloqueado
                try { document.body.style.overflow = 'auto'; } catch (e) {}
            });
            window.__catalogo_unhandledrejection_installed = true;
        }

    function populateGenresForTabPage(tab, currentGenre){
        // currentGenre optional; if not provided, derive from the visible button text
        const gens = extractGenres(data, tab);
        genreList.innerHTML = '';
    const inferred = (typeof currentGenre === 'string' && currentGenre) ? currentGenre : getGenreLabel();

        const allBtn = document.createElement('button');
        allBtn.textContent = 'Todo el catálogo';
        allBtn.classList.add('genre-item');
        if (inferred === 'Todo el catálogo') allBtn.classList.add('selected');
            allBtn.addEventListener('click', ()=>{
            // remove selected from others
            genreList.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));
            allBtn.classList.add('selected');
            setGenreLabel('Todo el catálogo');
            // close with animation
            try{ const container = document.getElementById('catalogo-genre-dropdown-page'); if(container) closeDropdown(container); }catch(e){}
                updateCatalogHash(tab, 'Todo el catálogo', state.currentQuery);
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
                setGenreLabel(g);
                try{ const container = document.getElementById('catalogo-genre-dropdown-page'); if(container) closeDropdown(container); }catch(e){}
                updateCatalogHash(tab, g, state.currentQuery);
                applyFiltersAndRender(grid, data, tab, g);
            });
            genreList.appendChild(b);
        });
    }

    tabsContainer.querySelectorAll('.catalogo-tab').forEach(btn=>{ btn.addEventListener('click', ()=>{
            tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=>x.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            populateGenresForTabPage(tab);
            const currentGenre = getGenreLabel() || 'Todo el catálogo';
            updateCatalogHash(tab, currentGenre, state.currentQuery);
            // If a catalog search is active and we have cached results, use them
            if(state.currentQuery && state._searchResultsByCategory){
                // ensure genre filter applied to this category
                const bucket = state._searchResultsByCategory[tab] || [];
                // If genre changed, apply genre filter now
                const final = (currentGenre && currentGenre!=='Todo el catálogo') ? bucket.filter(it=> (it.genres||'').split(/·|\||,|\/|;/).map(x=>x.trim()).filter(Boolean).includes(currentGenre)) : bucket.slice();
                state.filteredItems = final.slice();
                resetPagination(grid);
                appendNextBatch(grid);
                showNoResultsInCatalog(state.filteredItems.length===0);
            } else {
                applyFiltersAndRender(grid, data, tab, currentGenre);
                try{ if(state.currentQuery && state.currentQuery.length) { applyCatalogSearch(state.currentQuery); } } catch(e){}
            }
        });
    });

        // Helper to close dropdown with fade animation
        function closeDropdown(container){
            if(!container) return;
            const list = container.querySelector('.catalogo-genre-list');
            if(!list) return;
            // if not open, nothing to do
            if(!container.classList.contains('open')) return;
            // add closing class to trigger CSS fade-out
            container.classList.add('closing');
            // when transition ends on the list, remove open/closing
            const onEnd = (e)=>{
                if(e.target !== list) return;
                list.removeEventListener('transitionend', onEnd);
                container.classList.remove('open');
                container.classList.remove('closing');
                const btn = container.querySelector('button'); if(btn) btn.setAttribute('aria-expanded','false');
            };
            list.addEventListener('transitionend', onEnd);
            // also set aria-expanded immediately
            const btn = container.querySelector('button'); if(btn) btn.setAttribute('aria-expanded','false');
            // force reflow to ensure transition runs
            list.getBoundingClientRect();
            // fallback: if transitionend doesn't fire (some mobile browsers), clear after 250ms
            const to = setTimeout(()=>{
                try{ list.removeEventListener('transitionend', onEnd); }catch(e){}
                container.classList.remove('open');
                container.classList.remove('closing');
                try{ const b2 = container.querySelector('button'); if(b2) b2.setAttribute('aria-expanded','false'); }catch(e){}
                clearTimeout(to);
            }, 250);
        }

        genreBtn.addEventListener('click', ()=>{
            const container = document.getElementById('catalogo-genre-dropdown-page');
            const isOpen = container && container.classList.contains('open');
            if(!isOpen){
                // opening: populate and set open
                try {
                    const activeTabBtn = tabsContainer.querySelector('.catalogo-tab.active');
                    const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'Películas';
                    const currentGenre = getGenreLabel() || 'Todo el catálogo';
                    populateGenresForTabPage(activeTab, currentGenre);
                } catch (e) { /* ignore and continue */ }
                if(container){ container.classList.add('open'); container.classList.remove('closing'); }
                genreBtn.setAttribute('aria-expanded','true');
            } else {
                // closing with fade
                closeDropdown(container);
            }
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
    setGenreLabel(genre);
        applyFiltersAndRender(grid, data, tab, genre);

        // Helper: try to open details modal for an item id present in the hash.
        function openDetailsForId(id, title){
            if(!id) return;
            const decodedTitle = title ? decodeURIComponent(title) : null;
            // Use a safe local normalizer: prefer existing global normalizeText if available,
            // otherwise apply a fallback that mirrors DetailsModal.normalizeText behavior.
            const normalize = (t) => {
                const s = String(t || '');
                try {
                    if (typeof normalizeText === 'function') return normalizeText(s);
                } catch (e) { /* ignore and fallback */ }
                try {
                    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                } catch (e) {
                    return s.toLowerCase();
                }
            };

            // find index in filteredItems matching id and normalized title when possible
            let idx = -1;
            try {
                for(let i=0;i<state.filteredItems.length;i++){
                    const it = state.filteredItems[i];
                    if(String(it.id) === String(id)){
                        if(decodedTitle){
                            if(normalize(it.title) === normalize(decodedTitle)) { idx = i; break; }
                        } else { idx = i; break; }
                    }
                }
            } catch (err) {
                // If something goes wrong during normalization/comparison, log and continue to fallback search
                console.warn('catalogo.openDetailsForId: comparación de títulos falló, continuando con fallback', err);
                idx = -1;
            }

            if(idx === -1) {
                // Fallback: item might be outside current filteredItems (different filters) or
                // not yet present due to lazy loading. Try to find the item globally and open it directly.
                try {
                    const globalItem = findExistingItemById(id) || state.allItems.find(x => String(x.id) === String(id));
                    if (globalItem && window.detailsModal && typeof window.detailsModal.show === 'function') {
                            const el = grid ? querySelectorByDataId(grid, id) : null;
                        try { 
                            try { window.activeItem = globalItem; } catch(e){}
                            console.debug && console.debug('catalogo.openDetailsForId fallback -> calling detailsModal.show', { source: 'catalogo_fallback', id: globalItem.id, title: globalItem.title });
                            window.detailsModal.show(globalItem, el);
                        } catch(e){ console.error('catalogo openDetailsForId fallback error', e); }
                        return;
                    }
                } catch (e) { /* continue to normal behavior */ }
                return;
            }

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

        // If initial hash includes an id, attempt to open the details modal for it.
        // Use retries because the page may still be rendering items or modals may not be initialized yet.
        if (initial && initial.id) {
            const tryOpenFromHash = (attempt = 0, maxAttempts = 30) => {
                // If detailsModal isn't ready yet, retry
                if (!(window.detailsModal && typeof window.detailsModal.show === 'function')) {
                    if (attempt < maxAttempts) setTimeout(() => tryOpenFromHash(attempt + 1, maxAttempts), 150);
                    return;
                }
                // If data isn't loaded into catalog state yet, retry
                if (!state.allItems || state.allItems.length === 0) {
                    if (attempt < maxAttempts) setTimeout(() => tryOpenFromHash(attempt + 1, maxAttempts), 150);
                    return;
                }
                try {
                    openDetailsForId(initial.id, initial.title);
                } catch (e) {
                    if (attempt < maxAttempts) setTimeout(() => tryOpenFromHash(attempt + 1, maxAttempts), 150);
                }
            };
            tryOpenFromHash();
        }

    // lazy load: listen to window scroll so long pages trigger loading
    let lazyTimer=null;
    function onCatalogScrollWindow(){ const threshold=700; const distanceFromBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight); if(distanceFromBottom < threshold){ if(lazyTimer) clearTimeout(lazyTimer); lazyTimer = setTimeout(()=>{ appendNextBatch(grid); lazyTimer=null; }, 120); } }
    window.addEventListener('scroll', onCatalogScrollWindow, { passive:true });
    if(grid) grid.addEventListener('scroll', ()=> onCatalogScrollWindow());

        // resize
        let resizeTimer=null; function onCatalogResize(){ if(resizeTimer) clearTimeout(resizeTimer); resizeTimer = setTimeout(()=>{ state.itemsPerRow = computeItemsPerRow(grid); state.initialBatchSize = Math.max(1, state.itemsPerRow * state.initialRows); state.subsequentBatchSize = Math.max(1, state.itemsPerRow * state.subsequentRows); if(state.renderedCount < Math.min(state.filteredItems.length, state.initialBatchSize)) appendNextBatch(grid); }, 120); }
        window.addEventListener('resize', onCatalogResize);

            // --- Expose search API for header global search ---
            function removeDiacriticsLocal(s){ try{ return String(s||'').normalize('NFD').replace(/[ -\u036f]/g,''); }catch(e){ return String(s||''); } }
            function tokenizeLocal(s){ return removeDiacriticsLocal(String(s||'')).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(t=>{ if(t.length>4 && t.endsWith('mente')) t=t.slice(0,-5); if(t.length>3 && t.endsWith('es')) t=t.slice(0,-2); if(t.length>2 && t.endsWith('s')) t=t.slice(0,-1); return t; }); }
            function scoreCatalogItem(it, qTokens, qRaw){ let score=0; const title = removeDiacriticsLocal(it.title||'').toLowerCase(); const desc = removeDiacriticsLocal(it.description||'').toLowerCase(); const genre = removeDiacriticsLocal(it.genre||'').toLowerCase(); if(title===qRaw) score+=120; if(title.indexOf(qRaw)!==-1) score+=60; const titleTokens = tokenizeLocal(it.title||''); let mt=0; for(const t of qTokens) if(titleTokens.includes(t)) mt++; score += mt*18; const descTokens = tokenizeLocal(it.description||''); let md=0; for(const t of qTokens) if(descTokens.includes(t)) md++; score += md*6; for(const t of qTokens) if(genre.indexOf(t)!==-1) score+=8; return score; }

            // If original removeDiacriticsLocal was corrupted (contains NUL in regex), override with a safe implementation
            try{
                // quick sanity test: does removeDiacriticsLocal produce expected ascii for 'á' ?
                if(typeof removeDiacriticsLocal === 'function'){
                    const out = removeDiacriticsLocal('á');
                    if(typeof out !== 'string' || out.indexOf('a') === -1){
                        removeDiacriticsLocal = function(s){ try{ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){ return String(s||''); } };
                    }
                } else {
                    removeDiacriticsLocal = function(s){ try{ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){ return String(s||''); } };
                }
            }catch(e){
                removeDiacriticsLocal = function(s){ try{ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){ return String(s||''); } };
            }

            function showNoResultsInCatalog(show){ try{ const existing = document.getElementById('catalogo-no-results'); if(show){ if(!existing){ const el = document.createElement('div'); el.id='catalogo-no-results'; el.className='catalog-no-results'; el.textContent='No hay resultados'; el.style.padding='18px'; el.style.color='rgba(255,255,255,0.85)'; el.style.fontWeight='600'; el.style.textAlign='center'; grid.parentNode.insertBefore(el, grid.nextSibling); } } else { if(existing) existing.remove(); } }catch(e){console.warn('showNoResultsInCatalog error',e);} }

            function applyCatalogSearch(q){ try{
                // store current query so tab/genre changes can preserve it
                state.currentQuery = String(q || '');
                const qRaw = removeDiacriticsLocal(String(q||'')).toLowerCase().trim(); const qTokens = tokenizeLocal(qRaw).filter(Boolean);
                // update URL when on catalog: add q param to catalog hash
                try{
                    const hash = window.location.hash || '';
                    // Preserve tab & genre if present while updating q
                    const parsed = parseCatalogHash() || {};
                    const curTab = parsed.tab || parsed.tab === null ? parsed.tab : null;
                    const curGenre = parsed.genre || parsed.genre === null ? parsed.genre : null;
                    updateCatalogHash(curTab || tab, curGenre || genre, state.currentQuery || '', true);
                }catch(e){}

                if(!qTokens.length){ // restore current filters (preserve active tab & genre and clear q)
                    state.currentQuery = '';
                    showNoResultsInCatalog(false);
                    // Determine the active tab and genre from the DOM or from the current hash
                    let activeTab = 'Películas';
                    let activeGenre = 'Todo el catálogo';
                    try{
                        const tabsEl = document.getElementById('catalogo-tabs-page');
                        const activeBtn = tabsEl && tabsEl.querySelector && tabsEl.querySelector('.catalogo-tab.active');
                        if(activeBtn && activeBtn.dataset && activeBtn.dataset.tab) activeTab = activeBtn.dataset.tab;
                    }catch(e){}
                    try{ activeGenre = (typeof getGenreLabel === 'function' && getGenreLabel()) || activeGenre; }catch(e){}

                    // Update the hash and UI to the active tab/genre and re-apply filters
                    updateCatalogHash(activeTab, activeGenre, '', true);
                    // Ensure genre list is populated for this tab
                    populateGenresForTabPage(activeTab, activeGenre);
                    applyFiltersAndRender(grid, data, activeTab, activeGenre);
                    return;
                }

                // snapshot has been managed by state.allItems already
                // Build search candidates across ALL categories so switching tabs shows matching items per category
                const allCandidates = state.allItems.slice();
                const scored = [];
                for(const it of allCandidates){ const s = scoreCatalogItem(it, qTokens, qRaw); if(s>0) scored.push({it,s}); }
                scored.sort((a,b)=>b.s - a.s);

                // Partition results per category and apply genre & episode-exclusion per-category
                const byCat = { 'Películas': [], 'Series': [], 'Documentales': [], 'Animes': [] };
                const episodeTabs = ['Series','Animes','Documentales'];
                for(const pair of scored){
                    const it = pair.it;
                    const cat = it.category || 'Películas';
                    // Apply episode exclusion if needed
                    if(episodeTabs.includes(cat)){
                        try{
                            const raw = it.raw || {};
                            const episodeKeys = ['Título episodio','Título episodio completo','Título episodio 1','Episodio','Título episodio (completo)'];
                            const hasEpisode = episodeKeys.some(k => raw[k] && String(raw[k]).trim() !== '');
                            if(hasEpisode) continue; // skip episode rows for these categories
                        }catch(e){}
                    }
                    // Keep in appropriate category bucket
                    if(!byCat[cat]) byCat[cat] = [];
                    byCat[cat].push(it);
                }

                // Determine active tab and genre from DOM (don't rely on closure variables)
                let activeTab = tab;
                let activeGenre = genre;
                try{
                    const tabsEl = document.getElementById('catalogo-tabs-page');
                    const activeBtn = tabsEl && tabsEl.querySelector && tabsEl.querySelector('.catalogo-tab.active');
                    if(activeBtn && activeBtn.dataset && activeBtn.dataset.tab) activeTab = activeBtn.dataset.tab;
                }catch(e){}
                try{ if(typeof getGenreLabel === 'function') activeGenre = getGenreLabel() || activeGenre; }catch(e){}

                // Apply genre filter on the chosen category results
                const filterByGenre = (items, g) => {
                    if(!g || g === 'Todo el catálogo') return items.slice();
                    return items.filter(it => {
                        const gens = (it.genres||'').split(/·|\||,|\/|;/).map(x=>x.trim()).filter(Boolean);
                        return gens.includes(g);
                    });
                };

                // store the per-category search results on state for quick tab switches
                state._searchResultsByCategory = {};
                for(const c of Object.keys(byCat)){
                    state._searchResultsByCategory[c] = filterByGenre(byCat[c], activeGenre);
                }

                // Use the activeTab bucket as filteredItems
                state.filteredItems = state._searchResultsByCategory[activeTab] ? state._searchResultsByCategory[activeTab].slice() : [];
                // update URL to include q and preserve tab/genre
                updateCatalogHash(activeTab, activeGenre, state.currentQuery, true);
                resetPagination(grid);
                appendNextBatch(grid);
                showNoResultsInCatalog(state.filteredItems.length===0);
            }catch(e){ console.warn('applyCatalogSearch error', e); } }

            // expose search function on global Catalogo object so header can call it
            try{ window.Catalogo = window.Catalogo || {}; window.Catalogo.search = applyCatalogSearch; }catch(e){}
            // If the initial hash included a q parameter, apply it so search persists after reload
            try{ if(initial && initial.q){ setTimeout(()=>{ try{ applyCatalogSearch(initial.q); }catch(e){console.warn('applyCatalogSearch initial error',e);} }, 80); } }catch(e){}

        // hash change: update filters and optionally open details if id present
        window.addEventListener('hashchange', ()=>{
            const parsed = parseCatalogHash();
            if(parsed){
                if(parsed.tab){
                    const tab = parsed.tab || 'Películas';
                    const genre = parsed.genre || 'Todo el catálogo';
                    tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=> x.classList.toggle('active', x.dataset.tab===tab));
                    setGenreLabel(genre);
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
                            setGenreLabel(genre);
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

    document.addEventListener('click', (e)=>{ if(!e.target.closest('.catalogo-genre-dropdown')){ try{ const container = document.getElementById('catalogo-genre-dropdown-page'); if(container) closeDropdown(container); }catch(e){} } });

        // Wrap createCard so we can later replace behaviour if needed; keep it lightweight (no per-item hover listeners)
        const originalCreateCard = createCard;
        createCard = function(it){
            return originalCreateCard(it);
        };

        // Delegated hover handlers: funcionan para items ya renderizados y para elementos que se agreguen posteriormente
        if (grid && !grid.__hover_delegation_installed) {
            // Show hover with a delay (match carousels behaviour)
                const HOVER_SHOW_DELAY = 900; // ms - same delay used in carousels
                // Protect against touch / long-press triggering hover modal: record recent touch/pointer events
                // and ignore subsequent mouseover events that are synthesized after touches.
                let __lastTouchTime = 0;
                try {
                    grid.addEventListener('pointerdown', (ev) => {
                        try { if (ev.pointerType && ev.pointerType !== 'mouse') __lastTouchTime = Date.now(); } catch(e){}
                    }, { passive: true });
                } catch(e) {}
                try { grid.addEventListener('touchstart', () => { __lastTouchTime = Date.now(); }, { passive: true }); } catch(e) {}
            grid.addEventListener('mouseover', (e) => {
                const itemEl = e.target.closest('.catalogo-item');
                if (!itemEl || !grid.contains(itemEl)) return;
                const itemId = itemEl.dataset.itemId;
                if (!itemId) return;
                const item = findExistingItemById(itemId) || state.allItems.find(x => String(x.id) === String(itemId));
                // clear any previous timer on this element
                try { if (itemEl._hoverTimer) { clearTimeout(itemEl._hoverTimer); itemEl._hoverTimer = null; } } catch(e){}
                // If there was a recent touch/pointer event, ignore the synthesized mouseover to avoid
                // opening the hover modal from a long-press on touch devices.
                if (Date.now() - __lastTouchTime < 800) return;
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
                // If the mouse moved into another catalog item, keep the hover logic active
                if (related && related.closest && related.closest('.catalogo-item')) return;
                // If the mouse moved into the hover modal itself (or any of its children), do not hide
                if (related && related.closest && (related.closest('#modal-content') || related.closest('.modal-content'))) return;
                if (window.hoverModal && (typeof window.hoverModal.hide === 'function' || typeof window.hoverModal.close === 'function')) {
                    try { if(window.hoverModal.hide) window.hoverModal.hide(0); else window.hoverModal.close(); } catch(err) { console.error('hoverModal.hide error', err); }
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
