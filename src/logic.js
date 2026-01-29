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

function showAnalyticsReport() {
    const container = document.querySelector(".container");
    document.getElementById("options-container").style.display = "none";
    document.getElementById("feedback").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    document.getElementById("question-text").innerText = "Performance Review";

    let reportHTML = `<div class="report-card">
        <h3>Session Score: ${score}</h3>
        <p style="text-align:center; color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px;">
            Total Questions Solved: <b style="color:white">${lifetimeData.totalQuestions}</b>
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