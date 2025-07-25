// Clase principal para manejar los sliders
class RakutenSlider {
    constructor(sliderId, options = {}) {
        this.slider = document.getElementById(sliderId);
        this.track = this.slider?.querySelector('.slider-track');
        this.cards = this.slider?.querySelectorAll('.card');
        this.prevBtn = document.querySelector(`[data-slider="${sliderId}"].slider-nav-prev`);
        this.nextBtn = document.querySelector(`[data-slider="${sliderId}"].slider-nav-next`);
        
        // Configuración por defecto
        this.options = {
            cardsToShow: 5,
            cardsToScroll: 3,
            gap: 16,
            autoPlay: false,
            autoPlayInterval: 5000,
            loop: true,
            responsive: {
                1200: { cardsToShow: 4, cardsToScroll: 2 },
                768: { cardsToShow: 3, cardsToScroll: 2 },
                480: { cardsToShow: 2, cardsToScroll: 1 }
            },
            ...options
        };
        
        // Estados del slider
        this.currentIndex = 0;
        this.totalCards = this.cards?.length || 0;
        this.cardWidth = 0;
        this.maxIndex = 0;
        this.isAnimating = false;
        this.autoPlayTimer = null;
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.startIndex = 0;
        
        this.init();
    }
    
    init() {
        if (!this.slider || !this.track || this.totalCards === 0) {
            console.warn(`Slider ${this.slider?.id || 'unknown'} no se pudo inicializar`);
            return;
        }
        
        this.setupSlider();
        this.setupEventListeners();
        this.setupResponsive();
        this.updateSlider();
        
        if (this.options.autoPlay) {
            this.startAutoPlay();
        }
        
        console.log(`Slider ${this.slider.id} inicializado con ${this.totalCards} tarjetas`);
    }
    
    setupSlider() {
        // Configurar el track del slider
        this.track.style.display = 'flex';
        this.track.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        // Calcular dimensiones
        this.calculateDimensions();
    }
    
    calculateDimensions() {
        const containerWidth = this.slider.offsetWidth;
        const currentSettings = this.getCurrentSettings();
        
        // Calcular el ancho de cada tarjeta
        this.cardWidth = (containerWidth - (currentSettings.cardsToShow - 1) * this.options.gap) / currentSettings.cardsToShow;
        
        // Calcular el índice máximo
        this.maxIndex = Math.max(0, this.totalCards - currentSettings.cardsToShow);
        
        // Aplicar estilos a las tarjetas
        this.cards.forEach(card => {
            card.style.flex = `0 0 ${this.cardWidth}px`;
            card.style.marginRight = `${this.options.gap}px`;
        });
        
        // Eliminar margen del último elemento
        if (this.cards.length > 0) {
            this.cards[this.cards.length - 1].style.marginRight = '0';
        }
    }
    
    getCurrentSettings() {
        const width = window.innerWidth;
        let settings = { 
            cardsToShow: this.options.cardsToShow, 
            cardsToScroll: this.options.cardsToScroll 
        };
        
        // Aplicar configuración responsive
        Object.keys(this.options.responsive).forEach(breakpoint => {
            if (width <= parseInt(breakpoint)) {
                settings = { ...settings, ...this.options.responsive[breakpoint] };
            }
        });
        
        return settings;
    }
    
