// =====================================================
// TI Baseball - shared site JS
// =====================================================

// ---------- Cal.com embed (lazy-loaded) ----------
// The Cal namespace is `tibaseball`. Brand color = TI Baseball teal,
// dark theme matches the hero. Click any element with data-cal-link
// to open the booking modal. The actual cal.com username + event slugs
// will be filled in once Coach finishes Cal.com signup.
(function (C, A, L) {
  let p = function (a, ar) { a.q.push(ar); };
  let d = C.document;
  C.Cal = C.Cal || function () {
    let cal = C.Cal, ar = arguments;
    if (!cal.loaded) {
      cal.ns = {}; cal.q = cal.q || [];
      d.head.appendChild(d.createElement("script")).src = A;
      cal.loaded = true;
    }
    if (ar[0] === L) {
      const api = function () { p(api, arguments); };
      const ns = ar[1]; api.q = api.q || [];
      if (typeof ns === "string") {
        cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ["initNamespace", ns]);
      } else { p(cal, ar); }
      return;
    }
    p(cal, ar);
  };
})(window, "https://app.cal.com/embed/embed.js", "init");

Cal("init", "tibaseball", { origin: "https://cal.com" });
Cal.ns.tibaseball("ui", {
  theme: "dark",
  styles: { branding: { brandColor: "#1FBFC4" } },
  hideEventTypeDetails: false,
  layout: "month_view"
});

// After someone books the recurring weekly 1-on-1 slot in Cal.com, send them
// straight to the Stripe Payment Link to start their $80/week subscription.
// Cal.com free tier can't do this with successRedirectUrl, so we listen for
// the bookingSuccessful embed event and redirect on the client side instead.
const POST_BOOK_REDIRECTS = {
  '1-on-1-weekly-slot': 'https://buy.stripe.com/dRm00k1fG1PsfCTbk01ZS03'
};
Cal.ns.tibaseball("on", {
  action: "bookingSuccessful",
  callback: function (e) {
    try {
      const d = (e && e.detail && e.detail.data) || {};
      // Cal.com puts the event slug in a few different places depending on
      // booking type — check all of them so we don't miss it.
      const slug =
        (d.eventType && d.eventType.slug) ||
        (d.confirmationPageData && d.confirmationPageData.eventType && d.confirmationPageData.eventType.slug) ||
        (d.booking && d.booking.eventType && d.booking.eventType.slug) ||
        '';
      const url = POST_BOOK_REDIRECTS[slug];
      if (url) {
        // Tiny delay so Cal.com's confirmation animation can paint before we navigate.
        setTimeout(function () { window.location.href = url; }, 400);
      }
    } catch (err) { /* don't break the booking confirmation if redirect fails */ }
  }
});

(function () {
  'use strict';

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // close menu after clicking a nav link on mobile
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 820) {
          links.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  // Highlight active nav item based on the current page
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // Contact form basic UX (the form itself posts to Formspree placeholder)
  const form = document.querySelector('form.contact-form');
  const msg = document.querySelector('.form-msg');
  if (form && msg) {
    form.addEventListener('submit', (e) => {
      // Show a friendly confirmation. The form action will still submit
      // to whatever endpoint you configure (Formspree, Netlify Forms, etc.)
      // If the action attribute is the placeholder, intercept and show message only.
      const action = form.getAttribute('action') || '';
      if (action.includes('YOUR_FORM_ID') || action === '#') {
        e.preventDefault();
        msg.textContent = "Thanks! Your message is ready — replace the form action with your Formspree endpoint to start receiving submissions.";
        msg.classList.add('show');
        form.reset();
      } else {
        // let the form submit normally; show success state if we're staying on page
        setTimeout(() => {
          msg.textContent = "Thanks — your message was sent. Coach will be in touch soon.";
          msg.classList.add('show');
        }, 100);
      }
    });
  }

  // Footer year
  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

})();

// ---------- Top ribbon: detect logged-in state ----------
// Probes /api/me; if authenticated, flip the "Sign In" button to "My Account".
(function () {
  var btn = document.getElementById('top-ribbon-login-btn');
  if (!btn) return;
  // Skip on login/signup pages — those should always say "Sign In"
  var path = window.location.pathname.replace(/\.html$/, '');
  if (path === '/login' || path === '/signup') return;
  fetch('/api/me', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.authenticated) {
        if (d.isAdmin) {
          btn.href = '/admin';
          var span = btn.querySelector('span');
          if (span) span.textContent = 'Admin';
        } else {
          btn.href = '/dashboard';
          var span = btn.querySelector('span');
          if (span) span.textContent = 'My Account';
        }
      }
    })
    .catch(function () { /* silent — leave button as "Sign In" */ });
})();
