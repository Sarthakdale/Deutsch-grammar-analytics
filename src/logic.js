// --- STATE MANAGEMENT ---
let fullData = {
    grammar: [],
    vocabulary: []
};
let currentMode = 'grammar';
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let streak = 0;

// --- 1. SETUP: Load BOTH Files ---
async function loadQuestions() {
    console.log("Loading modules...");
    try {
        // Fetch both files at the same time
        const [grammarRes, vocabRes] = await Promise.all([
            fetch('data/grammar.json'),
            fetch('data/vocabulary.json')
        ]);

        if (!grammarRes.ok || !vocabRes.ok) {
            throw new Error("One or more files failed to load.");
        }

        // Save them into our specific slots
        fullData.grammar = await grammarRes.json();
        fullData.vocabulary = await vocabRes.json();
        
        console.log("Modules loaded:", fullData);

        // Start default mode
        switchMode('grammar'); 
    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById("question-text").innerText = "Error: Check Console (F12). Missing files?";
    }
}

// --- 2. SWITCH MODES ---
function switchMode(mode) {
    currentMode = mode;
    currentQuestions = fullData[mode]; 
    currentIndex = 0; // Reset progress
    
    // Update Sidebar UI
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        // Simple check to highlight the right button
        if(btn.getAttribute('onclick').includes(mode)) {
            btn.classList.add('active');
        }
    });

    // Update Header
    document.getElementById('mode-title').innerText = mode.toUpperCase() + " MODE";
    
    // Start the Quiz
    renderQuestion();
}

// --- 3. RENDER UI ---
function renderQuestion() {
    // Check if finished
    if (currentIndex >= currentQuestions.length) {
        showSummary();
        return;
    }

    const q = currentQuestions[currentIndex];
    
    document.getElementById("question-text").innerText = q.question;
    document.getElementById("feedback").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    
    // Create Buttons
    const container = document.getElementById("options-container");
    container.innerHTML = "";

    q.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(opt, q.answer, q.explanation);
        container.appendChild(btn);
    });
}

// --- 4. CHECK ANSWER ---
function checkAnswer(selected, correct, explanation) {
    const feedback = document.getElementById("feedback");
    const buttons = document.querySelectorAll("#options-container button");
    buttons.forEach(b => b.disabled = true);

    if (selected === correct) {
        feedback.className = "feedback success";
        feedback.innerText = "Correct!";
        score += 10;
        streak++;
        setTimeout(nextQuestion, 1000); // Auto-advance
    } else {
        feedback.className = "feedback error";
        feedback.innerText = `Wrong. ${explanation}`;
        streak = 0;
        document.getElementById("next-btn").style.display = "block";
    }
    
    feedback.style.display = "block";
    updateStats();
}

// --- 5. UTILS ---
function nextQuestion() {
    currentIndex++;
    renderQuestion();
}

function updateStats() {
    document.getElementById("score").innerText = score;
    document.getElementById("streak").innerText = streak;
}

function showSummary() {
    document.querySelector(".container").innerHTML = `
        <h2>${currentMode.toUpperCase()} COMPLETE!</h2>
        <p>Final Score: ${score}</p>
        <button onclick="location.reload()" id="next-btn">Menu</button>
    `;
}

// Start
loadQuestions();