// Game Configuration
const CONFIG = {
    startTimer: 30.0,
    timerDecrement: 0.1,
    minTimer: 2.0,
    initialZoom: 1,
    cityStageThreshold: 10 // Shift to cities after stage 10
};

// State Variables
let gameState = {
    email: '',
    stage: 1,
    score: 0,
    lives: 3,
    timeLeft: 30.0,
    currentLocation: null,
    isGameActive: false,
    map: null,
    wrongCount: 0
};

// DOM Elements
const screens = {
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

const inputEmail = document.getElementById('user-email');
const inputAnswer = document.getElementById('answer-input');
const feedback = document.getElementById('feedback');
const displayStage = document.getElementById('current-stage');
const displayScore = document.getElementById('current-score');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const finalStageText = document.getElementById('final-stage');
const userRankText = document.getElementById('user-rank');
const leaderboardContainer = document.getElementById('leaderboard');

// Initialize MapLibre
function initMap() {
    gameState.map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            sources: {
                'esri-satellite': {
                    type: 'raster',
                    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                    tileSize: 256,
                    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                },
                'osm-labels': {
                    type: 'raster',
                    tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
                    tileSize: 256
                }
            },
            layers: [
                {
                    id: 'satellite',
                    type: 'raster',
                    source: 'esri-satellite',
                    minzoom: 0,
                    maxzoom: 20
                },
                {
                    id: 'boundaries',
                    type: 'raster',
                    source: 'osm-labels',
                    minzoom: 0,
                    maxzoom: 20,
                    paint: {
                        'raster-opacity': 1.0,
                        'raster-brightness-max': 1.0,
                        'raster-contrast': 0.1
                    }
                }
            ]
        },
        center: [0, 0],
        zoom: 1,
        interactive: false
    });
}

// Event Listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', () => {
    gameState.isGameActive = false;
    showScreen('setup');
});
document.getElementById('submit-btn').addEventListener('click', checkAnswer);

inputAnswer.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
});

inputEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startGame();
});

// Navigation
function showScreen(screenKey) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenKey].classList.add('active');
}

// Game Logic
function startGame() {
    const email = inputEmail.value.trim();
    if (!email || !email.includes('@')) {
        alert('올바른 이메일 주소를 입력해주세요.');
        return;
    }

    gameState.email = email;
    gameState.stage = 1;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.wrongCount = 0;
    gameState.timeLeft = CONFIG.startTimer;
    gameState.isGameActive = true;

    if (!gameState.map) initMap();

    updateStats();
    showScreen('game');

    // Ensure map takes full container size after screen transition
    if (gameState.map) {
        setTimeout(() => gameState.map.resize(), 100);
    }

    nextLocation();
    startTimer();

    setTimeout(() => inputAnswer.focus(), 600);
}

function nextLocation() {
    inputAnswer.value = '';
    feedback.textContent = '';
    feedback.className = 'feedback';

    // Filter locations based on stage
    let pool = [];
    if (gameState.stage < CONFIG.cityStageThreshold) {
        pool = LOCATIONS.filter(loc => loc.type === 'country');
    } else {
        pool = LOCATIONS.filter(loc => loc.type === 'city');
    }

    // fallback to any if pool is empty
    if (pool.length === 0) pool = LOCATIONS;

    const randomLoc = pool[Math.floor(Math.random() * pool.length)];
    gameState.currentLocation = randomLoc;
    gameState.wrongCount = 0; // Reset wrong count for new location

    // Control Label Visibility: Always show boundaries, but maybe dim them or keep them for help
    // As per user request: "Show boundaries and labels for cities"
    // We will keep the 'boundaries' layer visible always as it helps context.

    // Move Map
    gameState.map.flyTo({
        center: [randomLoc.lng, randomLoc.lat],
        zoom: randomLoc.zoom,
        essential: true,
        duration: 1500
    });
}

function checkAnswer() {
    if (!gameState.isGameActive) return;

    const userAnswer = inputAnswer.value.trim().toLowerCase();
    const correctAnswers = gameState.currentLocation.name.map(n => n.toLowerCase());

    if (correctAnswers.includes(userAnswer)) {
        handleCorrect();
    } else {
        handleWrong();
    }
}

function handleCorrect() {
    gameState.score += 100;
    gameState.stage += 1;
    gameState.wrongCount = 0;

    // Decrement timer
    const maxTime = Math.max(CONFIG.minTimer, CONFIG.startTimer - (gameState.stage - 1) * CONFIG.timerDecrement);
    gameState.timeLeft = maxTime;

    feedback.textContent = `정답입니다! (${gameState.currentLocation.name[0]}) +100`;
    feedback.className = 'feedback correct';

    updateStats();
    setTimeout(nextLocation, 1500);
}

