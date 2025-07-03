class Carousel {
    constructor(containerId, items, category) {
        this.container = document.getElementById(containerId);
        this.items = items;
        this.category = category;
        this.init();
    }

    init() {
        this.container.innerHTML = this.generateHTML();
        this.addEventListeners();
    }

    generateHTML() {
        return `
            <h2 class="categoria-titulo">${this.category}</h2>
            <div class="carrusel">
                <button class="flecha izquierda">❮</button>
                <div class="contenedor-items">
                    ${this.items.map(item => `
                        <div class="item" data-id="${item.id}">
                            <img src="${item.portada}" alt="${item.titulo}">
                            <div class="calidad">${item.calidad}</div>
                        </div>
                    `).join('')}
                </div>
                <button class="flecha derecha">❯</button>
            </div>
        `;
    }

    addEventListeners() {
        const contenedor = this.container.querySelector('.contenedor-items');
        const izquierda = this.container.querySelector('.izquierda');
        const derecha = this.container.querySelector('.derecha');

        izquierda.addEventListener('click', () => {
            contenedor.scrollBy({
                left: -500,
                behavior: 'smooth'
            });
        });

        derecha.addEventListener('click', () => {
            contenedor.scrollBy({
                left: 500,
                behavior: 'smooth'
            });
        });

        // Touch events para móviles
        let startX;
        let scrollLeft;

        contenedor.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX - contenedor.offsetLeft;
            scrollLeft = contenedor.scrollLeft;
        });

        contenedor.addEventListener('touchmove', (e) => {
            const x = e.touches[0].pageX - contenedor.offsetLeft;
            const walk = (x - startX) * 2;
            contenedor.scrollLeft = scrollLeft - walk;
        });
    }
}