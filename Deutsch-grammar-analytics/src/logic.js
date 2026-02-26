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
// Add these with your other variables at the top
let sessionMistakes = [];
let isReviewMode = false;

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
window.logout = function () {
    if (confirm("Log out of cloud session?")) {
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

window.switchMode = function (mode) {
    currentMode = mode;

    // --- 1. NEW: UI & SIDEBAR TOGGLE LOGIC ---
    const sprechenSection = document.getElementById('sprechen-section');
    const quizSection = document.getElementById('quiz-section');

    // Move the active button highlight to the top so it works for all modes
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(mode)) {
            btn.classList.add('active');
        }
    });

    // Toggle the screens
    if (mode === 'sprechen') {
        if (quizSection) quizSection.style.display = 'none'; // Hide Quiz
        if (sprechenSection) sprechenSection.style.display = 'flex'; // Show Chat

        // IMPORTANT: Stop the function here so the quiz logic below doesn't crash!
        return;
    } else {
        if (quizSection) quizSection.style.display = 'block'; // Show Quiz
        if (sprechenSection) sprechenSection.style.display = 'none'; // Hide Chat
    }
    // --- END OF NEW LOGIC ---

    // Now safely load the questions for grammar/vocabulary
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


    let titleText = `${mode.toUpperCase()} (Session: ${currentQuestions.length})`;
    if (priorityQuestions.length > 0) titleText += " 🔥 Smart Review Active";
    document.getElementById('mode-title').innerText = titleText;

    updateStats();
    renderQuestion();
}

