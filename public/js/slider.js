// ===== SLIDER HERO BANNER (RAKUTEN.TV STYLE) =====

window.slider = {
  currentSlide: 0,
  slides: [],
  autoplayInterval: null,
  isHovered: false,
  
  init() {
    this.renderSlider();
    this.setupEventListeners();
    this.startAutoplay();
    this.syncHashModal();
  },
  
  renderSlider() {
    const sliderSection = document.querySelector('.slider-section');
    if (!sliderSection) return;
    
    // Obtener datos de películas
    const moviesData = window.carousel?.moviesData || window.peliculas || [];
    if (!moviesData.length) {
      console.log('Slider: No hay datos de películas disponibles');
      return;
    }
    
    // Filtrar películas por géneros únicos
    const uniqueGenres = this.getUniqueGenres(moviesData);
    const selectedMovies = this.getMoviesByGenres(moviesData, uniqueGenres);
    
    if (selectedMovies.length === 0) {
      console.log('Slider: No se encontraron películas para mostrar');
      return;
    }
    
    this.slides = selectedMovies;
    
    // Crear HTML del slider
    const sliderHTML = `
      <div class="slider-wrapper">
        ${selectedMovies.map((movie, index) => `
          <div class="slider-slide" data-index="${index}" data-movie-id="${movie.id}">
            <img src="${movie.poster}" alt="${movie.title}" loading="lazy">
            <div class="slider-overlay">
              <h3>${movie.title}</h3>
              <p>${movie.synopsis || 'Descripción no disponible'}</p>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="slider-nav">
        <button class="slider-nav-btn prev" aria-label="Anterior">
          <svg viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        <button class="slider-nav-btn next" aria-label="Siguiente">
          <svg viewBox="0 0 24 24">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>
      
      <div class="slider-pagination">
        ${selectedMovies.map((_, index) => `
          <button class="slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Ir al slide ${index + 1}"></button>
        `).join('')}
      </div>
    `;
    
    sliderSection.innerHTML = sliderHTML;
    
    // Configurar eventos
    this.setupSliderEvents();
    this.updateNavButtons();
  },
  
  getUniqueGenres(movies) {
    const genres = new Set();
    movies.forEach(movie => {
      if (movie.genres && Array.isArray(movie.genres)) {
        movie.genres.forEach(genre => genres.add(genre));
      }
    });
    return Array.from(genres);
  },
  
  getMoviesByGenres(movies, genres) {
    const selectedMovies = [];
    const usedGenres = new Set();
    
    // Intentar obtener una película de cada género
    genres.forEach(genre => {
      if (usedGenres.has(genre)) return;
      
      const movie = movies.find(m => 
        m.genres && 
        Array.isArray(m.genres) && 
        m.genres.includes(genre) &&
        !selectedMovies.some(selected => selected.id === m.id)
      );
      
      if (movie) {
        selectedMovies.push(movie);
        usedGenres.add(genre);
      }
    });
    
    // Si no hay suficientes películas, añadir más hasta tener al menos 3
    if (selectedMovies.length < 3) {
      movies.forEach(movie => {
        if (selectedMovies.length >= 5) return;
        if (!selectedMovies.some(selected => selected.id === movie.id)) {
          selectedMovies.push(movie);
        }
      });
    }
    
    return selectedMovies.slice(0, 5); // Máximo 5 slides
  },
  
  setupSliderEvents() {
    const wrapper = document.querySelector('.slider-wrapper');
    const slides = document.querySelectorAll('.slider-slide');
    const prevBtn = document.querySelector('.slider-nav-btn.prev');
    const nextBtn = document.querySelector('.slider-nav-btn.next');
    const dots = document.querySelectorAll('.slider-dot');
    
    // Eventos de navegación
    if (prevBtn) prevBtn.addEventListener('click', () => this.goToSlide(this.currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.goToSlide(this.currentSlide + 1));
    
    // Eventos de paginación
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => this.goToSlide(index));
    });
    
    // Eventos de slides
    slides.forEach((slide, index) => {
      slide.addEventListener('click', () => this.openDetails(this.slides[index]));
    });
    
    // Swipe para móviles
    this.setupSwipe(wrapper);
    
    // Hover para pausar autoplay
    wrapper.addEventListener('mouseenter', () => {
      this.isHovered = true;
      this.pauseAutoplay();
    });
    
    wrapper.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.startAutoplay();
    });
  },
  
  setupSwipe(wrapper) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    
    const handleStart = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      isDragging = false;
    };
    
    const handleMove = (e) => {
      if (!startX) return;
      
      const touch = e.touches ? e.touches[0] : e;
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isDragging = true;
        e.preventDefault();
      }
    };
    
    const handleEnd = (e) => {
      if (!isDragging) return;
      
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const deltaX = touch.clientX - startX;
      const threshold = 50;
      
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          this.goToSlide(this.currentSlide - 1);
        } else {
          this.goToSlide(this.currentSlide + 1);
        }
      }
      
      startX = 0;
      startY = 0;
      isDragging = false;
    };
    
    // Touch events
    wrapper.addEventListener('touchstart', handleStart, { passive: false });
    wrapper.addEventListener('touchmove', handleMove, { passive: false });
    wrapper.addEventListener('touchend', handleEnd);
    
    // Mouse events para desktop
    wrapper.addEventListener('mousedown', handleStart);
    wrapper.addEventListener('mousemove', handleMove);
    wrapper.addEventListener('mouseup', handleEnd);
    wrapper.addEventListener('mouseleave', handleEnd);
  },
  
  goToSlide(index) {
    const totalSlides = this.slides.length;
    if (totalSlides === 0) return;
    
    // Circular navigation
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    
    this.currentSlide = index;
    
    const wrapper = document.querySelector('.slider-wrapper');
    const slideWidth = wrapper.querySelector('.slider-slide').offsetWidth;
    const gap = 24; // Gap entre slides
    
    const translateX = -(index * (slideWidth + gap));
    wrapper.style.transform = `translateX(${translateX}px)`;
    
    this.updatePagination();
    this.updateNavButtons();
  },
  
  updatePagination() {
    const dots = document.querySelectorAll('.slider-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === this.currentSlide);
    });
  },
  
  updateNavButtons() {
    const prevBtn = document.querySelector('.slider-nav-btn.prev');
    const nextBtn = document.querySelector('.slider-nav-btn.next');
    
    if (prevBtn) {
      prevBtn.disabled = this.currentSlide === 0;
    }
    
    if (nextBtn) {
      nextBtn.disabled = this.currentSlide === this.slides.length - 1;
    }
  },
  
  openDetails(movie) {
    if (!movie) return;
    
    // Actualizar URL hash
    const hash = `#movie-${movie.id}`;
    window.history.replaceState(null, null, hash);
    
    // Abrir modal si existe
    if (window.detailsModal && typeof window.detailsModal.openModal === 'function') {
      window.detailsModal.openModal(movie);
    } else {
      // Fallback: buscar y abrir modal manualmente
      const modal = document.querySelector('.details-modal');
      if (modal) {
        modal.style.display = 'block';
        // Aquí podrías actualizar el contenido del modal con los datos de la película
      }
    }
  },
  
  syncHashModal() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#movie-')) {
      const movieId = hash.replace('#movie-', '');
      const movie = this.slides.find(slide => slide.id.toString() === movieId);
      if (movie) {
        this.openDetails(movie);
      }
    }
  },
  
  startAutoplay() {
    if (this.autoplayInterval) return;
    
    this.autoplayInterval = setInterval(() => {
      if (!this.isHovered) {
        this.goToSlide(this.currentSlide + 1);
      }
    }, 5000); // 5 segundos
  },
  
  pauseAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  },
  
  setupEventListeners() {
    // Escuchar cambios en el hash de la URL
    window.addEventListener('hashchange', () => {
      this.syncHashModal();
    });
    
    // Re-renderizar en resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.goToSlide(this.currentSlide); // Re-posicionar
      }, 250);
    });
  }
};

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.carousel?.moviesData) {
      window.slider.init();
    }
  });
} else {
  if (window.carousel?.moviesData) {
    window.slider.init();
  }
} 