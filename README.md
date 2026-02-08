# DerivHR AI Platform

An AI-powered HR management platform for modern workforce operations with RAG-based Q&A and smart contract generation.

**Deriv014 AI Hackathon Virtual Round - 07-08 Feb 2026**

## 🚀 Features

### Core Functionality
- **New Employee Onboarding**: AI-powered onboarding with dual mode interface (Form Mode / AI Chat Mode)
- **RAG-based Q&A**: Ask questions about company policies, handbooks, leave policies, etc.
- **Smart Contract Generation**: Automated employment contract generation for Malaysia & Singapore
- **Document Generation**: AI-powered compliance documents
- **Leave Management**: Global E-Leave system with approval workflows
- **Workforce Analytics**: AI-driven insights into workforce health
- **Knowledge Base**: Centralized document and policy management with RAG

### Technical Features
- Dual Mode Interface: Form Mode (structured) or AI Chat Mode (conversational)
- 4-Step Wizard: Personal Info → Employment → Compliance → Review
- Real-time Validation & AI-Generated Plans
- RAG (Retrieval Augmented Generation) for policy Q&A
- Contract templates for Malaysia (MY) and Singapore (SG)

## 📁 Project Structure

```
DerivHR/
├── backend/                  # Python Flask API
│   ├── app/
│   │   ├── rag.py           # RAG implementation
│   │   ├── document_generator.py  # Contract generation
│   │   ├── models.py        # Database models
│   │   ├── routes/          # API endpoints
│   │   │   ├── chat.py      # RAG chat endpoint
│   │   │   ├── documents.py # Document generation
│   │   │   └── onboarding.py # Onboarding API
│   │   └── config.py        # Configuration
│   ├── templates/           # HTML contract templates
│   └── requirements.txt     # Python dependencies
├── md_files/                # Company policies & handbooks
│   ├── deriv_my_*.md       # Malaysia documents
│   └── deriv_sg_*.md       # Singapore documents
├── components/              # React components
│   ├── auth/               # Authentication
│   ├── employee/           # Employee portal
│   ├── onboarding/         # Onboarding components
│   └── ...                 # Other features
├── services/
│   └── geminiService.ts    # AI service integration
└── types.ts                # TypeScript definitions
```

## 🛠️ Installation

### Backend Setup (Python/Flask)

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=sqlite:///deriv_hr.db
```

5. Run the backend:
```bash
python run.py
```

Backend will run on `http://localhost:5000`

### Frontend Setup (React/TypeScript)

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

3. Run development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3002`

## 🔧 Usage

### RAG-based Q&A System
The platform includes a comprehensive RAG system that can answer questions about:
- Company policies (Malaysia & Singapore)
- Employee handbooks
- Leave policies
- IT & Data policies
- Job descriptions

Example queries:
- "What is the annual leave policy in Malaysia?"
- "How do I request sick leave?"
- "What are the working hours in Singapore office?"

### Contract Generation
Generate employment contracts automatically:
1. Navigate to Smart Contracts section
2. Enter employee details
3. Select country (Malaysia/Singapore)
4. System generates compliant contract using templates

### Employee Onboarding
1. Click **"New Employee Onboarding"** on login page
2. Choose Form Mode or AI Chat Mode
3. Complete 4-step wizard
4. Get AI-generated onboarding plan


### Slack Integration (Backend + Frontend)

DerivHR supports Slack as an external interaction channel, allowing employees to ask HR-related questions directly from Slack using the same RAG-based backend logic.

#### How it works (Architecture)
- Slack messages are received via **Slack Socket Mode**
- Messages are routed to the **same RAG engine** used by the web chatbot
- Responses are sent back to Slack in real time
- Frontend provides a shortcut to open the Slack bot (handoff to Slack)

> Slack bots are workspace-scoped. Users must be invited to the workspace where the DerivHR bot is installed.

---

#### Backend Setup (Slack Bot)

**Required Environment Variables**
SLACK_BOT_TOKEN=xoxb-xxxxxxxx
SLACK_APP_TOKEN=xapp-xxxxxxxx

**library**
pip install slack-bolt python-dotenv

# Run Order
** Terminal 1 – Start backend (RAG + API)
python run.py

** Terminal 2 – Start Slack bot (Socket Mode)
python slack_socket.py


## 🔌 API Reference

### Backend API Endpoints

**Chat/RAG:**
- `POST /api/chat` - Ask questions about policies

**Documents:**
- `POST /api/documents/generate` - Generate contracts
- `GET /api/documents/:id` - Get document by ID

**Onboarding:**
- `POST /api/onboarding/employee` - Create new employee
- `GET /api/onboarding/employees` - List all employees

See [backend/API_REFERENCE.md](backend/API_REFERENCE.md) for detailed API documentation.

## 🧠 Technologies

### Backend
- **Python 3.x** - Core language
- **Flask** - Web framework
- **LangChain** - RAG framework
- **OpenAI API** - LLM for RAG
- **SQLite** - Database

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Google Gemini AI** - AI features
- **Recharts** - Data visualization

## 📊 Data Files

The `md_files/` directory contains company documentation:
- Company information (MY/SG)
- Employee handbooks (MY/SG)
- Leave policies (MY/SG)
- IT & Data policies (MY/SG)
- Job descriptions (MY/SG)

These files are used by the RAG system to answer employee questions.

## 🚀 Deployment

### Backend
1. Set production environment variables
2. Use production WSGI server (gunicorn):
```bash
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

### Frontend
1. Build the application:
```bash
npm run build
```
2. Deploy the `dist` folder to your hosting provider

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 💬 Support

For issues and questions, please open an issue on GitHub.
