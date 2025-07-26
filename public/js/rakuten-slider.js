// rakuten-slider.js

(function() {
    const GENEROS_OBJETIVO = [
        'Terror',
        'Acción',
        'Ciencia Ficción',
        'Comedia',
        'Romance'
    ];

    // Utilidad para normalizar géneros
    function normalizarGenero(g) {
        return g.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    // Utilidad para saber si una película ya está incluida
    function yaIncluida(pelicula, lista) {
        return lista.some(p => p.id === pelicula.id || p.title === pelicula.title);
    }

    // Cargar datos y construir slider
    async function initRakutenSlider() {
        let data = window.peliculas;
        if (!data || !Array.isArray(data) || data.length === 0) {
            // Si no está cargado aún, cargar manualmente
            try {
                const res = await fetch(window.DATA_URL);
                data = await res.json();
            } catch (e) {
                return;
            }
        }
        // Adaptar estructura si viene de main.js o del carrusel
        data = data.map((item, idx) => ({
            id: item.id || idx.toString(),
            title: item['Ttulo'] || item.title || '',
            description: item['Synopsis'] || item.description || '',
            posterUrl: item['Portada'] || item.posterUrl || '',
            postersUrl: item['Carteles'] || item.postersUrl || '',
            backgroundUrl: item['Fondo'] || item.backgroundUrl || '',
            year: item['Ao'] || item.year || '',
            duration: item['Duracin'] || item.duration || '',
            genre: item['Gneros'] || item.genre || '',
            rating: item['Puntuacin 1-10'] || item.rating || '',
            ageRating: item['Clasificacin'] || item.ageRating || '',
            link: item['Enlace'] || item.link || '#',
            trailerUrl: item['Trailer'] || item.trailerUrl || '',
            videoUrl: item['Video iframe'] || item.videoUrl || '',
            tmdbUrl: item['TMDB'] || item.tmdbUrl || '',
            audiosCount: item['Audios'] ? item['Audios'].split(',').length : (item.audiosCount || 0),
            subtitlesCount: item['Subttulos'] ? item['Subttulos'].split(',').length : (item.subtitlesCount || 0),
            audioList: item['Audios'] ? item['Audios'].split(',') : (item.audioList || []),
            subtitleList: item['Subttulos'] ? item['Subttulos'].split(',') : (item.subtitleList || [])
        }));

        // Seleccionar la primera película de cada género objetivo, sin repetir
        const seleccionadas = [];
        const usados = new Set();
        for (const genero of GENEROS_OBJETIVO) {
            const normalizado = normalizarGenero(genero);
            const peli = data.find(p =>
                p.genre &&
                p.genre.split(/[·,]/).map(normalizarGenero).includes(normalizado) &&
                !usados.has(p.title)
            );
            if (peli) {
                seleccionadas.push(peli);
                usados.add(peli.title);
            }
        }

        // Renderizar slides
        const wrapper = document.getElementById('rakuten-slider-wrapper');
        if (!wrapper) return;
        wrapper.innerHTML = '';
        seleccionadas.forEach((item, idx) => {
            const slide = document.createElement('div');
            slide.className = 'rakuten-slider-slide';
            slide.tabIndex = 0;
            slide.setAttribute('data-item-id', item.id);
            slide.setAttribute('data-idx', idx);
            slide.innerHTML = `
                <a href="#id=${item.id}&title=${normalizeText(item.title)}" class="rakuten-slider-link" tabindex="-1" aria-label="${item.title}">
                    <div class="rakuten-slider-img-wrapper">
                        <img class="rakuten-slider-img" src="${item.postersUrl || item.posterUrl}" alt="${item.title}">
                    </div>
                </a>
            `;
            // Click abre details-modal
            slide.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.detailsModal) {
                    window.detailsModal.show(item, slide);
                }
            });
            // Accesibilidad: enter/space
            slide.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (window.detailsModal) {
                        window.detailsModal.show(item, slide);
                    }
                }
            });
            wrapper.appendChild(slide);
        });

        // Navegación por flechas
        const btnPrev = document.querySelector('.rakuten-slider-prev');
        const btnNext = document.querySelector('.rakuten-slider-next');
        btnPrev.addEventListener('click', function(e) {
            e.preventDefault();
            wrapper.scrollBy({ left: -wrapper.clientWidth * 0.8, behavior: 'smooth' });
        });
        btnNext.addEventListener('click', function(e) {
            e.preventDefault();
            wrapper.scrollBy({ left: wrapper.clientWidth * 0.8, behavior: 'smooth' });
        });

        // Sincronizar details-modal con el hash
        window.addEventListener('hashchange', function() {
            const hash = window.location.hash;
            if (hash.startsWith('#id=')) {
                const id = hash.match(/id=([^&]+)/)?.[1];
                const peli = seleccionadas.find(p => p.id === id);
                if (peli && window.detailsModal && !window.detailsModal.isDetailsModalOpen) {
                    window.detailsModal.show(peli, null);
                }
            }
        });
        // Si al cargar hay hash, mostrar modal
        if (window.location.hash.startsWith('#id=')) {
            const id = window.location.hash.match(/id=([^&]+)/)?.[1];
            const peli = seleccionadas.find(p => p.id === id);
            if (peli && window.detailsModal && !window.detailsModal.isDetailsModalOpen) {
                window.detailsModal.show(peli, null);
            }
        }
    }

    // Utilidad para normalizar texto para el hash
    function normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    // Esperar a que window.detailsModal esté listo
    function waitForModalAndInit() {
        if (window.detailsModal) {
            initRakutenSlider();
        } else {
            setTimeout(waitForModalAndInit, 100);
        }
    }
    waitForModalAndInit();
})(); 