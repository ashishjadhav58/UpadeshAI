const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const { enrichSearchResults, enrichVerseSource } = require('./verseLookup');

const GROQ_CHAT_MODEL = process.env.GROQ_MODEL || 'allam-2-7b';

/** Minimum Pinecone cosine similarity (0–1) for a match to enter LLM context.
 * Tuned from observed score bands: on-topic ~0.65+, off-topic/gibberish ~0.55–0.62.
 */
const SIMILARITY_THRESHOLD = Number(process.env.SIMILARITY_THRESHOLD || 0.62);

/** Returned when no retrieved verse clears SIMILARITY_THRESHOLD. */
const LOW_CONFIDENCE_FALLBACK =
  "I don't have clear guidance on that from the verses I know — try rephrasing your question, or ask about a specific feeling (fear, duty, anger, purpose).";

/** Returned when the query is unrelated to spiritual / life guidance. */
const OUT_OF_SCOPE_MESSAGE =
  "I'm here for spiritual and life guidance inspired by the Bhagavad Gita — things like purpose, duty, fear, anger, relationships, and inner peace. That question is outside what I can help with. If something in your life feels heavy or unclear, ask me about that instead.";

/** High-precision off-topic cues (skip LLM when these match). */
const OFF_TOPIC_PATTERNS = [
  /\b(bitcoin|ethereum|crypto|stock price|nba|football score|weather forecast)\b/i,
  /\b(write (me )?(a |some )?code|debug|typescript|python script|sql query)\b/i,
  /\b(capital of|who won|latest news|movie showtimes)\b/i,
  /\b(recipe for|how (do|to) (bake|cook|install windows))\b/i,
];

