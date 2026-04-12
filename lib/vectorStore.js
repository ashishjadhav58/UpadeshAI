const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class VectorStore {
  constructor() {
    this.pinecone = null;
    this.index = null;
    this.genAI = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });

      this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
      
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      this.initialized = true;
      console.log('✅ Vector store initialized with Gemini');
    } catch (error) {
      console.error('❌ Vector store initialization error:', error.message);
      throw error;
    }
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

  async upsertVerse(verse) {
    if (!this.initialized) await this.initialize();

    try {
      const combinedText = `${verse.translation || ''} ${verse.meaning || ''} ${verse.explanation || ''}`;
      const embedding = await this.generateEmbedding(combinedText);

      await this.index.upsert([
        {
          id: `verse-${verse.id}`,
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

  async expandQuery(userInput) {
    // Phase 1: Query Understanding - Expand user intent for better retrieval
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
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

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
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

  async searchSimilarVerses(query, topK = 5) {
    if (!this.initialized) await this.initialize();

    try {
      // Phase 1: Expand query for better understanding
      const expansion = await this.expandQuery(query);
      console.log('Query expansion:', expansion);
      
      // Enhance query with key concepts
      const enhancedQuery = this._enhanceSearchQuery(query);
      
      // Combine original query with expanded queries
      const combinedQuery = `${enhancedQuery} ${expansion.queries.join(' ')} ${expansion.themes.join(' ')}`;
      
      let queryEmbedding = await this.generateEmbedding(combinedQuery);
      
      // Ensure we're querying with exactly 1024 dimensions
      if (queryEmbedding.length > 1024) {
        queryEmbedding = queryEmbedding.slice(0, 1024);
      }

      // Phase 2: Retrieve more results for re-ranking (topK * 4)
      const results = await this.index.query({
        vector: queryEmbedding,
        topK: topK * 4,  // Get 4x results for re-ranking
        includeMetadata: true,
      });

      // Phase 3: Re-rank results using LLM
      const rerankedResults = await this._rerankResults(query, results.matches, topK);
      
      return rerankedResults.map(match => ({
        score: match.score,
        verse: {
          id: match.metadata.id,
          verseNumber: match.metadata.verseNumber,
          translation: match.metadata.translation,
          meaning: match.metadata.meaning,
          explanation: match.metadata.explanation,
        },
      }));
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
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
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

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
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

  async generateResponse(userMessage, relevantVerses, stream = false) {
    if (!this.initialized) await this.initialize();

    try {
      // Detect language from user message
      const hasHindi = /[\u0900-\u097F]/.test(userMessage);
      const hasMarathi = /[\u0900-\u097F]/.test(userMessage); // Marathi uses same Devanagari script
      
      let languageInstruction = '';
      if (hasHindi || hasMarathi) {
        languageInstruction = '\n\nCRITICAL: User wrote in Hindi/Marathi. You MUST respond in the SAME language. Only the verse translation stays in English.';
      }

      // Filter out inappropriate verses based on context
      const queryLower = userMessage.toLowerCase();
      let filteredVerses = relevantVerses;
      
      // For anxiety/fear/presentation queries, exclude Chapter 11 (cosmic form visions)
      if (queryLower.includes('anxious') || queryLower.includes('anxiety') || 
          queryLower.includes('presentation') || queryLower.includes('nervous') ||
          queryLower.includes('scared') || queryLower.includes('afraid')) {
        filteredVerses = relevantVerses.filter(v => {
          // Exclude verses 400-450 (Chapter 11 cosmic form section)
          return v.verse.verseNumber < 400 || v.verse.verseNumber > 450;
        });
      }
      
      // Filter and rank verses - only use top 3 most relevant
      const topVerses = filteredVerses.slice(0, 3).filter(v => v.score > 0.5);
      
      if (topVerses.length === 0) {
        throw new Error('No sufficiently relevant verses found');
      }

      // Clean author names from explanations
      const cleanExplanation = (explanation) => {
        if (!explanation) return '';
        // Remove author names like "Swami Adidevananda:", "Dr. S. Sankaranarayan:", etc.
        return explanation
          .replace(/Swami [A-Za-z]+:\s*/g, '')
          .replace(/Dr\. [A-Z]\. [A-Za-z]+:\s*/g, '')
          .replace(/Shri [A-Za-z]+\s+Swami:\s*/g, '')
          .substring(0, 300);
      };

      const versesContext = topVerses
        .map(
          (v, i) => `
Verse ${i + 1} (Verse ${v.verse.verseNumber}) - Match: ${(v.score * 100).toFixed(0)}%
Translation: ${v.verse.translation}
Meaning: ${v.verse.meaning.substring(0, 200)}...
Context: ${cleanExplanation(v.verse.explanation)}
`
        )
        .join('\n---\n');

      const systemPrompt = `You are a wise, compassionate spiritual guide inspired by the Bhagavad Gita. Help people with practical guidance using simple, clear language.

STRICT RULES:
1. MAXIMUM 200 WORDS total response
2. EXACTLY 3-4 short paragraphs (no more!)
3. Use simple, everyday language - NO Sanskrit terms except verse names
4. Focus on ONE main teaching only
5. Give 1-2 practical actions they can take TODAY${languageInstruction}

Response Structure (MANDATORY):
Paragraph 1: One empathetic sentence acknowledging their feeling
Paragraph 2: Share the MOST relevant verse (choose wisely based on highest match score)
Paragraph 3: Explain how it helps (2-3 sentences max)
Paragraph 4: Give 1-2 practical steps + short encouragement (1 sentence)

CRITICAL: Keep it under 200 words. Like a caring friend giving quick advice over tea.`;

      const userPrompt = `User's situation: "${userMessage}"

Available verses (choose the ONE most relevant based on match score):
${versesContext}

Provide a response in EXACTLY 3-4 paragraphs (MAXIMUM 200 WORDS):
1. One empathetic sentence
2. The BEST matching verse (look at the match scores!)
3. Brief explanation (2-3 sentences)
4. 1-2 practical actions + encouragement

Be conversational, warm, and CONCISE. No fluff.`;

      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          maxOutputTokens: 800,  // Increased to prevent cutoff
          temperature: 0.7,      // Balanced creativity
          topP: 0.9,
          topK: 40,
          stopSequences: [],     // No stop sequences to prevent premature cutoff
        },
      });
      
      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      // Clean the topVerse explanation before returning
      const cleanedTopVerse = {
        ...topVerses[0].verse,
        explanation: cleanExplanation(topVerses[0].verse.explanation),
      };

      if (stream) {
        // Return streaming result
        const result = await model.generateContentStream(fullPrompt);
        return {
          stream: result.stream,
          topVerse: cleanedTopVerse,
        };
      } else {
        // Return complete response
        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();
        return {
          response: responseText,
          topVerse: cleanedTopVerse,
        };
      }
    } catch (error) {
      console.error('Error generating response:', error.message);
      throw error;
    }
  }
}

module.exports = new VectorStore();
