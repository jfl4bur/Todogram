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
                    <div class="catalogo-tabs" id="catalogo-tabs">
                        <button data-tab="Películas" class="catalogo-tab active">Películas</button>
                        <button data-tab="Series" class="catalogo-tab">Series</button>
                        <button data-tab="Documentales" class="catalogo-tab">Documentales</button>
                        <button data-tab="Animes" class="catalogo-tab">Animes</button>
                    </div>
                    <div class="catalogo-controls">
                        <div class="catalogo-genre-dropdown" id="catalogo-genre-dropdown">
                            <button id="catalogo-genre-button" aria-haspopup="true" aria-expanded="false">Todo el catálogo ▾</button>
                            <div id="catalogo-genre-list" class="catalogo-genre-list" style="display:none" role="menu"></div>
                        </div>
                    </div>
                </div>
                <div class="catalogo-body">
                    <div class="catalogo-grid" id="catalogo-grid" role="list"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const s = document.createElement('style');
        s.id = 'catalogo-styles';
        s.innerHTML = `
            .catalogo-modal-overlay{position:fixed;left:0;right:0;bottom:0;top:auto;background:rgba(0,0,0,0.95);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:0;margin:0}
            .catalogo-modal{width:100%;height:100%;background:transparent;color:#fff;position:relative;display:flex;flex-direction:column}
            .catalogo-close{position:absolute;right:18px;top:18px;background:transparent;border:0;color:#fff;font-size:36px;padding:6px 12px;border-radius:6px;cursor:pointer;z-index:100000}
            .catalogo-header{display:flex;align-items:center;gap:12px;padding:28px 48px 12px 48px}
            .catalogo-tabs{display:flex;gap:12px;flex-wrap:wrap}
            .catalogo-tab{background:transparent;border:0;color:rgba(255,255,255,0.8);font-size:20px;padding:8px 12px;cursor:pointer}
            .catalogo-tab.active{color:#fff;border-bottom:2px solid #fff}
            .catalogo-controls{margin-left:auto}
            .catalogo-genre-dropdown{position:relative}
            .catalogo-genre-list{position:absolute;right:0;top:44px;background:#0b0b0b;border:1px solid #222;padding:12px;min-width:320px;max-width:680px;box-shadow:0 6px 30px rgba(0,0,0,0.6);display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:6px}
            .catalogo-genre-list button{display:block;background:transparent;border:0;color:rgba(255,255,255,0.85);text-align:left;padding:8px 6px;cursor:pointer;width:100%;white-space:nowrap}
            .catalogo-genre-list button.selected{color:#fff;font-weight:700}
            .catalogo-body{flex:1;overflow:auto;padding:8px 48px 48px 48px}
            .catalogo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:18px}
            .catalogo-item{background:transparent;padding:6px;border-radius:6px;cursor:pointer;display:flex;flex-direction:column;align-items:center}
            .catalogo-item img{width:100%;height:auto;border-radius:4px;object-fit:cover}
            .catalogo-item .title{margin-top:8px;font-size:14px;text-align:center}
            @media (max-width:1200px){ .catalogo-genre-list{grid-template-columns:repeat(2,minmax(120px,1fr))} }
            @media (max-width:600px){ .catalogo-header{padding:12px} .catalogo-body{padding:8px 12px 24px 12px} .catalogo-genre-list{position:static;grid-template-columns:repeat(2,1fr);margin-top:8px} .catalogo-controls{width:100%;display:flex;justify-content:flex-end} }
        `;
        document.head.appendChild(s);
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
            videoUrl: d['Video iframe'] || ''
        };
    }

    function renderGrid(items){
        const grid = document.getElementById('catalogo-grid');
        grid.innerHTML = '';
        items.forEach((it, idx)=>{
            const div = document.createElement('div');
            div.className = 'catalogo-item';
            div.dataset.itemId = it.id;
            div.setAttribute('role','listitem');
            div.innerHTML = `
                <img src="${it.posterUrl || 'https://via.placeholder.com/194x271'}" alt="${it.title}">
                <div class="title">${it.title}</div>
            `;
            // hover modal show
            div.addEventListener('mouseenter', (e)=>{
                if(window.hoverModal && typeof window.hoverModal.show === 'function'){
                    window.hoverModal.show(it, div);
                    window.hoverModalItem = it;
                }
            });
            div.addEventListener('mouseleave', (e)=>{
                if(window.hoverModal && typeof window.hoverModal.hide === 'function'){
                    window.hoverModal.hide();
                    window.hoverModalItem = null;
                }
            });
            // click -> details with preservation of catalog state
            div.addEventListener('click', (e)=>{
                if(window.detailsModal && typeof window.detailsModal.show === 'function'){
                    const normTitle = normalizeText(it.title);
                    const idHash = `#id=${encodeURIComponent(it.id)}&title=${encodeURIComponent(normTitle)}`;
                    // Guardar el estado actual del catálogo
                    const currentCatalogHash = window.location.hash && window.location.hash.startsWith(CATALOG_HASH) ? window.location.hash : `${CATALOG_HASH}?tab=${encodeURIComponent(document.querySelector('.catalogo-tab.active').dataset.tab)}`;
                    // Push state con referencia al catalogo
                    history.pushState({ catalogHash: currentCatalogHash }, '', idHash);
                    // Abrir detalles
                    window.detailsModal.show(it, div).then(()=>{
                        window.activeItem = it;
                    }).catch(err=>console.error(err));
                }
            });
            grid.appendChild(div);
        });
    }

    function applyFiltersAndRender(data, activeTab, genreFilter){
        const items = data.map(buildItemFromData).filter(it=>{
            if(activeTab && it.category && it.category !== activeTab) return false;
            if(genreFilter && genreFilter !== 'Todo el catálogo'){
                const gens = (it.genres||'').split('·').map(g=>g.trim());
                if(!gens.includes(genreFilter)) return false;
            }
            return true;
        });
        renderGrid(items);
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
                overlay.style.zIndex = '9999';
                header.dataset._prevZ = header.style.zIndex || '';
                header.style.zIndex = String(10000);
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
    }

    function closeCatalogOverlay(){
        const overlay = document.getElementById('catalogo-modal-overlay');
        if(!overlay) return;
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden','true');
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
