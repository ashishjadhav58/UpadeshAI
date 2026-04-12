# ⚡ Quick Start Guide - Dharma AI

Get Dharma AI running locally in 10 minutes!

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18+ installed ([Download](https://nodejs.org/))
- ✅ OpenAI API key ([Get one](https://platform.openai.com/api-keys))
- ✅ Pinecone account ([Sign up](https://www.pinecone.io/))
- ✅ MongoDB (local or [Atlas](https://www.mongodb.com/cloud/atlas))

## 🚀 5-Step Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
OPENAI_API_KEY=sk-your-key-here
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-env
PINECONE_INDEX_NAME=dharma-ai-gita
MONGODB_URI=mongodb://localhost:27017/dharma-ai
JWT_SECRET=any-random-string-min-32-chars
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

### Step 3: Create Pinecone Index

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Click "Create Index"
3. Settings:
   - Name: `dharma-ai-gita`
   - Dimensions: `1536`
   - Metric: `cosine`
4. Click "Create Index"

### Step 4: Ingest Data

```bash
npm run ingest
```

Wait for completion (~2-3 minutes for 20 verses).

### Step 5: Start the Application

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## 🎉 You're Ready!

Open [http://localhost:3000](http://localhost:3000) in your browser.

Try asking: "I feel lost in my career" or "How do I deal with failure?"

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Start MongoDB locally
mongod

# Or use MongoDB Atlas connection string
```

### Pinecone Error
- Verify index name matches `.env`
- Check dimensions are `1536`
- Ensure API key is correct

### Port Already in Use
```bash
# Change PORT in .env to 3002 or another available port
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📚 Next Steps

- Read the full [README.md](README.md)
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- Customize the dataset in `data/gita.json`
- Modify AI prompts in `lib/vectorStore.js`

## 💡 Tips

- **Add more verses**: Edit `data/gita.json` and run `npm run ingest` again
- **Change AI behavior**: Modify the system prompt in `lib/vectorStore.js`
- **Customize UI**: Edit components in `components/` directory
- **Monitor logs**: Check terminal output for debugging

## 🆘 Need Help?

- Check the [README.md](README.md) for detailed documentation
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for deployment guides
- Open an issue on GitHub

---

**Happy coding! 🕉️**
