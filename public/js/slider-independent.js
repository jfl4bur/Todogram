// Slider Independiente - Con corrección de dimensiones (desktop más ancho, móvil mejor visualización)
(function () {
    let currentIndex = 0;
    let totalSlides = 0;
    let isTransitioning = false;
    let resizeTimeout = null;
    let slidesData = [];
    let isDestroyed = false;
    let lastViewportWidth = 0;

    // Función corregida para calcular dimensiones responsivas
    function calculateResponsiveDimensions() {
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        let slideWidth, slideHeight, slideGap, sideSpace;
        
        if (viewportWidth <= 480) {
            // Mobile: slide más ancho para mostrar adyacentes solo 50px
            slideWidth = Math.floor(viewportWidth - 100); // Deja 50px de cada lado para mostrar adyacentes
            slideHeight = Math.floor(slideWidth * 0.45); // Relación de aspecto ajustada
            slideGap = 8;
            sideSpace = 50; // Exactamente 50px para mostrar adyacentes
        } else if (viewportWidth <= 768) {
            // Tablet: más ancho, mejor visibilidad de adyacentes
            slideWidth = Math.floor(viewportWidth * 0.78);
            slideHeight = Math.floor(slideWidth * 0.42);
            slideGap = 12;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else if (viewportWidth <= 1024) {
            // Desktop pequeño: slides más anchos como solicitas
            slideWidth = Math.floor(viewportWidth * 0.85); // Aumentado de 0.78 a 0.85
            slideHeight = Math.floor(slideWidth * 0.38); // Proporción ajustada para no ser más alto
            slideGap = 16;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else if (viewportWidth <= 1400) {
            // Desktop mediano: aún más ancho
            slideWidth = Math.floor(viewportWidth * 0.88); // Aumentado de 0.75 a 0.88
            slideHeight = Math.floor(slideWidth * 0.35); // Mantiene la altura controlada
            slideGap = 20;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        } else {
            // Desktop grande: máximo ancho pero altura controlada
            slideWidth = Math.floor(viewportWidth * 0.90); // Aumentado de 0.72 a 0.90
            slideHeight = Math.floor(slideWidth * 0.32); // Altura aún más controlada
            slideGap = 24;
            sideSpace = Math.floor((viewportWidth - slideWidth) / 2);
        }
        
        // Límites ajustados para el nuevo comportamiento
        slideWidth = Math.max(280, Math.min(slideWidth, 1600)); // Máximo aumentado
        slideHeight = Math.max(140, Math.min(slideHeight, 400)); // Altura máxima reducida
        slideGap = Math.max(8, slideGap);
        sideSpace = Math.max(20, sideSpace);
        
        console.log('Slider: Dimensiones calculadas -', {
            viewportWidth,
            slideWidth,
            slideHeight,
            slideGap,
            sideSpace,
            percentage: Math.round((slideWidth / viewportWidth) * 100) + '%'
        });
        
        return { slideWidth, slideHeight, slideGap, sideSpace, viewportWidth };
    }

    // Función mejorada para manejar el resize (optimizada)
    function handleResize() {
        if (isDestroyed) return;
        
        const currentViewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        // Solo proceder si hay un cambio significativo en el ancho
        if (Math.abs(currentViewportWidth - lastViewportWidth) < 20) {
            return;
        }
        
        clearTimeout(resizeTimeout);
        
        console.log('Slider: Resize detectado -', {
            anterior: lastViewportWidth,
            actual: currentViewportWidth
        });
        
        // Deshabilitar transiciones durante el resize
        const wrapper = document.getElementById('slider-wrapper');
        if (wrapper) {
            wrapper.style.transition = 'none';
        }
        
        // Aplicar cambios inmediatamente
        updateSliderCSSVariables();
        updateSliderLayout(true);
        
        // Actualización con debounce
        resizeTimeout = setTimeout(() => {
            if (isDestroyed || totalSlides === 0) return;
            
            console.log('Slider: Aplicando resize definitivo');
            forceCompleteRecalculation();
            
            // Verificar integridad después de un momento
            setTimeout(() => {
                if (!isDestroyed) {
                    verifySliderIntegrity();
                    // Reactivar transiciones
                    if (wrapper) {
                        wrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    }
                }
            }, 100);
            
        }, 150);
        
        lastViewportWidth = currentViewportWidth;
    }

    // Nueva función para forzar recálculo completo
    function forceCompleteRecalculation() {
        console.log('Slider: Forzando recálculo completo');
        
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) {
            console.warn('Slider: No se encontraron elementos para recalcular');
            return;
        }
        
        // Obtener nuevas dimensiones responsivas
        const dimensions = calculateResponsiveDimensions();
        
        console.log('Slider: Nuevas dimensiones calculadas -', dimensions);
        
        // Forzar actualización de variables CSS
        const root = document.documentElement;
        root.style.setProperty('--slider-slide-width', `${dimensions.slideWidth}px`);
        root.style.setProperty('--slider-slide-height', `${dimensions.slideHeight}px`);
        root.style.setProperty('--slider-slide-gap', `${dimensions.slideGap}px`);
        root.style.setProperty('--slider-side-space', `${dimensions.sideSpace}px`);
        
        // Aplicar nuevas dimensiones a todos los slides
        slides.forEach((slide, index) => {
            // Limpiar estilos previos
            slide.style.width = '';
            slide.style.height = '';
            slide.style.flexBasis = '';
            slide.style.marginRight = '';
            
            // Forzar reflow
            slide.offsetHeight;
            
            // Aplicar nuevas dimensiones
            slide.style.width = `${dimensions.slideWidth}px`;
            slide.style.height = `${dimensions.slideHeight}px`;
            slide.style.flexBasis = `${dimensions.slideWidth}px`;
            slide.style.marginRight = index < slides.length - 1 ? `${dimensions.slideGap}px` : '0';
            slide.style.flexShrink = '0';
            slide.style.flexGrow = '0';
            
            // Ajustar imagen dentro del slide
            const img = slide.querySelector('.slider-img-wrapper img');
            if (img) {
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'fill';
                img.style.objectPosition = 'center';
            }
            
            console.log(`Slider: Slide ${index} redimensionado a ${dimensions.slideWidth}x${dimensions.slideHeight}px`);
        });
        
        // Reposicionar el wrapper correctamente
        wrapper.style.marginLeft = `${dimensions.sideSpace}px`;
        wrapper.style.left = '0px';
        
        // Actualizar posición del slider
        updateSliderPosition(true);
        
        console.log('Slider: Recálculo completo finalizado');
    }

    // Función mejorada para actualizar layout
    function updateSliderLayout(forceUpdate = false) {
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) {
            console.warn('Slider: No se encontró wrapper o slides');
            return;
        }
        
        const dimensions = calculateResponsiveDimensions();
        
        console.log('Slider: Actualizando layout -', {
            forceUpdate,
            ...dimensions,
            slidesCount: slides.length
        });
        
        // Si es una actualización forzada o hay diferencias significativas
        const currentSlideWidth = parseInt(slides[0]?.style.width) || 0;
        const needsUpdate = forceUpdate || Math.abs(currentSlideWidth - dimensions.slideWidth) > 10;
        
        if (needsUpdate) {
            // Aplicar nuevos estilos a todos los slides
            slides.forEach((slide, index) => {
                slide.style.width = `${dimensions.slideWidth}px`;
                slide.style.height = `${dimensions.slideHeight}px`;
                slide.style.flexBasis = `${dimensions.slideWidth}px`;
                slide.style.marginRight = index < slides.length - 1 ? `${dimensions.slideGap}px` : '0';
                slide.style.flexShrink = '0';
                slide.style.flexGrow = '0';
                
                // Asegurar que la imagen llene el contenedor correctamente
                const imgWrapper = slide.querySelector('.slider-img-wrapper');
                const img = slide.querySelector('.slider-img-wrapper img');
                
                if (imgWrapper) {
                    imgWrapper.style.width = '100%';
                    imgWrapper.style.height = '100%';
                    imgWrapper.style.overflow = 'hidden';
                    imgWrapper.style.borderRadius = '12px';
                }
                
                if (img) {
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'fill';
                    img.style.objectPosition = 'center';
                    img.style.transition = 'transform 0.3s ease';
                }
            });
            
            // Actualizar posición del wrapper
            wrapper.style.marginLeft = `${dimensions.sideSpace}px`;
            wrapper.style.left = '0px';
            
            console.log('Slider: Layout actualizado para', slides.length, 'slides');
        }
    }

    // Función actualizada para variables CSS con mejor posicionamiento de botones
    function updateSliderCSSVariables() {
        if (isDestroyed) return;
        
        const dimensions = calculateResponsiveDimensions();
        
        // Calcular offset de botones mejorado para móviles
        let navBtnOffset;
        if (dimensions.viewportWidth <= 480) {
            // En móvil, posicionar botones más cerca del centro para que estén junto a los slides
            navBtnOffset = Math.max(5, Math.floor(dimensions.sideSpace * 0.2));
        } else {
            // En desktop, mantener posición exterior
            navBtnOffset = Math.max(10, Math.floor(dimensions.sideSpace * 0.3));
        }

        // Actualizar variables CSS de forma forzada
        const root = document.documentElement;
        root.style.setProperty('--slider-slide-width', `${dimensions.slideWidth}px`);
        root.style.setProperty('--slider-slide-height', `${dimensions.slideHeight}px`);
        root.style.setProperty('--slider-slide-gap', `${dimensions.slideGap}px`);
        root.style.setProperty('--slider-side-space', `${dimensions.sideSpace}px`);
        root.style.setProperty('--slider-nav-btn-offset', `${navBtnOffset}px`);

        // Prevenir scroll horizontal
        document.body.style.overflowX = 'hidden';
        document.documentElement.style.overflowX = 'hidden';
        
        console.log('Slider: Variables CSS actualizadas -', {
            ...dimensions,
            navBtnOffset
        });
    }

    // Función mejorada para verificar integridad
    function verifySliderIntegrity() {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        const slides = document.querySelectorAll('.slider-slide');
        
        if (!wrapper || slides.length === 0) {
            console.warn('Slider: Verificación falló - elementos no encontrados');
            return;
        }
        
        const dimensions = calculateResponsiveDimensions();
        let needsCorrection = false;
        let issues = [];
        
        // Verificar cada slide
        slides.forEach((slide, index) => {
            const currentWidth = parseInt(slide.style.width) || 0;
            const currentHeight = parseInt(slide.style.height) || 0;
            const widthDifference = Math.abs(currentWidth - dimensions.slideWidth);
            const heightDifference = Math.abs(currentHeight - dimensions.slideHeight);
            
            if (widthDifference > 10 || heightDifference > 10) {
                needsCorrection = true;
                issues.push(`Slide ${index}: actual ${currentWidth}x${currentHeight}px, esperado ${dimensions.slideWidth}x${dimensions.slideHeight}px`);
            }
        });
        
        // Verificar posición del wrapper
        const currentMarginLeft = parseInt(wrapper.style.marginLeft) || 0;
        const marginDifference = Math.abs(currentMarginLeft - dimensions.sideSpace);
        
        if (marginDifference > 10) {
            needsCorrection = true;
            issues.push(`Wrapper marginLeft: actual ${currentMarginLeft}px, esperado ${dimensions.sideSpace}px`);
        }
        
        if (needsCorrection) {
            console.warn('Slider: Problemas de integridad detectados:', issues);
            console.log('Slider: Aplicando corrección automática');
            forceCompleteRecalculation();
        } else {
            console.log('Slider: Verificación de integridad OK');
        }
    }

    // Función mejorada para actualizar posición
    function updateSliderPosition(forceUpdate = false) {
        if (isDestroyed) return;
        
        const wrapper = document.getElementById('slider-wrapper');
        if (!wrapper) {
            console.warn('Slider: Wrapper no encontrado para actualizar posición');
            return;
        }
        
        if (!forceUpdate) {
            isTransitioning = true;
        }
        
        // Obtener dimensiones actuales
        const dimensions = calculateResponsiveDimensions();
        
        // Calcular posición
        const translateX = -(dimensions.slideWidth + dimensions.slideGap) * currentIndex;
        wrapper.style.transform = `translateX(${translateX}px)`;
        
        console.log('Slider: Posición actualizada -', {
            index: currentIndex,
            translateX,
            slideWidth: dimensions.slideWidth,
            slideGap: dimensions.slideGap,
            forceUpdate
        });
        
        if (!forceUpdate) {
            setTimeout(() => {
                isTransitioning = false;
            }, 600);
        }
    }

    // Cargar datos
    async function loadSliderData() {
        try {
            console.log('Slider: Cargando datos...');
            const response = await fetch(DATA_URL);
            if (!response.ok) throw new Error('No se pudo cargar data.json');
            const data = await response.json();
            
            // Filtrar solo películas que tengan imagen en 'Slider'
            const movies = data
                .filter(item => item && typeof item === 'object' && item['Categoría'] === 'Películas' && typeof item['Slider'] === 'string' && item['Slider'].trim() !== '')
                .map((item, index) => ({
                    id: index.toString(),
                    title: item['Título'] || 'Sin título',
                    description: item['Synopsis'] || 'Descripción no disponible',
                    posterUrl: item['Portada'] || '',
                    postersUrl: item['Carteles'] || '',
                    backgroundUrl: item['Fondo'] || '',
                    year: item['Año'] ? item['Año'].toString() : '',
                    duration: item['Duración'] || '',
                    genre: item['Géneros'] || '',
                    rating: item['Puntuación 1-10'] || '',
                    director: item['Director(es)'] || '',
                    cast: item['Reparto principal'] || '',
                    synopsis: item['Synopsis'] || '',
                    tmdbUrl: item['TMDB'] || '',
                    tmdbId: item['ID TMDB'] || '',
                    trailerUrl: item['Trailer'] || '',
                    videoUrl: item['Video iframe'] || item['Video iframe 1'] || item['Ver Película'] || '',
                    originalTitle: item['Título original'] || '',
                    productionCompanies: item['Productora(s)'] || '',
                    productionCountries: item['País(es)'] || '',
                    spokenLanguages: item['Idioma(s) original(es)'] || '',
                    writers: item['Escritor(es)'] || '',
                    audios: item['Audios'] || '',
                    subtitles: item['Subtítulos'] || '',
                    audioList: item['Audios'] ? item['Audios'].split(',').map(audio => audio.trim()) : [],
                    subtitleList: item['Subtítulos'] ? item['Subtítulos'].split(',').map(sub => sub.trim()) : [],
                    audiosCount: item['Audios'] ? item['Audios'].split(',').length : 0,
                    subtitlesCount: item['Subtítulos'] ? item['Subtítulos'].split(',').length : 0,
                    sliderUrl: item['Slider'] || ''
                }));

            console.log('Slider: Datos cargados:', movies.length, 'películas');
            return movies;
        } catch (error) {
            console.error('Slider: Error cargando datos:', error);
            return [];
        }
    }

    // Renderizar slider
    function renderSlider(moviesData = []) {
        if (isDestroyed) return;
        
        console.log('Slider: Iniciando renderizado...');
        
        const sliderWrapper = document.getElementById('slider-wrapper');
        if (!sliderWrapper) {
            console.error('Slider: slider-wrapper no encontrado');
            return;
        }

        // Usar los datos proporcionados o los datos cargados
        const movies = moviesData.length > 0 ? moviesData : slidesData;

        // Seleccionar películas para el slider
        const selectedMovies = movies
            .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
            .slice(0, 8);
        
        console.log('Slider: Películas seleccionadas:', selectedMovies.length);

        // Asignar datos globales
        slidesData = selectedMovies;
        totalSlides = slidesData.length;
        
        if (totalSlides === 0) {
            console.error('Slider: No hay slides para renderizar');
            return;
        }

        // Guardar viewport actual
        lastViewportWidth = document.documentElement.clientWidth || window.innerWidth;
        
        // Aplicar variables CSS antes de crear slides
        updateSliderCSSVariables();

        // Obtener dimensiones responsivas
        const dimensions = calculateResponsiveDimensions();
        
        // Limpiar wrapper
        sliderWrapper.innerHTML = '';
        
        // Configurar wrapper con centrado correcto
        sliderWrapper.style.display = 'flex';
        sliderWrapper.style.flexDirection = 'row';
        sliderWrapper.style.flexWrap = 'nowrap';
        sliderWrapper.style.transform = 'translateX(0)';
        sliderWrapper.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        sliderWrapper.style.position = 'relative';
        sliderWrapper.style.left = '0px';
        sliderWrapper.style.marginLeft = `${dimensions.sideSpace}px`;
        
        console.log('Slider: Creando slides con dimensiones:', dimensions);
        
        // Crear slides
        slidesData.forEach((movie, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'slider-slide';
            slideDiv.dataset.index = index;
            
            // Aplicar estilos directamente con valores calculados
            slideDiv.style.width = `${dimensions.slideWidth}px`;
            slideDiv.style.height = `${dimensions.slideHeight}px`;
            slideDiv.style.flexBasis = `${dimensions.slideWidth}px`;
            slideDiv.style.marginRight = index < slidesData.length - 1 ? `${dimensions.slideGap}px` : '0';
            slideDiv.style.flexShrink = '0';
            slideDiv.style.flexGrow = '0';
            slideDiv.style.position = 'relative';
            slideDiv.style.borderRadius = '12px';
            slideDiv.style.overflow = 'hidden';
            slideDiv.style.cursor = 'pointer';
            slideDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
            slideDiv.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            
            // Usar solo la imagen del campo 'Slider' como principal
            const imageUrl = movie.sliderUrl || `https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=${encodeURIComponent(movie.title)}`;
            
            const mainGenre = movie.genre ? movie.genre.split(/[·,]/)[0].trim() : '';
            
            slideDiv.innerHTML = `
                <div class="slider-img-wrapper" style="width: 100%; height: 100%; overflow: hidden; border-radius: 12px;">
                    <img src="${imageUrl}" 
                         alt="${movie.title}" 
                         loading="${index === 0 ? 'eager' : 'lazy'}"
                         style="width: 100%; height: 100%; object-fit: fill; object-position: center; transition: transform 0.3s ease;"
                         onerror="this.src='https://via.placeholder.com/${dimensions.slideWidth}x${dimensions.slideHeight}/333/fff?text=No+Image'">
                </div>
                <div class="slider-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 20px; color: white; border-radius: 0 0 12px 12px;">
                    <div class="slider-title-movie" style="font-size: clamp(1rem, 2.5vw, 1.5rem); font-weight: bold; margin-bottom: 8px; line-height: 1.2;">${movie.title || 'Sin título'}</div>
                    <div class="slider-meta" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; font-size: clamp(0.75rem, 2vw, 0.9rem); opacity: 0.9;">
                        ${movie.year ? `<span>${movie.year}</span>` : ''}
                        ${movie.duration ? `<span>${movie.duration}</span>` : ''}
                        ${mainGenre ? `<span>${mainGenre}</span>` : ''}
                        ${movie.rating ? `<span><i class="fas fa-star" style="color: #ffd700; margin-right: 4px;"></i>${movie.rating}</span>` : ''}
                    </div>
                    <div class="slider-description" style="font-size: clamp(0.7rem, 1.8vw, 0.85rem); line-height: 1.4; opacity: 0.85; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${movie.description || movie.synopsis || 'Sin descripción disponible'}</div>
                </div>
            `;

            // Efectos hover
            slideDiv.addEventListener('mouseenter', () => {
                if (!isTransitioning) {
                    slideDiv.style.transform = 'scale(1.05)';
                    slideDiv.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
                    const img = slideDiv.querySelector('img');
                    if (img) img.style.transform = 'scale(1.1)';
                }
            });

            slideDiv.addEventListener('mouseleave', () => {
                if (!isTransitioning) {
                    slideDiv.style.transform = 'scale(1)';
                    slideDiv.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                    const img = slideDiv.querySelector('img');
                    if (img) img.style.transform = 'scale(1)';
                }
            });

            // Click handler
            slideDiv.addEventListener('click', (e) => {
                if (!isTransitioning) {
                    e.preventDefault();
                    console.log('Slider: Click en slide:', movie.title);
                    openDetailsModal(movie, slideDiv);
                }
            });

            sliderWrapper.appendChild(slideDiv);
        });

        // Configurar controles
        setupControls();
        
        // Posicionar slider
        currentIndex = 0;
        updateSliderPosition(true);
        updatePagination();
        
        console.log('Slider: Renderizado completado');
        
        // Verificación final
        setTimeout(() => {
            if (!isDestroyed) {
                verifySliderIntegrity();
            }
        }, 200);
    }

    // Configurar controles
    function setupControls() {
        // Navegación
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        
        if (prevBtn) {
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.replaceWith(newPrevBtn);
            document.getElementById('slider-prev').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && totalSlides > 0) {
                    goToSlide(currentIndex - 1);
                }
            });
        }
        
        if (nextBtn) {
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.replaceWith(newNextBtn);
            document.getElementById('slider-next').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning && totalSlides > 0) {
                    goToSlide(currentIndex + 1);
                }
            });
        }

        // Paginación
        createPagination();
    }

    // Crear paginación
    function createPagination() {
        const pagination = document.getElementById('slider-pagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-pagination-dot';
            dot.dataset.slide = i;
            if (i === 0) dot.classList.add('active');
            
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isTransitioning) {
                    goToSlide(i);
                }
            });
            
            pagination.appendChild(dot);
        }
    }

    // Ir a slide
    function goToSlide(index) {
        if (isTransitioning || totalSlides === 0 || isDestroyed) return;
        
        // Navegación circular
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        if (index === currentIndex) return;
        
        console.log('Slider: Cambiando a slide', index);
        
        currentIndex = index;
        updateSliderPosition();
        updatePagination();
    }

    // Actualizar paginación
    function updatePagination() {
        const dots = document.querySelectorAll('.slider-pagination-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // Función para abrir modal
    function openDetailsModal(movie, element) {
        console.log('Slider: Abriendo modal para:', movie.title);
        
        function tryOpenModal() {
            if (window.detailsModal && typeof window.detailsModal.show === 'function') {
                window.detailsModal.show(movie, element);
                window.activeItem = movie;
                return true;
            }
            return false;
        }
        
        if (!tryOpenModal()) {
            let attempts = 0;
            const maxAttempts = 5;
            const retryInterval = setInterval(() => {
                attempts++;
                if (tryOpenModal()) {
                    clearInterval(retryInterval);
                } else if (attempts >= maxAttempts) {
                    console.error('Slider: No se pudo abrir el modal');
                    clearInterval(retryInterval);
                }
            }, 200 * attempts);
        }
    }

    // Función de limpieza
    function destroy() {
        console.log('Slider: Destruyendo...');
        isDestroyed = true;
        
        clearTimeout(resizeTimeout);
        window.removeEventListener('resize', handleResize);
        
        // Limpiar event listeners adicionales
        const prevBtn = document.getElementById('slider-prev');
        const nextBtn = document.getElementById('slider-next');
        const dots = document.querySelectorAll('.slider-pagination-dot');
        
        if (prevBtn) prevBtn.replaceWith(prevBtn.cloneNode(true));
        if (nextBtn) nextBtn.replaceWith(nextBtn.cloneNode(true));
        dots.forEach(dot => dot.replaceWith(dot.cloneNode(true)));
        
        slidesData = [];
        currentIndex = 0;
        totalSlides = 0;
        isTransitioning = false;
        lastViewportWidth = 0;
        
        console.log('Slider: Destruido correctamente');
    }

    // Auto-play (opcional)
    let autoPlayInterval = null;
    
    function startAutoPlay() {
        if (autoPlayInterval) return;
        
        autoPlayInterval = setInterval(() => {
            if (!isTransitioning && totalSlides > 0 && !isDestroyed) {
                goToSlide(currentIndex + 1);
            }
        }, 5000);
    }
    
    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }

    // Inicialización
    async function initSlider() {
        if (isDestroyed) return;
        
        console.log('Slider: Inicializando...');
        
        try {
            // Cargar datos
            const moviesData = await loadSliderData();
            
            if (moviesData.length === 0) {
                console.warn('Slider: No hay datos para mostrar');
                return;
            }
            
            // Renderizar slider
            renderSlider(moviesData);
            
            // Configurar eventos
            window.addEventListener('resize', handleResize, { passive: true });
            
            // Auto-play opcional (descomenta si lo necesitas)
            // startAutoPlay();
            
            console.log('Slider: Inicializado correctamente');
            
        } catch (error) {
            console.error('Slider: Error en inicialización:', error);
        }
    }

    // Exponer funciones públicas
    window.independentSlider = {
        init: initSlider,
        destroy: destroy,
        goToSlide: goToSlide,
        next: () => goToSlide(currentIndex + 1),
        prev: () => goToSlide(currentIndex - 1),
        startAutoPlay: startAutoPlay,
        stopAutoPlay: stopAutoPlay,
        getCurrentIndex: () => currentIndex,
        getTotalSlides: () => totalSlides,
        isReady: () => totalSlides > 0 && !isDestroyed
    };

    // Auto-inicialización cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlider);
    } else {
        // Si el DOM ya está cargado, inicializar inmediatamente
        setTimeout(initSlider, 100);
    }

})();