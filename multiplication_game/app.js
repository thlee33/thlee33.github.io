// Game Configuration
const CONFIG = {
    startTimer: 10.0,
    timerDecrement: 0.1,
    minTimer: 1.0
};

// State Variables
let gameState = {
    email: '',
    stage: 1,
    score: 0,
    timeLeft: 10.0,
    currentAnswer: 0,
    timerInterval: null,
    isGameActive: false
};

// DOM Elements
const screens = {
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

const inputEmail = document.getElementById('user-email');
const inputAnswer = document.getElementById('answer-input');
const displayQuestion = document.getElementById('question');
const displayStage = document.getElementById('current-stage');
const displayScore = document.getElementById('current-score');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const finalStageText = document.getElementById('final-stage');
const userRankText = document.getElementById('user-rank');
const leaderboardContainer = document.getElementById('leaderboard');

// Event Listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', () => showScreen('setup'));

inputAnswer.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (value === gameState.currentAnswer) {
        correctAnswer();
    }
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

    gameState = {
        email: email,
        stage: 1,
        score: 0,
        timeLeft: CONFIG.startTimer,
        currentAnswer: 0,
        timerInterval: null,
        isGameActive: true
    };

    updateStats();
    showScreen('game');
    nextQuestion();
    startTimer();
    
    // Auto focus input
    setTimeout(() => inputAnswer.focus(), 500);
}

function nextQuestion() {
    inputAnswer.value = '';
    
    // Generate numbers based on stage for increasing difficulty (optional but good)
    // Here we'll just do standard 2x1 to 9x9 first, then bit more
    let num1, num2;
    if (gameState.stage <= 20) {
        num1 = Math.floor(Math.random() * 8) + 2; // 2-9
        num2 = Math.floor(Math.random() * 8) + 2; // 2-9
    } else {
        num1 = Math.floor(Math.random() * 15) + 2; // 2-16
        num2 = Math.floor(Math.random() * 9) + 2;  // 2-10
    }
    
    gameState.currentAnswer = num1 * num2;
    displayQuestion.textContent = `${num1} × ${num2} = ?`;
}

function correctAnswer() {
    gameState.score += 10;
    gameState.stage += 1;
    
    // Update timer for next stage: 10 - (stage-1)*0.1
    // Stage 1 -> 10s
    // Stage 2 -> 9.9s
    const newTime = Math.max(CONFIG.minTimer, CONFIG.startTimer - (gameState.stage - 1) * CONFIG.timerDecrement);
    gameState.timeLeft = newTime;
    
    updateStats();
    nextQuestion();
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
            gameOver();
        } else {
            updateTimerUI();
            requestAnimationFrame(tick);
        }
    };
    
    requestAnimationFrame(tick);
}

function updateTimerUI() {
    const maxTime = Math.max(CONFIG.minTimer, CONFIG.startTimer - (gameState.stage - 1) * CONFIG.timerDecrement);
    const percentage = (gameState.timeLeft / maxTime) * 100;
    timerBar.style.width = `${percentage}%`;
    timerText.textContent = `${gameState.timeLeft.toFixed(1)}s`;
    
    // Color change when low time
    if (percentage < 30) {
        timerBar.style.background = 'var(--secondary)';
    } else {
        timerBar.style.background = 'linear-gradient(to right, var(--primary), var(--secondary))';
    }
}

function updateStats() {
    displayStage.textContent = gameState.stage;
    displayScore.textContent = gameState.score;
}

function gameOver() {
    gameState.isGameActive = false;
    screens.game.classList.add('shake');
    
    setTimeout(() => {
        screens.game.classList.remove('shake');
        saveAndShowRanking();
    }, 500);
}

function saveAndShowRanking() {
    // Save to LocalStorage
    const rankings = JSON.parse(localStorage.getItem('gugudan_rankings') || '[]');
    rankings.push({
        email: gameState.email,
        score: gameState.score,
        stage: gameState.stage,
        date: new Date().toISOString()
    });
    
    // Sort rankings
    rankings.sort((a, b) => b.score - a.score || b.stage - a.stage);
    
    // Limit to top 50
    const topRankings = rankings.slice(0, 50);
    localStorage.setItem('gugudan_rankings', JSON.stringify(topRankings));
    
    // Find current user's rank
    const userRankIndex = rankings.findIndex(r => r.email === gameState.email && r.score === gameState.score) + 1;
    
    // Update UI
    finalStageText.textContent = gameState.stage;
    userRankText.textContent = `${userRankIndex}위`;
    
    // Render Leaderboard
    leaderboardContainer.innerHTML = '';
    topRankings.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'rank-item' + (entry.email === gameState.email && entry.score === gameState.score ? ' highlight' : '');
        item.innerHTML = `
            <span class="rank-pos">${index + 1}</span>
            <span class="rank-email">${entry.email}</span>
            <span class="rank-score">${entry.score}점</span>
        `;
        leaderboardContainer.appendChild(item);
    });
    
    showScreen('result');
}
