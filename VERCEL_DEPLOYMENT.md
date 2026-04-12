# 🚀 Vercel Deployment Guide - Upadesh AI

Complete guide to deploy your Upadesh AI chatbot to production.

---

## 📋 Architecture Overview

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────┐
│  Vercel         │      │  Render/Railway  │      │  Pinecone   │
│  (Frontend)     │─────▶│  (Backend API)   │─────▶│  (Vectors)  │
│  Next.js        │      │  Express Server  │      └─────────────┘
└─────────────────┘      └──────────────────┘              │
                                  │                         │
                                  ▼                         ▼
                         ┌─────────────────┐      ┌─────────────┐
                         │  MongoDB Atlas  │      │   Gemini    │
                         │  (Chat History) │      │   API       │
                         └─────────────────┘      └─────────────┘
```

**Note:** Vercel is for frontend only. Backend needs separate hosting (Render/Railway/AWS).

---

## 🎯 Deployment Strategy

### Option 1: Vercel + Render (Recommended)
- ✅ Frontend: Vercel (free tier)
- ✅ Backend: Render (free tier with limitations)
- ✅ Database: MongoDB Atlas (free tier)
- ✅ Vector DB: Pinecone (free tier)

### Option 2: Vercel + Railway
- ✅ Frontend: Vercel
- ✅ Backend: Railway (better free tier than Render)
- ✅ Database: MongoDB Atlas
- ✅ Vector DB: Pinecone

### Option 3: All-in-One (Not Recommended)
- ⚠️ Vercel Serverless Functions for backend
- ❌ Limited execution time (10s max on free tier)
- ❌ Not suitable for Advanced RAG (needs 2-3s per request)

---

## 📦 Part 1: Frontend Deployment (Vercel)

### Step 1: Prepare Your Repository

**1.1 Create `.vercelignore`**
```bash
# Create in project root
node_modules
.env
.env.local
server
scripts
data
test-*.json
debug-*.js
*.bat
```

**1.2 Update `package.json`**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**1.3 Create `vercel.json`**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url"
  }
}
```

### Step 2: Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit - Upadesh AI"

# Create GitHub repo and push
git remote add origin https://github.com/ashishjadhav58/upadesh-ai.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

