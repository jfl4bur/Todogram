class GenreSlider {
    constructor() {
        this.wrapper = document.getElementById('genre-slider-wrapper');
        this.skeleton = document.getElementById('genre-slider-skeleton');
        this.progressBar = document.querySelector('.genre-slider-progress-bar');
        this.carouselNav = document.getElementById('genre-slider-nav');
        this.carouselPrev = document.getElementById('genre-slider-prev');
        this.carouselNext = document.getElementById('genre-slider-next');
        this.carouselContainer = document.querySelector('.genre-slider-container');
        this.itemsPerPage = 5;
        this.index = 0;
        this.step = 1000000;
        this.moreAppended = false;
        this.moviesData = [];
        this.hoverTimeouts = {};
        this.usedMovies = new Set(); // Para evitar duplicados

        // Géneros específicos que queremos mostrar
        this.targetGenres = ['Terror', 'Acción', 'Ciencia Ficción', 'Comedia', 'Romance'];

        if (!this.wrapper || !this.skeleton || !this.carouselContainer) {
            console.error("Elementos del slider de géneros no encontrados");
            return;
        }
        if (!this.carouselPrev || !this.carouselNext || !this.carouselNav) {
            console.error("Elementos de navegación del slider de géneros no encontrados");
            const observer = new MutationObserver(() => {
                this.carouselPrev = document.getElementById('genre-slider-prev');
                this.carouselNext = document.getElementById('genre-slider-next');
                this.carouselNav = document.getElementById('genre-slider-nav');
                if (this.carouselPrev && this.carouselNext && this.carouselNav) {
                    this.setupEventListeners();
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            return;
        }

        this.init();
    }

    init() {
        this.setupResizeObserver();
        this.setupEventListeners();
        this.loadMoviesData();
    }

    setupResizeObserver() {
        if (!this.wrapper) {
            console.error('wrapper no definido en setupResizeObserver');
            this.itemsPerPage = 5;
            return;
        }

        const itemWidth = 194;
        const gap = 4;

        const calculate = () => {
            const containerWidth = this.wrapper.clientWidth;
            if (containerWidth > 0) {
                this.itemsPerPage = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));
            } else {
                this.itemsPerPage = 5;
            }
        };

        calculate();
        const resizeObserver = new ResizeObserver(() => {
            calculate();
        });
        resizeObserver.observe(this.wrapper);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.calculateItemsPerPage());
        this.carouselPrev.addEventListener('click', (e) => {
            e.preventDefault();
            this.scrollToPrevPage();
        });
        this.carouselNext.addEventListener('click', (e) => {
            e.preventDefault();
            this.scrollToNextPage();
        });
        this.wrapper.addEventListener('scroll', () => this.handleScroll());
    }

    async loadMoviesData() {
        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('No se pudo cargar data.json');
            const data = await response.json();
            
            // Filtrar películas por géneros específicos y evitar duplicados
            const genreMovies = [];
            const usedMovies = new Set();

            for (const genre of this.targetGenres) {
                const moviesForGenre = data
                    .filter(item => 
                        item && 
                        typeof item === 'object' && 
                        item['Categoría'] === 'Películas' &&
                        item['Géneros'] && 
                        item['Géneros'].includes(genre) &&
                        !usedMovies.has(item['Título']) && // Evitar duplicados
                        item['Portada'] && // Asegurar que tiene portada
                        item['Título'] // Asegurar que tiene título
                    )
                    .map((item, index) => ({
                        id: `${genre}-${index}`,
                        title: item['Título'] || 'Sin título',
                        description: item['Synopsis'] || 'Descripción no disponible',
                        posterUrl: item['Portada'] || '',
                        postersUrl: item['Carteles'] || '',
                        backgroundUrl: item['Fondo'] || '',
                        year: item['Año'] ? item['Año'].toString() : '',
                        duration: item['Duración'] || '',
                        rating: item['Puntuación 1-10'] || '',
                        genres: item['Géneros'] || '',
                        trailer: item['Trailer'] || '',
                        videoUrl: item['Video iframe'] || '',
                        videoUrl1: item['Video iframe 1'] || '',
                        tmdbUrl: item['TMDB'] || '',
                        tmdbId: item['ID TMDB'] || '',
                        originalTitle: item['Título original'] || '',
                        director: item['Director(es)'] || '',
                        cast: item['Reparto principal'] || '',
                        audio: item['Audios'] || '',
                        subtitles: item['Subtítulos'] || '',
                        country: item['País(es)'] || '',
                        language: item['Idioma(s) original(es)'] || '',
                        production: item['Productora(s)'] || '',
                        writer: item['Escritor(es)'] || '',
                        category: item['Categoría'] || '',
                        primaryGenre: genre // Género principal para este slider
                    }));

                // Tomar la película más reciente de este género
                if (moviesForGenre.length > 0) {
                    const latestMovie = moviesForGenre[0]; // Asumiendo que están ordenadas por fecha
                    genreMovies.push(latestMovie);
                    usedMovies.add(latestMovie.title);
                }
            }

            this.moviesData = genreMovies;
            this.showCarousel();
        } catch (error) {
            console.error('Error cargando datos de películas:', error);
        }
    }

    showCarousel() {
        if (this.skeleton) this.skeleton.style.display = 'none';
        if (this.wrapper) this.wrapper.style.display = 'flex';
        this.renderItems();
    }

    async renderItems() {
        if (!this.wrapper) return;

        this.wrapper.innerHTML = '';
        
        for (let i = 0; i < this.moviesData.length; i++) {
            const movie = this.moviesData[i];
            const item = document.createElement('div');
            item.className = 'custom-carousel-item';
            item.dataset.index = i;
            item.dataset.movieId = movie.id;

            const ageRating = this.calculateAgeRating(movie.rating);
            const ageRatingClass = ageRating ? `age-rating age-rating-${ageRating}` : '';

            item.innerHTML = `
                <div class="poster-container">
                    <img class="poster-image" src="${movie.posterUrl}" alt="${movie.title}" loading="lazy">
                    ${ageRating ? `<div class="${ageRatingClass}">${ageRating}</div>` : ''}
                </div>
                <div class="carousel-overlay">
                    <div class="carousel-title">${movie.title}</div>
                    <div class="carousel-meta">
                        <span>${movie.year}</span>
                        <span>${movie.duration}</span>
                        <span>${movie.primaryGenre}</span>
                    </div>
                    <div class="carousel-rating">
                        <i class="fas fa-star"></i>
                        <span>${movie.rating}</span>
                    </div>
                    <div class="carousel-description">${movie.description}</div>
                </div>
            `;

            // Event listeners para el item
            this.setupItemEventListeners(item, movie);
            
            this.wrapper.appendChild(item);
        }

        this.updateProgressBar();
    }

    setupItemEventListeners(item, movie) {
        // Hover events
        item.addEventListener('mouseenter', () => {
            this.hoverTimeouts[movie.id] = setTimeout(() => {
                this.showHoverModal(movie, item);
            }, 500);
        });

        item.addEventListener('mouseleave', () => {
            if (this.hoverTimeouts[movie.id]) {
                clearTimeout(this.hoverTimeouts[movie.id]);
                delete this.hoverTimeouts[movie.id];
            }
        });

        // Click events
        item.addEventListener('click', (e) => {
            e.preventDefault();
            this.showDetailsModal(movie);
        });
    }

    showHoverModal(movie, item) {
        // Usar el modal de hover existente
        if (window.showHoverModal) {
            window.showHoverModal(movie, item);
        }
    }

    showDetailsModal(movie) {
        // Usar el modal de detalles existente
        if (window.showDetailsModal) {
            window.showDetailsModal(movie);
        }
    }

    calculateAgeRating(rating) {
        const numRating = parseFloat(rating);
        if (numRating >= 8.5) return '18';
        if (numRating >= 7.5) return '16';
        if (numRating >= 6.5) return '13';
        if (numRating >= 5.5) return '7';
        return 'TP';
    }

    scrollToPrevPage() {
        if (this.index > 0) {
            this.index--;
            this.scrollToIndex();
        }
    }

    scrollToNextPage() {
        if (this.index < this.moviesData.length - this.itemsPerPage) {
            this.index++;
            this.scrollToIndex();
        }
    }

    scrollToIndex() {
        if (!this.wrapper) return;
        const itemWidth = 194 + 4; // width + gap
        const scrollPosition = this.index * itemWidth * this.itemsPerPage;
        this.wrapper.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
    }

    updateProgressBar() {
        if (!this.progressBar || !this.wrapper) return;
        const maxScroll = this.wrapper.scrollWidth - this.wrapper.clientWidth;
        const progress = maxScroll > 0 ? (this.wrapper.scrollLeft / maxScroll) * 100 : 0;
        this.progressBar.style.width = `${progress}%`;
    }

    handleScroll() {
        this.updateProgressBar();
    }

    calculateItemsPerPage() {
        if (!this.wrapper) return;
        const itemWidth = 194;
        const gap = 4;
        const containerWidth = this.wrapper.clientWidth;
        this.itemsPerPage = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));
    }
}

// Inicializar el slider de géneros cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new GenreSlider();
}); 