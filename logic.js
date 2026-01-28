// --- STATE MANAGEMENT ---
let fullData = { grammar: [], vocabulary: [] };
let currentMode = 'grammar';
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let streak = 0;

let sessionAnalytics = {}; 

// Load Memory (Smart Review Data)
let lifetimeData = JSON.parse(localStorage.getItem('germanPro_storage')) || {
    totalQuestions: 0,
    totalErrors: 0,
    categoryStats: {} 
};

// --- 1. SETUP ---
async function loadQuestions() {
    try {
        const [grammarRes, vocabRes] = await Promise.all([
            fetch('data/grammar.json'),
            fetch('data/vocabulary.json')
        ]);
        fullData.grammar = await grammarRes.json();
        fullData.vocabulary = await vocabRes.json();
        
        if (localStorage.getItem('germanPro_streak')) {
            streak = parseInt(localStorage.getItem('germanPro_streak'));
            updateStats();
        }
        switchMode('grammar'); 
    } catch (error) { console.error(error); }
}

// --- 2. THE SMART ALGORITHM ---
function switchMode(mode) {
    currentMode = mode;
    const allQuestions = fullData[mode];
    
    // A. Identify Weak Categories (< 50% accuracy)
    let weakCategories = [];
    for (const [cat, stats] of Object.entries(lifetimeData.categoryStats)) {
        if (stats.attempts > 0 && (stats.correct / stats.attempts) < 0.5) {
            weakCategories.push(cat);
        }
    }

    // B. Priority Queue Logic
    let priorityQuestions = [];
    if (weakCategories.length > 0) {
        priorityQuestions = allQuestions.filter(q => weakCategories.includes(q.category));
        priorityQuestions = priorityQuestions.sort(() => 0.5 - Math.random()).slice(0, 4);
    }

    // C. Fill with Random Questions
    const priorityIds = priorityQuestions.map(q => q.id);
    let remainingPool = allQuestions.filter(q => !priorityIds.includes(q.id));
    let needed = 10 - priorityQuestions.length;
    let randomFill = remainingPool.sort(() => 0.5 - Math.random()).slice(0, needed);

    // D. Final Mix
    currentQuestions = [...priorityQuestions, ...randomFill].sort(() => 0.5 - Math.random());

    // Reset Session
    currentIndex = 0;
    score = 0; 
    sessionAnalytics = {}; 
    
    // UI Updates
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('onclick').includes(mode)) btn.classList.add('active');
    });
    
    // Smart Header
    let titleText = `${mode.toUpperCase()} (Session: ${currentQuestions.length})`;
    if (priorityQuestions.length > 0) {
        titleText += " 🔥 Smart Review Active";
    }
    document.getElementById('mode-title').innerText = titleText;
    
    updateStats();
    renderQuestion();
}

// --- 3. RENDER UI ---
function renderQuestion() {
    if (currentIndex >= currentQuestions.length) {
        saveLifetimeData();
        showAnalyticsReport(); 
        return;
    }

    const q = currentQuestions[currentIndex];
    document.getElementById("question-text").innerText = q.question;
    document.getElementById("feedback").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    
    const container = document.getElementById("options-container");
    container.innerHTML = "";
    container.style.display = "grid"; 

    q.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(opt, q.answer, q.explanation, q.category);
        container.appendChild(btn);
    });
}

// --- 4. CHECK ANSWER ---
function checkAnswer(selected, correct, explanation, category) {
    const feedback = document.getElementById("feedback");
    const buttons = document.querySelectorAll("#options-container button");
    buttons.forEach(b => b.disabled = true);

    const cat = category || "General";
    
    if (!sessionAnalytics[cat]) sessionAnalytics[cat] = { total: 0, errors: 0 };
    sessionAnalytics[cat].total++;

    if (!lifetimeData.categoryStats[cat]) lifetimeData.categoryStats[cat] = { attempts: 0, correct: 0 };
    lifetimeData.categoryStats[cat].attempts++;
    lifetimeData.totalQuestions++;

    if (selected === correct) {
        feedback.className = "feedback success";
        feedback.innerText = "Correct!";
        score += 10;
        streak++;
        lifetimeData.categoryStats[cat].correct++;
        setTimeout(nextQuestion, 1000);
    } else {
        feedback.className = "feedback error";
        feedback.innerText = `Wrong. ${explanation}`;
        streak = 0;
        sessionAnalytics[cat].errors++;
        lifetimeData.totalErrors++;
        document.getElementById("next-btn").style.display = "block";
    }
    
    localStorage.setItem('germanPro_streak', streak);
    feedback.style.display = "block";
    updateStats();
}

function nextQuestion() {
    currentIndex++;
    renderQuestion();
}

function updateStats() {
    document.getElementById("score").innerText = score;
    document.getElementById("streak").innerText = streak;
}

// --- 5. SAVE DATA ---
function saveLifetimeData() {
    localStorage.setItem('germanPro_storage', JSON.stringify(lifetimeData));
}

// --- 6. REPORT CARD ---
function showAnalyticsReport() {
    const container = document.querySelector(".container");
    document.getElementById("options-container").style.display = "none";
    document.getElementById("feedback").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    
    let headerText = "Performance Review";
    if (score === 100) headerText = "🏆 Perfect Session!";
    else if (score < 50) headerText = "⚠️ Needs Focus";
    document.getElementById("question-text").innerText = headerText;

    let reportHTML = `<div class="report-card">
        <h3>Session Score: ${score}</h3>
        <p style="text-align:center; color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px;">
            Total Solved: <b style="color:white">${lifetimeData.totalQuestions}</b>
        </p>`;

    const sortedCats = Object.keys(sessionAnalytics).sort((a,b) => {
        const rateA = sessionAnalytics[a].errors / sessionAnalytics[a].total;
        const rateB = sessionAnalytics[b].errors / sessionAnalytics[b].total;
        return rateB - rateA;
    });

    sortedCats.forEach(cat => {
        const sData = sessionAnalytics[cat];
        const lData = lifetimeData.categoryStats[cat];
        const sessionErrorRate = Math.round((sData.errors / sData.total) * 100);
        const lifetimeAccuracy = Math.round((lData.correct / lData.attempts) * 100);
        
        let statusColor = sessionErrorRate > 50 ? "#ef4444" : (sessionErrorRate > 0 ? "#f59e0b" : "#22c55e");
        let statusText = sessionErrorRate > 50 ? "Weakness" : "Mastered";

        reportHTML += `
            <div class="stat-row">
                <div style="display:flex; justify-content:space-between;">
                    <span class="stat-name">${cat}</span>
                    <span style="font-size:0.75rem; color:#64748b;">Lifetime Acc: ${lifetimeAccuracy}%</span>
                </div>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width: ${100 - sessionErrorRate}%; background: ${statusColor}"></div>
                </div>
                <span class="stat-label" style="color: ${statusColor}">${statusText}</span>
            </div>
        `;
    });
    
    reportHTML += `<button onclick="location.reload()" id="restart-btn">Start New Session</button></div>`;
    
    const reportContainer = document.createElement("div");
    reportContainer.innerHTML = reportHTML;
    container.appendChild(reportContainer);
}

loadQuestions();