function renderQuestion() {
    // A. Handle End of Session
    if (currentIndex >= currentQuestions.length) {
        if (isReviewMode) {
            const container = document.querySelector(".container");

            // SCENARIO A: Mastery (0 Mistakes Left)
            if (sessionMistakes.length === 0) {
                container.innerHTML = `
                    <div class="question-card" style="text-align: center; animation: fadeIn 0.5s ease;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                        <h2 style="color: #4ade80; margin-bottom: 10px;">Mastery Achieved!</h2>
                        <p style="color: #94a3b8; margin-bottom: 30px;">You cleared all your mistakes.</p>
                        <button onclick="location.reload()" style="background: var(--primary); width:100%; font-weight:bold;">Return to Dashboard</button>
                    </div>`;
            }
            // SCENARIO B: Still has mistakes (Give them a choice)
            else {
                container.innerHTML = `
                    <div class="question-card" style="text-align: center; animation: fadeIn 0.5s ease;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                        <h2 style="color: #f87171; margin-bottom: 10px;">Review Complete</h2>
                        <p style="color: #94a3b8; margin-bottom: 20px;">
                            You fixed some, but <b>${sessionMistakes.length}</b> mistakes still remain.
                        </p>
                        
                        <button onclick="startReviewSession()" style="width:100%; margin-bottom:10px; padding: 12px; background:rgba(239, 68, 68, 0.15); border:1px solid #ef4444; color:#fca5a5; font-weight:bold; cursor:pointer; border-radius:8px;">
                            ↺ Retry Remaining ${sessionMistakes.length}
                        </button>
                        
                        <button onclick="location.reload()" style="width:100%; background: transparent; border: 1px solid #475569; color: #94a3b8; margin-top:5px;">
                            Finish & Start New Session
                        </button>
                    </div>`;
            }
            return;
        }
        // If finishing a Real Session, save and show report
        saveUserData();
        showAnalyticsReport();
        return;
    }

    // B. Update Badge Text (To show "MISTAKE REVIEW" or "GRAMMAR")
    const modeLabel = isReviewMode ? "MISTAKE REVIEW" : currentMode.toUpperCase();
    document.getElementById("mode-title").innerText = modeLabel;

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
window.speakText = function (text) {
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

// --- UPDATED CHECKANSWER (Fixes Recursive Review) ---
function checkAnswer(selectedOption, correctOption, explanation, category) {
    const feedbackEl = document.getElementById("feedback");
    const options = document.getElementById("options-container").querySelectorAll("button");
    const nextBtn = document.getElementById("next-btn");

    // 1. Lock all buttons
    options.forEach(btn => {
        btn.disabled = true;
        if (btn.innerText === correctOption) {
            btn.style.background = "var(--success)"; // Green
            btn.style.borderColor = "#22c55e";
        } else if (btn.innerText === selectedOption) {
            btn.style.background = "var(--danger)"; // Red
            btn.style.borderColor = "#ef4444";
        }
    });

    // 2. Logic Check
    if (selectedOption === correctOption) {
        // Correct Answer
        if (!isReviewMode) {
            score += 10;
            streak++;
            updateStats(category, true);
        }
        feedbackEl.innerHTML = `<span style="color:#4ade80">✅ Correct!</span> ${explanation}`;
        feedbackEl.className = "feedback success";
    } else {
        // Incorrect Answer

        // A. If Normal Mode: Reset streak & update stats
        if (!isReviewMode) {
            streak = 0;
            updateStats(category, false);
        }

        // B. CRITICAL FIX: Save mistake in ALL modes (Normal OR Review)
        // This ensures that if you fail a review question, it gets added back to the bucket
        sessionMistakes.push(currentQuestions[currentIndex]);

        feedbackEl.innerHTML = `<span style="color:#f87171">❌ Incorrect.</span> ${explanation}`;
        feedbackEl.className = "feedback error";
    }

    // 3. UI Updates
    document.getElementById("score").innerText = score;
    document.getElementById("streak").innerText = streak;
    feedbackEl.style.display = "block";
    nextBtn.style.display = "block";
}

window.nextQuestion = function () {
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
    // --- NEW: Check if there are mistakes to practice ---
    // 3. Create HTML Structure
    let reviewButtonHTML = "";
    if (sessionMistakes.length > 0) {
        // CHANGED: Added margin-top to separate it from the blue button above
        reviewButtonHTML = `
            <button onclick="startReviewSession()" style="width:100%; margin-top:15px; padding: 12px; background:rgba(239, 68, 68, 0.15); border:1px solid #ef4444; color:#fca5a5; font-weight:bold; cursor:pointer; border-radius:8px;">
                ↺ Practice Your ${sessionMistakes.length} Mistakes
            </button>
        `;
    }

    let reportHTML = `<div class="report-card">
        <h3>Session Score: ${score}</h3>
        
        <div style="position: relative; height:300px; width:100%; margin: 10px 0;">
            <canvas id="skillChart"></canvas>
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:15px; color:#94a3b8; font-size:0.8rem;">
            <span>Total Solved: <b style="color:white">${lifetimeData.totalQuestions || 0}</b></span>
            <span>Accuracy: <b style="color:#38bdf8">${score > 0 ? Math.round((score / 100) * 100) : 0}%</b></span>
        </div>

        <button onclick="location.reload()" id="restart-btn">Start New Session</button>
        
        ${reviewButtonHTML}
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

// --- START REVIEW MODE (Fixed for Recursive Loop) ---
window.startReviewSession = function () {
    if (sessionMistakes.length === 0) return;

    // 1. Re-build the Game UI (Because the Result Card deleted it!)
    const container = document.querySelector(".container");
    container.innerHTML = `
        <div class="mode-badge" id="mode-title">MISTAKE REVIEW</div>
        <div class="question-card">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px; color:#94a3b8; font-size:0.9rem;">
                <span>Score: <b id="score" style="color:white">${score}</b></span>
                <span>Streak: <b id="streak" style="color:#38bdf8">${streak}</b></span>
            </div>

            <h2 id="question-text">Loading...</h2>

            <div id="options-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem;">
                </div>

            <div id="feedback" class="feedback"></div>
            <button id="next-btn" onclick="nextQuestion()" style="width: 100%; margin-top: 1.5rem; background: var(--primary); color: var(--bg-dark); font-weight: 800; border: none; display: none;">Continue</button>
        </div>
    `;

    // 2. Set Flags & Load Data
    isReviewMode = true;
    currentQuestions = [...sessionMistakes]; // Load the tricky ones
    sessionMistakes = []; // Clear bucket to catch NEW mistakes in this round
    currentIndex = 0;

    // 3. Start the Game
    renderQuestion();
}

// --- ROBUST MOBILE MENU LOGIC ---
document.addEventListener("DOMContentLoaded", () => {
    // Try to find the button by ID first, then by Class
    const menuBtn = document.getElementById("mobile-menu-btn") || document.querySelector(".mobile-menu-btn");
    const sidebar = document.querySelector(".sidebar"); // Uses class to be safe

    if (menuBtn && sidebar) {
        // 1. Toggle Menu Open/Close
        menuBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Stop click from bubbling
            console.log("🍔 Menu Button Clicked!"); // Debug message
            sidebar.classList.toggle("active");
        });

        // 2. Close Menu when clicking ANYWHERE else
        document.addEventListener("click", (e) => {
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                sidebar.classList.remove("active");
            }
        });

        console.log("✅ Mobile Menu Logic Loaded Successfully");
    } else {
        console.error("❌ Critical Error: Menu Button or Sidebar not found in HTML!");
    }
});

// ==========================================
// 🎙️ SPRECHEN (VOICE CALL) LOGIC
// ==========================================

const GEMINI_API_KEY = "AIzaSyC3puV7_4xdvl4mT1ebHNVkAYCd-0BsKH0"; // We will hide this later!
const micBtn = document.getElementById('mic-btn');
const userCaptions = document.getElementById('user-captions');
const aiCaptions = document.getElementById('ai-captions');
const aiPulse = document.getElementById('ai-pulse');
const callStatus = document.getElementById('call-status');
// Analytics Variables
let conversationHistory = [];
let grammarMistakes = [];
const endCallBtn = document.getElementById('end-call-btn');
const summaryModal = document.getElementById('call-summary-modal');
const transcriptList = document.getElementById('transcript-list');
const mistakesList = document.getElementById('mistakes-list');

// 1. Setup the "Ears" (Speech Recognition)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'de-DE'; // Listen in German!
recognition.interimResults = false; // Only get the final sentence

let isListening = false;
// 🎙️ Smart Mic Button (Start/Stop Toggle)
micBtn.addEventListener('click', () => {
    if (!isListening) {
        // TURN MIC ON
        try {
            recognition.start();
            startWaveform();
            isListening = true;
            callStatus.innerText = "Listening... (Tap mic again to stop)";
            micBtn.style.background = "#ef4444"; // Turn red to show it's recording
            micBtn.classList.add('massive-btn-active');
        } catch (e) {
            console.error("Mic already running");
        }
    } else {
        // MANUALLY TURN MIC OFF & SEND
        recognition.stop(); // Force it to stop and trigger onresult
        stopWaveform();
        isListening = false;
        callStatus.innerText = "Sending to Anna...";
        micBtn.style.background = "rgba(255,255,255,0.1)"; // Revert color
        micBtn.classList.remove('massive-btn-active');
    }
});

// When you finish speaking
// When you finish speaking
recognition.onresult = async (event) => {
    recognition.stop();  // 🛑 Force the mic to stop listening
    stopWaveform();
    isListening = false; // 🔄 NEW: Reset our toggle tracker!
    endCallBtn.style.display = 'block'; // ☎️ NEW: Reveal the End Call button!

    const spokenText = event.results[0][0].transcript;
    userCaptions.innerText = `Du: "${spokenText}"`;
    callStatus.innerText = "Anna is thinking...";
    callStatus.style.color = "#f59e0b";
    micBtn.style.background = "rgba(255,255,255,0.1)";

    // 💾 NEW: Save to history
    conversationHistory.push({ speaker: 'Du', text: spokenText });

    await getAIResponse(spokenText);
};

// 🛡️ SAFETY NET 1: If the mic turns off without getting a result
recognition.onend = () => {
    // Check if it got stuck waiting for a result
    if (callStatus.innerText === "Sending to Anna..." || callStatus.innerText.includes("Listening")) {
        callStatus.innerText = "Didn't catch that. Tap mic to try again.";
        callStatus.style.color = "#ef4444"; // Red error text
        
        // Reset the button
        isListening = false;
        stopWaveform();
        micBtn.style.background = "rgba(255,255,255,0.1)";
        micBtn.classList.remove('massive-btn-active');
    }
};

// 🛡️ SAFETY NET 2: If the browser blocks the mic
recognition.onerror = (event) => {
    console.error("Microphone Error:", event.error);
    callStatus.innerText = "Mic error. Please try again.";
    callStatus.style.color = "#ef4444";
    
    // Reset the button
    isListening = false;
    stopWaveform();
    micBtn.style.background = "rgba(255,255,255,0.1)";
    micBtn.classList.remove('massive-btn-active');
};

// ⚠️ TEMPORARY LOCAL TESTING VERSION (Do not push to GitHub with your key!)
async function getAIResponse(userText) {
    try {
        // 1. Send the user's spoken text to YOUR secure backend vault
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userText: userText }) 
        });

        if (!response.ok) {
            throw new Error("Backend rejected the call.");
        }

        // 2. Receive Anna's reply from the backend
        const data = await response.json();
        const aiText = data.reply; 
        
        // 3. Highlight the corrections in RED!
        const formattedText = aiText.replace(/(\(Korrektur:.*?\))/g, '<span class="grammar-correction">$1</span>');
        
        // 4. Save AI response to history
        conversationHistory.push({ speaker: 'Anna', text: formattedText });
        
        // 5. Catch mistakes for the Analytics list
        const mistakeMatch = aiText.match(/\(Korrektur:(.*?)\)/);
        if (mistakeMatch) {
            grammarMistakes.push(mistakeMatch[1].trim());
        }

        // 6. UI Updates
        aiCaptions.innerHTML = `Anna: "${formattedText}"`;
        callStatus.innerText = "Anna is speaking...";
        callStatus.style.color = "#0ea5e9"; 
        
        // 7. Speak out loud
        speakGerman(aiText);

    } catch (error) {
        console.error("AI Error:", error);
        callStatus.innerText = "Connection lost. Try again.";
    }
}


// 3. Setup the "Voice" (Speech Synthesis) - UPGRADED
function speakGerman(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';

    // 🎛️ TUTOR SETTINGS: Slow it down slightly for A2 comprehension
    utterance.rate = 0.85; // 1.0 is normal, 0.85 is clear and patient
    utterance.pitch = 1.05; // Slightly higher pitch for a friendly female tone

    // 🔍 HUNT FOR PREMIUM VOICES
    const voices = window.speechSynthesis.getVoices();
    const germanVoices = voices.filter(v => v.lang.includes('de-DE') || v.lang === 'de_DE');

    if (germanVoices.length > 0) {
        // Try to find high-quality Google or Microsoft voices (like Hedda or Katja)
        const bestVoice = germanVoices.find(v =>
            v.name.includes('Google') ||
            v.name.includes('Premium') ||
            v.name.includes('Hedda') ||
            v.name.includes('Katja')
        );

        utterance.voice = bestVoice || germanVoices[0];
        console.log("🗣️ Anna is using voice:", utterance.voice.name); // Check console to see which voice won!
    }

    // Animations and UI
    utterance.onstart = () => aiPulse.classList.add('active');

    utterance.onend = () => {
        aiPulse.classList.remove('active');
        callStatus.innerText = "Ready to practice...";
        callStatus.style.color = "#10b981";
    };

    window.speechSynthesis.speak(utterance);
}

// ⚠️ CRITICAL HACK: Browsers are lazy and load voices asynchronously. 
// This forces the browser to load the high-quality voices immediately.
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

// ==========================================
// 🌊 SIRI AUDIO WAVEFORM LOGIC
// ==========================================
const canvas = document.getElementById('waveform');
const ctx = canvas.getContext('2d');
let audioContext, analyser, dataArray, source, animationId;

async function startWaveform() {
    canvas.style.display = 'block'; // Show the canvas

    // 1. Initialize the Audio Engine
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }

    // 2. Grab the microphone stream
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        // 3. The Drawing Loop
        function draw() {
            animationId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray); // Get the current sound levels

            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous frame

            // Style the glowing line
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#0ea5e9'; // Blue color
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#0ea5e9';
            ctx.beginPath();

            const sliceWidth = canvas.width / dataArray.length;
            let x = 0;

            // Draw the wave based on sound volume
            for (let i = 0; i < dataArray.length; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);

                x += sliceWidth;
            }
            ctx.stroke(); // Render the line
        }
        draw(); // Start the animation
    } catch (err) {
        console.error("Microphone access denied for waveform", err);
    }
}

function stopWaveform() {
    cancelAnimationFrame(animationId); // Stop drawing
    canvas.style.display = 'none';     // Hide canvas
    if (source) source.disconnect();   // Unhook microphone
}

// ==========================================
// 📊 SPRECHEN ANALYTICS LOGIC
// ==========================================
window.endCall = function () {
    window.speechSynthesis.cancel(); // Stop Anna from talking if she is

    // 1. Print Transcript
    transcriptList.innerHTML = '';
    conversationHistory.forEach(msg => {
        transcriptList.innerHTML += `<p><strong>${msg.speaker}:</strong> ${msg.text}</p>`;
    });

    // 2. Print Mistakes
    mistakesList.innerHTML = '';
    if (grammarMistakes.length === 0) {
        mistakesList.innerHTML = '<li style="color: #10b981;">Perfekt! Keine Fehler (No mistakes) this session!</li>';
    } else {
        grammarMistakes.forEach(mistake => {
            mistakesList.innerHTML += `<li>${mistake}</li>`;
        });
    }

    // 3. Show Modal
    summaryModal.style.display = 'flex';
};

window.closeSummary = function () {
    // Reset everything for the next call
    summaryModal.style.display = 'none';
    endCallBtn.style.display = 'none';
    conversationHistory = [];
    grammarMistakes = [];
    userCaptions.innerText = '';
    aiCaptions.innerText = '"Hallo! Lass uns noch einmal üben."';
    callStatus.innerText = "Ready to practice...";
    callStatus.style.color = "#10b981";
};