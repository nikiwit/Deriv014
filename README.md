# DerivHR — AI-Powered HR Management Platform

## Overview

DerivHR is an AI-powered Human Resources platform that automates onboarding, document generation, contract management, workforce analytics, and employee self-service. It uses LLM-based agents (OpenAI, Gemini, OpenRouter) with a RAG knowledge base for policy-aware responses and compliance.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Vite + TailwindCSS)      │
│  Port 3001 — Vite proxies /api → Flask                   │
├──────────────────────────────────────────────────────────┤
│  Backend (Flask + Python)                                │
│  Port 5001                                               │
│  ├── RAG Engine (LlamaIndex + OpenAI Embeddings)         │
│  ├── Multi-Agent System (Contract, Onboarding, Policy)   │
│  ├── PDF Generation (FPDF2 + xhtml2pdf)                  │
│  └── Telegram Bot (standalone process)                   │
├──────────────────────────────────────────────────────────┤
│  Database: Supabase (PostgreSQL)                         │
│  Tables: users, employees, contracts, training_*,        │
│          onboarding_documents, telegram_authorized_users  │
└──────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Lucide-React, Recharts |
| **Backend** | Python 3.9+, Flask, LlamaIndex (RAG), FPDF2, OpenAI SDK |
| **Database** | Supabase (PostgreSQL) |
| **AI/LLMs** | OpenAI GPT-4o-mini, Google Gemini, OpenRouter (Deepseek, Nemotron) |
| **Integrations** | Telegram Bot, Slack Bot (optional) |
| **PDF** | FPDF2 (contracts, offer letters), xhtml2pdf (reports) |

## Key Features

### HR Admin Portal
- **AI Onboarding Chat** — Collect employee info via conversational AI, generate offer letters with manager confirmation
- **Employee Management** — View all employees with roles (pending, in-progress, completed), copy offer links
- **Contract Generation** — Jurisdiction-specific contracts (Malaysia/Singapore) with statutory compliance
- **Workforce Analytics** — AI-driven insights on hiring velocity, skill gaps, strategic planning
- **HR Chat Assistant** — RAG-powered assistant with policy citations and source documents
- **Knowledge Base** — Indexed company policies, handbooks, leave policies per jurisdiction
- **Telegram Bot** — Natural language HR queries from Telegram (onboarding stats, training progress, daily summaries)

### Employee Portal
- **My Onboarding** — Step-by-step onboarding with document tracking
- **My Documents** — Preview, sign, and download contracts and offer letters
- **E-Leave Management** — Apply for leave, track balances, statutory compliance
- **AI Assistant** — Employee-facing chatbot for policy questions and document status
- **Contract Signing** — Digital signature with PDF generation

### Multi-Agent System
| Agent | Responsibility |
|-------|---------------|
| Onboarding Agent | Employee registration, checklist management, offer approval |
| Contract Agent | Contract negotiation, signing, PDF generation, storage |
| Policy Agent | Compliance checks, leave policy, statutory requirements |
| Training Agent | Training assignments, progress tracking, delay detection |

## Setup

### Prerequisites
- Node.js (LTS), Python 3.9+, Supabase project

### Quick Start

```bash
# 1. Clone & install frontend
npm install

# 2. Backend setup
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 3. Configure environment
# backend/.env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
OPENROUTER_API_KEY=your_openrouter_key

# Root .env (frontend)
VITE_GEMINI_API_KEY=your_gemini_key

# 4. Run (two terminals)
# Terminal 1: backend
cd backend && source venv/bin/activate && python run.py

# Terminal 2: frontend
npm run dev
```

Open **http://localhost:3001**. Backend runs on **http://localhost:5001**.

### Telegram Bot (Optional)

```bash
# Add to backend/.env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_USE_POLLING=true

# Run standalone
cd backend && python run_telegram_bot.py
```

See [docs/telegram_bot_setup.md](docs/telegram_bot_setup.md) for full setup including BotFather, authorization, and database schema.

### Slack Bot (Optional)

