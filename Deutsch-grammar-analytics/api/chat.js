// This is your secure backend! It runs on Vercel's servers, not in the user's browser.
export default async function handler(req, res) {
    // 1. Only allow secure POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 2. Receive what the user just spoke from the frontend
        const { userText } = req.body;
        
        // 3. Grab the API key securely from Vercel's hidden settings
        const apiKey = process.env.GEMINI_API_KEY; 
        
        // 4. The Strict Tutor Prompt (Hidden from the public!)
        const systemPrompt = `You are Anna, a friendly German language tutor.
        You are having a voice call with your student, Sarthak.
        Sarthak is preparing for the Goethe A2 exam.
        First, if Sarthak makes a grammar mistake, politely correct it in parentheses like this: (Korrektur: ...).
        Then, keep your response strictly in German, very short (1-2 sentences), and easy to understand at an A2 level.
        Always keep the conversation going by asking a simple question back.
        Sarthak just said: "${userText}"`;

        // 5. Talk directly to Google
        const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;

        const response = await fetch(aiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        if (!response.ok) {
            throw new Error(`Google API responded with ${response.status}`);
        }

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        // 6. Send just Anna's text back to your frontend
        res.status(200).json({ reply: aiText });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
}