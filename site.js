/* ==========================================================================
   Our Ever Lasting Memories — shared site behaviour
   - Injects the shared navbar into <div id="site-nav"> on every page
   - Marks the active link
   - Applies scroll-reveal via IntersectionObserver
   - Sprinkles a soft floating-hearts background
   - Exposes a tiny WebAudio "blip" helper
   - Hides the nav on scroll-down, shows on scroll-up
   ========================================================================== */

(function () {
    'use strict';

    /* ---------- Shared navbar ------------------------------------------- */

    const NAV_LINKS = [
        { href: 'index.html',     label: 'Home' },
        { href: 'About us.html',  label: 'About Us' },
        { href: 'Locations.html', label: 'Locations' },
        { href: 'milestone.html', label: 'Milestones' },
        { href: 'games.html',     label: 'Games' },
        { href: 'Spotify.html',   label: 'Spotify' }
    ];

    function currentPage() {
        let p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (!p) p = 'index.html';
        return decodeURIComponent(p);
    }

    function buildNav(mount) {
        const here = currentPage();
        const nav = document.createElement('nav');
        nav.className = 'site-nav';
        nav.setAttribute('aria-label', 'Primary');

        const brand = document.createElement('a');
        brand.className = 'site-nav__brand';
        brand.href = 'index.html';
        brand.innerHTML = '<span class="heart" aria-hidden="true">♥</span><span>Carlos &amp; Ishi</span>';
        nav.appendChild(brand);

        const toggle = document.createElement('button');
        toggle.className = 'site-nav__toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Toggle navigation');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
        nav.appendChild(toggle);

        const ul = document.createElement('ul');
        ul.className = 'site-nav__links';
        NAV_LINKS.forEach(l => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = l.href;
            a.textContent = l.label;
            if (l.href.toLowerCase() === here) a.classList.add('is-active');
            li.appendChild(a);
            ul.appendChild(li);
        });
        nav.appendChild(ul);

        toggle.addEventListener('click', () => {
            const open = nav.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', String(open));
        });

        mount.replaceWith(nav);

        // Hide on scroll-down, reveal on scroll-up
        let lastY = window.scrollY;
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = window.scrollY;
                if (y > lastY + 8 && y > 120) nav.classList.add('is-hidden');
                else if (y < lastY - 4) nav.classList.remove('is-hidden');
                lastY = y;
                ticking = false;
            });
        }, { passive: true });
    }

    /* ---------- Footer -------------------------------------------------- */

    function buildFooter(mount) {
        const f = document.createElement('footer');
        f.className = 'site-footer';
        f.innerHTML =
            '<p>Made with <span class="heart" aria-hidden="true">♥</span> for my pookie. ' +
            'Our Ever Lasting Memories &middot; ' +
            new Date().getFullYear() + '</p>';
        mount.replaceWith(f);
    }

    /* ---------- Scroll reveal ------------------------------------------ */

    function initReveal() {
        const items = document.querySelectorAll('.reveal');
        if (!('IntersectionObserver' in window) || !items.length) {
            items.forEach(el => el.classList.add('is-visible'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        items.forEach(el => io.observe(el));
    }

    /* ---------- Floating hearts background ----------------------------- */

    function startHeartShower(count) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const layer = document.createElement('div');
        layer.className = 'heart-shower';
        layer.setAttribute('aria-hidden', 'true');
        const glyphs = ['♥', '♡', '✿', '❀', '✦'];
        for (let i = 0; i < count; i++) {
            const s = document.createElement('span');
            s.textContent = glyphs[i % glyphs.length];
            const size = 12 + Math.random() * 22;
            s.style.left = (Math.random() * 100) + '%';
            s.style.fontSize = size + 'px';
            s.style.opacity = (0.18 + Math.random() * 0.4).toFixed(2);
            s.style.animationDuration = (10 + Math.random() * 16) + 's';
            s.style.animationDelay = (-Math.random() * 16) + 's';
            layer.appendChild(s);
        }
        document.body.appendChild(layer);
    }

    /* ---------- Tiny audio helper -------------------------------------- */

    let audioCtx = null;
    function blip(freq, dur, type) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const t = audioCtx.currentTime;
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = type || 'sine';
            o.frequency.value = freq || 660;
            g.gain.value = 0.0001;
            o.connect(g); g.connect(audioCtx.destination);
            g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.18));
            o.start(t);
            o.stop(t + (dur || 0.18) + 0.02);
        } catch (e) { /* audio not allowed yet */ }
    }
    function chord(freqs, dur) { freqs.forEach((f, i) => setTimeout(() => blip(f, dur || 0.16, 'triangle'), i * 60)); }

    window.OELM = { blip, chord };

    /* ---------- Init ---------------------------------------------------- */

    function init() {
        const navMount = document.getElementById('site-nav');
        if (navMount) buildNav(navMount);
        else if (!document.querySelector('.site-nav')) {
            const auto = document.createElement('div');
            auto.id = 'site-nav';
            document.body.insertBefore(auto, document.body.firstChild);
            buildNav(auto);
        }
        const footMount = document.getElementById('site-footer');
        if (footMount) buildFooter(footMount);

        if (!document.querySelector('.bg-hearts')) {
            const bg = document.createElement('div');
            bg.className = 'bg-hearts';
            bg.setAttribute('aria-hidden', 'true');
            document.body.appendChild(bg);
        }
        if (document.body.dataset.hearts !== 'off') {
            startHeartShower(parseInt(document.body.dataset.hearts || '14', 10));
        }
        initReveal();
        document.body.classList.add('page-enter');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
