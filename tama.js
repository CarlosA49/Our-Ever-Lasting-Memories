/* ==========================================================================
   Tamagotchi virtual pet
   - 6 life stages (egg → baby → child → teen → adult → elder → dead)
   - 6 stats with decay-while-away (hunger, happy, energy, clean, health, discipline)
   - Actions: feed, snack, play (mini-game), bath, sleep, medicine, scold, status
   - Random events: poo, sickness, sleep at night
   - Persisted to localStorage as tama:v1
   - Day/night cycle reflects user's local clock
   - 3-button device controls (A/B/C) plus on-screen icons
   ========================================================================== */

(function () {
    'use strict';

    const KEY = 'tama:v1';

    // Stage thresholds, in minutes of (active-equivalent) age.
    // Real time progresses at 1x; bad care can speed up health-loss.
    const STAGE_AT = [
        { stage: 'egg',   atMin: 0 },
        { stage: 'baby',  atMin: 1.5 },
        { stage: 'child', atMin: 8 },
        { stage: 'teen',  atMin: 25 },
        { stage: 'adult', atMin: 90 },
        { stage: 'elder', atMin: 360 }
    ];

    const STAGE_INDEX = (s) => STAGE_AT.findIndex(x => x.stage === s);

    // Pixel-art sprites — 16x16 grid. ' ' transparent, otherwise palette key.
    // We render with absolute-positioned 4px squares (very lightweight).
    const PALETTE = {
        '.': null,
        'k': '#1c2a14', // dark line
        'w': '#ffffff',
        'p': '#ef6fae', // pink
        'P': '#d94d94', // dark pink
        'r': '#ff89bf', // rose
        'y': '#ffe17a', // yellow
        'b': '#5d2c4f', // plum
        'c': '#c5e0f6', // light blue
        'g': '#b6e3c6', // mint
        'O': '#ffaad0'  // light pink
    };

    const SPRITES = {
        egg: [
            '................',
            '......kkkk......',
            '....kkOOOOkk....',
            '...kOOOOOOOOk...',
            '..kOOPPPOPPOk...',
            '..kOOOOOOOOOk...',
            '.kOOPPOOOOPPOk..',
            '.kOOOOPPPOOOOk..',
            '.kOOOOOOOOOOOk..',
            '.kOOPPOOOOPPOk..',
            '.kOOOOPPPPOOOk..',
            '..kOOOOOOOOOk...',
            '..kOOOOOOOOOk...',
            '...kkOOOOOkk....',
            '.....kkkkk......',
            '................'
        ],
        baby: [
            '................',
            '.....pppppp.....',
            '....pPpppppp....',
            '...ppppppppp....',
            '...pp.kk.kk.....',
            '...pp.kk.kk.....',
            '...ppppwwppp....',
            '...ppwwwwwww....',
            '....ppwwwwp.....',
            '.....pppppp.....',
            '...pp.....pp....',
            '..pp.......pp...',
            '..p.........p...',
            '................',
            '................',
            '................'
        ],
        child: [
            '................',
            '....pppppppp....',
            '...ppPPpppPPp...',
            '..ppPPPpppPPP...',
            '..pp..k.k..pp...',
            '..pp..k.k..pp...',
            '..ppppppppppp...',
            '..pp.wwwww.pp...',
            '..pp.w....pp....',
            '...pp.wwwwp.....',
            '....pppppp......',
            '....pp...pp.....',
            '....p.....p.....',
            '...kk.....kk....',
            '................',
            '................'
        ],
        teen: [
            '................',
            '...PPpppppPP....',
            '..PPpppppppPP...',
            '.PpppppppppppP..',
            '.PPpp.kk.kk.pPP.',
            '.PPpp.kk.kk.pPP.',
            '.Ppppppwwppppp..',
            '..pppwwwwwwppp..',
            '..pppwwwwwppp...',
            '...pppppppp.....',
            '..pp.pp.pp.pp...',
            '..pp.pp.pp.pp...',
            '..p..p...p..p...',
            '..k..k...k..k...',
            '................',
            '................'
        ],
        adult: [
            '................',
            '..PPPppppPPPP...',
            '.PpppppppppPP...',
            'PpppppppppppPP..',
            'PPpp.bb.bb.pPP..',
            'PPpp.bb.bb.pPP..',
            'PpppppwwppppP...',
            '.PpppwwwwppppP..',
            '..pppwwwwwppp...',
            '...ppppppppp....',
            '...pp.pp.pp.....',
            '...pp.pp.pp.....',
            '...p...p...p....',
            '...k...k...k....',
            '................',
            '................'
        ],
        elder: [
            '................',
            '..wwppppppppww..',
            '.wpppppppppppw..',
            '.wpppppppppppw..',
            '.wpp.kk..kk.ppw.',
            '.wpp.kk..kk.ppw.',
            '.wpppppwwppppw..',
            '.wpppwwwwwwppw..',
            '..ppwwwwwwppp...',
            '...pppppppp.....',
            '..pp.pp.pp.pp...',
            '..pp.pp.pp.pp...',
            '..pp..p..p..pp..',
            '..kk..k..k..kk..',
            '................',
            '................'
        ],
        ghost: [
            '................',
            '....wwwwwww.....',
            '..wwwwwwwwwww...',
            '.wwwwwwwwwwwww..',
            '.wwk.k.k.k.kww..',
            '.wwwwwwwwwwwww..',
            '.wwwwwwwwwwwww..',
            '.wwwwwwwwwwwww..',
            '.wwwwwwwwwwwww..',
            '.w.www.www.www..',
            '..w...w...w.....',
            '................',
            '................',
            '................',
            '................',
            '................'
        ]
    };

    function paintSprite(el, key, opts) {
        const grid = SPRITES[key];
        if (!grid) { el.innerHTML = ''; return; }
        const cell = (opts && opts.cell) || 4;
        el.style.width  = (cell * 16) + 'px';
        el.style.height = (cell * 16) + 'px';
        const frag = document.createDocumentFragment();
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const ch = grid[y][x];
                if (ch === '.' || ch === ' ') continue;
                const color = PALETTE[ch];
                if (!color) continue;
                const px = document.createElement('div');
                px.className = 'px';
                px.style.left = (x * cell) + 'px';
                px.style.top  = (y * cell) + 'px';
                px.style.width = cell + 'px';
                px.style.height = cell + 'px';
                px.style.background = color;
                frag.appendChild(px);
            }
        }
        el.innerHTML = '';
        el.appendChild(frag);
    }

    // ---- State -------------------------------------------------------------

    function defaultState() {
        return {
            phase: 'hatch',           // 'hatch' | 'main' | 'menu' | 'mini' | 'status' | 'dead'
            name: '',
            stage: 'egg',
            ageMin: 0,
            birthAt: 0,
            lastUpdated: Date.now(),
            asleep: false,
            sick: false,
            poos: 0,
            careMisses: 0,
            disciplineEvents: 0,
            stats: {
                hunger: 70,    // higher = more hungry (bad)
                happy:  80,
                energy: 85,
                clean:  90,
                health: 95,
                discipline: 50
            },
            menuFocus: 0,
            mini: null,
            history: []
        };
    }

    let state = load();
    let saveTimer = null;
    function save() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
        }, 250);
    }
    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) return Object.assign(defaultState(), JSON.parse(raw));
        } catch (e) {}
        return defaultState();
    }

    // ---- DOM ---------------------------------------------------------------

    const root = document.getElementById('tama-root');
    if (!root) return;
    const screen = root.querySelector('#tama-screen');
    const sprite = root.querySelector('#tama-sprite');
    const pooEl  = root.querySelector('#tama-poo');
    const zzzEl  = root.querySelector('#tama-zzz');
    const bubbleEl = root.querySelector('#tama-bubble');
    const nameEl = root.querySelector('#tama-pet-name');
    const ageEl  = root.querySelector('#tama-pet-age');

    const bars = {
        hunger:     root.querySelector('#bar-hunger'),
        happy:      root.querySelector('#bar-happy'),
        energy:     root.querySelector('#bar-energy'),
        clean:      root.querySelector('#bar-clean'),
        health:     root.querySelector('#bar-health'),
        discipline: root.querySelector('#bar-discipline')
    };

    const views = {
        hatch:  root.querySelector('[data-view="hatch"]'),
        main:   root.querySelector('[data-view="main"]'),
        mini:   root.querySelector('[data-view="mini"]'),
        status: root.querySelector('[data-view="status"]'),
        dead:   root.querySelector('[data-view="dead"]')
    };
    const menu = root.querySelector('#tama-menu');
    const menuItems = root.querySelectorAll('.tama-mi');
    const miniCard = root.querySelector('#mini-card');
    const miniScore = root.querySelector('#mini-score');
    const statusList = root.querySelector('#tama-status-list');
    const deadSummary = root.querySelector('#tama-dead-summary');

    // ---- Helpers -----------------------------------------------------------

    function blip(f, d, t) { if (window.OELM && OELM.blip) OELM.blip(f, d, t); }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function showView(name) {
        Object.entries(views).forEach(([k, el]) => { el.hidden = (k !== name); });
        // hide overlays unless current
        menu.hidden = (name !== 'menu');
        if (name === 'menu') views.main.hidden = false; // menu overlays main
        state.phase = name;
        save();
    }
    function isNight() {
        const h = new Date().getHours();
        return h >= 22 || h < 6;
    }
    function stageFromAge(min) {
        let s = 'egg';
        for (const row of STAGE_AT) if (min >= row.atMin) s = row.stage;
        return s;
    }

    // ---- Tick / decay ------------------------------------------------------

    function tick(force) {
        const now = Date.now();
        const elapsedMs = Math.max(0, now - state.lastUpdated);
        if (!force && elapsedMs < 200) return;
        const elapsedMin = elapsedMs / 60000;
        state.lastUpdated = now;

        // Sleep auto-toggle at night
        if (state.stage !== 'dead') {
            state.asleep = isNight() ? true : state.asleep && state.stats.energy < 60;
        }

        // Decay
        if (state.stage !== 'dead' && state.stage !== 'egg') {
            state.ageMin += elapsedMin;
            const s = state.stats;
            s.hunger = clamp(s.hunger + 0.6 * elapsedMin, 0, 100);
            s.happy  = clamp(s.happy  - 0.5 * elapsedMin, 0, 100);
            s.energy = clamp(s.energy + (state.asleep ? 0.8 : -0.4) * elapsedMin, 0, 100);
            s.clean  = clamp(s.clean  - (0.3 + state.poos * 0.4) * elapsedMin, 0, 100);

            // Health pressures
            let healthDelta = 0;
            if (s.hunger > 85) healthDelta -= 0.3 * elapsedMin;
            if (s.happy  < 20) healthDelta -= 0.2 * elapsedMin;
            if (s.clean  < 25) healthDelta -= 0.25 * elapsedMin;
            if (state.sick)    healthDelta -= 0.6 * elapsedMin;
            if (state.asleep && s.hunger < 60) healthDelta += 0.15 * elapsedMin;
            s.health = clamp(s.health + healthDelta, 0, 100);

            // Random events (probabilistic per minute elapsed, bounded)
            const evChance = clamp(elapsedMin * 0.03, 0, 0.4);
            if (!state.sick && Math.random() < evChance * 0.4 && s.hunger > 70) state.sick = true;
            if (Math.random() < evChance * 0.6 && state.poos < 3) state.poos += 1;

            // Stage advance
            const newStage = stageFromAge(state.ageMin);
            if (STAGE_INDEX(newStage) > STAGE_INDEX(state.stage)) {
                state.stage = newStage;
                state.history.push({ at: now, evt: 'evolved-' + newStage });
                blip(880, 0.18); blip(1100, 0.2);
                bubble('✨');
            }

            // Death
            if (s.health <= 0) {
                state.stage = 'dead';
                state.history.push({ at: now, evt: 'died', age: Math.round(state.ageMin) });
                showView('dead');
                deadSummary.textContent = (state.name || 'Pet') + ' lived ' + formatAge(state.ageMin);
            }
        }

        save();
        render();
    }

    // ---- Render ------------------------------------------------------------

    function render() {
        // Day/night
        screen.classList.toggle('is-night', isNight());

        // View routing
        if (state.phase === 'hatch') { showView('hatch'); paintSprite(views.hatch.querySelector('.tama-pixel'), 'egg', { cell: 5 }); return; }
        if (state.phase === 'dead')  { showView('dead');  paintSprite(views.dead.querySelector('.tama-pixel'), 'ghost', { cell: 5 }); return; }
        if (state.phase === 'mini')  { showView('mini'); return; }
        if (state.phase === 'status'){ showView('status'); renderStatusList(); return; }
        if (state.phase === 'menu')  { showView('menu'); highlightMenu(); return; }

        showView('main');

        // Sprite
        paintSprite(sprite, state.stage, { cell: 5 });
        sprite.classList.toggle('is-sick', state.sick);

        // Indicators
        zzzEl.hidden = !state.asleep;
        pooEl.hidden = state.poos === 0;
        pooEl.textContent = state.poos > 1 ? '💩×' + state.poos : '💩';

        nameEl.textContent = state.name || '—';
        ageEl.textContent  = formatAge(state.ageMin);

        renderBars();
    }

    function renderBars() {
        const s = state.stats;
        const set = (el, key, invert) => {
            if (!el) return;
            const v = invert ? (100 - s[key]) : s[key];
            el.style.width = v + '%';
            el.classList.toggle('warn',   v > 0 && v <= 50);
            el.classList.toggle('danger', v > 0 && v <= 25);
        };
        set(bars.hunger,     'hunger', true);
        set(bars.happy,      'happy',  false);
        set(bars.energy,     'energy', false);
        set(bars.clean,      'clean',  false);
        set(bars.health,     'health', false);
        set(bars.discipline, 'discipline', false);
    }

    function renderStatusList() {
        statusList.innerHTML = '';
        const rows = [
            ['Name',       state.name || '—'],
            ['Stage',      state.stage],
            ['Age',        formatAge(state.ageMin)],
            ['Hunger',     Math.round(100 - state.stats.hunger) + '%'],
            ['Happiness',  Math.round(state.stats.happy) + '%'],
            ['Energy',     Math.round(state.stats.energy) + '%'],
            ['Hygiene',    Math.round(state.stats.clean) + '%'],
            ['Health',     Math.round(state.stats.health) + '%'],
            ['Discipline', Math.round(state.stats.discipline) + '%'],
            ['Sleeping',   state.asleep ? 'Yes' : 'No'],
            ['Sick',       state.sick ? 'Yes' : 'No'],
            ['Poo',        state.poos]
        ];
        rows.forEach(([k, v]) => {
            const li = document.createElement('li');
            li.innerHTML = '<span>' + k + '</span><b>' + v + '</b>';
            statusList.appendChild(li);
        });
    }

    function formatAge(min) {
        const t = Math.max(0, Math.floor(min));
        const d = Math.floor(t / 1440);
        const h = Math.floor((t % 1440) / 60);
        const m = t % 60;
        if (d > 0) return d + 'd ' + h + 'h';
        if (h > 0) return h + 'h ' + m + 'm';
        return m + 'm';
    }

    function bubble(em) {
        bubbleEl.textContent = em;
        bubbleEl.hidden = false;
        clearTimeout(bubble._t);
        bubble._t = setTimeout(() => { bubbleEl.hidden = true; }, 900);
    }

    // ---- Actions -----------------------------------------------------------

    function feed(big) {
        if (state.stage === 'egg' || state.stage === 'dead') return;
        if (state.asleep) { bubble('😴'); blip(330); return; }
        const s = state.stats;
        if (big) {
            s.hunger = clamp(s.hunger - 30, 0, 100);
            s.energy = clamp(s.energy + 6, 0, 100);
        } else {
            s.hunger = clamp(s.hunger - 12, 0, 100);
            s.happy  = clamp(s.happy + 8, 0, 100);
            s.health = clamp(s.health - 1, 0, 100);
        }
        sprite.classList.add('is-eating'); setTimeout(() => sprite.classList.remove('is-eating'), 400);
        bubble(big ? '🍔' : '🍰');
        blip(720, 0.12, 'triangle');
        save(); render();
    }

    function play() {
        if (state.stage === 'egg' || state.stage === 'dead') return;
        if (state.asleep) { bubble('😴'); return; }
        startMini();
    }

    function bath() {
        if (state.stage === 'dead') return;
        state.poos = 0;
        state.stats.clean = 100;
        bubble('🛁');
        blip(900, 0.2);
        save(); render();
    }

    function toggleSleep() {
        if (state.stage === 'dead' || state.stage === 'egg') return;
        state.asleep = !state.asleep;
        bubble(state.asleep ? '🌙' : '☀️');
        blip(state.asleep ? 440 : 660);
        save(); render();
    }

    function medicine() {
        if (state.stage === 'dead') return;
        if (!state.sick) { bubble('🙅'); blip(280); return; }
        state.sick = false;
        state.stats.health = clamp(state.stats.health + 18, 0, 100);
        bubble('💊');
        blip(680, 0.18, 'triangle'); blip(820, 0.18, 'triangle');
        save(); render();
    }

    function scold() {
        if (state.stage === 'dead' || state.stage === 'egg') return;
        state.stats.discipline = clamp(state.stats.discipline + 12, 0, 100);
        state.stats.happy = clamp(state.stats.happy - 6, 0, 100);
        state.disciplineEvents++;
        bubble('📣');
        blip(220, 0.2, 'square');
        save(); render();
    }

    function showStatus() {
        showView('status');
        renderStatusList();
        blip(620, 0.08);
    }

    // ---- Mini-game (Higher / Lower) ---------------------------------------

    function startMini() {
        state.mini = { round: 1, max: 5, current: 1 + Math.floor(Math.random() * 9), score: 0 };
        miniCard.textContent = state.mini.current;
        miniScore.textContent = 'Round 1 / 5  •  Score 0';
        showView('mini');
    }
    function miniGuess(direction) {
        if (!state.mini) return;
        const next = 1 + Math.floor(Math.random() * 9);
        const correct = (direction === 'higher' && next > state.mini.current) ||
                        (direction === 'lower'  && next < state.mini.current) ||
                        (next === state.mini.current); // tie always counts
        if (correct) { state.mini.score++; blip(880, 0.1, 'triangle'); }
        else         { blip(220, 0.18, 'square'); }
        state.mini.current = next;
        state.mini.round++;
        miniCard.textContent = next;
        miniScore.textContent = 'Round ' + Math.min(state.mini.round, state.mini.max) + ' / 5  •  Score ' + state.mini.score;
        if (state.mini.round > state.mini.max) {
            const score = state.mini.score;
            state.stats.happy = clamp(state.stats.happy + score * 5, 0, 100);
            state.stats.energy = clamp(state.stats.energy - 6, 0, 100);
            state.mini = null;
            blip(660); blip(880); blip(1100);
            showView('main');
            bubble(score >= 3 ? '🎉' : '🤝');
            save(); render();
        }
    }

    // ---- Menu navigation ---------------------------------------------------

    function highlightMenu() {
        menuItems.forEach((b, i) => b.classList.toggle('is-focused', i === state.menuFocus));
    }
    function openMenu() {
        if (state.stage === 'dead' || state.stage === 'egg') return;
        showView('menu');
    }
    function moveMenu(dir) {
        state.menuFocus = (state.menuFocus + dir + menuItems.length) % menuItems.length;
        highlightMenu();
        blip(540, 0.05);
    }
    function selectMenu() {
        const action = menuItems[state.menuFocus].dataset.action;
        runAction(action);
    }
    function runAction(action) {
        switch (action) {
            case 'feed':     feed(true); break;
            case 'snack':    feed(false); break;
            case 'play':     play(); break;
            case 'bath':     bath(); break;
            case 'sleep':    toggleSleep(); break;
            case 'medicine': medicine(); break;
            case 'scold':    scold(); break;
            case 'status':   showStatus(); break;
        }
        if (state.phase !== 'mini' && state.phase !== 'status' && state.phase !== 'dead') {
            showView('main');
        }
    }

    // ---- Hatch / revive ----------------------------------------------------

    function hatch() {
        const inp = document.getElementById('tama-name');
        const name = (inp.value || '').trim().slice(0, 10) || 'Pookie';
        state = defaultState();
        state.name = name;
        state.stage = 'baby';
        state.phase = 'main';
        state.birthAt = Date.now();
        state.lastUpdated = Date.now();
        save();
        blip(523, 0.1); blip(659, 0.1); blip(784, 0.1); blip(988, 0.16);
        render();
    }

    function revive() {
        state = defaultState();
        state.phase = 'hatch';
        save();
        render();
    }

    // ---- Wire UI -----------------------------------------------------------

    root.querySelector('#tama-hatch').addEventListener('click', hatch);
    root.querySelector('#tama-revive').addEventListener('click', revive);
    root.querySelectorAll('.tama-mi').forEach(b => {
        b.addEventListener('click', () => runAction(b.dataset.action));
    });
    root.querySelectorAll('[data-mini]').forEach(b => {
        b.addEventListener('click', () => miniGuess(b.dataset.mini));
    });
    root.querySelector('[data-close-status]').addEventListener('click', () => { showView('main'); render(); });
    root.querySelectorAll('.tama-btn').forEach(b => {
        b.addEventListener('click', () => {
            const k = b.dataset.btn;
            if (state.phase === 'hatch') { if (k === 'B') hatch(); return; }
            if (state.phase === 'dead')  { if (k === 'B') revive(); return; }
            if (state.phase === 'mini')  {
                if (k === 'A') miniGuess('lower');
                else if (k === 'B') miniGuess('higher');
                else if (k === 'C') { state.mini = null; showView('main'); render(); }
                return;
            }
            if (state.phase === 'status') { if (k === 'C' || k === 'B') { showView('main'); render(); } return; }
            if (state.phase === 'menu') {
                if (k === 'A') moveMenu(1);
                else if (k === 'B') selectMenu();
                else if (k === 'C') { showView('main'); render(); }
                return;
            }
            // main
            if (k === 'A') openMenu();
            else if (k === 'B') play();
            else if (k === 'C') showStatus();
        });
    });

    // ---- Loops -------------------------------------------------------------

    setInterval(() => tick(false), 5000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(true); });
    window.addEventListener('focus', () => tick(true));

    // ---- First boot --------------------------------------------------------

    if (state.phase === 'hatch' || !state.name) {
        showView('hatch');
        paintSprite(views.hatch.querySelector('.tama-pixel'), 'egg', { cell: 5 });
    } else if (state.stage === 'dead') {
        showView('dead');
        paintSprite(views.dead.querySelector('.tama-pixel'), 'ghost', { cell: 5 });
        deadSummary.textContent = (state.name || 'Pet') + ' lived ' + formatAge(state.ageMin);
    } else {
        // Apply offline decay since last save
        tick(true);
    }
    render();
})();
