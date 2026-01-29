import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIG HERE (Same as login.html) ---
const firebaseConfig = {
    apiKey: "AIzaSyA8gPA-J_7MgHfprqUEAlAos8dDvmdUFzM",
    authDomain: "german-pro-analytics.firebaseapp.com",
    projectId: "german-pro-analytics",
    storageBucket: "german-pro-analytics.firebasestorage.app",
    messagingSenderId: "722098280543",
    appId: "1:722098280543:web:95c2bf7af446574489a3ea",
    measurementId: "G-EX5RCHS90Z"
};
// -----------------------------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// --- AUTH CHECKER ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('user-display-name').innerText = user.email.split('@')[0]; // Show "sarthak" from email
        loadUserData(); // Download Cloud Data
    } else {
        // No user? Kick to login
        window.location.href = 'login.html';
    }
});

// --- GLOBAL VARIABLES ---
let fullData = { grammar: [], vocabulary: [] };
let currentMode = 'grammar';
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let streak = 0;
let sessionAnalytics = {}; 

let lifetimeData = { 
    totalQuestions: 0, 
    totalErrors: 0, 
    categoryStats: {} 
};

// --- 1. CLOUD SYNC FUNCTIONS ---
async function loadUserData() {
    const docRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        lifetimeData = docSnap.data();
        console.log("Cloud Data Loaded:", lifetimeData);
    } else {
        console.log("New User: Creating Cloud Profile...");
        saveUserData(); // Create empty profile
    }
    loadQuestions(); // Start App
}

async function saveUserData() {
    if (!currentUser) return;
    try {
        await setDoc(doc(db, "users", currentUser.uid), lifetimeData);
        console.log("Cloud Save Success");
    } catch (e) {
        console.error("Error saving document: ", e);
    }
}

// --- 2. LOGOUT ---
window.logout = function() {
    if(confirm("Log out of cloud session?")) {
        signOut(auth).then(() => {
            window.location.href = 'login.html';
        });
    }
}

// --- 3. APP LOGIC (Standard) ---
async function loadQuestions() {
    try {
        const [grammarRes, vocabRes] = await Promise.all([
            fetch('data/grammar.json'),
            fetch('data/vocabulary.json')
        ]);
        fullData.grammar = await grammarRes.json();
        fullData.vocabulary = await vocabRes.json();
        switchMode('grammar'); 
    } catch (error) { console.error(error); }
}

window.switchMode = function(mode) {
    currentMode = mode;
    const allQuestions = fullData[mode];
    
    // Smart Review Logic
    let weakCategories = [];
    if (lifetimeData.categoryStats) {
        for (const [cat, stats] of Object.entries(lifetimeData.categoryStats)) {
            if (stats.attempts > 0 && (stats.correct / stats.attempts) < 0.5) {
                weakCategories.push(cat);
            }
        }
    }

    let priorityQuestions = [];
    if (weakCategories.length > 0) {
        priorityQuestions = allQuestions.filter(q => weakCategories.includes(q.category));
        priorityQuestions = priorityQuestions.sort(() => 0.5 - Math.random()).slice(0, 4);
    }

    const priorityIds = priorityQuestions.map(q => q.id);
    let remainingPool = allQuestions.filter(q => !priorityIds.includes(q.id));
    let needed = 10 - priorityQuestions.length;
    let randomFill = remainingPool.sort(() => 0.5 - Math.random()).slice(0, needed);

    currentQuestions = [...priorityQuestions, ...randomFill].sort(() => 0.5 - Math.random());

    currentIndex = 0;
    score = 0; 
    streak = 0;
    sessionAnalytics = {}; 
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('onclick').includes(mode)) btn.classList.add('active');
    });
    
    let titleText = `${mode.toUpperCase()} (Session: ${currentQuestions.length})`;
    if (priorityQuestions.length > 0) titleText += " 🔥 Smart Review Active";
    document.getElementById('mode-title').innerText = titleText;
    
    updateStats();
    renderQuestion();
}

