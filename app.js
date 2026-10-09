let chartHFA = null;
let chartBMI = null;
let selectedGender = 'boys';
let lastState = null; // { ageMonths, height, bmi }

const $ = id => document.getElementById(id);
const btnBoy = $('btn-boy');
const btnGirl = $('btn-girl');
const resultsSection = $('results-section');
const yy = $('yy'), mm = $('mm'), dd = $('dd');
const heightEl = $('height'), weightEl = $('weight');
const gradeEl = $('grade');
const msgEl = $('msg');
const graphsContainer = $('graphs-container');
const graphsSection = $('graphs-section');

function setResults(show) {
    resultsSection.classList.toggle('hidden', !show);
    graphsSection.classList.toggle('hidden', !show);
}

/* ---------- Gender ---------- */
function setGender(g) {
    selectedGender = g;
    const base = "px-3 py-2 text-sm font-bold rounded-lg border-2 transition-all ";
    const off = base + "border-gray-200 bg-gray-50 text-gray-500";
    btnBoy.className = g === 'boys' ? base + "border-blue-500 bg-blue-500 text-white shadow-sm" : off;
    btnGirl.className = g === 'girls' ? base + "border-pink-500 bg-pink-500 text-white shadow-sm" : off;
    calculate();
}
btnBoy.addEventListener('click', () => setGender('boys'));
btnGirl.addEventListener('click', () => setGender('girls'));

/* ---------- Helpers ---------- */
const digitsOnly = s => s.replace(/\D/g, '');
function decimalOnly(s) {
    s = s.replace(/[^0-9.]/g, '');
    const i = s.indexOf('.');
    if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '');
    return s;
}
function showMsg(t) {
    if (t) { msgEl.textContent = t; msgEl.classList.remove('hidden'); }
    else msgEl.classList.add('hidden');
}

/* ---------- Select all on focus/touch (typing replaces old value) ---------- */
[yy, mm, dd, heightEl, weightEl].forEach(el => {
    const selectAll = () => {
        try { el.setSelectionRange(0, el.value.length); } catch (e) { el.select(); }
    };
    el.addEventListener('focus', () => { selectAll(); setTimeout(selectAll, 0); setTimeout(selectAll, 60); });
    // stop the browser placing the caret on tap, then select everything
    ['touchend', 'mouseup'].forEach(ev => el.addEventListener(ev, e => {
        e.preventDefault();
        if (document.activeElement !== el) el.focus();
        selectAll();
        setTimeout(selectAll, 0);
    }));
});

/* ---------- Grade -> DOB ---------- */
gradeEl.addEventListener('change', () => {
    const g = gradeEl.value;
    if (g === 'other') return;
    const age = parseInt(g, 10) + 5; // Grade 1 = 6y, Grade 2 = 7y ...
    yy.value = String(new Date().getFullYear() - age);
    mm.value = '06';
    dd.value = '15';
    heightEl.focus();
    calculate();
});

/* ---------- Auto-advance ---------- */
yy.addEventListener('input', () => {
    yy.value = digitsOnly(yy.value);
    if (yy.value.length === 4) mm.focus();
    calculate();
});

mm.addEventListener('input', () => {
    let v = digitsOnly(mm.value);
    if (v.length === 1 && +v >= 2) v = '0' + v;   // 2-9 -> 02-09
    if (v.length === 2 && (+v < 1 || +v > 12)) v = v[0]; // 13 -> 1, 00 -> 0
    mm.value = v;
    if (v.length === 2) dd.focus();
    calculate();
});

dd.addEventListener('input', () => {
    let v = digitsOnly(dd.value);
    if (v.length === 1 && +v >= 4) v = '0' + v;   // 4-9 -> 04-09
    dd.value = v;
    if (v.length === 2) heightEl.focus();
    calculate();
});

heightEl.addEventListener('input', () => {
    heightEl.value = decimalOnly(heightEl.value);
    // 115.5 or 98.5 typed -> go to weight
    if (/^\d{2,3}\.\d$/.test(heightEl.value)) weightEl.focus();
    calculate();
});

weightEl.addEventListener('input', () => {
    weightEl.value = decimalOnly(weightEl.value);
    calculate();
});

// Enter key moves forward (for whole numbers like 115 / 20)
heightEl.addEventListener('keydown', e => { if (e.key === 'Enter') weightEl.focus(); });
weightEl.addEventListener('keydown', e => { if (e.key === 'Enter') weightEl.blur(); });

// Backspace on empty field goes back
[[mm, yy], [dd, mm], [weightEl, heightEl]].forEach(([cur, prev]) => {
    cur.addEventListener('keydown', e => { if (e.key === 'Backspace' && cur.value === '') prev.focus(); });
});

