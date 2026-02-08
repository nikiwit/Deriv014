# DerivHR AI Platform

An AI-powered HR management platform built for Deriv's multi-jurisdiction workforce. Features RAG-based policy Q&A, automated contract generation, and end-to-end employee onboarding — covering both Malaysia and Singapore offices.

**Deriv014 AI Hackathon Virtual Round — 07-08 Feb 2026**

The hackathon pitch presentation is available in the [Deriv014 Pitch Deck](Deriv014%20Pitch%20Deck.pdf).

## Features

### Core
- **AI HR Assistant** — RAG-powered chatbot that answers employee questions using indexed company policies, with source citations and jurisdiction awareness (MY/SG)
- **Smart Contract Generation** — Auto-generates jurisdiction-specific employment contracts (PDF) with statutory defaults (EPF/SOCSO for MY, CPF for SG)
- **Employee Onboarding** — 4-step wizard with dual mode: structured form or conversational AI chat
- **Document Checklist** — Tracks required compliance documents per jurisdiction with auto-promotion to active status
- **E-Leave Management** — Leave request and approval workflows
- **Workforce Analytics** — AI-driven workforce insights and metrics dashboard

### Platform
- **HR Admin Portal** — Dashboard, onboarding management, contract generation, knowledge base, analytics
- **Employee Portal** — Personal dashboard, onboarding progress, leave requests, documents, profile
- **Slack Integration** — Employees can query HR policies directly from Slack via Socket Mode bot
- **Streaming Responses** — Real-time token streaming via Server-Sent Events (SSE)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | Flask 3.1, Python 3.x, SQLite |
| RAG Engine | LlamaIndex 0.12.5 (VectorStoreIndex) |
| LLM | OpenAI GPT-4o-mini |
| Embeddings | OpenAI text-embedding-3-small |
| PDF Generation | xhtml2pdf with Jinja2 templates |

## Project Structure

```
Deriv014/
├── App.tsx                        # Main app with role-based routing
├── components/
│   ├── Layout.tsx                 # HR admin layout + sidebar
│   ├── Dashboard.tsx              # Workforce overview & metrics
│   ├── ChatAssistant.tsx          # HR RAG chatbot
│   ├── DocumentGen.tsx            # Contract generation UI
│   ├── Onboarding.tsx             # HR onboarding management
│   ├── LeaveManagement.tsx        # E-Leave system
│   ├── WorkforceAnalytics.tsx     # AI workforce insights
│   ├── KnowledgeBase.tsx          # Policy document browser
│   ├── auth/LoginPage.tsx         # Login with role selection
│   ├── employee/                  # Employee portal views
│   └── onboarding/                # Onboarding wizard (4-step)
├── services/
│   └── api.ts                     # Backend API wrapper
├── contexts/
│   └── AuthContext.tsx            # Auth state (localStorage)
│
├── backend/
│   ├── run.py                     # Flask entry point (port 5001)
│   ├── requirements.txt           # Python dependencies
│   ├── app/
│   │   ├── __init__.py            # App factory (create_app)
│   │   ├── config.py              # Configuration & env vars
│   │   ├── database.py            # SQLite schema (7 tables)
│   │   ├── rag.py                 # RAG engine (LlamaIndex + Gemini + OpenAI)
│   │   └── routes/
│   │       ├── chat.py            # Chat endpoints (standard + SSE streaming)
│   │       ├── documents.py       # Contract generation & management
│   │       └── onboarding.py      # Employee registration & checklist
│   ├── templates/                 # Jinja2 contract templates (MY/SG)
│   └── instance/                  # SQLite DB, vector index, generated PDFs
│
├── md_files/                      # RAG knowledge base (10+ policy docs)
│   ├── deriv_my_*.md              # Malaysia policies
│   └── deriv_sg_*.md              # Singapore policies
│
└── docs/                          # Architecture & workflow documentation
```

## Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- **API Keys:**
  - OpenAI API key — [Get one here](https://platform.openai.com/api-keys)

## Getting Started

### 1. Install frontend dependencies

```bash
cd Deriv014
npm install
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment variables

Create **`backend/.env`**:

```env
OPENAI_API_KEY=your_openai_api_key
```

Create **`.env`** in the project root (for frontend AI features):

```env
OPENAI_API_KEY=your_openai_api_key
```

### 4. Start the application

You need **two terminals** running simultaneously:

**Terminal 1 — Backend (Flask)**

```bash
cd backend
source .venv/bin/activate
python run.py
```

The backend starts on **http://localhost:5001**. On first run it builds the vector index from the policy documents in `md_files/` — this takes around 30 seconds.

**Terminal 2 — Frontend (Vite)**

```bash
npm run dev
```

The frontend starts on **http://localhost:3001**. Vite proxies all `/api` requests to the Flask backend automatically.

### 5. Open the app

Navigate to **http://localhost:3001** in your browser.

## Usage

### Login

The app includes demo users for testing. Select a role on the login page:

- **HR Admin** — Full access to dashboard, onboarding management, contract generation, HR chatbot, knowledge base, and analytics
- **Employee** — Access to personal dashboard, onboarding progress, leave management, documents, and employee chatbot

### AI HR Chatbot

1. Navigate to **Assistant** in the HR sidebar (or **AI Assistant** in the employee portal)
2. Ask any HR policy question, for example:
   - *"What is the annual leave entitlement for Malaysian employees?"*
   - *"What are the CPF contribution rates in Singapore?"*
   - *"What is the dress code policy?"*
   - *"How do I request sick leave?"*
3. The bot retrieves relevant policy chunks via RAG, responds with citations including the source document and jurisdiction
4. Conversations persist per session with full chat history

### Generating Contracts

1. Navigate to **Documents** in the HR sidebar
2. Fill in employee details: name, position, department, jurisdiction (MY/SG), start date, salary
3. Click **Generate** — the system renders a jurisdiction-specific contract and outputs a downloadable PDF
4. Malaysia contracts include Employment Act 1955 provisions, EPF/SOCSO rates
5. Singapore contracts include Employment Act (Cap. 91) provisions, CPF rates

### Employee Onboarding

1. Click **New Employee Onboarding** from the login page, or navigate to **Onboarding** in the HR admin sidebar
2. Choose **Form Mode** (structured) or **AI Chat Mode** (conversational)
3. Complete the 4-step wizard: Personal Info → Employment Details → Compliance & Documents → Review
4. Required documents are tracked per jurisdiction; employee auto-promotes to active status when all docs are submitted

## Slack Integration (Optional)

1. Create a Slack app with **Socket Mode** enabled and appropriate bot scopes
2. Add to **`backend/.env`**:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
```

3. Install the dependency and run the bot:

```bash
pip install slack-bolt
cd backend
source .venv/bin/activate
python slack_socket.py
```

Employees can then message the bot in Slack to ask HR policy questions — it uses the same RAG engine as the web chatbot.

## API Reference

See [backend/API_REFERENCE.md](backend/API_REFERENCE.md) for full endpoint documentation.

Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send a message to the HR chatbot |
| `POST` | `/api/chat/stream` | Streaming chat via SSE |
| `GET` | `/api/chat/history/<session_id>` | Get conversation history |
| `POST` | `/api/documents/generate` | Generate employment contract PDF |
| `GET` | `/api/documents` | List generated documents |
| `GET` | `/api/documents/<id>/download` | Download a contract PDF |
| `POST` | `/api/onboarding/employees` | Register a new employee |
| `GET` | `/api/onboarding/employees` | List all employees |
| `GET` | `/api/onboarding/employees/<id>/checklist` | Get onboarding document checklist |
| `GET` | `/api/health` | Health check |

## RAG Knowledge Base

The `md_files/` directory contains company documentation indexed by the RAG engine:

| Document | Jurisdictions |
|----------|--------------|
| Company Information | MY, SG |
| Employee Handbook | MY, SG |
| Leave Policy | MY, SG |
| IT & Data Policy | MY, SG |
| Job Descriptions | MY, SG |

These files are loaded into a LlamaIndex VectorStoreIndex using OpenAI embeddings. The vector index is persisted in `backend/instance/index_store/` and only rebuilt when missing.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Vector index errors after changing embedding model | Delete `backend/instance/index_store/` and restart the backend to rebuild |
| OpenAI rate limit errors | Check your OpenAI usage dashboard for quota. GPT-4o-mini has generous limits on paid plans |
| Port conflicts | Frontend uses port 3001, backend uses port 5001. Change in `vite.config.ts` and `backend/run.py` |
| Backend not connecting | Ensure both terminals are running. Check that `backend/.env` has a valid `OPENAI_API_KEY` |
| Empty chatbot responses | Verify `OPENAI_API_KEY` is set correctly in both `backend/.env` and root `.env` |

## Deployment

### Backend

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 "app:create_app()"
```

### Frontend

```bash
npm run build
# Deploy the dist/ folder to your hosting provider
```
