// Footer HTML
const footerHTML = `
  <footer class="slider-footer" id="slider-footer">
    <div class="slider-footer-inner">
      <div class="slider-footer-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="120" height="30">
          <text x="10" y="30" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#808080">TODOGRAM</text>
        </svg>
      </div>
      
      <div class="slider-footer-content">
        <div class="slider-footer-section">
          <h4 class="slider-footer-title">Acerca de</h4>
          <nav class="slider-footer-nav">
            <a href="#" class="slider-footer-link">Sobre nosotros</a>
            <a href="#" class="slider-footer-link">Carreras</a>
            <a href="#" class="slider-footer-link">Prensa</a>
            <a href="#" class="slider-footer-link">Contacto</a>
          </nav>
        </div>
        
        <div class="slider-footer-section">
          <h4 class="slider-footer-title">Ayuda</h4>
          <nav class="slider-footer-nav">
            <a href="#" class="slider-footer-link">Centro de ayuda</a>
            <a href="#" class="slider-footer-link">FAQ</a>
            <a href="#" class="slider-footer-link">Soporte técnico</a>
            <a href="#" class="slider-footer-link">Estado del servicio</a>
          </nav>
        </div>
        
        <div class="slider-footer-section">
          <h4 class="slider-footer-title">Legal</h4>
          <nav class="slider-footer-nav">
            <a href="#" class="slider-footer-link">Términos de servicio</a>
            <a href="#" class="slider-footer-link">Política de privacidad</a>
            <a href="#" class="slider-footer-link">Cookies</a>
            <a href="#" class="slider-footer-link">Aviso legal</a>
          </nav>
        </div>
        
        <div class="slider-footer-section">
          <h4 class="slider-footer-title">Síguenos</h4>
          <div class="slider-footer-social">
            <a href="#" class="slider-footer-social-link"><i class="fab fa-facebook-f"></i></a>
            <a href="#" class="slider-footer-social-link"><i class="fab fa-twitter"></i></a>
            <a href="#" class="slider-footer-social-link"><i class="fab fa-instagram"></i></a>
            <a href="#" class="slider-footer-social-link"><i class="fab fa-youtube"></i></a>
          </div>
        </div>
      </div>
      
      <div class="slider-footer-bottom">
        <div class="slider-footer-copyright">
          <p>&copy; 2024 Todogram. Todos los derechos reservados.</p>
        </div>
        <div class="slider-footer-languages">
          <select class="slider-footer-language-select">
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </div>
    </div>
  </footer>
`;

// Renderizar footer
document.addEventListener('DOMContentLoaded', function() {
  const footerRoot = document.getElementById('footer-root');
  if (footerRoot) {
    footerRoot.innerHTML = footerHTML;
  }
  
  // Elementos del footer
  const footer = document.getElementById('slider-footer');
  
  if (!footer) {
    console.error('Elementos del footer no encontrados');
    return;
  }
  
  // Función para manejar scroll en la página principal
  function onScrollFooter() {
    const currentScrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Mostrar footer cuando esté cerca del final de la página
    if (currentScrollY + windowHeight >= documentHeight - 100) {
      footer.classList.add('visible');
    } else {
      footer.classList.remove('visible');
    }
  }
  
  // Event listeners
  window.addEventListener('scroll', onScrollFooter);
  
  // Ejecutar al cargar
  onScrollFooter();
}); 