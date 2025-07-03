class ShareModal {
    constructor() {
        this.modal = document.getElementById('share-modal');
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
        
        // Añadir eventos a los botones de compartir
        this.content.querySelector('.btn-copiar').addEventListener('click', this.copiarEnlace.bind(this));
        this.content.querySelectorAll('.btn-compartir').forEach(btn => {
            btn.addEventListener('click', () => {
                this.compartirEnRed(btn.dataset.red, pelicula);
            });
        });
    }

    close() {
        this.modal.style.display = 'none';
    }

    generateContent(pelicula) {
        return `
            <span class="cerrar">&times;</span>
            <h2>Compartir "${pelicula.titulo}"</h2>
            <div class="redes-sociales">
                <button class="btn-compartir" data-red="facebook">
                    <i class="fab fa-facebook"></i> Facebook
                </button>
                <button class="btn-compartir" data-red="twitter">
                    <i class="fab fa-twitter"></i> Twitter
                </button>
                <button class="btn-compartir" data-red="whatsapp">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button class="btn-compartir" data-red="telegram">
                    <i class="fab fa-telegram"></i> Telegram
                </button>
            </div>
            <div class="enlace-compartir">
                <input type="text" id="enlace-pelicula" value="https://tudominio.com/pelicula/${pelicula.id}" readonly>
                <button class="btn-copiar">
                    <i class="fas fa-copy"></i> Copiar
                </button>
            </div>
        `;
    }

    copiarEnlace() {
        const input = document.getElementById('enlace-pelicula');
        input.select();
        document.execCommand('copy');
        
        // Mostrar feedback
        const btn = this.content.querySelector('.btn-copiar');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }

    compartirEnRed(red, pelicula) {
        const enlace = encodeURIComponent(`https://tudominio.com/pelicula/${pelicula.id}`);
        const titulo = encodeURIComponent(`Mira "${pelicula.titulo}" en Todogram`);
        
        let url;
        switch(red) {
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${enlace}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?url=${enlace}&text=${titulo}`;
                break;
            case 'whatsapp':
                url = `https://api.whatsapp.com/send?text=${titulo}%20${enlace}`;
                break;
            case 'telegram':
                url = `https://t.me/share/url?url=${enlace}&text=${titulo}`;
                break;
            default:
                return;
        }
        
        window.open(url, '_blank', 'width=600,height=400');
    }
}