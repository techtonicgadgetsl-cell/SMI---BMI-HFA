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

/* ---------- Gender ---------- */
function setGender(g) {
    selectedGender = g;
    const base = "flex-1 py-2.5 text-md font-bold rounded-xl border-2 transition-all ";
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
    resultsSection.classList.add('hidden');
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
        resultsSection.classList.add('hidden');
        showMsg('');
        lastState = null;
        return;
    }

    const ageMonths = calcAgeMonths(y, m, d);
    if (ageMonths === null) {
        resultsSection.classList.add('hidden');
        showMsg('උපන් දිනය වැරදියි. කරුණාකර පරීක්ෂා කරන්න.');
        return;
    }
    if (height < 60 || height > 220 || weight < 8 || weight > 200) {
        resultsSection.classList.add('hidden');
        showMsg('උස හෝ බර අගය සාමාන්‍ය පරාසයෙන් පිටත.');
        return;
    }
    if (ageMonths < 61 || ageMonths > 228) {
        resultsSection.classList.add('hidden');
        showMsg(`මාස 61 - 228 (අවු. 5-19) අතර ළමුන් සඳහා පමණි. (දැන්: මාස ${ageMonths})`);
        return;
    }
    showMsg('');

    const hm = height / 100;
    const bmi = weight / (hm * hm);

    $('res-age').innerText = `${ageMonths} (${Math.floor(ageMonths / 12)}Y ${ageMonths % 12}M)`;
    $('res-bmi').innerText = bmi.toFixed(2);
    resultsSection.classList.remove('hidden');

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
        box.innerHTML = `<div class="p-3 rounded-lg border bg-yellow-100 text-yellow-800 border-yellow-200 text-center font-bold text-sm">මෙම වයසට WHO දත්ත නැත</div>`;
        return;
    }

    // bmiBands: [-3SD, -2SD, -1SD, Median, +1SD, +2SD, +3SD]
    let bmiStatus = "සාමාන්‍ය (Normal)";
    let bmiColor = "bg-green-100 text-green-800 border-green-200";
    if (bmi < bmiBands[1]) { bmiStatus = "කෘෂ (Thinness)"; bmiColor = "bg-yellow-100 text-yellow-800 border-yellow-200"; }
    if (bmi < bmiBands[0]) { bmiStatus = "අධික කෘෂ (Severe Thinness)"; bmiColor = "bg-red-100 text-red-800 border-red-200"; }
    if (bmi > bmiBands[4]) { bmiStatus = "අධිබර (Overweight)"; bmiColor = "bg-orange-100 text-orange-800 border-orange-200"; }
    if (bmi > bmiBands[5]) { bmiStatus = "ස්ථුල (Obesity)"; bmiColor = "bg-red-100 text-red-800 border-red-200"; }

    // hfaBands: [3rd, 15th, Median, 85th, 97th]
    let hfaStatus = "සාමාන්‍ය උස (Normal)";
    let hfaColor = "bg-green-100 text-green-800 border-green-200";
    if (height < hfaBands[0]) { hfaStatus = "මිටි (Stunted)"; hfaColor = "bg-red-100 text-red-800 border-red-200"; }

    box.innerHTML = `
        <div class="p-3 rounded-lg border ${bmiColor} text-center font-bold text-sm">BMI තත්ත්වය: ${bmiStatus}</div>
        <div class="p-3 rounded-lg border ${hfaColor} text-center font-bold text-sm">උස තත්ත්වය: ${hfaStatus}</div>
    `;
}

/* ---------- Charts ---------- */
function drawCharts() {
    if (!lastState || typeof Chart === 'undefined') return;
    const { ageMonths, height, bmi } = lastState;
    const hfaData = whoData.hfa[selectedGender];
    const bmiData = whoData.bmi[selectedGender];
    const ages = Object.keys(hfaData).map(Number);
    const idx = ages.indexOf(ageMonths);

    const studentHFA = new Array(ages.length).fill(null);
    const studentBMI = new Array(ages.length).fill(null);
    if (idx !== -1) { studentHFA[idx] = height; studentBMI[idx] = bmi; }

    const opts = {
        responsive: true,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { font: { size: 10 } } } },
        scales: { x: { title: { display: true, text: 'වයස (මාස)' } } }
    };
    const childDs = data => ({ label: 'ළමයාගේ අගය', data, backgroundColor: 'black', borderColor: 'black', pointRadius: 6, pointHoverRadius: 8, showLine: false });

    if (chartHFA) chartHFA.destroy();
    chartHFA = new Chart($('chart-hfa').getContext('2d'), {
        type: 'line',
        data: {
            labels: ages,
            datasets: [
                { label: '+2SD (97th)', data: ages.map(a => hfaData[a][4]), borderColor: 'rgba(255, 99, 132, 0.5)', borderWidth: 1.5, pointRadius: 0 },
                { label: 'Median', data: ages.map(a => hfaData[a][2]), borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 2, pointRadius: 0 },
                { label: '-2SD (3rd)', data: ages.map(a => hfaData[a][0]), borderColor: 'rgba(255, 159, 64, 0.5)', borderWidth: 1.5, pointRadius: 0 },
                childDs(studentHFA)
            ]
        },
        options: opts
    });

    if (chartBMI) chartBMI.destroy();
    chartBMI = new Chart($('chart-bmi').getContext('2d'), {
        type: 'line',
        data: {
            labels: ages,
            datasets: [
                { label: '+2SD', data: ages.map(a => bmiData[a][5]), borderColor: 'rgba(255, 99, 132, 0.8)', borderWidth: 1.5, pointRadius: 0 },
                { label: '+1SD', data: ages.map(a => bmiData[a][4]), borderColor: 'rgba(255, 205, 86, 0.8)', borderWidth: 1.5, pointRadius: 0 },
                { label: 'Median', data: ages.map(a => bmiData[a][3]), borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 2, pointRadius: 0 },
                { label: '-2SD', data: ages.map(a => bmiData[a][1]), borderColor: 'rgba(255, 159, 64, 0.8)', borderWidth: 1.5, pointRadius: 0 },
                childDs(studentBMI)
            ]
        },
        options: opts
    });
}
