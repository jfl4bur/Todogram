/**
 * Slider de Géneros al estilo Rakuten TV
 * Implementa carruseles por género con las últimas entradas y sin duplicados
 */

class RakutenGenreSlider {
    constructor() {
        this.genres = {
            'terror': ['Terror', 'Horror', 'Suspenso'],
            'accion': ['Acción', 'Action', 'Aventura'],
            'ciencia-ficcion': ['Ciencia Ficción', 'Sci-Fi', 'Science Fiction', 'Ficción'],
            'comedia': ['Comedia', 'Comedy'],
            'romance': ['Romance', 'Romántico', 'Romántica']
        };
        
        this.moviesData = [];
        this.usedMovies = new Set(); // Para evitar duplicados
        this.maxItemsPerGenre = 8; // Máximo de películas por género
        
        this.init();
    }

    async init() {
        await this.loadMoviesData();
        this.processGenres();
        this.setupEventListeners();
    }

    async loadMoviesData() {
        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('No se pudo cargar data.json');
            const data = await response.json();
            
            // Filtrar solo películas y ordenar por las más recientes
            this.moviesData = data
                .filter(item => item && typeof item === 'object' && item['Categoría'] === 'Películas')
                .map((item, index) => ({
                    id: index.toString(),
                    title: item['Título'] || 'Sin título',
                    description: item['Synopsis'] || 'Descripción no disponible',
                    posterUrl: item['Portada'] || 'https://via.placeholder.com/200x280',
                    backgroundUrl: item['Carteles'] || item['Portada'] || 'https://via.placeholder.com/200x280',
                    year: item['Año'] ? item['Año'].toString() : '',
                    duration: item['Duración'] || '',
                    genre: item['Géneros'] || '',
                    rating: item['Puntuación 1-10'] ? item['Puntuación 1-10'].toString() : '',
                    videoUrl: item['Video iframe'] || '',
                    originalData: item
                }))
                .sort((a, b) => {
                    // Ordenar por año más reciente
                    const yearA = parseInt(a.year) || 0;
                    const yearB = parseInt(b.year) || 0;
                    return yearB - yearA;
                });

            console.log(`Cargadas ${this.moviesData.length} películas para los géneros`);
        } catch (error) {
            console.error('Error cargando datos para géneros:', error);
            this.moviesData = [];
        }
    }

    processGenres() {
        Object.keys(this.genres).forEach(genreKey => {
            this.processGenre(genreKey);
        });
    }

    processGenre(genreKey) {
        const genreNames = this.genres[genreKey];
        const container = document.getElementById(`genre-${genreKey}`);
        
        if (!container) {
            console.warn(`Container not found for genre: ${genreKey}`);
            return;
        }

        // Filtrar películas por género
        const genreMovies = this.moviesData.filter(movie => {
            // Verificar si la película no ha sido usada ya
            if (this.usedMovies.has(movie.id)) {
                return false;
            }
            
            // Verificar si alguno de los géneros de la película coincide
            const movieGenres = movie.genre.toLowerCase();
            return genreNames.some(genreName => 
                movieGenres.includes(genreName.toLowerCase())
            );
        });

        // Tomar solo las primeras películas (las más recientes)
        const selectedMovies = genreMovies.slice(0, this.maxItemsPerGenre);
        
        // Marcar como usadas para evitar duplicados
        selectedMovies.forEach(movie => {
            this.usedMovies.add(movie.id);
        });

        // Renderizar el carrusel
        this.renderGenreCarousel(container, selectedMovies, genreKey);
    }

    renderGenreCarousel(container, movies, genreKey) {
        const skeleton = container.querySelector('.genre-carousel-skeleton');
        const content = container.querySelector('.genre-carousel-content');
        
        if (!content) return;

        // Limpiar contenido anterior
        content.innerHTML = '';

        if (movies.length === 0) {
            content.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No se encontraron películas para este género</p>';
            skeleton.style.display = 'none';
            content.style.display = 'block';
            return;
        }

        // Crear elementos de película
        movies.forEach((movie, index) => {
            const movieElement = this.createMovieElement(movie, index);
            content.appendChild(movieElement);
        });

        // Ocultar skeleton y mostrar contenido
        setTimeout(() => {
            skeleton.style.display = 'none';
            content.style.display = 'flex';
        }, 800 + (movies.length * 100)); // Delay progresivo

        // Actualizar botones de navegación
        this.updateNavigationButtons(container, genreKey);
    }

    createMovieElement(movie, index) {
        const div = document.createElement('div');
        div.className = 'rakuten-carousel-item';
        div.style.animationDelay = `${index * 0.1}s`;
        div.dataset.movieId = movie.id;

        // Verificar si es una película reciente (último año)
        const currentYear = new Date().getFullYear();
        const movieYear = parseInt(movie.year) || 0;
        const isNew = movieYear >= currentYear - 1;

        div.innerHTML = `
            <div class="rakuten-poster-container">
                <img class="rakuten-poster-image" 
                     src="${movie.posterUrl}" 
                     alt="${movie.title}"
                     onerror="this.src='https://via.placeholder.com/200x280?text=Sin+Imagen'">
                <div class="rakuten-gradient-overlay"></div>
                ${isNew ? '<div class="rakuten-new-badge">Nuevo</div>' : ''}
            </div>
            <div class="rakuten-overlay">
                <h3 class="rakuten-item-title">${movie.title}</h3>
                <div class="rakuten-item-meta">
                    ${movie.year ? `<span class="year">${movie.year}</span>` : ''}
                    ${movie.rating ? `<span class="rating"><i class="fas fa-star"></i>${movie.rating}</span>` : ''}
                    ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                </div>
                ${movie.genre ? `<div class="rakuten-item-genre">${movie.genre.split(',')[0].trim()}</div>` : ''}
            </div>
        `;

        // Agregar evento de clic
        div.addEventListener('click', () => {
            this.handleMovieClick(movie);
        });

        return div;
    }

    handleMovieClick(movie) {
        // Integrar con el sistema de modales existente
        if (window.detailsModal && typeof window.detailsModal.openModal === 'function') {
            window.detailsModal.openModal(movie.originalData);
        } else if (window.hoverModal && typeof window.hoverModal.showModal === 'function') {
            // Fallback al modal hover si está disponible
            const event = { target: { closest: () => null } };
            window.hoverModal.showModal(event, movie.originalData);
        } else {
            // Fallback básico - abrir en nueva pestaña si hay enlace de video
            if (movie.videoUrl) {
                window.open(movie.videoUrl, '_blank');
            } else {
                console.log('Película seleccionada:', movie.title);
            }
        }
    }

    setupEventListeners() {
        // Event listeners para botones de navegación
        document.querySelectorAll('.genre-carousel-nav .carousel-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const genre = e.target.closest('[data-genre]')?.dataset.genre;
                const isPrev = e.target.closest('.prev');
                
                if (genre) {
                    this.navigate(genre, isPrev);
                }
            });
        });

        // Scroll handling para actualizar botones
        document.querySelectorAll('.genre-carousel-content').forEach(content => {
            content.addEventListener('scroll', () => {
                const container = content.closest('.genre-carousel-container');
                const genreKey = container.id.replace('genre-', '');
                this.updateNavigationButtons(container, genreKey);
            });
        });
    }

    navigate(genreKey, isPrev) {
        const container = document.getElementById(`genre-${genreKey}`);
        const content = container.querySelector('.genre-carousel-content');
        
        if (!content) return;

        const scrollAmount = 400; // Cantidad de scroll por navegación
        const currentScroll = content.scrollLeft;
        const targetScroll = isPrev 
            ? Math.max(0, currentScroll - scrollAmount)
            : currentScroll + scrollAmount;

        content.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }

    updateNavigationButtons(container, genreKey) {
        const content = container.querySelector('.genre-carousel-content');
        const prevBtn = container.querySelector('.carousel-nav-btn.prev');
        const nextBtn = container.querySelector('.carousel-nav-btn.next');
        
        if (!content || !prevBtn || !nextBtn) return;

        const isAtStart = content.scrollLeft <= 0;
        const isAtEnd = content.scrollLeft >= content.scrollWidth - content.clientWidth - 1;

        prevBtn.disabled = isAtStart;
        nextBtn.disabled = isAtEnd;
    }

    // Método público para refrescar los datos
    async refresh() {
        this.usedMovies.clear();
        await this.loadMoviesData();
        this.processGenres();
    }
}

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para asegurar que otros scripts se hayan cargado
    setTimeout(() => {
        window.rakutenSlider = new RakutenGenreSlider();
    }, 1000);
});

// Hacer disponible globalmente para debugging
window.RakutenGenreSlider = RakutenGenreSlider;