class HoverModal {
    constructor() {
        this.modal = document.getElementById('mini-modal');
        if (!this.modal) {
            console.error("Elemento #mini-modal no encontrado");
            return;
        }
        this.init();
    }

    init() {
        document.addEventListener('mouseover', this.handleMouseOver.bind(this));
        document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    }

    handleMouseOver(e) {
        const item = e.target.closest('.item');
        if (item) {
            const itemId = item.dataset.id;
            const pelicula = window.peliculas.find(p => p.id == itemId);
            if (pelicula) this.show(pelicula, item);
        }
    }

    handleMouseOut(e) {
        if (!e.relatedTarget || 
            (!e.relatedTarget.closest('.mini-modal') && 
             !e.relatedTarget.closest('.item'))) {
            this.hide();
        }
    }

    show(pelicula, item) {
        const rect = item.getBoundingClientRect();
        this.modal.style.display = 'block';
        this.modal.style.top = `${rect.top - 200}px`;
        this.modal.style.left = `${rect.left}px`;
        
        this.modal.innerHTML = `
            <div class="mini-modal-contenido">
                <h3>${pelicula.titulo}</h3>
                <div class="info">
                    <span>${pelicula.año}</span>
                    <span>${pelicula.duracion}</span>
                    <span>${pelicula.genero}</span>
                </div>
                <div class="rating">${'★'.repeat(Math.floor(pelicula.rating))}${pelicula.rating % 1 >= 0.5 ? '½' : ''}</div>
                <p>${pelicula.sinopsis.slice(0, 100)}...</p>
            </div>
        `;
    }

    hide() {
        this.modal.style.display = 'none';
    }
}