// Header HTML
const headerHTML = `
  <header class="slider-header" id="slider-header">
    <div class="slider-header-inner">
      <div class="slider-logo">
        <a href="/" class="slider-logo-link" aria-label="Inicio">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="43.1499 135.2082 426.2515 101.1976" width="426.252px" height="101.198px">
          <path d="M 170.215 8.858 C 170.145 7.967 170.119 7.599 170.981 7.195 C 171.583 6.912 174.899 5.427 180.86 3.999 C 181.596 3.821 182.267 3.933 182.695 4.306 C 183.141 4.695 183.237 5.289 182.928 5.815 C 182.37 6.767 182.219 7.662 182.841 8.039 C 183.351 8.348 183.851 8.457 185.399 7.832 C 187.431 7.011 189.831 4.947 189.684 1.558 C 189.633 0.345 189.047 -0.561 187.944 -1.137 C 186.903 -1.681 185.507 -1.863 184.087 -1.863 C 180.216 -1.863 178.338 -1.117 173.236 0.295 C 166.161 2.253 157.248 4.541 152.312 5.481 C 150.282 5.867 148.507 7.024 148.507 8.612 C 148.507 11.124 152.413 11.764 155.085 11.071 C 155.646 10.926 161.189 9.379 163.152 9.184 C 163.433 9.156 163.568 9.237 163.59 9.396 C 163.622 9.605 163.743 11.758 163.794 12.731 C 164.012 16.836 164.459 24.815 164.5 25.373 C 164.58 26.431 164.591 29.759 166.929 29.759 C 169.105 29.759 170.153 27.959 170.704 25.373 C 171.48 21.717 170.834 16.485 170.52 12.302 C 170.431 11.121 170.215 8.858 170.215 8.858" style="fill: rgb(233, 231, 231);" transform="matrix(1.8229119777679441, 0, 0, 1.9932160377502441, 101.8439810401911, 148.63846140201252)"></path>
          <path d="M 199.345 2.783 C 196.418 2.783 193.634 6.98 191.628 10.706 C 189.099 15.417 187.68 19.647 186.832 21.054 C 186.165 19.694 184.415 15.695 183.523 14.245 C 182.005 11.774 180.384 9.877 178.322 9.877 C 177.171 9.877 175.805 10.425 175.805 12.012 C 175.805 13.137 176.408 14.543 177.037 15.838 C 177.237 16.254 181.178 23.652 181.742 25.019 C 181.742 25.019 183.621 29.493 183.791 29.888 C 184.942 32.569 186.024 32.908 186.751 32.908 C 187.938 32.908 189.552 32.538 190.377 29.801 C 190.902 28.056 191.65 26.073 192.29 24.449 C 193.449 21.509 196.35 15.948 198.217 12.563 C 199.731 9.818 201.632 6.656 201.632 4.692 C 201.632 3.761 201.125 2.783 199.345 2.783" style="fill: rgb(233, 231, 231);" transform="matrix(1.8229119777679441, 0, 0, 1.9932160377502441, 101.8439810401911, 148.63846140201252)"></path>
          <path d="M 147.866 35.589 L 24.773 39.523 L 31.235 44.033 L 147.866 35.589 Z" style="fill: rgb(233, 231, 231);" transform="matrix(1.8229119777679441, 0, 0, 1.9932160377502441, 101.8439810401911, 148.63846140201252)"></path>
          <path d="M -4.636 19.418 C -4.636 17.849 -4.231 16.33 -3.418 14.863 C -2.607 13.394 -1.456 12.274 0.032 11.5 C 1.52 10.727 3.184 10.339 5.018 10.339 C 7.854 10.339 10.178 11.216 11.99 12.971 C 13.801 14.726 14.707 16.941 14.707 19.62 C 14.707 22.321 13.791 24.559 11.961 26.336 C 10.134 28.113 7.831 29.001 5.053 29.001 C 3.336 29.001 1.697 28.631 0.137 27.892 C -1.42 27.151 -2.607 26.066 -3.418 24.638 C -4.231 23.209 -4.636 21.469 -4.636 19.418 Z M 0.447 19.67 C 0.447 21.441 0.888 22.797 1.771 23.739 C 2.653 24.68 3.741 25.151 5.035 25.151 C 6.33 25.151 7.416 24.68 8.292 23.739 C 9.168 22.797 9.606 21.43 9.606 19.637 C 9.606 17.888 9.168 16.543 8.292 15.602 C 7.416 14.661 6.33 14.19 5.035 14.19 C 3.741 14.19 2.653 14.661 1.771 15.602 C 0.888 16.543 0.447 17.9 0.447 19.67 Z M 35.757 28.597 L 31.152 28.597 L 31.152 25.974 C 30.386 26.994 29.482 27.754 28.441 28.253 C 27.4 28.751 26.35 29.001 25.292 29.001 C 23.139 29.001 21.295 28.175 19.759 26.521 C 18.224 24.868 17.457 22.562 17.457 19.603 C 17.457 16.577 18.204 14.277 19.697 12.702 C 21.191 11.127 23.08 10.339 25.362 10.339 C 27.456 10.339 29.268 11.169 30.799 12.829 L 30.799 3.952 L 35.757 3.952 L 35.757 28.597 Z M 22.521 19.284 C 22.521 21.189 22.796 22.567 23.351 23.419 C 24.151 24.653 25.269 25.269 26.704 25.269 C 27.845 25.269 28.815 24.807 29.616 23.882 C 30.416 22.957 30.816 21.576 30.816 19.737 C 30.816 17.687 30.428 16.21 29.651 15.307 C 28.876 14.406 27.88 13.954 26.668 13.954 C 25.491 13.954 24.506 14.4 23.712 15.291 C 22.917 16.183 22.521 17.513 22.521 19.284 Z M 39.5 19.418 C 39.5 17.849 39.906 16.33 40.718 14.863 C 41.53 13.394 42.681 12.274 44.168 11.5 C 45.658 10.727 47.32 10.339 49.154 10.339 C 51.991 10.339 54.315 11.216 56.126 12.971 C 57.937 14.726 58.843 16.941 58.843 19.62 C 58.843 22.321 57.929 24.559 56.098 26.336 C 54.269 28.113 51.966 29.001 49.19 29.001 C 47.472 29.001 45.833 28.631 44.275 27.892 C 42.715 27.151 41.53 26.066 40.718 24.638 C 39.906 23.209 39.5 21.469 39.5 19.418 Z M 44.584 19.67 C 44.584 21.441 45.025 22.797 45.907 23.739 C 46.789 24.68 47.877 25.151 49.171 25.151 C 50.466 25.151 51.552 24.68 52.429 23.739 C 53.305 22.797 53.743 21.43 53.743 19.637 C 53.743 17.888 53.305 16.543 52.429 15.602 C 51.552 14.661 50.466 14.19 49.171 14.19 C 47.877 14.19 46.789 14.661 45.907 15.602 C 45.025 16.543 44.584 17.9 44.584 19.67 Z M 62.27 29.774 L 67.934 30.43 C 68.028 31.059 68.246 31.489 68.588 31.725 C 69.058 32.061 69.799 32.229 70.81 32.229 C 72.105 32.229 73.075 32.044 73.724 31.675 C 74.158 31.427 74.488 31.03 74.712 30.48 C 74.865 30.088 74.94 29.366 74.94 28.313 L 74.94 25.705 C 73.458 27.633 71.588 28.597 69.33 28.597 C 66.811 28.597 64.816 27.583 63.346 25.554 C 62.193 23.951 61.617 21.957 61.617 19.569 C 61.617 16.577 62.372 14.29 63.884 12.71 C 65.396 11.13 67.275 10.339 69.522 10.339 C 71.84 10.339 73.753 11.31 75.259 13.249 L 75.259 10.742 L 79.9 10.742 L 79.9 26.765 C 79.9 28.872 79.718 30.447 79.352 31.489 C 78.989 32.531 78.477 33.35 77.818 33.944 C 77.159 34.539 76.279 35.003 75.178 35.339 C 74.079 35.676 72.688 35.844 71.006 35.844 C 67.828 35.844 65.575 35.325 64.245 34.288 C 62.916 33.252 62.251 31.937 62.251 30.346 C 62.251 30.189 62.256 29.998 62.27 29.774 Z M 66.7 19.3 C 66.7 21.194 67.085 22.582 67.855 23.461 C 68.626 24.34 69.576 24.781 70.705 24.781 C 71.916 24.781 72.941 24.329 73.776 23.428 C 74.612 22.525 75.03 21.189 75.03 19.418 C 75.03 17.568 74.629 16.196 73.829 15.3 C 73.028 14.404 72.017 13.954 70.794 13.954 C 69.605 13.954 68.626 14.395 67.855 15.274 C 67.085 16.153 66.7 17.496 66.7 19.3 Z M 89.555 28.597 L 84.596 28.597 L 84.596 10.742 L 89.204 10.742 L 89.204 13.282 C 89.991 12.083 90.701 11.292 91.33 10.911 C 91.958 10.53 92.673 10.339 93.473 10.339 C 94.603 10.339 95.691 10.637 96.737 11.231 L 95.203 15.35 C 94.369 14.835 93.592 14.577 92.873 14.577 C 92.179 14.577 91.591 14.759 91.109 15.123 C 90.626 15.487 90.247 16.145 89.97 17.098 C 89.693 18.05 89.555 20.046 89.555 23.083 L 89.555 28.597 Z M 102.571 16.19 L 98.072 15.417 C 98.578 13.691 99.448 12.414 100.683 11.584 C 101.919 10.754 103.755 10.339 106.189 10.339 C 108.402 10.339 110.049 10.589 111.131 11.089 C 112.214 11.586 112.976 12.22 113.418 12.989 C 113.858 13.755 114.079 15.165 114.079 17.216 L 114.025 22.731 C 114.025 24.299 114.105 25.457 114.265 26.202 C 114.422 26.948 114.72 27.745 115.155 28.597 L 110.251 28.597 C 110.12 28.284 109.96 27.818 109.772 27.202 C 109.691 26.922 109.632 26.737 109.597 26.647 C 108.749 27.432 107.843 28.021 106.878 28.413 C 105.914 28.806 104.884 29.001 103.79 29.001 C 101.86 29.001 100.339 28.502 99.227 27.504 C 98.115 26.508 97.56 25.247 97.56 23.722 C 97.56 22.714 97.812 21.815 98.318 21.024 C 98.824 20.233 99.533 19.628 100.446 19.208 C 101.357 18.788 102.671 18.421 104.389 18.107 C 106.708 17.693 108.314 17.305 109.208 16.947 L 109.208 16.477 C 109.208 15.568 108.973 14.921 108.502 14.534 C 108.03 14.148 107.144 13.954 105.838 13.954 C 104.954 13.954 104.266 14.119 103.772 14.45 C 103.277 14.781 102.878 15.36 102.571 16.19 Z M 109.208 20.023 C 108.573 20.225 107.567 20.466 106.189 20.746 C 104.813 21.026 103.913 21.301 103.49 21.57 C 102.842 22.007 102.519 22.562 102.519 23.235 C 102.519 23.896 102.778 24.467 103.296 24.949 C 103.812 25.431 104.472 25.672 105.272 25.672 C 106.166 25.672 107.02 25.392 107.832 24.831 C 108.432 24.406 108.826 23.885 109.015 23.269 C 109.143 22.865 109.208 22.098 109.208 20.965 L 109.208 20.023 Z M 118.588 10.742 L 123.158 10.742 L 123.158 13.181 C 124.794 11.287 126.74 10.339 128.999 10.339 C 130.2 10.339 131.241 10.576 132.123 11.047 C 133.006 11.517 133.73 12.228 134.295 13.181 C 135.118 12.228 136.007 11.517 136.959 11.047 C 137.914 10.576 138.931 10.339 140.013 10.339 C 141.39 10.339 142.554 10.607 143.508 11.139 C 144.461 11.671 145.172 12.452 145.643 13.484 C 145.985 14.246 146.155 15.479 146.155 17.182 L 146.155 28.597 L 141.196 28.597 L 141.196 18.393 C 141.196 16.622 141.026 15.479 140.684 14.963 C 140.225 14.29 139.519 13.954 138.566 13.954 C 137.872 13.954 137.218 14.156 136.607 14.559 C 135.996 14.963 135.554 15.555 135.283 16.333 C 135.013 17.112 134.877 18.343 134.877 20.023 L 134.877 28.597 L 129.918 28.597 L 129.918 18.813 C 129.918 17.075 129.829 15.955 129.652 15.452 C 129.477 14.945 129.203 14.57 128.833 14.325 C 128.462 14.077 127.959 13.954 127.324 13.954 C 126.56 13.954 125.871 14.15 125.258 14.542 C 124.647 14.935 124.208 15.502 123.943 16.241 C 123.679 16.981 123.547 18.208 123.547 19.923 L 123.547 28.597 L 118.588 28.597 L 118.588 10.742 Z" style="text-wrap-mode: nowrap; fill: rgb(233, 231, 231);" transform="matrix(1.8229119777679441, 0, 0, 1.9932160377502441, 101.8439810401911, 148.63846140201252)"></path>
          <path d="M -10.49 6.003 C -10.56 4.944 -10.586 4.507 -9.724 4.027 C -9.122 3.69 -5.806 1.925 0.155 0.228 C 0.891 0.017 1.562 0.15 1.99 0.593 C 2.436 1.056 2.532 1.761 2.223 2.387 C 1.665 3.518 1.514 4.581 2.136 5.03 C 2.646 5.397 3.146 5.526 4.694 4.784 C 6.726 3.808 9.126 1.355 8.979 -2.672 C 8.928 -4.114 8.342 -5.191 7.239 -5.875 C 6.198 -6.521 4.802 -6.738 3.382 -6.738 C -0.489 -6.738 -2.367 -5.851 -7.469 -4.173 C -14.544 -1.846 -23.457 0.873 -28.393 1.99 C -30.423 2.448 -32.198 3.823 -32.198 5.71 C -32.198 8.696 -28.292 9.456 -25.62 8.633 C -25.059 8.46 -19.516 6.622 -17.553 6.39 C -17.272 6.357 -17.137 6.453 -17.115 6.642 C -17.083 6.891 -16.962 9.449 -16.911 10.605 C -16.693 15.484 -16.246 24.966 -16.205 25.629 C -16.125 26.886 -16.114 30.841 -13.776 30.841 C -11.6 30.841 -10.552 28.702 -10.001 25.629 C -9.225 21.284 -9.871 15.067 -10.185 10.096 C -10.274 8.692 -10.49 6.003 -10.49 6.003" style="fill: rgb(233, 231, 231); stroke-width: 1;" transform="matrix(1.8229119777679441, 0, 0, 1.9932160377502441, 101.8439810401911, 148.63846140201252)"></path>
        </svg>
        </a>
      </div>
      <nav class="slider-nav-menu">
        <a href="/" class="slider-nav-link"><i class="fas fa-home"></i><span>Inicio</span></a>
        <a href="/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Todo+el+cat%C3%A1logo" class="slider-nav-link"><i class="fas fa-film"></i><span>Películas</span></a>
        <a href="/catalogo/#catalogo?tab=Series&genre=Todo+el+catálogo" class="slider-nav-link"><i class="fas fa-tv"></i><span>Series</span></a>
        <a href="/catalogo/#catalogo?tab=Documentales&genre=Todo+el+catálogo" class="slider-nav-link"><i class="fas fa-child"></i><span>Documentales</span></a>
        <a href="/catalogo/#catalogo?tab=Animes&genre=Todo+el+catálogo" class="slider-nav-link"><i class="fas fa-crown"></i><span>Animes</span></a>
        <a href="/catalogo" class="slider-nav-link"><i class="fas fa-broadcast-tower"></i><span>Todo el catálogo</span></a>
        <a href="#" class="slider-nav-link"><i class="fas fa-question-circle"></i><span>Ayuda</span></a>
      </nav>
      <div class="header-search" id="header-search">
        <button class="header-search-icon" id="header-search-icon" aria-hidden="true"> 
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></circle>
          </svg>
        </button>
        <input id="global-search-input" class="header-search-input" type="search" placeholder="Buscar" aria-label="Buscar" autocomplete="off">
        <button id="header-search-clear" class="header-search-clear" aria-label="Limpiar búsqueda" hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <a href="#" class="slider-nav-login"><i class="fas fa-user"></i><span>Iniciar sesión</span></a>
      <button class="slider-header-burger" id="slider-header-burger">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </header>
  
  <!-- Mobile Menu Background -->
  <div class="slider-mobile-menu-bg" id="slider-mobile-menu-bg"></div>
  
  <!-- Mobile Menu -->
  <div class="slider-mobile-menu" id="slider-mobile-menu">
    <a href="/" class="slider-nav-link"><i class="fas fa-home"></i><span>Inicio</span></a>
    <a href="/catalogo/#catalogo?tab=Pel%C3%ADculas&genre=Todo+el+cat%C3%A1logo" class="slider-nav-link"><i class="fas fa-film"></i><span>Películas</span></a>
    <a href="/catalogo/#catalogo?tab=Series&genre=Todo+el+catálogo" class="slider-nav-link"><i class="fas fa-tv"></i><span>Series</span></a>
    <a href="/catalogo/#catalogo?tab=Documentales&genre=Todo+el+catálogo" class="slider-nav-link"><i class="fas fa-child"></i><span>Documentales</span></a>
    <a href="/catalogo/#catalogo?tab=Animes&genre=Todo+el+catálogo" class="slider-nav-link"><i class="fas fa-crown"></i><span>Animes</span></a>
    <a href="/catalogo" class="slider-nav-link"><i class="fas fa-broadcast-tower"></i><span>Todo el catálogo</span></a>
    <a href="#" class="slider-nav-link"><i class="fas fa-question-circle"></i><span>Ayuda</span></a>
  </div>
`;

