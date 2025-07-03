class DetailsModal {
    constructor() {
        this.modal = document.getElementById('modal-detalles');
        this.content = this.modal.querySelector('.modal-content');
        this.init();
    }

    init() {
        this.modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('cerrar')) {
                this.close();
            }
        });
    }

    open(pelicula) {
        this.content.innerHTML = this.generateContent(pelicula);
        this.modal.style.display = 'block';
        
        // Añadir eventos a los botones
        this.content.querySelector('.btn-reproducir').addEventListener('click', () => {
            window.videoModal.play(pelicula.url);
        });
        
        this.content.querySelector('.btn-compartir').addEventListener('click', () => {
            window.shareModal.open(pelicula);
        });
    }

    close() {
        this.modal.style.display = 'none';
    }

    generateContent(pelicula) {
        return `
            <span class="cerrar">&times;</span>
            <div class="detalles-superior">
                <img src="${pelicula.portada}" alt="${pelicula.titulo}" class="portada-detalles">
                <div class="info-principal">
                    <h2>${pelicula.titulo} (${pelicula.año})</h2>
                    <div class="metadata">
                        <span>${pelicula.duracion}</span>
                        <span>${pelicula.genero}</span>
                        <span>Calificación: ${pelicula.rating}/5</span>
                    </div>
                    <div class="sinopsis">
                        <h3>Sinopsis</h3>
                        <p>${pelicula.sinopsis}</p>
                    </div>
                    <div class="botones">
                        <button class="btn-reproducir" data-url="${pelicula.url}">
                            <i class="fas fa-play"></i> Reproducir
                        </button>
                        <button class="btn-compartir">
                            <i class="fas fa-share-alt"></i> Compartir
                        </button>
                    </div>
                </div>
            </div>
            <div class="detalles-inferior">
                <div class="info-adicional">
                    <h3>Más información</h3>
                    <p><strong>Director:</strong> ${pelicula.director}</p>
                    <p><strong>Reparto:</strong> ${pelicula.actores.join(', ')}</p>
                    <p><strong>Detalles:</strong> ${pelicula.masInfo}</p>
                </div>
            </div>
        `;
    }
}