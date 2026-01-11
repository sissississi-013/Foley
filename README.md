# Foley - AI-Powered Virtual Sound Studio
<img width="1050" height="600" alt="Beige Elegant Minimalist Nail Art Business Card (1)" src="https://github.com/user-attachments/assets/d166ffff-f85e-4638-9819-0dd107e5ea49" />

Foley is a multi-agent system that automates the traditionally manual process of Foley sound design for video production. By orchestrating specialized AI agents that communicate, delegate tasks, and share context through MongoDB, Foley transforms silent video into professionally sound-designed content in minutes rather than days.

---

## The Problem

Professional Foley work--the art of creating and synchronizing sound effects to video--is one of the most labor-intensive aspects of post-production.

**Current Industry Pain Points:**

- A single minute of film requires 4-8 hours of manual Foley work
- Professional Foley artists charge $500-2,000+ per finished minute
- The global sound design market is valued at $3.2 billion (2024) and growing at 8.4% CAGR
- 90% of video content creators cannot afford professional sound design
- YouTube alone sees 500+ hours of video uploaded per minute, most with subpar audio

The explosion of content creation--from indie filmmakers to corporate video teams to social media creators--has created massive demand for accessible sound design that the traditional Foley workflow cannot scale to meet.

---

## Use Cases

**Independent Filmmakers:** A filmmaker shoots a short film on a $5,000 budget. Traditional Foley would cost more than their entire production. With Foley, they upload their cut and receive broadcast-quality sound design matched to their creative vision (horror, comedy, drama) in under 10 minutes.

**Corporate Video Production:** Marketing teams produce dozens of product videos monthly. Each requires subtle sound design--keyboard clicks, paper shuffling, coffee cups--to feel polished. Foley processes batches overnight, turning rough cuts into client-ready deliverables.

**Game Development Studios:** Indie game developers need hundreds of contextual sound effects. Rather than licensing generic libraries, they generate custom sounds that match their specific art style and automatically cache them for reuse across the project.

**Accessibility and Localization:** When dubbing content for international markets, original Foley tracks are often unusable. Foley regenerates culturally-appropriate sound design synchronized to the new audio timing.

**Documentary Post-Production:** Nature and documentary footage rarely captures clean audio. Foley analyzes the visual content and generates appropriate ambient soundscapes, footsteps, and environmental effects.

---

## How It Works: Multi-Agent Architecture

Foley implements a four-agent collaborative system where each agent has specialized capabilities and communicates findings to peer agents through structured handoffs.

```
[Video Input] --> SPOTTER --> DIRECTOR --> HYBRID ENGINE --> QC REVIEWER --> [Output]
                    |            |              |                |
                    +------------+--------------+----------------+
                                 |
                           [MongoDB Atlas]
                         Context & Asset Store
```

### Agent Roles and Communication

**1. Spotter Agent (Visual Analysis)**
- Analyzes video frame-by-frame using Gemini multimodal capabilities
- Detects up to 20 atomic sound events per video (individual footsteps, not "walking")
- Identifies materials, textures, and physical properties
- Outputs structured event data with precise timestamps
- Communicates to Director: "Sending 12 events for creative direction"

**2. Director Agent (Creative Intelligence)**
- Receives spotted events and user creative direction ("horror", "comedy", "sci-fi")
- Applies theme-specific sound design philosophy
- Generates 3-layer audio plans: Spot (primary), Texture (detail), Vibe (atmosphere)
- Maintains stylistic coherence across all events
- Communicates to Engine: "Sending 12 sound requests with horror treatment"

**3. Hybrid Engine Agent (Sound Production)**
- Queries MongoDB Atlas for semantically similar cached sounds
- Falls back to ElevenLabs generation when cache misses
- Auto-caches generated sounds with embeddings for future retrieval
- Communicates to QC: "12 sounds produced, 3 from cache, 9 generated"

**4. QC Reviewer Agent (Quality Assurance)**
- Reviews all sounds for coherence with theme and visual action
- Scores each sound on match quality and continuity
- Triggers regeneration loop for rejected sounds (max 2 attempts)
- Communicates back to Engine: "2 sounds rejected, requesting regeneration"

### Human-in-the-Loop

After automated QC, users can click any sound to provide manual feedback:
- Quick adjustments: "Make it louder", "More bass", "Less cartoonish"
- Custom direction: Free-form text describing desired changes
- The system regenerates with user context injected into the agent pipeline

---

## Technical Implementation

### Core Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React + TypeScript + Vite | Real-time agent visualization |
| AI Backbone | Google Gemini 2.0 Flash | Video analysis, embeddings, agent reasoning |
| Sound Generation | ElevenLabs Sound Effects API | High-quality audio synthesis |
| Database | MongoDB Atlas | Vector search, context persistence, asset caching |
| Backend | Express.js + Node.js | API routing, MongoDB connection |

