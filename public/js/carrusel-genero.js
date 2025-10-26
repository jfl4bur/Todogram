document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.getElementById('generos-carousel-wrapper');
    const prevBtn = document.getElementById('generos-carousel-prev');
    const nextBtn = document.getElementById('generos-carousel-next');
    const skeleton = document.getElementById('generos-skeleton');
    const GAP = 18; // debe coincidir con CSS gap

    if (!wrapper) return;

    let items = [];
    let currentPage = 0;
    let itemsPerPage = 1;
    let itemWidth = 160;

    // mostrar skeleton mientras carga
    if (skeleton) skeleton.style.display = 'flex';
    wrapper.style.display = 'none';

    function deriveTitleFromPortada(url) {
        try {
            const parts = url.split('/');
            let name = parts[parts.length - 1] || '';
            name = decodeURIComponent(name);
            name = name.replace(/\.[^.]+$/, ''); // quitar extension
            name = name.replace(/[-_+]/g, ' ');
            // Capitalizar primeras letras
            name = name.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            if (/^todo$/i.test(name)) return 'Todo el catálogo';
            return name;
        } catch (e) { return ''; }
    }

    // cargar JSON desde ruta local
    fetch('https://jfl4bur.github.io/Todogram/public/carrucat.json').then(r => r.json()).then(data => {
        items = data || [];
        render();
        window.addEventListener('resize', debounce(onResize, 120));
    }).catch(err => {
        console.error('Error cargando carrucat.json', err);
        if (skeleton) skeleton.style.display = 'none';
        wrapper.style.display = 'block';
    });

    function render() {
        wrapper.innerHTML = '';

        items.forEach((it, idx) => {
            const a = document.createElement('a');
            a.className = 'genero-item';
            a.href = it.urlCat || '#';
            a.setAttribute('data-index', idx);
            a.setAttribute('aria-label', deriveTitleFromPortada(it.PortadaCat) || 'Género');

            const img = document.createElement('img');
            img.className = 'genero-img';
            img.src = it.PortadaCat || '';
            img.alt = deriveTitleFromPortada(it.PortadaCat) || '';

            const title = document.createElement('div');
            title.className = 'genero-title';
            title.textContent = deriveTitleFromPortada(it.PortadaCat) || '';

            a.appendChild(img);
            a.appendChild(title);
            wrapper.appendChild(a);
        });

        // una vez renderizados, calcular layout y añadir listeners
        calculateLayout();
        attachNav();

        // ocultar skeleton y mostrar wrapper
        if (skeleton) skeleton.style.display = 'none';
        wrapper.style.display = 'flex';
    }

    function calculateLayout() {
        const containerWidth = wrapper.clientWidth || wrapper.getBoundingClientRect().width;

        // detectar móvil muy pequeño: forzar 3 items centrados (<=480px)
        const isSmallMobile = window.matchMedia && window.matchMedia('(max-width: 480px)').matches;

        // intentar leer el ancho real del primer item
        const firstItem = wrapper.querySelector('.genero-item');
        const measured = firstItem ? Math.round(firstItem.getBoundingClientRect().width) : 160;
        itemWidth = measured || 160;

        if (isSmallMobile) {
            // Forzar 3 items visibles
            itemsPerPage = 3;
            // No sobrescribimos los estilos inline (dejar que CSS calc() gestione el ancho)
            // pero actualizar itemWidth con la medida real para cálculos de scroll
            // Quitar inline width/flex si existieran
            const itemElements = wrapper.querySelectorAll('.genero-item');
            itemElements.forEach((el) => {
                el.style.flex = '';
                el.style.width = '';
            });
        } else {
            // calcular cuántos ítems caben
            itemsPerPage = Math.max(1, Math.floor(containerWidth / (itemWidth + GAP)));
            if (itemsPerPage < 1) itemsPerPage = 1;

            // asegurar que cada item tenga ancho correcto (solo fuera de small mobile)
            const itemElements = wrapper.querySelectorAll('.genero-item');
            itemElements.forEach((el) => {
                el.style.flex = `0 0 ${itemWidth}px`;
                el.style.width = itemWidth + 'px';
            });
        }

        // actualizar barra de progreso inicial
        updateProgressBar();
    }

    function attachNav() {
        const progressBar = wrapper.parentElement ? wrapper.parentElement.querySelector('.carousel-progress-bar') : null;
        // show/hide nav depending on pointer capabilities (same behavior que otros carruseles)
        const carouselNav = document.getElementById('generos-carousel-nav');
        if (carouselNav) {
            if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                carouselNav.style.display = 'flex';
            } else {
                carouselNav.style.display = 'none';
            }
        }

        if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); scrollToPrevPage(); });
        if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); scrollToNextPage(); });

        wrapper.addEventListener('scroll', () => { updateProgressBar(); });

        // ResizeObserver para recalcular itemsPerPage cuando cambie el ancho
        try {
            const ro = new ResizeObserver(() => { calculateLayout(); });
            ro.observe(wrapper);
        } catch (e) {
            window.addEventListener('resize', debounce(calculateLayout, 120));
        }
    }

    function updateProgressBar() {
        const progressBar = wrapper.parentElement ? wrapper.parentElement.querySelector('.carousel-progress-bar') : null;
        if (!progressBar) return;
        if (wrapper.scrollWidth > wrapper.clientWidth) {
            const scrollPercentage = (wrapper.scrollLeft / (wrapper.scrollWidth - wrapper.clientWidth)) * 100;
            progressBar.style.width = `${scrollPercentage}%`;
        } else {
            progressBar.style.width = '100%';
        }
    }

    function scrollToPrevPage() {
        if (!wrapper) return;
        const firstItem = wrapper.querySelector('.genero-item');
        const step = (firstItem ? firstItem.getBoundingClientRect().width : itemWidth) + GAP;
        const pageStep = itemsPerPage * step;
        const target = Math.max(0, wrapper.scrollLeft - pageStep);
        wrapper.scrollTo({ left: target, behavior: 'smooth' });
    }

    function scrollToNextPage() {
        if (!wrapper) return;
        const firstItem = wrapper.querySelector('.genero-item');
        const step = (firstItem ? firstItem.getBoundingClientRect().width : itemWidth) + GAP;
        const pageStep = itemsPerPage * step;
        const maxScroll = wrapper.scrollWidth - wrapper.clientWidth;
        const target = Math.min(maxScroll, wrapper.scrollLeft + pageStep);
        wrapper.scrollTo({ left: target, behavior: 'smooth' });
    }

    function onResize() { calculateLayout(); }

    function debounce(fn, wait) {
        let t;
        return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
    }
});
