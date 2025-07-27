// Header HTML
const headerHTML = `
  <header class="slider-header" id="slider-header">
    <div class="slider-header-inner">
      <div class="slider-logo">
        <svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10.5 8.5C10.5 6.01472 12.5147 4 15 4H25C27.4853 4 29.5 6.01472 29.5 8.5V23.5C29.5 25.9853 27.4853 28 25 28H15C12.5147 28 10.5 25.9853 10.5 23.5V8.5Z" fill="#E50914"/>
          <path d="M20 12L24 16L20 20V12Z" fill="white"/>
        </svg>
      </div>
      <nav class="slider-nav-menu">
        <a href="#" class="slider-nav-link"><i class="fas fa-home"></i><span>Inicio</span></a>
        <a href="#" class="slider-nav-link"><i class="fas fa-film"></i><span>Películas</span></a>
        <a href="#" class="slider-nav-link"><i class="fas fa-tv"></i><span>Series</span></a>
        <a href="#" class="slider-nav-link"><i class="fas fa-child"></i><span>Infantil</span></a>
        <a href="#" class="slider-nav-link"><i class="fas fa-broadcast-tower"></i><span>Canales</span></a>
        <a href="#" class="slider-nav-link"><i class="fas fa-shopping-cart"></i><span>Tienda</span></a>
        <a href="#" class="slider-nav-link"><i class="fas fa-crown"></i><span>Suscripción</span></a>
        <a href="#" class="slider-nav-link"><i class="fas fa-question-circle"></i><span>Ayuda</span></a>
      </nav>
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
    <a href="#" class="slider-nav-link"><i class="fas fa-home"></i><span>Inicio</span></a>
    <a href="#" class="slider-nav-link"><i class="fas fa-film"></i><span>Películas</span></a>
    <a href="#" class="slider-nav-link"><i class="fas fa-tv"></i><span>Series</span></a>
    <a href="#" class="slider-nav-link"><i class="fas fa-child"></i><span>Infantil</span></a>
    <a href="#" class="slider-nav-link"><i class="fas fa-broadcast-tower"></i><span>Canales</span></a>
    <a href="#" class="slider-nav-link"><i class="fas fa-shopping-cart"></i><span>Tienda</span></a>
    <a href="#" class="slider-nav-link"><i class="fas fa-crown"></i><span>Suscripción</span></a>
    <a href="#" class="slider-nav-link"><i class="fas fa-question-circle"></i><span>Ayuda</span></a>
    <a href="#" class="slider-nav-login"><i class="fas fa-user"></i><span>Iniciar sesión</span></a>
  </div>
`;

// Renderizar header
document.addEventListener('DOMContentLoaded', function() {
  const headerRoot = document.getElementById('header-root');
  if (headerRoot) {
    headerRoot.innerHTML = headerHTML;
  }
  
  // Elementos del header
  const header = document.getElementById('slider-header');
  const burger = document.getElementById('slider-header-burger');
  const mobileMenu = document.getElementById('slider-mobile-menu');
  const mobileMenuBg = document.getElementById('slider-mobile-menu-bg');
  
  if (!header || !burger || !mobileMenu || !mobileMenuBg) {
    console.error('Elementos del header no encontrados');
    return;
  }
  
  // Variables para scroll
  let lastScrollY = 0;
  let isScrolling = false;
  
  // Toggle mobile menu
  function toggleMobileMenu() {
    burger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    mobileMenuBg.classList.toggle('open');
    document.body.classList.toggle('no-scroll');
  }
  
  // Función para manejar scroll en la página principal
  function onScrollHeader() {
    if (!isScrolling) {
      isScrolling = true;
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        
        // Efecto de fondo translúcido
        if (currentScrollY > 10) {
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
          if (modalScrollTop > 10) {
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
  
  onScrollHeader(); // Ejecutar al cargar
}); 