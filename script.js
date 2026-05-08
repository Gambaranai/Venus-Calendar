// Venus Phase Calendar logic

// Default Location: Strasbourg, France
const OBSERVER = new Astronomy.Observer(48.5734, 7.7521, 140);

// Global State
let currentDate = new Date();
let calendarYear = currentDate.getFullYear();
let calendarMonth = currentDate.getMonth();
let eventSearchDate = new Date(currentDate.getTime());
let currentLanguage = 'jp';

const TEXT = {
    jp: {
        appTitle: '金星満ち欠けカレンダー',
        astroTitle: '天文データ',
        calendarTitle: 'カレンダー',
        month: '月',
        week: '週',
        day: '日',
        weekdays: ['日', '月', '火', '水', '木', '金', '土'],
        toggleOrbit: '🪐 軌道モデル',
        togglePhase: '🔭 位相表示',
        today: '今日',
        morning: '明けの明星',
        evening: '宵の明星',
        searching: '検索中...',
        nextPrefix: '次',
        eventOn: '日',
        noneFound: '範囲内にイベントなし',
        jumping: '移動中...',
        phase: '位相',
        illumination: '満ち欠け',
        magnitude: '見かけの等級',
        distance: '地球からの距離',
        diameter: '見かけの視直径',
        selectedEvent: '選択中のイベント'
    },
    en: {
        appTitle: 'Venus Phase Calendar',
        astroTitle: 'Astronomical Data',
        calendarTitle: 'Calendar',
        month: 'Month',
        week: 'Week',
        day: 'Day',
        weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        toggleOrbit: '🪐 Orbit Model',
        togglePhase: '🔭 View Phase',
        today: 'Today',
        morning: 'Morning Star',
        evening: 'Evening Star',
        searching: 'Searching...',
        nextPrefix: 'Next',
        eventOn: 'on',
        noneFound: 'None found in range',
        jumping: 'Jumping...',
        phase: 'Phase',
        illumination: 'Illumination',
        magnitude: 'Apparent Magnitude',
        distance: 'Distance from Earth',
        diameter: 'Apparent Diameter',
        selectedEvent: 'Selected Event'
    }
};

// DOM Elements
const canvas = document.getElementById('venus-canvas');
const ctx = canvas.getContext('2d');
const orbitCanvas = document.getElementById('orbit-canvas');
const orbitCtx = orbitCanvas.getContext('2d');
const displayDateEl = document.getElementById('display-date');
const visOverlayEl = document.getElementById('visibility-overlay');
const dataPhaseEl = document.getElementById('data-phase');
const dataIllumEl = document.getElementById('data-illumination');
const dataMagEl = document.getElementById('data-magnitude');
const dataDistEl = document.getElementById('data-distance');
const dataDiamEl = document.getElementById('data-diameter');
const dataEventEl = document.getElementById('data-event');

const todayBtn = document.getElementById('today-btn');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const calYearText = document.getElementById('cal-year-text');
const yearDropdown = document.getElementById('year-dropdown');
const calMonthText = document.getElementById('cal-month-text');
const monthDropdown = document.getElementById('month-dropdown');
const calDaysEl = document.getElementById('calendar-days');
const langJpBtn = document.getElementById('lang-jp');
const langEnBtn = document.getElementById('lang-en');

let dropdownBaseYear = 2026;

// Header Buttons
const toggleViewBtn = document.getElementById('toggle-view-btn');
let isOrbitView = false;

// Nav Buttons
const btnSubMonth = document.getElementById('sub-month');
const btnSubWeek = document.getElementById('sub-week');
const btnSubDay = document.getElementById('sub-day');
const btnAddDay = document.getElementById('add-day');
const btnAddWeek = document.getElementById('add-week');
const btnAddMonth = document.getElementById('add-month');

const btnPrevEvent = document.getElementById('prev-event');
const btnNextEvent = document.getElementById('next-event');

// Playback
const btnAnimRev = document.getElementById('anim-rev');
const btnAnimPause = document.getElementById('anim-pause');
const btnAnimFwd = document.getElementById('anim-fwd');
let animInterval = null;
let currentAnimDirection = 0;
let currentAnimSpeed = 1;

