<html>
<script type="module" src="js/carousel.js"></script>
<script type="module" src="js/hover-modal.js"></script>
<script type="module" src="js/details-modal.js"></script>
<script type="module" src="js/video-modal.js"></script>
<script type="module" src="js/video-modal.js"></script>
</html>

document.addEventListener("DOMContentLoaded", function () {
    // Variables globales
    const iosHelper = document.getElementById('ios-helper');
    const galleryImageModal = document.getElementById('gallery-image-modal');
    const galleryImageModalImg = document.getElementById('gallery-image-modal-img');
    const galleryImageModalClose = document.getElementById('gallery-image-modal-close');
    const galleryImageModalPrev = document.getElementById('gallery-image-modal-prev');
    const galleryImageModalNext = document.getElementById('gallery-image-modal-next');
    
    // Elementos de metatags dinámicos
    const ogTitle = document.getElementById('og-title');
    const ogDescription = document.getElementById('og-description');
    const ogImage = document.getElementById('og-image');
    const ogUrl = document.getElementById('og-url');
    const twitterTitle = document.getElementById('twitter-title');
    const twitterDescription = document.getElementById('twitter-description');
    const twitterImage = document.getElementById('twitter-image');
    
    let activeItem = null;
    let hoverTimeouts = {};
    let isModalOpen = false;
    let isDetailsModalOpen = false;
    let hoverModalItem = null;
    let hoverModalOrigin = { x: 0, y: 0 };
    let currentGalleryImages = [];
    let currentGalleryIndex = 0;

    // Detectar iOS
    const isIOS = () => {
        return /iPad|iPhone|iPod/.test(navigator.platform) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    };

    // Función para normalizar texto
    function normalizeText(text) {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    // Función para extraer el ID de la URL
    function getItemIdFromUrl() {
        const path = window.location.hash.substring(1);
        if (!path) return null;
        
        const params = new URLSearchParams(path);
        const id = params.get('id');
        const title = params.get('title');
        
        if (!id || !title) return null;
        
        return {
            id: id,
            normalizedTitle: title
        };
    }

    // Función para abrir el modal desde la URL
    async function openModalFromUrl() {
        const urlParams = getItemIdFromUrl();
        if (!urlParams) return;

        // Esperar a que los datos estén listos (solución para iOS)
        const waitForReady = () => {
            return new Promise((resolve) => {
                const check = () => {
                    if (moviesData.length > 0 && document.querySelector('.custom-carousel-item')) {
                        resolve(true);
                    } else {
                        setTimeout(check, 100);
                    }
                };
                check();
            });
        };
        
        await waitForReady();
        
        const foundItem = moviesData.find(item => {
            const itemId = item.id ? item.id.toString() : null;
            const normalizedTitle = normalizeText(item.title);
            return itemId === urlParams.id && normalizedTitle === urlParams.normalizedTitle;
        });

        if (!foundItem) return;
        
        const itemElements = document.querySelectorAll('.custom-carousel-item');
        const itemElement = Array.from(itemElements).find(el => {
            const itemId = el.dataset.itemId;
            return moviesData[itemId] && moviesData[itemId].id.toString() === urlParams.id;
        });

        if (!itemElement) return;
        
        // Scroll especial para iOS
        itemElement.scrollIntoView({ behavior: isIOS() ? 'auto' : 'smooth', block: 'center' });
        
        if (isIOS()) {
            iosHelper.offsetHeight; // Forzar reflow
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        showDetailsModal(foundItem, itemElement);
        
        // Forzar redibujado en iOS
        if (isIOS()) {
            setTimeout(() => {
                iosHelper.offsetHeight;
                detailsModalContent.style.animation = 'iosModalIn 0.4s ease-out forwards';
            }, 50);
        }
    }

    // Función para mostrar galería de imágenes
    function showGalleryImageModal(images, startIndex = 0) {
        if (!images || images.length === 0) return;
        
        currentGalleryImages = images;
        currentGalleryIndex = startIndex;
        
        galleryImageModalImg.src = images[startIndex].file_path;
        galleryImageModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeGalleryImageModal() {
        galleryImageModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        currentGalleryImages = [];
        currentGalleryIndex = 0;
    }

    function navigateGallery(direction) {
        if (direction === 'prev') {
            currentGalleryIndex = (currentGalleryIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
        } else {
            currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImages.length;
        }
        
        galleryImageModalImg.src = currentGalleryImages[currentGalleryIndex].file_path;
    }

    // Inicializar componentes
    initCarousel();
    openModalFromUrl();

    // Event listeners comunes
    document.addEventListener('click', function(e) {
        // Botón de compartir en el modal de detalles
        if (e.target.closest('#share-button')) {
            showShareModal(activeItem);
        }
    });

    galleryImageModalClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeGalleryImageModal();
    });

    galleryImageModalPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateGallery('prev');
    });

    galleryImageModalNext.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateGallery('next');
    });

    // Manejar el evento popstate
    window.addEventListener('popstate', function() {
        if (isDetailsModalOpen) {
            closeDetailsModal();
        }
    });

    // Manejo específico para iOS
    if (isIOS()) {
        // Verificar hash al cargar la página
        window.addEventListener('load', function() {
            setTimeout(openModalFromUrl, 1000); // Mayor tiempo de espera para iOS
        });
        
        // Manejar cambios en el hash
        let lastHash = window.location.hash;
        window.addEventListener('hashchange', function() {
            const newHash = window.location.hash;
            if (newHash !== lastHash) {
                lastHash = newHash;
                setTimeout(openModalFromUrl, 300);
            }
        });
    }
});