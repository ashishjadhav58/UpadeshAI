require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
      content: { parts: [{ text: "career confusion" }] },
      taskType: 'RETRIEVAL_DOCUMENT'
    });
    console.log("gemini-embedding-001 works:", result.embedding.values.slice(0, 3));
  } catch (e) {
    console.log("gemini-embedding-001 failed:", e.message);
  }
}

test();