### MongoDB Atlas: The Agent Memory System

MongoDB Atlas serves as the shared memory and context store that enables agent collaboration:

**1. Vector Search for Sound Retrieval**
```javascript
$vectorSearch: {
  index: 'vector_index',
  path: 'embedding',
  queryVector: embedding,
  numCandidates: 50,
  limit: 1
}
```
When the Hybrid Engine needs a sound, it first queries MongoDB using Gemini-generated embeddings. A match above 0.7 similarity score returns cached audio instantly, no generation latency, no API cost.

**2. Automatic Asset Caching**
Every generated sound is stored with:
- Text description and original query
- 768-dimensional embedding vector
- Base64-encoded audio data
- Metadata (timestamp, vibe, source)

This creates a self-improving library. The more Foley is used, the faster it becomes as cache hit rates increase.

**3. Context Persistence Across Sessions**
Agent outputs, user feedback, and QC decisions are persisted. When a user returns to a project, the system reconstructs full context without re-analyzing the video.

**4. Text Fallback Search**
When vector search is unavailable, MongoDB text search provides graceful degradation:
```javascript
{ description: { $regex: searchTerms.join('|'), $options: 'i' } }
```

### Why MongoDB for Multi-Agent Systems

Traditional agent architectures lose context between steps. MongoDB solves this by:

- **Shared State:** All agents read/write to the same document store
- **Atomic Updates:** Sound status transitions (detected -> directing -> ready) are consistent
- **Flexible Schema:** Each agent can store different metadata structures
- **Horizontal Scale:** As sound libraries grow to millions of assets, Atlas scales automatically

### NVIDIA Ecosystem Integration
The system leverages GPU-accelerated AI throughout:

**Gemini on NVIDIA Infrastructure:**
- Video frame analysis processes multiple frames in parallel
- Embedding generation for 20+ events completes in seconds
- Agent reasoning chains execute with minimal latency

**ElevenLabs:**
- 3-second audio clips generate in under 2 seconds
- Batch processing of multiple sounds runs concurrently

---

## Project Structure

```
foley/
├── App.tsx                 # Main application, agent orchestration logic
├── types.ts                # TypeScript interfaces for agents and events
├── components/
│   ├── AgentOrchestrator   # Visual agent status display
│   ├── AgentCard           # Individual agent status cards
│   ├── EventList           # Sound event list with edit capability
│   ├── EditSoundModal      # Manual feedback interface
│   ├── Timeline            # Video timeline with event markers
│   └── TerminalLog         # Agent communication log
├── services/
│   ├── geminiService.ts    # Spotter, Director, QC agents
│   └── soundEngine.ts      # Hybrid Engine with MongoDB integration
└── server/
    └── index.js            # Express API for MongoDB operations
```

---

## Running the Project

**Prerequisites:**
- Node.js 18+
- MongoDB Atlas account with cluster
- Google AI API key (Gemini)
- ElevenLabs API key

**Environment Setup:**
```bash
# .env.local
GEMINI_API_KEY=your_gemini_key
ELEVENLABS_API_KEY=your_elevenlabs_key
MONGODB_URI=mongodb+srv://...
```

**Installation:**
```bash
npm install
```

**Start Development:**
```bash
# Terminal 1: Backend API
npm run server

# Terminal 2: Frontend
npm run dev
```

**Access:** http://localhost:3000

---

## Multi-Agent Collaboration in Practice

This project directly addresses the hackathon Multi-Agent Collaboration track:

**How agents convey their skills:**
Each agent has a defined role (Spotter analyzes video, Director applies creative vision, etc.) communicated through typed interfaces and structured handoff messages visible in the console log.

**How agents identify suitable peers:**
The pipeline is deterministic by design--Spotter always hands to Director, Director to Engine, Engine to QC. However, QC can route back to Engine for regeneration, demonstrating dynamic task reassignment based on quality assessment.

**How agents share context within token limits:**
Rather than passing full context between agents, MongoDB stores intermediate state. Each agent queries only what it needs:
- Spotter writes event detections
- Director reads events, writes layer plans
- Engine reads layer plans, writes audio URLs
- QC reads all, writes approval/rejection

This keeps each agent prompt focused and within token limits while maintaining full system context.

**How agents perform intricate tasks through collaboration:**
No single agent could produce the final output. The Spotter cannot generate audio. The Engine cannot analyze video. The Director cannot evaluate quality. Only through structured collaboration--with MongoDB as the shared memory--does the system produce coherent, theme-appropriate sound design.

---

## Future Development

- Real-time processing for live video streams
- Multi-language support for international Foley conventions
- Plugin architecture for custom agent injection
- Collaborative editing with multiple human reviewers
- Export directly to DAW formats (Pro Tools, Logic Pro)


---

## License

MIT License
