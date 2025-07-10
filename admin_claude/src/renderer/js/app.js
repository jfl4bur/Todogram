// Controlador principal de la aplicación
class App {
  constructor() {
    this.currentView = 'movies';
    this.movies = [];
    this.pendingMovies = [];
    this.categories = ['Acción', 'Comedia', 'Drama', 'Terror', 'Sci-Fi', 'Romance', 'Documental'];
    this.init();
  }

  async init() {
    await this.loadMovies();
    this.setupEventListeners();
    this.showView('movies');
  }

  setupEventListeners() {
    // Navegación
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        this.showView(view);
      });
    });

    // Botón nueva película
    document.getElementById('new-movie-btn').addEventListener('click', () => {
      this.showView('create');
    });

    // Formulario de crear película
    document.getElementById('create-movie-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createMovie();
    });

    // Botón refrescar
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.loadMovies();
    });
  }

  showView(view) {
    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    // Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(viewEl => {
      viewEl.classList.remove('active');
    });

    // Mostrar vista seleccionada
    document.getElementById(`${view}-view`).classList.add('active');
    this.currentView = view;

    // Cargar contenido específico de la vista
    switch(view) {
      case 'movies':
        this.renderMovies();
        break;
      case 'pending':
        this.renderPendingMovies();
        break;
      case 'create':
        this.resetCreateForm();
        break;
    }
  }

  async loadMovies() {
    try {
      this.showLoading();
      const response = await window.electronAPI.getMovies();
      
      if (response.success) {
        this.movies = response.data.filter(movie => movie.category && movie.category.trim() !== '');
        this.pendingMovies = response.data.filter(movie => !movie.category || movie.category.trim() === '');
        this.hideLoading();
        this.renderCurrentView();
      } else {
        this.showError('Error al cargar las películas: ' + response.error);
      }
    } catch (error) {
      this.showError('Error de conexión: ' + error.message);
    }
  }

  renderMovies() {
    const container = document.getElementById('movies-container');
    
    if (this.movies.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-film"></i>
          <h3>No hay películas</h3>
          <p>Agrega tu primera película para comenzar</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.movies.map(movie => `
      <div class="movie-card fade-in">
        <img src="${movie.poster || '/assets/default-poster.jpg'}" alt="${movie.title}" class="movie-poster">
        <div class="movie-info">
          <h3 class="movie-title">${movie.title}</h3>
          <span class="movie-category">${movie.category}</span>
          <p class="movie-year">${movie.year || 'N/A'}</p>
          <div class="movie-actions">
            <button class="btn btn-small btn-secondary" onclick="app.editMovie('${movie.id}')">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-small btn-danger" onclick="app.deleteMovie('${movie.id}')">
              <i class="fas fa-trash"></i> Eliminar
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderPendingMovies() {
    const container = document.getElementById('pending-container');
    
    if (this.pendingMovies.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clock"></i>
          <h3>No hay películas pendientes</h3>
          <p>Todas las películas tienen categoría asignada</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="pending-list">
        ${this.pendingMovies.map(movie => `
          <div class="pending-item">
            <div class="pending-info">
              <h4 class="pending-title">${movie.title}</h4>
              <p class="pending-meta">Año: ${movie.year || 'N/A'}</p>
            </div>
            <div class="pending-actions">
              <select class="form-select" id="category-${movie.id}">
                <option value="">Seleccionar categoría</option>
                ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
              </select>
              <button class="btn btn-small btn-primary" onclick="app.assignCategory('${movie.id}')">
                <i class="fas fa-check"></i> Asignar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  resetCreateForm() {
    document.getElementById('create-movie-form').reset();
    const categorySelect = document.getElementById('movie-category');
    categorySelect.innerHTML = `
      <option value="">Seleccionar categoría</option>
      ${this.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
    `;
  }

  async createMovie() {
    const formData = new FormData(document.getElementById('create-movie-form'));
    const movieData = {
      title: formData.get('title'),
      year: formData.get('year'),
      category: formData.get('category'),
      description: formData.get('description'),
      poster: formData.get('poster')
    };

    try {
      this.showLoading();
      const response = await window.electronAPI.createMovie(movieData);
      
      if (response.success) {
        this.showSuccess('Película creada exitosamente');
        this.resetCreateForm();
        await this.loadMovies();
        this.showView('movies');
      } else {
        this.showError('Error al crear la película: ' + response.error);
      }
    } catch (error) {
      this.showError('Error de conexión: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async editMovie(movieId) {
    const movie = this.movies.find(m => m.id === movieId) || this.pendingMovies.find(m => m.id === movieId);
    if (!movie) return;

    // Crear modal de edición
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Editar Película</h3>
          <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form id="edit-movie-form">
          <div class="form-group">
            <label class="form-label">Título</label>
            <input type="text" name="title" class="form-input" value="${movie.title}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Año</label>
            <input type="number" name="year" class="form-input" value="${movie.year || ''}" min="1900" max="2030">
          </div>
          <div class="form-group">
            <label class="form-label">Categoría</label>
            <select name="category" class="form-select">
              <option value="">Seleccionar categoría</option>
              ${this.categories.map(cat => `<option value="${cat}" ${movie.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea name="description" class="form-textarea">${movie.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">URL del Poster</label>
            <input type="url" name="poster" class="form-input" value="${movie.poster || ''}">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Configurar formulario de edición
    modal.querySelector('#edit-movie-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const updatedData = {
        title: formData.get('title'),
        year: formData.get('year'),
        category: formData.get('category'),
        description: formData.get('description'),
        poster: formData.get('poster')
      };

      try {
        this.showLoading();
        const response = await window.electronAPI.updateMovie(movieId, updatedData);
        
        if (response.success) {
          this.showSuccess('Película actualizada exitosamente');
          modal.remove();
          await this.loadMovies();
          this.renderCurrentView();
        } else {
          this.showError('Error al actualizar la película: ' + response.error);
        }
      } catch (error) {
        this.showError('Error de conexión: ' + error.message);
      } finally {
        this.hideLoading();
      }
    });
  }

  async deleteMovie(movieId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta película?')) {
      return;
    }

    try {
      this.showLoading();
      const response = await window.electronAPI.deleteMovie(movieId);
      
      if (response.success) {
        this.showSuccess('Película eliminada exitosamente');
        await this.loadMovies();
        this.renderCurrentView();
      } else {
        this.showError('Error al eliminar la película: ' + response.error);
      }
    } catch (error) {
      this.showError('Error de conexión: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  async assignCategory(movieId) {
    const categorySelect = document.getElementById(`category-${movieId}`);
    const category = categorySelect.value;
    
    if (!category) {
      this.showError('Por favor selecciona una categoría');
      return;
    }

    try {
      this.showLoading();
      const response = await window.electronAPI.updateMovie(movieId, { category });
      
      if (response.success) {
        this.showSuccess('Categoría asignada exitosamente');
        await this.loadMovies();
        this.renderCurrentView();
      } else {
        this.showError('Error al asignar la categoría: ' + response.error);
      }
    } catch (error) {
      this.showError('Error de conexión: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  renderCurrentView() {
    switch(this.currentView) {
      case 'movies':
        this.renderMovies();
        break;
      case 'pending':
        this.renderPendingMovies();
        break;
    }
  }

  showLoading() {
    document.querySelector('.loading-overlay').style.display = 'flex';
  }

  hideLoading() {
    document.querySelector('.loading-overlay').style.display = 'none';
  }

  showSuccess(message) {
    this.showAlert(message, 'success');
  }

  showError(message) {
    this.showAlert(message, 'error');
  }

  showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
      <span>${message}</span>
    `;
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
      alert.remove();
    }, 5000);
  }
}

// Inicializar aplicación
const app = new App();