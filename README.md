# DerivHR Platform


## Overview

DerivHR is an AI-powered Human Resources management platform designed to streamline and automate various HR processes, from employee onboarding and document generation to workforce analytics and AI-driven insights. It leverages advanced AI models (Gemini, OpenRouter) to provide intelligent assistance, compliance checks, and personalized employee experiences.

## Key Features

-   **AI-Powered Onboarding**: Automated, personalized onboarding journeys for new hires, including compliance checks and task automation.
-   **Resume Auto-fill**: Upload resumes (PDF, image) for AI-powered extraction and auto-population of onboarding forms.
-   **Digital Signature**: Securely sign documents electronically with drawing or typed signature options.
-   **Comprehensive Document Generation**: Generate detailed employment contracts, offer letters, and comprehensive onboarding application PDFs based on employee data and JD analysis.
-   **Workforce Analytics**: AI-driven insights into hiring velocity, skill gaps, and strategic workforce planning.
-   **E-Leave Management**: Track leave balances, apply for leave, and manage approvals with built-in statutory compliance.
-   **HR Chat Assistant**: An AI assistant providing instant support for employee queries, policy information, and document status.
-   **Multi-Agent System**: Specialized AI agents for contract management, onboarding workflows, policy compliance, salary administration, and training coordination.
-   **Resilient AI Backend**: Multi-level fallback strategy (OpenRouter, Gemini) for API calls, ensuring high availability and resilience against rate limits.
-   **Modern Minimalist UI/UX**: Professional, clean, and intuitive user interface built with React and TailwindCSS, adhering to strong readability and accessibility standards.

## Tech Stack

-   **Frontend**: React, TypeScript, Vite, TailwindCSS, Lucide-React (icons), Recharts (charts).
-   **Backend**: Python, Flask, LlamaIndex (RAG framework), FPDF (PDF generation), requests.
-   **Database**: SQLite.
-   **AI/LLMs**: Google Gemini API, OpenRouter API (Deepseek, Nemotron).
-   **Deployment**: Local development setup, can be containerized.

## Setup Instructions

### Prerequisites

-   Node.js (LTS version)
-   Python 3.9+
-   `pip` (Python package installer)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DerivHR
```

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Initialize the database (if not already done)
flask init-db

# Run the Flask backend server
python run.py
```
The backend server will typically run on `http://localhost:5001`.

### 3. Frontend Setup

```bash
# Navigate back to the project root
cd ..

# Install Node.js dependencies
npm install
```

### 4. Configure Environment Variables

Create **`backend/.env`**:

```env
GEMINI_API_KEY=your_google_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

Create **`.env`** in the project root (for frontend):

```env
VITE_GEMINI_API_KEY=your_google_gemini_api_key
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
```

### 5. Start the Application

You need **two terminals** running simultaneously:

**Terminal 1 — Backend (Flask)**

```bash
cd backend
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
python run.py
```

The backend starts on **http://localhost:5001**. On first run it builds the vector index from the policy documents in `md_files/` — this takes around 30 seconds.

**Terminal 2 — Frontend (Vite)**

```bash
# From project root
npm run dev
```

The frontend starts on **http://localhost:3001**. Vite proxies all `/api` requests to the Flask backend automatically.

### 6. Open the App

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
## Usage

Once both the backend and frontend servers are running:

1.  Open your browser to `http://localhost:3000`.
2.  Log in as either an "HR Admin" or "Employee" (default credentials are in `constants.tsx` for demo).
3.  Explore the various modules:
    *   **Dashboard**: Get an executive overview.
    *   **Onboarding**: Initiate new employee journeys using AI-powered forms or chat.
    *   **My Onboarding / My Documents**: For employees to complete tasks, sign documents, and download their records.
    *   **Chat Assistant**: Interact with the AI HR Assistant for queries.

## Folder Structure

```
.
├── backend/                  # Flask Backend application
│   ├── app/                  # Flask app modules (routes, models, services)
│   ├── instance/             # Local database and generated files
│   ├── requirements.txt      # Python dependencies
│   └── run.py                # Backend entry point
├── components/               # React UI components
│   ├── auth/                 # Authentication components
│   ├── design-system/        # Reusable UI components (Button, Card, etc.)
│   ├── employee/             # Employee-specific components
│   ├── onboarding/           # Onboarding forms and related UIs
│   └── ...                   # Other shared components
├── contexts/                 # React Contexts (e.g., AuthContext)
├── docs/                     # Project documentation (README, Architecture, Workflows)
├── md_files/                 # Markdown files used as RAG knowledge base
├── services/                 # Frontend API integration and AI services
├── utils/                    # Utility functions
├── .env                      # Environment variables (API keys, etc.)
├── .gitignore                # Git ignore file
├── package.json              # Frontend dependencies and scripts
├── README.md                 # This file
└── ...                       # Other configuration files (tsconfig, vite.config)
```

## Contributing

Contributions are welcome! Please fork the repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## License

(To be determined)
