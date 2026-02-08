"""
HR Agent Service - Job Description Understanding and Contract Generation

This agent can:
1. Understand job descriptions from multiple sources (LinkedIn, web search, RAG)
2. Extract relevant information for contract generation
3. Generate employment contracts based on JD analysis
"""

import json
import logging
import re
import time # Import time for delays
import os   # Import os to get environment variable
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

import requests # Import requests for OpenRouter API calls
from llama_index.core import VectorStoreIndex, Settings
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.llms import LLM # Import generic LLM type for Settings.llm

from app.models import ContractParams

logger = logging.getLogger(__name__)


@dataclass
class JDAnalysis:
    """Result of job description analysis."""
    position: str
    department: str
    jurisdiction: str  # "MY" or "SG"
    salary_range: Tuple[float, float]
    responsibilities: List[str]
    qualifications: List[str]
    benefits: List[str]
    work_model: str
    reporting_to: str
    confidence_score: float
    sources: List[Dict]


@dataclass
class ContractGenerationRequest:
    """Request for contract generation."""
    employee_name: str
    nric: str
    employee_address: str
    start_date: str
    jd_source: str  # "linkedin", "web", "rag", "manual"
    jd_data: Dict  # Raw JD data or URL
    jurisdiction: Optional[str] = None  # Auto-detected if not provided


