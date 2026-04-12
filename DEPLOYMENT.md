# 🚀 Deployment Guide - Dharma AI

Complete step-by-step guide to deploy Dharma AI to production.

## 📋 Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] MongoDB Atlas cluster created
- [ ] Pinecone index created and populated
- [ ] OpenAI API key with sufficient credits
- [ ] Domain name (optional)
- [ ] SSL certificate (handled by platforms)

## 🗄️ Database Setup

### MongoDB Atlas

1. **Create Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for free tier

2. **Create Cluster**
   - Click "Build a Database"
   - Choose FREE tier (M0)
   - Select region closest to your users
   - Name: `dharma-ai-cluster`

3. **Configure Access**
   - Database Access → Add New User
   - Username: `dharma-admin`
   - Password: Generate secure password
   - Role: Atlas Admin

4. **Network Access**
   - Network Access → Add IP Address
   - For development: Add your IP
   - For production: Allow access from anywhere (0.0.0.0/0)
   - Or add specific IPs of your hosting provider

5. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string:
   ```
   mongodb+srv://dharma-admin:<password>@dharma-ai-cluster.xxxxx.mongodb.net/dharma-ai?retryWrites=true&w=majority
   ```
   - Replace `<password>` with your actual password

### Pinecone Setup

1. **Create Account**
   - Go to [Pinecone](https://www.pinecone.io/)
   - Sign up for free tier

2. **Create Index**
   - Dashboard → Create Index
   - Name: `dharma-ai-gita`
   - Dimensions: `1536`
   - Metric: `cosine`
   - Pod Type: `s1.x1` (free tier) or `p1.x1` (production)
   - Click Create

3. **Get API Key**
   - API Keys → Create API Key
   - Copy API key and environment

4. **Ingest Data**
   ```bash
   # Set environment variables locally
   export PINECONE_API_KEY=your-key
   export PINECONE_ENVIRONMENT=your-env
   export PINECONE_INDEX_NAME=dharma-ai-gita
   export OPENAI_API_KEY=your-openai-key
   
   # Run ingestion
   npm run ingest
   ```

## 🌐 Backend Deployment (Render)

### Option 1: Render (Recommended)

1. **Create Account**
   - Go to [Render](https://render.com)
   - Sign up with GitHub

2. **Create Web Service**
   - Dashboard → New → Web Service
   - Connect your GitHub repository
   - Name: `dharma-ai-backend`
   - Environment: `Node`
   - Region: Choose closest to users
   - Branch: `main`

3. **Configure Build**
   - Build Command: `npm install`
   - Start Command: `node server/index.js`

4. **Environment Variables**
   Add these in Render dashboard:
   ```
   OPENAI_API_KEY=sk-...
   PINECONE_API_KEY=...
   PINECONE_ENVIRONMENT=...
   PINECONE_INDEX_NAME=dharma-ai-gita
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-super-secret-key-min-32-chars
   PORT=3001
   NODE_ENV=production
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your backend URL: `https://dharma-ai-backend.onrender.com`

### Option 2: Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Add Environment Variables**
   ```bash
   railway variables set OPENAI_API_KEY=sk-...
   railway variables set MONGODB_URI=mongodb+srv://...
   # ... add all other variables
   ```

### Option 3: AWS EC2

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t2.micro (free tier) or t2.small
   - Configure security group: Allow ports 22, 80, 443, 3001

2. **SSH into Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   ```

4. **Clone and Setup**
   ```bash
   git clone your-repo-url
   cd dharma-ai
   npm install
   ```

5. **Create .env File**
   ```bash
   nano .env
   # Paste all environment variables
   ```

6. **Start with PM2**
   ```bash
   pm2 start server/index.js --name dharma-backend
   pm2 startup
   pm2 save
   ```

7. **Setup Nginx (Optional)**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/dharma-ai
   ```
   
   Add configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable and restart:
   ```bash
   sudo ln -s /etc/nginx/sites-available/dharma-ai /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 💻 Frontend Deployment (Vercel)

### Vercel (Recommended)

1. **Create Account**
   - Go to [Vercel](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Dashboard → Add New → Project
   - Import your GitHub repository
   - Framework Preset: Next.js (auto-detected)

3. **Configure Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://dharma-ai-backend.onrender.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live at: `https://your-project.vercel.app`

5. **Custom Domain (Optional)**
   - Settings → Domains
   - Add your domain
   - Update DNS records as instructed

### Netlify Alternative

1. **Create Account**
   - Go to [Netlify](https://www.netlify.com)
   - Sign up with GitHub

2. **Deploy**
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify init
   netlify deploy --prod
   ```

3. **Environment Variables**
   - Site settings → Build & deploy → Environment
   - Add `NEXT_PUBLIC_API_URL`

## 🔒 Security Hardening

### 1. Environment Variables
```bash
# Generate strong JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Rate Limiting
Add to `server/index.js`:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. CORS Configuration
Update `server/index.js`:
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : 'http://localhost:3000',
  credentials: true
}));
```

### 4. Helmet for Security Headers
```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

