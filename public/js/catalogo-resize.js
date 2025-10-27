/* catalogo-resize.js
   Observa el contenedor del catálogo y ajusta las variables CSS
   --item-width y --item-height en tiempo real para que los items
   se redimensionen automáticamente en modo responsive.

   Estrategia:
   - Detectar el ancho disponible del grid (#catalogo-grid-page)
   - Calcular cuantas columnas caben respetando un ancho mínimo
   - Ajustar --item-width calculando el espacio restante (restando gaps)
   - Mantener la relación width:height basada en las variables CSS actuales
   - Usar ResizeObserver si está disponible, con fallback a window.resize
*/
(function(){
    const ROOT = document.documentElement;
    const GRID_SELECTOR = '#catalogo-grid-page';
    const DEFAULT_MIN_ITEM = 140; // px
    const DEFAULT_MAX_ITEM = 380; // px
    const DEBOUNCE_MS = 80;

    function getNumericCssVar(name, fallback){
        try{
            const val = getComputedStyle(ROOT).getPropertyValue(name);
            if(!val) return fallback;
            const n = parseFloat(val.trim());
            return isNaN(n) ? fallback : n;
        }catch(e){ return fallback; }
    }

    function getGridGap(grid){
        try{
            const s = getComputedStyle(grid);
            // column-gap preferred, then gap, then root var
            const g = s.getPropertyValue('column-gap') || s.getPropertyValue('gap') || getComputedStyle(ROOT).getPropertyValue('--catalogo-gap') || '18px';
            const n = parseFloat(g);
            return isNaN(n) ? 18 : n;
        }catch(e){ return 18; }
    }

    function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

    function computeAndApply(grid){
        if(!grid) return;
        const containerWidth = grid.clientWidth || document.documentElement.clientWidth;
        const gap = getGridGap(grid);

        // Determine current aspect ratio from CSS vars (height / width)
        const curW = getNumericCssVar('--item-width', 194);
        const curH = getNumericCssVar('--item-height', 271);
        const ratio = curH / Math.max(1, curW);

        // Compute number of columns that would fit using a minimum item width
        const minItem = getNumericCssVar('--catalogo-min-item-width', DEFAULT_MIN_ITEM);
        const maxItem = getNumericCssVar('--catalogo-max-item-width', DEFAULT_MAX_ITEM);

        // conservative columns calculation
        let cols = Math.max(1, Math.floor((containerWidth + gap) / (minItem + gap)));

        // recompute item width to perfectly fill the container (accounting gaps)
        let itemWidth = Math.floor((containerWidth - (cols - 1) * gap) / cols);

        // If itemWidth would exceed maxItem, increase cols until it fits or reach a limit
        while(itemWidth > maxItem && cols < 12){ cols++; itemWidth = Math.floor((containerWidth - (cols - 1) * gap) / cols); }

        // If still smaller than minItem, reduce cols
        while(itemWidth < minItem && cols > 1){ cols--; itemWidth = Math.floor((containerWidth - (cols - 1) * gap) / cols); }

        itemWidth = clamp(itemWidth, minItem, Math.max(minItem, maxItem));
        const itemHeight = Math.round(itemWidth * ratio);

        // Apply to :root so existing CSS that uses var(--item-width) responds
        try{
            ROOT.style.setProperty('--item-width', itemWidth + 'px');
            ROOT.style.setProperty('--item-height', itemHeight + 'px');
            // expose computed columns for debugging if needed
            ROOT.style.setProperty('--catalogo-computed-cols', String(cols));
        }catch(e){ console.warn('catalogo-resize: no se pudo escribir variables CSS', e); }
    }

    function init(){
        const grid = document.querySelector(GRID_SELECTOR);
        if(!grid){
            // Retry after DOM ready a couple times if not present yet
            let attempts = 0;
            const t = setInterval(()=>{
                attempts++;
                const g = document.querySelector(GRID_SELECTOR);
                if(g){ clearInterval(t); setup(g); }
                if(attempts > 30) clearInterval(t);
            }, 150);
            return;
        }
        setup(grid);
    }

    function setup(grid){
        let timer = null;
        const debounced = ()=>{ if(timer) clearTimeout(timer); timer = setTimeout(()=>{ computeAndApply(grid); timer = null; // trigger a resize event so catalogo.js recomputes batches
            try{ window.dispatchEvent(new Event('resize')); }catch(e){} }, DEBOUNCE_MS); };

        // Run once immediately
        debounced();

        if(window.ResizeObserver){
            try{
                const ro = new ResizeObserver(debounced);
                ro.observe(grid);
                // Also observe the grid's parent in case padding/margins change layout
                if(grid.parentElement) ro.observe(grid.parentElement);
                // Also observe the catalog skeleton if present so placeholders resize equally
                try{
                    const sk = document.querySelector('#catalogo-skeleton-page');
                    if(sk) ro.observe(sk);
                }catch(e){}
            }catch(e){ window.addEventListener('resize', debounced); }
        } else {
            // fallback
            window.addEventListener('resize', debounced);
        }
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