// Initialize App
function init() {
    // Pre-populate dropdown
    for (let y = 1800; y <= 2200; y++) {
        const item = document.createElement('div');
        item.className = 'year-item';
        item.id = 'year-item-' + y;
        item.textContent = y;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectYear(y);
            yearDropdown.classList.add('hidden');
        });
        yearDropdown.appendChild(item);
    }
    // Pre-populate Month dropdown (0-11)
    for (let m = 0; m < 12; m++) {
        const item = document.createElement('div');
        item.className = 'month-item';
        item.id = 'month-item-' + m;
        item.textContent = String(m + 1).padStart(2, '0');
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectMonth(m);
            monthDropdown.classList.add('hidden');
        });
        monthDropdown.appendChild(item);
    }
    setupEventListeners();
    applyLanguage(currentLanguage);
    updateApp(currentDate);
    renderCalendar();
}

function setupEventListeners() {
    langJpBtn.addEventListener('click', () => setLanguage('jp'));
    langEnBtn.addEventListener('click', () => setLanguage('en'));

    todayBtn.addEventListener('click', () => {
        stopAnimation();
        currentDate = new Date(); // reset to exact now
        calendarYear = currentDate.getFullYear();
        calendarMonth = currentDate.getMonth();
        updateApp(currentDate);
        renderCalendar();
    });

    toggleViewBtn.addEventListener('click', () => {
        isOrbitView = !isOrbitView;
        if (isOrbitView) {
            toggleViewBtn.textContent = TEXT[currentLanguage].togglePhase;
            canvas.style.display = 'none';
            orbitCanvas.style.display = 'block';
        } else {
            toggleViewBtn.textContent = TEXT[currentLanguage].toggleOrbit;
            canvas.style.display = 'block';
            orbitCanvas.style.display = 'none';
        }
    });

    prevMonthBtn.addEventListener('click', () => {
        calendarMonth--;
        if (calendarMonth < 0) {
            calendarMonth = 11;
            calendarYear--;
        }
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        calendarMonth++;
        if (calendarMonth > 11) {
            calendarMonth = 0;
            calendarYear++;
        }
        renderCalendar();
    });

    const shiftDate = (days) => {
        currentDate.setDate(currentDate.getDate() + days);
        calendarYear = currentDate.getFullYear();
        calendarMonth = currentDate.getMonth();
        updateApp(currentDate);
        renderCalendar();
    };

    const shiftMonth = (months) => {
        currentDate.setMonth(currentDate.getMonth() + months);
        calendarYear = currentDate.getFullYear();
        calendarMonth = currentDate.getMonth();
        updateApp(currentDate);
        renderCalendar();
    };

    btnSubDay.addEventListener('click', () => shiftDate(-1));
    btnAddDay.addEventListener('click', () => shiftDate(1));
    btnSubWeek.addEventListener('click', () => shiftDate(-7));
    btnAddWeek.addEventListener('click', () => shiftDate(7));
    btnSubMonth.addEventListener('click', () => { stopAnimation(); shiftMonth(-1); });
    btnAddMonth.addEventListener('click', () => { stopAnimation(); shiftMonth(1); });

    btnPrevEvent.addEventListener('click', () => { stopAnimation(); jumpToEvent(-1); });
    btnNextEvent.addEventListener('click', () => { stopAnimation(); jumpToEvent(1); });

    // Animation Controls
    btnAnimRev.addEventListener('click', () => startAnimation(-1));
    btnAnimPause.addEventListener('click', stopAnimation);
    btnAnimFwd.addEventListener('click', () => startAnimation(1));

    // Custom Year Picker UI
    calYearText.addEventListener('click', (e) => {
        e.stopPropagation();
        yearDropdown.classList.toggle('hidden');
        monthDropdown.classList.add('hidden');
        
        if (!yearDropdown.classList.contains('hidden')) {
            document.querySelectorAll('.year-item').forEach(el => el.classList.remove('active'));
            const activeItem = document.getElementById('year-item-' + calendarYear);
            if (activeItem) {
                activeItem.classList.add('active');
                const listHeight = yearDropdown.clientHeight;
                yearDropdown.scrollTop = activeItem.offsetTop - (listHeight / 2) + (activeItem.clientHeight / 2);
            }
        }
    });

    // Custom Month Picker UI
    calMonthText.addEventListener('click', (e) => {
        e.stopPropagation();
        monthDropdown.classList.toggle('hidden');
        yearDropdown.classList.add('hidden');
        
        if (!monthDropdown.classList.contains('hidden')) {
            document.querySelectorAll('.month-item').forEach(el => el.classList.remove('active'));
            const activeItem = document.getElementById('month-item-' + calendarMonth);
            if (activeItem) {
                activeItem.classList.add('active');
                const listHeight = monthDropdown.clientHeight;
                monthDropdown.scrollTop = activeItem.offsetTop - (listHeight / 2) + (activeItem.clientHeight / 2);
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!yearDropdown.contains(e.target) && e.target !== calYearText) {
            yearDropdown.classList.add('hidden');
        }
        if (!monthDropdown.contains(e.target) && e.target !== calMonthText) {
            monthDropdown.classList.add('hidden');
        }
    });

    calYearText.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            selectYear(calendarYear - 1);
        } else {
            selectYear(calendarYear + 1);
        }
    });

    calMonthText.addEventListener('wheel', (e) => {
        e.preventDefault();
        let newMonth = calendarMonth;
        let newYear = calendarYear;

        if (e.deltaY < 0) {
            newMonth--;
        } else {
            newMonth++;
        }
        
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        
        calendarYear = newYear;
        calendarMonth = newMonth;
        currentDate.setFullYear(newYear);
        currentDate.setMonth(newMonth);
        updateApp(currentDate);
        renderCalendar();
    });
}

