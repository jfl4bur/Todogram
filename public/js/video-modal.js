class VideoModal {
    constructor() {
        this.modal = document.getElementById('video-modal');
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

    play(url) {
        this.content.innerHTML = `
            <span class="cerrar">&times;</span>
            <div class="video-container">
                <iframe src="${url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
        this.modal.style.display = 'block';
        
        // Cerrar otros modales
        document.getElementById('modal-detalles').style.display = 'none';
        document.getElementById('share-modal').style.display = 'none';
    }

    close() {
        this.modal.style.display = 'none';
        // Limpiar el iframe al cerrar
        this.content.querySelector('iframe').remove();
    }
}