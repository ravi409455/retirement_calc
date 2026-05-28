/**
 * Landing Page Interactions
 * Handles: sticky nav, mobile menu, smooth scroll, scroll reveals, FAQ accordion
 */

(function () {
  'use strict';

  // ─── Sticky Navbar ──────────────────────────────────────

  const nav = document.getElementById('main-nav');
  let lastScroll = 0;

  function handleNavScroll() {
    const scrollY = window.scrollY;
    if (scrollY > 50) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
    lastScroll = scrollY;
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // Initial check

  // ─── Mobile Hamburger Menu ──────────────────────────────

  const hamburger = document.getElementById('nav-hamburger');
  const navLinks = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('nav__links--open');
      hamburger.classList.toggle('nav__hamburger--active');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('nav__links--open');
        hamburger.classList.remove('nav__hamburger--active');
        document.body.style.overflow = '';
      });
    });
  }

  // ─── Smooth Scroll for Anchor Links ─────────────────────
  // CSS scroll-behavior:smooth on <html> handles the animation.
  // We just prevent the hash jump and use scrollIntoView with the
  // scroll-margin-top on target elements handling the nav offset.

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update URL hash without triggering a jump
        history.pushState(null, '', targetId);
      }
    });
  });

  // ─── Scroll-Triggered Reveal Animations ─────────────────

  const revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            observer.unobserve(entry.target); // Animate once
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    revealElements.forEach(el => observer.observe(el));
  } else {
    // Fallback: show all immediately
    revealElements.forEach(el => el.classList.add('reveal--visible'));
  }

  // ─── FAQ Accordion ──────────────────────────────────────

  document.querySelectorAll('.faq-item__q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('faq-item--open');

      // Close all other items
      document.querySelectorAll('.faq-item--open').forEach(openItem => {
        if (openItem !== item) {
          openItem.classList.remove('faq-item--open');
          openItem.querySelector('.faq-item__q').setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      item.classList.toggle('faq-item--open', !isOpen);
      btn.setAttribute('aria-expanded', !isOpen);
    });
  });

})();
