// Componente MovieForm para crear/editar películas
class MovieForm {
  constructor(movie = null) {
    this.movie = movie; // Si hay movie, es edición; si no, es creación
    this.isEditing = !!movie;
    this.init();
  }

  // Inicializar el formulario
  init() {
    this.showForm();
    this.setupEventListeners();
    this.setupImagePreview();
    
    // Crear referencia global para los event handlers
    window.movieForm = this;
    
    // Auto-focus en el primer input
    setTimeout(() => {
      document.getElementById('titulo').focus();
    }, 100);
  }

  // Mostrar el formulario
  showForm() {
    const formHTML = `
      <div class="form-overlay" id="form-overlay">
        <div class="form-container">
          <div class="form-header">
            <h2>${this.isEditing ? 'Editar Película' : 'Agregar Nueva Película'}</h2>
            <button class="close-btn" onclick="window.movieForm.closeForm()">×</button>
          </div>
          
          <form id="movie-form" class="movie-form">
            <div class="form-group">
              <label for="titulo">Título *</label>
              <input type="text" id="titulo" name="titulo" required 
                     value="${this.movie?.titulo || ''}" 
                     placeholder="Ingresa el título de la película">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="año">Año *</label>
                <input type="number" id="año" name="año" required 
                       value="${this.movie?.año || ''}" 
                       placeholder="2024" min="1900" max="2030">
              </div>
              
              <div class="form-group">
                <label for="duracion">Duración (min)</label>
                <input type="number" id="duracion" name="duracion" 
                       value="${this.movie?.duracion || ''}" 
                       placeholder="120" min="1" max="500">
              </div>
            </div>

            <div class="form-group">
              <label for="genero">Género</label>
              <select id="genero" name="genero">
                <option value="">Selecciona un género</option>
                <option value="Acción" ${this.movie?.genero === 'Acción' ? 'selected' : ''}>Acción</option>
                <option value="Aventura" ${this.movie?.genero === 'Aventura' ? 'selected' : ''}>Aventura</option>
                <option value="Comedia" ${this.movie?.genero === 'Comedia' ? 'selected' : ''}>Comedia</option>
                <option value="Drama" ${this.movie?.genero === 'Drama' ? 'selected' : ''}>Drama</option>
                <option value="Terror" ${this.movie?.genero === 'Terror' ? 'selected' : ''}>Terror</option>
                <option value="Thriller" ${this.movie?.genero === 'Thriller' ? 'selected' : ''}>Thriller</option>
                <option value="Romance" ${this.movie?.genero === 'Romance' ? 'selected' : ''}>Romance</option>
                <option value="Ciencia Ficción" ${this.movie?.genero === 'Ciencia Ficción' ? 'selected' : ''}>Ciencia Ficción</option>
                <option value="Fantasía" ${this.movie?.genero === 'Fantasía' ? 'selected' : ''}>Fantasía</option>
                <option value="Animación" ${this.movie?.genero === 'Animación' ? 'selected' : ''}>Animación</option>
                <option value="Documental" ${this.movie?.genero === 'Documental' ? 'selected' : ''}>Documental</option>
                <option value="Musical" ${this.movie?.genero === 'Musical' ? 'selected' : ''}>Musical</option>
              </select>
            </div>

            <div class="form-group">
              <label for="categoria">Categoría</label>
              <select id="categoria" name="categoria">
                <option value="">Sin categoría (Pendiente)</option>
                <option value="Favoritas" ${this.movie?.categoria === 'Favoritas' ? 'selected' : ''}>Favoritas</option>
                <option value="Clásicas" ${this.movie?.categoria === 'Clásicas' ? 'selected' : ''}>Clásicas</option>
                <option value="Recientes" ${this.movie?.categoria === 'Recientes' ? 'selected' : ''}>Recientes</option>
                <option value="Por Ver" ${this.movie?.categoria === 'Por Ver' ? 'selected' : ''}>Por Ver</option>
                <option value="Infantiles" ${this.movie?.categoria === 'Infantiles' ? 'selected' : ''}>Infantiles</option>
                <option value="Documentales" ${this.movie?.categoria === 'Documentales' ? 'selected' : ''}>Documentales</option>
                <option value="Serie B" ${this.movie?.categoria === 'Serie B' ? 'selected' : ''}>Serie B</option>
              </select>
            </div>

            <div class="form-group">
              <label for="director">Director</label>
              <input type="text" id="director" name="director" 
                     value="${this.movie?.director || ''}" 
                     placeholder="Nombre del director">
            </div>

            <div class="form-group">
              <label for="actores">Actores principales</label>
              <input type="text" id="actores" name="actores" 
                     value="${this.movie?.actores || ''}" 
                     placeholder="Ej: Actor 1, Actor 2, Actor 3">
            </div>

            <div class="form-group">
              <label for="descripcion">Descripción</label>
              <textarea id="descripcion" name="descripcion" rows="4" 
                        placeholder="Breve descripción de la película...">${this.movie?.descripcion || ''}</textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="calificacion">Calificación (1-10)</label>
                <input type="number" id="calificacion" name="calificacion" 
                       value="${this.movie?.calificacion || ''}" 
                       placeholder="8.5" min="1" max="10" step="0.1">
              </div>
              
              <div class="form-group">
                <label for="plataforma">Plataforma</label>
                <select id="plataforma" name="plataforma">
                  <option value="">Selecciona plataforma</option>
                  <option value="Netflix" ${this.movie?.plataforma === 'Netflix' ? 'selected' : ''}>Netflix</option>
                  <option value="Amazon Prime" ${this.movie?.plataforma === 'Amazon Prime' ? 'selected' : ''}>Amazon Prime</option>
                  <option value="Disney+" ${this.movie?.plataforma === 'Disney+' ? 'selected' : ''}>Disney+</option>
                  <option value="HBO Max" ${this.movie?.plataforma === 'HBO Max' ? 'selected' : ''}>HBO Max</option>
                  <option value="Apple TV+" ${this.movie?.plataforma === 'Apple TV+' ? 'selected' : ''}>Apple TV+</option>
                  <option value="Paramount+" ${this.movie?.plataforma === 'Paramount+' ? 'selected' : ''}>Paramount+</option>
                  <option value="Cine" ${this.movie?.plataforma === 'Cine' ? 'selected' : ''}>Cine</option>
                  <option value="Blu-ray/DVD" ${this.movie?.plataforma === 'Blu-ray/DVD' ? 'selected' : ''}>Blu-ray/DVD</option>
                  <option value="Otra" ${this.movie?.plataforma === 'Otra' ? 'selected' : ''}>Otra</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="poster">Poster (URL de imagen)</label>
              <input type="url" id="poster" name="poster" 
                     value="${this.movie?.poster || ''}" 
                     placeholder="https://ejemplo.com/poster.jpg">
              <div class="poster-preview" id="poster-preview">
                ${this.movie?.poster ? `<img src="${this.movie.poster}" alt="Preview">` : ''}
              </div>
            </div>

            <div class="form-group">
              <label for="trailer">Trailer (URL de YouTube)</label>
              <input type="url" id="trailer" name="trailer" 
                     value="${this.movie?.trailer || ''}" 
                     placeholder="https://www.youtube.com/watch?v=...">
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="window.movieForm.closeForm()">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary">
                ${this.isEditing ? 'Actualizar Película' : 'Agregar Película'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHTML);
  }

  // Configurar event listeners
  setupEventListeners() {
    const form = document.getElementById('movie-form');
    const overlay = document.getElementById('form-overlay');
    
    // Submit del formulario
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Cerrar con click en overlay
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeForm();
      }
    });

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeForm();
      }
    });

    // Validación en tiempo real
    this.setupValidation();
  }

  // Configurar preview de imagen
  setupImagePreview() {
    const posterInput = document.getElementById('poster');
    const previewContainer = document.getElementById('poster-preview');
    
    posterInput.addEventListener('input', (e) => {
      const url = e.target.value;
      if (url) {
        previewContainer.innerHTML = `<img src="${url}" alt="Preview" onerror="this.style.display='none'">`;
      } else {
        previewContainer.innerHTML = '';
      }
    });
  }

  // Configurar validación
  setupValidation() {
    const requiredFields = ['titulo', 'año'];
    
    requiredFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      field.addEventListener('blur', () => {
        this.validateField(field);
      });
    });

    // Validación del año
    const yearField = document.getElementById('año');
    yearField.addEventListener('input', (e) => {
      const year = parseInt(e.target.value);
      const currentYear = new Date().getFullYear();
      
      if (year < 1900 || year > currentYear + 5) {
        e.target.setCustomValidity('El año debe estar entre 1900 y ' + (currentYear + 5));
      } else {
        e.target.setCustomValidity('');
      }
    });

    // Validación de la calificación
    const ratingField = document.getElementById('calificacion');
    ratingField.addEventListener('input', (e) => {
      const rating = parseFloat(e.target.value);
      
      if (rating < 1 || rating > 10) {
        e.target.setCustomValidity('La calificación debe estar entre 1 y 10');
      } else {
        e.target.setCustomValidity('');
      }
    });
  }

  // Validar campo individual
  validateField(field) {
    const value = field.value.trim();
    const fieldContainer = field.closest('.form-group');
    
    // Remover mensajes de error anteriores
    const existingError = fieldContainer.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    fieldContainer.classList.remove('error');
    
    // Validar campos requeridos
    if (field.required && !value) {
      this.showFieldError(field, 'Este campo es requerido');
      return false;
    }
    
    return true;
  }

  // Mostrar error en campo
  showFieldError(field, message) {
    const fieldContainer = field.closest('.form-group');
    fieldContainer.classList.add('error');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    fieldContainer.appendChild(errorElement);
  }

  // Manejar envío del formulario
  async handleSubmit() {
    const form = document.getElementById('movie-form');
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Validar formulario
    if (!this.validateForm()) {
      return;
    }
    
    // Deshabilitar botón
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';
    
    try {
      // Recopilar datos
      const movieData = {
        titulo: formData.get('titulo'),
        año: parseInt(formData.get('año')) || null,
        duracion: parseInt(formData.get('duracion')) || null,
        genero: formData.get('genero') || null,
        categoria: formData.get('categoria') || null,
        director: formData.get('director') || null,
        actores: formData.get('actores') || null,
        descripcion: formData.get('descripcion') || null,
        calificacion: parseFloat(formData.get('calificacion')) || null,
        plataforma: formData.get('plataforma') || null,
        poster: formData.get('poster') || null,
        trailer: formData.get('trailer') || null,
        fecha_agregada: this.movie?.fecha_agregada || new Date().toISOString()
      };

      // Guardar película
      let result;
      if (this.isEditing) {
        result = await window.electronAPI.updateMovie(this.movie.id, movieData);
      } else {
        result = await window.electronAPI.createMovie(movieData);
      }

      if (result.success) {
        this.showSuccess(this.isEditing ? 'Película actualizada correctamente' : 'Película agregada correctamente');
        this.closeForm();
        
        // Recargar lista de películas
        if (window.appController) {
          window.appController.loadMovies();
        }
      } else {
        this.showError('Error al guardar la película: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      this.showError('Error al guardar la película');
    } finally {
      // Rehabilitar botón
      submitBtn.disabled = false;
      submitBtn.textContent = this.isEditing ? 'Actualizar Película' : 'Agregar Película';
    }
  }

  // Validar formulario completo
  validateForm() {
    const form = document.getElementById('movie-form');
    let isValid = true;
    
    // Validar campos requeridos
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  // Mostrar mensaje de éxito
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  // Mostrar mensaje de error
  showError(message) {
    this.showNotification(message, 'error');
  }

  // Mostrar notificación
  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Mostrar notificación
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  // Cerrar formulario
  closeForm() {
    const overlay = document.getElementById('form-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    // Limpiar referencia global
    window.movieForm = null;
    
    // Remover event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  // Manejar teclas
  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.closeForm();
    }
  }
}

// Exportar la clase
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MovieForm;
}