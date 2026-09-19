/*
 * Runs inline in <head>, before first paint, so the correct theme is applied
 * without a flash. Kept deliberately tiny and dependency-free.
 *
 * The theme module defaults to dark (`color-scheme: dark` on :root) and opts
 * into light via a `.light` class, so that is the only class toggled here.
 */
(function () {
    /* Normalised once, here, because this is the first script to run; every
       later consumer just reads window.SV.themeColor. The literals are a last
       resort for the case where head.html failed to emit the config at all. */
    window.SV = window.SV || {};
    window.SV.themeColor = window.SV.themeColor || { light: '#fff9f9', dark: '#0a0505' };
    var cfg = window.SV.themeColor;

    try {
        /* 'sv-theme' is the key the other Stellar Vector sites use; 'theme' is
           this blog's original key, read once so existing visitors keep their
           choice. */
        var stored = localStorage.getItem('sv-theme') || localStorage.getItem('theme');
        var light = stored ? stored === 'light'
                           : window.matchMedia('(prefers-color-scheme: light)').matches;

        if (light) {
            document.documentElement.classList.add('light');
        }

        /* Keep the mobile browser chrome in step with the page surface. */
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', light ? cfg.light : cfg.dark);
        }
    } catch (e) {
        /* Private mode or blocked storage: fall through to the dark default. */
    }
})();
