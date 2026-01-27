// State Management (The "Memory" of the app)
let currentQuestionIndex = 0;
let score = 0;
let streak = 0;
let questions = []; // We will load data into this array

// 1. The "Fetch" (Loading Data from the 'Database')
// This mimics how real-world apps talk to servers.
async function loadQuestions() {
    try {
        const response = await fetch('data/questions.json');
        questions = await response.json();
        renderQuestion();
    } catch (error) {
        console.error("Error loading questions:", error);
        document.getElementById("question-text").innerText = "Error loading data.";
    }
}

// 2. The "Render" (Displaying the Content)
function renderQuestion() {
    // Reset UI state for new question
    const questionData = questions[currentQuestionIndex];
    document.getElementById("question-text").innerText = questionData.question;
    document.getElementById("feedback").style.display = "none";
    document.getElementById("next-btn").style.display = "none";
    
    // Clear previous buttons
    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = "";

    // Create buttons dynamically
    questionData.options.forEach(option => {
        const btn = document.createElement("button");
        btn.innerText = option;
        btn.onclick = () => checkAnswer(option, questionData.answer, questionData.explanation);
        optionsContainer.appendChild(btn);
    });
}

// 3. The "Logic" (Checking the Answer)
function checkAnswer(selected, correct, explanation) {
    const feedbackEl = document.getElementById("feedback");
    
    // Disable all buttons so user can't click twice
    const buttons = document.querySelectorAll(".options button");
    buttons.forEach(btn => btn.disabled = true);

    if (selected === correct) {
        // Success Case
        feedbackEl.className = "feedback success";
        feedbackEl.innerText = "Richtig! (Correct)";
        score += 10;
        streak += 1;
    } else {
        // Failure Case - The "Learning Moment"
        feedbackEl.className = "feedback error";
        // This is the Value Add: Explaining WHY they were wrong
        feedbackEl.innerText = `Falsch. \n${explanation}`;
        streak = 0;
    }

    // Update Dashboard Stats
    document.getElementById("score").innerText = score;
    document.getElementById("streak").innerText = streak;

    // Show Feedback & Next Button
    feedbackEl.style.display = "block";
    document.getElementById("next-btn").style.display = "block";
}

// 4. Navigation (Next Question)
function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < questions.length) {
        renderQuestion();
    } else {
        // End of Quiz
        document.querySelector(".container").innerHTML = `
            <h2>Quiz Complete!</h2>
            <p>Final Score: ${score}</p>
            <button onclick="location.reload()">Try Again</button>
        `;
    }
}

// Start the app
loadQuestions();