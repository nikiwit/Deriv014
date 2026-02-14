# DerivHR - High Level Architecture

```mermaid
flowchart LR
    %% ── User Entry ──
    USER(("User"))

    subgraph FRONTEND["Web App — React 19 · TypeScript · TailwindCSS"]
        direction TB
        UI["UI Components\n(Vite Dev Server)"]
        RESUME["Resume Upload\n(PDF / Image)"]
        SIGN["Digital Signature\nPad"]
    end

    subgraph BACKEND["Backend API — Python · Flask"]
        direction TB
        API["Flask REST API"]
        ORCH["Agent\nOrchestrator"]
        INTENT["Intent\nClassifier"]
    end

    subgraph AGENTS["Multi-Agent System — Gemini Flash"]
        direction TB
        GREETING["Greeting\n→ Static Response"]
        RAG_Q["RAG Query\n(Policy / Handbook)"]
        COMPLIANCE["Compliance\n(EPF · SOCSO · CPF)"]
        DOCGEN["Document\nGeneration"]
        SUPPORT["Employee\nSupport"]
    end

    subgraph RAG["RAG Pipeline — LlamaIndex"]
        direction TB
        EMB["OpenAI\ntext-embedding-\n3-small"]
        SEARCH["Vector\nSimilarity Search"]
        TOP5["Return Top 5\nChunks"]
    end

    subgraph KNOWLEDGE["Knowledge Base"]
        direction TB
        MD["12 Markdown\nPolicy Docs"]
        MY["🇲🇾 Malaysia\n(EA 1955)"]
        SG["🇸🇬 Singapore\n(EA Cap. 91)"]
    end

    subgraph VECTORSTORE["Vector Storage"]
        VS["LlamaIndex\nVector Index\n(Persisted)"]
    end

    subgraph LLM["LLM Layer"]
        direction TB
        GEMINI["Gemini Flash\n(Primary)"]
        OPENROUTER["OpenRouter\n· Deepseek\n(Fallback)"]
    end

    subgraph DATA["Data Layer — Supabase (PostgreSQL)"]
        direction TB
        SUPA_DB["Supabase DB\n(Employees · Chat\nHistory · Documents)"]
        SUPA_AUTH["Supabase Auth\n(User Sessions)"]
        SUPA_STORE["Supabase Storage\n(File Uploads)"]
    end

    subgraph OUTPUT["Document Output"]
        direction TB
        XHTML["xhtml2pdf\n+ Jinja2 Templates"]
        PDF["Generated\nContracts (PDF)"]
    end

    %% ── Main Flow ──
    USER -->|"HTTPS"| FRONTEND
    FRONTEND -->|"REST /api/*"| API
    API --> ORCH
    ORCH --> INTENT

    %% ── Intent Routing ──
    INTENT -->|"Greeting"| GREETING
    INTENT -->|"Policy / Handbook"| RAG_Q
    INTENT -->|"Calculations"| COMPLIANCE
    INTENT -->|"Contracts / Forms"| DOCGEN
    INTENT -->|"Leave / Benefits"| SUPPORT

    %% ── RAG Flow ──
    RAG_Q --> EMB
    EMB -->|"Query Vector"| SEARCH
    SEARCH --> VS
    VS -->|"Top 5 Chunks"| TOP5
    TOP5 --> GEMINI

    %% ── Knowledge Indexing ──
    MD --- MY
    MD --- SG
    MD -->|"Indexed on Startup"| VS

    %% ── LLM ──
    COMPLIANCE --> GEMINI
    SUPPORT --> GEMINI
    DOCGEN --> GEMINI
    GEMINI -.->|"Fallback"| OPENROUTER

    %% ── Doc Gen ──
    DOCGEN --> XHTML
    XHTML --> PDF

    %% ── Data ──
    API --> SUPA_DB
    API --> SUPA_AUTH
    FRONTEND -->|"Direct Client"| SUPA_AUTH
    FRONTEND -->|"Direct Client"| SUPA_STORE

    %% ── Resume ──
    RESUME -->|"Multimodal\n(Gemini Vision)"| GEMINI

    %% ── Styling ──
    style FRONTEND fill:#DBEAFE,stroke:#2563EB,stroke-width:2px
    style BACKEND fill:#D1FAE5,stroke:#059669,stroke-width:2px
    style AGENTS fill:#FEF3C7,stroke:#D97706,stroke-width:2px
    style RAG fill:#FCE7F3,stroke:#DB2777,stroke-width:2px
    style KNOWLEDGE fill:#CCFBF1,stroke:#0D9488,stroke-width:2px
    style VECTORSTORE fill:#EDE9FE,stroke:#7C3AED,stroke-width:2px
    style LLM fill:#FEE2E2,stroke:#DC2626,stroke-width:2px
    style DATA fill:#F3E8FF,stroke:#7C3AED,stroke-width:2px
    style OUTPUT fill:#FEF9C3,stroke:#CA8A04,stroke-width:2px
```

## Tech Stack At-a-Glance

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS | Web portal (HR Admin + Employee) |
| **Backend** | Python, Flask | REST API, orchestration |
| **AI Framework** | LlamaIndex | RAG pipeline, vector indexing |
| **Primary LLM** | Google Gemini Flash | Intent classification, generation, vision |
| **Embeddings** | OpenAI text-embedding-3-small | Document vectorization |
| **Fallback LLM** | OpenRouter (Deepseek) | Resilient multi-tier fallback |
| **Database** | Supabase (PostgreSQL) | Employees, chat history, documents, auth, file storage |
| **Doc Generation** | xhtml2pdf + Jinja2 | Contract PDF rendering |

## Estimated AI Costs (~1,000 queries/day)

| Service | Monthly Cost |
|---------|-------------|
| Gemini Flash | ~$5–15 |
| OpenAI Embeddings | ~$2–5 |
| Supabase | Free tier |
| **Total** | **~$20–30/month** |
