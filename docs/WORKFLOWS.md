# DerivHR Workflow Documentation

This document outlines the key user workflows within the DerivHR platform, highlighting the interactions and automated processes.

## 1. HR Admin: Onboarding a New Employee

This workflow details how an HR administrator initiates and manages the onboarding process for a new hire.

### **Steps:**

1.  **Access Onboarding Management**:
    *   HR Admin logs into the platform.
    *   Navigates to the "Onboarding Management" section (or clicks "New Employee" from the Dashboard).
    *   Observes the "Onboarding Overview" dashboard showing total hires, active onboarding, completed tasks, and average progress.

2.  **Initiate New Employee Onboarding**:
    *   Clicks the "New Employee" button.
    *   Chooses between "Form Mode" (structured input) or "AI Chat Mode" (conversational guided onboarding).

3.  **Data Entry & AI Assistance (Form Mode)**:
    *   **Personal Information**:
        *   HR Admin inputs basic employee details (Full Name, Email).
        *   **_Feature: Resume Auto-fill_**: HR Admin can upload the employee's resume (PDF, image). The system uses AI (Gemini Multimodal/OpenRouter) to extract relevant data and pre-fill form fields (Name, Email, Role, Department, etc.), significantly reducing manual data entry and ensuring data accuracy.
    *   **Employment Details**: Inputs role, department, start date, and salary.
    *   **Compliance Information**: Specifies nationality (e.g., Malaysian or Non-Malaysian) and NRIC for Malaysian employees, with AI guidance on statutory requirements.
    *   **Review & Submit**: HR Admin reviews all details. The system outlines what the AI will generate (personalized task list, compliance checklist, automated document generation, culture integration plan).

4.  **AI Onboarding Journey Generation**:
    *   Upon submission, the system's AI (Gemini/OpenRouter, acting as an HR Onboarding Specialist) analyzes the provided data (including potential Job Description context) and dynamically generates a tailored onboarding journey.
    *   This includes: statutory requirements, 90-day roadmap, IT provisioning recommendations, and cultural integration suggestions.

5.  **Post-Creation Actions**:
    *   **_Feature: Start Employee Journey_**: A prominent, pulsing "Start Onboarding Journey" button appears.
    *   Clicking this button performs a "view-as" action: the system logs the HR Admin out (conceptually) and logs the new employee in (using their profile data stored in localStorage).
    *   The employee is then automatically redirected to their personal "Employee Dashboard" or "My Onboarding" portal.

## 2. Employee: Completing Onboarding Tasks

This workflow describes the experience of a new employee completing their assigned onboarding tasks.

### **Steps:**

1.  **Access Employee Portal**:
    *   New Employee (or HR Admin viewing as employee) accesses the platform.
    *   Navigates to "My Onboarding" or "My Documents".
    *   Views their personalized task list, progress, and pending documents.

2.  **Task Completion**:
    *   Employee clicks on an available task (e.g., "Sign Offer Letter", "Sign Employment Contract").
    *   **_Feature: Digital Signature_**: For tasks requiring a signature, a `SignaturePad` appears. The employee can:
        *   **Draw** their signature using a mouse or touchscreen.
        *   **Type** their name, which is rendered in a script font as a digital signature.
    *   For upload tasks, a file upload interface is provided.
    *   Upon successful completion (including a valid digital signature where required), the task is marked as "Completed", and the next task in the sequence may be unlocked.

3.  **Document Management**:
    *   **My Documents**: Employee can view the status of their "Onboarding Application", "Offer Acceptance", and "Contract Document".
    *   **_Feature: Comprehensive Document Download_**: Employee clicks "Download PDF" for any completed document. The system retrieves the relevant data and generates a detailed, legally compliant PDF (e.g., the "Onboarding Application" PDF generated includes all employment details, policies, and contractual agreements).

4.  **HR Chat Assistant Support**:
    *   Employee accesses the "Chat Assistant" from their portal.
    *   Interacts with the AI HR Onboarding Assistant for queries about:
        *   Their onboarding progress.
        *   Status of specific documents.
        *   Company policies.
        *   Role-specific questions (leveraging JD context).
        *   The assistant is configured to only answer questions about the current employee's profile and to gracefully decline requests for other employee data.

## 3. HR Admin: Monitoring & Analytics

HR Admins use the platform's insights and management tools.

### **Steps:**

1.  **Onboarding Progress Monitoring**:
    *   Views the "Onboarding Management" dashboard, showing aggregated stats (`Total Hires`, `Active`, `Completed`, `Avg. Progress`).
    *   The "Avg. Progress" card provides AI-driven insights (e.g., "Workflows are highly efficient" or "AI suggests checking 'IT Setup' for pending tasks") and indicates potential bottlenecks.
    *   Filters and searches through the list of employees to track individual progress.

2.  **Workforce Analytics**:
    *   Navigates to "Workforce Analytics".
    *   Views data visualizations (e.g., Skill Gap Analysis Radar Chart).
    *   Receives AI-generated "Strategic Guidance" and "Recommended Actions" based on market trends and internal data.

3.  **E-Leave Approvals**:
    *   Navigates to "E-Leave Management".
    *   Switches to the "Approvals" view.
    *   Reviews pending leave requests from direct reports, including reasons and dates.
    *   Can "Approve" or "Reject" requests, with status updates reflected instantly.

## 4. System Resilience

The platform incorporates a robust AI model selection and fallback mechanism to ensure continuous service availability.

### **Mechanism:**

1.  **Primary Model Attempt**: Frontend and Backend services first attempt to use the designated primary AI models (e.g., specific Google Gemini versions like `gemini-2.5-flash` or preferred OpenRouter models like `deepseek/deepseek-chat`).
2.  **Rate Limit / Failure Detection**: The system detects API rate limits (HTTP 429) or other API errors.
3.  **Intelligent Fallback**:
    *   **Within Gemini**: If the primary Gemini model fails, the system automatically attempts to use lighter Gemini models (e.g., `gemini-1.5-flash`, `gemini-2.0-flash-lite`).
    *   **To OpenRouter**: If all Gemini options fail or are continuously rate-limited, the system falls back to OpenRouter.
    *   **Within OpenRouter**: OpenRouter attempts to use preferred models (`deepseek/deepseek-chat`, `google/nemotron-3-8b-base`), further ensuring a diverse set of options.
4.  **Exponential Backoff**: Retries are implemented with increasing delays to avoid exacerbating rate limits.
5.  **Graceful Degradation**: If all LLM calls fail, user-friendly error messages are displayed without crashing the application.

This multi-layered approach ensures that critical AI-driven HR functions remain accessible and responsive even under API load or temporary service disruptions.
