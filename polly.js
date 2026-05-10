/* ==========================================================================
   Polly Pocket — heart-compact dollhouse
   - 4 rooms (bedroom / kitchen / living / garden) + dress-up room
   - Drag stickers from tray to stage; reposition by drag; trash to remove
   - 2 dolls (Carlos + Ishi) with 5 outfit slots each (hair, top, bottom, shoes, acc)
   - Per-room theme switcher (3 wallpaper variants)
   - Snapshot to PNG
   - Persisted in localStorage as polly:v2
   - Sound blips via window.OELM
   ========================================================================== */

(function () {
    'use strict';

    const KEY = 'polly:v2';

    // ---- Data --------------------------------------------------------------

    const ROOMS = ['bedroom', 'kitchen', 'living', 'garden'];

    const STICKERS = {
        dolls: [], // dolls handled separately
        furniture: ['🛏️','🛋️','🪑','🪟','🚪','🪞','💺','🛁','🚿','🛗','🪤','📺','🖼️','🪜','🧸','📚','🛏','🕯️','🛒','🛏️'],
        food:      ['🍰','🧁','🍩','🍪','🍫','🍦','🍓','🍒','🍇','🍑','🍉','🍕','🍔','🍝','🍜','🍣','🍱','🍙','🍡','☕'],
        plants:    ['🌷','🌹','🌻','🌼','🌸','🌺','🪻','🪴','🌱','🌳','🌴','🌵','🍀','🍄','💐','🌾','🪷','🌲','☘️','🌿'],
        pets:      ['🐶','🐱','🐰','🐻','🐼','🐨','🦊','🐹','🐭','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦄','🐢'],
        hearts:    ['❤️','💖','💗','💓','💞','💕','💘','💝','💟','♥️','💌','💋','✨','⭐','🌟','💎','🎀','🎈','🎁','🪄']
    };

    // outfit pieces (emoji-layered)
    const OUTFITS = {
        hair: [
            { id: 'h0', label: '👩' },     // default
            { id: 'h1', label: '👱‍♀️' },
            { id: 'h2', label: '👩‍🦰' },
            { id: 'h3', label: '👩‍🦱' },
            { id: 'h4', label: '👩‍🦳' },
            { id: 'h5', label: '👨' },
            { id: 'h6', label: '🧑‍🦱' },
            { id: 'h7', label: '🧑‍🦳' }
        ],
        top: [
            { id: 't0', label: '👚' },
            { id: 't1', label: '👕' },
            { id: 't2', label: '🧥' },
            { id: 't3', label: '🥼' },
            { id: 't4', label: '🦺' },
            { id: 't5', label: '👔' }
        ],
        bottom: [
            { id: 'b0', label: '👖' },
            { id: 'b1', label: '🩳' },
            { id: 'b2', label: '👗' },
            { id: 'b3', label: '👘' },
            { id: 'b4', label: '🩱' }
        ],
        shoes: [
            { id: 's0', label: '👟' },
            { id: 's1', label: '👠' },
            { id: 's2', label: '🥿' },
            { id: 's3', label: '🥾' },
            { id: 's4', label: '👢' },
            { id: 's5', label: '🩴' }
        ],
        acc: [
            { id: 'a0', label: '🎀' },
            { id: 'a1', label: '👑' },
            { id: 'a2', label: '🕶️' },
            { id: 'a3', label: '💍' },
            { id: 'a4', label: '🧢' },
            { id: 'a5', label: '🌸' }
        ]
    };

    const DOLLS = ['ishi', 'carlos'];
    const DOLL_GLYPH = { ishi: '👩', carlos: '👨' };

    // ---- State -------------------------------------------------------------

    const defaultState = () => ({
        active: 'bedroom',
        themes: { bedroom: 0, kitchen: 0, living: 0, garden: 0 },
        placed: { bedroom: [], kitchen: [], living: [], garden: [] },
        dolls: {
            ishi:   { room: 'bedroom', x: 30, y: 60, outfit: { hair: 'h2', top: 't0', bottom: 'b2', shoes: 's1', acc: 'a0' } },
            carlos: { room: 'bedroom', x: 65, y: 60, outfit: { hair: 'h5', top: 't1', bottom: 'b0', shoes: 's0', acc: 'a4' } }
        },
        opened: false,
        tray: 'dolls',
        dressUpDoll: 'ishi'
    });

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
            if (raw) {
                const parsed = JSON.parse(raw);
                return Object.assign(defaultState(), parsed);
            }
        } catch (e) {}
        return defaultState();
    }

    // ---- DOM refs ----------------------------------------------------------

    const root = document.getElementById('polly-root');
    if (!root) return;
    const stage = root.querySelector('#polly-stage');
    const placedLayer = root.querySelector('.placed');
    const dollsLayer = root.querySelector('.dolls');
    const trashEl = root.querySelector('#polly-trash');
    const trayEl = root.querySelector('#polly-tray');
    const dressupRoom = root.querySelector('#polly-dressup');
    const dressupSlots = root.querySelector('#polly-dressup-slots');

    // ---- Render: tray ------------------------------------------------------

    function renderTray() {
        const cat = state.tray;
        trayEl.innerHTML = '';

        if (cat === 'dolls') {
            DOLLS.forEach(id => {
                const el = document.createElement('button');
                el.className = 'tray-item';
                el.type = 'button';
                el.title = 'Place ' + id;
                el.textContent = DOLL_GLYPH[id];
                el.addEventListener('click', () => {
                    state.dolls[id].room = state.active;
                    state.dolls[id].x = 35 + Math.random() * 30;
                    state.dolls[id].y = 55 + Math.random() * 15;
                    blip(720); save(); renderStage();
                });
                trayEl.appendChild(el);
            });
            return;
        }

        STICKERS[cat].forEach(em => {
            const el = document.createElement('button');
            el.className = 'tray-item';
            el.type = 'button';
            el.textContent = em;
            el.addEventListener('click', () => {
                placeItem(em);
            });
            trayEl.appendChild(el);
        });
    }

    function placeItem(em) {
        const room = state.active;
        if (room === 'dressup') return;
        state.placed[room].push({
            em,
            x: 30 + Math.random() * 40,
            y: 45 + Math.random() * 30,
            r: (Math.random() * 14 - 7).toFixed(1),
            s: (0.9 + Math.random() * 0.4).toFixed(2),
            id: 'p' + Date.now() + '-' + Math.floor(Math.random() * 999)
        });
        blip(540 + Math.random() * 120, 0.1);
        save();
        renderStage();
    }

    // ---- Render: stage -----------------------------------------------------

    function renderStage() {
        const room = state.active;
        const isDress = room === 'dressup';
        root.dataset.room = room;
        if (isDress) {
            dressupRoom.hidden = false;
            stage.style.display = 'none';
            renderDressUp();
            return;
        }
        dressupRoom.hidden = true;
        stage.style.display = '';
        stage.dataset.room = room;
        stage.dataset.theme = state.themes[room];

        // Items
        placedLayer.innerHTML = '';
        state.placed[room].forEach(item => {
            const el = document.createElement('div');
            el.className = 'placed-item';
            el.textContent = item.em;
            el.style.left = item.x + '%';
            el.style.top  = item.y + '%';
            el.style.transform = `translate(-50%, -50%) rotate(${item.r}deg) scale(${item.s})`;
            el.dataset.id = item.id;
            attachDrag(el, item, 'item');
            placedLayer.appendChild(el);
        });

        // Dolls
        dollsLayer.innerHTML = '';
        DOLLS.forEach(id => {
            const d = state.dolls[id];
            if (d.room !== room) return;
            const wrap = document.createElement('div');
            wrap.className = 'doll';
            wrap.dataset.doll = id;
            wrap.style.left = d.x + '%';
            wrap.style.top  = d.y + '%';
            wrap.style.transform = 'translate(-50%, -50%)';
            wrap.title = id.charAt(0).toUpperCase() + id.slice(1);
            wrap.innerHTML = renderDollGlyph(id);
            attachDrag(wrap, d, 'doll', id);
            dollsLayer.appendChild(wrap);
        });
    }

    function renderDollGlyph(id) {
        const o = state.dolls[id].outfit;
        const get = (slot, key) => {
            const f = OUTFITS[slot].find(x => x.id === key);
            return f ? f.label : '';
        };
        // Stacked vertically using inline styles
        return (
            `<div style="position:relative;display:inline-block;width:1em;line-height:1;text-align:center;">` +
            `<span style="position:absolute;top:-0.55em;left:50%;transform:translateX(-50%);font-size:0.55em;">${get('acc', o.acc)}</span>` +
            `<span style="position:absolute;top:-0.85em;left:50%;transform:translateX(-50%);font-size:1em;">${get('hair', o.hair)}</span>` +
            `<span style="position:absolute;top:0.18em;left:50%;transform:translateX(-50%);font-size:0.85em;">${get('top', o.top)}</span>` +
            `<span style="position:absolute;top:0.85em;left:50%;transform:translateX(-50%);font-size:0.85em;">${get('bottom', o.bottom)}</span>` +
            `<span style="position:absolute;top:1.55em;left:50%;transform:translateX(-50%);font-size:0.7em;">${get('shoes', o.shoes)}</span>` +
            `<span style="opacity:0;">.</span>` +
            `</div>`
        );
    }

    // ---- Render: dress-up -------------------------------------------------

    function renderDressUp() {
        // Each doll figure stack
        ['ishi', 'carlos'].forEach(id => {
            const stack = root.querySelector(`.figure-stack[data-stack="${id}"]`);
            stack.innerHTML = '';
            const o = state.dolls[id].outfit;
            const get = (slot, key) => {
                const f = OUTFITS[slot].find(x => x.id === key);
                return f ? f.label : '';
            };
            const layers = [
                ['acc',    get('acc', o.acc)],
                ['hair',   get('hair', o.hair)],
                ['top',    get('top', o.top)],
                ['bottom', get('bottom', o.bottom)],
                ['shoes',  get('shoes', o.shoes)]
            ];
            layers.forEach(([cls, glyph]) => {
                const el = document.createElement('div');
                el.className = 'figure-layer ' + cls;
                el.textContent = glyph;
                stack.appendChild(el);
            });
        });

        // Slot picker
        const id = state.dressUpDoll;
        const o = state.dolls[id].outfit;
        dressupSlots.innerHTML = '';
        Object.keys(OUTFITS).forEach(slot => {
            const row = document.createElement('div');
            row.className = 'slot-row';
            const h = document.createElement('h4');
            h.textContent = slot;
            row.appendChild(h);
            const opts = document.createElement('div');
            opts.className = 'slot-options';
            OUTFITS[slot].forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'slot-option' + (o[slot] === opt.id ? ' is-active' : '');
                btn.type = 'button';
                btn.textContent = opt.label;
                btn.addEventListener('click', () => {
                    state.dolls[id].outfit[slot] = opt.id;
                    blip(800);
                    save();
                    renderDressUp();
                });
                opts.appendChild(btn);
            });
            row.appendChild(opts);
            dressupSlots.appendChild(row);
        });

        // Doll-pick highlight
        root.querySelectorAll('.doll-pick').forEach(b => {
            b.classList.toggle('is-active', b.dataset.doll === state.dressUpDoll);
        });
    }

    // ---- Drag --------------------------------------------------------------

    function attachDrag(el, model, kind, dollId) {
        let raf = null;
        let start = null;

        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            el.setPointerCapture(e.pointerId);
            el.classList.add('is-dragging');
            const r = stage.getBoundingClientRect();
            start = { x: e.clientX, y: e.clientY, baseX: model.x, baseY: model.y, r };
            blip(900, 0.04);
        });

        el.addEventListener('pointermove', (e) => {
            if (!start) return;
            const dx = (e.clientX - start.x) / start.r.width * 100;
            const dy = (e.clientY - start.y) / start.r.height * 100;
            model.x = clamp(start.baseX + dx, 4, 96);
            model.y = clamp(start.baseY + dy, 8, 92);
            // Trash hit-test
            const tr = trashEl.getBoundingClientRect();
            const inTrash = e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom;
            trashEl.classList.toggle('is-target', inTrash);

            if (!raf) raf = requestAnimationFrame(() => {
                el.style.left = model.x + '%';
                el.style.top  = model.y + '%';
                if (kind === 'item') {
                    el.style.transform = `translate(-50%, -50%) rotate(${model.r}deg) scale(${model.s})`;
                } else {
                    el.style.transform = 'translate(-50%, -50%)';
                }
                raf = null;
            });
        });

        const finish = (e) => {
            if (!start) return;
            start = null;
            el.classList.remove('is-dragging');
            // Drop in trash?
            const tr = trashEl.getBoundingClientRect();
            const inTrash = e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom;
            trashEl.classList.remove('is-target');
            if (inTrash) {
                if (kind === 'item') {
                    state.placed[state.active] = state.placed[state.active].filter(p => p.id !== model.id);
                    blip(220, 0.18, 'sawtooth');
                    renderStage();
                } else {
                    // Send the doll to a "shelf" position
                    state.dolls[dollId].x = 50;
                    state.dolls[dollId].y = 60;
                    state.dolls[dollId].room = 'bedroom';
                    blip(220, 0.18, 'sawtooth');
                    renderStage();
                }
            }
            save();
        };
        el.addEventListener('pointerup', finish);
        el.addEventListener('pointercancel', finish);
    }

    // ---- Tabs / toolbar ----------------------------------------------------

    root.querySelectorAll('.room-tab').forEach(t => {
        t.addEventListener('click', () => {
            state.active = t.dataset.room;
            root.querySelectorAll('.room-tab').forEach(x => x.classList.toggle('is-active', x === t));
            blip(700, 0.08, 'triangle');
            save(); renderStage();
        });
    });

    root.querySelectorAll('.tray-tab').forEach(t => {
        t.addEventListener('click', () => {
            state.tray = t.dataset.tray;
            root.querySelectorAll('.tray-tab').forEach(x => x.classList.toggle('is-active', x === t));
            blip(620, 0.06);
            save(); renderTray();
        });
    });

    root.querySelectorAll('.doll-pick').forEach(b => {
        b.addEventListener('click', () => {
            state.dressUpDoll = b.dataset.doll;
            blip(660);
            save(); renderDressUp();
        });
    });

    root.querySelectorAll('.tool-btn').forEach(b => {
        b.addEventListener('click', () => {
            const a = b.dataset.action;
            if (a === 'theme' && state.active !== 'dressup') {
                state.themes[state.active] = (state.themes[state.active] + 1) % 3;
                blip(880);
                save(); renderStage();
            }
            if (a === 'reset') {
                if (state.active === 'dressup') return;
                state.placed[state.active] = [];
                blip(330, 0.2, 'square');
                save(); renderStage();
            }
            if (a === 'snapshot') snapshot();
            if (a === 'close') {
                root.classList.add('closed');
                state.opened = false;
                save();
            }
        });
    });

    root.querySelector('.compact-open-btn').addEventListener('click', () => {
        root.classList.remove('closed');
        state.opened = true;
        OELM && OELM.chord && OELM.chord([523, 659, 784, 988], 0.18);
        save();
    });

    // ---- Snapshot ----------------------------------------------------------

    function snapshot() {
        try {
            const W = 960, H = 540;
            const c = document.createElement('canvas');
            c.width = W; c.height = H;
            const ctx = c.getContext('2d');

            // Background gradient based on room theme
            const grads = {
                bedroom: ['#ffe1ee', '#f6c7a0'],
                kitchen: ['#ffefe1', '#c19a6b'],
                living:  ['#fff2db', '#b78a5a'],
                garden:  ['#b9e6ff', '#8edc8e']
            };
            const room = state.active === 'dressup' ? 'bedroom' : state.active;
            const [g1, g2] = grads[room];
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, g1); grad.addColorStop(0.6, g1); grad.addColorStop(0.6, g2); grad.addColorStop(1, g2);
            ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

            // Items
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            state.placed[room].forEach(p => {
                const x = (p.x / 100) * W;
                const y = (p.y / 100) * H;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(parseFloat(p.r) * Math.PI / 180);
                ctx.scale(parseFloat(p.s), parseFloat(p.s));
                ctx.font = '52px serif';
                ctx.fillText(p.em, 0, 0);
                ctx.restore();
            });
            // Dolls
            DOLLS.forEach(id => {
                const d = state.dolls[id];
                if (d.room !== room) return;
                const x = (d.x / 100) * W;
                const y = (d.y / 100) * H;
                ctx.font = '64px serif';
                ctx.fillText(DOLL_GLYPH[id], x, y);
            });
            // Watermark
            ctx.font = 'italic 18px serif';
            ctx.fillStyle = 'rgba(58,31,51,0.55)';
            ctx.textAlign = 'right';
            ctx.fillText('our ever lasting memories ♥ ' + new Date().toLocaleDateString(), W - 16, H - 18);

            const link = document.createElement('a');
            link.download = 'polly-' + room + '-' + Date.now() + '.png';
            link.href = c.toDataURL('image/png');
            document.body.appendChild(link); link.click(); link.remove();

            toast('Snapshot saved 📸');
            blip(960, 0.18);
        } catch (e) {
            toast('Could not save snapshot');
        }
    }

    // ---- Helpers -----------------------------------------------------------

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function blip(f, d, t) { if (window.OELM && OELM.blip) OELM.blip(f, d, t); }
    function toast(msg) {
        const t = document.createElement('div');
        t.className = 'polly-toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2700);
    }

    // ---- Init --------------------------------------------------------------

    if (state.opened) root.classList.remove('closed');
    // mark initial active tabs
    root.querySelectorAll('.room-tab').forEach(t => t.classList.toggle('is-active', t.dataset.room === state.active));
    root.querySelectorAll('.tray-tab').forEach(t => t.classList.toggle('is-active', t.dataset.tray === state.tray));
    renderTray();
    renderStage();
})();