function selectYear(y) {
    calendarYear = y;
    currentDate.setFullYear(y);
    updateApp(currentDate);
    renderCalendar();
}

function selectMonth(m) {
    calendarMonth = m;
    currentDate.setMonth(m);
    updateApp(currentDate);
    renderCalendar();
}

function startAnimation(direction) {
    if (currentAnimDirection === direction) {
        // If clicked again while playing in the same direction, speed up!
        currentAnimSpeed *= 2;
        if (currentAnimSpeed > 16) {
            currentAnimSpeed = 16; // Cap maximum speed multiplier
        }
    } else {
        currentAnimDirection = direction;
        currentAnimSpeed = 1;
    }

    if (animInterval) {
        clearInterval(animInterval);
    }

    animInterval = setInterval(() => {
        currentDate.setDate(currentDate.getDate() + (direction * currentAnimSpeed));
        calendarYear = currentDate.getFullYear();
        calendarMonth = currentDate.getMonth();
        updateApp(currentDate);
        renderCalendar(); 
    }, 66); // ~15 frames per sec (approx 15 days/sec baseline, exactly 3x the original 5 days/sec)
}

function stopAnimation() {
    if (animInterval) {
        clearInterval(animInterval);
        animInterval = null;
    }
    currentAnimDirection = 0;
}

function getElongationDirection(date) {
    const venusEq = Astronomy.Equator(Astronomy.Body.Venus, date, OBSERVER, true, true);
    const sunEq = Astronomy.Equator(Astronomy.Body.Sun, date, OBSERVER, true, true);
    let raDiffDeg = (venusEq.ra - sunEq.ra) * 15;
    while (raDiffDeg > 180) raDiffDeg -= 360;
    while (raDiffDeg < -180) raDiffDeg += 360;
    return raDiffDeg >= 0 ? 'east' : 'west';
}

function getMaxElongationLabel(date) {
    const dir = getElongationDirection(date);
    if (currentLanguage === 'jp') {
        return dir === 'east' ? '東方最大離角' : '西方最大離角';
    }
    return dir === 'east' ? 'Greatest Eastern Elongation' : 'Greatest Western Elongation';
}

function setLanguage(lang) {
    currentLanguage = lang;
    document.documentElement.lang = lang === 'jp' ? 'ja' : 'en';
    applyLanguage(lang);
    updateApp(currentDate);
    renderCalendar();
}

function applyLanguage(lang) {
    const t = TEXT[lang];
    document.title = t.appTitle;
    document.getElementById('app-title').textContent = t.appTitle;
    document.getElementById('astro-title').textContent = t.astroTitle;
    document.getElementById('calendar-title').textContent = t.calendarTitle;
    document.getElementById('label-phase').textContent = t.phase;
    document.getElementById('label-illumination').textContent = t.illumination;
    document.getElementById('label-magnitude').textContent = t.magnitude;
    document.getElementById('label-distance').textContent = t.distance;
    document.getElementById('label-diameter').textContent = t.diameter;
    document.getElementById('label-event').textContent = t.selectedEvent;
    todayBtn.textContent = t.today;
    toggleViewBtn.textContent = isOrbitView ? t.togglePhase : t.toggleOrbit;
    document.querySelectorAll('[data-i18n="month"]').forEach((el) => { el.textContent = t.month; });
    document.querySelectorAll('[data-i18n="week"]').forEach((el) => { el.textContent = t.week; });
    document.querySelectorAll('[data-i18n="day"]').forEach((el) => { el.textContent = t.day; });
    t.weekdays.forEach((dayName, i) => {
        document.getElementById(`weekday-${i}`).textContent = dayName;
    });
    langJpBtn.classList.toggle('active', lang === 'jp');
    langEnBtn.classList.toggle('active', lang === 'en');
}

