document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.getElementById('generos-carousel-wrapper');
    const prevBtn = document.getElementById('generos-carousel-prev');
    const nextBtn = document.getElementById('generos-carousel-next');
    const paginationRoot = document.getElementById('generos-pagination');
    const GAP = 18; // debe coincidir con CSS gap

    if (!wrapper) return;

    let items = [];
    let track, currentPage = 0, itemsPerPage = 1, itemWidth = 120, totalPages = 1;

    function deriveTitleFromPortada(url) {
        try {
            const parts = url.split('/');
            let name = parts[parts.length - 1] || '';
            name = decodeURIComponent(name);
            name = name.replace(/\.[^.]+$/, ''); // quitar extension
            name = name.replace(/[-_+]/g, ' ');
            // Capitalizar primeras letras
            name = name.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            // map simple
            if (/^todo$/i.test(name)) return 'Todo el catálogo';
            return name;
        } catch (e) { return ''; }
    }

    fetch('https://jfl4bur.github.io/Todogram/public/carrucat.json').then(r => r.json()).then(data => {
        items = data || [];
        render();
        window.addEventListener('resize', debounce(onResize, 120));
    }).catch(err => {
        console.error('Error cargando carrucat.json', err);
    });

    function render() {
        // limpiar
        wrapper.innerHTML = '';
        track = document.createElement('div');
        track.className = 'genero-track';
        wrapper.appendChild(track);

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
            track.appendChild(a);
        });

        // build pagination dots
        paginationRoot.innerHTML = '';

        calculateLayout();
        attachNav();
    }

    function calculateLayout() {
        const containerWidth = wrapper.clientWidth || wrapper.getBoundingClientRect().width;

        // calcular items por pantalla en base a tamaño mínimo aproximado
        const minBase = 140; // tamaño base recomendado
        itemsPerPage = Math.max(1, Math.floor(containerWidth / minBase));

        // ajustar para móviles: si sólo cabe 1 y container es muy estrecho, reducir imagen
        itemWidth = Math.floor((containerWidth - 2 * Math.round(containerWidth * 0.06)) / itemsPerPage) - GAP;
        if (itemWidth < 70) itemWidth = 70;

        // asignar ancho a cada item
        const itemElements = track.querySelectorAll('.genero-item');
        itemElements.forEach((el) => {
            el.style.width = itemWidth + 'px';
            el.style.flex = `0 0 ${itemWidth}px`;
        });

        // calcular páginas
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

        // reset page if overflow
        if (currentPage >= totalPages) currentPage = totalPages - 1;

        applyTransform();
    }

    function applyTransform() {
        const gapTotal = GAP * (itemsPerPage - 1);
        const pageStep = itemsPerPage * (itemWidth + GAP);

        // side peek para todas las páginas excepto la primera
        const sidePeek = Math.round(itemWidth * 0.35);

        let offset = currentPage * pageStep;
        // if first page, no left peek
        if (currentPage > 0) offset = offset - sidePeek;
        // cap max offset so last page shows items to the right
        const maxOffset = Math.max(0, (items.length * (itemWidth + GAP)) - wrapper.clientWidth + GAP);
        if (offset > maxOffset) offset = maxOffset;

        track.style.transform = `translateX(${-offset}px)`;

        // update dots
        const dots = paginationRoot.querySelectorAll('.dot');
        dots.forEach(d => d.classList.remove('active'));
        const activeDot = paginationRoot.querySelector(`.dot[data-page="${currentPage}"]`);
        if (activeDot) activeDot.classList.add('active');
    }

    function attachNav() {
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                currentPage = Math.max(0, currentPage - 1);
                applyTransform();
            });
            nextBtn.addEventListener('click', () => {
                currentPage = Math.min(totalPages - 1, currentPage + 1);
                applyTransform();
            });
        }
    }

    function goToPage(p) {
        currentPage = Math.max(0, Math.min(totalPages - 1, p));
        applyTransform();
    }

    function onResize() {
        calculateLayout();
    }

    function debounce(fn, wait) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }
});
