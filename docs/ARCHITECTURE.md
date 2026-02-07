# DerivHR Platform - Architecture & Documentation

## Overview
DerivHR is a comprehensive HR platform integrating AI-driven assistance, payroll management, and workforce analytics. It leverages Google's Gemini models for intelligent interactions and specialized tools for HR tasks.

## Key Components

### Frontend (React + Vite)
*   **`components/ChatAssistant.tsx`**: The central interface for AI interaction. Handles chat history, persona switching, and tool outputs.
*   **`components/Dashboard.tsx`**: Main landing view visualizing key metrics.
*   **`components/CandidatePortal.tsx`**: Interface for recruitment and candidate tracking.
*   **`components/DocumentGen.tsx`**: UI for AI-assisted document creation (contracts, letters).

### Services (Logic Layer)
*   **`services/geminiService.ts`**: The core AI service.
    *   **Model Routing**: Decides between "fast" (local/flash) and "reasoning" (pro) models.
    *   **RAG**: Simple in-memory Retrieval-Augmented Generation.
    *   **Generative Tasks**: Functions for contract generation and onboarding analysis.
*   **`services/messagingService.ts`**: Handles integrations with Telegram and WhatsApp for notifications.

### Utilities
*   **`utils/payroll.ts`**: A dedicated module for Malaysian payroll calculations, including EPF, SOCSO, and overtime rules.

## Data Flow
1.  **State Management**: Currently relies on React `useState` and `useEffect` within components.
2.  **API Calls**: Direct calls to Google GenAI SDK from the frontend services. *Note: In a production environment, this should be proxied through a backend to secure API keys.*

## Optimization & Refactoring Goals
1.  **Centralize Agent Logic**: Move hardcoded personas from UI to a `AgentRegistry`.
2.  **Enhance RAG**: Move from array-based memory to a vector store (or simulated equivalent for now).
3.  **Testing**: Implement unit tests for critical business logic in `payroll.ts`.

## Setup
1.  Install dependencies: `npm install`
2.  Set environment variables: `VITE_GOOGLE_API_KEY`, etc.
3.  Run dev server: `npm run dev`
