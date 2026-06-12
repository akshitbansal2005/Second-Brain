# 🧠 Second Brain AI — Personal Knowledge Assistant

A production-ready RAG (Retrieval-Augmented Generation) application that turns your documents into a queryable AI knowledge base.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SECOND BRAIN AI                               │
│                                                                       │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐  │
│  │  React   │────▶│ Express  │────▶│ MongoDB  │     │  OpenAI   │  │
│  │ Frontend │◀────│   API    │     │ Metadata │     │Embeddings │  │
│  └──────────┘     └──────────┘     └──────────┘     └───────────┘  │
│                        │                                    │        │
│                        │                            ┌───────────┐   │
│                        └───────────────────────────▶│ Pinecone  │   │
│                                                      │  Vectors  │   │
│                                                      └───────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## RAG Data Flow

```
UPLOAD FLOW
───────────
User selects file
     │
     ▼
Express (multer)  ──▶  Text Extraction (pdf-parse / mammoth)
                               │
                               ▼
                         Chunking (~500 tokens, 10% overlap)
                               │
                               ▼
                     OpenAI text-embedding-3-small
                          (1536-dim vectors)
                               │
                               ▼
                       Pinecone upsert (namespace=userId)
                               │
                               ▼
                      MongoDB stores metadata + chunk refs

QUERY FLOW
──────────
User types question
     │
     ▼
OpenAI embed query ──▶  Pinecone similarity search (top-5)
                               │
                               ▼
                    Retrieve relevant text chunks + sources
                               │
                               ▼
                 Build prompt: system + history + context + query
                               │
                               ▼
                    OpenAI gpt-4o-mini streaming response
                               │
                         SSE stream ──▶ React frontend
                               │
                    Sources shown as collapsible citations
```

---

## Project Structure

```
second-brain/
├── backend/
│   ├── server.js                  # Express entry point
│   ├── controllers/
│   │   ├── auth.controller.js     # Register / login / getMe
│   │   ├── chat.controller.js     # Chat sessions + streaming send
│   │   └── document.controller.js # Upload + processing pipeline
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── chat.routes.js
│   │   └── document.routes.js
│   ├── services/
│   │   ├── document.service.js    # Text extraction + chunking
│   │   ├── embedding.service.js   # OpenAI embeddings
│   │   ├── pinecone.service.js    # Vector store operations
│   │   └── rag.service.js         # Full RAG pipeline
│   ├── models/
│   │   ├── User.js
│   │   ├── Document.js
│   │   └── Chat.js
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT protection
│   │   └── error.middleware.js    # Central error handler
│   └── .env.example
│
└── frontend/
    └── src/
        ├── App.js                 # Router + protected routes
        ├── store/index.js         # Zustand (auth + chat + docs)
        ├── services/api.js        # Axios instance
        └── components/
            ├── auth/AuthPage.jsx  # Login / register
            ├── layout/
            │   ├── AppLayout.jsx  # Shell
            │   └── Sidebar.jsx    # Chat history + navigation
            ├── chat/
            │   ├── ChatWindow.jsx # Message list + header
            │   ├── ChatMessage.jsx# Markdown + sources
            │   ├── ChatInput.jsx  # Textarea + send
            │   └── EmptyState.jsx # Suggested prompts
            └── upload/
                ├── DocumentsPanel.jsx # Library + upload
                ├── FileDropzone.jsx   # Drag-and-drop
                └── DocumentCard.jsx   # Document status card
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API key
- Pinecone account

### 1. Create a Pinecone Index

1. Go to [app.pinecone.io](https://app.pinecone.io)
2. Create a new index with:
   - **Name:** `second-brain`
   - **Dimensions:** `1536`
   - **Metric:** `cosine`
   - **Cloud/Region:** any (e.g. AWS us-east-1)

### 2. Configure the Backend

```bash
cd backend
cp .env.example .env
# Fill in your actual keys in .env
npm install
npm run dev
```

### 3. Configure the Frontend

```bash
cd frontend
npm install
npm start
```

The frontend proxies `/api` to `http://localhost:5000` via the `proxy` field in `package.json`.

---

## Environment Variables

```env
# backend/.env

PORT=5000
CLIENT_URL=http://localhost:3000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/secondbrain

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

OPENAI_API_KEY=sk-...
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=second-brain
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, receive JWT |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/documents/upload` | Upload & process file |
| GET | `/api/documents` | List all documents |
| DELETE | `/api/documents/:id` | Delete document + vectors |
| POST | `/api/chat/send` | Send message (SSE stream) |
| GET | `/api/chat` | List chat sessions |
| GET | `/api/chat/:id` | Get chat with messages |
| DELETE | `/api/chat/:id` | Delete chat session |

---

## How RAG Works

**Retrieval-Augmented Generation** grounds LLM responses in your actual documents:

1. **Chunking** — Documents are split into ~500-token overlapping segments. Overlap preserves context at chunk boundaries.

2. **Embedding** — Each chunk is converted to a 1536-dimensional vector using OpenAI's `text-embedding-3-small`. Semantically similar text produces similar vectors.

3. **Storage** — Vectors live in Pinecone (per-user namespace). Metadata (document name, chunk text) is stored in MongoDB for quick retrieval.

4. **Retrieval** — When you ask a question, it's also embedded and compared to all stored vectors using cosine similarity. The top 5 most relevant chunks are returned.

5. **Generation** — The retrieved chunks are injected into the LLM's context window as grounding material. The model is instructed to answer only from this context, preventing hallucination.

6. **Streaming** — Responses stream token-by-token via Server-Sent Events for a real-time feel.

---

## Key Design Decisions

- **Memory storage (multer)** — Files aren't written to disk; buffers are processed directly, keeping the server stateless.
- **Async document processing** — Upload returns immediately (202 Accepted); the pipeline runs in the background. The frontend polls for status.
- **Per-user Pinecone namespaces** — Total isolation between users' vector stores.
- **Conversation history** — Last 6 messages are included in each LLM call for multi-turn coherence without exceeding context limits.
- **Relevance threshold** — Matches below 0.3 cosine similarity are filtered out to avoid irrelevant citations.