```bash
pip install slack-bolt
# Add SLACK_BOT_TOKEN and SLACK_APP_TOKEN to backend/.env
cd backend && python slack_socket.py
```

## Login & Roles

| Role | Access |
|------|--------|
| **HR Admin** | Dashboard, onboarding management, contracts, analytics, HR chatbot, knowledge base |
| **Employee** | Personal dashboard, onboarding progress, documents, leave, AI assistant |
| **Pending Employee** | Offer acceptance, contract preview/signing |

Demo credentials are available on the login page.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | HR chatbot message |
| `POST` | `/api/chat/stream` | Streaming chat (SSE) |
| `POST` | `/api/onboarding/employees` | Register new employee |
| `GET` | `/api/onboarding/employees` | List all employees with roles |
| `POST` | `/api/generate-offer-approval` | Generate offer + create pending user |
| `GET` | `/api/get-contract-preview/:id` | Contract preview (uses signed data if available) |
| `GET` | `/api/download-contract-pdf/:id` | Download signed contract PDF |
| `GET` | `/api/generate-offer-pdf/:id` | Generate offer letter PDF |
| `GET` | `/api/health` | Health check |

See [backend/API_REFERENCE.md](backend/API_REFERENCE.md) for full documentation.

## RAG Knowledge Base

The `md_files/` directory contains indexed company documentation:

| Document | Jurisdictions |
|----------|--------------|
| Company Information | MY, SG |
| Employee Handbook | MY, SG |
| Leave Policy | MY, SG |
| IT & Data Policy | MY, SG |
| Job Descriptions | MY, SG |

Indexed via LlamaIndex VectorStoreIndex with OpenAI embeddings. Persisted in `backend/instance/index_store/`.

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── routes/              # Flask route handlers
│   │   │   ├── onboarding.py    # Employee CRUD, list, checklist
│   │   │   ├── employee_contract.py  # Contract signing, PDF generation
│   │   │   ├── contract_sign.py # Contract preview, download endpoints
│   │   │   ├── documents.py     # PDF generation, document management
│   │   │   ├── employee_chat.py # Employee chat with intent detection
│   │   │   └── auth.py          # Authentication routes
│   │   ├── agents/              # AI agents (onboarding, contract, policy)
│   │   └── templates/           # Document templates
│   ├── telegram_bot/            # Standalone Telegram bot
│   │   ├── bot.py               # Bot orchestrator
│   │   ├── handlers.py          # Command & message handlers
│   │   ├── intent_detector.py   # NLP intent detection (OpenAI)
│   │   ├── query_service.py     # HR data query engine
│   │   └── database.py          # Direct Supabase client
│   ├── md_files/ → ../md_files  # Symlink to knowledge base
│   ├── requirements.txt
│   └── run.py
├── components/
│   ├── auth/                    # Login, role selection
│   ├── employee/                # MyDocuments, MyOnboarding, ELeave
│   ├── onboarding/              # NewEmployeeModeSelection, forms
│   ├── design-system/           # Reusable UI components
│   ├── Onboarding.tsx           # HR admin onboarding management
│   └── Dashboard.tsx            # HR admin dashboard
├── services/
│   ├── api.ts                   # Backend API client
│   └── geminiService.ts         # AI service integration
├── contexts/                    # React contexts (Auth)
├── docs/                        # Documentation, schemas
├── md_files/                    # RAG knowledge base documents
├── types.ts                     # TypeScript type definitions
└── package.json
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Vector index errors | Delete `backend/instance/index_store/` and restart backend |
| OpenAI rate limits | Check OpenAI usage dashboard |
| Port conflicts | Frontend: 3001, Backend: 5001 (change in `vite.config.ts` / `run.py`) |
| Empty chatbot responses | Verify `OPENAI_API_KEY` in `backend/.env` |
| Telegram bot `proxies` error | Ensure `python-telegram-bot==21.0` and compatible `httpx` |
| Supabase connection errors | Verify `SUPABASE_URL` and `SUPABASE_KEY` in `backend/.env` |

## Deployment

```bash
# Backend
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 "app:create_app()"

# Frontend
npm run build
# Deploy dist/ to hosting provider
```
