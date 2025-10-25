document.addEventListener('DOMContentLoaded', function () {
    const wrapper = document.getElementById('genero-carousel-wrapper');
    const skeleton = document.getElementById('genero-carousel-skeleton');
    const prevBtn = document.getElementById('genero-carousel-prev');
    const nextBtn = document.getElementById('genero-carousel-next');

    if (!wrapper) return;

    const dataPath = 'public/carrucat.json';

    function extractName(entry) {
        const url = entry.urlCat || '';
        // try genre param
        const genreMatch = url.match(/[?&]genre=([^&]+)/i);
        if (genreMatch && genreMatch[1]) {
            try { return decodeURIComponent(genreMatch[1]).replace(/\+/g, ' '); } catch(e) { return genreMatch[1].replace(/\+/g,' '); }
        }
        const tabMatch = url.match(/[?&]tab=([^&]+)/i);
        if (tabMatch && tabMatch[1]) {
            try { return decodeURIComponent(tabMatch[1]).replace(/\+/g,' '); } catch(e) { return tabMatch[1].replace(/\+/g,' '); }
        }
        // fallback to image filename
        if (entry.PortadaCat) {
            const parts = entry.PortadaCat.split('/');
            let name = parts[parts.length - 1] || entry.PortadaCat;
            name = name.replace(/\.[a-zA-Z0-9]+$/, '');
            name = name.replace(/[-_]/g, ' ');
            name = decodeURIComponent(name);
            if (/^todo/i.test(name)) return 'Todo el catálogo';
            // capitalize
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
        return 'Categoría';
    }

    function createItem(entry) {
        const a = document.createElement('a');
        a.href = entry.urlCat || '#';
        a.className = 'genero-link';
        // ensure not opening in new tab

        const item = document.createElement('div');
        item.className = 'genero-item';

        const img = document.createElement('img');
        img.className = 'genero-image';
        img.loading = 'lazy';
        img.src = entry.PortadaCat || '';
        img.alt = extractName(entry);

        const label = document.createElement('div');
        label.className = 'genero-label';
        label.textContent = extractName(entry);

        a.appendChild(img);
        a.appendChild(label);
        item.appendChild(a);

        return item;
    }

    function setupNavigation(wrapper, items) {
        // compute item width from actual DOM (prefer image width)
        let itemWidth = 0;
        let gap = 12;

        function updateLayout() {
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            // sample dimension from existing elements
            const sampleImg = wrapper.querySelector('.genero-image') || document.querySelector('.genero-skeleton-image');
            if (sampleImg) {
                const rect = sampleImg.getBoundingClientRect();
                itemWidth = rect.width || rect.height || 120;
            } else if (items[0]) {
                itemWidth = items[0].getBoundingClientRect().width || 120;
            } else {
                itemWidth = 120;
            }

            // choose gap based on viewport (similar to slider independent)
            if (viewportWidth > 1400) gap = 24;
            else if (viewportWidth > 1024) gap = 20;
            else if (viewportWidth > 768) gap = 16;
            else if (viewportWidth > 480) gap = 12;
            else gap = 8;

            // side space to show partial adjacent items (center first visible item)
            let sideSpace = Math.floor((viewportWidth - itemWidth) / 2);
            if (sideSpace < 8) sideSpace = 8;

            // apply margin-left so first item appears with adjacent partial items
            wrapper.style.marginLeft = sideSpace + 'px';
            // add right padding so last item can show partially
            wrapper.style.paddingRight = sideSpace + 'px';

            // set CSS variable for nav button positioning
            document.documentElement.style.setProperty('--genero-side-space', sideSpace + 'px');
            document.documentElement.style.setProperty('--genero-item-width', itemWidth + 'px');

            // apply sizes and gaps to items explicitly for precise alignment
            items.forEach((it, idx) => {
                it.style.width = itemWidth + 'px';
                it.style.flexBasis = itemWidth + 'px';
                it.style.marginRight = idx < items.length - 1 ? gap + 'px' : '0px';
                const img = it.querySelector('.genero-image');
                if (img) {
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                }
            });

            // ensure wrapper scroll behaves smoothly and shows scrollbar only when needed
            wrapper.style.overflowX = 'auto';
            wrapper.style.scrollBehavior = 'smooth';
        }

        function computeStep() {
            // step includes gap
            const visible = Math.floor(wrapper.clientWidth / (itemWidth + gap)) || 1;
            const stepItems = Math.max(1, Math.floor(visible / 2));
            return stepItems * (itemWidth + gap);
        }

        // init layout
        updateLayout();

        prevBtn && prevBtn.addEventListener('click', () => {
            wrapper.scrollBy({ left: -computeStep(), behavior: 'smooth' });
        });

        nextBtn && nextBtn.addEventListener('click', () => {
            wrapper.scrollBy({ left: computeStep(), behavior: 'smooth' });
        });

        // adjust on resize with debounce
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                updateLayout();
            }, 120);
        });
    }

    fetch(dataPath).then(res => res.json()).then(data => {
        // data expected as array
        if (!Array.isArray(data)) return;
        // clear skeleton and show wrapper
        if (skeleton) skeleton.style.display = 'none';
        wrapper.style.display = 'flex';

        const fragment = document.createDocumentFragment();
        data.forEach(entry => {
            const item = createItem(entry);
            fragment.appendChild(item);
        });

        wrapper.appendChild(fragment);

        const items = Array.from(wrapper.querySelectorAll('.genero-item'));
        if (items.length) setupNavigation(wrapper, items);

    }).catch(err => {
        console.error('Error cargando carrusel de géneros:', err);
    });
});
