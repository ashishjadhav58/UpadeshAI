# Dharma AI - Features

## ✨ Core Features

### 1. **Streaming Responses** 🌊
- Responses are delivered in real-time chunks (like ChatGPT)
- Faster perceived response time
- Better user experience with progressive loading
- Enable by sending `"stream": true` in the request body

**Example:**
```javascript
// Streaming request
fetch('http://localhost:3001/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "I'm feeling depressed about my career",
    stream: true  // Enable streaming
  })
});
```

### 2. **Multi-Language Support** 🌍
- **Automatic Language Detection**: Detects Hindi/Marathi from user input
- **Native Language Responses**: Responds in the same language the user writes in
- **Bilingual Verses**: Keeps verse translations in English, explanations in user's language

**Supported Languages:**
- ✅ English
- ✅ Hindi (हिंदी)
- ✅ Marathi (मराठी)

**Example:**
```
User: "मला माझ्या करिअरबद्दल चिंता वाटते"
Bot: [Responds in Marathi with practical guidance]
```

### 3. **Simplified Responses** 📝
- **Short & Concise**: 3-4 paragraphs maximum
- **Simple Language**: Everyday words, no complex Sanskrit terms
- **Actionable Advice**: 1-2 practical steps you can take TODAY
- **Conversational Tone**: Like talking to a wise friend over tea

**Response Structure:**
1. One sentence acknowledging your feeling
2. ONE relevant Bhagavad Gita verse
3. Brief explanation (2-3 sentences)
4. 1-2 practical actions
5. Short encouragement

### 4. **Semantic Search** 🔍
- Uses **Gemini embeddings** (1024 dimensions)
- Finds verses based on meaning, not just keywords
- Retrieves top 5 most relevant verses from 701 total verses
- Powered by **Pinecone vector database**

### 5. **Rich Dataset** 📚
- **701 verses** from the Bhagavad Gita
- **7 expert translations** per verse (Swami Ramsukhdas, Swami Sivananda, etc.)
- Both Hindi and English translations
- Comprehensive commentary and explanations

### 6. **Session Management** 💾
- Persistent chat history with MongoDB
- Session-based conversations
- User authentication (optional)
- Retrieve past conversations

## 🎯 Use Cases

### Career & Work
- "I'm not getting promoted for 3 years"
- "I feel burned out at work"
- "Should I quit my job?"

### Emotional Support
- "I'm feeling depressed and lost"
- "How to deal with anxiety?"
- "I'm struggling with anger issues"

### Relationships
- "Family conflicts are stressing me"
- "How to handle difficult people?"
- "I feel lonely and isolated"

### Life Direction
- "I don't know my purpose in life"
- "How to make important decisions?"
- "I'm confused about my path"

## 🚀 API Endpoints

### POST `/api/chat/message`
Send a message and get AI response

**Request Body:**
```json
{
  "message": "Your question or situation",
  "sessionId": "optional-session-id",
  "stream": true  // Optional: enable streaming
}
```

**Non-Streaming Response:**
```json
{
  "sessionId": "uuid",
  "response": "Full AI response text",
  "shloka": {
    "id": 47,
    "verseNumber": 47,
    "translation": "...",
    "meaning": "..."
  },
  "relevantVerses": [...]
}
```

**Streaming Response (Server-Sent Events):**
```
data: {"type":"start","sessionId":"uuid","topVerse":{...}}

data: {"type":"chunk","text":"I understand"}

data: {"type":"chunk","text":" how frustrating..."}

data: {"type":"end"}
```

### GET `/api/chat/history/:sessionId`
Retrieve chat history for a session

### GET `/api/chat/sessions`
Get all sessions for authenticated user

## 🔧 Technical Stack

- **AI Model**: Google Gemini 2.5 Flash
- **Embeddings**: Gemini Embedding 001 (1024D)
- **Vector DB**: Pinecone
- **Database**: MongoDB
- **Backend**: Node.js + Express
- **Frontend**: Next.js + React + Tailwind CSS

## 📊 Performance

- **Response Time**: 2-5 seconds (non-streaming)
- **Streaming Latency**: ~500ms to first chunk
- **Search Accuracy**: High relevance with semantic embeddings
- **Concurrent Users**: Scalable with MongoDB + Pinecone

## 🎨 Response Quality

**Before (Long & Complex):**
```
The Bhagavad Gita, in Chapter 2, Verse 47, elucidates the profound 
philosophical concept of Karma Yoga, which fundamentally addresses 
the dichotomy between action and attachment to results...
[500+ words]
```

**After (Short & Simple):**
```
I understand how frustrating 3 years without promotion feels.

The Gita teaches: "Focus on your work, not the reward."

This means your worth isn't tied to a promotion. Many factors 
beyond your control affect promotions - politics, timing, budgets.

Practical steps:
1. Document your achievements for future opportunities
2. Have an honest conversation with your manager

Remember, consistent effort builds skills that will serve you 
wherever you go. 🙏
```

## 🌟 Future Enhancements

- [ ] Voice input/output
- [ ] More languages (Tamil, Telugu, Bengali)
- [ ] Verse of the day
- [ ] Meditation timer with verse reflections
- [ ] Mobile app (React Native)
- [ ] WhatsApp bot integration
