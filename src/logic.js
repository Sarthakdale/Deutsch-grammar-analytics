// --- STATE MANAGEMENT ---
let fullData = { grammar: [], vocabulary: [] };
let currentMode = 'grammar';
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let streak = 0;

// Analytics Data
let analyticsData = {}; 

// --- 1. SETUP ---
async function loadQuestions() {
    try {
        const [grammarRes, vocabRes] = await Promise.all([
            fetch('data/grammar.json'),
            fetch('data/vocabulary.json')
        ]);

        if (!grammarRes.ok || !vocabRes.ok) throw new Error("File load failed");

        fullData.grammar = await grammarRes.json();
        fullData.vocabulary = await vocabRes.json();
        
        // Start with Grammar
        switchMode('grammar'); 
    } catch (error) {
        console.error(error);
        document.getElementById("question-text").innerText = "Error loading data.";
    }
}

// --- 2. SWITCH MODES (With Shuffle & 10-Question Limit) ---
function switchMode(mode) {
    currentMode = mode;
    
    // STEP 1: Get all available questions
    const allQuestions = fullData[mode];

    // STEP 2: Randomize them (Shuffle the deck)
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());

    // STEP 3: Slice the top 10 (or fewer if file is small)
    currentQuestions = shuffled.slice(0, 10);

    // Reset Progress for this new session
    currentIndex = 0;
    score = 0;
    streak = 0;
    analyticsData = {}; // Reset tracking
    
    // UI Updates
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('onclick').includes(mode)) btn.classList.add('active');
    });
    
    // Update Header
    document.getElementById('mode-title').innerText = `${mode.toUpperCase()} (Session: ${currentQuestions.length} Qs)`;
    
    updateStats();
    renderQuestion();
}

// --- 3. RENDER UI ---
function renderQuestion() {
    // If we finished the 10 questions, show the report
    if (currentIndex >= currentQuestions.length) {
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
        // Pass the category to the checker
        btn.onclick = () => checkAnswer(opt, q.answer, q.explanation, q.category);
        container.appendChild(btn);
    });
}

// --- 4. CHECK ANSWER & TRACK DATA ---
function checkAnswer(selected, correct, explanation, category) {
    const feedback = document.getElementById("feedback");
    const buttons = document.querySelectorAll("#options-container button");
    buttons.forEach(b => b.disabled = true);

    // Track Category Data
    const cat = category || "General";
    if (!analyticsData[cat]) analyticsData[cat] = { total: 0, errors: 0 };

    analyticsData[cat].total++; 

    if (selected === correct) {
        feedback.className = "feedback success";
        feedback.innerText = "Correct!";
        score += 10;
        streak++;
        setTimeout(nextQuestion, 1000);
    } else {
        feedback.className = "feedback error";
        feedback.innerText = `Wrong. ${explanation}`;
        streak = 0;
        
        // Log Error
        analyticsData[cat].errors++; 
        
        document.getElementById("next-btn").style.display = "block";
    }
    
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

// --- 5. ANALYTICS REPORT CARD ---
function showAnalyticsReport() {
    const container = document.querySelector(".container");
    const optionsDiv = document.getElementById("options-container");
    const feedbackDiv = document.getElementById("feedback");
    
    // Hide Quiz Elements
    optionsDiv.style.display = "none";
    feedbackDiv.style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    document.getElementById("question-text").innerText = "Performance Review";

    // Build Report
    let reportHTML = `<div class="report-card"><h3>Session Score: ${score}</h3>`;
    let hasWeakness = false;

    // Sort categories by Error Rate
    const sortedCats = Object.keys(analyticsData).sort((a,b) => {
        const rateA = analyticsData[a].errors / analyticsData[a].total;
        const rateB = analyticsData[b].errors / analyticsData[b].total;
        return rateB - rateA;
    });

    sortedCats.forEach(cat => {
        const data = analyticsData[cat];
        const errorRate = Math.round((data.errors / data.total) * 100);
        
        let statusColor = errorRate > 50 ? "#ef4444" : (errorRate > 0 ? "#f59e0b" : "#22c55e");
        let statusText = errorRate > 50 ? "Critical Weakness" : (errorRate > 0 ? "Needs Practice" : "Mastered");

        if (errorRate > 0) hasWeakness = true;

        reportHTML += `
            <div class="stat-row">
                <span class="stat-name">${cat}</span>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width: ${100 - errorRate}%; background: ${statusColor}"></div>
                </div>
                <span class="stat-label" style="color: ${statusColor}">${statusText}</span>
            </div>
        `;
    });

    if (!hasWeakness) reportHTML += `<p style="color:var(--success); margin-top:1rem;">Perfect run! No weaknesses detected.</p>`;
    
    reportHTML += `<button onclick="location.reload()" id="restart-btn">Start New Session</button></div>`;
    
    // Show Report
    const reportContainer = document.createElement("div");
    reportContainer.innerHTML = reportHTML;
    container.appendChild(reportContainer);
}

// Start App
loadQuestions();