// Renderizar header
document.addEventListener('DOMContentLoaded', function() {
  const headerRoot = document.getElementById('header-root');
  if (headerRoot) {
    // evitar doble render si el script se ejecuta dos veces
    if (!headerRoot.dataset.headerRendered) {
      headerRoot.innerHTML = headerHTML;
      headerRoot.dataset.headerRendered = '1';
    } else {
      // ya renderizado, no inyectar de nuevo
      console.debug('header: ya renderizado, omitiendo segunda inyección');
    }
  }
  
  // Elementos del header
  const header = document.getElementById('slider-header');
  const searchInput = document.getElementById('global-search-input');
  const burger = document.getElementById('slider-header-burger');
  const mobileMenu = document.getElementById('slider-mobile-menu');
  const mobileMenuBg = document.getElementById('slider-mobile-menu-bg');
  
  if (!header || !burger || !mobileMenu || !mobileMenuBg) {
    console.error('Elementos del header no encontrados');
    return;
  }
  
  // Variables para scroll con debounce
  let lastScrollY = 0;
  let isScrolling = false;
  let scrollTimeout = null;
  
  // Toggle mobile menu
  function toggleMobileMenu() {
    burger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    mobileMenuBg.classList.toggle('open');
    document.body.classList.toggle('no-scroll');
  }
  
  // Cerrar mobile menu al hacer click en el background
  function closeMobileMenu() {
    burger.classList.remove('open');
    mobileMenu.classList.remove('open');
    mobileMenuBg.classList.remove('open');
    document.body.classList.remove('no-scroll');
  }
  
  // Función para manejar scroll en la página principal con debounce
  function onScrollHeader() {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    scrollTimeout = setTimeout(() => {
      if (!isScrolling) {
        isScrolling = true;
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Efecto de fondo translúcido
          if (currentScrollY > 50) {
            header.classList.add('scrolled');
          } else {
            header.classList.remove('scrolled');
          }
          
          // Ocultar/mostrar header basado en dirección del scroll
          if (currentScrollY > lastScrollY && currentScrollY > 50) {
            // Scroll hacia abajo - ocultar header
            header.classList.add('hidden');
          } else if (currentScrollY < lastScrollY) {
            // Scroll hacia arriba - mostrar header
            header.classList.remove('hidden');
          }
          
          lastScrollY = currentScrollY;
          isScrolling = false;
        });
      }
    }, 16); // ~60fps
  }
  
  // Función para manejar scroll en el details modal
  function onModalScroll() {
    if (!isScrolling) {
      isScrolling = true;
      requestAnimationFrame(() => {
        const detailsModal = document.querySelector('.details-modal-overlay');
        if (detailsModal && detailsModal.style.display === 'block') {
          const modalScrollTop = detailsModal.scrollTop;
          const lastModalScroll = parseInt(detailsModal.dataset.lastScroll) || 0;
          
          // Efecto de fondo translúcido
          if (modalScrollTop > 50) {
            header.classList.add('scrolled');
          } else {
            header.classList.remove('scrolled');
          }
          
          // Ocultar/mostrar header basado en dirección del scroll del modal
          if (modalScrollTop > lastModalScroll && modalScrollTop > 50) {
            // Scroll hacia abajo en modal - ocultar header
            header.classList.add('hidden');
          } else if (modalScrollTop < lastModalScroll) {
            // Scroll hacia arriba en modal - mostrar header
            header.classList.remove('hidden');
          }
          
          detailsModal.dataset.lastScroll = modalScrollTop.toString();
        }
        isScrolling = false;
      });
    }
  }
  
  // Event listeners
  burger.addEventListener('click', toggleMobileMenu);
  mobileMenuBg.addEventListener('click', closeMobileMenu);
  window.addEventListener('scroll', onScrollHeader);
  
  // Función para configurar el scroll del modal
  function setupModalScroll() {
    const detailsModal = document.querySelector('.details-modal-overlay');
    if (detailsModal && detailsModal.style.display === 'block') {
      // Remover listener anterior si existe
      detailsModal.removeEventListener('scroll', onModalScroll);
      // Añadir nuevo listener
      detailsModal.addEventListener('scroll', onModalScroll);
      detailsModal.dataset.lastScroll = '0';
      console.log('Modal scroll listener añadido');
    }
  }
  
  // Observer para detectar cambios en el modal
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const detailsModal = document.querySelector('.details-modal-overlay');
        if (detailsModal) {
          if (detailsModal.style.display === 'block') {
            // Modal abierto
            setTimeout(setupModalScroll, 300);
          } else if (detailsModal.style.display === 'none') {
            // Modal cerrado
            detailsModal.removeEventListener('scroll', onModalScroll);
            header.classList.remove('hidden', 'scrolled');
          }
        }
      }
    });
  });
  
  // Observar cambios en el details modal
  const detailsModal = document.querySelector('.details-modal-overlay');
  if (detailsModal) {
    observer.observe(detailsModal, { 
      attributes: true,
      attributeFilter: ['style']
    });
  }
  
  // Configuración inicial
  setTimeout(() => {
    const detailsModal = document.querySelector('.details-modal-overlay');
    if (detailsModal && detailsModal.style.display === 'block') {
      setupModalScroll();
    }
  }, 1000);

  // --- Búsqueda global en vivo (sencilla y funcional) ---
  // Guarda copias de los datasets originales para poder restaurarlos
  function snapshotOriginalData() {
    window.__originalCarouselData = window.__originalCarouselData || {};
    try {
      if (window.carousel && window.carousel.moviesData && !window.__originalCarouselData.peliculas) window.__originalCarouselData.peliculas = window.carousel.moviesData.slice();
      if (window.seriesCarousel && window.seriesCarousel.seriesData && !window.__originalCarouselData.series) window.__originalCarouselData.series = window.seriesCarousel.seriesData.slice();
      if (window.documentalesCarousel && window.documentalesCarousel.docuData && !window.__originalCarouselData.documentales) window.__originalCarouselData.documentales = window.documentalesCarousel.docuData.slice();
      if (window.animesCarousel && window.animesCarousel.animeData && !window.__originalCarouselData.animes) window.__originalCarouselData.animes = window.animesCarousel.animeData.slice();
      if (window.episodiosCarousel && window.episodiosCarousel.episodiosData && !window.__originalCarouselData.episodios) window.__originalCarouselData.episodios = window.episodiosCarousel.episodiosData.slice();
      if (window.episodiosAnimesCarousel && window.episodiosAnimesCarousel.episodiosData && !window.__originalCarouselData.episodiosAnimes) window.__originalCarouselData.episodiosAnimes = window.episodiosAnimesCarousel.episodiosData.slice();
      if (window.sliderIndependent && typeof window.sliderIndependent.getSlidesData === 'function' && !window.__originalCarouselData.slider) window.__originalCarouselData.slider = window.sliderIndependent.getSlidesData().slice();
    } catch (e) { console.warn('snapshotOriginalData error', e); }
  }

  function normalizeForSearch(s) {
    try {
      let str = String(s || '');
      // Normalizar acentos: NFD + remover diacríticos
      str = str.normalize ? str.normalize('NFD').replace(/\p{Diacritic}/gu, '') : str;
      // Lowercase y quitar caracteres extra (mantener letras y números y espacios)
      return str.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, '').trim();
    } catch(e){ return String(s || '').toLowerCase(); }
  }

  // Aplica filtrado y actualiza cada carousel correspondiente
  function applySearchQuery(q) {
    const qn = normalizeForSearch(q).trim();
    // update hash (use #search?q=... so it's visible in the address bar)
    try { window.history.replaceState(null, null, `${window.location.pathname}#search?q=${encodeURIComponent(q)}`); } catch(e) {}

    // If empty -> restore originals
    if (!qn) {
      try {
        if (window.__originalCarouselData) {
          if (window.carousel && window.__originalCarouselData.peliculas) { window.carousel.moviesData = window.__originalCarouselData.peliculas.slice(); window.carousel.index = 0; window.carousel.renderItems(); }
          if (window.seriesCarousel && window.__originalCarouselData.series) { window.seriesCarousel.seriesData = window.__originalCarouselData.series.slice(); window.seriesCarousel.index = 0; window.seriesCarousel.renderItems(); }
          if (window.documentalesCarousel && window.__originalCarouselData.documentales) { window.documentalesCarousel.docuData = window.__originalCarouselData.documentales.slice(); window.documentalesCarousel.index = 0; window.documentalesCarousel.renderItems(); }
          if (window.animesCarousel && window.__originalCarouselData.animes) { window.animesCarousel.animeData = window.__originalCarouselData.animes.slice(); window.animesCarousel.index = 0; window.animesCarousel.renderItems(); }
          if (window.episodiosCarousel && window.__originalCarouselData.episodios) { window.episodiosCarousel.episodiosData = window.__originalCarouselData.episodios.slice(); window.episodiosCarousel.index = 0; window.episodiosCarousel.renderItems(); }
          if (window.episodiosAnimesCarousel && window.__originalCarouselData.episodiosAnimes) { window.episodiosAnimesCarousel.episodiosData = window.__originalCarouselData.episodiosAnimes.slice(); window.episodiosAnimesCarousel.index = 0; window.episodiosAnimesCarousel.renderItems(); }
          if (window.sliderIndependent && window.__originalCarouselData.slider) { window.sliderIndependent.renderSlider(window.__originalCarouselData.slider.slice()); }
        }
      } catch (e) { console.warn('restore originals error', e); }
      return;
    }

    // snapshot originals first time
    snapshotOriginalData();

    // Helper to filter a list by title/description/genre
    const filterList = (list) => {
      if(!Array.isArray(list)) return [];
      const scored = [];
      for (const it of list) {
        const title = normalizeForSearch(it.title || '');
        const desc = normalizeForSearch(it.description || '');
        const genre = normalizeForSearch(it.genre || '');
        const others = normalizeForSearch([it.seria, it.serie, it.tmdbUrl, it.postersUrl].join(' '));
        let score = 0;
        if (!qn) score = 0;
        // Exact title match -> strong
        if (title === qn) score += 100;
        // Title contains query
        else if (title.indexOf(qn) !== -1) score += 30;
        // Word-level matches in title (split)
        else if (title.split(' ').some(t => t.indexOf(qn) === 0)) score += 15;
        // Matches in description/genre/others
        if (desc.indexOf(qn) !== -1) score += 10;
        if (genre.indexOf(qn) !== -1) score += 8;
        if (others.indexOf(qn) !== -1) score += 5;
        if (score > 0) scored.push({item: it, score});
      }
      // Ordenar por score descendente y devolver solo items
      scored.sort((a,b) => b.score - a.score);
      return scored.map(s => s.item);
    };

    try {
      if (window.carousel && Array.isArray(window.__originalCarouselData.peliculas)) {
        const filtered = filterList(window.__originalCarouselData.peliculas);
        window.carousel.moviesData = filtered.slice(); window.carousel.index = 0; window.carousel.wrapper && (window.carousel.wrapper.innerHTML = ''); window.carousel.renderItems();
      }
      if (window.seriesCarousel && Array.isArray(window.__originalCarouselData.series)) {
        const filtered = filterList(window.__originalCarouselData.series);
        window.seriesCarousel.seriesData = filtered.slice(); window.seriesCarousel.index = 0; window.seriesCarousel.wrapper && (window.seriesCarousel.wrapper.innerHTML = ''); window.seriesCarousel.renderItems();
      }
      if (window.documentalesCarousel && Array.isArray(window.__originalCarouselData.documentales)) {
        const filtered = filterList(window.__originalCarouselData.documentales);
        window.documentalesCarousel.docuData = filtered.slice(); window.documentalesCarousel.index = 0; window.documentalesCarousel.wrapper && (window.documentalesCarousel.wrapper.innerHTML = ''); window.documentalesCarousel.renderItems();
      }
      if (window.animesCarousel && Array.isArray(window.__originalCarouselData.animes)) {
        const filtered = filterList(window.__originalCarouselData.animes);
        window.animesCarousel.animeData = filtered.slice(); window.animesCarousel.index = 0; window.animesCarousel.wrapper && (window.animesCarousel.wrapper.innerHTML = ''); window.animesCarousel.renderItems();
      }
      if (window.episodiosCarousel && Array.isArray(window.__originalCarouselData.episodios)) {
        const filtered = filterList(window.__originalCarouselData.episodios);
        window.episodiosCarousel.episodiosData = filtered.slice(); window.episodiosCarousel.index = 0; window.episodiosCarousel.wrapper && (window.episodiosCarousel.wrapper.innerHTML = ''); window.episodiosCarousel.renderItems();
      }
      if (window.episodiosAnimesCarousel && Array.isArray(window.__originalCarouselData.episodiosAnimes)) {
        const filtered = filterList(window.__originalCarouselData.episodiosAnimes);
        window.episodiosAnimesCarousel.episodiosData = filtered.slice(); window.episodiosAnimesCarousel.index = 0; window.episodiosAnimesCarousel.wrapper && (window.episodiosAnimesCarousel.wrapper.innerHTML = ''); window.episodiosAnimesCarousel.renderItems();
      }
      if (window.sliderIndependent && typeof window.sliderIndependent.renderSlider === 'function' && Array.isArray(window.__originalCarouselData.slider)) {
        const filtered = filterList(window.__originalCarouselData.slider);
        window.sliderIndependent.renderSlider(filtered.slice());
      }
    } catch (e) {
      console.warn('applySearchQuery error', e);
    }
  }

  // Debounced handler
  let _searchTimer = null;
  if (searchInput) {
    const clearBtn = document.getElementById('header-search-clear');
    const searchIconBtn = document.getElementById('header-search-icon');

    function updateClearVisibility() {
      try {
        if (!clearBtn) return;
        if (searchInput.value && String(searchInput.value).trim().length > 0) clearBtn.hidden = false; else clearBtn.hidden = true;
      } catch (e) { /* ignore */ }
    }

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value || '';
      updateClearVisibility();
      if (_searchTimer) clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => { applySearchQuery(q); _searchTimer = null; }, 260);
    });
    // Focus input when clicking icon
    if (searchIconBtn) {
      searchIconBtn.addEventListener('click', (e) => { e.preventDefault(); searchInput.focus(); });
    }
    // Clear button handler
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        searchInput.value = '';
        updateClearVisibility();
        applySearchQuery('');
        searchInput.focus();
      });
    }
    // If page loaded with hash search, populate input
    try {
      const rawHash = window.location.hash || '';
      if (rawHash.startsWith('#search')) {
        const q = (new URLSearchParams(rawHash.replace(/^#search\?/, ''))).get('q') || '';
        const decoded = decodeURIComponent(q);
        searchInput.value = decoded;
        updateClearVisibility();
        if (q) applySearchQuery(q);
      }
    } catch (e) { /* ignore */ }
  }
  
  onScrollHeader(); // Ejecutar al cargar
}); 