/* ---------- Clear (keeps DOB/grade for the next child in same class) ---------- */
$('clear-btn').addEventListener('click', () => {
    heightEl.value = '';
    weightEl.value = '';
    setResults(false);
    showMsg('');
    lastState = null;
    heightEl.focus();
});

$('toggle-graphs').addEventListener('click', () => {
    graphsContainer.classList.toggle('hidden');
    if (!graphsContainer.classList.contains('hidden') && lastState) drawCharts();
});

/* ---------- Calculate (live) ---------- */
function calcAgeMonths(y, m, d) {
    const dob = new Date(y, m - 1, d);
    if (dob.getFullYear() !== y || dob.getMonth() !== m - 1 || dob.getDate() !== d) return null;
    const today = new Date();
    if (dob > today) return null;
    let months = (today.getFullYear() - y) * 12 + today.getMonth() - (m - 1);
    if (today.getDate() < d) months--;
    return months;
}

function calculate() {
    const y = parseInt(yy.value, 10), m = parseInt(mm.value, 10), d = parseInt(dd.value, 10);
    const height = parseFloat(heightEl.value);
    const weight = parseFloat(weightEl.value);

    // wait until all inputs are complete
    if (yy.value.length !== 4 || !m || !d || isNaN(height) || isNaN(weight)) {
        setResults(false);
        showMsg('');
        lastState = null;
        return;
    }

    const ageMonths = calcAgeMonths(y, m, d);
    if (ageMonths === null) {
        setResults(false);
        showMsg('උපන් දිනය වැරදියි. කරුණාකර පරීක්ෂා කරන්න.');
        return;
    }
    if (height < 60 || height > 220 || weight < 8 || weight > 200) {
        setResults(false);
        showMsg('උස හෝ බර අගය සාමාන්‍ය පරාසයෙන් පිටත.');
        return;
    }
    if (ageMonths < 61 || ageMonths > 228) {
        setResults(false);
        showMsg(`මාස 61 - 228 (අවු. 5-19) අතර ළමුන් සඳහා පමණි. (දැන්: මාස ${ageMonths})`);
        return;
    }
    showMsg('');

    const hm = height / 100;
    const bmi = weight / (hm * hm);

    $('res-age').innerText = `${ageMonths} (${Math.floor(ageMonths / 12)}Y ${ageMonths % 12}M)`;
    $('res-bmi').innerText = bmi.toFixed(2);
    setResults(true);

    lastState = { ageMonths, height, bmi };
    updateStatus();
    if (!graphsContainer.classList.contains('hidden')) drawCharts();
}

