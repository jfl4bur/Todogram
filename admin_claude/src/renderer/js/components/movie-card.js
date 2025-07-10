// Componente MovieCard para renderizar tarjetas de películas
class MovieCard {
  constructor(movie) {
    this.movie = movie;
  }

  // Renderizar la tarjeta
  render() {
    const statusClass = this.movie.categoria ? 'completed' : 'pending';
    const categoryBadge = this.movie.categoria ? 
      `<span class="category-badge">${this.movie.categoria}</span>` : 
      `<span class="category-badge pending">Pendiente</span>`;
    
    const posterUrl = this.movie.poster || 'https://via.placeholder.com/300x450/2a2a2a/ffffff?text=Sin+Poster';
    const year = this.movie.año || 'N/A';
    const duration = this.movie.duracion ? `${this.movie.duracion} min` : '';
    const genre = this.movie.genero || '';
    const director = this.movie.director || '';
    const rating = this.movie.calificacion || 0;
    
    return `
      <div class="movie-card ${statusClass}" data-id="${this.movie.id}">
        <div class="movie-poster">
          <img src="${posterUrl}" alt="${this.movie.titulo}" loading="lazy">
          <div class="movie-overlay">
            <div class="movie-actions">
              <button class="action-btn edit-btn" onclick="window.appController.editMovie('${this.movie.id}')" title="Editar película">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="action-btn delete-btn" onclick="window.appController.deleteMovie('${this.movie.id}')" title="Eliminar película">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
            ${this.movie.categoria ? '' : `
              <div class="category-selector">
                <select onchange="window.appController.assignCategory('${this.movie.id}', this.value)">
                  <option value="">Asignar categoría</option>
                  <option value="Favoritas">Favoritas</option>
                  <option value="Clásicas">Clásicas</option>
                  <option value="Recientes">Recientes</option>
                  <option value="Por Ver">Por Ver</option>
                  <option value="Infantiles">Infantiles</option>
                  <option value="Documentales">Documentales</option>
                  <option value="Serie B">Serie B</option>
                </select>
              </div>
            `}
          </div>
        </div>
        
        <div class="movie-info">
          <div class="movie-header">
            <h3 class="movie-title" title="${this.movie.titulo}">${this.movie.titulo}</h3>
            ${categoryBadge}
          </div>
          
          <div class="movie-details">
            <div class="movie-year-duration">
              <span class="movie-year">${year}</span>
              ${duration ? `<span class="movie-duration">${duration}</span>` : ''}
            </div>
            
            ${genre ? `<div class="movie-genre">${genre}</div>` : ''}
            ${director ? `<div class="movie-director">Dir: ${director}</div>` : ''}
            
            ${rating > 0 ? `
              <div class="movie-rating">
                <div class="stars">
                  ${this.renderStars(rating)}
                </div>
                <span class="rating-value">${rating}/10</span>
              </div>
            ` : ''}
          </div>
          
          ${this.movie.descripcion ? `
            <div class="movie-description">
              <p>${this.truncateText(this.movie.descripcion, 100)}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Renderizar estrellas para la calificación
  renderStars(rating) {
    const fullStars = Math.floor(rating / 2);
    const halfStar = rating % 2 >= 1;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHTML = '';
    
    // Estrellas llenas
    for (let i = 0; i < fullStars; i++) {
      starsHTML += `
        <svg class="star filled" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      `;
    }
    
    // Media estrella
    if (halfStar) {
      starsHTML += `
        <svg class="star half" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <defs>
            <linearGradient id="half-fill-${this.movie.id}">
              <stop offset="50%" stop-color="currentColor"/>
              <stop offset="50%" stop-color="transparent"/>
            </linearGradient>
          </defs>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                fill="url(#half-fill-${this.movie.id})"/>
        </svg>
      `;
    }
    
    // Estrellas vacías
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += `
        <svg class="star empty" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      `;
    }
    
    return starsHTML;
  }

  // Truncar texto para descripción
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Renderizar como elemento DOM
  createElement() {
    const div = document.createElement('div');
    div.innerHTML = this.render();
    return div.firstChild;
  }

  // Obtener datos de la película
  getMovieData() {
    return {
      id: this.movie.id,
      titulo: this.movie.titulo,
      año: this.movie.año,
      duracion: this.movie.duracion,
      genero: this.movie.genero,
      categoria: this.movie.categoria,
      director: this.movie.director,
      actores: this.movie.actores,
      descripcion: this.movie.descripcion,
      calificacion: this.movie.calificacion,
      poster: this.movie.poster,
      fecha_agregada: this.movie.fecha_agregada
    };
  }

  // Actualizar datos de la película
  updateMovie(newData) {
    this.movie = { ...this.movie, ...newData };
  }

  // Agregar animación de hover
  addHoverAnimation() {
    const element = document.querySelector(`[data-id="${this.movie.id}"]`);
    if (element) {
      element.addEventListener('mouseenter', () => {
        element.style.transform = 'translateY(-5px)';
      });
      
      element.addEventListener('mouseleave', () => {
        element.style.transform = 'translateY(0)';
      });
    }
  }

  // Marcar como favorita
  toggleFavorite() {
    const isFavorite = this.movie.categoria === 'Favoritas';
    const newCategory = isFavorite ? '' : 'Favoritas';
    
    return window.appController.assignCategory(this.movie.id, newCategory);
  }

  // Obtener color de la categoría
  getCategoryColor() {
    const categoryColors = {
      'Favoritas': '#ff6b6b',
      'Clásicas': '#4ecdc4',
      'Recientes': '#45b7d1',
      'Por Ver': '#96ceb4',
      'Infantiles': '#ffeaa7',
      'Documentales': '#dda0dd',
      'Serie B': '#98d8c8'
    };
    
    return categoryColors[this.movie.categoria] || '#6c757d';
  }
}

// Exportar la clase para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MovieCard;
}