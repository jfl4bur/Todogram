// Variables
const videoModalOverlay = document.getElementById('video-modal-overlay');
const videoModalClose = document.getElementById('video-modal-close');
const videoIframe = document.getElementById('video-iframe');

function getYouTubeEmbedUrl(url) {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : '';
}

function getUpnEmbedUrl(url) {
    if (!url) return '';
    return url;
}

export function showVideoModal(videoUrl) {
    if (!videoUrl) return;
    
    let embedUrl = '';
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        embedUrl = getYouTubeEmbedUrl(videoUrl);
    } else if (videoUrl.includes('upn.one')) {
        embedUrl = getUpnEmbedUrl(videoUrl);
    }
    
    if (!embedUrl) return;
    
    videoIframe.src = embedUrl;
    videoModalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
    videoIframe.src = '';
    videoModalOverlay.style.display = 'none';
    document.body.style.overflow = 'auto';
}

videoModalOverlay.addEventListener('click', (e) => {
    if (e.target === videoModalOverlay) {
        closeVideoModal();
    }
});

videoModalClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeVideoModal();
});