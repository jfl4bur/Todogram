// main.js
document.addEventListener('DOMContentLoaded', function () {
    initializeComponents();

    function initializeComponents() {
        console.log('Inicializando componentes');
        const urlParams = new URLSearchParams(window.location.hash.slice(1)); // Extraer parámetros del hash
        console.log('Procesando URL:', window.location.hash);
        const id = urlParams.get('id');
        const title = urlParams.get('title');

        if (id && title) {
            console.log('Hash procesado:', `id=${id}&title=${title}`);
            const params = { id, normalizedTitle: title.replace(/-/g, ' ') };
            console.log('Parámetros de URL encontrados:', params);

            // Simulación de datos (reemplaza con tu data.json o fuente real)
            const movies = [
                { id: '4', title: 'Los salvajes', description: 'En el siglo XIII, Batu Khan pasó dos meses intentando tomar la ciudad de Kozelsk...', posterUrl: '', backgroundUrl: '' },
                { id: '3', title: 'Lee Miller', description: 'La historia de la fotógrafa Elizabeth \'Lee\' Miller...', posterUrl: '', backgroundUrl: '' },
                // Agrega más películas según necesites
            ];

            const movie = movies.find(m => m.id === id);
            if (movie) {
                console.log('Película encontrada:', movie);

                // Integrar API de TMDB para obtener la imagen
                const TMDB_API_KEY = 'f28077ae6a89b54c86be927ea88d64d9'; // Reemplaza con tu clave API
                fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movie.title)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.results && data.results.length > 0) {
                            const tmdbPosterPath = data.results[0].poster_path;
                            movie.posterUrl = tmdbPosterPath ? `https://image.tmdb.org/t/p/w500${tmdbPosterPath}` : 'https://via.placeholder.com/194x271';
                            console.log('Imagen de TMDB asignada:', movie.posterUrl);
                        } else {
                            movie.posterUrl = 'https://via.placeholder.com/194x271'; // Fallback si no se encuentra
                            console.log('No se encontró imagen en TMDB, usando fallback:', movie.posterUrl);
                        }

                        const itemElement = document.querySelector(`[data-item-id="${id}"]`);
                        if (itemElement) {
                            console.log('Elemento DOM encontrado:', itemElement);
                            const shareUrl = `https://jfl4bur.github.io/Todogram/public/template/movie-template.html?title=${encodeURIComponent(movie.title)}&description=${encodeURIComponent(movie.description)}&image=${encodeURIComponent(movie.posterUrl)}&originalUrl=https://todogram.softr.app/&hash=#id=${id}&title=${title}`;
                            const modalData = { ...movie, shareUrl };
                            console.log('Datos pasados al modal:', modalData);

                            // Iniciar el modal con los datos actualizados
                            const shareModal = new ShareModal();
                            shareModal.show(modalData);
                        } else {
                            console.error('Elemento DOM no encontrado para id:', id);
                        }
                    })
                    .catch(error => {
                        console.error('Error al consultar TMDB:', error);
                        movie.posterUrl = 'https://via.placeholder.com/194x271'; // Fallback en caso de error
                        const itemElement = document.querySelector(`[data-item-id="${id}"]`);
                        if (itemElement) {
                            const shareUrl = `https://jfl4bur.github.io/Todogram/public/template/movie-template.html?title=${encodeURIComponent(movie.title)}&description=${encodeURIComponent(movie.description)}&image=${encodeURIComponent(movie.posterUrl)}&originalUrl=https://todogram.softr.app/&hash=#id=${id}&title=${title}`;
                            const modalData = { ...movie, shareUrl };
                            const shareModal = new ShareModal();
                            shareModal.show(modalData);
                        }
                    });
            } else {
                console.error('Película no encontrada para id:', id);
            }
        } else {
            console.log('No se encontraron parámetros de URL válidos');
        }
    }
});