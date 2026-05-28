// =====================================================
// TOI Baseball Training - shared site JS
// =====================================================

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