**3.1 Go to [Vercel](https://vercel.com)**
- Sign in with GitHub

**3.2 Import Project**
- Click "Add New Project"
- Select your `upadesh-ai` repository
- Click "Import"

**3.3 Configure Build Settings**
- **Framework Preset:** Next.js
- **Root Directory:** `./` (leave as is)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

**3.4 Add Environment Variables**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```
(You'll update this after deploying backend)

**3.5 Deploy**
- Click "Deploy"
- Wait 2-3 minutes
- Your frontend will be live at `https://upadesh-ai.vercel.app`

---

## 🖥️ Part 2: Backend Deployment (Render)

### Step 1: Prepare Backend for Deployment

**1.1 Create `render.yaml`**
```yaml
services:
  - type: web
    name: upadesh-ai-backend
    env: node
    buildCommand: npm install
    startCommand: npm run server
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: GEMINI_API_KEY
        sync: false
      - key: PINECONE_API_KEY
        sync: false
      - key: PINECONE_INDEX_NAME
        value: upadeshaI
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
```

**1.2 Update `server/index.js`**
```javascript
const PORT = process.env.PORT || 3001;

// Add CORS for Vercel domain
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://upadesh-ai.vercel.app',  // Your Vercel domain
    'https://*.vercel.app'  // All Vercel preview deployments
  ],
  credentials: true
}));
```

### Step 2: Deploy to Render

**2.1 Go to [Render](https://render.com)**
- Sign up/Login with GitHub

**2.2 Create New Web Service**
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Select `upadesh-ai`

**2.3 Configure Service**
- **Name:** `upadesh-ai-backend`
- **Environment:** Node
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Build Command:** `npm install`
- **Start Command:** `npm run server`
- **Instance Type:** Free

**2.4 Add Environment Variables**
```
NODE_ENV=production
PORT=3001
GEMINI_API_KEY=AIzaSyBX0m-yYn8rz-6mVL_55rIuhcY0VbAeWs4
PINECONE_API_KEY=your-actual-pinecone-api-key
PINECONE_INDEX_NAME=upadeshaI
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/upadesh-ai
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**2.5 Deploy**
- Click "Create Web Service"
- Wait 5-10 minutes for deployment
- Your backend will be at `https://upadesh-ai-backend.onrender.com`

**⚠️ Important:** Render free tier sleeps after 15 min of inactivity. First request may take 30s to wake up.

---

## 🗄️ Part 3: MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Account

**1.1 Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)**
- Sign up for free

**1.2 Create Cluster**
- Choose "Shared" (Free tier)
- Provider: AWS
- Region: Choose closest to your backend
- Cluster Name: `upadesh-ai-cluster`

### Step 2: Configure Database Access

**2.1 Create Database User**
- Database Access → Add New Database User
- Username: `upadesh-admin`
- Password: Generate secure password
- Database User Privileges: Read and write to any database

**2.2 Whitelist IP Addresses**
- Network Access → Add IP Address
- Click "Allow Access from Anywhere" (0.0.0.0/0)
- ⚠️ For production, restrict to your backend IP

### Step 3: Get Connection String

**3.1 Connect to Cluster**
- Click "Connect" on your cluster
- Choose "Connect your application"
- Driver: Node.js
- Version: 4.1 or later

**3.2 Copy Connection String**
```
mongodb+srv://upadesh-admin:<password>@upadesh-ai-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**3.3 Update Connection String**
- Replace `<password>` with your actual password
- Add database name: `/upadesh-ai` before the `?`

**Final String:**
```
mongodb+srv://upadesh-admin:YourPassword123@upadesh-ai-cluster.xxxxx.mongodb.net/upadesh-ai?retryWrites=true&w=majority
```

---

## 📊 Part 4: Pinecone Setup (Already Done)

Your Pinecone index is already set up with 701 verses. Just ensure:

✅ Index name: `upadeshaI`
✅ Dimension: 1024
✅ Metric: cosine
✅ All 701 verses ingested

**Get API Key:**
- Go to [Pinecone Console](https://app.pinecone.io/)
- API Keys → Copy your API key
- Add to Render environment variables

---

## 🔗 Part 5: Connect Frontend to Backend

### Step 1: Update Vercel Environment Variable

**5.1 Go to Vercel Dashboard**
- Select your `upadesh-ai` project
- Settings → Environment Variables

**5.2 Update API URL**
```
NEXT_PUBLIC_API_URL=https://upadesh-ai-backend.onrender.com
```

**5.3 Redeploy**
- Deployments → Click "..." → Redeploy
- Or push a new commit to trigger deployment

---

## ✅ Part 6: Verification Checklist

### Frontend (Vercel)
- [ ] Deployed successfully
- [ ] No build errors
- [ ] Environment variable set
- [ ] Can access at `https://upadesh-ai.vercel.app`

### Backend (Render)
- [ ] Deployed successfully
- [ ] All environment variables set
- [ ] MongoDB connection working
- [ ] Pinecone connection working
- [ ] Can access at `https://upadesh-ai-backend.onrender.com`
- [ ] CORS configured for Vercel domain

### Database (MongoDB Atlas)
- [ ] Cluster created
- [ ] User created with password
- [ ] IP whitelist configured
- [ ] Connection string working

### Vector DB (Pinecone)
- [ ] Index exists: `upadeshaI`
- [ ] 701 vectors ingested
- [ ] API key valid

### Integration Test
- [ ] Open `https://upadesh-ai.vercel.app`
- [ ] Type a message
- [ ] Receive response with shloka
- [ ] Check browser console for errors

---

## 🐛 Troubleshooting

### Issue 1: "Failed to fetch" Error

**Cause:** CORS or backend not responding

**Fix:**
```javascript
// server/index.js
app.use(cors({
  origin: 'https://upadesh-ai.vercel.app',
  credentials: true
}));
```

### Issue 2: Backend Slow (30s delay)

**Cause:** Render free tier sleeping

**Fix:**
- Upgrade to paid tier ($7/month)
- Or use Railway (better free tier)
- Or add a keep-alive ping service

### Issue 3: MongoDB Connection Failed

**Cause:** Wrong connection string or IP not whitelisted

**Fix:**
- Check connection string format
- Ensure 0.0.0.0/0 in Network Access
- Check username/password

### Issue 4: Gemini Quota Exceeded

**Cause:** Too many API calls (Advanced RAG uses 3 calls per query)

**Fix:**
- Wait for quota reset (daily)
- Upgrade to paid tier
- Implement caching (reduce calls)

### Issue 5: Build Failed on Vercel

**Cause:** Missing dependencies or TypeScript errors

**Fix:**
```bash
# Test build locally
npm run build

# Fix any errors shown
# Push fixes to GitHub
```

---

## 💰 Cost Breakdown

### Free Tier (Recommended for Testing)
- ✅ Vercel: Free (100GB bandwidth/month)
- ✅ Render: Free (750 hours/month, sleeps after 15 min)
- ✅ MongoDB Atlas: Free (512MB storage)
- ✅ Pinecone: Free (1 index, 100K vectors)
- ✅ Gemini: Free (20 requests/day)
- **Total: $0/month**

### Production Tier (Recommended for Real Users)
- 💰 Vercel: Free (sufficient for most apps)
- 💰 Render: $7/month (no sleeping)
- 💰 MongoDB Atlas: Free (sufficient for 1000s of chats)
- 💰 Pinecone: Free (sufficient for 701 verses)
- 💰 Gemini: ~$10/month (1000 requests)
- **Total: ~$17/month**

---

## 🚀 Quick Deployment Commands

```bash
# 1. Prepare repository
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Deploy frontend (Vercel will auto-deploy on push)
# Just connect GitHub repo to Vercel

# 3. Deploy backend (Render will auto-deploy on push)
# Just connect GitHub repo to Render

# 4. Test
curl https://upadesh-ai-backend.onrender.com/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com/)
- [Pinecone Docs](https://docs.pinecone.io/)
- [Gemini API Docs](https://ai.google.dev/docs)

---

## 🎉 You're Live!

After following this guide, your Upadesh AI will be accessible at:

**Frontend:** `https://upadesh-ai.vercel.app`
**Backend:** `https://upadesh-ai-backend.onrender.com`

Share the link and help people find spiritual guidance! 🙏

---

**Created by:** [ashishjadhav58](https://github.com/ashishjadhav58)