// Main update function
function updateApp(date) {
    // Basic formatting
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    displayDateEl.textContent = `${yyyy}/${mm}/${dd}`;

    // Calculate Astronomy data for Venus
    const illum = Astronomy.Illumination(Astronomy.Body.Venus, date);
    // fraction is 0.0 to 1.0
    const fraction = illum.phase_fraction; 
    
    // Check if waxing or waning (comparing with tomorrow)
    const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const illumTomorrow = Astronomy.Illumination(Astronomy.Body.Venus, tomorrow);
    const isWaxing = illumTomorrow.phase_fraction > fraction;

    // Morning Star or Evening Star
    // Waxing means it's visible in Morning. Waning means visible in Evening.
    visOverlayEl.textContent = isWaxing ? TEXT[currentLanguage].morning : TEXT[currentLanguage].evening;

    const equ_ofdate = Astronomy.Equator(Astronomy.Body.Venus, date, OBSERVER, true, true);
    dataDistEl.textContent = `${equ_ofdate.dist.toFixed(3)} AU`;

    // Apparent Angular Diameter
    // Venus is ~16.92 arcseconds at 1 AU
    const angDiam = 16.92 / equ_ofdate.dist;
    dataDiamEl.textContent = `${angDiam.toFixed(1)} arcsec`;

    // Calculate Position Angle of Sun from Venus for realistic crescent tilt
    const sunEq = Astronomy.Equator(Astronomy.Body.Sun, date, OBSERVER, true, true);
    const rv = equ_ofdate.ra * 15 * Math.PI / 180;
    const dv = equ_ofdate.dec * Math.PI / 180;
    const rs = sunEq.ra * 15 * Math.PI / 180;
    const ds = sunEq.dec * Math.PI / 180;
    const dRa = rs - rv;
    const ySun = Math.sin(dRa);
    const xSun = Math.cos(dv) * Math.tan(ds) - Math.sin(dv) * Math.cos(dRa);
    const paSunObj = Math.atan2(ySun, xSun); 
    // paSunObj is 0 if Sun is North, PI/2 if East, -PI/2 if West.

    // Draw Visuals (both background cache, toggle determines visibility)
    drawVenus(fraction, isWaxing, illum.mag, ctx, canvas.width, angDiam, paSunObj);
    drawOrbitModel(date, orbitCtx, orbitCanvas.width);

    // Update Text info
    dataIllumEl.textContent = `${(fraction * 100).toFixed(1)}%`;
    dataMagEl.textContent = illum.mag.toFixed(2);

    // Determine phase name
    let phaseName = "";
    if (fraction < 0.03) phaseName = currentLanguage === 'jp' ? "新金星（内合）" : "New Venus (Inferior Conjunction)";
    else if (fraction > 0.97) phaseName = currentLanguage === 'jp' ? "満金星（外合）" : "Full Venus (Superior Conjunction)";
    else if (fraction > 0.45 && fraction < 0.55) {
        phaseName = isWaxing ? (currentLanguage === 'jp' ? "上弦付近" : "First Quarter") : (currentLanguage === 'jp' ? "下弦付近" : "Last Quarter");
    } else if (fraction <= 0.5) {
        phaseName = isWaxing ? (currentLanguage === 'jp' ? "満ちていく三日月" : "Waxing Crescent") : (currentLanguage === 'jp' ? "欠けていく三日月" : "Waning Crescent");
    } else {
        phaseName = isWaxing ? (currentLanguage === 'jp' ? "上弦" : "Waxing Gibbous") : (currentLanguage === 'jp' ? "下弦" : "Waning Gibbous");
    }
    dataPhaseEl.textContent = phaseName;

    // Update Event Box
    displayEventForDate(date);
}

function displayEventForDate(baselineDate) {
    // If the currently viewed date is an event itself, show it!
    const currentEv = checkDayForEvent(baselineDate);
    if (currentEv) {
        dataEventEl.textContent = `${currentEv}`;
        return;
    }

    dataEventEl.textContent = TEXT[currentLanguage].searching;
    setTimeout(() => {
        const result = searchEvent(baselineDate, 1); // find next
        if (result) {
            dataEventEl.textContent = currentLanguage === 'jp'
                ? `次: ${formatDate(result.date)} ${result.name}`
                : `${TEXT[currentLanguage].nextPrefix}: ${result.name} ${TEXT[currentLanguage].eventOn} ${formatDate(result.date)}`;
        } else {
            dataEventEl.textContent = TEXT[currentLanguage].noneFound;
        }
    }, 10);
}

