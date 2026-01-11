import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for audio base64

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
let db = null;

async function connectDB() {
  if (db) return db;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not set in .env.local');
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✓ Connected to MongoDB Atlas');

  db = client.db('sound_library');
  return db;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mongodb: !!db });
});

/**
 * VECTOR SEARCH - Find similar sounds
 * POST /api/sounds/search
 * Body: { embedding: number[], query?: string, limit?: number }
 */
app.post('/api/sounds/search', async (req, res) => {
  try {
    const { embedding, query, limit = 1 } = req.body;

    const database = await connectDB();
    const collection = database.collection('assets');

    let results = [];

    // Try vector search first (if index exists)
    if (embedding && Array.isArray(embedding)) {
      try {
        results = await collection.aggregate([
          {
            $vectorSearch: {
              index: 'vector_index',
              path: 'embedding',
              queryVector: embedding,
              numCandidates: 50,
              limit: limit
            }
          },
          {
            $project: {
              _id: 0,
              description: 1,
              audioData: 1,
              query: 1,
              score: { $meta: 'vectorSearchScore' }
            }
          }
        ]).toArray();
      } catch (vectorError) {
        console.log('Vector search unavailable, using text fallback...');
      }
    }

    // Fallback: text search if vector search fails or returns nothing
    if (results.length === 0 && query) {
      const searchTerms = query.toLowerCase().split(' ').filter(w => w.length > 2);

      // Try to find by partial text match
      results = await collection.find({
        $or: [
          { description: { $regex: searchTerms.join('|'), $options: 'i' } },
          { query: { $regex: searchTerms.join('|'), $options: 'i' } }
        ]
      })
      .limit(limit)
      .project({ _id: 0, description: 1, audioData: 1, query: 1 })
      .toArray();

      // Add a simulated score for text matches
      results = results.map(r => ({ ...r, score: 0.75 }));
    }

    res.json({ documents: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * CACHE SOUND - Save a generated sound
 * POST /api/sounds/cache
 * Body: { description, query, audioData, embedding }
 */
app.post('/api/sounds/cache', async (req, res) => {
  try {
    const { description, query, audioData, embedding } = req.body;

    if (!description || !audioData || !embedding) {
      return res.status(400).json({ error: 'description, audioData, and embedding required' });
    }

    const database = await connectDB();
    const collection = database.collection('assets');

    const result = await collection.insertOne({
      description,
      query,
      audioData,
      embedding,
      createdAt: new Date(),
      source: 'elevenlabs'
    });

    console.log(`✓ Cached sound: "${description}"`);
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error('Cache error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET STATS - How many sounds cached
 */
app.get('/api/sounds/stats', async (req, res) => {
  try {
    const database = await connectDB();
    const collection = database.collection('assets');
    const count = await collection.countDocuments();
    res.json({ totalSounds: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🎙️  Foley API Server running on http://localhost:${PORT}`);
  console.log(`   - POST /api/sounds/search  (vector search)`);
  console.log(`   - POST /api/sounds/cache   (save sound)`);
  console.log(`   - GET  /api/sounds/stats   (library stats)\n`);

  // Pre-connect to MongoDB
  connectDB().catch(err => {
    console.error('⚠️  MongoDB connection failed:', err.message);
    console.error('   Make sure MONGODB_URI is set in .env.local');
  });
});
