# Upadesh AI — RAG Notes

Interview-ready notes for each RAG improvement. Updated as features land.

**Also read (beginner-friendly):**
- [`docs/BEGINNER_RAG_GUIDE.md`](docs/BEGINNER_RAG_GUIDE.md) — full project + RAG pipeline, services, alternatives, ethics  
- [`docs/CORRECTIONS_AND_GUIDANCE_DESIGN.md`](docs/CORRECTIONS_AND_GUIDANCE_DESIGN.md) — main answer corrections (3.25 vs 2.55, structure, no verse mismatch)

---

## Similarity threshold

**Location:** `lib/vectorStore.js` — `SIMILARITY_THRESHOLD`, `searchSimilarVerses()`, `generateResponse()`; env `SIMILARITY_THRESHOLD` in `.env` / `.env.example`

**Why added:** Pinecone always returns the nearest neighbors, even when none are actually relevant. Without a cutoff, weak matches (e.g. score 0.2) were still re-ranked and fed to the LLM, which then invented guidance from unrelated shlokas.

**How it works:**
1. After the Pinecone `query`, keep only matches with `score >= SIMILARITY_THRESHOLD` (default `0.62`, overridable via env). Tuned from observed bands: on-topic spiritual queries often land ~0.65+; gibberish/off-topic often ~0.55–0.62.
2. If zero matches remain, return `[]` immediately (skip re-rank / LLM).
3. Re-rank only the surviving matches; filter again after re-rank using the same threshold.
4. `generateResponse` also requires `score >= threshold` before building context (defense in depth).

**Theory:** With cosine metric, Pinecone’s `score` is cosine similarity in \([-1, 1]\) (typically near `[0, 1]` for normalized text embeddings). A threshold is a precision/recall knob: higher → fewer false positives (safer answers), lower → more coverage but risk of irrelevant context. Filtering *before* the LLM is cheaper and more reliable than asking the model to ignore bad context.

---

## Low-confidence fallback

**Location:** `lib/vectorStore.js` — `LOW_CONFIDENCE_FALLBACK`, early return in `generateResponse()`; `server/routes/chat.js` — `POST /api/chat/message` when `relevantVerses.length === 0` (JSON + SSE paths)

**Why added:** Previously empty/weak retrieval either threw `"No sufficiently relevant verses found"` (500) or still forced generation. Users got errors or confident-sounding wrong advice.

**How it works:**
1. If `searchSimilarVerses` returns `[]` (nothing cleared the threshold), the chat route does **not** call the LLM.
2. It returns a fixed graceful message (`lowConfidenceFallback`) with `lowConfidence: true`, `shloka: null`, `relevantVerses: []`.
3. Same message is streamed as a single SSE chunk when `stream: true`.
4. `generateResponse` returns the same fallback object if its input list is empty after filtering (safety net).

**Theory:** Retrieval confidence and generation confidence are different. When max similarity is below threshold, the system is in an **abstain** regime: better to refuse than to ground the answer in noise (reduces hallucination). This is classic RAG “answer only if evidence exists” / selective answering.

---

## Show retrieved source in the response

**Location:** `lib/verseLookup.js` — `enrichVerseSource` / `enrichSearchResults`; `lib/vectorStore.js` — `searchSimilarVerses()`, `generateResponse()` (`sources`); `server/routes/chat.js` — `toSourcesPayload`, JSON + SSE payloads; `server/models/Chat.js` — `sources` on messages; `components/ShlokaCard.tsx`, `MessageBubble.tsx`, `ChatInterface.tsx`

**Why added:** The UI expected `chapter` / `verse` / Sanskrit, but Pinecone metadata only stored a global `verseNumber` plus translation text. Users could not see *which* shloka grounded the answer (no provenance).

**How it works:**
1. At retrieval time, each match is enriched from `data/verse.json` (id → `chapter`, in-chapter `verse`, `reference` like `Bhagavad Gita 2.47`, Sanskrit, transliteration).
2. API returns `shloka` (primary source) and `sources` (all retrieved citations + scores).
3. Both are persisted on the assistant message in MongoDB and shown in the UI (“Informed by …”, source card, expandable “Also retrieved”).

**Theory:** Provenance / citation is a core RAG trust requirement: the answer should be attributable to retrieved evidence. Separating **display metadata** (chapter.verse from a local catalog) from **vector metadata** (embedding payload in Pinecone) avoids a full re-ingest while still exposing human-readable references.

---

## Chunking granularity (per-verse)

**Location:** `scripts/ingest.js` (file-level comment + grouping by `verse_id`); `lib/vectorStore.js` — `upsertVerse()`