function jumpToEvent(direction) {
    dataEventEl.textContent = TEXT[currentLanguage].jumping;
    setTimeout(() => {
        const result = searchEvent(currentDate, direction);
        if (result) {
            currentDate = new Date(result.date.getTime());
            calendarYear = currentDate.getFullYear();
            calendarMonth = currentDate.getMonth();
            updateApp(currentDate);
            renderCalendar();
        } else {
            dataEventEl.textContent = TEXT[currentLanguage].noneFound;
        }
    }, 10);
}

function searchEvent(startDate, direction) {
    let testDate = new Date(startDate.getTime());
    for (let i = 1; i <= 600; i++) {
        testDate.setDate(testDate.getDate() + direction);
        let ev = checkDayForEvent(testDate);
        if (ev) {
            return { name: ev, date: new Date(testDate.getTime()) };
        }
    }
    return null;
}

function checkDayForEvent(testDate) {
    const illum = Astronomy.Illumination(Astronomy.Body.Venus, testDate);
    const fraction = illum.phase_fraction;
    const elongToday = Astronomy.AngleFromSun(Astronomy.Body.Venus, testDate);
    
    // Check Conjunction Start
    if (elongToday < 3.5) {
        const elongYest = Astronomy.AngleFromSun(Astronomy.Body.Venus, new Date(testDate.getTime() - 24*3600*1000));
        if (elongYest >= 3.5) {
            if (currentLanguage === 'jp') {
                return fraction < 0.5 ? "内合 開始" : "外合 開始";
            }
            return fraction < 0.5 ? "Inf. Conj. Start" : "Sup. Conj. Start";
        }
    }
    
    // Check Greatest Elongation Approximation (Local Maximum)
    if (elongToday > 40) {
        const elongYest = Astronomy.AngleFromSun(Astronomy.Body.Venus, new Date(testDate.getTime() - 24*3600*1000));
        const elongTom = Astronomy.AngleFromSun(Astronomy.Body.Venus, new Date(testDate.getTime() + 24*3600*1000));
        if (elongToday > elongYest && elongToday > elongTom) {
            return getMaxElongationLabel(testDate);
        }
    }
    
    return null;
}

