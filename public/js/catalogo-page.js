document.addEventListener('DOMContentLoaded', function(){
    try{
        if(window.Catalogo && typeof window.Catalogo.initPage === 'function'){
            window.Catalogo.initPage('#catalogo-page-root');
        } else {
            // fallback: try to call initCatalogoPage global if present
            if(typeof initCatalogoPage === 'function') initCatalogoPage('#catalogo-page-root');
            else console.error('Catalogo: initPage no encontrada');
        }
    }catch(e){ console.error('catalogo-page init error', e); }
});