**Why added:** Interviewers and future maintainers need an explicit answer to “why not 512-token windows / multi-verse chunks?” The choice was implicit in code but undocumented.

**How it works:**
1. Ingest groups `translation.json` rows by `verse_id` → exactly one document per shloka (~701 vectors).
2. The embedded string is that verse’s primary translation + meaning + concatenated English commentaries — still bound to one `verse_id`.
3. Pinecone ids are `verse-{id}` (1:1 with the Gita verse catalog used for citations).

**Theory:** Chunk size is a precision–context trade-off. **Per-verse** chunks maximize citation fidelity and keep each embedding thematically pure; **larger chunks** improve recall for multi-verse arguments but blur provenance and can mix unrelated teachings. For a scripture corpus where the natural atomic unit *is* the shloka, per-verse chunking is the default RAG design unless evaluation shows systematic misses that adjacent-verse windows would fix.

---

## Retrieval evaluation set & hit-rate script

**Location:** `eval/retrieval_eval_set.json` (18 labeled queries); `scripts/eval-retrieval.js`; npm scripts `eval:retrieval` / `eval:retrieval:full`; `lib/vectorStore.js` — `searchSimilarVerses(query, topK, options)`

**Why added:** Without labeled queries you cannot measure whether threshold/chunking/rewriting changes help or hurt. Hit-rate makes retrieval quality observable.

**How it works:**
1. Each case has a natural-language `query` and one or more `expectedReferences` (`Bhagavad Gita C.V`).
2. Script runs retrieval for each query (`topK` default 5).
3. **Hit** if any expected reference appears in the top-k result `reference` fields.
4. Prints per-case HIT/MISS and overall hit-rate `%`; writes `eval/last_retrieval_report.json`.
5. Default **fast** mode skips LLM expand/rerank (embedding + keyword enhance only). `--full` matches production expand+rerank. Eval sets `applyThreshold: false` so neighbors below the chat cutoff still count for ranking quality.

**Theory:** Hit-rate (recall@k for a multi-label expected set) is a standard IR metric: it answers “does the right evidence appear in the candidate set the LLM will see?” Separating fast vs full isolates **index/embedding quality** from **LLM expand/rerank** effects.

---

## Query rewriting

**Location:** `lib/vectorStore.js` — `rewriteQuery()`, first step inside `searchSimilarVerses()`; eval flag `--rewrite` / `npm run eval:retrieval:rewrite`

**Why added:** Users type vague affect (“I feel lost in life”), while verse embeddings were built from formal translations (duty, equanimity, fruits of action). Embedding the raw utterance often misses the right shloka; rewrite closes that vocabulary gap *before* the vector search.

**How it works:**
1. Before embedding, a dedicated rewrite model (`GROQ_REWRITE_MODEL`, default `allam-2-7b`) turns the raw message into **one** short retrieval-friendly query (JSON `{"rewritten":"..."}`).
2. Invalid/CoT outputs are rejected; a small heuristic map covers common affects (lost, fear, anger, …).
3. The **original + rewritten** text are both included in the string that gets embedded (rewrite adds Gita vocabulary; original preserves user terms).
4. Optional `expandQuery` still runs afterward for multi-query themes.
5. Eval: `npm run eval:retrieval:rewrite` isolates rewrite; production always rewrites unless `skipRewrite: true`.

**Theory:** Query rewriting / HyDE-style reformulation moves the query embedding closer to the document embedding space. Emotional slang and the scripture’s lexical distribution are different manifolds; a constrained rewrite is a cheap cross-domain bridge. Concatenating original+rewrite avoids **query drift** (rewrite-only: 56% hit-rate; original+rewrite: **88.9%** vs fast baseline **72.2%** on our 18-query set).

---

## Streaming responses (SSE)

**Location:** `server/routes/chat.js` — `POST /api/chat/message` with `stream: true`; `lib/vectorStore.js` — `generateResponse(..., stream=true)` Groq token stream; `components/ChatInterface.tsx` — `fetch` + `ReadableStream` SSE parser; `components/MessageBubble.tsx` — streaming caret

**Why added:** Non-streaming waits for the full LLM completion (plus retrieval), so the UI felt stuck on a spinner. Token streaming shows progress as soon as generation starts.