function formatDate(d) {
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

// Draw Venus Phase on Canvas
function drawVenus(fraction, isWaxing, mag, targetCtx, canvasSize, angDiam, paSun) {
    targetCtx.clearRect(0, 0, canvasSize, canvasSize);
    
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    
    const maxAngDiam = 66.0;
    const maxRadius = (canvasSize / 2) * 0.85; 
    let radius = maxRadius * (angDiam / maxAngDiam);
    radius = Math.max(radius, canvasSize * 0.15);

    const glowStr = Math.max(10, (-mag - 3) * (canvasSize / 25)); 
    targetCtx.canvas.style.filter = `drop-shadow(0 0 ${glowStr}px rgba(226, 192, 141, 0.6))`;

    targetCtx.save();
    targetCtx.translate(cx, cy);
    
    // Rotate canvas based on Position Angle so the crescent tilts realistically.
    // Our base logic draws bright limb Left or Right depending on isWaxing.
    // To cleanly reflect the physical Sun direction PA, we can just base the rotation on PA.
    // In our base draw, we drew it straight up/down.
    // For East/West orientation: Morning star (Waxing) = Sun is mostly East (PA = +PI/2).
    // Our old code drew Waxing on the RIGHT (+X). If we align +X (Right) with PA, we rotate by PA - PI/2.
    // We apply this pure rotation to give the crescent realistic tilt!
    if (paSun !== undefined) {
        // we invert the angle to map Celestial coordinates to Canvas coordinates (Y grows down)
        // and adjust the baseline depending on waxing/waning geometry.
        let rotationTarget = -paSun + Math.PI/2;
        if (!isWaxing) rotationTarget += Math.PI; 
        targetCtx.rotate(rotationTarget);
    }

    // Draw full dark circle first
    targetCtx.beginPath();
    targetCtx.arc(0, 0, radius, 0, Math.PI * 2);
    targetCtx.fillStyle = "#111827"; 
    targetCtx.fill();

    // If waxing, bright limb is on the right. If waning, left.
    // Wait, Venus as evening star (waning) is illuminated on the sun side (west).
    // Let's just use standard left/right representation.
    const sweep = isWaxing ? 1 : -1;

    // Draw bright half circle
    targetCtx.beginPath();
    targetCtx.arc(0, 0, radius, -Math.PI/2, Math.PI/2, isWaxing); // draw half circle
    
    // Draw terminator (ellipse)
    // For fraction = 0 to 0.5 (crescent), terminator bows OUTWARD (adding dark)
    // For fraction = 0.5 to 1 (gibbous), terminator bows INWARD (adding bright)
    
    // Scale X from 1 (full) to -1 (new)
    // When fraction = 1 (Full), terminator must be on the opposite side (-1) to fill circle
    // When fraction = 0 (New), terminator must be on the same side (+1) to fill zero area
    const scaleX = 1 - (fraction * 2); 

    // To draw ellipse path, we use bezier or scale
    // Actually going back from bottom to top
    // The arc ended at bottom (PI/2). To go back to top (-PI/2).
    // If we use ctx.ellipse:
    // we just fill a path that outlines the bright part.
    // Better: clip the drawing area.
    targetCtx.closePath();

    // Venus Color Texture (Smooth yellowish/white gradient)
    const gradient = targetCtx.createLinearGradient(-radius, -radius, radius, radius);
    gradient.addColorStop(0, "#FEF3C7");
    gradient.addColorStop(1, "#D97706");

    targetCtx.fillStyle = gradient;

    // Draw full Phase Path
    targetCtx.beginPath();
    // Exterior half circle
    if (isWaxing) {
        targetCtx.arc(0, 0, radius, -Math.PI/2, Math.PI/2, false); // Right side
    } else {
        targetCtx.arc(0, 0, radius, -Math.PI/2, Math.PI/2, true);  // Left side
    }

    // Terminator
    // An ellipse from (0, radius) to (0, -radius)
    for (let y = radius; y >= -radius; y -= 2) {
        // x = sqrt(r^2 - y^2) for circle. 
        // scale x by scaleX.
        let x = Math.sqrt(radius * radius - y * y) * scaleX;
        if (!isWaxing) x = -x; 
        targetCtx.lineTo(x, y);
    }
    
    targetCtx.closePath();
    targetCtx.fill();

    targetCtx.restore();
}

function drawOrbitModel(date, targetCtx, canvasSize) {
    const sunEq = Astronomy.Equator(Astronomy.Body.Sun, date, OBSERVER, true, true);
    const venEq = Astronomy.Equator(Astronomy.Body.Venus, date, OBSERVER, true, true);
    const moonEq = Astronomy.Equator(Astronomy.Body.Moon, date, OBSERVER, true, true);
    
    const deg2rad = Math.PI / 180;
    
    // Geocentric vectors
    const toGeoVec = (eq) => {
        const ra = eq.ra * 15 * deg2rad;
        const dec = eq.dec * deg2rad;
        return {
            x: eq.dist * Math.cos(dec) * Math.cos(ra),
            y: eq.dist * Math.cos(dec) * Math.sin(ra),
            z: eq.dist * Math.sin(dec)
        };
    };
    
    const sG = toGeoVec(sunEq);
    const vG = toGeoVec(venEq);
    const mG = toGeoVec(moonEq);
    
    // Heliocentric vectors
    const eH = { x: -sG.x, y: -sG.y, z: -sG.z }; // Earth is opposite Sun
    const vH = { x: vG.x - sG.x, y: vG.y - sG.y, z: vG.z - sG.z };
    
    // Ecliptic transformation
    const obl = 23.43928 * deg2rad;
    const toEcliptic = (pos) => ({
        x: pos.x,
        y: pos.y * Math.cos(obl) + pos.z * Math.sin(obl)
    });
    
    const earthEcl = toEcliptic(eH);
    const venusEcl = toEcliptic(vH);
    const moonEclVector = toEcliptic(mG); // vector from Earth to Moon
    
    targetCtx.clearRect(0, 0, canvasSize, canvasSize);
    
    const cx = canvasSize / 2;
    const cy = (canvasSize / 2) - 15; // Shifted up slightly to avoid date overlay
    // scale 1 AU to radius mapping
    const scale = canvasSize * 0.35; 
    
    // Orbits
    targetCtx.beginPath();
    targetCtx.arc(cx, cy, scale * 1.0, 0, Math.PI*2); 
    targetCtx.strokeStyle = 'rgba(255,255,255,0.1)';
    targetCtx.stroke();
    
    targetCtx.beginPath();
    targetCtx.arc(cx, cy, scale * 0.723, 0, Math.PI*2); 
    targetCtx.stroke();
    
    const exLocal = cx + earthEcl.x * scale;
    const eyLocal = cy - earthEcl.y * scale; 
    
    const vxLocal = cx + venusEcl.x * scale;
    const vyLocal = cy - venusEcl.y * scale;
    
    // Line Earth to Sun
    targetCtx.beginPath();
    targetCtx.moveTo(exLocal, eyLocal);
    targetCtx.lineTo(cx, cy);
    targetCtx.strokeStyle = 'rgba(255,255,255,0.2)';
    targetCtx.setLineDash([5, 5]);
    targetCtx.stroke();
    targetCtx.setLineDash([]);
    
    // Line Earth to Venus
    targetCtx.beginPath();
    targetCtx.moveTo(exLocal, eyLocal);
    targetCtx.lineTo(vxLocal, vyLocal);
    targetCtx.strokeStyle = 'rgba(226, 192, 141, 0.6)';
    targetCtx.stroke();
    
    // Draw Hemisphere function
    const drawHemispherePlanet = (x, y, radius, color) => {
        const angleToSun = Math.atan2(cy - y, cx - x);
        
        // Bright half
        targetCtx.beginPath();
        targetCtx.arc(x, y, radius, angleToSun - Math.PI/2, angleToSun + Math.PI/2, false);
        targetCtx.fillStyle = color;
        targetCtx.fill();
        
        // Dark half (faces away from sun)
        targetCtx.beginPath();
        targetCtx.arc(x, y, radius, angleToSun + Math.PI/2, angleToSun - Math.PI/2, false);
        targetCtx.fillStyle = '#1f2937'; 
        targetCtx.fill();
        
        // Border
        targetCtx.beginPath();
        targetCtx.arc(x, y, radius, 0, Math.PI*2);
        targetCtx.strokeStyle = color;
        targetCtx.stroke();
    };

    // Sun
    targetCtx.beginPath();
    targetCtx.arc(cx, cy, 14, 0, Math.PI*2);
    targetCtx.fillStyle = '#FCD34D';
    targetCtx.shadowBlur = 20;
    targetCtx.shadowColor = '#FBBF24';
    targetCtx.fill();
    targetCtx.shadowBlur = 0;
    
    // Earth
    drawHemispherePlanet(exLocal, eyLocal, 8, '#60A5FA');
    
    // Venus
    drawHemispherePlanet(vxLocal, vyLocal, 6, '#FDE68A');

    // Moon
    // Normalize Moon vector and artificially expand distance to be visually distinct from Earth
    const moonNorm = Math.sqrt(moonEclVector.x * moonEclVector.x + moonEclVector.y * moonEclVector.y);
    const moonDistPx = 15; // 15 pixels away from earth
    const mxLocal = exLocal + (moonEclVector.x / moonNorm) * moonDistPx;
    const myLocal = eyLocal - (moonEclVector.y / moonNorm) * moonDistPx;
    
    drawHemispherePlanet(mxLocal, myLocal, 3, '#D1D5DB');
}

// Calendar Generator
function renderCalendar() {
    calDaysEl.innerHTML = ''; // clear
    calYearText.textContent = calendarYear;
    calMonthText.textContent = String(calendarMonth + 1).padStart(2, '0');

    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    // Pre-calculate month events
    const dStart = new Date(calendarYear, calendarMonth, 1);
    let maxElongDay = -1;
    try {
        const nextMax = Astronomy.SearchMaxElongation(Astronomy.Body.Venus, dStart);
        if (nextMax && nextMax.time.date.getFullYear() === calendarYear && nextMax.time.date.getMonth() === calendarMonth) {
            maxElongDay = nextMax.time.date.getDate();
        }
    } catch(e) {}

    // Fill empty slots
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('cal-day', 'empty');
        calDaysEl.appendChild(emptyDiv);
    }

    // Today exact check
    const today = new Date();
    const isTodayMonth = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth;
    
    // Currently selected day check
    const selDateYear = currentDate.getFullYear();
    const selDateMonth = currentDate.getMonth();
    const selDateDay = currentDate.getDate();

    for (let d = 1; d <= daysInMonth; d++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('cal-day');
        if (new Date(calendarYear, calendarMonth, d).getDay() === 0) {
            dayDiv.classList.add('sun-day');
        }
        if (new Date(calendarYear, calendarMonth, d).getDay() === 5) {
            dayDiv.classList.add('venus-friday');
        }
        
        // Identify if "today"
        if (isTodayMonth && d === today.getDate()) {
            dayDiv.classList.add('today');
        }

        // Identify if currently selected
        if (calendarYear === selDateYear && calendarMonth === selDateMonth && d === selDateDay) {
            dayDiv.classList.add('selected');
        }

        const dateForCalc = new Date(calendarYear, calendarMonth, d);
        const illum = Astronomy.Illumination(Astronomy.Body.Venus, dateForCalc);
        const fraction = illum.phase_fraction;

        const dateForNext = new Date(dateForCalc.getTime() + 24*3600*1000);
        const nextIllum = Astronomy.Illumination(Astronomy.Body.Venus, dateForNext);
        const isWaxing = nextIllum.phase_fraction > fraction;
        
        // Calculate AngDiam for calendar representation
        const calEqu = Astronomy.Equator(Astronomy.Body.Venus, dateForCalc, OBSERVER, true, true);
        const calAngDiam = 16.92 / calEqu.dist;

        // Calculate PA for calendar representation
        const sunEq = Astronomy.Equator(Astronomy.Body.Sun, dateForCalc, OBSERVER, true, true);
        const rv = calEqu.ra * 15 * Math.PI / 180;
        const dv = calEqu.dec * Math.PI / 180;
        const rs = sunEq.ra * 15 * Math.PI / 180;
        const ds = sunEq.dec * Math.PI / 180;
        const dRa = rs - rv;
        const ySun = Math.sin(dRa);
        const xSun = Math.cos(dv) * Math.tan(ds) - Math.sin(dv) * Math.cos(dRa);
        const calPaSun = Math.atan2(ySun, xSun);

        // Determine Events
        let eventName = "";
        
        if (d === maxElongDay) {
            eventName = getMaxElongationLabel(dateForCalc);
        } else {
            // Check Conjunction Start/End
            const elongToday = Astronomy.AngleFromSun(Astronomy.Body.Venus, dateForCalc);
            
            if (elongToday < 3.5) {
                const dateYest = new Date(dateForCalc.getTime() - 24*3600*1000);
                const dateTom = new Date(dateForCalc.getTime() + 24*3600*1000);
                const elongYest = Astronomy.AngleFromSun(Astronomy.Body.Venus, dateYest);
                const elongTom = Astronomy.AngleFromSun(Astronomy.Body.Venus, dateTom);
                
                const prefix = currentLanguage === 'jp'
                    ? (fraction < 0.5 ? "内合" : "外合")
                    : (fraction < 0.5 ? "Inf. Conj." : "Sup. Conj.");
                
                if (elongYest >= 3.5 && elongTom < 3.5) {
                    eventName = `${prefix} Start`;
                } else if (elongYest < 3.5 && elongTom >= 3.5) {
                    eventName = `${prefix} End`;
                } else if (elongYest >= 3.5 && elongTom >= 3.5) {
                    eventName = `${prefix}`;
                }
            }
        }

        // Check Moon Occultation / extremely close approach
        if (!eventName) {
            const moonEq = Astronomy.Equator(Astronomy.Body.Moon, dateForCalc, OBSERVER, true, true);
            const calDecRad = calEqu.dec * Math.PI / 180;
            const moonDecRad = moonEq.dec * Math.PI / 180;
            const raDiffRad = (calEqu.ra - moonEq.ra) * 15 * Math.PI / 180;
            
            const sepAngleRad = Math.acos(
                Math.sin(calDecRad) * Math.sin(moonDecRad) + 
                Math.cos(calDecRad) * Math.cos(moonDecRad) * Math.cos(raDiffRad)
            );
            const sepAngleDeg = sepAngleRad * 180 / Math.PI;

            if (sepAngleDeg < 0.7) {
                eventName = currentLanguage === 'jp' ? "月に接近" : "Close Occult.";
            }
        }

        dayDiv.innerHTML = `
            <span class="day-number">${d}</span>
            <div class="day-canvas-container">
                <canvas id="cal-canvas-${calendarYear}-${calendarMonth}-${d}"></canvas>
            </div>
            ${eventName ? `<div class="cal-event">${eventName}</div>` : ''}
        `;

        dayDiv.addEventListener('click', () => {
            currentDate = new Date(calendarYear, calendarMonth, d);
            updateApp(currentDate);
            renderCalendar(); // re-render to update 'selected' class
            
            // Scroll top smoothly
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });


        calDaysEl.appendChild(dayDiv);

        // Draw the mini canvas after appending to DOM
        const calCanvas = document.getElementById(`cal-canvas-${calendarYear}-${calendarMonth}-${d}`);
        const miniSize = Math.max(14, Math.floor(dayDiv.clientWidth * 0.42));
        calCanvas.width = miniSize;
        calCanvas.height = miniSize;
        const calCtx = calCanvas.getContext('2d');
        // Render mini version (CSS filter applies glow)
        drawVenus(fraction, isWaxing, illum.mag, calCtx, miniSize, calAngDiam, calPaSun);
    }
}


// Start
document.addEventListener('DOMContentLoaded', init);