    setupEventListeners() {
        // Botones de navegación
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prev());
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.next());
        }
        
        // Navegación con teclado
        this.slider.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Touch events para dispositivos móviles
        this.setupTouchEvents();
        
        // Hover para pausar autoplay
        this.slider.addEventListener('mouseenter', () => this.pauseAutoPlay());
        this.slider.addEventListener('mouseleave', () => {
            if (this.options.autoPlay) this.startAutoPlay();
        });
        
        // Eventos de las tarjetas
        this.setupCardEvents();
    }
    
    setupTouchEvents() {
        let startX, currentX, isDragging = false;
        
        this.track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            this.track.style.transition = 'none';
        }, { passive: true });
        
        this.track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const deltaX = startX - currentX;
            const currentTransform = this.currentIndex * (this.cardWidth + this.options.gap);
            
            this.track.style.transform = `translateX(-${currentTransform + deltaX}px)`;
        }, { passive: true });
        
        this.track.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaX = startX - currentX;
            const threshold = this.cardWidth / 3;
            
            this.track.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            if (Math.abs(deltaX) > threshold) {
                if (deltaX > 0) {
                    this.next();
                } else {
                    this.prev();
                }
            } else {
                this.updateSlider();
            }
        }, { passive: true });
    }
    
    setupCardEvents() {
        this.cards.forEach((card, index) => {
            // Animación hover
            card.addEventListener('mouseenter', () => {
                this.pauseAutoPlay();
                card.style.zIndex = '10';
            });
            
            card.addEventListener('mouseleave', () => {
                if (this.options.autoPlay) this.startAutoPlay();
                card.style.zIndex = '1';
            });
            
            // Click en tarjeta
            card.addEventListener('click', (e) => {
                this.handleCardClick(card, index, e);
            });
            
            // Eventos de los botones de acción
            const playBtn = card.querySelector('.play-btn');
            const actionBtns = card.querySelectorAll('.action-btn');
            
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handlePlayClick(card, index);
                });
            }
            
            actionBtns.forEach((btn, btnIndex) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleActionClick(card, index, btnIndex, btn);
                });
            });
        });
    }
    
    setupResponsive() {
        let resizeTimer;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.calculateDimensions();
                this.currentIndex = Math.min(this.currentIndex, this.maxIndex);
                this.updateSlider();
            }, 150);
        });
    }
    
    prev() {
        if (this.isAnimating) return;
        
        const settings = this.getCurrentSettings();
        
        if (this.currentIndex > 0) {
            this.currentIndex = Math.max(0, this.currentIndex - settings.cardsToScroll);
        } else if (this.options.loop) {
            this.currentIndex = this.maxIndex;
        }
        
        this.updateSlider();
    }
    
    next() {
        if (this.isAnimating) return;
        
        const settings = this.getCurrentSettings();
        
        if (this.currentIndex < this.maxIndex) {
            this.currentIndex = Math.min(this.maxIndex, this.currentIndex + settings.cardsToScroll);
        } else if (this.options.loop) {
            this.currentIndex = 0;
        }
        
        this.updateSlider();
    }
    
    goToSlide(index) {
        if (this.isAnimating || index < 0 || index > this.maxIndex) return;
        
        this.currentIndex = index;
        this.updateSlider();
    }
    
    updateSlider() {
        if (!this.track) return;
        
        this.isAnimating = true;
        
        const translateX = this.currentIndex * (this.cardWidth + this.options.gap);
        this.track.style.transform = `translateX(-${translateX}px)`;
        
        // Actualizar estado de los botones
        this.updateNavButtons();
        
        // Resetear flag de animación
        setTimeout(() => {
            this.isAnimating = false;
        }, 400);
        
        // Emitir evento personalizado
        this.slider.dispatchEvent(new CustomEvent('slideChange', {
            detail: { currentIndex: this.currentIndex, totalCards: this.totalCards }
        }));
    }
    
    updateNavButtons() {
        if (this.prevBtn) {
            this.prevBtn.style.opacity = (this.currentIndex === 0 && !this.options.loop) ? '0.5' : '1';
            this.prevBtn.disabled = (this.currentIndex === 0 && !this.options.loop);
        }
        
        if (this.nextBtn) {
            this.nextBtn.style.opacity = (this.currentIndex === this.maxIndex && !this.options.loop) ? '0.5' : '1';
            this.nextBtn.disabled = (this.currentIndex === this.maxIndex && !this.options.loop);
        }
    }
    
    startAutoPlay() {
        if (!this.options.autoPlay) return;
        
        this.pauseAutoPlay();
        this.autoPlayTimer = setInterval(() => {
            this.next();
        }, this.options.autoPlayInterval);
    }
    
    pauseAutoPlay() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }
    
    handleKeydown(e) {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.prev();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.next();
                break;
            case 'Home':
                e.preventDefault();
                this.goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                this.goToSlide(this.maxIndex);
                break;
        }
    }
    
    handleCardClick(card, index, event) {
        // Lógica para el click en la tarjeta
        console.log(`Card ${index} clicked:`, card.querySelector('.card-title')?.textContent);
        
        // Animación de click
        card.style.transform = 'scale(0.98)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);
        
        // Aquí puedes agregar lógica para mostrar detalles, navegar, etc.
        this.showCardDetails(card, index);
    }
    
    handlePlayClick(card, index) {
        console.log(`Play button clicked for card ${index}`);
        
        // Simular reproducción
        const playBtn = card.querySelector('.play-btn');
        const originalContent = playBtn.innerHTML;
        
        playBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        playBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        
        setTimeout(() => {
            playBtn.innerHTML = originalContent;
            playBtn.style.background = '';
            
            // Aquí iría la lógica real de reproducción
            this.playContent(card, index);
        }, 1000);
    }
    
    handleActionClick(card, index, actionIndex, button) {
        const actions = ['add', 'like', 'dislike'];
        const action = actions[actionIndex] || 'unknown';
        
        console.log(`Action ${action} clicked for card ${index}`);
        
        // Animación del botón
        button.style.transform = 'scale(1.2)';
        button.style.background = 'rgba(220, 20, 60, 0.3)';
        
        setTimeout(() => {
            button.style.transform = '';
            button.style.background = '';
        }, 200);
        
        // Lógica específica según la acción
        this.performAction(action, card, index);
    }
    
    showCardDetails(card, index) {
        // Crear modal simple o mostrar información adicional
        const title = card.querySelector('.card-title')?.textContent || 'Sin título';
        const rating = card.querySelector('.rating')?.textContent || 'N/A';
        
        // Aquí puedes implementar un modal más elaborado
        console.log(`Mostrando detalles de: ${title} (Rating: ${rating})`);
        
        // Ejemplo de notificación simple
        this.showNotification(`Seleccionaste: ${title}`);
    }
    
    playContent(card, index) {
        const title = card.querySelector('.card-title')?.textContent || 'Contenido';
        this.showNotification(`Reproduciendo: ${title}`, 'success');
    }
    
    performAction(action, card, index) {
        const title = card.querySelector('.card-title')?.textContent || 'Contenido';
        const messages = {
            add: `${title} agregado a tu lista`,
            like: `Te gusta ${title}`,
            dislike: `No te gusta ${title}`
        };
        
        this.showNotification(messages[action] || 'Acción realizada', 'info');
    }
    
    showNotification(message, type = 'info') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Estilos
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: '10000',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        // Animación de entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Métodos públicos
    destroy() {
        this.pauseAutoPlay();
        
        // Remover event listeners
        if (this.prevBtn) {
            this.prevBtn.removeEventListener('click', this.prev);
        }
        
        if (this.nextBtn) {
            this.nextBtn.removeEventListener('click', this.next);
        }
        
        // Resetear estilos
        if (this.track) {
            this.track.style.transform = '';
            this.track.style.transition = '';
        }
        
        this.cards.forEach(card => {
            card.style.flex = '';
            card.style.marginRight = '';
        });
    }
    
    refresh() {
        this.calculateDimensions();
        this.updateSlider();
    }
    
    setAutoPlay(enabled, interval) {
        this.options.autoPlay = enabled;
        if (interval) {
            this.options.autoPlayInterval = interval;
        }
        
        if (enabled) {
            this.startAutoPlay();
        } else {
            this.pauseAutoPlay();
        }
    }
}