**How it works:**
1. Client sends `{ stream: true }` and reads `response.body` with `getReader()`.
2. Server sets `Content-Type: text/event-stream`, disables buffering (`X-Accel-Buffering: no`), and emits events: `start` (sessionId, shloka, sources) → many `chunk` `{ text }` → `end` (or `error`).
3. Groq `stream: true` completions are normalized to `{ text() }` chunks and forwarded as SSE `data: {...}\n\n` frames.
4. UI inserts an empty assistant message on send, appends each chunk live, then clears `isStreaming` on `end`. Low-confidence fallback still streams as a single chunk.
5. JSON mode (`stream` omitted/false) remains available for scripts/tests.
6. Chat generation uses `GROQ_MODEL=allam-2-7b` because `openai/gpt-oss-20b` streams mostly `reasoning` deltas and can emit **zero** `content` tokens under long prompts (SSE would hang with no chunks).

**Theory:** SSE is a unidirectional HTTP stream of named events over a long-lived response. Unlike waiting for one JSON body, time-to-first-token (TTFT) dominates perceived latency; retrieval still blocks before `start`, but generation no longer blocks the whole reply.

---

## Feedback logging (thumbs up/down)

**Location:** `server/models/Feedback.js`; `server/routes/feedback.js` — `POST /api/chat/feedback`; `server/models/Chat.js` — `messageId` + `feedback` on messages; `server/routes/chat.js` — assigns `messageId` (SSE `start`/`end` + JSON); `components/MessageBubble.tsx` — thumbs controls; `logs/feedback.jsonl`

**Why added:** Without labeled quality signal you cannot tell if retrieval/generation changes help users. Thumbs capture pairwise preference on real traffic (query + sources + answer).

**How it works:**
1. Each assistant reply gets a `messageId` (UUID) stored on the chat message and returned to the client.
2. UI shows 👍 / 👎 after streaming completes; one rating per message.
3. `POST /api/chat/feedback` with `{ messageId, sessionId, rating: 1|-1, query, response, sources }` writes a MongoDB `Feedback` document **and** appends one JSON line to `logs/feedback.jsonl`.
4. Best-effort update of `messages.$.feedback` on the Chat document for history UI.

**Theory:** Explicit feedback is a weak but actionable supervised signal for RAG eval (precision of sources, answer helpfulness). Dual sink (DB + JSONL) keeps analysis easy offline without depending on Mongo exports.

---

## Out-of-scope guardrail

**Location:** `lib/vectorStore.js` — `classifyScope()`, `OUT_OF_SCOPE_MESSAGE`, `OFF_TOPIC_PATTERNS`; `server/routes/chat.js` — runs **before** `searchSimilarVerses`

**Why added:** Off-topic queries (trivia, code, prices) still retrieved vaguely related verses and produced forced spiritual answers. Scope filtering is cheaper and clearer than relying only on similarity abstention.

**How it works:**
1. Heuristic deny list for obvious off-topic (crypto, sports scores, “write code”, “capital of”, recipes…).
2. Heuristic allow for short life/emotion phrases (`feel`, `anxious`, `duty`…).
3. Otherwise a small LLM classifier returns `{"inScope":bool,"reason":"..."}` (rewrite model).
4. If out of scope: skip Pinecone + generation; return a fixed redirect message (`outOfScope: true` in JSON/SSE).
5. Classifier failure **fails open** (allow retrieval); similarity threshold still abstains on weak matches.

**Theory:** Guardrails separate **intent routing** from **retrieval confidence**. Scope is a policy decision (“should we answer?”); cosine threshold is an evidence decision (“do we have support?”). Doing scope first saves embed/LLM cost and prevents category errors where nearest neighbors exist but the domain is wrong.

---

## Answer grounding (verse ↔ source alignment)

**Location:** `lib/vectorStore.js` — `_detectGuidanceIntent()`, `_pickPrimaryAndSupporting()`, `generateResponse()`; UI labels in `ShlokaCard.tsx` / `MessageBubble.tsx`

**Why added:** The model sometimes explained one verse (e.g. 2.55) while the UI “source” card showed another (e.g. 3.25). That breaks trust and confuses scripture with application.

**How it works:**
1. Intent: `decision_action` (what should I do?) vs `mind_control` (steady mind/desires) vs `general`.
2. From retrieved candidates only, prefer teaching verses when present — decision → 3.25 / 2.47…; mind → 2.55 / 2.68…; else highest score. Never invent a verse not retrieved.
3. Prompt **locks** the answer body to the PRIMARY reference; supporting verses are listed for the model as context but must not be cited in the answer.
4. Response sections: Your situation → Verse — C.V → Simple meaning → Practical guidance (modern application) → A question to sit with.
5. API `sources[]` includes `role: primary|supporting`; UI labels them accordingly.

**Theory:** Grounding requires the generator to be constrained by a **single chosen evidence document**, not free to remix the top-k. Separating **meaning** (scripture) from **application** (LLM advice) is an attribution / UX pattern so users know what is text vs coaching.
