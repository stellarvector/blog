/*
 * Site behaviour. No dependencies, no build step beyond Hugo's bundling.
 */
(function () {
    'use strict';

    var mqDesktop = window.matchMedia('(min-width: 1024px)');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ------------------------------------------------------------------ toc */

    var toc = document.getElementById('toc');

    if (toc) {
        var tocTouched = false;
        var summary = toc.querySelector('summary');
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

    if (bar || toTop) {
        var ticking = false;

        var draw = function () {
            var doc = document.documentElement;
            var max = doc.scrollHeight - doc.clientHeight;
            var top = doc.scrollTop;

            if (bar) bar.style.width =
                (max > 0 ? (top / max) * 100 : 0).toFixed(2) + '%';

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
    var lightboxTemplate = document.getElementById('lightbox-template');

    if (figures.length && lightboxTemplate && typeof HTMLDialogElement === 'function') {
        var clone = lightboxTemplate.content.cloneNode(true);
        var dlg = clone.querySelector('dialog');
        document.body.appendChild(dlg);

        var full = dlg.querySelector('img');
        var opener = null;

        var closeLightbox = function () { dlg.close(); };
        dlg.querySelector('[data-lightbox-close]').addEventListener('click', closeLightbox);
        dlg.addEventListener('click', function (e) { if (e.target === dlg) closeLightbox(); });
        dlg.addEventListener('close', function () { if (opener) { opener.focus(); opener = null; } });

        figures.forEach(function (img) {
            if (img.closest('a') || img.closest('.sv-lightbox-trigger')) return;

            var trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'sv-lightbox-trigger';
            trigger.setAttribute('aria-label', img.alt ? 'Enlarge image: ' + img.alt : 'Enlarge image');

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
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
            if (!mqDesktop.matches && toc) toc.open = false;
        });
    });
})();