// Utilidades adicionales
class RakutenApp {
    constructor() {
        this.sliders = new Map();
        this.init();
    }
    
    init() {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeApp());
        } else {
            this.initializeApp();
        }
    }
    
    initializeApp() {
        this.initializeSliders();
        this.setupGlobalEvents();
        this.setupHeaderEffects();
        this.preloadImages();
        
        console.log('RAKUTEN.tv App inicializada');
    }
    
    initializeSliders() {
        // Configuraciones específicas para cada slider
        const sliderConfigs = {
            slider1: {
                cardsToShow: 5,
                cardsToScroll: 3,
                autoPlay: false,
                loop: true
            },
            slider2: {
                cardsToShow: 4,
                cardsToScroll: 2,
                autoPlay: false,
                loop: true
            },
            slider3: {
                cardsToShow: 5,
                cardsToScroll: 3,
                autoPlay: false,
                loop: true
            }
        };
        
        // Inicializar cada slider
        Object.keys(sliderConfigs).forEach(sliderId => {
            const sliderElement = document.getElementById(sliderId);
            if (sliderElement) {
                const slider = new RakutenSlider(sliderId, sliderConfigs[sliderId]);
                this.sliders.set(sliderId, slider);
            }
        });
    }
    
    setupGlobalEvents() {
        // Navegación con teclado global
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.focusSlider('slider1');
                        break;
                    case '2':
                        e.preventDefault();
                        this.focusSlider('slider2');
                        break;
                    case '3':
                        e.preventDefault();
                        this.focusSlider('slider3');
                        break;
                }
            }
        });
        
        // Intersection Observer para lazy loading
        this.setupIntersectionObserver();
    }
    
    setupHeaderEffects() {
        const header = document.querySelector('.header');
        if (!header) return;
        
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > 100) {
                header.style.background = 'rgba(0, 0, 0, 0.95)';
                header.style.backdropFilter = 'blur(20px)';
            } else {
                header.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)';
                header.style.backdropFilter = 'blur(10px)';
            }
            
            // Auto-hide header al hacer scroll hacia abajo
            if (currentScrollY > lastScrollY && currentScrollY > 200) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
            
            lastScrollY = currentScrollY;
        }, { passive: true });
    }
    
    setupIntersectionObserver() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        }, { rootMargin: '50px' });
        
        // Observar imágenes lazy
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    preloadImages() {
        // Precargar imágenes críticas
        const criticalImages = document.querySelectorAll('.hero-image img, .card-image img');
        
        criticalImages.forEach(img => {
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'preload';
            preloadLink.as = 'image';
            preloadLink.href = img.src;
            document.head.appendChild(preloadLink);
        });
    }
    
    focusSlider(sliderId) {
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.scrollIntoView({ behavior: 'smooth', block: 'center' });
            slider.focus();
        }
    }
    
    // Métodos públicos para controlar sliders
    getSlider(sliderId) {
        return this.sliders.get(sliderId);
    }
    
    refreshAllSliders() {
        this.sliders.forEach(slider => slider.refresh());
    }
    
    setGlobalAutoPlay(enabled) {
        this.sliders.forEach(slider => {
            slider.setAutoPlay(enabled, slider.options.autoPlayInterval);
        });
    }
}

// Inicializar la aplicación
const rakutenApp = new RakutenApp();

// Exponer globalmente para debugging
window.RakutenApp = rakutenApp;
window.RakutenSlider = RakutenSlider;