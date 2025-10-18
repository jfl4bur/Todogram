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
        return {
            id: d['ID TMDB'] ? d['ID TMDB'] : `i_${index}`,
            title: d['Título'] || d['Título original'] || 'Sin título',
            description: d['Synopsis'] || '',
            posterUrl: d['Portada'] || d['Carteles'] || '',
            backgroundUrl: d['Carteles'] || d['Portada'] || '',
            category: d['Categoría'] || 'Películas',
            genres: d['Géneros'] || '',
            year: d['Año'] || '',
            videoIframe: d['Video iframe'] || '',
            videoIframe1: d['Video iframe 1'] || d['Video iframe1'] || '',
            videoUrl: d['Video'] || d['Enlace'] || '' ,
            trailerUrl: d['Trailer'] || d['TrailerUrl'] || ''
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
    const state = { allItems: [], filteredItems: [], renderedCount:0, initialRows:6, subsequentRows:3, itemsPerRow:0, initialBatchSize:0, subsequentBatchSize:0, loading:false };

    function computeItemsPerRow(grid){ if(!grid) return 6; const containerWidth = grid.clientWidth||document.documentElement.clientWidth; const rootStyles=getComputedStyle(document.documentElement); const itemW = parseInt(rootStyles.getPropertyValue('--item-width'))||194; const gap = parseInt(getComputedStyle(grid).getPropertyValue('gap'))||18; return Math.max(1, Math.floor((containerWidth+gap)/(itemW+gap))); }

    function createCard(it){ const d = document.createElement('div'); d.className='catalogo-item'; d.dataset.itemId = it.id; d.setAttribute('role','listitem'); d.innerHTML = `<img src="${it.posterUrl||'https://via.placeholder.com/194x271'}" alt="${it.title}"><div class="catalogo-item-title">${it.title}</div>`; d.addEventListener('click', ()=>{ if(window.detailsModal && typeof window.detailsModal.show==='function'){ const norm = normalizeText(it.title); history.pushState({}, '', `#id=${encodeURIComponent(it.id)}&title=${encodeURIComponent(norm)}`); window.detailsModal.show(it, d).catch(()=>{}); } }); return d; }

    function resetPagination(grid){ state.itemsPerRow = computeItemsPerRow(grid); state.initialBatchSize = Math.max(1, state.itemsPerRow * state.initialRows); state.subsequentBatchSize = Math.max(1, state.itemsPerRow * state.subsequentRows); state.renderedCount = 0; grid.innerHTML=''; }

    function renderSlice(grid, start, end){ const f = document.createDocumentFragment(); for(let i=start;i<end&&i<state.filteredItems.length;i++){ f.appendChild(createCard(state.filteredItems[i])); } grid.appendChild(f); }

    function appendNextBatch(grid){ if(state.loading) return; if(state.renderedCount >= state.filteredItems.length) return; state.loading=true; const isInitial = state.renderedCount===0; const batch = isInitial?state.initialBatchSize:state.subsequentBatchSize; const start=state.renderedCount; const end=Math.min(state.renderedCount+batch, state.filteredItems.length); renderSlice(grid, start, end); state.renderedCount=end; if(start===0){ const sk = document.querySelector('#catalogo-skeleton-page'); if(sk) sk.style.display='none'; } state.loading=false; }

    function applyFiltersAndRender(grid, data, tab, genre){ state.allItems = (data||[]).map(buildItemFromData); state.filteredItems = state.allItems.filter(it=>{ if(tab && it.category && it.category!==tab) return false; if(genre && genre!=='Todo el catálogo'){ const gens = (it.genres||'').split('·').map(x=>x.trim()); if(!gens.includes(genre)) return false; } return true; }); resetPagination(grid); appendNextBatch(grid); }

    function parseCatalogHash(){ const raw = window.location.hash||''; if(!raw.startsWith(CATALOG_HASH)) return null; const q = raw.substring(CATALOG_HASH.length); if(!q) return {}; const p = new URLSearchParams(q.replace(/^\?/,'')); return { tab:p.get('tab')||null, genre:p.get('genre')||null, id:p.get('id')||null, title:p.get('title')||null }; }

    function updateCatalogHash(tab, genre, preserve=false){ const params = new URLSearchParams(); if(tab) params.set('tab', tab); if(genre) params.set('genre', genre); const newHash = `${CATALOG_HASH}?${params.toString()}`; if(preserve) history.replaceState({}, '', newHash); else history.pushState({}, '', newHash); }

    async function initPage(rootSelector='#catalogo-page-root'){
        const root = document.querySelector(rootSelector); if(!root){ console.error('Catalogo: root no encontrado', rootSelector); return; }
        root.innerHTML = `\n            <div class="catalogo-page">\n                <div class="catalogo-page-header">\n                    <div class="catalogo-controls">\n                        <div class="catalogo-genre-dropdown" id="catalogo-genre-dropdown-page">\n                            <button id="catalogo-genre-button-page" aria-haspopup="true" aria-expanded="false">Todo el catálogo ▾</button>\n                            <div id="catalogo-genre-list-page" class="catalogo-genre-list" style="display:none" role="menu"></div>\n                        </div>\n                    </div>\n                    <div class="catalogo-tabs" id="catalogo-tabs-page">\n                        <button data-tab="Películas" class="catalogo-tab active">Películas</button>\n                        <button data-tab="Series" class="catalogo-tab">Series</button>\n                        <button data-tab="Documentales" class="catalogo-tab">Documentales</button>\n                        <button data-tab="Animes" class="catalogo-tab">Animes</button>\n                    </div>\n                </div>\n                <div class="catalogo-page-body">\n                    <div class="carousel-skeleton" id="catalogo-skeleton-page" style="display:flex;gap:12px;flex-wrap:wrap;">\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                        <div class="skeleton-item"><div class="skeleton-spinner"></div></div>\n                    </div>\n                    <div class="catalogo-grid" id="catalogo-grid-page" role="list" aria-busy="false"></div>\n                </div>\n            </div>\n        `;

        const tabsContainer = document.getElementById('catalogo-tabs-page');
        const genreBtn = document.getElementById('catalogo-genre-button-page');
        const genreList = document.getElementById('catalogo-genre-list-page');
        const grid = document.getElementById('catalogo-grid-page');

        const data = await loadData();

        function populateGenresForTabPage(tab){ const gens = extractGenres(data, tab); genreList.innerHTML=''; const allBtn = document.createElement('button'); allBtn.textContent='Todo el catálogo'; allBtn.classList.add('genre-item'); allBtn.addEventListener('click', ()=>{ genreBtn.textContent='Todo el catálogo ▾'; genreList.style.display='none'; updateCatalogHash(tab, 'Todo el catálogo'); applyFiltersAndRender(grid, data, tab, 'Todo el catálogo'); }); genreList.appendChild(allBtn); gens.forEach(g=>{ const b = document.createElement('button'); b.textContent=g; b.classList.add('genre-item'); b.addEventListener('click', ()=>{ genreBtn.textContent = g + ' ▾'; genreList.style.display='none'; updateCatalogHash(tab, g); applyFiltersAndRender(grid, data, tab, g); }); genreList.appendChild(b); }); }

        tabsContainer.querySelectorAll('.catalogo-tab').forEach(btn=>{ btn.addEventListener('click', ()=>{ tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); const tab = btn.dataset.tab; populateGenresForTabPage(tab); const currentGenre = genreBtn.textContent.replace(' ▾','') || 'Todo el catálogo'; updateCatalogHash(tab, currentGenre); applyFiltersAndRender(grid, data, tab, currentGenre); }); });

        genreBtn.addEventListener('click', ()=>{ genreList.style.display = genreList.style.display === 'none' ? 'grid' : 'none'; });

        const initial = parseCatalogHash(); const tab = initial && initial.tab ? initial.tab : 'Películas'; const genre = initial && initial.genre ? initial.genre : 'Todo el catálogo'; populateGenresForTabPage(tab); tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=> x.classList.toggle('active', x.dataset.tab===tab)); genreBtn.textContent = genre + ' ▾'; applyFiltersAndRender(grid, data, tab, genre);

        // lazy load
        let lazyTimer=null; function onCatalogScroll(){ if(!grid) return; const threshold=300; const atBottom = grid.scrollHeight - (grid.scrollTop + grid.clientHeight) < threshold; if(atBottom){ if(lazyTimer) clearTimeout(lazyTimer); lazyTimer = setTimeout(()=>{ appendNextBatch(grid); lazyTimer=null; }, 120); } }
        grid.addEventListener('scroll', onCatalogScroll);

        // resize
        let resizeTimer=null; function onCatalogResize(){ if(resizeTimer) clearTimeout(resizeTimer); resizeTimer = setTimeout(()=>{ state.itemsPerRow = computeItemsPerRow(grid); state.initialBatchSize = Math.max(1, state.itemsPerRow * state.initialRows); state.subsequentBatchSize = Math.max(1, state.itemsPerRow * state.subsequentRows); if(state.renderedCount < Math.min(state.filteredItems.length, state.initialBatchSize)) appendNextBatch(grid); }, 120); }
        window.addEventListener('resize', onCatalogResize);

        // hash change
        window.addEventListener('hashchange', ()=>{ const parsed = parseCatalogHash(); if(parsed && parsed.tab){ const tab = parsed.tab || 'Películas'; const genre = parsed.genre || 'Todo el catálogo'; tabsContainer.querySelectorAll('.catalogo-tab').forEach(x=> x.classList.toggle('active', x.dataset.tab===tab)); genreBtn.textContent = genre + ' ▾'; populateGenresForTabPage(tab); applyFiltersAndRender(grid, data, tab, genre); } });

        document.addEventListener('click', (e)=>{ if(!e.target.closest('.catalogo-genre-dropdown')){ genreList.style.display='none'; genreBtn.setAttribute('aria-expanded','false'); } });
    }

    document.addEventListener('DOMContentLoaded', ()=>{ try{ initPage(); }catch(e){ console.error('catalogo page init error', e); } });

    // expose a minimal API to allow manual init if needed
    window.Catalogo = { initPage };

})();
