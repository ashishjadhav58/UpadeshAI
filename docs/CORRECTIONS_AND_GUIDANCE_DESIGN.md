# Corrections & Guidance Design Notes

This file records the **main product/content corrections** we agreed on for Upadesh AI answers, and how the system should behave. Use it when reviewing replies or explaining design choices.

---

## 1. The core problem we fixed

There was a **mismatch** between:

- the **verse explained in the AI text**, and  
- the **verse shown as the “source”** in the UI.

**Example of the bug**

- Answer body talked about **Gita 2.55** (“when the senses are withdrawn…”).
- Source card showed **Gita 3.25**.

Those teachings are related, but they are **not the same verse**. Showing one while explaining another breaks trust and confuses users.

**Rule we adopted**

> The verse named in the answer text and the primary source card **must be the same**.

---

## 2. What each verse is good for

| Verse | Best when the user needs… | Practical message |
|-------|---------------------------|-------------------|
| **3.25** | “What should I **do**?” / a good decision / duty vs attachment to results | Act properly, but don’t become attached to the outcome. |
| **2.47** | Similar action theme (karma without clinging to fruits) | Focus on action, not on controlling results. |
| **2.55** | “How do I **steady my mind** / avoid impulsive desire?” | Wisdom-centered mind; senses withdrawn from restless objects. |
| **2.68** | Supporting mind/sense control | Related steadiness of mind. |

### Decision-making (recommended primary)

If the chatbot should guide **making a good decision**, prefer **Bhagavad Gita 3.25** as the main teaching:

> Act properly, but don’t become attached to the outcome.

Useful for decisions because it pushes:

- do your duty / right action intelligently  
- don’t let fear, desire, ego, or obsession with the result control the choice  

### Mind / desire control (recommended primary)

If the question is mainly about **controlling the mind or impulsive desires** while deciding, prefer **2.55** (with **2.68** as supporting), not only 3.25.

**Ideal pairing when both themes appear**

- **Primary:** 3.25 — how to act without attachment  
- **Supporting:** 2.55 / 2.68 — steady / wisdom-centered mind  

Do **not** present 3.25 as the only or exact answer if retrieval also shows strong matches like 2.55 / 2.68 at similar scores—explain **why** the primary was chosen.

---

## 3. AI advice vs scripture meaning

Lines like:

> “today, you can try the following…”

are **AI-generated practical guidance**, not the literal meaning of 3.25.

That is fine for a **guidance chatbot**, but we must **separate**:

1. **Scriptural meaning** — what the verse teaches  
2. **Practical application** — modern coaching derived from that teaching  

Never present application bullets as if they were the verse’s own wording.

---

## 4. Recommended answer structure

Use this order for guidance replies:

### 1) User’s problem
Acknowledge the struggle in one short sentence.  
Example: “I’m confused about what decision to make.”

### 2) Relevant Gita verse
Show the **primary** reference (e.g. **3.25** for action/decision).

### 3) Simple meaning
Plain language, scripture only.  
Example: “Do what is right and necessary, but don’t let attachment to the outcome control your actions.”

### 4) Practical guidance (AI application)
Clear bullets, labeled as guidance for today:

- Identify what is actually in your control.  
- Choose the action that aligns with your responsibility / values.  
- Don’t make the decision purely from fear or desire.  
- Once you’ve acted thoughtfully, don’t obsess over the result.

### 5) One reflective question
Makes it feel like a **guidance** bot, not only a verse-search bot.

Example:

> “Am I choosing this because it is right, or because I am afraid of the result?”

---

## 5. How the code enforces this now

| Mechanism | Purpose |
|-----------|---------|
| Intent detection (`decision_action` vs `mind_control`) | Pick the right *kind* of teaching. |
| Preferred-verse injection (e.g. fetch 3.25 / 2.55 from Pinecone by id) | Ensure key teachings can become primary even if they narrowly miss top-k. |
| Primary lock in the LLM prompt | Answer body may cite **only** the primary reference. |
| `sources[].role = primary \| supporting` | UI shows primary vs supporting clearly. |
| Structured headings in the prompt | Your situation → Verse → Simple meaning → Practical guidance → Question. |

Details of implementation live in `RAG_NOTES.md` under **Answer grounding**.

---

## 6. Short checklist before shipping an answer

- [ ] Primary source card reference == verse named in the answer  
- [ ] Meaning section ≠ copy of “try this today” tips  
- [ ] Practical tips labeled as application  
- [ ] Decision questions lean on **3.25** (when available)  
- [ ] Mind/desire questions lean on **2.55** / **2.68**  
- [ ] Supporting verses listed as supporting, not swapped into the main explanation  

---

## 7. One-line summary

**Use 3.25 for “what should I do?”; use 2.55/2.68 when the core issue is “how do I control my mind and desires?” — and never explain one verse while citing another.**
