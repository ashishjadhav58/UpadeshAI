# 🔧 Environment Setup - Upadesh AI

## Your Complete .env Configuration

Copy this to your `.env` file:

```env
# Google Gemini Configuration
GEMINI_API_KEY=AIzaSyBX0m-yYn8rz-6mVL_55rIuhcY0VbAeWs4

# Pinecone Configuration
PINECONE_API_KEY=your_actual_pinecone_api_key_here
PINECONE_INDEX_NAME=upadeshaI

# MongoDB Configuration (MongoDB Atlas)
MONGODB_URI=mongodb+srv://ashishjadhav7719_db_user:QPqesiMcY8mK4IOU@updeshai.yubfndc.mongodb.net/?appName=updeshai

# JWT Secret (Change this to a random string)
JWT_SECRET=upadesh-ai-super-secret-jwt-key-2026-production

# Server Configuration
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

---

## 📝 Setup Instructions

### Step 1: Create .env File

```bash
# Copy .env.example to .env
cp .env.example .env
```

### Step 2: Update .env with Your Credentials

Open `.env` and paste the configuration above.

**⚠️ Important:** Replace `your_actual_pinecone_api_key_here` with your real Pinecone API key from [Pinecone Console](https://app.pinecone.io/).

---

## 🔑 Credential Details

### ✅ Gemini API Key
```
AIzaSyBX0m-yYn8rz-6mVL_55rIuhcY0VbAeWs4
```
- **Status:** Active
- **Quota:** 20 requests/day (free tier)
- **Usage:** Embeddings + Query Expansion + Re-ranking + Response Generation

### ✅ MongoDB Atlas
```
Connection String: mongodb+srv://ashishjadhav7719_db_user:QPqesiMcY8mK4IOU@updeshai.yubfndc.mongodb.net/?appName=updeshai
Username: ashishjadhav7719_db_user
Password: QPqesiMcY8mK4IOU
Cluster: updeshai.yubfndc.mongodb.net
Database: Will be auto-created on first connection
```
- **Status:** Active
- **Tier:** Free (M0)
- **Storage:** 512MB
- **Usage:** Chat history + User data

### ⚠️ Pinecone API Key
```
Status: You need to add this
Index Name: upadeshaI
Dimension: 1024
Vectors: 701 (already ingested)
```

**How to get Pinecone API Key:**
1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Click on "API Keys" in left sidebar
3. Copy your API key
4. Paste it in `.env` file

### ✅ JWT Secret
```
upadesh-ai-super-secret-jwt-key-2026-production
```
- **Usage:** User authentication tokens
- **Note:** Change this to a random string for production

---

## 🚀 For Deployment (Render/Vercel)

### Render Environment Variables
```
GEMINI_API_KEY=AIzaSyBX0m-yYn8rz-6mVL_55rIuhcY0VbAeWs4
PINECONE_API_KEY=your_actual_pinecone_api_key_here
PINECONE_INDEX_NAME=upadeshaI
MONGODB_URI=mongodb+srv://ashishjadhav7719_db_user:QPqesiMcY8mK4IOU@updeshai.yubfndc.mongodb.net/?appName=updeshai
JWT_SECRET=upadesh-ai-super-secret-jwt-key-2026-production
NODE_ENV=production
PORT=3001
```

### Vercel Environment Variables
```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

---

## ✅ Verification

### Test MongoDB Connection
```bash
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb+srv://ashishjadhav7719_db_user:QPqesiMcY8mK4IOU@updeshai.yubfndc.mongodb.net/?appName=updeshai').then(() => console.log('✅ MongoDB Connected')).catch(err => console.error('❌ Error:', err.message));"
```

### Test Gemini API
```bash
node -e "const { GoogleGenerativeAI } = require('@google/generative-ai'); const genAI = new GoogleGenerativeAI('AIzaSyBX0m-yYn8rz-6mVL_55rIuhcY0VbAeWs4'); const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); model.generateContent('test').then(r => console.log('✅ Gemini Working')).catch(e => console.error('❌ Error:', e.message));"
```

### Test Pinecone Connection
```bash
node -e "const { Pinecone } = require('@pinecone-database/pinecone'); const pc = new Pinecone({ apiKey: 'YOUR_KEY_HERE' }); const index = pc.index('upadeshaI'); index.describeIndexStats().then(stats => console.log('✅ Pinecone Connected:', stats.totalRecordCount, 'vectors')).catch(err => console.error('❌ Error:', err.message));"
```

---

## 🔒 Security Notes

**⚠️ NEVER commit .env to Git!**

The `.env` file is already in `.gitignore`, but double-check:

```bash
# Verify .env is ignored
git status

# .env should NOT appear in the list
```

**For Production:**
1. Use environment variables in hosting platform (Render/Vercel)
2. Never hardcode credentials in code
3. Rotate JWT secret regularly
4. Use different credentials for dev/staging/production

---

## 📊 Current Status

- ✅ Gemini API: Configured
- ✅ MongoDB Atlas: Configured
- ⚠️ Pinecone API: **Need to add your key**
- ✅ JWT Secret: Configured
- ✅ Server Port: 3001
- ✅ Environment: Development

---

**Once you add your Pinecone API key, you're ready to run:**

```bash
# Start backend
npm run server

# Start frontend (new terminal)
npm run dev
```

Your Upadesh AI will be live at `http://localhost:3000`! 🙏
