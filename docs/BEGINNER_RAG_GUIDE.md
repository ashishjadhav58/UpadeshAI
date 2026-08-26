# Upadesh AI — Beginner’s Complete Guide (Project + RAG Pipeline)

Welcome. This guide explains **the whole project** in plain language: what it is, what RAG means, every stage of the pipeline, each service, alternatives (Pinecone vs ChromaDB, which LLMs), ethics, and how pieces connect.

If you are new to AI apps, read top to bottom once. Then use the table of contents to jump back.

---

## Table of contents

1. [What is Upadesh AI?](#1-what-is-upadesh-ai)
2. [Big picture architecture](#2-big-picture-architecture)
3. [What is RAG? (beginner explanation)](#3-what-is-rag-beginner-explanation)
4. [RAG pipeline stages (step by step)](#4-rag-pipeline-stages-step-by-step)
5. [Services & tools we use](#5-services--tools-we-use)
6. [Vector databases compared](#6-vector-databases-compared)
7. [Embeddings explained](#7-embeddings-explained)
8. [LLMs we use (and options)](#8-llms-we-use-and-options)
9. [How a chat request flows](#9-how-a-chat-request-flows)
10. [Project folder map](#10-project-folder-map)
11. [Environment variables](#11-environment-variables)
12. [How to run locally](#12-how-to-run-locally)
13. [Quality, evaluation & feedback](#13-quality-evaluation--feedback)
14. [Ethics & responsible design](#14-ethics--responsible-design)
15. [Glossary](#15-glossary)
16. [Where to read next](#16-where-to-read-next)

---

## 1. What is Upadesh AI?

**Upadesh AI** is a spiritual **guidance chatbot**. Someone shares a life struggle (fear, confusion, anger, purpose…). The app:

1. Finds **relevant Bhagavad Gita verses** (shlokas + meanings).  
2. Uses an **LLM** (language model) to write a warm, structured reply.  
3. Shows **which verse** informed the answer (provenance / citation).

It is **not** meant to replace a teacher, therapist, or religious authority. It is a study + reflection assistant grounded in retrieved text.

**Stack (simple view)**

| Layer | Technology |
|-------|------------|
| Frontend UI | Next.js + React |
| Backend API | Node.js + Express |
| Chat history | MongoDB |
| Verse search | Pinecone (vector DB) |
| Embeddings | Google Gemini embedding model |
| Chat / rewrite / classify | Groq-hosted LLMs |
| Auth (optional) | JWT |

---

## 2. Big picture architecture

```
┌─────────────┐     HTTP / SSE      ┌──────────────────┐
│  Next.js UI │ ◄─────────────────► │ Express API      │
│  Chat page  │                     │ /api/chat/...    │
└─────────────┘                     └────────┬─────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
             ┌────────────┐          ┌──────────────┐          ┌────────────┐
             │  MongoDB   │          │   Pinecone   │          │ Gemini +   │
             │  chats,    │          │  verse       │          │ Groq LLMs  │
             │  feedback  │          │  vectors     │          │            │
             └────────────┘          └──────────────┘          └────────────┘
```

**Why so many pieces?**  
One tool cannot do everything well. UI shows messages; API orchestrates; Mongo remembers chats; Pinecone finds similar verses; Gemini turns text into vectors; Groq writes the reply quickly.

---

## 3. What is RAG? (beginner explanation)

**RAG = Retrieval-Augmented Generation.**

### Without RAG (plain chatbot)

User asks → LLM answers from **memory trained years ago**.  
Risk: invents verses, wrong chapter numbers, confident nonsense (**hallucination**).

### With RAG (our approach)

User asks → system **searches** a private library of Gita verses → puts the best matches into the prompt → LLM answers **using that evidence**.

Think of it like an open-book exam:

| Open-book piece | In our app |
|-----------------|------------|
| The book | `data/` verses + translations in Pinecone |
| Finding the right page | Vector similarity search |
| Writing the essay | LLM generation |
| Citing the page | Source card (`Bhagavad Gita 3.25`) |

**Why RAG is essential here**

- Scripture should be **grounded**, not improvised.  
- Users deserve **citations**.  
- We can **refuse** when nothing relevant is found (safer).

---

## 4. RAG pipeline stages (step by step)

There are **two timelines**: (A) build the library once, (B) answer each user message.

### A) Offline / ingest pipeline (build the index)

Run occasionally via `npm run ingest` (`scripts/ingest.js`).

| Stage | What happens | Why it matters |
|-------|----------------|----------------|
| **1. Load data** | Read `translation.json` (and related verse data) | Raw teachings enter the system |
| **2. Chunk** | **One vector per shloka** (`verse_id`) | Clean citations; pure meaning per verse |
| **3. Embed** | Gemini turns chunk text → list of numbers (vector) | Computers compare meaning via math |
| **4. Upsert** | Save vector + metadata in **Pinecone** | Later queries can search this index |

**Chunking choice (important)**  
We use **per-verse** chunks, not random 500-token windows.  
Reason: each Gita verse is a natural unit with a clear `chapter.verse` citation. Mixing verses would blur meaning and break provenance.

### B) Online / query pipeline (each chat message)

Rough order in `server/routes/chat.js` + `lib/vectorStore.js`:

| # | Stage | Service | What it does | Why essential |
|---|--------|---------|--------------|---------------|
| 0 | **Scope guardrail** | Heuristic + small LLM | Is this spiritual/life guidance or off-topic (trivia, code, crypto)? | Avoid forced Gita answers to irrelevant questions |
| 1 | **Query rewrite** | Groq (rewrite model) | Turns “I feel lost” into retrieval-friendly wording | User language ≠ scripture language |
| 2 | **Keyword enhance** | Local rules | Adds theme words (duty, fear, peace…) | Cheap boost for known patterns |
| 3 | **Query expansion** (optional in full mode) | Groq | Extra themes / alternate queries | Broader recall |
| 4 | **Embed query** | Gemini | Query → vector | Same space as verse vectors |
| 5 | **Vector search** | Pinecone | Top-k nearest verses (cosine similarity) | Find candidates |
| 6 | **Similarity threshold** | Config `SIMILARITY_THRESHOLD` | Drop weak matches | Don’t feed junk to the LLM |
| 7 | **Preferred verse inject** | Pinecone fetch by id | For decisions, ensure e.g. **3.25** can be considered | Teaching quality, not only raw nearest neighbor |
| 8 | **Intent pick primary** | Local logic | Decision → prefer 3.25; mind → prefer 2.55… | Align teaching with user need |
| 9 | **Re-rank** (optional) | Groq | LLM orders candidates | Better relevance ordering |
| 10 | **Generate answer** | Groq chat model | Structured guidance; **locked to primary verse** | Helpful reply + grounding |
| 11 | **Stream to UI** | SSE | Tokens appear live | Better UX |
| 12 | **Save + cite** | MongoDB + UI | History, sources, feedback | Learning & trust |

**Low-confidence path:** if nothing passes the threshold → polite abstain message (no fake verse).

---

## 5. Services & tools we use

### 5.1 Next.js (frontend)

- Shows chat UI, streaming text, source cards, thumbs up/down.  
- Talks to the API with `fetch` + Server-Sent Events (SSE) when `stream: true`.

### 5.2 Express (backend)

- Routes: `/api/chat/message`, `/api/chat/feedback`, auth routes.  
- Orchestrates RAG steps; does not “know” Gita by itself.

### 5.3 MongoDB

- Stores chat sessions and messages.  
- Stores **feedback** documents (thumbs).  
- Also appends `logs/feedback.jsonl` for easy offline analysis.

### 5.4 Pinecone (vector database)

- Stores ~701 verse embeddings.  
- Returns nearest neighbors by **cosine similarity**.  
- Metadata: translation, meaning, explanation snippets, ids.

### 5.5 Google Gemini (embeddings)

- Model used for embeddings: `gemini-embedding-001` (then sliced to **1024** dims to match the index).  
- Needed because **Groq does not provide embeddings** in our setup.

### 5.6 Groq (LLM inference)

Fast hosted open models. We use different models for different jobs:

| Job | Env var | Typical model | Why |
|-----|---------|---------------|-----|
| Final guidance answer | `GROQ_MODEL` | `allam-2-7b` | Streams real `content` tokens reliably |
| Rewrite / scope classify | `GROQ_REWRITE_MODEL` | `allam-2-7b` | Follows short JSON instructions well |
| (Tried earlier) | — | `openai/gpt-oss-20b` | Often streams only “reasoning”, empty answers |

### 5.7 Local verse catalog (`data/verse.json`)

- Maps id → `chapter.verse`, Sanskrit, transliteration.  
- Used for **human citations** without re-ingesting Pinecone.

---

## 6. Vector databases compared

A **vector DB** stores embeddings and finds “nearest” vectors fast.

| Option | Type | Pros | Cons | In this project? |
|--------|------|------|------|------------------|
| **Pinecone** | Managed cloud | Easy, scalable, good docs | Needs API key & network | **Yes (current)** |
| **ChromaDB** | Often local / self-host | Free to start, simple Python/JS | You manage ops; less “set and forget” cloud | Alternative |
| **Weaviate** | Open + cloud | Rich filters, hybrid search | More setup | Alternative |
| **Qdrant** | Open + cloud | Fast, good filters | Ops overhead if self-hosted | Alternative |
| **FAISS** | Library (not full DB) | Very fast locally | Not a full product DB (no easy multi-user API alone) | Research / local experiments |
| **MongoDB Atlas Vector Search** | Same DB as chats | One vendor | Different tuning; couple data domains | Possible future |

**Why we use Pinecone now:** already wired, managed uptime, cosine search fits semantic verse matching.

**When ChromaDB might be better:** classroom demos, fully offline, zero cloud cost, small corpus on one machine.

---

## 7. Embeddings explained

An **embedding** is a list of numbers representing meaning.

Example idea (not real numbers):

- “I feel anxious” → `[0.12, -0.44, …]`  
- A verse about fear/steadiness → `[0.10, -0.41, …]`  
- Those two vectors are **close** (high cosine similarity).

**Cosine similarity**  
Measures angle between vectors. Score near **1** = very similar direction (related meaning). Near **0** = unrelated.

**Threshold (e.g. 0.62)**  
“Only trust neighbors that are similar enough.” Below that → abstain.

**Gemini vs other embedding APIs**

| Provider | Notes |
|----------|--------|
| Gemini | What we use; must match dimension with Pinecone index |
| OpenAI `text-embedding-3-*` | Common alternative; would need re-ingest |
| Local models (e.g. sentence-transformers) | Free/offline; more DIY |

**Critical rule:** query embeddings and document embeddings must use the **same model family / compatible space**. Mixing providers without re-indexing breaks search.

---

## 8. LLMs we use (and options)

**LLM = Large Language Model** — predicts text; we use it to rewrite queries, classify scope, re-rank, and write guidance.

| Provider | Examples | Pros | Cons |
|----------|----------|------|------|
| **Groq** (our chat) | allam, gpt-oss, compound… | Very fast inference | Model availability changes; some models “think” in hidden channels |
| **Google Gemini** | gemini-2.5-flash | Strong + embeddings in one ecosystem | Quotas / billing |
| **OpenAI** | GPT-4o, etc. | High quality | Cost |
| **Anthropic** | Claude | Strong writing / safety | Cost |
| **Local (Ollama)** | Llama, Mistral | Privacy, free runtime | Hardware needed; slower |

**Ethics note:** the LLM is a **coach layer**. The **source of truth** for verses is the retrieved catalog, not the model’s memory.

---

## 9. How a chat request flows

Example user message: *“I’m confused about what decision to make.”*

1. UI sends `POST /api/chat/message` with `stream: true`.  
2. **Scope check** → in scope (life decision).  
3. **Rewrite** → something like “performing right action without attachment to results”.  
4. **Embed** rewritten + original text.  
5. **Pinecone** returns nearest verses.  
6. **Threshold** filters weak ones.  
7. **Inject / prefer 3.25** for decision intent if present in index.  
8. **Generate** structured answer locked to primary verse.  
9. SSE events: `start` (sources) → `chunk`… → `end`.  
10. UI shows text + **Primary source: Bhagavad Gita 3.25**.  
11. User may press 👍/👎 → `POST /api/chat/feedback`.

---

## 10. Project folder map

```
UpadeshAI/
├── app/                    # Next.js pages
├── components/             # Chat UI, ShlokaCard, feedback buttons
├── data/                   # verse.json, translation.json, …
├── docs/                   # Guides (this file + corrections)
├── eval/                   # Retrieval test questions + reports
├── lib/
│   ├── vectorStore.js      # Heart of RAG logic
│   └── verseLookup.js      # id → chapter.verse citations
├── scripts/
│   ├── ingest.js           # Build Pinecone index
│   └── eval-retrieval.js   # Hit-rate evaluation
├── server/
│   ├── index.js            # Express entry
│   ├── routes/chat.js      # Chat + streaming
│   ├── routes/feedback.js  # Thumbs logging
│   └── models/             # Mongo schemas
├── logs/feedback.jsonl     # Local feedback log (gitignored)
├── RAG_NOTES.md            # Interview-style feature notes
├── .env                    # Secrets (never commit)
└── package.json
```

---

## 11. Environment variables

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Embeddings |
| `GROQ_API_KEY` | LLM calls |
| `GROQ_MODEL` | Main answer model |
| `GROQ_REWRITE_MODEL` | Rewrite + scope classify |
| `PINECONE_API_KEY` | Vector DB |
| `PINECONE_INDEX_NAME` | Index name (e.g. `upadeshai`) |
| `SIMILARITY_THRESHOLD` | Min cosine score (default ~0.62) |
| `MONGODB_URI` | Chat + feedback DB |
| `JWT_SECRET` | Auth |
| `PORT` / `NEXT_PUBLIC_API_URL` | Server URL for UI |

Copy from `.env.example` and fill real keys.

---

## 12. How to run locally

```bash
cd UpadeshAI
npm install

# Terminal 1 — API
npm run server

# Terminal 2 — UI
npm run dev
```

Useful scripts:

| Command | Meaning |
|---------|---------|
| `npm run ingest` | Rebuild / upsert Pinecone vectors |
| `npm run eval:retrieval` | Fast hit-rate test |
| `npm run eval:retrieval:rewrite` | Hit-rate with query rewrite |
| `npm run eval:retrieval:full` | Full production-like retrieval path |

---

## 13. Quality, evaluation & feedback

### Retrieval evaluation

File: `eval/retrieval_eval_set.json`  
Script: `scripts/eval-retrieval.js`  

**Hit-rate:** % of questions where an expected verse appears in top-k.

This tells you if **search** is healthy, separate from how well the LLM writes.

### Feedback

Thumbs up/down logs:

- query  
- response  
- sources  
- rating (+1 / −1)  

Stored in MongoDB + `logs/feedback.jsonl`.

Use feedback later to tune threshold, prompts, or preferred verses.

### Answer grounding (product quality)

See also `docs/CORRECTIONS_AND_GUIDANCE_DESIGN.md`:

- Never mismatch explained verse vs source card.  
- Separate meaning vs practical tips.  
- Decision → 3.25; mind control → 2.55 / 2.68 when appropriate.

---

## 14. Ethics & responsible design

Spiritual guidance apps need extra care.

| Principle | How we try to honor it |
|-----------|-------------------------|
| **Honesty** | Cite sources; don’t invent shlokas |
| **Humility** | Abstain when retrieval is weak; out-of-scope refusals |
| **Clarity** | Label AI practical tips vs scripture meaning |
| **Non-harm** | Not a substitute for mental-health crisis care or medical advice |
| **Respect** | Treat tradition seriously; avoid trivializing verses for clicks |
| **Privacy** | Chat + feedback may contain sensitive feelings—protect DB/keys |
| **Transparency** | Docs + `RAG_NOTES.md` explain how answers are made |
| **Bias / limits** | Translations and commentaries are human; embeddings inherit that framing |
| **Consent** | Don’t scrape private data; use licensed / project datasets |

**Better practices to keep improving**

- Always show primary citation.  
- Prefer abstaining over a wrong confident verse.  
- Keep crisis resources out-of-band if users express self-harm (product policy).  
- Rotate API keys; never commit `.env`.  
- Evaluate with a fixed question set before big prompt changes.

---

## 15. Glossary

| Term | Meaning |
|------|---------|
| **RAG** | Retrieve evidence, then generate an answer |
| **Embedding** | Numeric meaning vector for text |
| **Vector DB** | Database optimized for nearest-neighbor search |
| **Cosine similarity** | Score of how aligned two vectors are |
| **Chunk** | Piece of text stored as one vector (here: one verse) |
| **Top-k** | Return the k closest matches |
| **Hallucination** | Model invents facts/verses |
| **Provenance** | Trace of which source justified the answer |
| **SSE** | Server-Sent Events — HTTP stream of events to the browser |
| **Re-rank** | Second pass to order candidates better |
| **Guardrail** | Rule that blocks unsafe/off-topic behavior |
| **Abstain** | Refuse to answer when evidence is weak |

---

## 16. Where to read next

| File | Best for |
|------|----------|
| `docs/CORRECTIONS_AND_GUIDANCE_DESIGN.md` | Product corrections (3.25 vs 2.55, answer structure) |
| `RAG_NOTES.md` | Interview-ready notes per feature |
| `lib/vectorStore.js` | Actual RAG implementation |
| `scripts/ingest.js` | How the index is built |
| `eval/retrieval_eval_set.json` | Example evaluation questions |

---

## Tiny mental model (remember this)

1. **Library** of verses → vectors in Pinecone.  
2. **Question** → vector → nearest verses.  
3. **Filter / choose primary** wisely.  
4. **LLM** writes guidance **locked** to that verse.  
5. **Show the source** and separate meaning from tips.  
6. **Measure** with eval + thumbs; **refuse** when unsure.

That’s the whole Upadesh AI RAG story in one page.
