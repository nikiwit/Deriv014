import { GoogleGenAI } from "@google/genai";
import { OnboardingData, CandidateProfile } from "../types";
import { AgentConfig } from "./agentRegistry";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- RAG / Knowledge Base Memory ---
let knowledgeBaseMemory: string[] = [];

export const addToKnowledgeBase = (fileName: string, type: string) => {
    // Simulating text extraction based on file content/type for the demo
    let content = "";
    if (fileName.includes("Policy")) {
        content = `[Doc: ${fileName}] Standard company policy requires 2-factor authentication for all remote access. Remote work is capped at 3 days per week unless approved by VP.`;
    } else if (fileName.includes("Budget")) {
        content = `[Doc: ${fileName}] Q3 Hiring Budget: USD 150,000. Allocations: Engineering (60%), Sales (30%), Marketing (10%).`;
    } else if (fileName.includes("Handbook")) {
         content = `[Doc: ${fileName}] Employees are entitled to RM 1000 annual learning allowance. Mental health days are unlimited but require manager notice.`;
    } else {
        content = `[Doc: ${fileName}] Content indexed: General business data relevant to ${type}. Contains standard operating procedures for this module.`;
    }
    knowledgeBaseMemory.push(content);
};

export const getRAGContext = (): string => {
    if (knowledgeBaseMemory.length === 0) return "";
    return `\n\nRELEVANT KNOWLEDGE BASE CONTEXT (RAG):\n${knowledgeBaseMemory.join('\n')}\nUse this context to answer user queries if relevant.\n`;
};

/**
 * Centralized function to chat with a specific agent.
 * Handles RAG injection, Model Routing, and System Prompting.
 */
export const chatWithAgent = async (
    query: string,
    agent: AgentConfig
): Promise<{ response: string; modelUsed: string }> => {
    
    // 1. Build System Instruction with RAG
    let systemInstruction = agent.systemPrompt;
    systemInstruction += getRAGContext();

    // 2. Determine Routing
    const routing = determineModelRouting(query);
    let modelName = 'Local-Llama-3';

    // 3. Execute
    try {
        if (agent.modelPreference === 'local' || (routing === 'local' && agent.modelPreference !== 'premium')) {
             await new Promise(resolve => setTimeout(resolve, 600)); // Simulate local inference time
             return {
                 response: "I can handle this query using my local knowledge base. For specific calculations or complex legal advice, please use the provided tools or ask a more detailed question.",
                 modelUsed: 'Local-Llama-3'
             };
        } else {
             modelName = 'Gemini-3-Pro';
             const response = await ai.models.generateContent({
                 model: 'gemini-2.5-flash',
                 contents: `Role: ${systemInstruction}
                 
                 User Query: ${query}
                 
                 Answer concisely and professionally. If specific laws apply, cite them.`,
             });
             return {
                 response: response.text || "I'm sorry, I couldn't process that request.",
                 modelUsed: 'Gemini-3-Pro'
             };
        }
    } catch (error) {
        console.error("Agent Chat Error:", error);
        return {
            response: "Error connecting to the intelligence engine.",
            modelUsed: 'Error'
        };
    }
};

// Premium Model: Used for complex contract generation
export const generateComplexContract = async (
  details: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Using Pro for complex legal reasoning
      contents: `
        You are an advanced Global Legal AI Expert specializing in International Employment Law.
        Create a detailed employment contract based on the following JSON parameters:
        ${details}

        STRICT REQUIREMENTS:
        1. Format using Markdown.
        2. Identify the specific Jurisdiction from the input and apply the correct local laws (e.g., Malaysia EA 1955, UK Employment Rights Act 1996, California Labor Code, UAE Federal Decree-Law No. 33).
        3. Cite specific statutes for the chosen jurisdiction (e.g., "Section 60F" for Malaysia, "Section 1" statement for UK).
        4. Ensure compliance with local minimum wage, working hours, and leave entitlements.
        5. Add a "Global Compliance Note" at the end highlighting any cross-border considerations if applicable.
        
        Structure: 
           - Header & Parties
           - Appointment & Jurisdiction
           - Duties & Location (Remote/Hybrid clauses)
           - Compensation (Currency specific)
           - Working Hours (Local law compliant)
           - Leave Entitlements (Annual, Sick, Public Holidays specific to region)
           - Termination & Notice
           - Governing Law
           - [AI Legal Explainer]
      `,
      config: {
        temperature: 0.2, // Low temperature for legal precision
      }
    });
    return response.text || "Error generating contract.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "## Critical Error\nUnable to generate contract due to API connectivity issues.";
  }
};

