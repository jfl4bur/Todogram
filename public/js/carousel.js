class Carousel {
    constructor(containerId, items, category) {
        this.container = document.getElementById(containerId);
        this.items = items || [];
        this.category = category;
        this.init();
    }

    init() {
        if (!this.container) {
            console.error(`Contenedor ${this.containerId} no encontrado`);
            return;
        }
        
        this.container.innerHTML = this.generateHTML();
        this.addEventListeners();
    }

    generateHTML() {
        if (!this.items || this.items.length === 0) {
            return `<div class="error-carrusel">No hay datos disponibles</div>`;
        }
        
        return `
            <h2 class="categoria-titulo">${this.category}</h2>
            <div class="carrusel">
                <button class="flecha izquierda">❮</button>
                <div class="contenedor-items">
                    ${this.items.map(item => `
                        <div class="item" data-id="${item.id}">
                            <img src="${item.portada}" alt="${item.titulo}" onerror="this.src='https://via.placeholder.com/300x450?text=Imagen+no+disponible'">
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

        if (!contenedor || !izquierda || !derecha) return;

        izquierda.addEventListener('click', () => {
            contenedor.scrollBy({ left: -500, behavior: 'smooth' });
        });

        derecha.addEventListener('click', () => {
            contenedor.scrollBy({ left: 500, behavior: 'smooth' });
        });

        let startX;
        let scrollLeft;
        
        contenedor.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX - contenedor.offsetLeft;
            scrollLeft = contenedor.scrollLeft;
        });

        contenedor.addEventListener('touchmove', (e) => {
            if (!startX) return;
            const x = e.touches[0].pageX - contenedor.offsetLeft;
            const walk = (x - startX) * 2;
            contenedor.scrollLeft = scrollLeft - walk;
        });
    }
}