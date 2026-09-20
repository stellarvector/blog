/*
 * Client-side search over /index.json.
 */
(function () {
    'use strict';

    var dialog = document.getElementById('search-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    var input = document.getElementById('search-input');
    var list = document.getElementById('search-results');
    var status = document.getElementById('search-status');
    var template = document.getElementById('search-result-template');

    var index = null;
    var loading = null;
    var active = -1;
    var hits = [];

    function load() {
        if (loading) return loading;

        loading = fetch(document.documentElement.dataset.searchIndex || '/index.json')
            .then(function (r) { return r.json(); })
            .then(function (data) { index = data; })
            .catch(function () {
                index = [];
                status.textContent = 'search index unavailable';
            });

        return loading;
    }

    /*
     * Highlight the matched run without using innerHTML.
     * Appends alternating text nodes and <mark> elements.
     */
    function appendHighlightedText(el, text, query) {
        el.replaceChildren();
        if (!query) {
            el.appendChild(document.createTextNode(text));
            return;
        }

        var lowerText = text.toLowerCase();
        var lowerQuery = query.toLowerCase();
        var start = 0;
        var at;

        while ((at = lowerText.indexOf(lowerQuery, start)) > -1) {
            if (at > start) {
                el.appendChild(document.createTextNode(text.slice(start, at)));
            }
            var m = document.createElement('mark');
            m.textContent = text.slice(at, at + query.length);
            el.appendChild(m);
            start = at + query.length;
        }

        if (start < text.length) {
            el.appendChild(document.createTextNode(text.slice(start)));
        }
    }

    function snippet(text, query) {
        var at = text.toLowerCase().indexOf(query.toLowerCase());
        if (at < 0) return text.slice(0, 120);

        var from = Math.max(0, at - 40);
        return (from > 0 ? '…' : '') + text.slice(from, from + 140);
    }

    function setActive(i) {
        var items = list.querySelectorAll('.sv-result');
        if (!items.length) return;

        active = (i + items.length) % items.length;

        items.forEach(function (el, n) {
            var on = n === active;
            el.setAttribute('aria-selected', on ? 'true' : 'false');
            if (on) {
                el.scrollIntoView({ block: 'nearest' });
                input.setAttribute('aria-activedescendant', el.id);
            }
        });
    }

    function render(query) {
        list.replaceChildren();
        active = -1;
        input.removeAttribute('aria-activedescendant');

        if (query.length < 2) {
            hits = [];
            input.setAttribute('aria-expanded', 'false');
            status.textContent = 'type at least 2 characters';
            return;
        }

        if (!index) {
            status.textContent = 'loading index…';
            return;
        }

        var q = query.toLowerCase();

        hits = index.filter(function (item) {
            return (item.title && item.title.toLowerCase().indexOf(q) > -1) ||
                   (item.content && item.content.toLowerCase().indexOf(q) > -1) ||
                   (item.category && item.category.toLowerCase().indexOf(q) > -1) ||
                   (item.tags && item.tags.some(function (t) { return t.toLowerCase().indexOf(q) > -1; }));
        }).slice(0, 12);

        input.setAttribute('aria-expanded', hits.length ? 'true' : 'false');

        if (!hits.length) {
            status.textContent = 'no matches for "' + query + '"';
            return;
        }

        status.textContent = hits.length + ' match' + (hits.length === 1 ? '' : 'es') +
                             ' — ↑↓ to navigate, ↵ to open';

        hits.forEach(function (hit, n) {
            var clone = template.content.cloneNode(true);
            var item = clone.querySelector('.sv-result');
            item.id = 'search-hit-' + n;
            item.href = hit.permalink;

            appendHighlightedText(clone.querySelector('.search-result-title'), hit.title, query);

            var meta = clone.querySelector('.search-result-meta');
            meta.textContent = (hit.category ? hit.category + ' / ' : '') + (hit.formattedDate || '');

            appendHighlightedText(clone.querySelector('.search-result-snippet'), snippet(hit.content || '', query), query);

            list.appendChild(clone);
        });
    }

    function open() {
        dialog.showModal();
        load().then(function () { render(input.value.trim()); });
        input.focus();
    }

    document.querySelectorAll('[data-search-open]').forEach(function (btn) {
        btn.addEventListener('click', open);
    });

    document.querySelectorAll('[data-search-close]').forEach(function (btn) {
        btn.addEventListener('click', function () { dialog.close(); });
    });

    dialog.addEventListener('click', function (e) {
        if (e.target === dialog) dialog.close();
    });

    dialog.addEventListener('close', function () {
        input.value = '';
        render('');
    });

    input.addEventListener('input', function () {
        render(input.value.trim());
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Enter' && active > -1) {
            e.preventDefault();
            var el = list.querySelectorAll('.sv-result')[active];
            if (el) window.location.href = el.href;
        }
    });

    document.addEventListener('keydown', function (e) {
        if (dialog.open) return;
        var el = document.activeElement;
        var typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
        if (!e.key) return;
        if ((e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) ||
            (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
            e.preventDefault();
            open();
        }
    });
})();
