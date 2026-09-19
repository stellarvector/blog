/*
 * Site behaviour. No dependencies, no build step beyond Hugo's bundling.
 * Every block bails out quietly when its markup is absent, so the same
 * bundle is safe on the home page, the archive and a writeup alike.
 */
(function () {
    'use strict';

    var mqDesktop = window.matchMedia('(min-width: 1024px)');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ---------------------------------------------------------------- theme */

    function syncThemeButtons(isLight) {
        document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
            btn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
            /* Say what pressing it will do, not just that it is a toggle. */
            btn.setAttribute('aria-label',
                isLight ? 'Switch to dark theme' : 'Switch to light theme');
        });
    }

    syncThemeButtons(document.documentElement.classList.contains('light'));

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var isLight = document.documentElement.classList.toggle('light');
            try {
                localStorage.setItem('sv-theme', isLight ? 'light' : 'dark');
                localStorage.removeItem('theme');        /* retire the old key */
            } catch (e) { /* storage blocked; the class still applies this visit */ }

            var cfg = window.SV.themeColor;
            var meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', isLight ? cfg.light : cfg.dark);

            syncThemeButtons(isLight);
        });
    });

    /* ---------------------------------------------------------- mobile menu */

    var menuToggle = document.getElementById('menu-toggle');
    var menuPanel = document.getElementById('menu-panel');

    if (menuToggle && menuPanel) {
        var setMenu = function (open) {
            menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            menuPanel.hidden = !open;
            menuPanel.classList.toggle('hidden', !open);
        };

        setMenu(false);

        menuToggle.addEventListener('click', function () {
            setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
        });

        /* Escape closes it, and focus goes back to the control that opened it. */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
                setMenu(false);
                menuToggle.focus();
            }
        });

        /* Following a link inside the panel should not leave it open behind. */
        menuPanel.addEventListener('click', function (e) {
            if (e.target.closest('a')) setMenu(false);
        });

        /* Growing past the mobile breakpoint must not strand it open. */
        mqDesktop.addEventListener('change', function (e) {
            if (e.matches) setMenu(false);
        });
    }

    /* ------------------------------------------------------------------ toc */

    var toc = document.getElementById('toc');

    if (toc) {
        /* Ships closed (see partials/toc.html) and is opened here only where
           it has its own column, so no phone ever pays a layout shift for it.
           Once the reader has touched it, their choice sticks -- rotating a
           phone must not undo it. */
        var tocTouched = false;
        var summary = toc.querySelector('summary');

        /* Only a real interaction counts. `toggle` would not do: it is queued
           rather than dispatched synchronously, and it also fires for the
           programmatic opens/closes below. */
        if (summary) {
            summary.addEventListener('click', function () { tocTouched = true; });
        }

        var fitToc = function () {
            if (!tocTouched) toc.open = mqDesktop.matches;
        };
        fitToc();
        mqDesktop.addEventListener('change', fitToc);
    }

    var tocLinks = Array.prototype.slice.call(
        document.querySelectorAll('.sv-toc nav a[href^="#"]')
    );

    if (tocLinks.length) {
        var headings = tocLinks
            .map(function (a) {
                try {
                    return document.getElementById(decodeURIComponent(a.hash.slice(1)));
                } catch (e) { return null; }
            })
            .filter(Boolean);

        if (headings.length) {
            var markActive = function (id) {
                tocLinks.forEach(function (a) {
                    var on = decodeURIComponent(a.hash.slice(1)) === id;
                    a.classList.toggle('active', on);
                    if (on) a.setAttribute('aria-current', 'true');
                    else a.removeAttribute('aria-current');
                });
            };

            var visible = new Set();

            var spy = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) visible.add(entry.target);
                    else visible.delete(entry.target);
                });

                /* Highlight the topmost heading currently inside the band. */
                for (var i = 0; i < headings.length; i++) {
                    if (visible.has(headings[i])) {
                        markActive(headings[i].id);
                        return;
                    }
                }
            }, { rootMargin: '-96px 0px -70% 0px' });

            headings.forEach(function (h) { spy.observe(h); });
        }
    }

    /* -------------------------------------------------------- reading bar */

    var bar = document.getElementById('reading-progress');
    var toTop = document.getElementById('to-top');

    /* One scroll listener drives both the progress bar and the back-to-top
       button: a second one would double the work on every frame for no gain. */
    if (bar || toTop) {
        var ticking = false;

        var draw = function () {
            var doc = document.documentElement;
            var max = doc.scrollHeight - doc.clientHeight;
            var top = doc.scrollTop;

            /* Written inside rAF so scrolling never triggers sync layout. */
            if (bar) bar.style.width =
                (max > 0 ? (top / max) * 100 : 0).toFixed(2) + '%';

            /* Far enough down that the header's own home link is long gone. */
            if (toTop) toTop.classList.toggle('is-visible', top > doc.clientHeight * 1.5);

            ticking = false;
        };

        window.addEventListener('scroll', function () {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(draw);
            }
        }, { passive: true });

        draw();
    }

    if (toTop) {
        toTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });

            /* Move the reading position too, not just the viewport: otherwise
               the next Tab continues from wherever the button was. */
            var main = document.getElementById('content');
            if (main) main.focus({ preventScroll: true });
        });
    }

    /* ------------------------------------------------------------ code blocks */

    document.querySelectorAll('.prose .highlight').forEach(function (block) {
        var pres = block.querySelectorAll('pre');
        var pre = pres.length > 1 ? pres[1] : pres[0];
        if (!pre || block.querySelector('.sv-code-header')) return;

        var code = pre.querySelector('code');
        var lang = 'code';

        if (code) {
            var cls = Array.prototype.find.call(code.classList, function (c) {
                return c.indexOf('language-') === 0;
            });
            if (cls) lang = cls.replace('language-', '');
        }

        var header = document.createElement('div');
        header.className = 'sv-code-header';

        var label = document.createElement('span');
        label.className = 'sv-code-lang';
        label.textContent = lang;

        var copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'sv-code-copy';
        copy.textContent = 'copy';
        copy.setAttribute('aria-label', 'Copy ' + lang + ' code to clipboard');

        copy.addEventListener('click', function () {
            /* Clone first: Hugo's inline line numbers are real nodes and would
               otherwise land in the clipboard alongside the code. */
            var clone = pre.cloneNode(true);

            clone.querySelectorAll('.ln, .lnt').forEach(function (n) { n.remove(); });

            var write = navigator.clipboard && navigator.clipboard.writeText
                ? navigator.clipboard.writeText(clone.textContent)
                : Promise.reject();

            write.then(function () {
                copy.textContent = 'copied';
                setTimeout(function () { copy.textContent = 'copy'; }, 2000);
            }).catch(function () {
                copy.textContent = 'failed';
                setTimeout(function () { copy.textContent = 'copy'; }, 2000);
            });
        });

        header.appendChild(label);
        header.appendChild(copy);
        block.prepend(header);
    });

    /* ------------------------------------------------------------- actions */

    document.querySelectorAll('[data-print]').forEach(function (btn) {
        btn.addEventListener('click', function () { window.print(); });
    });

    document.querySelectorAll('[data-share]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var label = btn.querySelector('[data-share-label]') || btn;
            var url = window.location.href;

            if (navigator.share) {
                navigator.share({ title: document.title, url: url }).catch(function () {});
                return;
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function () {
                    var was = label.textContent;
                    label.textContent = 'copied';
                    setTimeout(function () { label.textContent = was; }, 2000);
                }).catch(function () {});
            }
        });
    });

    /* ------------------------------------------------------------ tag cloud */

    document.querySelectorAll('[data-tagcloud]').forEach(function (cloud, i) {
        var btn = cloud.querySelector('[data-tagcloud-more]');
        if (!btn) return;

        var extra = cloud.querySelectorAll('.sv-tag-extra');

        /* aria-expanded is meaningless without naming what it expands. The id
           is per-instance because the filters render twice on archive pages. */
        var list = cloud.querySelector('[data-tagcloud-list]');
        if (list) {
            list.id = list.id || ('tagcloud-list-' + i);
            btn.setAttribute('aria-controls', list.id);
        }

        btn.addEventListener('click', function () {
            var open = btn.getAttribute('aria-expanded') === 'true';
            extra.forEach(function (t) { t.classList.toggle('hidden', open); });
            btn.setAttribute('aria-expanded', open ? 'false' : 'true');
            btn.textContent = open ? 'show more' : 'show fewer';
        });
    });

    /* -------------------------------------------------------------- lightbox */

    var figures = document.querySelectorAll('.prose img');

    if (figures.length && typeof HTMLDialogElement === 'function') {
        var dlg = document.createElement('dialog');
        dlg.className = 'sv-lightbox max-w-[95vw] max-h-[95vh] bg-transparent p-0 ' +
                        'backdrop:bg-black/85 backdrop:backdrop-blur-sm';
        dlg.setAttribute('aria-label', 'Enlarged image');
        dlg.innerHTML =
            '<img alt="" class="max-h-[85vh] max-w-full object-contain">' +
            '<button type="button" data-lightbox-close aria-label="Close image" ' +
            'class="mt-3 mx-auto flex h-11 w-11 items-center justify-center rounded-sm ' +
            'border border-line-strong bg-card text-body cursor-pointer">&times;</button>';
        document.body.appendChild(dlg);

        var full = dlg.querySelector('img');
        var opener = null;

        var closeLightbox = function () {
            dlg.close();
        };

        dlg.querySelector('[data-lightbox-close]').addEventListener('click', closeLightbox);

        /* Backdrop click closes; a click on the image itself must not. */
        dlg.addEventListener('click', function (e) {
            if (e.target === dlg) closeLightbox();
        });

        /* <dialog> restores nothing on its own, so return focus deliberately. */
        dlg.addEventListener('close', function () {
            if (opener) { opener.focus(); opener = null; }
        });

        figures.forEach(function (img) {
            /* Never nest interactive content: an image inside a markdown link
               is already actionable, and re-running would double-wrap. */
            if (img.closest('a') || img.closest('.sv-lightbox-trigger')) return;

            /*
             * A bare <img> is not focusable and not announced as actionable, so
             * wrap it in a real button: keyboard users get Tab + Enter/Space and
             * screen readers get a control with a name, for free.
             */
            var trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'sv-lightbox-trigger';
            trigger.setAttribute('aria-label',
                img.alt ? 'Enlarge image: ' + img.alt : 'Enlarge image');

            img.parentNode.insertBefore(trigger, img);
            trigger.appendChild(img);

            trigger.addEventListener('click', function () {
                full.src = img.currentSrc || img.src;
                full.alt = img.alt || '';
                opener = trigger;
                dlg.showModal();
            });
        });
    }

    /* Honour reduced motion for the one scripted scroll we perform. */
    document.querySelectorAll('.sv-toc nav a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var id;
            try { id = decodeURIComponent(a.hash.slice(1)); } catch (err) { return; }

            var target = document.getElementById(id);
            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
            history.pushState(null, '', a.hash);

            /* Move the reading position, not just the viewport. */
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });

            if (!mqDesktop.matches && toc) toc.open = false;
        });
    });
})();
