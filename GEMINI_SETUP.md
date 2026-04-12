# 🚀 Gemini API Setup Guide

Your Dharma AI application now uses **Google Gemini** instead of OpenAI for better performance and cost efficiency!

## ✅ What Changed

- **Embeddings**: `gemini-embedding-001` model (3072 dimensions)
- **Chat**: `gemini-2.5-flash` model (supports streaming responses)
- **Cost**: Significantly lower than OpenAI
- **Performance**: Competitive with GPT-4

## 🔑 Your API Credentials

Based on your screenshot, here are your credentials:

```env
GEMINI_API_KEY=AIzaSyBX0m-yYn8rz-6mVL_55rIuhcY0VbAeWs4
```

**Pinecone Configuration:**
```env
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=upadeshaI
```

## 📝 Setup Steps

### 1. Update Your `.env` File

Create/update `.env` with:

```env
# Google Gemini Configuration
GEMINI_API_KEY=AIzaSyBX0m-yYn8rz-6mVL_55rIuhcY0VbAeWs4

# Pinecone Configuration
PINECONE_API_KEY=your-actual-pinecone-key
PINECONE_INDEX_NAME=upadeshaI

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/dharma-ai

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `@google/generative-ai` - Gemini SDK
- All other required packages

### 3. Update Pinecone Index (IMPORTANT!)

⚠️ **The embedding dimensions changed from 1536 (OpenAI) to 768 (Gemini)**

You need to **recreate your Pinecone index**:

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Delete old index (if exists)
3. Create new index with:
   - **Name**: `upadeshaI`
   - **Dimensions**: `3072` (for Gemini embedding-001)
   - **Metric**: `cosine`
   - **Pod Type**: `s1.x1` or `p1.x1`

### 4. Ingest Data with Gemini Embeddings

```bash
npm run ingest
```

This will:
- Generate embeddings using Gemini `gemini-embedding-001`
- Store them in your Pinecone index (3072 dimensions)
- Process all 20 verses

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 6. Test It!

Open [http://localhost:3000](http://localhost:3000)

Try: "I feel lost in my career"

## 🔍 Key Differences: Gemini vs OpenAI

| Feature | OpenAI | Gemini |
|---------|--------|--------|
| **Embedding Model** | text-embedding-ada-002 | text-embedding-004 |
| **Dimensions** | 1536 | 3072 |
| **Chat Model** | GPT-4 | gemini-pro |
| **Cost (Embeddings)** | $0.0001/1K tokens | FREE (up to quota) |
| **Cost (Chat)** | $0.01/1K tokens | FREE (up to quota) |
| **Rate Limit** | 3,500 RPM | 60 RPM (free tier) |

## 💡 Code Changes Made

### 1. Package.json
```diff
- "openai": "^4.28.0"
+ "@google/generative-ai": "^0.2.1"
```

### 2. vectorStore.js - Embeddings
```javascript
// OLD (OpenAI)
const response = await this.openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: text,
});
return response.data[0].embedding;

// NEW (Gemini)
const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
const result = await model.embedContent(text);
return result.embedding.values;
```

### 3. vectorStore.js - Chat
```javascript
// OLD (OpenAI)
const response = await this.openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
});

// NEW (Gemini)
const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
const result = await model.generateContent(fullPrompt);
const responseText = result.response.text();
```

## 🐛 Troubleshooting

### Error: "API key not valid"
- Double-check your `GEMINI_API_KEY` in `.env`
- Ensure no extra spaces or quotes

### Error: "Dimension mismatch"
- You need to recreate Pinecone index with 768 dimensions
- Delete old index and create new one

### Error: "Quota exceeded"
- Gemini free tier has limits
- Wait a few minutes or upgrade to paid tier

### Embeddings look different
- This is normal! Gemini uses different embedding space
- Re-run ingestion to generate new embeddings

## 📊 Monitoring Usage

Check your Gemini usage:
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. View your API usage dashboard
3. Monitor quota limits

## 🎯 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Update `.env` with your Gemini API key
3. ✅ Recreate Pinecone index (768 dimensions)
4. ✅ Run ingestion: `npm run ingest`
5. ✅ Start servers and test

## 🔒 Security Notes

- ⚠️ Never commit `.env` file to git
- ✅ Use environment variables in production
- ✅ Rotate API keys regularly
- ✅ Monitor usage to prevent abuse

## 📚 Resources

- [Gemini API Docs](https://ai.google.dev/docs)
- [Embedding Guide](https://ai.google.dev/docs/embeddings_guide)
- [Gemini Pro Model](https://ai.google.dev/models/gemini)
- [Pricing](https://ai.google.dev/pricing)

---

**Your app is now powered by Google Gemini! 🎉**
---

**Your app is now powered by Google Gemini! 🎉**
