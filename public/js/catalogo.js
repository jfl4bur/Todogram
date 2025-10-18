(function(){
    // catalogo.js - modal catálogo fullscreen completo
    const CATALOG_HASH = '#catalogo';

    function normalizeText(text){
        if(!text) return '';
        try{
            return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        }catch(e){
            return String(text).toLowerCase().replace(/[^a-z0-9]+/g,'-');
        }
    }

    function createCatalogModal(){
        if(document.getElementById('catalogo-modal-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'catalogo-modal-overlay';
        overlay.className = 'catalogo-modal-overlay';
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden','true');
        overlay.innerHTML = `
            <div class="catalogo-modal" role="dialog" aria-modal="true">
                <button class="catalogo-close" id="catalogo-close" aria-label="Cerrar catálogo">&times;</button>
                <div class="catalogo-header">
                    <div class="catalogo-controls">
                        <div class="catalogo-genre-dropdown" id="catalogo-genre-dropdown">
                            <button id="catalogo-genre-button" aria-haspopup="true" aria-expanded="false">Todo el catálogo ▾</button>
                            <div id="catalogo-genre-list" class="catalogo-genre-list" style="display:none" role="menu"></div>
                        </div>
                    </div>
                    <div class="catalogo-tabs" id="catalogo-tabs">
                        <button data-tab="Películas" class="catalogo-tab active">Películas</button>
                        <button data-tab="Series" class="catalogo-tab">Series</button>
                        <button data-tab="Documentales" class="catalogo-tab">Documentales</button>
                        <button data-tab="Animes" class="catalogo-tab">Animes</button>
                    </div>
                </div>
                <div class="catalogo-body">
                    <!-- skeleton similar to carousels -->
                    <div class="carousel-skeleton" id="catalogo-skeleton" style="display:flex;gap:12px;flex-wrap:wrap;">
                        <!-- generate several skeleton items to match rows -->
                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>
                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>
                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>
                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>
                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>
                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>
                    </div>
                    <div class="catalogo-grid" id="catalogo-grid" role="list" aria-busy="false"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Styles for the catalog are provided in public/css/styles.css
    }

    async function loadData(){
        if(window.sharedData) return window.sharedData;
        try{
            const res = await fetch(DATA_URL);
            if(!res.ok) throw new Error('No se pudo cargar data.json');
            const data = await res.json();
            window.sharedData = data;
            return data;
        }catch(e){
            console.error('catalogo: error cargando datos', e);
            return [];
        }
    }

    function extractGenres(data, category){
        const set = new Set();
        data.forEach(item => {
            if(category && item['Categoría'] && item['Categoría'] !== category) return;
            const gens = item['Géneros'] || '';
            gens.split('·').map(g=>g.trim()).filter(Boolean).forEach(g=>set.add(g));
        });
        return Array.from(set).sort();
    }

    function buildItemFromData(d, index){
        return {
            id: d['ID TMDB'] ? d['ID TMDB'] : `i_${index}`,
            title: d['Título'] || d['Título original'] || 'Sin título',
            description: d['Synopsis'] || '',
            posterUrl: d['Portada'] || d['Carteles'] || '',
            backgroundUrl: d['Carteles'] || d['Portada'] || '',
            category: d['Categoría'] || 'Películas',
            genres: d['Géneros'] || '',
            year: d['Año'] || '',
            videoUrl: d['Video iframe'] || d['Video'] || d['Enlace'] || '',
            trailerUrl: d['Trailer'] || d['TrailerUrl'] || d['trailerUrl'] || ''
        };
    }

    // Estado y funciones para paginación / lazy-load
    const catalogState = {
        allItems: [], // items completos (después de map)
        filteredItems: [],
        renderedCount: 0,
        initialRows: 6,
        subsequentRows: 3,
        itemsPerRow: 0,
        initialBatchSize: 0,
        subsequentBatchSize: 0,
        loading: false
    };

    // temporizadores por item para reproducir el comportamiento de hover del carousel
    const catalogHoverTimeouts = {};

    function computeItemsPerRow(){
        const grid = document.getElementById('catalogo-grid');
        if(!grid) return 6;
        const containerWidth = grid.clientWidth || document.documentElement.clientWidth;
        const rootStyles = getComputedStyle(document.documentElement);
        const itemW = parseInt(rootStyles.getPropertyValue('--item-width')) || 194;
        const gap = parseInt(getComputedStyle(grid).getPropertyValue('gap')) || 18;
        const perRow = Math.max(1, Math.floor((containerWidth + gap) / (itemW + gap)));
        return perRow;
    }

    function createCatalogItemElement(it){
        const div = document.createElement('div');
        div.className = 'catalogo-item';
        div.dataset.itemId = it.id;
        div.setAttribute('role','listitem');
        div.innerHTML = `<img src="${it.posterUrl || 'https://via.placeholder.com/194x271'}" alt="${it.title}">`;
        // hover modal - reuse same behavior as carousel: 900ms details fade, then 200ms open modal
        div.addEventListener('mouseenter', ()=>{
            const id = div.dataset.itemId;
            // clear previous timers if any
            if(catalogHoverTimeouts[id]){
                clearTimeout(catalogHoverTimeouts[id].details);
                clearTimeout(catalogHoverTimeouts[id].modal);
            }
            const rect = div.getBoundingClientRect();
            // schedule details overlay (visual feedback)
            catalogHoverTimeouts[id] = {};
            catalogHoverTimeouts[id].details = setTimeout(()=>{
                // show visual overlay like carousel (if any)
                const img = div.querySelector('img');
                const overlay = div.querySelector('.carousel-overlay');
                if(overlay) { overlay.style.opacity = '1'; overlay.style.transform = 'translateY(0)'; }
                // schedule modal open (200ms after visual)
                catalogHoverTimeouts[id].modal = setTimeout(()=>{
                    if(window.hoverModal && !window.isModalOpen && !window.isDetailsModalOpen){
                        if(typeof window.hoverModal.cancelHide === 'function') window.hoverModal.cancelHide();
                        window.hoverModal.show(it, div);
                        window.hoverModalItem = it;
                    }
                }, 200);
            }, 900);
        });

        div.addEventListener('mouseleave', ()=>{
            const id = div.dataset.itemId;
            if(catalogHoverTimeouts[id]){
                clearTimeout(catalogHoverTimeouts[id].details);
                clearTimeout(catalogHoverTimeouts[id].modal);
                delete catalogHoverTimeouts[id];
            }
            if(window.hoverModal && typeof window.hoverModal.hide === 'function'){
                window.hoverModal.hide(300);
                window.hoverModalItem = null;
            }
            const overlay = div.querySelector('.carousel-overlay');
            if(overlay){ overlay.style.opacity = '0'; overlay.style.transform = 'translateY(20px)'; }
        });
        // click -> details
        div.addEventListener('click', ()=>{
            if(window.detailsModal && typeof window.detailsModal.show === 'function'){
                const normTitle = normalizeText(it.title);
                const idHash = `#id=${encodeURIComponent(it.id)}&title=${encodeURIComponent(normTitle)}`;
                const currentCatalogHash = window.location.hash && window.location.hash.startsWith(CATALOG_HASH) ? window.location.hash : `${CATALOG_HASH}?tab=${encodeURIComponent(document.querySelector('.catalogo-tab.active').dataset.tab)}`;
                history.pushState({ catalogHash: currentCatalogHash }, '', idHash);
                window.detailsModal.show(it, div).then(()=>{ window.activeItem = it; }).catch(err=>console.error(err));
            }
        });
        return div;
    }

    function renderSlice(start, end){
        const grid = document.getElementById('catalogo-grid');
        if(!grid) return;
        const fragment = document.createDocumentFragment();
        for(let i=start;i<end && i<catalogState.filteredItems.length;i++){
            const it = catalogState.filteredItems[i];
            const el = createCatalogItemElement(it);
            fragment.appendChild(el);
        }
        grid.appendChild(fragment);
    }

    function resetPagination(){
        catalogState.itemsPerRow = computeItemsPerRow();
        catalogState.initialBatchSize = Math.max(1, catalogState.itemsPerRow * catalogState.initialRows);
        catalogState.subsequentBatchSize = Math.max(1, catalogState.itemsPerRow * catalogState.subsequentRows);
        catalogState.renderedCount = 0;
        const grid = document.getElementById('catalogo-grid');
        if(grid) grid.innerHTML = '';
    }

    function appendNextBatch(){
        if(catalogState.loading) return;
        if(catalogState.renderedCount >= catalogState.filteredItems.length) return;
        catalogState.loading = true;
        // calcular siguiente batch
        const isInitial = catalogState.renderedCount === 0;
        const batch = isInitial ? catalogState.initialBatchSize : catalogState.subsequentBatchSize;
        const start = catalogState.renderedCount;
        const end = Math.min(catalogState.renderedCount + batch, catalogState.filteredItems.length);
        renderSlice(start, end);
        catalogState.renderedCount = end;
        // hide skeleton after first real items are rendered
        if(start === 0){
            const sk = document.getElementById('catalogo-skeleton');
            if(sk) sk.style.display = 'none';
            const grid = document.getElementById('catalogo-grid');
            if(grid) grid.setAttribute('aria-busy','false');
        }
        catalogState.loading = false;
        // Si ya renderizamos todos los items, permitir que el overlay sea inline para mostrar footer
        const overlay = document.getElementById('catalogo-modal-overlay');
        if(catalogState.renderedCount >= catalogState.filteredItems.length){
            if(overlay) overlay.classList.add('catalogo-inline');
        } else {
            if(overlay) overlay.classList.remove('catalogo-inline');
        }
    }

    function applyFiltersAndRender(data, activeTab, genreFilter){
        // map and filter
        catalogState.allItems = data.map(buildItemFromData);
        catalogState.filteredItems = catalogState.allItems.filter(it=>{
            if(activeTab && it.category && it.category !== activeTab) return false;
            if(genreFilter && genreFilter !== 'Todo el catálogo'){
                const gens = (it.genres||'').split('·').map(g=>g.trim());
                if(!gens.includes(genreFilter)) return false;
            }
            return true;
        });
        // reset pagination and render initial batches
        resetPagination();
        appendNextBatch();
    }

    function parseCatalogHash(){
        const raw = window.location.hash || '';
        if(!raw.startsWith(CATALOG_HASH)) return null;
        const q = raw.substring(CATALOG_HASH.length); // quitar '#catalogo'
        if(!q) return {};
        const params = new URLSearchParams(q.replace(/^\?/,''));
        return {
            tab: params.get('tab') || null,
            genre: params.get('genre') || null,
            id: params.get('id') || null,
            title: params.get('title') || null
        };
    }

    function updateCatalogHash(tab, genre, preserveHistory=false){
        const params = new URLSearchParams();
        if(tab) params.set('tab', tab);
        if(genre) params.set('genre', genre);
        const newHash = `${CATALOG_HASH}?${params.toString()}`;
        if(preserveHistory){
            history.replaceState({}, '', newHash);
        }else{
            history.pushState({}, '', newHash);
        }
    }

    // Restaura el hash del catálogo si el estado de la historia lo contiene
    function maybeRestoreCatalogFromState(event){
        const state = event && event.state;
        if(state && state.catalogHash){
            // reemplazar sin añadir entrada
            history.replaceState(null, '', state.catalogHash);
            const parsed = parseCatalogHash();
            if(parsed){
                openCatalogOverlay(parsed.tab || 'Películas', parsed.genre || 'Todo el catálogo');
            }
        }
    }

    // Abrir/cerrar overlay helpers
    function openCatalogOverlay(tab, genre){
        const overlay = document.getElementById('catalogo-modal-overlay');
        if(!overlay) return;
        // calcular top basado en header
        const header = document.getElementById('slider-header') || document.querySelector('header.slider-header');
        let headerHeight = 0;
        if(header){
            const rect = header.getBoundingClientRect();
            headerHeight = Math.ceil(rect.height);
            // asegurar que el header quede por encima del overlay
            try{
                // No sobreescribimos el z-index del overlay aquí (usar la regla CSS).
                // Colocamos el header por encima del overlay (pero por debajo de los modales de detalles/hover)
                header.dataset._prevZ = header.style.zIndex || '';
                header.style.zIndex = String(1000);
            }catch(e){/* ignore */}
        }
        overlay.style.top = headerHeight + 'px';
        overlay.style.bottom = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden','false');
        // no bloquear scroll del body para permitir interacción con el header
        const tabsContainer = document.getElementById('catalogo-tabs');
        const genreBtn = document.getElementById('catalogo-genre-button');
        tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=>{
            x.classList.toggle('active', x.dataset.tab===tab);
        });
        genreBtn.textContent = (genre||'Todo el catálogo') + ' ▾';

        // Ensure genre list is positioned to the left of the catalog area (32px)
        const genreList = document.getElementById('catalogo-genre-list');
        if(genreList){
            genreList.style.position = 'absolute';
            genreList.style.left = '32px';
            genreList.style.top = '44px';
            genreList.style.right = 'auto';
        }
    }

    function closeCatalogOverlay(){
        const overlay = document.getElementById('catalogo-modal-overlay');
        if(!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden','true');
        // remover clase inline para restablecer posicion fija
        overlay.classList.remove('catalogo-inline');
        // restaurar z-index del header si lo modificamos
        const header = document.getElementById('slider-header') || document.querySelector('header.slider-header');
        if(header && header.dataset && Object.prototype.hasOwnProperty.call(header.dataset, '_prevZ')){
            header.style.zIndex = header.dataset._prevZ || '';
            delete header.dataset._prevZ;
        }
    }

    // Inicialización
    async function initCatalogo(){
        createCatalogModal();
        const overlay = document.getElementById('catalogo-modal-overlay');
        const closeBtn = document.getElementById('catalogo-close');
        const tabsContainer = document.getElementById('catalogo-tabs');
        const genreBtn = document.getElementById('catalogo-genre-button');
        const genreList = document.getElementById('catalogo-genre-list');

        // Reparent genreList into overlay so we can align it to the left of the catalog area
        if(overlay && genreList && genreList.parentNode !== overlay){
            overlay.appendChild(genreList);
            // position it aligned to left padding (32px)
            genreList.style.left = '32px';
            genreList.style.right = 'auto';
        }

        let data = await loadData();

        // Función para (re)llenar el dropdown según la pestaña actual
        function populateGenresForTab(tab){
            const gens = extractGenres(data, tab);
            genreList.innerHTML = '';
            const allBtn = document.createElement('button');
            allBtn.textContent = 'Todo el catálogo';
            allBtn.classList.add('genre-item');
            allBtn.addEventListener('click', ()=>{
                genreBtn.textContent = 'Todo el catálogo ▾';
                genreList.style.display = 'none';
                updateCatalogHash(tab, 'Todo el catálogo');
                applyFiltersAndRender(data, tab, 'Todo el catálogo');
                markSelectedGenre('Todo el catálogo');
            });
            genreList.appendChild(allBtn);
            gens.forEach(g=>{
                const b = document.createElement('button');
                b.textContent = g;
                b.classList.add('genre-item');
                b.addEventListener('click', ()=>{
                    genreBtn.textContent = g + ' ▾';
                    genreList.style.display = 'none';
                    updateCatalogHash(tab, g);
                    applyFiltersAndRender(data, tab, g);
                    markSelectedGenre(g);
                });
                genreList.appendChild(b);
            });
        }

        function markSelectedGenre(value){
            Array.from(genreList.querySelectorAll('button')).forEach(b=>{
                b.classList.toggle('selected', b.textContent === value);
            });
        }

        // pestañas
        tabsContainer.querySelectorAll('.catalogo-tab').forEach(btn=>{
            btn.addEventListener('click', ()=>{
                tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=>x.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                populateGenresForTab(tab);
                const currentGenre = genreBtn.textContent.replace(' ▾','') || 'Todo el catálogo';
                updateCatalogHash(tab, currentGenre);
                applyFiltersAndRender(data, tab, currentGenre);
                markSelectedGenre(currentGenre);
            });
        });

        // toggle dropdown
        genreBtn.addEventListener('click', (e)=>{
            const open = genreList.style.display !== 'none';
            genreList.style.display = open ? 'none' : 'grid';
            genreBtn.setAttribute('aria-expanded', String(!open));
        });

        // close button
        closeBtn.addEventListener('click', ()=>{
            // Quitar hash catalogo usando history
            if(window.location.hash && window.location.hash.startsWith(CATALOG_HASH)){
                history.back();
            } else {
                closeCatalogOverlay();
            }
        });

        // Attach header tienda
        function attachHeaderTienda(){
            const links = Array.from(document.querySelectorAll('.slider-nav-link'));
            const tienda = links.find(a=>a.textContent && a.textContent.trim().toLowerCase().includes('tienda'));
            if(tienda){
                tienda.addEventListener('click', (e)=>{
                    e.preventDefault();
                    const activeTab = tabsContainer.querySelector('.catalogo-tab.active').dataset.tab;
                    const currentGenre = genreBtn.textContent.replace(' ▾','') || 'Todo el catálogo';
                    updateCatalogHash(activeTab, currentGenre);
                    openCatalogOverlay(activeTab, currentGenre);
                    populateGenresForTab(activeTab);
                    applyFiltersAndRender(data, activeTab, currentGenre);
                });
            }else{
                setTimeout(attachHeaderTienda, 300);
            }
        }
        attachHeaderTienda();

        // Delegated handler to support mobile menus / dynamic header links
        // Capturing false is fine; we also listen for touches via click which covers taps on mobile.
        document.addEventListener('click', function delegatedTiendaHandler(e){
            const target = e.target.closest('.slider-nav-link, [data-nav="tienda"], a[href*="tienda"], button[data-nav="tienda"]');
            if(!target) return;
            // prevent normal navigation and open catalog overlay
            try{ e.preventDefault(); }catch(err){}
            const activeTab = tabsContainer.querySelector('.catalogo-tab.active').dataset.tab;
            const currentGenre = genreBtn.textContent.replace(' ▾','') || 'Todo el catálogo';
            updateCatalogHash(activeTab, currentGenre);
            openCatalogOverlay(activeTab, currentGenre);
            populateGenresForTab(activeTab);
            applyFiltersAndRender(data, activeTab, currentGenre);
        }, false);

        // Recalcular top del overlay al cambiar tamaño o al cambiar la altura del header
        function recalcOverlayTop(){
            const overlay = document.getElementById('catalogo-modal-overlay');
            if(!overlay || overlay.style.display === 'none') return;
            const header = document.getElementById('slider-header') || document.querySelector('header.slider-header');
            let headerHeight = 0;
            if(header){
                const rect = header.getBoundingClientRect();
                headerHeight = Math.ceil(rect.height);
            }
            overlay.style.top = headerHeight + 'px';
        }
        window.addEventListener('resize', recalcOverlayTop);
        // También observar cambios en el header (por ejemplo al abrir mobile menu que cambia su altura)
        const headerEl = document.getElementById('slider-header') || document.querySelector('header.slider-header');
        if(headerEl){
            const mo = new MutationObserver(recalcOverlayTop);
            mo.observe(headerEl, { attributes: true, childList: true, subtree: true });
        }

        // Manejar cambios de hash -> abrir/cerrar catálogo
        window.addEventListener('hashchange', ()=>{
            // Si hash es catalogo -> abrir
            if(window.location.hash && window.location.hash.startsWith(CATALOG_HASH)){
                const parsed = parseCatalogHash();
                const tab = parsed && parsed.tab ? parsed.tab : 'Películas';
                const genre = parsed && parsed.genre ? parsed.genre : 'Todo el catálogo';
                populateGenresForTab(tab);
                openCatalogOverlay(tab, genre);
                applyFiltersAndRender(data, tab, genre);
                markSelectedGenre(genre);
            } else if(window.location.hash && window.location.hash.startsWith('#id=')){
                // Si es detalle y hay item, intentar abrir catálogo en background
                const params = new URLSearchParams(window.location.hash.substring(1));
                const id = params.get('id');
                if(id){
                    // buscar item
                    const found = (data || []).find((it, i)=>{ const key = it['ID TMDB'] ? it['ID TMDB'] : `i_${i}`; return String(key)===String(id); });
                    if(found){
                        const built = buildItemFromData(found, 0);
                        const tab = built.category || 'Películas';
                        const firstGenre = (built.genres||'').split('·').map(x=>x.trim()).filter(Boolean)[0] || 'Todo el catálogo';
                        populateGenresForTab(tab);
                        openCatalogOverlay(tab, firstGenre);
                        applyFiltersAndRender(data, tab, firstGenre);
                        markSelectedGenre(firstGenre);
                    }
                }
            } else {
                // limpiar catalogo
                closeCatalogOverlay();
            }
        });

        // Al cargar la página, restaurar si hash incluye catalogo
        const initial = parseCatalogHash();
        if(initial!==null){
            const tab = initial.tab || 'Películas';
            const genre = initial.genre || 'Todo el catálogo';
            populateGenresForTab(tab);
            openCatalogOverlay(tab, genre);
            applyFiltersAndRender(data, tab, genre);
            markSelectedGenre(genre);
        }

        // Scroll handler para lazy-load: cuando estemos cerca del final cargar siguiente batch
        const bodyEl = document.querySelector('.catalogo-body');
        let lazyTimer = null;
        function onCatalogScroll(){
            if(!bodyEl) return;
            const threshold = 300; // px desde el final
            const atBottom = bodyEl.scrollHeight - (bodyEl.scrollTop + bodyEl.clientHeight) < threshold;
            if(atBottom){
                // debounce
                if(lazyTimer) clearTimeout(lazyTimer);
                lazyTimer = setTimeout(()=>{ appendNextBatch(); lazyTimer = null; }, 120);
            }
        }
        if(bodyEl){
            bodyEl.addEventListener('scroll', onCatalogScroll);
        }

        // Resize -> recalcular items per row y si hace falta cargar más para llenar
        let resizeTimer = null;
        function onCatalogResize(){
            if(resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(()=>{
                const prev = catalogState.itemsPerRow || 0;
                catalogState.itemsPerRow = computeItemsPerRow();
                catalogState.initialBatchSize = Math.max(1, catalogState.itemsPerRow * catalogState.initialRows);
                catalogState.subsequentBatchSize = Math.max(1, catalogState.itemsPerRow * catalogState.subsequentRows);
                // Si al cambiar a más columnas el grid queda con menos items visibles, cargar más
                if(catalogState.renderedCount < Math.min(catalogState.filteredItems.length, catalogState.initialBatchSize)){
                    appendNextBatch();
                }
            }, 120);
        }
        window.addEventListener('resize', onCatalogResize);

        // Si la URL es un detalle directo (#id=...), abrir detalles (main.js normalmente lo hace)
        if(window.location.hash && window.location.hash.startsWith('#id=')){
            const params = new URLSearchParams(window.location.hash.substring(1));
            const id = params.get('id');
            if(id){
                const foundIndexItem = (data || []).find((it, i)=>{ const key = it['ID TMDB'] ? it['ID TMDB'] : `i_${i}`; return String(key)===String(id); });
                if(foundIndexItem){
                    const built = buildItemFromData(foundIndexItem, 0);
                    const tab = built.category || 'Películas';
                    const firstGenre = (built.genres||'').split('·').map(x=>x.trim()).filter(Boolean)[0] || 'Todo el catálogo';
                    populateGenresForTab(tab);
                    openCatalogOverlay(tab, firstGenre);
                    applyFiltersAndRender(data, tab, firstGenre);
                    markSelectedGenre(firstGenre);
                }
            }
        }

        // Esc para cerrar modal
        document.addEventListener('keydown', (e)=>{
            if(e.key === 'Escape'){
                // si estamos en un detalle, dejar que main.js cierre el details modal; si no, cerrar catálogo
                if(window.detailsModal && window.detailsModal.isDetailsModalOpen){
                    window.detailsModal.close();
                    // si hay estado en history para restaurar catalogo
                    const st = history.state;
                    if(st && st.catalogHash){
                        history.replaceState(null, '', st.catalogHash);
                        const parsed = parseCatalogHash();
                        if(parsed) openCatalogOverlay(parsed.tab || 'Películas', parsed.genre || 'Todo el catálogo');
                    }
                } else {
                    // cerrar catálogo
                    if(window.location.hash && window.location.hash.startsWith(CATALOG_HASH)){
                        history.back();
                    } else {
                        closeCatalogOverlay();
                    }
                }
            }
        });

        // popstate: si el state contiene catalogHash, restaurarlo
        window.addEventListener('popstate', (e)=>{
            const state = e.state;
            if(state && state.catalogHash){
                const parsed = parseCatalogHash();
                // replace hash with catalogHash si es necesario
                history.replaceState(null, '', state.catalogHash);
                const p = parseCatalogHash();
                if(p) openCatalogOverlay(p.tab || 'Películas', p.genre || 'Todo el catálogo');
            } else {
                // si el nuevo hash no es catalogo, cerrar overlay
                if(!window.location.hash || (!window.location.hash.startsWith(CATALOG_HASH) && !window.location.hash.startsWith('#id='))){
                    closeCatalogOverlay();
                }
            }
        });

        // click fuera dropdown cierra
        document.addEventListener('click', (e)=>{
            if(!e.target.closest('.catalogo-genre-dropdown')){
                genreList.style.display = 'none';
                genreBtn.setAttribute('aria-expanded','false');
            }
        });

    }

    document.addEventListener('DOMContentLoaded', ()=>{
        try{ initCatalogo(); }catch(e){ console.error('catalogo init error', e); }
    });
})();