function handleWrong() {
    gameState.wrongCount += 1;
    gameState.lives -= 1;

    updateStats();

    if (gameState.lives <= 0) {
        feedback.textContent = `틀렸습니다. 정답은 [${gameState.currentLocation.name[0]}]이었습니다.`;
        feedback.className = 'feedback wrong';
        gameOver();
        return;
    }

    if (gameState.wrongCount >= 1) {
        // Show hint: first character of the primary name
        const cityName = gameState.currentLocation.name[0];
        const hintChar = cityName.charAt(0);
        feedback.textContent = `틀렸습니다! 정답 힌트: "${hintChar}..." (남은 기회: ${gameState.lives})`;
    } else {
        feedback.textContent = `틀렸습니다! 다시 시도하세요. (남은 기회: ${gameState.lives})`;
    }

    feedback.className = 'feedback wrong';
    document.getElementById('game-screen').classList.add('shake');
    setTimeout(() => {
        document.getElementById('game-screen').classList.remove('shake');
    }, 400);
}

function startTimer() {
    let lastTime = performance.now();

    const tick = (now) => {
        if (!gameState.isGameActive) return;

        const delta = (now - lastTime) / 1000;
        lastTime = now;

        gameState.timeLeft -= delta;

        if (gameState.timeLeft <= 0) {
            gameState.timeLeft = 0;
            updateTimerUI();
            gameOver();
        } else {
            updateTimerUI();
            requestAnimationFrame(tick);
        }
    };

    requestAnimationFrame(tick);
}

function updateTimerUI() {
    const maxTimeForCurrentStage = Math.max(CONFIG.minTimer, CONFIG.startTimer - (gameState.stage - 1) * CONFIG.timerDecrement);
    const percentage = (gameState.timeLeft / maxTimeForCurrentStage) * 100;
    timerBar.style.width = `${percentage}%`;
    timerText.textContent = `${gameState.timeLeft.toFixed(1)}s`;

    if (percentage < 30) {
        timerBar.style.background = 'var(--danger)';
    } else {
        timerBar.style.background = 'linear-gradient(to right, #22c55e, #eab308)';
    }
}

function updateStats() {
    displayStage.textContent = gameState.stage;
    displayScore.textContent = gameState.score;
    // Add lives display to UI if exists, or just log
    const livesContainer = document.getElementById('lives-display');
    if (livesContainer) {
        livesContainer.textContent = '❤️'.repeat(gameState.lives);
    }
}

function gameOver() {
    gameState.isGameActive = false;
    saveAndShowRanking();
}

function saveAndShowRanking() {
    let rankings = JSON.parse(localStorage.getItem('geo_rankings') || '[]');

    // Find if user already has a record
    const existingIndex = rankings.findIndex(r => r.email === gameState.email);

    if (existingIndex !== -1) {
        // Update only if new score is higher
        if (gameState.score > rankings[existingIndex].score) {
            rankings[existingIndex] = {
                email: gameState.email,
                score: gameState.score,
                stage: gameState.stage,
                date: new Date().toISOString()
            };
        }
    } else {
        // New user
        rankings.push({
            email: gameState.email,
            score: gameState.score,
            stage: gameState.stage,
            date: new Date().toISOString()
        });
    }

    // Deduplicate entire list by email (keeping only the best score for each)
    const uniqueRankingsMap = new Map();
    rankings.forEach(entry => {
        if (!uniqueRankingsMap.has(entry.email) || entry.score > uniqueRankingsMap.get(entry.email).score) {
            uniqueRankingsMap.set(entry.email, entry);
        }
    });
    rankings = Array.from(uniqueRankingsMap.values());

    // Sort: High score first, then high stage
    rankings.sort((a, b) => b.score - a.score || b.stage - a.stage);

    // Save all unique records (limited to 100 for storage)
    localStorage.setItem('geo_rankings', JSON.stringify(rankings.slice(0, 100)));

    // Top 10 for display
    const topRankings = rankings.slice(0, 10);

    // Find current user's rank among unique emails
    const userRankIndex = rankings.findIndex(r => r.email === gameState.email) + 1;

    finalStageText.textContent = gameState.stage;
    userRankText.textContent = `${userRankIndex}위`;

    leaderboardContainer.innerHTML = '';
    topRankings.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'rank-item' + (entry.email === gameState.email ? ' highlight' : '');
        item.innerHTML = `
            <span>${index + 1}. ${entry.email}</span>
            <span style="font-weight:700">${entry.score} pts</span>
        `;
        leaderboardContainer.appendChild(item);
    });

    showScreen('result');
}