## 📊 Monitoring & Logging

### 1. Render Logs
- Dashboard → Your Service → Logs
- Real-time log streaming

### 2. Vercel Analytics
- Dashboard → Analytics
- Automatic performance monitoring

### 3. Custom Logging
Add to `server/index.js`:
```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

### 4. Error Tracking (Sentry)
```bash
npm install @sentry/node
```

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.errorHandler());
```

## 🧪 Testing Production

### 1. Health Check
```bash
curl https://your-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Dharma AI server is running"
}
```

### 2. Test Chat Endpoint
```bash
curl -X POST https://your-backend.onrender.com/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "I feel lost"}'
```

### 3. Frontend Test
- Visit your Vercel URL
- Try sending a message
- Check browser console for errors
- Verify shloka cards display correctly

## 🔄 CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run tests
      run: npm test
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📈 Scaling Considerations

### Database
- **MongoDB**: Upgrade to M10+ for production workloads
- **Indexing**: Add indexes on frequently queried fields
```javascript
db.chats.createIndex({ sessionId: 1 });
db.chats.createIndex({ userId: 1, updatedAt: -1 });
```

### Vector Database
- **Pinecone**: Upgrade to p1 or p2 pods for better performance
- **Replicas**: Add replicas for high availability

### Backend
- **Horizontal Scaling**: Deploy multiple instances behind load balancer
- **Caching**: Implement Redis for session management
- **CDN**: Use CloudFlare for static assets

### Frontend
- **Vercel**: Automatically scales
- **Image Optimization**: Use Next.js Image component
- **Code Splitting**: Lazy load components

## 🐛 Troubleshooting

### Issue: Backend not connecting to MongoDB
```bash
# Check connection string format
# Ensure IP whitelist includes 0.0.0.0/0
# Verify username/password
```

### Issue: Pinecone errors
```bash
# Verify index dimensions match (1536)
# Check API key and environment
# Ensure index is created before ingestion
```

### Issue: CORS errors
```bash
# Update CORS origin in server/index.js
# Ensure NEXT_PUBLIC_API_URL is correct
```

### Issue: 500 errors
```bash
# Check server logs in Render dashboard
# Verify all environment variables are set
# Check MongoDB connection
```

## ✅ Post-Deployment Checklist

- [ ] Backend health check passes
- [ ] Frontend loads correctly
- [ ] Chat functionality works
- [ ] Shlokas display properly
- [ ] Chat history saves
- [ ] Authentication works (if enabled)
- [ ] Mobile responsive
- [ ] SSL certificate active
- [ ] Monitoring setup
- [ ] Backups configured
- [ ] Domain configured (if applicable)

## 🎉 You're Live!

Your Dharma AI application is now deployed and ready to serve users worldwide!

**Next Steps:**
1. Share with friends and family
2. Gather feedback
3. Monitor usage and performance
4. Iterate and improve

---

**Need help?** Open an issue on GitHub or contact support.
