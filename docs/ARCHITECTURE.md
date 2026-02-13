# DerivHR Platform - Architecture Overview

The DerivHR platform is built as a Single Page Application (SPA) with a Python Flask backend. It employs a modern, AI-first approach leveraging Google Gemini and OpenRouter models for intelligent HR automation.

## 1. Stacked Architecture Diagram

```mermaid
graph TD
    subgraph Client (Frontend - React/TypeScript)
        A[Browser UI - React Components] --> B(Design System, Routing)
        B --> C(API Services, Auth Context)
    end

    subgraph Server (Backend - Python/Flask)
        D[Flask API Endpoints] --> E(HR Agent - JD Analysis, Contract Params)
        D --> F(Document Generation - FPDF)
        D --> G(RAG Engine - LlamaIndex)
        D --> H(Database - SQLite)
    end

    subgraph LLM Providers
        I[Google Gemini API]
        J[OpenRouter API]
    end

    subgraph External Data Sources
        K[MD Files (Job Descriptions, Policies)]
        L[Local Storage (Frontend Session, Profile)]
    end

    C -- HTTP Requests --> D
    E -- LLM Calls --> I
    E -- LLM Calls --> J
    F -- Uses Data From --> H
    F -- Uses Data From --> E
    G -- Indexes --> K
    H -- Read/Write --> L
    D -- Read/Write --> H
    D -- Reads --> K
```

## 2. Component-Level Breakdown

### **Client (Frontend - React/TypeScript)**

*   **User Interface (UI)**: Built with React components, leveraging TypeScript for type safety.
*   **Design System**: A custom component library (`components/design-system`) provides reusable, styled UI elements (Buttons, Cards, Typography, SignaturePad) for a consistent and professional user experience.
*   **Routing**: Implemented with React Router to manage different views (Dashboard, Onboarding, My Documents, etc.).
*   **State Management**: React's `useState` and `useContext` (e.g., `AuthContext`) manage local and global application state.
*   **API Services (`services/api.ts`)**: Handles communication with the Flask backend, abstracting API calls for chat, document generation, and employee management.
*   **AI Services (`services/geminiService.ts`)**: Centralized logic for interacting with external LLM providers. Includes:
    *   **Model Selection**: Chooses the best available LLM based on task requirements and configured preferences.
    *   **Fallback & Retry**: Implements robust retry mechanisms with exponential backoff and multi-provider fallback (Gemini -> OpenRouter) to ensure resilience against API rate limits.
    *   **Resume Parsing**: Utilizes Gemini's multimodal capabilities for extracting data from uploaded resumes.
*   **Utilities (`utils/`)**: Helper functions for various frontend tasks.

### **Server (Backend - Python/Flask)**

*   **Flask Application**: Provides RESTful API endpoints for the frontend.
*   **API Endpoints (`app/routes/`)**: Organized into blueprints (`chat.py`, `documents.py`, `hr_agent.py`, `onboarding.py`) to handle specific domains.
*   **HR Agent (`app/hr_agent.py`)**: The core intelligence layer for processing HR-related AI tasks.
    *   **Job Description Analysis**: Analyzes JDs from various sources (text, RAG knowledge base) to extract structured information (position, salary, benefits).
    *   **Contract Parameter Generation**: Uses JD analysis to generate parameters for contracts.
    *   **LLM Integration**: Communicates with external LLMs (Gemini, OpenRouter) via the `_llm_complete_with_retry` method for robust AI interactions.
*   **Document Generation (`app/document_generator.py`)**: Responsible for generating various PDF documents (contracts, offer letters, comprehensive application forms) using `xhtml2pdf` (which uses `FPDF` internally) and Jinja2 templates.
*   **RAG Engine (`llama_index`)**: Powers the knowledge base for JD suggestions and policy queries. Indexes Markdown files (`md_files/`) containing HR-related information.
*   **Database (`app/database.py`)**: Manages SQLite interactions for storing generated document metadata and employee onboarding progress.

### **LLM Providers**

*   **Google Gemini API**: Used for advanced language understanding, generation, multimodal processing (resume parsing), and HR-specific AI tasks.
*   **OpenRouter API**: Serves as a critical fallback for LLM calls. Provides access to a wide range of open-source and commercial models (e.g., Deepseek, Nemotron), enhancing resilience against Gemini API rate limits.

### **Data Storage**

*   **SQLite Database (`instance/hr_platform.sqlite`)**: Stores metadata about generated documents, employee onboarding statuses, and other structured data.
*   **Markdown Files (`md_files/`)**: Acts as the RAG knowledge base, containing job descriptions, policy documents, and other HR-related textual data for AI context.
*   **Local Storage (Browser)**: Used by the frontend for session management (authentication, employee profiles for onboarding flow) to provide a seamless user experience.
*   **Temporary Data (`instance/temp_data`)**: Stores intermediate JSON payloads and generated PDF files on the backend before serving them to the client.

## 3. Deployment Considerations

*   **Frontend**: Served by Vite (development) and can be built into static assets for any web server (e.g., Nginx, Apache, Cloudflare Pages).
*   **Backend**: A Python Flask application, suitable for deployment on platforms like Render, AWS Elastic Beanstalk, Google Cloud Run, or a custom VPS.
*   **Environment Variables**: Relies heavily on `.env` files for API keys (`GOOGLE_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`), which must be securely configured in the deployment environment.
*   **Scalability**: The modular design allows for independent scaling of frontend, backend, and external AI services. The LLM fallback mechanism enhances overall system availability.