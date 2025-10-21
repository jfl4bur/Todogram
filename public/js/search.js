// Módulo de búsqueda en vivo
(function(){
    const DEBOUNCE_MS = 200;
    const MAX_PER_SECTION = 80;

    function normalizeText(t){
        if(!t) return '';
        try{
            return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        }catch(e){ return String(t).toLowerCase(); }
    }

    async function loadAllData(){
        if(window.sharedData && Array.isArray(window.sharedData) && window.sharedData.length>0) return window.sharedData;
        try{
            const resp = await fetch(window.DATA_URL || '/public/data.json');
            if(!resp.ok) throw new Error('no data');
            const d = await resp.json();
            window.sharedData = d;
            return d;
        }catch(e){
            return window.sharedData || [];
        }
    }

    function mapRowToItem(row, idx, prefix){
        const rawGenres = row['Géneros'] || row['Género'] || '';
        const genresList = String(rawGenres).split(/·|\||,|\/|;/).map(s=>s.trim()).filter(Boolean);
        return {
            id: row['ID TMDB'] ? String(row['ID TMDB']) : `${prefix}_${idx}`,
            title: row['Título'] || row['Título original'] || 'Sin título',
            originalTitle: row['Título original'] || '',
            description: row['Synopsis'] || row['Sinopsis'] || row['Descripción'] || '',
            posterUrl: row['Portada'] || '',
            postersUrl: row['Carteles'] || '',
            backgroundUrl: row['Carteles'] || row['Portada'] || '',
            category: row['Categoría'] || prefix,
            genre: genresList.length ? genresList[0] : '',
            genres: rawGenres || '',
            genresList: genresList,
            year: row['Año'] || '',
            duration: row['Duración'] || '',
            videoIframe: row['Video iframe'] || row['Video iframe 1'] || '',
            videoUrl: row['Video'] || row['Enlace'] || row['Ver Película'] || '',
            trailerUrl: row['Trailer'] || '',
            cast: row['Reparto principal'] || row['Reparto'] || '',
            director: row['Director(es)'] || row['Director'] || '',
            writers: row['Escritor(es)'] || row['Escritor'] || '',
            tmdbUrl: row['TMDB'] || '',
            audiosCount: row['Audios'] ? String(row['Audios']).split(',').length : 0,
            subtitlesCount: row['Subtítulos'] ? String(row['Subtítulos']).split(',').length : 0,
            audioList: row['Audios'] ? String(row['Audios']).split(',').map(s=>s.trim()) : [],
            subtitleList: row['Subtítulos'] ? String(row['Subtítulos']).split(',').map(s=>s.trim()) : [],
            raw: row
        };
    }

    function createItemElement(item, small=false, isEpisode=false){
        const div = document.createElement('div');
        div.className = 'custom-carousel-item' + (isEpisode ? ' episodios-series-item' : '');
        div.dataset.itemId = item.id;
        const poster = item.posterUrl || item.postersUrl || 'https://via.placeholder.com/194x271';
        const meta = [];
        if(item.year) meta.push(`<span>${item.year}</span>`);
        if(item.duration) meta.push(`<span>${item.duration}</span>`);
        if(item.genre) meta.push(`<span>${item.genre}</span>`);
        div.innerHTML = `
            <div class="loader"><i class="fas fa-spinner"></i></div>
            <div class="poster-container">
                <img class="poster-image" src="${poster}" alt="${item.title}" loading="lazy" style="opacity:0;transition:opacity .25s ease">
            </div>
            <div class="carousel-overlay">
                <div class="carousel-title">${item.title}</div>
                ${meta.length ? `<div class="carousel-meta">${meta.join('')}</div>` : ''}
                ${item.description ? `<div class="carousel-description">${item.description}</div>` : ''}
            </div>
        `;
        const img = div.querySelector('img');
        img.onload = function(){ img.style.opacity = '1'; const l = div.querySelector('.loader'); if(l) l.style.display='none'; };
        div.addEventListener('click', (e)=>{
            e.preventDefault();
            try{ window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#search?q=${encodeURIComponent(window.SearchModule._lastQuery||'')}&id=${encodeURIComponent(item.id)}&title=${encodeURIComponent(item.title)}`); }catch(e){}
            try{ if(!window.detailsModal && typeof DetailsModal === 'function') window.detailsModal = new DetailsModal(); }catch(e){}
            try{ window.activeItem = item; if(window.detailsModal && typeof window.detailsModal.show === 'function') window.detailsModal.show(item, div); }catch(e){ console.error('search: open details failed', e); }
        });
        return div;
    }

    function clearDisplay(originalSelectors){
        // hide originals
        originalSelectors.forEach(sel=>{
            const el = document.querySelector(sel);
            if(el) el.style.display = 'none';
        });
    }

    function restoreDisplay(originalSelectors){
        originalSelectors.forEach(sel=>{
            const el = document.querySelector(sel);
            if(el) el.style.display = '';
        });
    }

    // Build search result container
    function buildSearchContainer(){
        let container = document.getElementById('search-results-root');
        if(container) return container;
        container = document.createElement('div');
        container.id = 'search-results-root';
        container.className = 'search-results-root';
        container.innerHTML = `
            <div class="search-section" data-section="movies"><h3>Películas</h3><div class="search-carousel" id="search-movies-wrapper"></div></div>
            <div class="search-section" data-section="series"><h3>Series</h3><div class="search-carousel" id="search-series-wrapper"></div></div>
            <div class="search-section" data-section="animes"><h3>Animes</h3><div class="search-carousel" id="search-animes-wrapper"></div></div>
            <div class="search-section" data-section="documentales"><h3>Documentales</h3><div class="search-carousel" id="search-documentales-wrapper"></div></div>
            <div class="search-section" data-section="episodios"><h3>Episodios</h3><div class="search-carousel" id="search-episodios-wrapper"></div></div>
        `;
        // Insert after header-root if exists, otherwise at body start
        const headerRoot = document.getElementById('header-root') || document.body;
        headerRoot.parentNode.insertBefore(container, headerRoot.nextSibling);
        return container;
    }

    const SearchModule = {
        _lastQuery: '',
        _debounceTimer: null,
        _originalSelectors: [
            '.carousel-section', // generic
            '#carousel-wrapper',
            '#series-carousel-wrapper',
            '#animes-carousel-wrapper',
            '#documentales-carousel-wrapper',
            '#episodios-series-carousel-wrapper',
            '#episodios-animes-carousel-wrapper',
            '#catalogo-page-root'
        ],
        async performSearch(q){
            this._lastQuery = q || '';
            if(!q || String(q).trim() === ''){
                // clear
                const root = document.getElementById('search-results-root');
                if(root) root.style.display = 'none';
                restoreDisplay(this._originalSelectors);
                try{ history.replaceState(null, null, window.location.pathname + window.location.search); }catch(e){}
                return;
            }
            const container = buildSearchContainer();
            clearDisplay(this._originalSelectors);
            container.style.display = '';
            const data = await loadAllData();
            const qn = normalizeText(q);
            const movies = [], series = [], animes = [], documentales = [], episodios = [];
            for(let i=0;i<data.length;i++){
                const row = data[i];
                if(!row || typeof row !== 'object') continue;
                const isEpisode = row['Título episodio'] && String(row['Título episodio']).trim() !== '';
                const titleCandidates = [];
                if(isEpisode){ titleCandidates.push(row['Título episodio']); titleCandidates.push(row['Título']); }
                else { titleCandidates.push(row['Título']); titleCandidates.push(row['Título original']); }
                const hay = titleCandidates.some(tc => tc && normalizeText(tc).includes(qn));
                if(!hay) continue;
                const cat = row['Categoría'] || '';
                const item = mapRowToItem(row, i, cat || 'item');
                if(isEpisode){ episodios.push(item); }
                else if(cat === 'Películas'){ movies.push(item); }
                else if(cat === 'Series'){ series.push(item); }
                else if(cat === 'Animes'){ animes.push(item); }
                else if(cat === 'Documentales'){ documentales.push(item); }
                else { movies.push(item); }
            }
            // render into wrappers
            function renderList(list, wrapperId){
                const w = document.getElementById(wrapperId);
                if(!w) return;
                w.innerHTML = '';
                const take = list.slice(0, MAX_PER_SECTION);
                for(const it of take){ w.appendChild(createItemElement(it)); }
                if(take.length === 0) w.innerHTML = '<div class="no-results">No se encontraron resultados</div>';
            }
            renderList(movies,'search-movies-wrapper');
            renderList(series,'search-series-wrapper');
            renderList(animes,'search-animes-wrapper');
            renderList(documentales,'search-documentales-wrapper');
            renderList(episodios,'search-episodios-wrapper');

            // push search hash
            try{
                const encoded = encodeURIComponent(q);
                window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#search?q=${encoded}`);
            }catch(e){ /* ignore */ }
        },
        init(){
            buildSearchContainer();
        }
    };

    window.SearchModule = SearchModule;
})();
