// Variables globales compartidas
let moviesData = [];
let index = 0;
const step = 12;
let moreAppended = false;
const wrapper = document.getElementById('carousel-wrapper');
const skeleton = document.getElementById('carousel-skeleton');
const progressBar = document.querySelector('.carousel-progress-bar');
const carouselNav = document.getElementById('carousel-nav');
const carouselPrev = document.getElementById('carousel-prev');
const carouselNext = document.getElementById('carousel-next');
const carouselContainer = document.querySelector('.carousel-container');
let itemsPerPage = 5;

// URL del archivo JSON
const DATA_URL = "https://jfl4bur.github.io/Todogram/public/data.json";

function calculateItemsPerPage() {
    const itemWidth = parseInt(getComputedStyle(document.querySelector('.custom-carousel-item')).width);
    const gap = 4;
    const containerWidth = wrapper.clientWidth;
    itemsPerPage = Math.floor(containerWidth / (itemWidth + gap));
}

function scrollToNextPage() {
    const itemWidth = parseInt(getComputedStyle(document.querySelector('.custom-carousel-item')).width);
    const gap = 4;
    const scrollAmount = itemsPerPage * (itemWidth + gap);
    
    wrapper.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
    });
}

function scrollToPrevPage() {
    const itemWidth = parseInt(getComputedStyle(document.querySelector('.custom-carousel-item')).width);
    const gap = 4;
    const scrollAmount = itemsPerPage * (itemWidth + gap);
    
    wrapper.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
    });
}

