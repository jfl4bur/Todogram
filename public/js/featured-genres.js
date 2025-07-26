class FeaturedGenresCarousel {
    constructor() {
        this.wrapper = document.getElementById('featured-genres-wrapper');
        this.skeleton = document.getElementById('featured-genres-skeleton');
        this.progressBar = document.querySelector('.featured-genres-progress-bar');
        this.navPrev = document.getElementById('featured-genres-prev');
        this.navNext = document.getElementById('featured-genres-next');
        this.container = document.querySelector('.featured-genres-container');
        
        // Géneros objetivo
        this.targetGenres = ['Terror', 'Acción', 'Ciencia Ficción', 'Comedia', 'Romance'];
        this.featuredMovies = [];
        this.currentIndex = 0;
        this.itemsPerPage = 4;
        
        if (!this.wrapper || !this.skeleton || !this.container) {
            console.error("Elementos del carrusel de géneros destacados no encontrados");
            return;
        }

        this.init();
    }

    init() {
        this.setupResizeObserver();
        this.setupEventListeners();
        this.loadFeaturedMovies();
    }

    setupResizeObserver() {
        const itemWidth = 280;
        const gap = 15;

        const calculate = () => {
            const containerWidth = this.wrapper.clientWidth;
            if (containerWidth > 0) {
                this.itemsPerPage = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));
            } else {
                this.itemsPerPage = 4;
            }
        };

        calculate();
        const resizeObserver = new ResizeObserver(() => {
            calculate();
            this.updateNavigation();
        });
        resizeObserver.observe(this.wrapper);
    }

    setupEventListeners() {
        if (this.navPrev && this.navNext) {
            this.navPrev.addEventListener('click', (e) => {
                e.preventDefault();
                this.scrollToPrevPage();
            });
            
            this.navNext.addEventListener('click', (e) => {
                e.preventDefault();
                this.scrollToNextPage();
            });
        }

        if (this.wrapper) {
            this.wrapper.addEventListener('scroll', () => {
                this.updateProgressBar();
                this.updateNavigation();
            });
        }
    }

    async loadFeaturedMovies() {
        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('No se pudo cargar data.json');
            const data = await response.json();

            // Filtrar películas por categoría
            const movies = data.filter(item => 
                item && 
                typeof item === 'object' && 
                (item['Categoría'] === 'Películas' || !item['Categoría']) &&
                item['Título'] &&
                item['Géneros']
            );

            // Encontrar la película más reciente de cada género objetivo
            const genreMovies = new Map();
            
            for (const genre of this.targetGenres) {
                const moviesOfGenre = movies.filter(movie => {
                    const genres = movie['Géneros'] || '';
                    return this.containsGenre(genres, genre);
                });

                if (moviesOfGenre.length > 0) {
                    // Ordenar por año descendente para obtener la más reciente
                    const sortedMovies = moviesOfGenre.sort((a, b) => {
                        const yearA = parseInt(a['Año']) || 0;
                        const yearB = parseInt(b['Año']) || 0;
                        return yearB - yearA; // Orden descendente (más reciente primero)
                    });
                    
                    // Tomar la película más reciente del género
                    const latestMovie = sortedMovies[0];
                    
                    // Evitar duplicados
                    if (!genreMovies.has(latestMovie['Título'])) {
                        genreMovies.set(latestMovie['Título'], {
                            ...latestMovie,
                            primaryGenre: genre
                        });
                    }
                }
            }

            this.featuredMovies = Array.from(genreMovies.values()).map((item, index) => ({
                id: `featured-${index}`,
                title: item['Título'] || 'Sin título',
                description: item['Synopsis'] || 'Descripción no disponible',
                posterUrl: item['Portada'] || '',
                postersUrl: item['Carteles'] || '',
                backgroundUrl: item['Fondo'] || item['Carteles'] || '',
                year: item['Año'] ? item['Año'].toString() : '',
                duration: item['Duración'] || '',
                genre: item['Géneros'] || '',
                primaryGenre: item.primaryGenre || '',
                rating: item['Puntuación 1-10'] || '',
                classification: item['Clasificación'] || '',
                link: item['Ver Película'] || '#',
                trailer: item['Trailer'] || '',
                tmdb: item['TMDB'] || '',
                tmdbId: item['ID TMDB'] || '',
                audios: item['Audios'] || '',
                subtitles: item['Subtítulos'] || '',
                originalTitle: item['Título original'] || '',
                productionCompanies: item['Productora(s)'] || '',
                originalLanguages: item['Idioma(s) original(es)'] || '',
                countries: item['País(es)'] || '',
                directors: item['Director(es)'] || '',
                writers: item['Escritor(es)'] || '',
                cast: item['Reparto principal'] || '',
                videoIframe: item['Video iframe'] || '',
                videoIframe1: item['Video iframe 1'] || ''
            }));

            console.log(`Géneros destacados cargados: ${this.featuredMovies.length} películas`);
            this.renderMovies();

        } catch (error) {
            console.error('Error al cargar películas destacadas:', error);
            this.showError();
        }
    }

    containsGenre(genreString, targetGenre) {
        const normalizedGenres = genreString.toLowerCase();
        const normalizedTarget = targetGenre.toLowerCase();
        
        // Mapeo de sinónimos
        const genreMap = {
            'terror': ['terror', 'horror', 'miedo'],
            'acción': ['acción', 'accion', 'action'],
            'ciencia ficción': ['ciencia ficción', 'ciencia ficcion', 'sci-fi', 'science fiction'],
            'comedia': ['comedia', 'comedy', 'humor'],
            'romance': ['romance', 'romántico', 'romantico', 'romantic']
        };

        const synonyms = genreMap[normalizedTarget] || [normalizedTarget];
        
        return synonyms.some(synonym => 
            normalizedGenres.includes(synonym) ||
            normalizedGenres.includes(synonym.replace(/[áéíóú]/g, (match) => {
                const map = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'};
                return map[match] || match;
            }))
        );
    }

    renderMovies() {
        if (!this.wrapper || this.featuredMovies.length === 0) {
            this.showError();
            return;
        }

        this.wrapper.innerHTML = '';

        this.featuredMovies.forEach(movie => {
            const movieElement = this.createMovieElement(movie);
            this.wrapper.appendChild(movieElement);
        });

        // Ocultar skeleton y mostrar contenido
        if (this.skeleton) {
            this.skeleton.style.display = 'none';
        }
        this.wrapper.style.display = 'flex';

        // Configurar eventos de hover y click
        this.setupMovieEvents();
        this.updateNavigation();
        this.updateProgressBar();
    }

    createMovieElement(movie) {
        const movieDiv = document.createElement('div');
        movieDiv.className = 'featured-genre-item';
        movieDiv.dataset.movieId = movie.id;

        const posterUrl = movie.posterUrl || 'https://via.placeholder.com/280x380/333/fff?text=Sin+Imagen';
        const rating = movie.rating ? parseFloat(movie.rating).toFixed(1) : 'N/A';

        movieDiv.innerHTML = `
            <img src="${posterUrl}" alt="${movie.title}" class="featured-genre-poster" loading="lazy">
            <div class="featured-genre-info">
                <div class="featured-genre-badge">${movie.primaryGenre}</div>
                <div class="featured-genre-title">${movie.title}</div>
                <div class="featured-genre-year">${movie.year}</div>
                <div class="featured-genre-rating">
                    <i class="fas fa-star featured-genre-star"></i>
                    <span>${rating}</span>
                </div>
            </div>
        `;

        return movieDiv;
    }

    setupMovieEvents() {
        const movieElements = this.wrapper.querySelectorAll('.featured-genre-item');
        
        movieElements.forEach(element => {
            const movieId = element.dataset.movieId;
            const movie = this.featuredMovies.find(m => m.id === movieId);
            
            if (movie) {
                // Evento click para abrir modal de detalles
                element.addEventListener('click', () => {
                    if (window.detailsModal) {
                        window.detailsModal.showMovieDetails(movie);
                    }
                });

                // Eventos hover si existe el modal hover
                if (window.hoverModal) {
                    let hoverTimeout;
                    
                    element.addEventListener('mouseenter', () => {
                        hoverTimeout = setTimeout(() => {
                            const rect = element.getBoundingClientRect();
                            window.hoverModal.showHoverModal(movie, rect);
                        }, 500);
                    });

                    element.addEventListener('mouseleave', () => {
                        clearTimeout(hoverTimeout);
                        window.hoverModal.hideHoverModal();
                    });
                }
            }
        });
    }

    scrollToPrevPage() {
        if (!this.wrapper) return;
        
        const itemWidth = 280 + 15; // width + gap
        const scrollAmount = itemWidth * this.itemsPerPage;
        
        this.wrapper.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    }

    scrollToNextPage() {
        if (!this.wrapper) return;
        
        const itemWidth = 280 + 15; // width + gap
        const scrollAmount = itemWidth * this.itemsPerPage;
        
        this.wrapper.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }

    updateNavigation() {
        if (!this.wrapper || !this.navPrev || !this.navNext) return;

        const isAtStart = this.wrapper.scrollLeft <= 5;
        const isAtEnd = this.wrapper.scrollLeft >= 
            (this.wrapper.scrollWidth - this.wrapper.clientWidth - 5);

        this.navPrev.disabled = isAtStart;
        this.navNext.disabled = isAtEnd;
    }

    updateProgressBar() {
        if (!this.wrapper || !this.progressBar) return;

        const scrollWidth = this.wrapper.scrollWidth - this.wrapper.clientWidth;
        const scrollLeft = this.wrapper.scrollLeft;
        const progress = scrollWidth > 0 ? (scrollLeft / scrollWidth) * 100 : 0;

        this.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }

    showError() {
        if (!this.wrapper) return;

        this.wrapper.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; color: var(--primary-color);"></i>
                <h3>No se pudieron cargar los géneros destacados</h3>
                <p>Por favor, intenta recargar la página</p>
            </div>
        `;

        if (this.skeleton) {
            this.skeleton.style.display = 'none';
        }
        this.wrapper.style.display = 'block';
    }
}

// Inicializar el carrusel cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que esté disponible DATA_URL
    if (typeof DATA_URL !== 'undefined') {
        window.featuredGenresCarousel = new FeaturedGenresCarousel();
    } else {
        // Esperar a que se cargue DATA_URL
        const checkDataUrl = setInterval(() => {
            if (typeof DATA_URL !== 'undefined') {
                window.featuredGenresCarousel = new FeaturedGenresCarousel();
                clearInterval(checkDataUrl);
            }
        }, 100);
    }
});