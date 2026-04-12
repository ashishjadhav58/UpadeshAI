require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    const data = await response.json();
    
    console.log('Available models that support generateContent:\n');
    
    data.models
      .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
      .forEach(model => {
        console.log(`✅ ${model.name}`);
        console.log(`   Display: ${model.displayName}`);
        console.log(`   Description: ${model.description}`);
        console.log('');
      });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listModels();
