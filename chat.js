/* ============================================================
   Sunshine Assistant — client-side customer service bot
   Answers from a local knowledge base (no API key required),
   and hands off to WhatsApp / phone / email when it can't.
   ============================================================ */
(function () {
  'use strict';

  var PHONE_DISPLAY = '+6018-355 9191';
  var PHONE_TEL = '+60183559191';
  var WA = '60183559191';
  var EMAIL = 'contact@sunshinemedia.com.my';

  if (!window.SUNSHINE_KB) return;
  var KB = window.SUNSHINE_KB;

  // ---------- markup ----------
  var root = document.createElement('div');
  root.className = 'sun-chat';
  root.innerHTML =
    '<button class="sun-chat-fab" id="sunFab" aria-label="Open chat with Sunshine Assistant">' +
      '<svg class="sun-ico-chat" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 01-9 8.4 9.5 9.5 0 01-2.8-.4L4 21l1.6-4.1A8.3 8.3 0 013 11.5 8.4 8.4 0 0112 3a8.4 8.4 0 019 8.5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>' +
      '<svg class="sun-ico-close" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' +
      '<span class="sun-fab-dot"></span>' +
    '</button>' +
    '<div class="sun-panel" id="sunPanel" role="dialog" aria-label="Sunshine Assistant" aria-modal="false">' +
      '<div class="sun-head">' +
        '<div class="sun-head-id">' +
          '<img src="assets/logo.png" alt="" class="sun-head-logo">' +
          '<div><strong>Sunshine Assistant</strong><span><i class="sun-live"></i>Ask about signage, wraps &amp; fit-out</span></div>' +
        '</div>' +
        '<button class="sun-head-x" id="sunClose" aria-label="Close chat">' +
          '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="sun-log" id="sunLog" aria-live="polite"></div>' +
      '<div class="sun-chips" id="sunChips"></div>' +
      '<form class="sun-form" id="sunForm">' +
        '<input id="sunInput" type="text" autocomplete="off" placeholder="Type your question…" aria-label="Type your question">' +
        '<button type="submit" aria-label="Send message">' +
          '<svg viewBox="0 0 24 24"><path d="M3 20l18-8L3 4l4 8z" fill="currentColor"/></svg>' +
        '</button>' +
      '</form>' +
      '<p class="sun-foot">Automated assistant &middot; <a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">chat to a person</a></p>' +
    '</div>';
  document.body.appendChild(root);

  var fab = document.getElementById('sunFab');
  var panel = document.getElementById('sunPanel');
  var log = document.getElementById('sunLog');
  var chipBar = document.getElementById('sunChips');
  var form = document.getElementById('sunForm');
  var input = document.getElementById('sunInput');

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function bubble(who, html) {
    var d = document.createElement('div');
    d.className = 'sun-msg sun-' + who;
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function typing() {
    var d = document.createElement('div');
    d.className = 'sun-msg sun-bot sun-typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function botSay(html, chips) {
    var t = typing();
    var wait = Math.min(1100, 320 + html.length * 4);
    setTimeout(function () {
      t.remove();
      bubble('bot', html);
      if (chips) setChips(chips);
    }, wait);
  }

  function setChips(list) {
    chipBar.innerHTML = '';
    (list || []).forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sun-chip';
      b.textContent = c;
      b.addEventListener('click', function () { send(c); });
      chipBar.appendChild(b);
    });
  }

  var CONTACT_HTML =
    '<div class="sun-actions">' +
      '<a class="sun-act sun-act-wa" href="https://wa.me/' + WA + '" target="_blank" rel="noopener">WhatsApp us</a>' +
      '<a class="sun-act" href="tel:' + PHONE_TEL + '">Call ' + PHONE_DISPLAY + '</a>' +
      '<a class="sun-act" href="mailto:' + EMAIL + '">Email us</a>' +
    '</div>';

  // ---------- matching ----------
  var STOP = ('a an the is are do does can you your we our i my me of for to in on at it and or how what '
    + 'much many need want with please tell about there any').split(' ');

  function norm(s) {
    return String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function tokens(s) {
    return norm(s).split(' ').filter(function (w) {
      return w.length > 1 && STOP.indexOf(w) === -1;
    });
  }

  function score(query, entry) {
    var q = tokens(query);
    if (!q.length) return 0;
    var hay = norm((entry.q || '') + ' ' + (entry.k || []).join(' ') + ' ' + (entry.a || ''));
    var kw = norm((entry.k || []).join(' '));
    var s = 0;
    var kwList = (entry.k || []).map(function (x) { return norm(x); });
    q.forEach(function (w) {
      if (kw.indexOf(w) !== -1) s += 3;          // keyword hit weighs most
      else if (hay.indexOf(w) !== -1) s += 1;
      // CJK has no spaces: a query "word" may contain a keyword inside it
      else if (kwList.some(function (k) {
        return k.length > 1 && /[\u3400-\u9fff]/.test(k) && w.indexOf(k) !== -1;
      })) s += 3;
      // partial stem match
      else if (w.length > 4 && hay.indexOf(w.slice(0, w.length - 1)) !== -1) s += 0.6;
    });
    return s / Math.sqrt(q.length);
  }

  function findBest(query) {
    var best = null, bestScore = 0, runners = [];
    KB.forEach(function (e) {
      var s = score(query, e);
      if (s > bestScore) { bestScore = s; best = e; }
      if (s > 0) runners.push({ e: e, s: s });
    });
    runners.sort(function (a, b) { return b.s - a.s; });
    return { best: best, score: bestScore, runners: runners };
  }

  var DEFAULT_CHIPS = ['What do you do?', 'Signboard cost?', 'Vehicle wrap', 'Where are you?', 'Get a quote'];

  function send(text) {
    text = (text || '').trim();
    if (!text) return;
    bubble('me', esc(text));
    input.value = '';
    chipBar.innerHTML = '';

    if (tokens(text).length === 0) {
      var ov = KB[0];
      botSay('<p>' + esc(ov.a) + '</p>', DEFAULT_CHIPS);
      return;
    }

    var r = findBest(text);

    if (r.score >= 1.6 && r.best) {
      var html = '<p>' + esc(r.best.a) + '</p>';
      if (r.best.link) {
        html += '<p><a class="sun-inline" href="' + r.best.link[1] + '">' + esc(r.best.link[0]) + ' &rarr;</a></p>';
      }
      if (r.best.contact) html += CONTACT_HTML;
      var chips = r.runners.slice(1, 4).map(function (x) { return x.e.q; });
      botSay(html, chips.length ? chips : DEFAULT_CHIPS);
      return;
    }

    if (r.score > 0.7 && r.runners.length) {
      var opts = r.runners.slice(0, 3).map(function (x) { return x.e.q; });
      botSay('<p>I&rsquo;m not certain I understood. Did you mean one of these?</p>', opts.concat(['Talk to a person']));
      return;
    }

    botSay(
      '<p>I don&rsquo;t have a good answer for that one. The team can help you directly &mdash; ' +
      'send the site location, what you need, and your deadline.</p>' + CONTACT_HTML,
      DEFAULT_CHIPS
    );
  }

  // ---------- open / close ----------
  var opened = false;
  function openChat() {
    root.classList.add('is-open');
    document.body.classList.add('sun-chat-open');
    fab.setAttribute('aria-label', 'Close chat');
    panel.querySelector('.sun-fab-dot');
    document.querySelector('.sun-fab-dot').style.display = 'none';
    if (!opened) {
      opened = true;
      botSay(
        '<p>Hi! I&rsquo;m the Sunshine assistant. I can answer questions about our signage, ' +
        'vehicle wrapping, printing and fit-out work.</p><p>What are you looking for?</p>',
        DEFAULT_CHIPS
      );
    }
    setTimeout(function () { input.focus(); }, 260);
  }
  function closeChat() {
    root.classList.remove('is-open');
    document.body.classList.remove('sun-chat-open');
    fab.setAttribute('aria-label', 'Open chat with Sunshine Assistant');
  }

  fab.addEventListener('click', function () {
    root.classList.contains('is-open') ? closeChat() : openChat();
  });
  document.getElementById('sunClose').addEventListener('click', closeChat);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('is-open')) closeChat();
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    send(input.value);
  });
})();