class HRAgent:
    """HR Agent for job description understanding and contract generation."""
    
    def __init__(self, app_config: Dict):
        """Initialize the HR agent."""
        self.config = app_config
        
        # Initialize LLM for JD analysis
        self.llm = OpenAI(
            model=app_config["LLM_MODEL"],
            api_key=app_config["OPENAI_API_KEY"],
            temperature=0.1,
        )
        
        # Initialize embedding model
        self.embed_model = OpenAIEmbedding(
            model=app_config["EMBEDDING_MODEL"],
            api_key=app_config["OPENAI_API_KEY"],
        )
        
        # Load job description knowledge base
        self.jd_index = self._load_jd_knowledge_base()
        
        # OpenRouter config
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY") # Load from environment
        self.openrouter_model = "deepseek/deepseek-chat" # Default to deepseek as requested
        
        # Set default LLM for LlamaIndex Settings
        Settings.llm = self.llm # type: ignore
        Settings.embed_model = self.embed_model # type: ignore

        logger.info("HR Agent initialized successfully")

    def _llm_complete_with_retry(self, prompt: str, max_retries: int = 3, initial_delay: int = 2) -> str:
        """
        Call LLM (Gemini then OpenRouter) with retry and exponential backoff.
        """
        # --- Try Gemini first ---
        for i in range(max_retries):
            try:
                response = self.llm.complete(prompt)
                logger.info(f"Gemini LLM call successful (attempt {i+1}).")
                return str(response).strip()
            except Exception as e:
                logger.warning(f"Gemini LLM call failed (attempt {i+1}/{max_retries}): {e}")
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "quota" in str(e).lower():
                    delay = initial_delay * (2 ** i)
                    logger.info(f"Retrying Gemini in {delay} seconds...")
                    time.sleep(delay)
                else:
                    break # Break if it's not a rate limit, let it fall to OpenRouter or re-raise later
        
        # --- Fallback to OpenRouter ---
        if self.openrouter_api_key:
            logger.warning("Gemini attempts exhausted or failed. Falling back to OpenRouter...")
            try:
                headers = {
                    "Authorization": f"Bearer {self.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://derivhr.com", # Required by OpenRouter
                    "X-Title": "DerivHR" # Required by OpenRouter
                }
                messages = [{"role": "user", "content": prompt}]
                payload = {
                    "model": self.openrouter_model,
                    "messages": messages,
                    "temperature": 0.1 # Keep it low for HR context
                }
                
                response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=30)
                response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
                result = response.json()
                
                if result and result.get("choices") and result["choices"][0].get("message"):
                    return result["choices"][0]["message"]["content"]
                else:
                    raise Exception(f"OpenRouter returned unexpected format: {result}")

            except requests.exceptions.RequestException as e:
                logger.error(f"OpenRouter LLM call failed: {e}")
                raise Exception(f"OpenRouter LLM call failed: {e}. Check API key and model availability.")
            except Exception as e:
                logger.error(f"Error processing OpenRouter response: {e}")
                raise Exception(f"Failed to get response from OpenRouter: {e}")
        
        raise Exception("All LLM attempts (Gemini and OpenRouter) failed or OpenRouter API key is missing.")

    
    def _load_jd_knowledge_base(self) -> Optional[VectorStoreIndex]:
        """Load job description knowledge base from markdown files."""
        try:
            from llama_index.core import SimpleDirectoryReader
            
            md_dir = self.config["MD_FILES_DIR"]
            jd_files = [
                "deriv_my_job_descriptions.md",
                "deriv_sg_job_descriptions.md"
            ]
            
            documents = []
            for jd_file in jd_files:
                file_path = f"{md_dir}/{jd_file}"
                try:
                    from llama_index.core import Document
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Determine jurisdiction from filename
                    jurisdiction = "MY" if "_my_" in jd_file.lower() else "SG"
                    
                    doc = Document(
                        text=content,
                        metadata={
                            "file_name": jd_file,
                            "jurisdiction": jurisdiction,
                            "type": "job_description"
                        }
                    )
                    documents.append(doc)
                    logger.info(f"Loaded JD file: {jd_file}")
                except FileNotFoundError:
                    logger.warning(f"JD file not found: {jd_file}")
            
            if documents:
                # Use class's LLM and embed_model for Settings
                Settings.llm = self.llm # type: ignore
                Settings.embed_model = self.embed_model # type: ignore
                index = VectorStoreIndex.from_documents(documents)
                logger.info(f"Created JD knowledge base with {len(documents)} documents")
                return index
            
            return None
        except Exception as e:
            logger.error(f"Error loading JD knowledge base: {e}")
            return None
    
    def analyze_jd_from_text(self, jd_text: str, jurisdiction: Optional[str] = None) -> JDAnalysis:
        """Analyze job description from raw text."""
        logger.info("Analyzing JD from text")
        
        # Use LLM to extract structured information
        prompt = f"""
You are an HR expert analyzing job descriptions. Extract the following information from the job description below:

Job Description:
{jd_text}

Extract and return a JSON object with these fields:
- position: The job title
- department: The department/team
- jurisdiction: "MY" for Malaysia or "SG" for Singapore (infer from context, currency, company name)
- salary_range: [min_salary, max_salary] as numbers
- responsibilities: List of key responsibilities
- qualifications: List of required qualifications
- benefits: List of benefits mentioned
- work_model: Work arrangement (e.g., "Hybrid", "Remote", "On-site")
- reporting_to: Who this role reports to
- confidence_score: Your confidence in this analysis (0.0 to 1.0)

Return ONLY valid JSON, no other text.
"""
        
        try:
            response_text = self._llm_complete_with_retry(prompt)
            
            # Clean up the response to extract JSON
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result_text = json_match.group()
            else:
                raise ValueError("No JSON object found in LLM response.")
            
            data = json.loads(result_text)
            
            # Override jurisdiction if provided
            if jurisdiction:
                data["jurisdiction"] = jurisdiction
            
            # Validate and set defaults
            if not data.get("jurisdiction") or data["jurisdiction"] not in ["MY", "SG"]:
                data["jurisdiction"] = "MY"  # Default to Malaysia
            
            if not data.get("salary_range") or len(data["salary_range"]) != 2:
                data["salary_range"] = [5000, 10000]  # Default range
            
            return JDAnalysis(
                position=data.get("position", "Unknown Position"),
                department=data.get("department", "General"),
                jurisdiction=data["jurisdiction"],
                salary_range=tuple(data["salary_range"]),
                responsibilities=data.get("responsibilities", []),
                qualifications=data.get("qualifications", []),
                benefits=data.get("benefits", []),
                work_model=data.get("work_model", "On-site"),
                reporting_to=data.get("reporting_to", "Manager"),
                confidence_score=data.get("confidence_score", 0.7),
                sources=[{"type": "text_analysis", "confidence": data.get("confidence_score", 0.7)}]
            )
        except Exception as e:
            logger.error(f"Error analyzing JD from text: {e}")
            # Return default analysis
            return JDAnalysis(
                position="Unknown Position",
                department="General",
                jurisdiction=jurisdiction or "MY",
                salary_range=(5000, 10000),
                responsibilities=[],
                qualifications=[],
                benefits=[],
                work_model="On-site",
                reporting_to="Manager",
                confidence_score=0.3,
                sources=[{"type": "text_analysis", "error": str(e)}]
            )
    
    def analyze_jd_from_rag(self, position: str, jurisdiction: str) -> JDAnalysis:
        """Analyze job description using RAG from knowledge base."""
        logger.info(f"Analyzing JD from RAG for position: {position}, jurisdiction: {jurisdiction}")
        
        if not self.jd_index:
            logger.warning("JD knowledge base not available, falling back to defaults")
            return self._get_default_jd_analysis(position, jurisdiction)
        
        try:
            # Query the knowledge base
            query_engine = self.jd_index.as_query_engine(
                similarity_top_k=3,
                response_mode="tree_summarize"
            )
            
            query = f"Job description for {position} position in {jurisdiction} jurisdiction"
            response = query_engine.query(query)
            
            # Parse the response
            response_text = str(response)
            
            # Extract structured information using LLM
            prompt = f"""
Based on the following job description information, extract structured data:

{response_text}

Return a JSON object with:
- position: Job title
- department: Department
- jurisdiction: "{jurisdiction}"
- salary_range: [min, max] as numbers
- responsibilities: List of responsibilities
- qualifications: List of qualifications
- benefits: List of benefits
- work_model: Work arrangement
- reporting_to: Reporting structure
- confidence_score: 0.8 (RAG-based)

Return ONLY valid JSON.
"""
            
            llm_response_text = self._llm_complete_with_retry(prompt)
            
            json_match = re.search(r'\{.*\}', llm_response_text, re.DOTALL)
            if json_match:
                result_text = json_match.group()
            else:
                raise ValueError("No JSON object found in LLM response.")
            
            data = json.loads(result_text)
            
            return JDAnalysis(
                position=data.get("position", position),
                department=data.get("department", "General"),
                jurisdiction=jurisdiction,
                salary_range=tuple(data.get("salary_range", [5000, 10000])),
                responsibilities=data.get("responsibilities", []),
                qualifications=data.get("qualifications", []),
                benefits=data.get("benefits", []),
                work_model=data.get("work_model", "On-site"),
                reporting_to=data.get("reporting_to", "Manager"),
                confidence_score=0.8,
                sources=[
                    {"type": "rag", "query": query, "confidence": 0.8}
                ]
            )
        except Exception as e:
            logger.error(f"Error analyzing JD from RAG: {e}")
            return self._get_default_jd_analysis(position, jurisdiction)
    
    def analyze_jd_from_linkedin(self, linkedin_url: str) -> JDAnalysis:
        """Analyze job description from LinkedIn URL (mock implementation)."""
        logger.info(f"Analyzing JD from LinkedIn URL: {linkedin_url}")
        
        # In a real implementation, you would:
        # 1. Use LinkedIn API or web scraping to get the JD
        # 2. Parse the HTML/text to extract job details
        # 3. Call analyze_jd_from_text with the extracted content
        
        # For now, return a mock response
        return JDAnalysis(
            position="Software Engineer",
            department="Engineering",
            jurisdiction="MY",
            salary_range=(6000, 9000),
            responsibilities=[
                "Develop and maintain web applications",
                "Collaborate with cross-functional teams",
                "Participate in code reviews"
            ],
            qualifications=[
                "Bachelor's degree in Computer Science",
                "2+ years of experience",
                "Proficiency in JavaScript/Python"
            ],
            benefits=[
                "EPF and SOCSO contributions",
                "Medical insurance",
                "Annual bonus"
            ],
            work_model="Hybrid",
            reporting_to="Engineering Manager",
            confidence_score=0.6,
            sources=[{"type": "linkedin", "url": linkedin_url, "confidence": 0.6}]
        )
    
    def analyze_jd_from_web_search(self, search_query: str) -> JDAnalysis:
        """Analyze job description from web search (mock implementation)."""
        logger.info(f"Analyzing JD from web search: {search_query}")
        
        # In a real implementation, you would:
        # 1. Use a web search API (Google, Bing, etc.)
        # 2. Fetch relevant job descriptions
        # 3. Aggregate and analyze the results
        
        # For now, return a mock response
        return JDAnalysis(
            position="Full Stack Developer",
            department="Technology",
            jurisdiction="SG",
            salary_range=(5000, 7500),
            responsibilities=[
                "Build responsive front-end interfaces",
                "Develop RESTful APIs",
                "Integrate with cloud services"
            ],
            qualifications=[
                "Bachelor's degree in related field",
                "2+ years full stack experience",
                "Experience with React and Node.js"
            ],
            benefits=[
                "CPF contributions",
                "Medical and dental coverage",
                "Professional development budget"
            ],
            work_model="Hybrid",
            reporting_to="Team Lead",
            confidence_score=0.5,
            sources=[{"type": "web_search", "query": search_query, "confidence": 0.5}]
        )
    
    def _get_default_jd_analysis(self, position: str, jurisdiction: str) -> JDAnalysis:
        """Get default JD analysis when other methods fail."""
        logger.warning(f"Using default JD analysis for {position} in {jurisdiction}")
        
        # Default values based on jurisdiction
        if jurisdiction == "SG":
            salary_range = (5000, 8000)
            benefits = ["CPF contributions", "Medical insurance", "Annual bonus"]
        else:
            salary_range = (5000, 8500)
            benefits = ["EPF and SOCSO", "Medical insurance", "Annual bonus"]
        
        return JDAnalysis(
            position=position,
            department="General",
            jurisdiction=jurisdiction,
            salary_range=salary_range,
            responsibilities=["Perform job-related duties", "Meet performance goals"],
            qualifications=["Relevant experience", "Required qualifications"],
            benefits=benefits,
            work_model="On-site",
            reporting_to="Manager",
            confidence_score=0.4,
            sources=[{"type": "default", "confidence": 0.4}]
        )
    
    def generate_contract_params(
        self,
        request: ContractGenerationRequest,
        jd_analysis: Optional[JDAnalysis] = None
    ) -> ContractParams:
        """Generate contract parameters from JD analysis."""
        logger.info(f"Generating contract params for {request.employee_name}")
        
        # Analyze JD if not provided
        if not jd_analysis:
            jd_analysis = self._analyze_jd_from_request(request)
        
        # Use midpoint of salary range
        salary = (jd_analysis.salary_range[0] + jd_analysis.salary_range[1]) / 2
        
        return ContractParams(
            employee_name=request.employee_name,
            position=jd_analysis.position,
            department=jd_analysis.department,
            jurisdiction=request.jurisdiction or jd_analysis.jurisdiction,
            start_date=request.start_date,
            salary=salary,
            nric=request.nric,
            employee_address=request.employee_address
        )
    
    def _analyze_jd_from_request(self, request: ContractGenerationRequest) -> JDAnalysis:
        """Analyze JD based on request source."""
        source = request.jd_source.lower()
        
        if source == "linkedin":
            return self.analyze_jd_from_linkedin(request.jd_data.get("url", ""))
        elif source == "web":
            return self.analyze_jd_from_web_search(request.jd_data.get("query", ""))
        elif source == "rag":
            position = request.jd_data.get("position", "Unknown")
            jurisdiction = request.jurisdiction or "MY"
            return self.analyze_jd_from_rag(position, jurisdiction)
        elif source == "manual":
            jd_text = request.jd_data.get("text", "")
            return self.analyze_jd_from_text(jd_text, request.jurisdiction)
        else:
            # Default to RAG with position from data
            position = request.jd_data.get("position", "Unknown")
            jurisdiction = request.jurisdiction or "MY"
            return self.analyze_jd_from_rag(position, jurisdiction)
    
    def get_jd_suggestions(self, position: str, jurisdiction: str) -> Dict:
        """Get suggestions for job description based on knowledge base."""
        logger.info(f"Getting JD suggestions for {position} in {jurisdiction}")
        
        if not self.jd_index:
            return {
                "position": position,
                "jurisdiction": jurisdiction,
                "suggestions": [],
                "similar_positions": []
            }
        
        try:
            query_engine = self.jd_index.as_query_engine(
                similarity_top_k=5,
                response_mode="compact"
            )
            
            query = f"Similar positions to {position} in {jurisdiction}"
            response = query_engine.query(query)
            
            return {
                "position": position,
                "jurisdiction": jurisdiction,
                "suggestions": str(response),
                "similar_positions": []
            }
        except Exception as e:
            logger.error(f"Error getting JD suggestions: {e}")
            return {
                "position": position,
                "jurisdiction": jurisdiction,
                "suggestions": [],
                "similar_positions": [],
                "error": str(e)
            }


# Global instance
_hr_agent = None


def init_hr_agent(app):
    """Initialize the HR agent with app config."""
    global _hr_agent
    _hr_agent = HRAgent(app.config)
    return _hr_agent


def get_hr_agent() -> Optional[HRAgent]:
    """Get the HR agent instance."""
    return _hr_agent