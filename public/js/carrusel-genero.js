document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.getElementById('generos-carousel-wrapper');
    const skeleton = document.getElementById('generos-skeleton');
    const prevBtn = document.getElementById('generos-carousel-prev');
    const nextBtn = document.getElementById('generos-carousel-next');
    const paginationRoot = document.getElementById('generos-pagination');
    const GAP = 4; // coincide con styles.css

    if (!wrapper || !skeleton) return;

    let items = [];
    let currentPage = 0, itemsPerPage = 1, itemWidth = 194, totalPages = 1;

    function deriveTitleFromPortada(url) {
        try {
            const parts = String(url || '').split('/');
            let name = parts[parts.length - 1] || '';
            name = decodeURIComponent(name || '');
            name = name.replace(/\.[^.]+$/, '');
            name = name.replace(/[-_+]/g, ' ');
            name = name.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            if (/^todo$/i.test(name)) return 'Todo el catálogo';
            return name;
        } catch (e) { return '' }
    }

    // Inicialmente ocultar wrapper y mostrar skeleton
    wrapper.style.display = 'none';
    skeleton.style.display = 'flex';

    fetch('https://jfl4bur.github.io/Todogram/public/carrucat.json').then(r => r.json()).then(data => {
        items = data || [];
        render();
        window.addEventListener('resize', debounce(() => calculateLayout(), 120));
    }).catch(err => {
        console.error('Error cargando carrucat.json', err);
        skeleton.style.display = 'none';
    });

    function render() {
        wrapper.innerHTML = '';
        items.forEach((it, idx) => {
            const a = document.createElement('a');
            a.className = 'custom-carousel-item genero-item';
            a.href = it.urlCat || '#';
            a.setAttribute('data-index', idx);

            const poster = document.createElement('div');
            poster.className = 'poster-container';
            const img = document.createElement('img');
            img.className = 'genero-card-image';
            img.src = it.PortadaCat || '';
            img.alt = deriveTitleFromPortada(it.PortadaCat) || '';
            poster.appendChild(img);

            const labels = document.createElement('div');
            labels.className = 'carousel-labels';
            const title = document.createElement('div');
            title.className = 'genero-title';
            title.textContent = deriveTitleFromPortada(it.PortadaCat) || '';
            labels.appendChild(title);

            a.appendChild(poster);
            a.appendChild(labels);
            wrapper.appendChild(a);
        });

        // ocultar skeleton y mostrar wrapper
        skeleton.style.display = 'none';
        wrapper.style.display = 'flex';

        calculateLayout();
        attachNav();
        attachHoverHandlers();
    }

    function calculateLayout() {
        const containerWidth = wrapper.clientWidth;
        const firstItem = wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        const itemRect = firstItem.getBoundingClientRect();
        const step = Math.round(itemRect.width);
        const gap = GAP;
        const itemsThatFit = Math.max(1, Math.floor(containerWidth / (step + gap)));
        itemsPerPage = itemsThatFit;
        totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

        // construir dots
        paginationRoot.innerHTML = '';
        for (let i = 0; i < totalPages; i++) {
            const d = document.createElement('div');
            d.className = 'dot' + (i === currentPage ? ' active' : '');
            d.dataset.page = i;
            d.addEventListener('click', () => goToPage(i));
            paginationRoot.appendChild(d);
        }
        updateDots();
    }

    function updateDots() {
        const dots = paginationRoot.querySelectorAll('.dot');
        dots.forEach(d => d.classList.remove('active'));
        const activeDot = paginationRoot.querySelector(`.dot[data-page="${currentPage}"]`);
        if (activeDot) activeDot.classList.add('active');
    }

    function attachNav() {
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', (e) => { e.preventDefault(); scrollToPrevPage(); });
            nextBtn.addEventListener('click', (e) => { e.preventDefault(); scrollToNextPage(); });
        }
        wrapper.addEventListener('scroll', debounce(() => { syncPageWithScroll(); }, 80));
    }

    function goToPage(p) {
        currentPage = Math.max(0, Math.min(totalPages - 1, p));
        const exampleItem = wrapper.querySelector('.custom-carousel-item');
        if (!exampleItem) return;
        const itemRect = exampleItem.getBoundingClientRect();
        const gap = GAP;
        const step = Math.round(itemRect.width + gap);
        const targetIndex = currentPage * itemsPerPage;
        const finalScroll = targetIndex * step;
        wrapper.scrollTo({ left: finalScroll, behavior: 'smooth' });
        updateDots();
    }

    function scrollToPrevPage() { scrollToPage('prev'); }
    function scrollToNextPage() { scrollToPage('next'); }

    function scrollToPage(direction) {
        const containerWidth = wrapper.clientWidth;
        const firstItem = wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        const itemRect = firstItem.getBoundingClientRect();
        const itemWidthLocal = Math.round(itemRect.width);
        let gap = GAP;
        const secondItem = firstItem.nextElementSibling;
        if (secondItem) {
            const secondRect = secondItem.getBoundingClientRect();
            gap = Math.round(secondRect.left - (itemRect.left + itemRect.width));
            if (isNaN(gap) || gap < 0) gap = GAP;
        }
        const stepSize = itemWidthLocal + gap;
        const itemsPerViewport = Math.max(1, Math.floor(containerWidth / stepSize));
        const currentIndex = Math.floor(wrapper.scrollLeft / stepSize);
        let targetIndex;
        if (direction === 'prev') targetIndex = Math.max(0, currentIndex - itemsPerViewport);
        else targetIndex = currentIndex + itemsPerViewport;
        const totalItems = wrapper.querySelectorAll('.custom-carousel-item').length;
        const maxFirstIndex = Math.max(0, totalItems - itemsPerViewport);
        targetIndex = Math.max(0, Math.min(targetIndex, maxFirstIndex));
        const finalScroll = targetIndex * stepSize;
        wrapper.scrollTo({ left: finalScroll, behavior: 'smooth' });
    }

    function attachHoverHandlers() {
        const itemsEls = wrapper.querySelectorAll('.custom-carousel-item');
        itemsEls.forEach(el => {
            el.addEventListener('mouseenter', () => {
                const container = wrapper.parentElement;
                if (container) container.classList.add('hover-no-clip');
                el.classList.add('hover-zoom');
            });
            el.addEventListener('mouseleave', () => {
                const container = wrapper.parentElement;
                if (container) container.classList.remove('hover-no-clip');
                el.classList.remove('hover-zoom');
            });
        });
    }

    function syncPageWithScroll() {
        const firstItem = wrapper.querySelector('.custom-carousel-item');
        if (!firstItem) return;
        const itemRect = firstItem.getBoundingClientRect();
        const gap = GAP;
        const step = Math.round(itemRect.width + gap);
        const currentIndex = Math.round(wrapper.scrollLeft / step);
        currentPage = Math.floor(currentIndex / Math.max(1, itemsPerPage));
        updateDots();
    }

    function onResize() { calculateLayout(); }

    function debounce(fn, wait) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }
});

