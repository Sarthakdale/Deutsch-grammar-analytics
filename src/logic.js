// --- GLOBAL VARIABLES ---
let currentQuestionIndex = 0;
let score = 0;
let streak = 0;
let questions = [];

// --- 1. SETUP: Load Data ---
async function loadQuestions() {
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
        // Fetch both files at the same time (Parallel Fetching)
        const [grammarRes, vocabRes] = await Promise.all([
            fetch('data/grammar.json'),
            fetch('data/vocabulary.json')
        ]);

        // Save them into our specific slots
        fullData.grammar = await grammarRes.json();
        fullData.vocabulary = await vocabRes.json();
        
        console.log("Modules loaded:", fullData);

        // Start default mode
        switchMode('grammar'); 
    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById("question-text").innerText = "Error loading files.";
    }
}
}

// --- 2. UI: Show the Question ---
function renderQuestion() {
    console.log("Step 3: Rendering Question Index:", currentQuestionIndex);

    // Check if quiz is finished
    if (currentQuestionIndex >= questions.length) {
        console.log("Quiz Finished!");
        showSummary();
        return;
    }

    const questionData = questions[currentQuestionIndex];
    
    // Update Text
    document.getElementById("question-text").innerText = questionData.question;
    
    // Reset UI
    document.getElementById("feedback").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    
    // Build Buttons
    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = ""; // Clear old buttons

    questionData.options.forEach(option => {
        const btn = document.createElement("button");
        btn.innerText = option;
        btn.onclick = () => checkAnswer(option, questionData.answer, questionData.explanation);
        optionsContainer.appendChild(btn);
    });
}

// --- 3. LOGIC: Check Answer ---
function checkAnswer(selected, correct, explanation) {
    console.log("Step 4: Answer checked. User picked:", selected);
    
    const feedbackEl = document.getElementById("feedback");
    
    // Lock buttons
    const buttons = document.querySelectorAll("#options-container button");
    buttons.forEach(btn => btn.disabled = true);

    if (selected === correct) {
        console.log("Result: Correct! Waiting 1.5 seconds...");
        // Success
        feedbackEl.className = "feedback success";
        feedbackEl.innerText = "Richtig! (Correct)";
        score += 10;
        streak += 1;
        updateStats();
        feedbackEl.style.display = "block";

        // AUTO-ADVANCE TIMER
        setTimeout(() => {
            console.log("Timer finished. Calling nextQuestion()...");
            nextQuestion();
        }, 1500); // 1.5 seconds delay

    } else {
        console.log("Result: Wrong.");
        // Failure
        feedbackEl.className = "feedback error";
        feedbackEl.innerText = `Falsch. \n${explanation}`;
        streak = 0;
        updateStats();
        feedbackEl.style.display = "block";
        document.getElementById("next-btn").style.display = "block";
    }
}

// --- 4. NAVIGATION ---
function nextQuestion() {
    console.log("Step 5: Moving to next question...");
    currentQuestionIndex++;
    renderQuestion();
}

function updateStats() {
    document.getElementById("score").innerText = score;
    document.getElementById("streak").innerText = streak;
}

function showSummary() {
    document.querySelector(".container").innerHTML = `
        <h2>Quiz Complete!</h2>
        <p>Final Score: ${score}</p>
        <button onclick="location.reload()" style="background:#007bff; color:white; border:none; padding:10px; cursor:pointer;">Try Again</button>
    `;
}

// Start the Engine
loadQuestions();