/**
 * utils/initPinecone.js
 *
 * Run this once before first use to verify your Pinecone index is
 * configured correctly (dimension=1536, metric=cosine).
 *
 * Usage:
 *   node utils/initPinecone.js
 *
 * It will:
 *   1. Connect to Pinecone using your API key
 *   2. Check that the index named in PINECONE_INDEX_NAME exists
 *   3. Validate dimension (1536) and metric (cosine)
 *   4. Print index stats (vector count per namespace)
 */

require('dotenv').config({ path: '../.env' });
const { Pinecone } = require('@pinecone-database/pinecone');

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';

const ok   = (m) => console.log(`  ${GREEN}✓${RESET}  ${m}`);
const fail = (m) => console.log(`  ${RED}✗${RESET}  ${m}`);
const info = (m) => console.log(`  ${CYAN}→${RESET}  ${m}`);
const warn = (m) => console.log(`  ${YELLOW}⚠${RESET}  ${m}`);

(async () => {
  console.log('\n  🔍  Pinecone Index Validator\n');

  const apiKey    = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!apiKey || apiKey.includes('your_')) {
    fail('PINECONE_API_KEY not set in backend/.env');
    process.exit(1);
  }

  if (!indexName) {
    fail('PINECONE_INDEX_NAME not set in backend/.env');
    process.exit(1);
  }

  try {
    const pc = new Pinecone({ apiKey });
    info(`Connecting to Pinecone…`);

    const indexes = await pc.listIndexes();
    const names = indexes.indexes?.map((i) => i.name) ?? [];

    if (!names.includes(indexName)) {
      fail(`Index "${indexName}" not found.`);
      info(`Available indexes: ${names.length > 0 ? names.join(', ') : '(none)'}`);
      info(`Create it at https://app.pinecone.io with:`);
      info(`  Name: ${indexName}`);
      info(`  Dimensions: 1536`);
      info(`  Metric: cosine`);
      process.exit(1);
    }

    ok(`Index "${indexName}" exists`);

    // Describe the index
    const description = await pc.describeIndex(indexName);
    const spec = description.dimension;
    const metric = description.metric;

    if (description.dimension !== 1536) {
      fail(`Dimension is ${description.dimension} — must be 1536 for text-embedding-3-small`);
      process.exit(1);
    }
    ok(`Dimension: ${description.dimension} ✓`);

    if (description.metric !== 'cosine') {
      warn(`Metric is "${description.metric}" — cosine is recommended`);
    } else {
      ok(`Metric: cosine ✓`);
    }

    // Stats
    const index = pc.index(indexName);
    const stats = await index.describeIndexStats();
    const totalVectors = stats.totalRecordCount ?? 0;
    const namespaces   = Object.keys(stats.namespaces ?? {});

    ok(`Total vectors stored: ${totalVectors}`);
    if (namespaces.length > 0) {
      info(`Namespaces (users): ${namespaces.join(', ')}`);
    } else {
      info(`No vectors yet — upload a document to populate the index`);
    }

    console.log('\n  ✅  Pinecone is ready to use!\n');
  } catch (err) {
    fail(`Pinecone error: ${err.message}`);
    console.log('');
    process.exit(1);
  }
})();