// Premium Model: Strategic Workforce Planning
export const generateStrategicInsights = async (
  marketData: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Analyze the following workforce data and provided market trends in the context of the Global Job Market (with APAC/US/EU focus):
        ${marketData}

        Provide a "Global Strategic Workforce Plan" summary.
        Include:
        1. Predicted Skill Gaps (Bullet points) - focus on AI & Digital Transformation.
        2. Regional Hiring Trends & Salary Benchmarks.
        3. Compliance Risks (e.g., EU AI Act, Pay Transparency directives).
        4. Recommendations for Global Mobility.
      `,
    });
    return response.text || "No insights generated.";
  } catch (error) {
    return "Unable to generate strategic insights at this time.";
  }
};

// Premium Model: Onboarding Analysis
export const analyzeOnboarding = async (
  data: OnboardingData
): Promise<string> => {
    try {
        const isExpat = data.nationality === 'Non-Malaysian';
        
        // Inject specific Visa requirements if Non-Malaysian
        const visaPrompt = isExpat ? `
        5. **🛂 Visa & Immigration Strategy (ESD/MDEC)**:
           - **Eligibility Check**: Based on RM${data.salary}, determine Employment Pass Category (I, II, or III).
           - **Document Checklist**: List specific docs required (Passport all pages, Academic Certs, Cool-down period check).
           - **Timeline**: Estimate processing time for Approval Stage 1 & 2.
           - **Tax**: Mention Tax Clearance letter requirement if applicable for previous employment.
        ` : '';

        // Inject NRIC verification if Malaysian
        const nricSection = data.nationality === 'Malaysian' && data.nric ? `
        5. **🆔 Identity Verification (NRIC)**:
           - **NRIC Provided**: ${data.nric}
           - **Status**: ✅ FORMAT VERIFIED BY FRONTEND.
           - **Statutory**: Confirm eligibility for EPF (KWSP) and SOCSO (PERKESO) based on citizenship.
        ` : '';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                Act as a Senior HR Onboarding Specialist & Global Mobility Expert. 
                Analyze the following new hire data and generate a comprehensive, modern Onboarding Journey.

                Employee Data:
                ${JSON.stringify(data)}

                Requirements:
                1. **🔍 Immediate Compliance & Statutories**: 
                   - Identify statutory registrations (EPF/SOCSO/EIS/PCB).
                   - Verify Minimum Wage compliance (Current MY Minimum Wage).
                2. **🚀 First 90 Days Roadmap**:
                   - **Day 1**: Welcome & Logistics.
                   - **Week 1**: Quick wins & "Buddy" assignment (Suggest a specific role to pair with).
                   - **Month 1**: Key project & certification goal.
                3. **💻 IT & Logistics Provisioning**:
                   - Recommend specific equipment based on Role (e.g., Mac vs Windows, GPU requirements).
                4. **🤝 Cultural Integration**:
                   - One unique team bonding activity suggestion.
                ${visaPrompt}
                ${nricSection}
                
                STRICT FORMATTING:
                - Use clear Markdown headings.
                - Use emojis to make it engaging 🌟.
                - Keep sections concise but actionable.
            `
        });
        return response.text || "Unable to generate onboarding plan.";
    } catch (error) {
        return "Error generating onboarding plan.";
    }
}

export const reviewCandidateSubmission = async (
    data: CandidateProfile
): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
              Act as a Payroll & Compliance Officer for a Global company (focus on Malaysia context).
              Review the following new hire submission for errors, missing info, or compliance risks.

              Candidate Data:
              ${JSON.stringify(data)}

              Tasks:
              1. **Validate Data**: Check if Bank Account number looks valid for the Bank Name (general format check). Check if Tax ID/EPF looks plausible.
              2. **Identify Risks**: E.g., if Emergency Contact is missing or same as candidate.
              3. **Generate Welcome Kit**: Based on their profile, suggest 3 Slack channels to join and 1 fun fact about their department (simulated).
              
              Output Format:
              ## ✅ Submission Status: [Approved/Needs Review]
              
              ### 🔍 Compliance Checks
              - [Item]: [Status]
              
              ### 🚀 Day 1 Recommendations
              [List]
            `
        });
        return response.text || "Submission received. Pending manual review.";
    } catch (error) {
        return "Error validating submission.";
    }
}

// Hybrid Router Logic (Simulated)
export const determineModelRouting = (query: string): 'local' | 'premium' => {
  const complexKeywords = ['act', 'section', 'law', 'legal', 'compliance', 'dismissal', 'constructive', 'court', 'industrial', 'draft', 'contract', 'global', 'expatriate', 'visa'];
  const isComplex = complexKeywords.some(keyword => query.toLowerCase().includes(keyword)) || query.length > 50;
  return isComplex ? 'premium' : 'local';
};