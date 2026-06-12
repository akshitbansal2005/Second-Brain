# 🧠 Second Brain AI — Personal Knowledge Assistant

Second Brain AI is a full-stack Retrieval-Augmented Generation (RAG) application that lets you turn your documents into a searchable AI-powered knowledge base. Upload PDFs or DOCX files, ask questions in natural language, and get answers grounded in your own data rather than relying solely on the model's training.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SECOND BRAIN AI                             │
│                                                                     │
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

The application consists of a React frontend, an Express backend, MongoDB for storing metadata and chat history, and Pinecone as the vector database. OpenAI is used both for generating embeddings and producing context-aware responses.

---

## RAG Data Flow

### Upload Pipeline

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
```

When a file is uploaded, its contents are extracted and split into overlapping chunks to preserve context. Each chunk is converted into embeddings and stored in Pinecone, while metadata and references are maintained in MongoDB.

### Query Pipeline

```
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

Whenever a user asks a question, the query is embedded and compared with stored vectors. The most relevant chunks are retrieved and supplied to the language model as context, allowing it to generate answers based on the user's documents.

---

## Project Structure

```
second-brain/
├── backend/
│   ├── server.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── chat.controller.js
│   │   └── document.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── chat.routes.js
│   │   └── document.routes.js
│   ├── services/
│   │   ├── document.service.js
│   │   ├── embedding.service.js
│   │   ├── pinecone.service.js
│   │   └── rag.service.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Document.js
│   │   └── Chat.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   └── .env.example
│
└── frontend/
    └── src/
        ├── App.js
        ├── store/index.js
        ├── services/api.js
        └── components/
            ├── auth/AuthPage.jsx
            ├── layout/
            │   ├── AppLayout.jsx
            │   └── Sidebar.jsx
            ├── chat/
            │   ├── ChatWindow.jsx
            │   ├── ChatMessage.jsx
            │   ├── ChatInput.jsx
            │   └── EmptyState.jsx
            └── upload/
                ├── DocumentsPanel.jsx
                ├── FileDropzone.jsx
                └── DocumentCard.jsx
```

The project follows a clean separation of concerns. Controllers handle requests, services contain business logic, models define database schemas, and middleware manages authentication and error handling.

---

## Setup Instructions

### Prerequisites

Before running the project, make sure you have:

* Node.js 18+
* MongoDB (local or Atlas)
* OpenAI API key
* Pinecone account

---

### 1. Create a Pinecone Index

Create a new Pinecone index with the following configuration:

* **Name:** `second-brain`
* **Dimensions:** `1536`
* **Metric:** `cosine`
* **Region:** Any region of your choice

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Fill in your API keys inside `.env`.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend proxies `/api` requests to `http://localhost:5000`.

---

## Environment Variables

```env
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

## API Endpoints

| Method | Endpoint                | Description                      |
| ------ | ----------------------- | -------------------------------- |
| POST   | `/api/auth/register`    | Create account                   |
| POST   | `/api/auth/login`       | Login                            |
| GET    | `/api/auth/me`          | Get current user                 |
| POST   | `/api/documents/upload` | Upload and process files         |
| GET    | `/api/documents`        | Fetch documents                  |
| DELETE | `/api/documents/:id`    | Remove documents and vectors     |
| POST   | `/api/chat/send`        | Send message and stream response |
| GET    | `/api/chat`             | List chat sessions               |
| GET    | `/api/chat/:id`         | Retrieve chat messages           |
| DELETE | `/api/chat/:id`         | Delete chat session              |

---

## How Retrieval-Augmented Generation Works

Instead of relying only on the language model's built-in knowledge, the application grounds responses in the user's own documents.

1. **Chunking**

   Documents are divided into overlapping chunks of roughly 500 tokens. The overlap helps preserve context between neighboring sections.

2. **Embedding**

   Every chunk is converted into a 1536-dimensional vector using OpenAI's `text-embedding-3-small` model.

3. **Storage**

   Vectors are stored inside Pinecone using user-specific namespaces, while MongoDB stores document metadata and references.

4. **Retrieval**

   User queries are embedded and compared against stored vectors. The top matching chunks are retrieved based on cosine similarity.

5. **Generation**

   Retrieved chunks are injected into the prompt along with recent conversation history, allowing the model to answer using relevant information.

6. **Streaming**

   Responses are streamed token-by-token through Server-Sent Events, providing a responsive chat experience.

---

## Design Choices

* **In-memory uploads with Multer** keep the server stateless and avoid unnecessary disk usage.
* **Background processing** allows uploads to return immediately while indexing continues asynchronously.
* **User-specific Pinecone namespaces** ensure complete separation between users.
* **Recent chat history** is included in each request to support multi-turn conversations.
* **Similarity threshold filtering** helps remove weak matches and prevents irrelevant citations.
* **SSE streaming** delivers responses in real time, making the application feel interactive and responsive.

---

## Motivation

Second Brain AI was built to solve a simple problem: information is often scattered across PDFs, notes, and documents, making it difficult to find answers quickly. By combining vector search with large language models, the project creates a personal knowledge assistant capable of understanding and retrieving information from your own data.
