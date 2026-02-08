# HR Multi-Agent System Implementation

## Overview

This document describes the comprehensive HR AI agent system implemented for DerivHR with multi-jurisdictional expertise (Malaysia/Singapore) and professional markdown responses.

**Status: ✅ COMPLETE**

---

## Completed Changes

### Phase 1: Frontend Markdown Rendering ✅

**Dependencies Installed:**
```bash
npm install react-markdown remark-gfm @tailwindcss/typography
```

**New Component Created:**
- `components/MarkdownRenderer.tsx` - React component for rendering markdown with:
  - Custom table styling
  - Code block formatting
  - Header hierarchy (h1-h4)
  - List styling (ul/ol)
  - Blockquotes for risk levels
  - Link handling

**Files Modified:**
- `services/geminiService.ts` - Removed all `removeMarkdown()` calls
- `components/ChatAssistant.tsx` - Added MarkdownRenderer for assistant messages
- `components/EmployeeChatAssistant.tsx` - Added MarkdownRenderer for assistant messages

### Phase 2: Backend Agents Module ✅

**New Files Created in `backend/app/agents/`:**

| File | Purpose |
|------|---------|
| `__init__.py` | Module exports |
| `prompts.py` | All agent system prompts with professional HR persona |
| `intent.py` | Intent classifier for query routing |
| `orchestrator.py` | Main orchestration logic |

### Phase 3: API Integration ✅

1. **Update RAG System Prompt** (`backend/app/rag.py`) ✅
   - Enhanced with Main HR Agent prompt
   - Multi-jurisdictional expertise (MY/SG)
   - Professional markdown formatting

2. **Add Agent Endpoint** (`backend/app/routes/chat.py`) ✅
   ```python
   @bp.route("/agent", methods=["POST"])
   def agent_chat():
       # Route: POST /api/chat/agent
       # Returns: { response, sources, agent_used, confidence, jurisdiction }
   ```

3. **Update Types** (`types.ts`) ✅
   - Added `agentUsed`, `jurisdiction`, `confidence`, `sources` to Message interface
   - Added `ChatSource` interface

4. **Update Agent Registry** (`services/agentRegistry.ts`) ✅
   - Added 5 new HR agent configurations
   - Agent capabilities, icons, theme colors
   - Helper functions for UI integration

---

## Agent Architecture

### Main HR Agent (Orchestrator)
- **Role**: Chief HR Intelligence Officer
- **Expertise**: Multi-jurisdictional (MY/SG), Employment law, Statutory knowledge
- **Triggers**: Default handler, routes complex queries

### Policy Research Agent
- **Role**: Deep Policy Analysis
- **Triggers**: "policy", "handbook", "entitled", "compare MY vs SG"
- **Capabilities**: Cross-document analysis, policy interpretation

### Compliance Agent
- **Role**: Statutory & Regulatory
- **Triggers**: "EPF", "SOCSO", "CPF", "calculate", "overtime"
- **Capabilities**: Calculations, risk assessment, regulatory checks

### Document Agent
- **Role**: Forms & Contracts
- **Triggers**: "contract", "checklist", "generate", "submit"
- **Capabilities**: Document guidance, form checklists

### Employee Support Agent
- **Role**: Day-to-Day Assistance
- **Triggers**: "leave", "onboarding", "apply", "balance"
- **Capabilities**: General HR support, benefits, onboarding

---

## Jurisdictional Expertise

### Malaysia (Deriv Solutions Sdn Bhd)
| Statute | Key Provisions |
|---------|----------------|
| Employment Act 1955 | Working hours, leave, termination |
| EPF/KWSP | 11% employee, 12-13% employer |
| SOCSO/PERKESO | Employment injury, invalidity |
| EIS | 0.2% each |
| PCB/MTD | Monthly tax deduction |

### Singapore (Deriv Solutions Pte Ltd)
| Statute | Key Provisions |
|---------|----------------|
| Employment Act Cap. 91 | KETs, working hours, leave |
| CPF | Age-based rates, 17-20% |
| SDL | 0.25% of remuneration |
| EFMA | Work passes (EP, S Pass) |

---

## Response Standards

1. **Citations**: Always reference specific statutes and jurisdictions `[MY]` or `[SG]`
2. **Formatting**: Use markdown (headers, tables, bullet points, code blocks)
3. **Calculations**: Show formula → values → result
4. **Risk Levels**: `[LOW RISK]` `[MEDIUM RISK]` `[HIGH RISK]`
5. **Dual Jurisdiction**: Present BOTH if unclear

---

## Testing Verification

1. **Markdown Rendering**: Query "What are the leave entitlements?" - verify tables render
2. **Agent Routing**: Test each agent type trigger
3. **Jurisdiction Detection**: Test MY-specific, SG-specific, ambiguous queries
4. **Professional Tone**: Verify citations, formatting, risk levels

---

## File Summary

### New Files (5)
- ✅ `components/MarkdownRenderer.tsx`
- ✅ `backend/app/agents/__init__.py`
- ✅ `backend/app/agents/prompts.py`
- ✅ `backend/app/agents/intent.py`
- ✅ `backend/app/agents/orchestrator.py`

### Modified Files (8)
- ✅ `services/geminiService.ts` - Removed markdown stripping
- ✅ `components/ChatAssistant.tsx` - Added MarkdownRenderer
- ✅ `components/EmployeeChatAssistant.tsx` - Added MarkdownRenderer
- ✅ `backend/app/routes/documents.py` - Fixed os import
- ✅ `backend/app/rag.py` - Enhanced system prompt
- ✅ `backend/app/routes/chat.py` - Added agent endpoint
- ✅ `types.ts` - Added agent fields
- ✅ `services/agentRegistry.ts` - New agent configs

---

## API Endpoints

### Existing
- `POST /api/chat` - Standard chat endpoint
- `POST /api/chat/stream` - Streaming chat endpoint
- `GET /api/chat/history/<session_id>` - Get chat history

### New
- `POST /api/chat/agent` - Agent-routed chat endpoint
  - Request: `{ message, session_id?, jurisdiction?, employee_context? }`
  - Response: `{ session_id, response, sources, agent_used, confidence, jurisdiction, routing_reason }`
