const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

admin.initializeApp();
const db = admin.firestore();
const secretClient = new SecretManagerServiceClient();

let cachedGeminiKey = null;

async function getGeminiApiKey() {
  if (cachedGeminiKey) return cachedGeminiKey;
  const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
  const name = `projects/${projectId}/secrets/GEMINI_API_KEY/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  cachedGeminiKey = version.payload.data.toString();
  return cachedGeminiKey;
}

// Server-side pre-flight PII scrubber
function scrubPII(text) {
  return text
    .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "[REDACTED_CARD]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]")
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, "[REDACTED_TOKEN]");
}

exports.journalChat = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  if (req.method === "OPTIONS") return res.status(204).send("");

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Bearer token" });
  }

  let uid;
  try {
    const decodedToken = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
    uid = decodedToken.uid;
  } catch (err) {
    return res.status(401).json({ error: "Invalid auth token" });
  }

  const { prompt, history } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt string is required" });
  }

  try {
    const apiKey = await getGeminiApiKey();
    const ai = new GoogleGenAI({ apiKey });

    // Clean prompt of sensitive tokens before sending to model
    const cleanPrompt = scrubPII(prompt);

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: "You are a thoughtful, confidential journaling partner. Help the user reflect deeply, unpack ideas, and synthesize their thoughts into clear takeaways."
      },
      history: history || []
    });

    const result = await chat.sendMessage({ message: cleanPrompt });
    
    return res.status(200).json({ reply: result.text });
  } catch (err) {
    return res.status(500).json({ error: "AI Inference failed: " + err.message });
  }
});
