# 🕉️ Upadesh AI - Advanced Spiritual Guidance Chatbot

A production-ready spiritual chatbot powered by **Advanced Multi-Stage RAG** that provides personalized guidance from the Bhagavad Gita using AI-powered semantic search, query expansion, and intelligent re-ranking.

## ✨ Features

- **🤖 AI-Powered Guidance**: Uses GPT-4 to provide compassionate, contextual responses
- **📚 Semantic Search**: Pinecone vector database for finding relevant Bhagavad Gita verses
- **💬 Beautiful Chat UI**: Modern, responsive interface with dark mode
- **📖 Rich Shloka Display**: Sanskrit text, transliteration, translation, and detailed explanations
- **💾 Chat History**: MongoDB integration for persistent conversation storage
- **🔐 Optional Authentication**: JWT-based user authentication system
- **🎨 Modern Design**: Built with Tailwind CSS and Framer Motion animations
- **📱 Responsive**: Works seamlessly on desktop and mobile devices

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Next.js   │─────▶│   Express    │─────▶│   OpenAI    │
│  Frontend   │      │   Backend    │      │   GPT-4     │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ├─────▶ Pinecone (Vector DB)
                            │
                            └─────▶ MongoDB (Chat History)
```

## 📁 Project Structure

```
dharma-ai/
├── app/                      # Next.js app directory
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── Header.tsx           # App header
│   ├── WelcomeScreen.tsx    # Landing page
│   ├── ChatInterface.tsx    # Main chat UI
│   ├── MessageBubble.tsx    # Message display
│   └── ShlokaCard.tsx       # Shloka display card
├── server/                  # Backend server
│   ├── index.js             # Express server
│   ├── models/              # MongoDB models
│   │   ├── User.js
│   │   └── Chat.js
│   ├── routes/              # API routes
│   │   ├── auth.js
│   │   └── chat.js
│   ├── middleware/          # Auth middleware
│   │   └── auth.js
│   └── config/              # Configuration
│       └── database.js
├── lib/                     # Shared utilities
│   └── vectorStore.js       # Pinecone + OpenAI integration
├── scripts/                 # Utility scripts
│   └── ingest.js            # Data ingestion script
├── data/                    # Dataset
│   └── gita.json            # Bhagavad Gita verses
└── .env.example             # Environment variables template
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB instance (local or Atlas)
- OpenAI API key
- Pinecone account and API key

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd dharma-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=dharma-ai-gita

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/dharma-ai
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dharma-ai

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this

# Server Configuration
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

### 4. Set Up Pinecone Index

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new index with these settings:
   - **Name**: `dharma-ai-gita`
   - **Dimensions**: `1536` (for OpenAI text-embedding-ada-002)
   - **Metric**: `cosine`
   - **Pod Type**: `s1.x1` (starter) or `p1.x1` (production)

### 5. Ingest Data into Pinecone

Run the ingestion script to populate the vector database:

```bash
npm run ingest
```

This will:
- Load all verses from `data/gita.json`
- Generate embeddings using OpenAI
- Store them in Pinecone with metadata

Expected output:
```
🚀 Starting data ingestion...
📚 Found 20 verses to process
Processing verse 1/20: Chapter 2, Verse 47
✅ Successfully ingested verse 1
...
✨ Data ingestion completed successfully!
```

### 6. Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**MongoDB Atlas:**
- Use the connection string in your `.env` file

### 7. Start the Backend Server

```bash
npm run server
```

The server will start on `http://localhost:3001`

### 8. Start the Frontend

In a new terminal:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🎯 Usage

### Basic Chat Flow

1. **Welcome Screen**: Users are greeted with an introduction and example questions
2. **Ask a Question**: Type any life situation or question
3. **AI Processing**: 
   - User's message is converted to an embedding
   - Pinecone finds the 5 most relevant verses
   - GPT-4 generates a compassionate response with the best verse
4. **Display Response**: Shows the AI's guidance plus a beautiful shloka card
5. **Chat History**: All conversations are saved to MongoDB

### Example Interactions

**User**: "I feel lost in my career"

**Dharma AI**: 
- Empathetic acknowledgment
- Relevant shloka (e.g., Karma Yoga verse)
- Practical explanation
- Actionable advice

## 🔧 API Endpoints

### Chat Endpoints

**POST** `/api/chat/message`
```json
{
  "message": "I feel anxious about the future",
  "sessionId": "optional-session-id"
}
```

Response:
```json
{
  "sessionId": "uuid-v4",
  "response": "AI-generated guidance...",
  "shloka": {
    "chapter": 2,
    "verse": 47,
    "sanskrit": "...",
    "translation": "...",
    ...
  },
  "relevantVerses": [...]
}
```

**GET** `/api/chat/history/:sessionId`

Returns full chat history for a session.

**GET** `/api/chat/sessions`

Returns all sessions for authenticated user.

### Auth Endpoints

**POST** `/api/auth/register`
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

**POST** `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**GET** `/api/auth/me`

Returns current user (requires Bearer token).

## 🎨 Customization

### Adding More Verses

1. Edit `data/gita.json`
2. Add new verses following the schema:
```json
{
  "id": 21,
  "chapter": 3,
  "verse": 21,
  "sanskrit": "...",
  "transliteration": "...",
  "translation": "...",
  "meaning": "...",
  "explanation": "...",
  "themes": ["theme1", "theme2"]
}
```
3. Run `npm run ingest` again

### Customizing AI Responses

Edit the system prompt in `lib/vectorStore.js`:

```javascript
const systemPrompt = `You are a wise, compassionate spiritual guide...`
```

### Styling

- Global styles: `app/globals.css`
- Tailwind config: `tailwind.config.js`
- Component styles: Inline Tailwind classes

## 🚀 Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.com`
5. Deploy

### Backend (Render / Railway / AWS)

**Render:**
1. Create new Web Service
2. Connect your repository
3. Build command: `npm install`
4. Start command: `npm run server`
5. Add environment variables
6. Deploy

**Railway:**
```bash
railway login
railway init
railway up
```

### Database (MongoDB Atlas)

1. Create cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Update `MONGODB_URI` in production environment

### Vector Database (Pinecone)

- Pinecone is cloud-hosted, no deployment needed
- Use production pod type for better performance

## 📊 Performance Optimization

- **Caching**: Implement Redis for frequently accessed verses
- **Rate Limiting**: Add rate limiting to API endpoints
- **CDN**: Use Vercel Edge Network for frontend
- **Database Indexing**: Add indexes to MongoDB collections
- **Batch Processing**: Process multiple embeddings in parallel

## 🔒 Security Best Practices

- ✅ Environment variables for sensitive data
- ✅ JWT authentication with secure secrets
- ✅ Password hashing with bcrypt
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ⚠️ Add rate limiting in production
- ⚠️ Implement HTTPS in production
- ⚠️ Add request size limits

## 🧪 Testing

```bash
# Run tests (add your test framework)
npm test

# Test ingestion
npm run ingest

# Test API endpoints
curl http://localhost:3001/health
```

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- **Bhagavad Gita**: Ancient wisdom text
- **OpenAI**: GPT-4 and embeddings API
- **Pinecone**: Vector database
- **Next.js**: React framework
- **MongoDB**: Database solution

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues or questions:
- Open a GitHub issue
- Email: support@dharma-ai.com (update with your email)

## 🗺️ Roadmap

- [ ] Add more scriptures (Upanishads, Yoga Sutras)
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Community features
- [ ] Meditation timer integration

---

**Built with ❤️ for spiritual seekers worldwide**
