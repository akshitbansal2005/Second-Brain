/**
 * scripts/setup-pinecone.js
 *
 * Creates a fresh Pinecone index for Cohere embeddings (1024 dimensions).
 * Run once: node scripts/setup-pinecone.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pinecone } = require('@pinecone-database/pinecone');

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'secondbrain-cohere';
const DIMENSION = 1024; // Cohere embed-english-v3.0

async function main() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

  const existingIndexes = await pc.listIndexes();
  const names = (existingIndexes.indexes || []).map((i) => i.name);

  if (names.includes(INDEX_NAME)) {
    console.log(`✅ Index "${INDEX_NAME}" already exists — nothing to do.`);
    return;
  }

  console.log(`🔧 Creating Pinecone index "${INDEX_NAME}" (dim=${DIMENSION})...`);

  await pc.createIndex({
    name: INDEX_NAME,
    dimension: DIMENSION,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1',
      },
    },
  });

  console.log(`✅ Index "${INDEX_NAME}" created successfully!`);
  console.log('   You can now restart the backend and re-upload your documents.');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