function renderQuestion() {
    if (currentIndex >= currentQuestions.length) {
        saveUserData(); // SYNC TO CLOUD
        showAnalyticsReport(); 
        return;
    }

    const q = currentQuestions[currentIndex];
    
    // --- NEW: Audio Button Logic ---
    // We add a speaker icon that calls the 'speakText' function
    const audioBtn = `<span onclick="speakText('${q.question.replace(/'/g, "\\'")}')" style="cursor:pointer; margin-left:10px; font-size:1.2rem;" title="Listen to pronunciation">🔊</span>`;
    
    document.getElementById("question-text").innerHTML = q.question + audioBtn;
    // -------------------------------

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

// --- UPDATED SPEECH FUNCTION (v1.2.1) ---
window.speakText = function(text) {
    if ('speechSynthesis' in window) {
        // Cancel any currently playing speech to avoid overlap
        window.speechSynthesis.cancel();

        // THE FIX: Regex to find underscores (____) and replace them with "..."
        // This makes the voice pause slightly instead of saying "underscore"
        const cleanText = text.replace(/_+/g, "..."); 

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'de-DE'; // German Language
        utterance.rate = 0.85;    // Slightly slower for better clarity
        utterance.pitch = 1;

        window.speechSynthesis.speak(utterance);
    } else {
        alert("Sorry, your browser doesn't support Text-to-Speech!");
    }
}

function checkAnswer(selected, correct, explanation, category) {
    const feedback = document.getElementById("feedback");
    const buttons = document.querySelectorAll("#options-container button");
    buttons.forEach(b => b.disabled = true);

    const cat = category || "General";
    
    if (!sessionAnalytics[cat]) sessionAnalytics[cat] = { total: 0, errors: 0 };
    sessionAnalytics[cat].total++;

    if (!lifetimeData.categoryStats) lifetimeData.categoryStats = {};
    if (!lifetimeData.categoryStats[cat]) lifetimeData.categoryStats[cat] = { attempts: 0, correct: 0 };
    
    lifetimeData.categoryStats[cat].attempts++;
    lifetimeData.totalQuestions++;

    if (selected === correct) {
        feedback.className = "feedback success";
        feedback.innerText = "Correct!";
        score += 10;
        streak++;
        lifetimeData.categoryStats[cat].correct++;
        setTimeout(() => {
            currentIndex++;
            renderQuestion();
        }, 1000);
    } else {
        feedback.className = "feedback error";
        feedback.innerText = `Wrong. ${explanation}`;
        streak = 0;
        sessionAnalytics[cat].errors++;
        lifetimeData.totalErrors++;
        document.getElementById("next-btn").style.display = "block";
    }
    
    feedback.style.display = "block";
    updateStats();
}

window.nextQuestion = function() {
    currentIndex++;
    renderQuestion();
}

function updateStats() {
    document.getElementById("score").innerText = score;
    document.getElementById("streak").innerText = streak;
}

// --- v1.3.1 PRO VISUAL ANALYTICS (Verified) ---
function showAnalyticsReport() {
    const container = document.querySelector(".container");
    
    // 1. Clear the screen (Hide game elements)
    document.getElementById("options-container").style.display = "none";
    document.getElementById("feedback").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    document.getElementById("question-text").innerText = "Skill Profile";

    // 2. Prepare Data (With Safety Fallback)
    // We check if categoryStats exists; if not, use an empty object.
    const categories = Object.keys(lifetimeData.categoryStats || {});
    
    // LOGIC: Radar charts look bad with only 1 or 2 points (it's just a line).
    // So if the user has < 3 categories, we use "Dummy Data" to show a nice pentagon shape.
    const usePlaceholder = categories.length < 3;
    
    const labels = usePlaceholder ? ["Grammar", "Vocab", "Syntax", "Cases", "Verbs"] : categories;
    const dataPoints = usePlaceholder ? [20, 40, 60, 50, 80] : categories.map(cat => {
        const stats = lifetimeData.categoryStats[cat];
        if (stats.attempts === 0) return 0;
        return Math.round((stats.correct / stats.attempts) * 100);
    });

    // 3. Create HTML Structure
    let reportHTML = `<div class="report-card">
        <h3>Session Score: ${score}</h3>
        
        <div style="position: relative; height:300px; width:100%; margin: 10px 0;">
            <canvas id="skillChart"></canvas>
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:15px; color:#94a3b8; font-size:0.8rem;">
            <span>Total Solved: <b style="color:white">${lifetimeData.totalQuestions || 0}</b></span>
            <span>Accuracy: <b style="color:#38bdf8">${score > 0 ? Math.round((score/100)*100) : 0}%</b></span>
        </div>

        <button onclick="location.reload()" id="restart-btn">Start New Session</button>
    </div>`;
    
    // 4. Inject into DOM
    const reportContainer = document.createElement("div");
    reportContainer.innerHTML = reportHTML;
    container.appendChild(reportContainer);

    // 5. Draw the Chart (Must happen AFTER injection)
    const ctx = document.getElementById('skillChart').getContext('2d');
    
    // Create Cyberpunk Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.5)'); // Cyan Top
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.05)'); // Fade Bottom

    new Chart(ctx, {
        type: 'radar', 
        data: {
            labels: labels,
            datasets: [{
                label: 'Skill Level',
                data: dataPoints,
                backgroundColor: gradient,
                borderColor: '#38bdf8',
                borderWidth: 3,
                pointBackgroundColor: '#1e293b',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: { 
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: {
                        color: '#e2e8f0',
                        font: { size: 12, family: "'Inter', sans-serif", weight: 'bold' }
                    },
                    ticks: { display: false, backdropColor: 'transparent' },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}