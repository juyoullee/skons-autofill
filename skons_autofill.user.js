// ==UserScript==
// @name         SAFE SKONS 자동입력
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  기지국/중계기 등록 바로가기 및 자동입력 (모바일 지원)
// @author       이주열
// @match        https://safe.skons.net/*
// @updateURL    https://raw.githubusercontent.com/juyoullee/skons-autofill/master/skons_autofill.user.js
// @downloadURL  https://raw.githubusercontent.com/juyoullee/skons-autofill/master/skons_autofill.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const BTS_URL = 'https://safe.skons.net/safety-activity/work-registration/bts/';
    const RPT_URL = 'https://safe.skons.net/safety-activity/work-registration/rpt/';
    const STORAGE_KEY = 'skons-autofill-gen';

    // ─────────────────────────────────────────
    // 바로가기 버튼 (화면 좌하단 고정)
    // ─────────────────────────────────────────
    function addShortcutButtons() {
        if (document.getElementById('skons-shortcuts')) return;

        const OUTDOOR      = '(C2) 일반 실외 평지 작업(IP/전주/강관주/철탑/전기차 유지보수 등)';
        const INDOOR       = '(C2) 일반 실내 평지 작업(집/중/통/국사/매장)';
        const ROOFTOP_SAFE = '(C2) 옥상/옥탑 작업(추락위험 없음)';
        const ROOFTOP_FALL = '(C3) 옥상/옥탑 작업(추락위험)';

        const wrap = document.createElement('div');
        wrap.id = 'skons-shortcuts';
        wrap.style.cssText = `
            position: fixed;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px));
            left: 16px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
        `;

        const base = `
            border: none; color: #fff; font-weight: bold; cursor: pointer;
            -webkit-tap-highlight-color: transparent; touch-action: manipulation;
            user-select: none; -webkit-user-select: none;
            white-space: nowrap; text-align: center;
        `;

        // 1단계: 작업등록 (160px)
        function mkTop(label, color, onClick) {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = base + `padding:12px 18px; background:${color}; border-radius:22px; font-size:14px; box-shadow:0 4px 12px rgba(0,0,0,0.35); min-width:160px;`;
            b.addEventListener('click', onClick);
            return b;
        }

        // 2단계: LRRU / AAU / 중계기 (140px)
        function mkMid(label, color, onClick) {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = base + `padding:10px 16px; background:${color}; border-radius:20px; font-size:13px; box-shadow:0 3px 10px rgba(0,0,0,0.3); min-width:140px;`;
            b.addEventListener('click', onClick);
            return b;
        }

        // 3단계: 세부 항목 (120px)
        function mkSub(label, color, gen, workType) {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = base + `padding:8px 14px; background:${color}; border-radius:16px; font-size:12px; box-shadow:0 2px 8px rgba(0,0,0,0.22); min-width:120px;`;
            b.addEventListener('click', () => {
                if (gen) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ gen, workType }));
                location.href = BTS_URL;
            });
            return b;
        }

        function mkPane(items) {
            const div = document.createElement('div');
            div.style.cssText = 'display:none; flex-direction:column; align-items:flex-start; gap:6px;';
            items.forEach(i => div.appendChild(i));
            return div;
        }

        function toggle(pane, others = []) {
            const opening = pane.style.display === 'none';
            others.forEach(o => { o.style.display = 'none'; });
            pane.style.display = opening ? 'flex' : 'none';
        }

        // ── LRRU 세부 항목 ──
        const lrruPane = mkPane([
            mkSub('(C2) 강관주',     '#1565C0', '4G', OUTDOOR),
            mkSub('(C2) 실내',       '#1976D2', '4G', INDOOR),
            mkSub('(C2) 옥상추락없음', '#42A5F5', '4G', ROOFTOP_SAFE),
            mkSub('(C3) 옥상추락',   '#0288D1', '4G', ROOFTOP_FALL),
        ]);

        // ── AAU 세부 항목 ──
        const aauPane = mkPane([
            mkSub('(C2) 강관주',     '#283593', '5G', OUTDOOR),
            mkSub('(C2) 실내',       '#3949AB', '5G', INDOOR),
            mkSub('(C2) 옥상추락없음', '#5C6BC0', '5G', ROOFTOP_SAFE),
            mkSub('(C3) 옥상추락',   '#7E57C2', '5G', ROOFTOP_FALL),
        ]);

        const lrruBtn = mkMid('📡 LRRU', '#1565C0', () => toggle(lrruPane, [aauPane]));
        const aauBtn  = mkMid('📡 AAU',  '#0D47A1', () => toggle(aauPane, [lrruPane]));
        const rptBtn  = mkMid('📶 중계기 등록', '#2E7D32', () => {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ gen: null, workType: null }));
            location.href = RPT_URL;
        });

        // ── 2단계 패널 ──
        const midPane = mkPane([lrruPane, lrruBtn, aauPane, aauBtn, rptBtn]);

        // ── 1단계: 작업등록 ──
        const topBtn = mkTop('📡 작업등록', '#1a237e', () => toggle(midPane));

        wrap.appendChild(midPane);
        wrap.appendChild(topBtn);

        document.body.appendChild(wrap);
    }

    function isRegistrationPage() {
        return location.href.includes('/work-registration/');
    }

    // ─────────────────────────────────────────
    // 자동입력 로직
    // ─────────────────────────────────────────
    const BASE_LABEL_MAP = {
        '영역':            '동부',
        '사업장':          '경남Access담당',
        '팀(SKT)':         '부산 AI팀',
        '공사구분':        '점검',
        '작업구분1':       '점검 작업',
        '작업구분2':       '유지보수',
        '세대별 작업영역': '4G',
        '서비스 영향':     '서비스중단없음',
        '작업목적':        '성능개선',
        '재난 안전망':     '미포함',
        '작업 유형':       '(C2) 일반 실외 평지 작업(IP/전주/강관주/철탑/전기차 유지보수 등)',
    };

    const DELAYS = {
        '영역':    500,
        '사업장':  500,
        '팀(SKT)': 500,
        '공사구분': 700,
        '작업구분1': 400,
        '작업구분2': 400,
    };

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function dispatchOpen(el) {
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        try {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const touch = new Touch({ identifier: Date.now(), target: el, clientX: cx, clientY: cy, radiusX: 1, radiusY: 1, rotationAngle: 0, force: 1 });
            el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch], targetTouches: [touch], changedTouches: [touch] }));
            el.dispatchEvent(new TouchEvent('touchend',   { bubbles: true, cancelable: true, touches: [],       targetTouches: [],       changedTouches: [touch] }));
        } catch (_) {}
        el.click();
    }

    function findOptionValue(el, labelText) {
        const fk = Object.keys(el).find(k => k.startsWith('__reactFiber'));
        let fiber = el[fk];
        while (fiber) {
            const children = fiber.memoizedProps?.children;
            if (children) {
                const arr = (Array.isArray(children) ? children : [children]).flat();
                const hasOptions = arr.some(c => c?.props?.value !== undefined);
                if (hasOptions) {
                    const match = arr.find(c => {
                        const label = typeof c?.props?.children === 'string'
                            ? c.props.children
                            : String(c?.props?.children ?? '');
                        return label.includes(labelText);
                    });
                    if (match) return match.props.value;
                }
            }
            fiber = fiber.return;
        }
        return labelText;
    }

    function setMuiValue(el, labelText, resolvedValue) {
        const value = resolvedValue ?? findOptionValue(el, labelText);
        const key = Object.keys(el).find(k => k.startsWith('__reactFiber'));
        if (!key) return false;
        let fiber = el[key];
        while (fiber) {
            if (fiber.memoizedProps?.onChange && fiber.memoizedProps?.value !== undefined) {
                fiber.memoizedProps.onChange({ target: { value } });
                return true;
            }
            fiber = fiber.return;
        }
        return false;
    }

    async function fillByClick(sel, labelText, timeout = 8000) {
        dispatchOpen(sel);
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const options = [...document.querySelectorAll('[role="listbox"] [role="option"], ul[role="listbox"] li')];
            const match = options.find(o => o.textContent?.trim().includes(labelText));
            if (match) {
                match.click();
                await sleep(150);
                document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
                const backdrop = document.querySelector('.MuiModal-backdrop, .MuiBackdrop-root');
                if (backdrop) backdrop.click();
                return true;
            }
            await sleep(200);
        }
        console.warn(`[SKONS 자동입력] "${labelText}" 옵션을 찾지 못했습니다 (타임아웃).`);
        return false;
    }

    const LAZY_FIELDS = new Set(['세대별 작업영역']);
    const AUTOCOMPLETE_FIELDS = new Set(['작업 유형']);

    async function fillAutocomplete(labelText, optionText, timeout = 8000) {
        const label = [...document.querySelectorAll('label')].find(l => l.textContent.includes(labelText));
        if (!label) return false;
        let el = label;
        let input = null;
        for (let i = 0; i < 5; i++) {
            el = el.parentElement;
            input = el?.querySelector('input[role="combobox"]');
            if (input) break;
        }
        if (!input) { console.warn(`[SKONS 자동입력] "${labelText}" input 요소를 찾지 못했습니다.`); return false; }
        input.focus();
        input.click();
        const searchText = optionText.substring(0, 6);
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, searchText);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(500);
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            const options = [...document.querySelectorAll(
                '[role="listbox"] [role="option"], [role="menu"] [role="menuitem"], .MuiAutocomplete-option, .MuiMenuItem-root'
            )];
            const match = options.find(o => o.textContent?.trim().includes(optionText));
            if (match) { match.click(); return true; }
            await sleep(200);
        }
        console.warn(`[SKONS 자동입력] "${optionText}" 옵션을 찾지 못했습니다 (타임아웃).`);
        return false;
    }

    async function fillAllSelects(labelMap) {
        let slowMode = false;
        for (const [key, value] of Object.entries(labelMap)) {
            if (key === '공사구분') slowMode = true;

            if (AUTOCOMPLETE_FIELDS.has(key)) {
                try { await fillAutocomplete(key, value); } catch (e) { console.warn(`[SKONS 자동입력] "${key}" 항목 입력 실패:`, e); }
                await sleep(DELAYS[key] ?? (slowMode ? 600 : 400));
                continue;
            }

            const selects = [...document.querySelectorAll('.MuiSelect-select:not(.Mui-disabled)')];
            for (const sel of selects) {
                const label = sel.closest('.MuiFormControl-root')?.querySelector('label')?.textContent?.trim() || '';
                if (label.startsWith(key)) {
                    try {
                        if (LAZY_FIELDS.has(key)) {
                            await fillByClick(sel, value);
                        } else {
                            setMuiValue(sel, value);
                        }
                    } catch (e) {
                        console.warn(`[SKONS 자동입력] "${key}" 항목 입력 실패:`, e);
                    }
                    await sleep(DELAYS[key] ?? (slowMode ? 600 : 400));
                    break;
                }
            }
        }
    }

    async function autoFill(gen, workType) {
        const labelMap = { ...BASE_LABEL_MAP };
        if (gen) labelMap['세대별 작업영역'] = gen;
        if (workType) labelMap['작업 유형'] = workType;
        await fillAllSelects(labelMap);
        await sleep(500);
        const searchLabel = location.href.includes('/rpt/') ? '중계기 조회' : '기지국 조회';
        const searchBtn = [...document.querySelectorAll('button')].find(b => b.textContent.includes(searchLabel));
        if (searchBtn) {
            searchBtn.click();
            await sleep(1000);
        } else {
            console.warn(`[SKONS 자동입력] "${searchLabel}" 버튼을 찾지 못했습니다.`);
        }
        alert('자동입력 완료!\n확인 후 저장해주세요.');
    }

    async function checkPendingAutoFill() {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (!stored || !isRegistrationPage()) return;
        sessionStorage.removeItem(STORAGE_KEY);
        const { gen, workType } = JSON.parse(stored);
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) {
            if (document.querySelectorAll('.MuiSelect-select:not(.Mui-disabled)').length >= 3) break;
            await sleep(300);
        }
        await sleep(500);
        await autoFill(gen, workType);
    }

    // ─────────────────────────────────────────
    // 초기화
    // ─────────────────────────────────────────
    function onRouteChange() {
        addShortcutButtons();
    }

    function init() {
        onRouteChange();
        checkPendingAutoFill();
    }

    let debounceTimer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(onRouteChange, 300);
    });

    function patchHistory(method) {
        const original = history[method];
        history[method] = function (...args) {
            const result = original.apply(this, args);
            onRouteChange();
            return result;
        };
    }
    patchHistory('pushState');
    patchHistory('replaceState');
    window.addEventListener('popstate', onRouteChange);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            observer.observe(document.body, { childList: true, subtree: true });
        });
    } else {
        init();
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
