// --- STATE MANAGEMENT ---
let fullData = { grammar: [], vocabulary: [] };
let currentMode = 'grammar';
let currentQuestions = [];
let currentIndex = 0;
let score = 0;         // Session Score
let streak = 0;        // Current Streak

// Session Analytics (Resets every 10 questions)
let sessionAnalytics = {}; 

// Lifetime Analytics (Loaded from Browser Memory)
let lifetimeData = JSON.parse(localStorage.getItem('germanPro_storage')) || {
    totalQuestions: 0,
    totalErrors: 0,
    categoryStats: {} // { "Dativ": { attempts: 10, correct: 4 } }
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
        
        // Restore Streak from memory if available
        if (localStorage.getItem('germanPro_streak')) {
            streak = parseInt(localStorage.getItem('germanPro_streak'));
            updateStats();
        }

        switchMode('grammar'); 
    } catch (error) {
        console.error(error);
    }
}

// --- 2. SWITCH MODES ---
function switchMode(mode) {
    currentMode = mode;
    const allQuestions = fullData[mode];
    // Shuffle and slice 10
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    currentQuestions = shuffled.slice(0, 10);

    currentIndex = 0;
    score = 0; 
    sessionAnalytics = {}; // Reset SESSION data only
    
    // UI Updates
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('onclick').includes(mode)) btn.classList.add('active');
    });
    
    document.getElementById('mode-title').innerText = `${mode.toUpperCase()} (Session: ${currentQuestions.length})`;
    updateStats();
    renderQuestion();
}

// --- 3. RENDER UI ---
function renderQuestion() {
    if (currentIndex >= currentQuestions.length) {
        saveLifetimeData(); // SAVE DATA before showing report
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
    
    // 1. Update SESSION Data
    if (!sessionAnalytics[cat]) sessionAnalytics[cat] = { total: 0, errors: 0 };
    sessionAnalytics[cat].total++;

    // 2. Update LIFETIME Data (In Memory)
    if (!lifetimeData.categoryStats[cat]) lifetimeData.categoryStats[cat] = { attempts: 0, correct: 0 };
    lifetimeData.categoryStats[cat].attempts++;
    lifetimeData.totalQuestions++;

    if (selected === correct) {
        feedback.className = "feedback success";
        feedback.innerText = "Correct!";
        score += 10;
        streak++;
        
        lifetimeData.categoryStats[cat].correct++; // Update lifetime correct
        
        setTimeout(nextQuestion, 1000);
    } else {
        feedback.className = "feedback error";
        feedback.innerText = `Wrong. ${explanation}`;
        streak = 0;
        
        sessionAnalytics[cat].errors++; // Session error
        lifetimeData.totalErrors++;     // Lifetime error
        
        document.getElementById("next-btn").style.display = "block";
    }
    
    // Save Streak immediately (so they don't lose it if they refresh)
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

// --- 5. DATA PERSISTENCE ---
function saveLifetimeData() {
    // Commit the memory variable to the Browser Database (LocalStorage)
    localStorage.setItem('germanPro_storage', JSON.stringify(lifetimeData));
    console.log("Data Saved:", lifetimeData);
}

// --- 6. REPORT CARD (With Lifetime Insights) ---
function showAnalyticsReport() {
    const container = document.querySelector(".container");
    document.getElementById("options-container").style.display = "none";
    document.getElementById("feedback").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    document.getElementById("question-text").innerText = "Performance Review";

    let reportHTML = `<div class="report-card">
        <h3>Session Score: ${score}</h3>
        <p style="text-align:center; color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px;">
            Total Questions Solved (Lifetime): <b style="color:white">${lifetimeData.totalQuestions}</b>
        </p>`;

    // Sort by Session Errors
    const sortedCats = Object.keys(sessionAnalytics).sort((a,b) => {
        const rateA = sessionAnalytics[a].errors / sessionAnalytics[a].total;
        const rateB = sessionAnalytics[b].errors / sessionAnalytics[b].total;
        return rateB - rateA;
    });

    sortedCats.forEach(cat => {
        const sData = sessionAnalytics[cat]; // Session Data
        const lData = lifetimeData.categoryStats[cat]; // Lifetime Data

        const sessionErrorRate = Math.round((sData.errors / sData.total) * 100);
        const lifetimeAccuracy = Math.round((lData.correct / lData.attempts) * 100);
        
        let statusColor = sessionErrorRate > 50 ? "#ef4444" : (sessionErrorRate > 0 ? "#f59e0b" : "#22c55e");
        let statusText = sessionErrorRate > 50 ? "Critical Weakness" : "Mastered";

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