# 🚀 Render Backend Deployment Guide - Upadesh AI

Complete step-by-step guide to deploy your Express backend to Render.

---

## 📋 What You'll Deploy

**Backend Server:**
- Express.js API
- Advanced RAG system (Query Expansion + Re-ranking)
- Gemini AI integration
- MongoDB Atlas connection
- Pinecone vector search
- JWT authentication

---

## ✅ Prerequisites

Before deploying, ensure:
- ✅ Code pushed to GitHub
- ✅ MongoDB Atlas cluster created
- ✅ Pinecone index with 701 verses
- ✅ Gemini API key active
- ✅ `render.yaml` file in project root (already created!)

---

## 🎯 Step-by-Step Deployment

### **Step 1: Go to Render**

1. Visit [https://render.com](https://render.com)
2. Click **"Get Started"** or **"Sign Up"**
3. Choose **"Sign up with GitHub"**
4. Authorize Render to access your GitHub

---

### **Step 2: Create New Web Service**

1. Click **"New +"** button (top right)
2. Select **"Web Service"**
3. Click **"Connect account"** if not connected
4. Find your repository: `ashishjadhav58/UpadeshAI`
5. Click **"Connect"**

---

### **Step 3: Configure Service Settings**

**On the configuration screen, set these EXACT values:**

#### **Basic Settings**

| Setting | Value | Notes |
|---------|-------|-------|
| **Name** | `upadesh-ai-backend` | This will be your subdomain |
| **Region** | `Singapore` | Choose closest to your users |
| **Branch** | `main` | Your GitHub branch |
| **Root Directory** | Leave empty | Use repository root |
| **Runtime** | `Node` | Auto-detected |

#### **Build & Deploy Settings**

| Setting | Value | Notes |
|---------|-------|-------|
| **Build Command** | `npm install` | Installs dependencies |
| **Start Command** | `npm run server` | Starts Express server |

#### **Plan**

| Setting | Value | Notes |
|---------|-------|-------|
| **Instance Type** | `Free` | $0/month, sleeps after 15 min |

**⚠️ Free Tier Limitations:**
- Sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- 750 hours/month (sufficient for testing)

**💰 Upgrade to Starter ($7/month) for:**
- No sleeping
- Faster response times
- Better for production

---

### **Step 4: Environment Variables**

Click **"Advanced"** → **"Add Environment Variable"**

Add these **7 environment variables**:

#### **1. NODE_ENV**
```
Key: NODE_ENV
Value: production
```

#### **2. PORT**
```
Key: PORT
Value: 3001
```

#### **3. GEMINI_API_KEY**
```
Key: GEMINI_API_KEY
Value: AIzaSyBX0m-yYn8rz-6mVL_55rIuhcY0VbAeWs4
```

#### **4. PINECONE_API_KEY**
```
Key: PINECONE_API_KEY
Value: [YOUR_PINECONE_API_KEY_HERE]
```
**⚠️ Get from:** [Pinecone Console](https://app.pinecone.io/) → API Keys

#### **5. PINECONE_INDEX_NAME**
```
Key: PINECONE_INDEX_NAME
Value: upadeshaI
```

#### **6. MONGODB_URI**
```
Key: MONGODB_URI
Value: mongodb+srv://ashishjadhav7719_db_user:QPqesiMcY8mK4IOU@updeshai.yubfndc.mongodb.net/?appName=updeshai
```

#### **7. JWT_SECRET**
```
Key: JWT_SECRET
Value: upadesh-ai-super-secret-jwt-key-2026-production
```

---

### **Step 5: Deploy**

1. Click **"Create Web Service"** (bottom of page)
2. Render will:
   - Clone your repository
   - Run `npm install`
   - Start your server with `npm run server`
3. Wait 5-10 minutes for deployment

**You'll see:**
```
==> Building...
==> Downloading...
==> Installing dependencies...
==> Starting server...
==> Your service is live!
```

---

### **Step 6: Get Your Backend URL**

After deployment completes:

**Your backend URL will be:**
```
https://upadesh-ai-backend.onrender.com
```

**Test it:**
```bash
curl https://upadesh-ai-backend.onrender.com/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

---

### **Step 7: Update Vercel Frontend**

Now that backend is deployed, update your Vercel frontend:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `upadesh-ai` project
3. Go to **Settings** → **Environment Variables**
4. Find `NEXT_PUBLIC_API_URL`
5. Click **Edit**
6. Change value to:
   ```
   https://upadesh-ai-backend.onrender.com
   ```
7. Click **Save**
8. Go to **Deployments** tab
9. Click **"..."** → **"Redeploy"**

---

## 📊 Deployment Checklist

### Before Deployment
- [ ] Code pushed to GitHub
- [ ] `render.yaml` file in root
- [ ] MongoDB Atlas cluster active
- [ ] Pinecone index has 701 vectors
- [ ] Gemini API key valid

### During Deployment
- [ ] Selected correct repository
- [ ] Name: `upadesh-ai-backend`
- [ ] Build command: `npm install`
- [ ] Start command: `npm run server`
- [ ] All 7 environment variables added
- [ ] Clicked "Create Web Service"

### After Deployment
- [ ] Deployment succeeded (green checkmark)
- [ ] Backend URL accessible
- [ ] Test endpoint responds
- [ ] Updated Vercel with backend URL
- [ ] Frontend can communicate with backend

---

## 🔍 Monitoring Your Deployment

### **View Logs**

1. Go to your service dashboard
2. Click **"Logs"** tab
3. You should see:
   ```
   🚀 Server running on port 3001
   📡 API available at http://localhost:3001
   ✅ MongoDB Connected: updeshai.yubfndc.mongodb.net
   ✅ Vector store initialized with Gemini
   ```

### **Check Health**

Render automatically pings your service to keep it alive (on paid plans).

**Health Check Endpoint:** `/` (root)

---

## 🐛 Troubleshooting

### **Issue 1: Build Failed**

**Error:** `npm install failed`

**Fix:**
- Check `package.json` is in repository root
- Ensure all dependencies are listed
- Check build logs for specific error

### **Issue 2: Server Won't Start**

**Error:** `npm run server failed`

**Fix:**
- Verify `package.json` has `"server": "node server/index.js"`
- Check `server/index.js` exists
- Review logs for error message

### **Issue 3: MongoDB Connection Failed**

**Error:** `MongooseError: Could not connect`

**Fix:**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist (0.0.0.0/0)
- Ensure username/password are correct

### **Issue 4: Pinecone Error**

**Error:** `PineconeError: Unauthorized`

**Fix:**
- Verify `PINECONE_API_KEY` is correct
- Check `PINECONE_INDEX_NAME` is `upadeshaI`
- Ensure index exists in Pinecone console

### **Issue 5: CORS Error**

**Error:** `Access-Control-Allow-Origin`

**Fix:**
Update `server/index.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://upadesh-ai.vercel.app',
    'https://*.vercel.app'
  ],
  credentials: true
}));
```

### **Issue 6: Service Sleeping (Free Tier)**

**Symptom:** First request takes 30 seconds

**This is normal on free tier.**

**Solutions:**
1. Upgrade to Starter plan ($7/month)
2. Use a keep-alive service (ping every 10 min)
3. Accept the delay for testing

---

## 🔄 Auto-Deploy on Git Push

Render automatically redeploys when you push to GitHub!

```bash
# Make changes
git add .
git commit -m "Update backend"
git push origin main