/* ---------- Status ---------- */
function updateStatus() {
    const { ageMonths, height, bmi } = lastState;
    const hfaBands = whoData.hfa[selectedGender][ageMonths];
    const bmiBands = whoData.bmi[selectedGender][ageMonths];
    const box = $('status-container');

    if (!hfaBands || !bmiBands) {
        box.innerHTML = `<div class="p-2 rounded-lg border bg-yellow-100 text-yellow-800 border-yellow-200 text-center font-bold text-sm">මෙම වයසට WHO දත්ත නැත</div>`;
        return;
    }

    // bmiBands: [-3SD, -2SD, -1SD, Median, +1SD, +2SD, +3SD]
    let bmiStatus = "සාමාන්‍ය (Normal)";
    let bmiColor = "bg-green-100 text-green-800 border-green-200";
    if (bmi < bmiBands[1]) { bmiStatus = "කෘෂ (Thinness)"; bmiColor = "bg-yellow-100 text-yellow-800 border-yellow-200"; }
    if (bmi < bmiBands[0]) { bmiStatus = "අධික කෘෂ (Severe Thinness)"; bmiColor = "bg-red-100 text-red-800 border-red-200"; }
    if (bmi > bmiBands[4]) { bmiStatus = "අධිබර (Overweight)"; bmiColor = "bg-orange-100 text-orange-800 border-orange-200"; }
    if (bmi > bmiBands[5]) { bmiStatus = "ස්ථුල (Obesity)"; bmiColor = "bg-red-100 text-red-800 border-red-200"; }

    // hfaBands: [-3SD, -2SD, -1SD, Median, +1SD, +2SD, +3SD]
    let hfaStatus = "සාමාන්‍ය උස (Normal)";
    let hfaColor = "bg-green-100 text-green-800 border-green-200";
    if (height < hfaBands[1]) { hfaStatus = "මිටි (Stunted)"; hfaColor = "bg-red-100 text-red-800 border-red-200"; }
    if (height < hfaBands[0]) { hfaStatus = "අධික මිටි (Severely Stunted)"; hfaColor = "bg-red-100 text-red-800 border-red-200"; }

    // ---- amounts ----
    const hm = height / 100;
    const kg = bmi * hm * hm;                 // current weight (kg)
    const wMin = bmiBands[1] * hm * hm;       // -2SD  (lower normal limit for this height)
    const wMed = bmiBands[3] * hm * hm;       // median
    const wMax = bmiBands[4] * hm * hm;       // +1SD  (upper normal limit)
    const f1 = n => Math.abs(n).toFixed(1);

    let bmiNote;
    if (kg < wMin) {
        bmiNote = `සාමාන්‍ය තත්ත්වයට පැමිණීමට බර <b>kg ${f1(wMin - kg)}</b> ක් වැඩි විය යුතුයි<br><span class="font-normal">(Median බරට: kg ${f1(wMed - kg)} ක් වැඩි)</span>`;
    } else if (kg > wMax) {
        bmiNote = `සාමාන්‍ය තත්ත්වයට පැමිණීමට බර <b>kg ${f1(kg - wMax)}</b> ක් අඩු විය යුතුයි<br><span class="font-normal">(Median බරට: kg ${f1(kg - wMed)} ක් අඩු)</span>`;
    } else {
        const d = kg - wMed;
        bmiNote = `සාමාන්‍ය පරාසය: kg ${wMin.toFixed(1)} - ${wMax.toFixed(1)}<br><span class="font-normal">(Median බරට වඩා kg ${f1(d)} ${d >= 0 ? 'වැඩියි' : 'අඩුයි'})</span>`;
    }

    const hMed = hfaBands[3];
    const hDiff = height - hMed;
    let hfaNote;
    if (height < hfaBands[1]) {
        hfaNote = `සාමාන්‍ය සීමාවට (-2SD) <b>cm ${f1(hfaBands[1] - height)}</b> ක් අඩුයි<br><span class="font-normal">(Median උසට: cm ${f1(hDiff)} ක් අඩු)</span>`;
    } else {
        hfaNote = `<span class="font-normal">Median උසට වඩා cm ${f1(hDiff)} ${hDiff >= 0 ? 'වැඩියි' : 'අඩුයි'} (Median: ${hMed.toFixed(1)} cm)</span>`;
    }

    box.innerHTML = `
        <div class="px-2 py-1.5 rounded-lg border ${bmiColor} text-center font-bold text-xs leading-tight">BMI: ${bmiStatus}<div class="mt-0.5 text-[11px]">${bmiNote}</div></div>
        <div class="px-2 py-1.5 rounded-lg border ${hfaColor} text-center font-bold text-xs leading-tight">උස: ${hfaStatus}<div class="mt-0.5 text-[11px]">${hfaNote}</div></div>
    `;
}

/* ---------- Charts (full range, portrait, CDC-style coloured zones) ---------- */
const ZONE = {
    red:    '#f4a6a6',
    yellow: '#fff3a0',
    green:  '#a5e6a5',
    lgreen: '#d4f2d4',
    tan:    '#f8d8aa',
    dtan:   '#efb97a',
    dred:   '#ee8f8f'
};