class VectorStore {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.genAI = null;
    this.groq = null;
    this.initialized = false;
    this.similarityThreshold = SIMILARITY_THRESHOLD;
    this.lowConfidenceFallback = LOW_CONFIDENCE_FALLBACK;
    this.outOfScopeMessage = OUT_OF_SCOPE_MESSAGE;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Validate environment variables
      if (!process.env.PINECONE_API_KEY) {
        throw new Error('PINECONE_API_KEY environment variable is required');
      }
      if (!process.env.PINECONE_INDEX_NAME) {
        throw new Error('PINECONE_INDEX_NAME environment variable is required');
      }
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required for embeddings');
      }
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY environment variable is required');
      }

      // Ensure index name is a string
      const indexName = String(process.env.PINECONE_INDEX_NAME).trim();
      console.log('Initializing Pinecone with index:', indexName);

      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      this.index = this.pinecone.index(indexName);

      // Gemini: embeddings only (Groq has no embedding models)
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      // Groq: chat / query expansion / re-ranking
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });

      this.initialized = true;
      console.log('✅ Vector store initialized (Gemini embeddings + Groq chat)');
    } catch (error) {
      console.error('❌ Vector store initialization error:', error.message);
      throw error;
    }
  }

  async _chatCompletion(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 800,
      stream = false,
      model = GROQ_CHAT_MODEL,
    } = options;

    return this.groq.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_completion_tokens: maxTokens,
      stream,
    });
  }

  _extractMessageText(message) {
    if (!message) return '';
    // Some Groq models (e.g. gpt-oss) put text in reasoning when content is empty
    return (message.content || message.reasoning || '').trim();
  }

  async generateEmbedding(text) {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
      const result = await model.embedContent({
        content: { parts: [{ text: text }] },
        taskType: 'RETRIEVAL_DOCUMENT'
      });
      // Slice to 1024 dimensions to match the Pinecone index
      return result.embedding.values.slice(0, 1024);
    } catch (error) {
      console.error('Error generating embedding:', error.message);
      throw error;
    }
  }

  /**
   * Upsert one RAG chunk = one shloka.
   * Embedded text concatenates translation + meaning + multi-author explanation
   * for that single verse_id only (see scripts/ingest.js chunking rationale).
   * We deliberately do not merge adjacent verses into one vector.
   */
  async upsertVerse(verse) {
    if (!this.initialized) await this.initialize();

    try {
      // Single-verse chunk payload (not a multi-verse window)
      const combinedText = `${verse.translation || ''} ${verse.meaning || ''} ${verse.explanation || ''}`;
      const embedding = await this.generateEmbedding(combinedText);

      await this.index.upsert([
        {
          id: `verse-${verse.id}`, // 1:1 mapping: Pinecone id ↔ shloka id
          values: embedding,
          metadata: {
            id: verse.id,
            verseNumber: verse.verseNumber || verse.id,
            translation: verse.translation || '',
            meaning: verse.meaning || '',
            explanation: verse.explanation ? verse.explanation.substring(0, 40000) : '',
          },
        },
      ]);

      return true;
    } catch (error) {
      console.error('Error upserting verse:', error.message);
      throw error;
    }
  }

  /**
   * Scope guardrail: is this a spiritual / life-guidance question?
   * Runs BEFORE retrieval so off-topic queries never hit Pinecone/LLM generation.
   * @returns {{ inScope: boolean, reason: string, source: 'heuristic'|'llm'|'default' }}
   */
  async classifyScope(userInput) {
    const text = String(userInput || '').trim();
    if (!text) {
      return { inScope: false, reason: 'empty', source: 'heuristic' };
    }

    if (OFF_TOPIC_PATTERNS.some((re) => re.test(text))) {
      return { inScope: false, reason: 'matched_off_topic_pattern', source: 'heuristic' };
    }

    // Short emotional / life phrases are almost always in-scope
    if (
      text.length < 120 &&
      /\b(feel|feeling|anxious|afraid|angry|lost|purpose|duty|grief|peace|stress|relationship|fail)\b/i.test(
        text
      )
    ) {
      return { inScope: true, reason: 'life_emotion_keywords', source: 'heuristic' };
    }

    try {
      const prompt = `You classify questions for a Bhagavad Gita spiritual guidance chatbot.

IN SCOPE: life struggles, emotions, ethics, purpose, duty, relationships, fear, anger, grief, peace, self-discipline, meaning, dharma, spirituality.
OUT OF SCOPE: trivia, coding help, sports, finance prices, recipes, news, pure factual homework with no personal/life angle.

Return ONLY JSON: {"inScope":true|false,"reason":"short"}

User message: ${JSON.stringify(text)}`;

      const completion = await this._chatCompletion(prompt, {
        temperature: 0,
        maxTokens: 60,
        model: process.env.GROQ_REWRITE_MODEL || 'allam-2-7b',
      });
      const raw = this._extractMessageText(completion.choices[0]?.message);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          inScope: Boolean(parsed.inScope),
          reason: String(parsed.reason || 'llm'),
          source: 'llm',
        };
      }
    } catch (error) {
      console.error('Scope classification error:', error.message);
    }

    // Fail open: allow retrieval if classifier fails (similarity threshold still protects)
    return { inScope: true, reason: 'classifier_fallback_allow', source: 'default' };
  }

  /**
   * Reformulate a vague / emotional user utterance into one retrieval-friendly
   * search string *before* embedding. Distinct from expandQuery (which emits
   * multiple alternate queries + themes).
   */
  async rewriteQuery(userInput) {
    try {
      const prompt = `You rewrite search queries for a Bhagavad Gita verse index.

Task: turn the user message into ONE short retrieval query (max 25 words).
Use Gita-aligned themes when relevant: duty, action without fruits, equanimity, mind, fear, anger, desire, detachment, grief, eternal soul, dharma, peace, purpose.
Do not answer the user. Do not mention verse numbers. Do not explain your reasoning.

Return ONLY valid JSON: {"rewritten":"..."}

Examples:
User: "I feel lost in life"
JSON: {"rewritten":"seeking purpose and guidance when confused about one's duty in life"}

User: "I obsess over promotions at work"
JSON: {"rewritten":"performing duty without attachment to results or rewards of work"}

User message: ${JSON.stringify(userInput)}`;

      const completion = await this._chatCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 80,
        // Small instruction-following model — gpt-oss often emits chain-of-thought instead of JSON
        model: process.env.GROQ_REWRITE_MODEL || 'allam-2-7b',
      });
      const raw = this._extractMessageText(completion.choices[0]?.message);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      let rewritten = '';
      if (jsonMatch) {
        try {
          rewritten = String(JSON.parse(jsonMatch[0]).rewritten || '').trim();
        } catch {
          rewritten = '';
        }
      }

      if (!this._isValidRewrittenQuery(rewritten, userInput)) {
        console.warn('Query rewrite rejected; using heuristic/original. Raw:', raw.slice(0, 160));
        return this._heuristicRewrite(userInput);
      }
      return rewritten;
    } catch (error) {
      console.error('Query rewrite error:', error.message);
      return this._heuristicRewrite(userInput);
    }
  }

  _isValidRewrittenQuery(rewritten, original) {
    if (!rewritten || rewritten.length < 8 || rewritten.length > 220) return false;
    const lower = rewritten.toLowerCase();
    const banned = [
      'we need to',
      'i need to',
      'rules:',
      'return only',
      'json',
      'user message',
      'rewritten query',
      'do not',
      "here's",
      'the user says',
    ];
    if (banned.some((b) => lower.includes(b))) return false;
    // Must look like a query, not a full essay
    if ((rewritten.match(/\./g) || []).length > 2) return false;
    if (rewritten === original) return true;
    return true;
  }

  /** Deterministic fallback when the LLM rewrite is unusable. */
  _heuristicRewrite(userInput) {
    const q = userInput.toLowerCase();
    const rules = [
      [/lost|no purpose|directionless/, 'seeking purpose and guidance when confused about one\'s duty in life'],
      [/promot|obsess.*result|only care.*outcome/, 'performing duty without attachment to results or rewards of work'],
      [/fail(ure|ing)?|not good enough/, 'overcoming failure and self-doubt through disciplined action and duty'],
      [/anxious|anxiety|nervous|presentation/, 'calming fear and bodily anxiety before a difficult duty'],
      [/angry|anger|rage/, 'controlling anger arising from desire and attachment'],
      [/grief|died|death|mourn/, 'finding peace in grief through teaching on the eternal soul'],
      [/peace|restless mind|cannot meditat/, 'stilling a restless mind to find lasting peace'],
      [/cling|attach|cannot let go/, 'releasing attachment to people and outcomes'],
      [/fear|afraid|what might go wrong/, 'freedom from fear and clarity of judgment'],
      [/decid|decision|what should i (do|choose)|dilemma/, 'performing right action and duty without attachment to results'],
      [/mind|impuls|desire|tempt|craving/, 'steadying the mind and withdrawing from impulsive desires'],
    ];
    for (const [re, rewritten] of rules) {
      if (re.test(q)) return rewritten;
    }
    return userInput;
  }

  async expandQuery(userInput) {
    // Phase 1b: Query Understanding - Expand user intent for better retrieval
    try {
      const prompt = `Analyze this user's spiritual/life question and extract themes and search queries.

User input: "${userInput}"

Return ONLY a JSON object (no markdown, no explanation):
{
  "themes": ["theme1", "theme2", "theme3"],
  "queries": ["query1", "query2", "query3"]
}

Themes: Core concepts (duty, karma, detachment, fear, anger, purpose, etc.)
Queries: 3 different ways to search for relevant Bhagavad Gita verses

Example:
Input: "I feel like a failure"
Output: {"themes": ["failure", "self-doubt", "duty", "perseverance"], "queries": ["dealing with failure in life", "overcoming self doubt", "karma and effort without results"]}`;

      const completion = await this._chatCompletion(prompt, {
        temperature: 0.3,
        maxTokens: 400,
      });
      const responseText = this._extractMessageText(completion.choices[0]?.message);
      
      // Extract JSON from response (remove markdown if present)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback if parsing fails
      return {
        themes: [],
        queries: [userInput]
      };
    } catch (error) {
      console.error('Query expansion error:', error.message);
      return {
        themes: [],
        queries: [userInput]
      };
    }
  }

  async searchSimilarVerses(query, topK = 5, options = {}) {
    if (!this.initialized) await this.initialize();

    const {
      skipRewrite = false,
      skipExpansion = false,
      skipRerank = false,
      applyThreshold = true,
    } = options;

    try {
      // Phase 0: Rewrite vague raw input into a retrieval-friendly query
      let workingQuery = query;
      if (!skipRewrite) {
        workingQuery = await this.rewriteQuery(query);
        console.log('Query rewrite:', { original: query, rewritten: workingQuery });
      }

      let combinedQuery = workingQuery;

      if (!skipExpansion) {
        // Phase 1: Expand rewritten query into themes + alternate phrasings
        const expansion = await this.expandQuery(workingQuery);
        console.log('Query expansion:', expansion);

        // Enhance with keyword boosts (on rewritten + original wording)
        const enhancedQuery = this._enhanceSearchQuery(
          `${query} ${workingQuery}`
        );

        // Keep original utterance so rewrite adds vocabulary without losing user terms
        combinedQuery = `${query} ${enhancedQuery} ${expansion.queries.join(' ')} ${expansion.themes.join(' ')}`;
      } else {
        const enhancedQuery = this._enhanceSearchQuery(
          `${query} ${workingQuery}`
        );
        combinedQuery = skipRewrite
          ? enhancedQuery
          : `${query} ${enhancedQuery}`;
      }

      let queryEmbedding = await this.generateEmbedding(combinedQuery);

      // Ensure we're querying with exactly 1024 dimensions
      if (queryEmbedding.length > 1024) {
        queryEmbedding = queryEmbedding.slice(0, 1024);
      }

      const retrieveK = skipRerank ? topK : topK * 4;

      // Phase 2: Retrieve candidates (4x topK when re-ranking)
      const results = await this.index.query({
        vector: queryEmbedding,
        topK: retrieveK,
        includeMetadata: true,
      });

      let candidates = results.matches || [];

      // Phase 2b: Drop weak cosine matches (can disable for eval diagnostics)
      if (applyThreshold) {
        candidates = candidates.filter(
          (m) => typeof m.score === 'number' && m.score >= this.similarityThreshold
        );

        console.log(
          `Similarity filter: ${candidates.length}/${(results.matches || []).length} ` +
            `matches >= ${this.similarityThreshold}`
        );
      }

      if (candidates.length === 0) {
        return [];
      }

      // Phase 3: Re-rank only confident matches using LLM (optional)
      let ranked = candidates;
      if (!skipRerank) {
        ranked = await this._rerankResults(
          query,
          candidates,
          Math.min(topK, candidates.length)
        );
      } else {
        ranked = candidates.slice(0, topK);
      }

      // Phase 3b: Keep threshold after re-rank (scores are still Pinecone cosine)
      const mapped = ranked
        .filter((m) => !applyThreshold || m.score >= this.similarityThreshold)
        .map((match) => ({
          score: match.score,
          verse: {
            id: match.metadata.id,
            verseNumber: match.metadata.verseNumber,
            translation: match.metadata.translation,
            meaning: match.metadata.meaning,
            explanation: match.metadata.explanation,
          },
        }));

      // Attach chapter.verse citations for UI / provenance
      return enrichSearchResults(mapped);
    } catch (error) {
      console.error('Error searching verses:', error.message);
      throw error;
    }
  }

  _enhanceSearchQuery(query) {
    // Add contextual keywords to improve semantic matching
    const keywords = {
      'promotion': 'duty work karma action results detachment',
      'depressed': 'sorrow grief peace mind equanimity',
      'anxiety': 'fear worry mind control peace calm steadiness equanimity senses',
      'anxious': 'fear worry mind control peace calm steadiness equanimity senses',
      'presentation': 'fear worry performance duty action detachment',
      'sleep': 'peace calm mind worry rest',
      'fail': 'fear success duty effort detachment results',
      'failure': 'fear success duty effort detachment results',
      'angry': 'anger rage control mind peace',
      'lost': 'purpose dharma path direction meaning',
      'confused': 'clarity wisdom knowledge understanding',
      'stress': 'peace calm mind control equanimity',
      'family': 'duty relationships dharma respect',
      'parents': 'duty respect elders dharma',
      'career': 'work duty karma action purpose',
      'judge': 'opinion others detachment self-worth equanimity',
      'judgment': 'opinion others detachment self-worth equanimity',
      'decision': 'duty action without attachment to results wise action',
      'decide': 'duty action without attachment to results wise action',
      'choice': 'duty dharma right action without attachment',
      'confused about': 'clarity duty path guidance',
    };

    let enhanced = query.toLowerCase();
    for (const [key, value] of Object.entries(keywords)) {
      if (enhanced.includes(key)) {
        enhanced += ' ' + value;
      }
    }

    return enhanced;
  }

  async _rerankResults(userQuery, matches, topK) {
    // Phase 3: LLM-based re-ranking for better accuracy
    if (matches.length <= topK) {
      return matches;
    }

    try {
      // Prepare verses for re-ranking
      const versesForRanking = matches.slice(0, Math.min(20, matches.length)).map((m, i) => ({
        index: i,
        verseNumber: m.metadata.verseNumber,
        translation: m.metadata.translation.substring(0, 150),
        meaning: m.metadata.meaning.substring(0, 150),
        score: m.score
      }));

      const prompt = `User's situation: "${userQuery}"

Rank these Bhagavad Gita verses by relevance to the user's situation.
Return ONLY a JSON array of verse numbers in order of relevance (most relevant first).

Verses:
${versesForRanking.map(v => `Verse ${v.verseNumber}: ${v.translation}...`).join('\n')}

Return format: [verseNumber1, verseNumber2, verseNumber3, ...]
Return ONLY the JSON array, no explanation.`;

      const completion = await this._chatCompletion(prompt, {
        temperature: 0.2,
        maxTokens: 300,
      });
      const responseText = this._extractMessageText(completion.choices[0]?.message);
      
      // Extract JSON array
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const rankedVerseNumbers = JSON.parse(jsonMatch[0]);
        
        // Reorder matches based on LLM ranking
        const reordered = [];
        rankedVerseNumbers.slice(0, topK).forEach(verseNum => {
          const match = matches.find(m => m.metadata.verseNumber === verseNum);
          if (match) reordered.push(match);
        });
        
        // Fill remaining slots with original order if needed
        matches.forEach(m => {
          if (reordered.length < topK && !reordered.includes(m)) {
            reordered.push(m);
          }
        });
        
        return reordered.slice(0, topK);
      }
    } catch (error) {
      console.error('Re-ranking error:', error.message);
    }
    
    // Fallback to original order
    return matches.slice(0, topK);
  }

  /**
   * Decide whether the user needs action-without-attachment guidance
   * vs mind/desire steadiness (affects primary verse selection).
   */
  _detectGuidanceIntent(userMessage) {
    const q = String(userMessage || '').toLowerCase();
    const decisionHints =
      /\b(decid|decision|choose|choice|what should i do|should i|dilemma|option|career|job|promot|act|action|duty|responsib)/i;
    const mindHints =
      /\b(mind|desire|impuls|tempt|craving|meditat|focus|distract|withdraw|senses|obsess|overthink|control myself)/i;

    const decision = decisionHints.test(q);
    const mind = mindHints.test(q);
    if (decision && !mind) return 'decision_action';
    if (mind && !decision) return 'mind_control';
    if (decision && mind) {
      // "control my mind / impulsive desires" outweighs a casual "when deciding"
      if (/\b(control (my )?mind|impuls|tempt|craving|senses|withdraw)\b/i.test(q)) {
        return 'mind_control';
      }
      return 'decision_action';
    }
    return 'general';
  }

  /**
   * Prefer known teaching verses when they appear in the retrieved set;
   * otherwise keep highest cosine score. Never invent a verse not retrieved.
   */
  _pickPrimaryAndSupporting(intent, verses) {
    const preferredByIntent = {
      decision_action: ['3.25', '2.47', '3.19', '18.47', '3.8'],
      mind_control: ['2.55', '2.68', '6.26', '6.5', '2.58'],
      general: [],
    };

    const preferred = preferredByIntent[intent] || [];
    const byRef = (v) => {
      const ref = v.verse?.reference || '';
      const m = ref.match(/(\d+)\.(\d+)/);
      return m ? `${m[1]}.${m[2]}` : '';
    };

    let primary = verses[0];
    for (const key of preferred) {
      const hit = verses.find((v) => byRef(v) === key);
      if (hit) {
        primary = hit;
        break;
      }
    }

    const supporting = verses.filter((v) => v !== primary);
    if (intent === 'decision_action') {
      supporting.sort((a, b) => {
        const aMind = ['2.55', '2.68'].includes(byRef(a)) ? 1 : 0;
        const bMind = ['2.55', '2.68'].includes(byRef(b)) ? 1 : 0;
        return bMind - aMind || b.score - a.score;
      });
    }

    return { primary, supporting };
  }

  /** Pinecone ids for core teaching verses we may inject by intent. */
  _preferredVerseIds(intent) {
    // id map: chapter.verse → catalog id (data/verse.json)
    const map = {
      decision_action: [144, 94, 138], // 3.25, 2.47, 3.19
      mind_control: [102, 115, 259], // 2.55, 2.68, 6.26
    };
    return map[intent] || [];
  }

  /**
   * Ensure key teaching verses are available for selection even if they
   * narrowly missed top-k (fetch by id from Pinecone + enrich citations).
   */
  async _injectPreferredVerses(intent, candidates) {
    const ids = this._preferredVerseIds(intent);
    if (!ids.length) return candidates;

    try {
      const pineconeIds = ids.map((id) => `verse-${id}`);
      const fetched = await this.index.fetch(pineconeIds);
      const records = fetched.records || fetched.vectors || {};
      const existingIds = new Set(candidates.map((c) => Number(c.verse.id)));
      const floor = Math.max(
        this.similarityThreshold,
        candidates[0]?.score ? candidates[0].score - 0.05 : this.similarityThreshold
      );

      const extras = [];
      for (const id of ids) {
        if (existingIds.has(id)) continue;
        const rec = records[`verse-${id}`];
        if (!rec?.metadata) continue;
        extras.push({
          score: floor,
          verse: {
            id: rec.metadata.id ?? id,
            verseNumber: rec.metadata.verseNumber ?? id,
            translation: rec.metadata.translation || '',
            meaning: rec.metadata.meaning || '',
            explanation: rec.metadata.explanation || '',
          },
        });
      }

      if (!extras.length) return candidates;
      return enrichSearchResults([...extras, ...candidates]);
    } catch (err) {
      console.error('Preferred verse inject error:', err.message);
      return candidates;
    }
  }

  async generateResponse(userMessage, relevantVerses, stream = false) {
    if (!this.initialized) await this.initialize();

    try {
      const hasHindi = /[\u0900-\u097F]/.test(userMessage);
      const hasMarathi = /[\u0900-\u097F]/.test(userMessage);

      let languageInstruction = '';
      if (hasHindi || hasMarathi) {
        languageInstruction =
          '\n\nCRITICAL: User wrote in Hindi/Marathi. You MUST respond in the SAME language. Only the verse translation stays in English.';
      }

      const queryLower = userMessage.toLowerCase();
      let filteredVerses = relevantVerses;

      if (
        queryLower.includes('anxious') ||
        queryLower.includes('anxiety') ||
        queryLower.includes('presentation') ||
        queryLower.includes('nervous') ||
        queryLower.includes('scared') ||
        queryLower.includes('afraid')
      ) {
        filteredVerses = relevantVerses.filter((v) => {
          return v.verse.verseNumber < 400 || v.verse.verseNumber > 450;
        });
      }

      const candidatesRaw = filteredVerses
        .filter((v) => v.score >= this.similarityThreshold)
        .slice(0, 5);

      if (candidatesRaw.length === 0) {
        return {
          response: this.lowConfidenceFallback,
          topVerse: null,
          sources: [],
          lowConfidence: true,
          stream: null,
        };
      }

      const intent = this._detectGuidanceIntent(userMessage);
      const candidates = await this._injectPreferredVerses(intent, candidatesRaw);
      const { primary, supporting } = this._pickPrimaryAndSupporting(
        intent,
        candidates
      );
      const topVerses = [primary, ...supporting].slice(0, 3);

      const cleanExplanation = (explanation) => {
        if (!explanation) return '';
        return explanation
          .replace(/Swami [A-Za-z]+:\s*/g, '')
          .replace(/Dr\. [A-Z]\. [A-Za-z]+:\s*/g, '')
          .replace(/Shri [A-Za-z]+\s+Swami:\s*/g, '')
          .substring(0, 300);
      };

      const primaryRef =
        primary.verse.reference || `Verse ${primary.verse.verseNumber}`;

      const systemPrompt = `You are a compassionate spiritual guidance coach grounded in the Bhagavad Gita.

GROUNDING RULES (NON-NEGOTIABLE):
1. Teach ONLY the PRIMARY verse given below. The ONLY verse reference allowed in your answer is that primary reference (e.g. "Bhagavad Gita 3.25").
2. Do NOT mention, quote, paraphrase, or list any other chapter.verse numbers (no "supporting verses" section in the answer).
3. Separate SCRIPTURE meaning from practical application using the headings below.
4. Simple everyday language. No Sanskrit except the primary reference.
5. Under 200 words total.${languageInstruction}

Use EXACTLY these headings and nothing else:
**Your situation**
(one empathetic sentence)

**Verse — ${primaryRef}**
(1–2 sentences: the primary verse translation only)

**Simple meaning**
(1–2 sentences: what THIS verse teaches — scriptural meaning only)

**Practical guidance**
(3–4 short bullets of modern application — clearly advice for today, not scripture)

**A question to sit with**
(one reflective question about motive: right action vs fear/desire)`;

      const userPrompt = `User: "${userMessage}"
Intent: ${intent}

PRIMARY (use only this):
${primaryRef}
Translation: ${primary.verse.translation}
Notes: ${(primary.verse.meaning || '').substring(0, 160)}

Write the structured answer now. Do not mention any verse except ${primaryRef}.`;

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const cleanedTopVerse = enrichVerseSource({
        ...primary.verse,
        explanation: cleanExplanation(primary.verse.explanation),
      });

      const sources = topVerses.map((v, i) => ({
        ...enrichVerseSource(v.verse),
        score: v.score,
        explanation: cleanExplanation(v.verse.explanation),
        role: i === 0 ? 'primary' : 'supporting',
      }));

      console.log('Answer grounding:', {
        intent,
        primary: primaryRef,
        supporting: sources.filter((s) => s.role === 'supporting').map((s) => s.reference),
      });

      if (stream) {
        const responseStream = await this._chatCompletion(fullPrompt, {
          temperature: 0.4,
          maxTokens: 700,
          stream: true,
        });

        async function* normalizedStream() {
          for await (const chunk of responseStream) {
            const delta = chunk.choices?.[0]?.delta || {};
            const text = delta.content || '';
            if (text) {
              yield { text: () => text };
            }
          }
        }

        return {
          stream: normalizedStream(),
          topVerse: cleanedTopVerse,
          sources,
          lowConfidence: false,
        };
      }

      const completion = await this._chatCompletion(fullPrompt, {
        temperature: 0.4,
        maxTokens: 700,
      });
      const responseText = this._extractMessageText(
        completion.choices[0]?.message
      );
      return {
        response: responseText,
        topVerse: cleanedTopVerse,
        sources,
        lowConfidence: false,
      };
    } catch (error) {
      console.error('Error generating response:', error.message);
      throw error;
    }
  }
}

module.exports = new VectorStore();