# Render will automatically:
# 1. Detect the push
# 2. Pull latest code
# 3. Rebuild and redeploy
```

---

## 📈 Scaling & Performance

### **Free Tier**
- ✅ Good for: Testing, demos, low traffic
- ⚠️ Sleeps after 15 min
- ⚠️ 512MB RAM
- ⚠️ Shared CPU

### **Starter ($7/month)**
- ✅ No sleeping
- ✅ 512MB RAM
- ✅ Faster response
- ✅ Better for production

### **Standard ($25/month)**
- ✅ 2GB RAM
- ✅ Dedicated CPU
- ✅ High traffic support

---

## 🔐 Security Best Practices

### **Environment Variables**
- ✅ Never commit `.env` to Git
- ✅ Use Render's environment variables
- ✅ Rotate JWT secret regularly
- ✅ Keep API keys private

### **MongoDB**
- ✅ Use strong password
- ✅ Restrict IP whitelist (production)
- ✅ Enable authentication
- ✅ Regular backups

### **API Rate Limiting**
Consider adding rate limiting:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 🎉 Success!

Your backend is now live at:
```
https://upadesh-ai-backend.onrender.com
```

Your complete Upadesh AI stack:
- ✅ Frontend: `https://upadesh-ai.vercel.app`
- ✅ Backend: `https://upadesh-ai-backend.onrender.com`
- ✅ Database: MongoDB Atlas
- ✅ Vector DB: Pinecone
- ✅ AI: Google Gemini

**Your Advanced RAG-powered spiritual chatbot is now live for the world!** 🙏

---

## 📞 Support

**Render Issues:**
- [Render Docs](https://render.com/docs)
- [Render Community](https://community.render.com/)

**Project Issues:**
- GitHub: [ashishjadhav58/UpadeshAI](https://github.com/ashishjadhav58/UpadeshAI)

---

**Created by:** [ashishjadhav58](https://github.com/ashishjadhav58)