function buildChart(canvas, cfg) {
    // cfg: { ages, bounds[][], edges[], colors[], labels[], lineIdx[], medianIdx, child:{x,y}, unit, step }
    const { ages, bounds, edges, colors, labels, medianIdx, child, unit, step } = cfg;
    const first = ages[0], last = ages[ages.length - 1];

    // y range from the outer lines + child
    let mn = Infinity, mx = -Infinity;
    bounds.forEach(b => b.forEach(v => { if (v < mn) mn = v; if (v > mx) mx = v; }));
    mn = Math.min(mn, child.y); mx = Math.max(mx, child.y);
    const ymin = Math.floor(mn / step) * step;
    const ymax = Math.ceil(mx / step) * step;

    const bandsPlugin = {
        id: 'zoneBands',
        beforeDatasetsDraw(chart) {
            const { ctx, chartArea: ca, scales } = chart;
            const X = a => scales.x.getPixelForValue(a);
            const Y = v => scales.y.getPixelForValue(v);
            ctx.save();
            ctx.beginPath();
            ctx.rect(ca.left, ca.top, ca.right - ca.left, ca.bottom - ca.top);
            ctx.clip();
            for (let k = 0; k <= edges.length; k++) {
                const lower = k === 0 ? null : bounds[edges[k - 1]];
                const upper = k === edges.length ? null : bounds[edges[k]];
                ctx.beginPath();
                // upper edge: left -> right
                ages.forEach((a, i) => {
                    const y = upper ? Y(upper[i]) : ca.top;
                    i === 0 ? ctx.moveTo(X(a), y) : ctx.lineTo(X(a), y);
                });
                // lower edge: right -> left
                for (let i = ages.length - 1; i >= 0; i--) {
                    const y = lower ? Y(lower[i]) : ca.bottom;
                    ctx.lineTo(X(ages[i]), y);
                }
                ctx.closePath();
                ctx.fillStyle = colors[k];
                ctx.fill();
            }
            ctx.restore();
        },
        afterDatasetsDraw(chart) {
            const { ctx, chartArea: ca, scales } = chart;
            ctx.save();
            ctx.font = 'bold 9px sans-serif';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            bounds.forEach((b, i) => {
                ctx.fillText(labels[i], ca.right - 3, scales.y.getPixelForValue(b[b.length - 1]) - 2);
            });
            ctx.restore();
        }
    };

    const lineDs = bounds.map((b, i) => ({
        data: ages.map((a, j) => ({ x: a, y: b[j] })),
        borderColor: i === medianIdx ? '#111' : 'rgba(0,0,0,0.45)',
        borderWidth: i === medianIdx ? 2.5 : 1,
        pointRadius: 0, pointHoverRadius: 0, order: 5
    }));
    const childDs = {
        label: 'ළමයාගේ අගය',
        data: [child],
        showLine: false,
        backgroundColor: '#2563eb',
        borderColor: '#111',
        borderWidth: 2,
        pointRadius: 7, pointHoverRadius: 8,
        order: -1
    };

    const yOpts = pos => ({
        type: 'linear', display: true, position: pos, min: ymin, max: ymax,
        ticks: { stepSize: step, font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.18)', drawOnChartArea: pos === 'left' },
        title: pos === 'left' ? { display: true, text: unit } : { display: false }
    });

    return new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { datasets: [...lineDs, childDs] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'nearest', intersect: true },
            layout: { padding: { right: 2 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: item => item.datasetIndex === lineDs.length,
                    callbacks: {
                        title: items => `වයස: ${Math.floor(items[0].parsed.x / 12)}Y ${items[0].parsed.x % 12}M`,
                        label: item => `${unit}: ${item.parsed.y.toFixed(1)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear', min: first, max: last,
                    afterBuildTicks(axis) {
                        const t = [];
                        for (let m = Math.ceil(first / 12) * 12; m <= last; m += 12) t.push({ value: m });
                        axis.ticks = t;
                    },
                    ticks: { callback: v => v / 12, font: { size: 10 } },
                    grid: { color: 'rgba(0,0,0,0.18)' },
                    title: { display: true, text: 'වයස (අවුරුදු)' }
                },
                y: yOpts('left'),
                yRight: yOpts('right')
            }
        },
        plugins: [bandsPlugin]
    });
}

function drawCharts() {
    if (!lastState || typeof Chart === 'undefined') return;
    const { ageMonths, height, bmi } = lastState;
    const hfaData = whoData.hfa[selectedGender];
    const bmiData = whoData.bmi[selectedGender];

    const ages = Object.keys(hfaData).map(Number).sort((a, b) => a - b);
    const col = (data, idx) => ages.map(a => data[a][idx]);

    // Height-for-age: lines = -3SD, -2SD, -1SD, Median, +1SD, +2SD
    if (chartHFA) chartHFA.destroy();
    chartHFA = buildChart($('chart-hfa'), {
        ages,
        bounds: [0, 1, 2, 3, 4, 5].map(i => col(hfaData, i)),
        edges: [0, 1, 5],                                    // -3SD, -2SD, +2SD
        colors: [ZONE.dred, ZONE.red, ZONE.green, ZONE.lgreen],
        labels: ['-3SD', '-2SD', '-1SD', 'Median', '+1SD', '+2SD'],
        medianIdx: 3,
        child: { x: ageMonths, y: height },
        unit: 'cm', step: 10
    });

    // BMI-for-age: lines = -3SD, -2SD, -1SD, Median, +1SD, +2SD
    if (chartBMI) chartBMI.destroy();
    chartBMI = buildChart($('chart-bmi'), {
        ages,
        bounds: [0, 1, 2, 3, 4, 5].map(i => col(bmiData, i)),
        edges: [0, 1, 4, 5],                                 // -3SD, -2SD, +1SD, +2SD
        colors: [ZONE.dtan, ZONE.tan, ZONE.green, ZONE.yellow, ZONE.red],
        labels: ['-3SD', '-2SD', '-1SD', 'Median', '+1SD', '+2SD'],
        medianIdx: 3,
        child: { x: ageMonths, y: bmi },
        unit: 'BMI', step: 2
    });
}
