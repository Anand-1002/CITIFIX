const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const Groq = require("groq-sdk");

const router = express.Router();

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY || "dummy_key_for_dev";
  return new Groq({ apiKey });
};
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are CitiFix AI Assistant — a helpful, friendly civic engagement assistant.

Your role is to help citizens:
- Report civic issues (potholes, broken streetlights, garbage, water leaks, etc.)
- Understand complaint statuses (OPEN, ASSIGNED, RESOLVED, ESCALATED)
- Learn how to earn reward points for active civic participation
- Navigate the CitiFix platform features
- Understand how complaints get escalated to authorities or posted on X (Twitter)

Keep responses concise, helpful, and focused on civic issues. 
If asked about non-civic topics, gently redirect to civic matters.
Always be encouraging and positive about civic engagement.`;

// Stateless chat — messages are managed on the frontend, no DB storage
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const cleanMessage = String(message).trim();

    // Build context from frontend-provided history (last 10 exchanges max)
    const contextMessages = history
      .slice(-10)
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      }));

    const completion = await getGroqClient().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...contextMessages,
        { role: "user", content: cleanMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const assistantText =
      completion.choices[0]?.message?.content ||
      "Sorry, I could not generate a response right now. Please try again.";

    res.json({ reply: assistantText });
  } catch (error) {
    console.error("Chat error:", error?.message || error);
    res.status(500).json({
      error: error?.message || "Chat request failed. Please try again.",
    });
  }
});

// AI Description Generator for Report Issue page
router.post("/generate-description", authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required to generate a description." });
    }

    const prompt = `You are an AI assistant helping a citizen write a clear, professional, and detailed description for a civic issue they are reporting on the CitiFix platform.

The user has provided the following issue title:
"${title.trim()}"

Please generate a well-structured description for this issue. Use the following structure:
- **Issue Overview**: Briefly describe the problem based on the title.
- **Location Details**: Add a placeholder for specific landmarks or street names (e.g., "[Insert exact location/landmark here]").
- **Expected Impact**: Briefly mention why this needs to be fixed (e.g., safety hazard, public health concern).

Keep it under 3-4 short paragraphs. Do not include introductory conversational text like "Here is the description". Return ONLY the generated description text so it can be directly pasted into a text area.`;

    const completion = await getGroqClient().chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 500,
    });

    const description = completion.choices[0]?.message?.content?.trim() || "";
    res.json({ description });
  } catch (error) {
    console.error("Generate description error:", error?.message || error);
    res.status(500).json({
      error: "Failed to generate description. Please try again manually.",
    });
  }
});

module.exports = router;
