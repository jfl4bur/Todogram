class VideoModal {
    constructor() {
        this.modal = document.getElementById('video-modal');
        if (!this.modal) {
            console.error("Elemento #video-modal no encontrado");
            return;
        }
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
        if (!this.content) return;
        this.content.innerHTML = `
            <span class="cerrar">&times;</span>
            <div class="video-container">
                <iframe src="${url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
        this.modal.style.display = 'block';
        document.getElementById('modal-detalles').style.display = 'none';
        document.getElementById('share-modal').style.display = 'none';
    }

    close() {
        this.modal.style.display = 'none';
        if (this.content) {
            const iframe = this.content.querySelector('iframe');
            if (iframe) iframe.remove();
        }
    }
}