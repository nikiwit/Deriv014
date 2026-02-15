🎯 1. Goal
Telegram bot where:
HR Manager can ask:
“How is the progress today?”
“How many employees are onboarding?”
“Show me employees who completed training this month”
“Any delayed onboarding cases?”
“Who didn’t finish mandatory training?”
And get:
Human-like summary
OR structured table
OR both
🏗 2. High-Level Architecture
HR Manager (Telegram)
        ↓
Telegram Bot API
        ↓
Your Backend API (HR System)
        ↓
Business Logic Layer
        ↓
Database (Employees, Onboarding, Training, etc.)
        ↓
OpenAI (Optional - Natural Language Processing + Formatting)
🧠 3. Logical Architecture Layers
1️⃣ Telegram Layer
Telegram Bot (via BotFather)
Webhook endpoint in your backend
Receives messages
2️⃣ NLP Layer (Intent Detection)
Two options:
Option A – Simple (Rule-Based)
Detect keywords:
"onboarding"
"training"
"how many"
"delayed"
"completed"
Faster and cheaper.
Option B – AI-Powered (Recommended)
Use OpenAI to convert:
User input → structured query
Example:
User:
“How is onboarding progress this week?”
OpenAI returns structured JSON:
{
  "intent": "onboarding_summary",
  "time_range": "this_week"
}
Then your backend runs actual SQL query.
👉 IMPORTANT:
Do NOT let OpenAI access database directly.
Always let it generate structured intent only.
🗄 4. Suggested Database Structure (Simplified)
employees
id
name
department
role
employment_status
join_date
onboarding
id
employee_id
status (pending, in_progress, completed)
start_date
expected_completion
actual_completion
training
id
employee_id
training_name
mandatory (true/false)
completion_status
completion_date
🔄 5. Data Flow Example
Example Question:
“How many employees are onboarding right now?”
Flow:
1️⃣ Telegram sends message
2️⃣ Backend receives via webhook
3️⃣ Send message to OpenAI:
System Prompt:
"You are an HR intent classifier. Return only structured JSON."

User:
"How many employees are onboarding right now?"
4️⃣ OpenAI returns:
{
  "intent": "count_onboarding",
  "status": "in_progress"
}
5️⃣ Backend executes SQL:
SELECT COUNT(*) 
FROM onboarding 
WHERE status = 'in_progress';
6️⃣ Backend formats result
7️⃣ Optional: Send result to OpenAI to generate human-style message:
{
  "total_onboarding": 3,
  "total_employees": 42
}
OpenAI returns:
Currently, 3 employees are in the onboarding process. Overall workforce stands at 42 employees. Everything is progressing smoothly with no major delays detected.
8️⃣ Send back to Telegram
🧱 6. Clean Production Architecture
┌──────────────────────┐
│ HR Manager (Telegram)│
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Telegram Webhook API │
└──────────┬───────────┘
           ↓
┌──────────────────────────────┐
│ HR Backend (Node / Python)  │
│                              │
│ 1. Auth check (Manager only) │
│ 2. Intent Parser (OpenAI)    │
│ 3. Query Builder             │
│ 4. Business Logic            │
│ 5. Response Formatter        │
└──────────┬───────────────────┘
           ↓
┌──────────────────────┐
│ PostgreSQL Database  │
└──────────────────────┘
           ↓
┌──────────────────────┐
│ OpenAI (Formatting)  │
└──────────────────────┘