// Función para obtener póster de TMDB
async function fetchTMDBPoster(tmdbUrl) {
    if (!tmdbUrl) return '';
    
    try {
        const tmdbId = tmdbUrl.match(/movie\/(\d+)/)?.[1];
        if (!tmdbId) return '';
        
        const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=f28077ae6a89b54c86be927ea88d64d9`);
        if (!response.ok) return '';
        
        const data = await response.json();
        return data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '';
    } catch (error) {
        console.error('Error fetching TMDB poster:', error);
        return '';
    }
}

async function renderItems() {
    const end = Math.min(index + step, moviesData.length);
    
    for (let i = index; i < end; i++) {
        const item = moviesData[i];
        const div = document.createElement("div");
        div.className = "custom-carousel-item";
        div.dataset.itemId = i;

        const metaInfo = [];
        if (item.year) metaInfo.push(`<span>${item.year}</span>`);
        if (item.duration) metaInfo.push(`<span>${item.duration}</span>`);
        if (item.genre) metaInfo.push(`<span>${item.genre}</span>`);
        if (item.rating) metaInfo.push(`<div class="carousel-rating"><i class="fas fa-star"></i><span>${item.rating}</span></div>`);
        if (item.ageRating) metaInfo.push(`<span class="age-rating">${item.ageRating}</span>`);

        let posterUrl = item.posterUrl;
        // Intentar obtener de TMDB si no hay portada
        if ((!posterUrl || posterUrl.includes('placeholder')) && item.tmdbUrl) {
            posterUrl = await fetchTMDBPoster(item.tmdbUrl) || item.posterUrl;
        }
        // Usar placeholder si no hay imagen
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
            div.addEventListener('mouseenter', function(e) {
                const itemId = this.dataset.itemId;
                
                if (hoverTimeouts[itemId]) {
                    clearTimeout(hoverTimeouts[itemId].details);
                    clearTimeout(hoverTimeouts[itemId].modal);
                }
                
                const rect = this.getBoundingClientRect();
                hoverModalOrigin = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
                
                hoverTimeouts[itemId] = {
                    details: setTimeout(() => {
                        const background = this.querySelector('.detail-background');
                        const overlay = this.querySelector('.carousel-overlay');
                        background.style.display = 'block';
                        background.style.opacity = '1';
                        overlay.style.opacity = '1';
                        overlay.style.transform = 'translateY(0)';
                        
                        hoverTimeouts[itemId].modal = setTimeout(() => {
                            if (!isModalOpen && !isDetailsModalOpen) {
                                hoverModalItem = this;
                                showModal(item, this);
                            }
                        }, 200);
                    }, 900)
                };
            });

            div.addEventListener('mouseleave', function() {
                const itemId = this.dataset.itemId;
                
                if (hoverTimeouts[itemId]) {
                    clearTimeout(hoverTimeouts[itemId].details);
                    clearTimeout(hoverTimeouts[itemId].modal);
                    delete hoverTimeouts[itemId];
                }
                
                const poster = this.querySelector('.poster-image');
                const background = this.querySelector('.detail-background');
                const overlay = this.querySelector('.carousel-overlay');
                
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
            if (hoverTimeouts[itemId]) {
                clearTimeout(hoverTimeouts[itemId].details);
                clearTimeout(hoverTimeouts[itemId].modal);
            }
            showDetailsModal(item, div);
        });

        wrapper.appendChild(div);
    }

    index = end;

    if (index >= moviesData.length && !moreAppended) {
        moreAppended = true;
        const moreLink = document.createElement("a");
        moreLink.href = "#";
        moreLink.className = "custom-carousel-more";
        moreLink.innerHTML = `
            <i class="fas fa-arrow-right"></i>
            <span>Ver más</span>
        `;
        wrapper.appendChild(moreLink);
    }

    updateProgressBar();
}

function updateProgressBar() {
    const scrollPercentage = (wrapper.scrollLeft / (wrapper.scrollWidth - wrapper.clientWidth)) * 100;
    progressBar.style.width = `${scrollPercentage}%`;
}

export async function initCarousel() {
    skeleton.style.display = 'flex';
    wrapper.style.display = 'none';
    
    try {
        const response = await fetch(DATA_URL, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error('No se pudo cargar data.json');
        }
        
        const data = await response.json();
        
        // Filtrar solo películas y mapear datos
        moviesData = data
            .filter(item => item['Categoría'] === 'Películas')
            .map((item, index) => ({
                id: index.toString(),
                title: item['Título'] || 'Sin título',
                description: item['Synopsis'] || 'Descripción no disponible',
                posterUrl: item['Portada'] || '',
                backgroundUrl: item['Fondo'] || '',
                year: item['Año'] ? item['Año'].toString() : '',
                duration: item['Duración'] || '',
                genre: item['Géneros'] || '',
                rating: item['Puntuación 1-10'] ? item['Puntuación 1-10'].toString() : '',
                ageRating: item['Clasificación'] || '',
                link: item['Enlace'] || '#',
                trailerUrl: item['Trailer'] || '',
                videoUrl: item['Video iframe'] || '',  // Nuevo campo
                tmdbUrl: item['TMDB'] || '',
                audiosCount: item['Audios'] ? item['Audios'].split(',').length : 0,
                subtitlesCount: item['Subtítulos'] ? item['Subtítulos'].split(',').length : 0,
                audioList: item['Audios'] ? item['Audios'].split(',') : [],
                subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',') : []
            }));

        if (moviesData.length === 0) {
            // Mostrar datos de ejemplo si no hay películas
            moviesData = [
                {
                    id: "12345",
                    title: "Ejemplo de película",
                    description: "Esta es una película de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                    posterUrl: "https://via.placeholder.com/194x271",
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

        renderItems();
        showCarousel();
    } catch (error) {
        console.error('Error cargando datos:', error);
        // Mostrar datos de ejemplo si hay error
        moviesData = [
            {
                id: "12345",
                title: "Ejemplo de película",
                description: "Esta es una película de ejemplo que se muestra cuando no se pueden cargar los datos reales.",
                posterUrl: "https://via.placeholder.com/194x271",
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
        renderItems();
        showCarousel();
    }
}

function showCarousel() {
    skeleton.style.display = 'none';
    wrapper.style.display = 'flex';
    
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        carouselNav.style.display = 'flex';
    }
    
    calculateItemsPerPage();
}

// Event listeners para los botones de navegación
carouselPrev.addEventListener('click', scrollToPrevPage);
carouselNext.addEventListener('click', scrollToNextPage);

wrapper.addEventListener("scroll", function () {
    updateProgressBar();
    
    if (wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - 200) {
        renderItems();
    }
});

// Recalcular items por página cuando cambia el tamaño de la ventana
window.addEventListener('resize', calculateItemsPerPage);

// Variable global para hoverTimeouts
let hoverTimeouts = {};
let isModalOpen = false;
let isDetailsModalOpen = false;
let hoverModalItem = null;
let hoverModalOrigin = { x: 0, y: 0 };
let activeItem = null;