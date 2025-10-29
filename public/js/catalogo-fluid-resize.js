/**
 * catalogo-fluid-resize.js
 *
 * Interpola (resize fluido) variables CSS entre breakpoints definidos.
 * Uso:
 * 1) Definir en CSS, dentro de cada @media que tenga tamaños fijos, las mismas variables
 *    que quieres que sean interpoladas (p. ej. --item-width, --item-height). El script
 *    no sobrescribe reglas fijas que no usen variables.
 * 2) Proveer un mapeo de breakpoints -> valores en un elemento <script id="catalogo-fluid-config" type="application/json">[...]</script>
 *    o asignando window.CATALOGO_FLUID_CONFIG antes de este script.
 *
 * Formato de configuración (ejemplo):
 * [
 *   { "max": 320, "vars": { "--item-width": "140px", "--item-height": "210px" } },
 *   { "max": 360, "vars": { "--item-width": "150px", "--item-height": "220px" } },
 *   { "max": 376, "vars": { "--item-width": "160px", "--item-height": "230px" } }
 * ]
 *
 * Comportamiento:
 * - Si el viewport está exactamente en un breakpoint o fuera del rango, el script aplica
 *   el valor fijo correspondiente (no interpolado).
 * - Si está entre dos breakpoints, interpola numéricamente entre los valores (solo para
 *   propiedades con la misma unidad, p. ej. px->px, rem->rem).
 * - No tocará propiedades CSS que no estén expresadas mediante variables.
 */

(function () {
    'use strict';

    // Helper: parse config from a script tag or global
    function loadConfig() {
        // 1) try window global
        if (window.CATALOGO_FLUID_CONFIG && Array.isArray(window.CATALOGO_FLUID_CONFIG)) {
            return window.CATALOGO_FLUID_CONFIG.slice();
        }

        // 2) try JSON in a script tag with id
        const el = document.getElementById('catalogo-fluid-config');
        if (el && el.textContent) {
            try {
                const cfg = JSON.parse(el.textContent);
                if (Array.isArray(cfg)) return cfg;
            } catch (e) {
                console.error('catalogo-fluid-resize: fallo parseando #catalogo-fluid-config', e);
            }
        }

        // 3) fallback: attempt to read current :root values and create a single-point config
        const computed = getComputedStyle(document.documentElement);
        const fallback = [
            { max: 99999, vars: {} }
        ];
        // Add a couple of common vars if present so script is safe by default
        ['--item-width', '--item-height', '--catalogo-gap', '--catalogo-row-gap'].forEach(v => {
            const val = computed.getPropertyValue(v).trim();
            if (val) fallback[0].vars[v] = val;
        });
        return fallback;
    }

    // Helper: parse numeric value and unit (supports px, rem, em, %)
    function parseValue(str) {
        if (!str) return null;
        str = String(str).trim();
        const m = str.match(/^(-?\d*\.?\d+)([a-z%]*)$/i);
        if (!m) return null;
        return { n: parseFloat(m[1]), u: m[2] || '' };
    }

    function interpolate(a, b, t) {
        return a + (b - a) * t;
    }

    // Apply variables to :root
    function applyVars(vars) {
        const root = document.documentElement;
        Object.keys(vars).forEach(k => {
            root.style.setProperty(k, vars[k]);
        });
    }

    // Main: compute interpolated vars for a viewport width
    function computeInterpolatedVars(cfg, w) {
        if (!cfg || cfg.length === 0) return {};
        // sort by max ascending
        cfg.sort((a, b) => a.max - b.max);

        // If w is <= first.max => return first.vars (fixed)
        if (w <= cfg[0].max) return Object.assign({}, cfg[0].vars);
        // If w > last.max => return last.vars
        if (w >= cfg[cfg.length - 1].max) return Object.assign({}, cfg[cfg.length - 1].vars);

        // find interval
        let lowerIndex = 0;
        for (let i = 0; i < cfg.length - 1; i++) {
            if (w > cfg[i].max && w <= cfg[i + 1].max) { lowerIndex = i; break; }
        }
        const lo = cfg[lowerIndex];
        const hi = cfg[lowerIndex + 1];
        const span = hi.max - lo.max;
        const t = span === 0 ? 0 : (w - lo.max) / span;

        // join keys
        const keys = new Set(Object.keys(lo.vars).concat(Object.keys(hi.vars)));
        const out = {};
        keys.forEach(k => {
            const v0 = lo.vars[k] !== undefined ? lo.vars[k] : hi.vars[k];
            const v1 = hi.vars[k] !== undefined ? hi.vars[k] : lo.vars[k];
            const p0 = parseValue(String(v0).trim());
            const p1 = parseValue(String(v1).trim());
            if (p0 && p1 && p0.u === p1.u) {
                const val = interpolate(p0.n, p1.n, t);
                // round to 2 decimals for cleanliness
                out[k] = (Math.round(val * 100) / 100) + p0.u;
            } else {
                // cannot interpolate different units or unparsable -> choose nearer endpoint
                out[k] = t < 0.5 ? v0 : v1;
            }
        });

        return out;
    }

    // debounce
    function debounce(fn, wait) {
        let t;
        return function () { clearTimeout(t); t = setTimeout(fn, wait); };
    }

    // Init
    const cfg = loadConfig();

    // Ensure cfg entries have numeric max
    for (let i = 0; i < cfg.length; i++) {
        cfg[i].max = Number(cfg[i].max) || 0;
        cfg[i].vars = cfg[i].vars || {};
    }

    function refresh() {
        const w = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vars = computeInterpolatedVars(cfg, w);
        applyVars(vars);
    }

    const debounced = debounce(refresh, 40);
    window.addEventListener('resize', debounced);
    window.addEventListener('orientationchange', debounced);
    // run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refresh);
    } else {
        refresh();
    }

    // Expose helper for debugging / runtime updates
    window.catalogoFluidResize = {
        config: cfg,
        refresh: refresh,
        computeInterpolatedVars: computeInterpolatedVars
    };

})();
