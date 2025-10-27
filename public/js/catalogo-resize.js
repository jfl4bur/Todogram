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
    // Buscar tanto el grid como los skeletons del catálogo (diferentes páginas usan ids distintos)
    // Prefer skeleton containers first (when present) so the computed sizes
    // match the skeleton preview size that the user expects during load.
    const CONTAINER_SELECTORS = [
        '#catalogo-skeleton-page',  // skeleton usado durante carga en la página de catálogo
        '#catalogo-skeleton',       // nombre alternativo usado en otros lugares
        '#catalogo-grid-page',      // grid en la página de catálogo
        '#catalogo-grid'            // fallback alternativo
    ];
    const DEFAULT_MIN_ITEM = 180; // px — aumentado para evitar tamaños demasiado pequeños en desktop
    const DEFAULT_MAX_ITEM = 380; // px
    const DEBOUNCE_MS = 80;
    const DEBUG = false;

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

    function computeAndApply(container){
        if(!container) return;
        const containerWidth = container.clientWidth || document.documentElement.clientWidth;
        const gap = getGridGap(container);

        // Determine current aspect ratio from CSS vars (height / width)
        const curW = getNumericCssVar('--item-width', 194);
        const curH = getNumericCssVar('--item-height', 271);
        const ratio = curH / Math.max(1, curW);

        // Compute number of columns that would fit using a minimum item width
        const minItem = getNumericCssVar('--catalogo-min-item-width', DEFAULT_MIN_ITEM);
        const maxItem = getNumericCssVar('--catalogo-max-item-width', DEFAULT_MAX_ITEM);

        // --- NEW: If there's a visible skeleton item, use its measured box as the source of truth
        // This ensures final items exactly match the skeleton size (fixes desktop mismatch).
        try{
            // selectors observed in the codebase for skeletons
            const skeletonSelectors = [
                '#catalogo-skeleton .skeleton-item',
                '.skeleton-item-catalogo',
                '.skeleton-item',
                '#catalogo-skeleton .skeleton-item-catalogo'
            ];
            let skeletonEl = null;
            for(const sel of skeletonSelectors){ const found = document.querySelector(sel); if(found){ skeletonEl = found; break; } }
            if(skeletonEl){
                const rect = skeletonEl.getBoundingClientRect();
                // only accept measured sizes that look reasonable and not full-width artifacts
                if(rect.width > 10 && rect.height > 10 && rect.width < containerWidth + 4){
                    const measuredWidth = Math.round(rect.width);
                    const measuredHeight = Math.round(rect.height);
                    // Apply measured skeleton size directly (do not force it down to minItem)
                    ROOT.style.setProperty('--item-width', measuredWidth + 'px');
                    ROOT.style.setProperty('--item-height', measuredHeight + 'px');
                    // approximate columns (informational)
                    const approxCols = Math.max(1, Math.round((containerWidth + gap) / (measuredWidth + gap)));
                    ROOT.style.setProperty('--catalogo-computed-cols', String(approxCols));
                    return; // done — skeleton wins
                }
            }
        }catch(e){ /* non-fatal — fallback to computed algorithm below */ }

        // conservative columns calculation (fallback path)
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
        // Buscar el primer contenedor disponible entre las opciones
        const findContainer = ()=>{
            for(const s of CONTAINER_SELECTORS){ const el = document.querySelector(s); if(el) return el; } return null;
        };

        let container = findContainer();
        if(!container){
            // Retry a few times while DOM initializes (covers skeleton created later)
            let attempts = 0;
            const t = setInterval(()=>{
                attempts++;
                container = findContainer();
                if(container){ clearInterval(t); setup(container); }
                if(attempts > 60) clearInterval(t);
            }, 120);
            return;
        }
        setup(container);
    }

    function setup(grid){
        let timer = null;
        // debounced compute that uses the first available container each time
        const debounced = ()=>{ if(timer) clearTimeout(timer); timer = setTimeout(()=>{
            // prefer grid but fall back to any selector found
            let target = null;
            for(const s of CONTAINER_SELECTORS){ const el = document.querySelector(s); if(el){ target = el; break; } }
            computeAndApply(target);
            timer = null; // trigger a resize event so catalogo.js recomputes batches
            try{ window.dispatchEvent(new Event('resize')); }catch(e){}
        }, DEBOUNCE_MS); };

        // Run once immediately
        debounced();

        if(window.ResizeObserver){
            try{
                const ro = new ResizeObserver(debounced);
                // Observe all potential containers so skeleton or grid events trigger the same logic
                for(const s of CONTAINER_SELECTORS){ const el = document.querySelector(s); if(el) ro.observe(el); }
                // Also observe documentElement as a fallback
                ro.observe(document.documentElement);
            }catch(e){ window.addEventListener('resize', debounced); }
        } else {
            // fallback
            window.addEventListener('resize', debounced);
        }

        // MutationObserver: si los skeletons se insertan dinámicamente, detectarlos y recomputar
        try{
            const skeletonWatchSelectors = ['.skeleton-item-catalogo', '.skeleton-item', '#catalogo-skeleton .skeleton-item', '#catalogo-skeleton-page .skeleton-item'];
            const mo = new MutationObserver((mutations)=>{
                for(const m of mutations){
                    if(m.addedNodes && m.addedNodes.length){
                        for(const sel of skeletonWatchSelectors){ if(document.querySelector(sel)){ if(DEBUG) console.debug('catalogo-resize: skeleton added -> debounced'); debounced(); return; } }
                    }
                }
            });
            mo.observe(document.body, { childList: true, subtree: true });
            if(DEBUG) console.debug('catalogo-resize: mutation observer attached');
        }catch(e){ if(DEBUG) console.warn('catalogo-resize: MutationObserver failed', e); }
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
