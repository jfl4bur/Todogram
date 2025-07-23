class Carousel {
    constructor() {
        this.wrapper = document.getElementById('carousel-wrapper');
        this.skeleton = document.getElementById('carousel-skeleton');
        this.progressBar = document.querySelector('.carousel-progress-bar');
        this.carouselNav = document.getElementById('carousel-nav');
        this.carouselPrev = document.getElementById('carousel-prev');
        this.carouselNext = document.getElementById('carousel-next');
        this.carouselContainer = document.querySelector('.carousel-container');
        this.itemsPerPage = 5;
        this.index = 0;
        this.step = 12;
        this.moreAppended = false;
        this.moviesData = [];
        this.hoverTimeouts = {};

        if (!this.wrapper || !this.skeleton || !this.carouselContainer) {
            console.error("Elementos del carrusel no encontrados");
            return;
        }
        if (!this.carouselPrev || !this.carouselNext || !this.carouselNav) {
            console.error("Elementos de navegación del carrusel no encontrados");
            const observer = new MutationObserver(() => {
                this.carouselPrev = document.getElementById('carousel-prev');
                this.carouselNext = document.getElementById('carousel-next');
                this.carouselNav = document.getElementById('carousel-nav');
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
            
            this.moviesData = data
                .filter(item => item && typeof item === 'object' && item['Categoría'] === 'Películas')
                .map((item, index) => ({
                    id: index.toString(),
                    title: item['Título'] || 'Sin título',
                    description: item['Synopsis'] || 'Descripción no disponible',
                    posterUrl: item['Portada'] || '',
                    postersUrl: item['Carteles'] || '', // Añadido campo postersUrl
                    backgroundUrl: item['Fondo'] || '',
                    year: item['Año'] ? item['Año'].toString() : '',
                    duration: item['Duración'] || '',
                    genre: item['Géneros'] || '',
                    rating: item['Puntuación 1-10'] ? item['Puntuación 1-10'].toString() : '',
                    ageRating: item['Clasificación'] || '',
                    link: item['Enlace'] || '#',
                    trailerUrl: item['Trailer'] || '',
                    videoUrl: item['Video iframe'] || '',
                    tmdbUrl: item['TMDB'] || '',
                    audiosCount: item['Audios'] ? item['Audios'].split(',').length : 0,
                    subtitlesCount: item['Subtítulos'] ? item['Subtítulos'].split(',').length : 0,
                    audioList: item['Audios'] ? item['Audios'].split(',') : [],
                    subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',') : []
                }));

            if (this.moviesData.length === 0) {
                this.moviesData = [
                    {
                        id: "12345",
                        title: "Ejemplo de película",
                        description: "Esta es una película de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                        posterUrl: "https://via.placeholder.com/194x271",
                        postersUrl: "https://via.placeholder.com/194x271",
                        backgroundUrl: "https://via.placeholder.com/194x271",
                        year: "2023",
                        duration: "120 min",
                        genre: "Acción",
                        rating: "8.5",
                        ageRating: "16",
                        link: "#",
                        trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        videoUrl: "https://ejemplo.com/video.mp4",
                        tmdbUrl: "https://www.themoviedb.org/movie/12345",
                        audiosCount: 1,
                        subtitlesCount: 1,
                        audioList: ["Español"],
                        subtitleList: ["Español"]
                    }
                ];
            }

            this.showCarousel();
            this.renderItems();
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.moviesData = [
                {
                    id: "12345",
                    title: "Ejemplo de película",
                    description: "Esta es una película de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                    posterUrl: "https://via.placeholder.com/194x271",
                    postersUrl: "https://via.placeholder.com/194x271",
                    backgroundUrl: "https://via.placeholder.com/194x271",
                    year: "2023",
                    duration: "120 min",
                    genre: "Acción",
                    rating: "8.5",
                    ageRating: "16",
                    link: "#",
                    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    videoUrl: "https://ejemplo.com/video.mp4",
                    tmdbUrl: "https://www.themoviedb.org/movie/12345",
                    audiosCount: 1,
                    subtitlesCount: 1,
                    audioList: ["Español"],
                    subtitleList: ["Español"]
                }
            ];
            this.showCarousel();
            this.renderItems();
        }
    }

    showCarousel() {
        this.skeleton.style.display = 'none';
        this.wrapper.style.display = 'flex';
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
            this.carouselNav.style.display = 'flex';
        }
    }

    async renderItems() {
        const end = Math.min(this.index + this.step, this.moviesData.length);
        
        for (let i = this.index; i < end; i++) {
            const item = this.moviesData[i];
            const div = document.createElement("div");
            div.className = "custom-carousel-item";
            div.dataset.itemId = i;

            const metaInfo = [];
            if (item.year) metaInfo.push(`<span>${item.year}</span>`);
            if (item.duration) metaInfo.push(`<span>${item.duration}</span>`);
            if (item.genre) metaInfo.push(`<span>${item.genre}</span>`);
            if (item.rating) metaInfo.push(`<div class="carousel-rating"><i class="fas fa-star"></i><span>${item.rating}</span></div>`);
            
            // SOLUCIÓN ROBUSTA PARA AGE-RATING EN ITEMS
            if (item.ageRating && item.ageRating.trim() !== '') {
                metaInfo.push(`<span class="age-rating">${item.ageRating}</span>`);
            }

            let posterUrl = item.posterUrl;
            if (!posterUrl) {
                posterUrl = 'https://via.placeholder.com/194x271';
            }

            div.innerHTML = `
                <div class="loader"><i class="fas fa-spinner"></i></div>
                <div class="poster-container">
                    <img class="poster-image" src="${posterUrl}" alt="${item.title}" onload="this.parentElement.previousElementSibling.style.display='none'; this.style.opacity='1'" style="opacity:0;transition:opacity 0.3s ease">
                </div>
                <img class="detail-background" src="${item.backgroundUrl || posterUrl}" alt="${item.title} - Background" loading="lazy" style="display:none">
                <div class="carousel-overlay">
                    <div class="carousel-title">${item.title}</div>
                    ${metaInfo.length ? `<div class="carousel-meta">${metaInfo.join('')}</div>` : ''}
                    ${item.description ? `<div class="carousel-description">${item.description}</div>` : ''}
                </div>
            `;

            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                div.addEventListener('mouseenter', (e) => {
                    const itemId = div.dataset.itemId;
                    
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                    }
                    
                    const rect = div.getBoundingClientRect();
                    this.hoverModalOrigin = {
                        x: rect.left + rect.width / 2,
                        y: rect.top + rect.height / 2
                    };
                    
                    this.hoverTimeouts[itemId] = {
                        details: setTimeout(() => {
                            const background = div.querySelector('.detail-background');
                            const overlay = div.querySelector('.carousel-overlay');
                            background.style.display = 'block';
                            background.style.opacity = '1';
                            overlay.style.opacity = '1';
                            overlay.style.transform = 'translateY(0)';
                            
                            this.hoverTimeouts[itemId].modal = setTimeout(() => {
                                if (!window.isModalOpen && !window.isDetailsModalOpen) {
                                    window.hoverModalItem = div;
                                    if (window.hoverModal && div) {
                                        window.hoverModal.show(item, div);
                                    }
                                }
                            }, 200);
                        }, 900)
                    };
                });

                div.addEventListener('mouseleave', () => {
                    const itemId = div.dataset.itemId;
                    
                    if (this.hoverTimeouts[itemId]) {
                        clearTimeout(this.hoverTimeouts[itemId].details);
                        clearTimeout(this.hoverTimeouts[itemId].modal);
                        delete this.hoverTimeouts[itemId];
                    }
                    
                    const poster = div.querySelector('.poster-image');
                    const background = div.querySelector('.detail-background');
                    const overlay = div.querySelector('.carousel-overlay');
                    
                    poster.style.opacity = '1';
                    background.style.opacity = '0';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'translateY(20px)';
                    
                    setTimeout(() => {
                        background.style.display = 'none';
                    }, 300);
                });
            }

            div.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = div.dataset.itemId;
                if (this.hoverTimeouts[itemId]) {
                    clearTimeout(this.hoverTimeouts[itemId].details);
                    clearTimeout(this.hoverTimeouts[itemId].modal);
                }
                window.detailsModal.show(item, div);
            });

            this.wrapper.appendChild(div);
        }

        this.index = end;
        this.updateProgressBar();
    }

    scrollToPrevPage() {
        const itemWidth = 194;
        const gap = 4;
        const scrollAmount = Math.max(1, this.itemsPerPage) * (itemWidth + gap);
        this.wrapper.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    }

    scrollToNextPage() {
        const itemWidth = 194;
        const gap = 4;
        const scrollAmount = Math.max(1, this.itemsPerPage) * (itemWidth + gap);
        this.wrapper.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }

    updateProgressBar() {
        if (this.wrapper.scrollWidth > this.wrapper.clientWidth) {
            const scrollPercentage = (this.wrapper.scrollLeft / (this.wrapper.scrollWidth - this.wrapper.clientWidth)) * 100;
            this.progressBar.style.width = `${scrollPercentage}%`;
        } else {
            this.progressBar.style.width = '100%';
        }
    }

    handleScroll() {
        this.updateProgressBar();
        if (this.wrapper.scrollLeft + this.wrapper.clientWidth >= this.wrapper.scrollWidth - 200) {
            this.renderItems();
        }
    }
}