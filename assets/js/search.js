/*
 * Client-side search over /index.json.
 *
 * The corpus is small (one JSON document covering every writeup), so this is a
 * plain substring scan rather than a search library. The index is fetched
 * lazily on first open, so it never competes with the article itself for
 * bandwidth on a phone.
 */
(function () {
    'use strict';

    var dialog = document.getElementById('search-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    var input = document.getElementById('search-input');
    var list = document.getElementById('search-results');
    var status = document.getElementById('search-status');

    var index = null;
    var loading = null;
    var active = -1;
    var hits = [];

    function load() {
        if (loading) return loading;

        loading = fetch((window.SV && window.SV.searchIndex) || '/index.json')
            .then(function (r) { return r.json(); })
            .then(function (data) { index = data; })
            .catch(function () {
                index = [];
                status.textContent = 'search index unavailable';
            });

        return loading;
    }

    function escapeHTML(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    /*
     * Highlight the matched run. The slice is computed on the RAW text and each
     * piece escaped afterwards -- escaping first and then slicing by the raw
     * query's length shifts every index past an entity ("&" becomes "&amp;")
     * and can cut one in half.
     */
    function mark(text, query) {
        var at = text.toLowerCase().indexOf(query.toLowerCase());
        if (at < 0) return escapeHTML(text);

        return escapeHTML(text.slice(0, at)) +
               '<mark>' + escapeHTML(text.slice(at, at + query.length)) + '</mark>' +
               escapeHTML(text.slice(at + query.length));
    }

    /* A short window of body text around the first match, for context. */
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
        list.innerHTML = '';
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

        list.innerHTML = hits.map(function (hit, n) {
            return '<a class="sv-result" role="option" aria-selected="false" ' +
                       'id="search-hit-' + n + '" href="' + escapeHTML(hit.permalink) + '" ' +
                       'data-umami-event="click: search-result">' +
                       '<span class="block font-mono text-sm text-heading">' +
                           '<span class="text-accent-light" aria-hidden="true">&gt; </span>' +
                           mark(hit.title, query) +
                       '</span>' +
                       '<span class="sv-label mt-1 block normal-case">' +
                           (hit.category ? escapeHTML(hit.category) + ' / ' : '') +
                           escapeHTML(hit.formattedDate || '') +
                       '</span>' +
                       '<span class="mt-1 block text-xs leading-relaxed text-muted">' +
                           mark(snippet(hit.content || '', query), query) +
                       '</span>' +
                   '</a>';
        }).join('');
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

    /* Clicking the backdrop closes; clicking the panel must not. */
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

    /* "/" and Ctrl/Cmd-K open search, but never while the user is typing. */
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
