"""
HR Agent API Routes

Endpoints for:
1. Analyzing job descriptions from various sources
2. Generating contracts based on JD analysis
3. Getting JD suggestions from knowledge base
"""

import json
import logging

from flask import Blueprint, jsonify, request

from app.hr_agent import get_hr_agent, ContractGenerationRequest
from app.document_generator import generate_contract
from app.database import get_db

bp = Blueprint("hr_agent", __name__, url_prefix="/api/hr-agent")

logger = logging.getLogger(__name__)


@bp.route("/analyze", methods=["POST"])
def analyze_jd():
    """Analyze a job description from various sources.
    
    Request body:
    {
        "source": "text" | "linkedin" | "web" | "rag",
        "data": {
            "text": "JD text..." (for text source)
            "url": "LinkedIn URL" (for linkedin source)
            "query": "Search query" (for web source)
            "position": "Job title" (for rag source)
        },
        "jurisdiction": "MY" | "SG" (optional, auto-detected if not provided)
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    
    hr_agent = get_hr_agent()
    if not hr_agent:
        return jsonify({"error": "HR Agent not initialized"}), 500
    
    source = data.get("source", "text").lower()
    jd_data = data.get("data", {})
    jurisdiction = data.get("jurisdiction")
    
    try:
        # Analyze JD based on source
        if source == "text":
            jd_text = jd_data.get("text", "")
            if not jd_text:
                return jsonify({"error": "JD text is required for text source"}), 400
            analysis = hr_agent.analyze_jd_from_text(jd_text, jurisdiction)
        
        elif source == "linkedin":
            url = jd_data.get("url", "")
            if not url:
                return jsonify({"error": "LinkedIn URL is required for linkedin source"}), 400
            analysis = hr_agent.analyze_jd_from_linkedin(url)
        
        elif source == "web":
            query = jd_data.get("query", "")
            if not query:
                return jsonify({"error": "Search query is required for web source"}), 400
            analysis = hr_agent.analyze_jd_from_web_search(query)
        
        elif source == "rag":
            position = jd_data.get("position", "")
            if not position:
                return jsonify({"error": "Position is required for rag source"}), 400
            analysis = hr_agent.analyze_jd_from_rag(position, jurisdiction or "MY")
        
        else:
            return jsonify({
                "error": f"Unknown source: {source}. Valid sources: text, linkedin, web, rag"
            }), 400
        
        # Return analysis as dict
        return jsonify({
            "position": analysis.position,
            "department": analysis.department,
            "jurisdiction": analysis.jurisdiction,
            "salary_range": list(analysis.salary_range),
            "responsibilities": analysis.responsibilities,
            "qualifications": analysis.qualifications,
            "benefits": analysis.benefits,
            "work_model": analysis.work_model,
            "reporting_to": analysis.reporting_to,
            "confidence_score": analysis.confidence_score,
            "sources": analysis.sources
        })
    
    except Exception as e:
        logger.error(f"Error analyzing JD: {e}")
        return jsonify({"error": f"JD analysis failed: {str(e)}"}), 500


@bp.route("/generate-contract", methods=["POST"])
def generate_contract_from_jd():
    """Generate an employment contract based on job description analysis.
    
    Request body:
    {
        "employee_name": "John Doe",
        "nric": "123456-12-1234",
        "employee_address": "123 Main St, City",
        "start_date": "2024-03-01",
        "jd_source": "text" | "linkedin" | "web" | "rag",
        "jd_data": { ... },
        "jurisdiction": "MY" | "SG" (optional)
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    
    hr_agent = get_hr_agent()
    if not hr_agent:
        return jsonify({"error": "HR Agent not initialized"}), 500
    
    # Validate required fields
    required_fields = ["employee_name", "start_date", "jd_source", "jd_data"]
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
    
    try:
        # Create contract generation request
        request_obj = ContractGenerationRequest(
            employee_name=data["employee_name"],
            nric=data.get("nric", ""),
            employee_address=data.get("employee_address", ""),
            start_date=data["start_date"],
            jd_source=data["jd_source"],
            jd_data=data["jd_data"],
            jurisdiction=data.get("jurisdiction")
        )
        
        # Generate contract parameters
        contract_params = hr_agent.generate_contract_params(request_obj)
        
        # Generate PDF contract
        from flask import current_app
        doc_id, file_path = generate_contract(
            contract_params,
            current_app.config["TEMPLATE_DIR"],
            current_app.config["GENERATED_DOCS_DIR"]
        )
        
        # Save to database
        db = get_db()
        db.execute(
            """INSERT INTO generated_documents 
            (id, document_type, jurisdiction, employee_name, parameters, file_path)
            VALUES (?, ?, ?, ?, ?, ?)""",
            (
                doc_id,
                "employment_contract_from_jd",
                contract_params.jurisdiction,
                contract_params.employee_name,
                json.dumps({
                    "contract_params": {
                        "employee_name": contract_params.employee_name,
                        "position": contract_params.position,
                        "department": contract_params.department,
                        "jurisdiction": contract_params.jurisdiction,
                        "start_date": contract_params.start_date,
                        "salary": contract_params.salary,
                        "nric": contract_params.nric,
                        "employee_address": contract_params.employee_address
                    },
                    "jd_source": data["jd_source"],
                    "jd_data": data["jd_data"]
                }),
                file_path
            )
        )
        db.commit()
        
        return jsonify({
            "id": doc_id,
            "document_type": "employment_contract_from_jd",
            "jurisdiction": contract_params.jurisdiction,
            "employee_name": contract_params.employee_name,
            "position": contract_params.position,
            "department": contract_params.department,
            "salary": contract_params.salary,
            "download_url": f"/api/documents/{doc_id}/download"
        }), 201
    
    except Exception as e:
        logger.error(f"Error generating contract from JD: {e}")
        return jsonify({"error": f"Contract generation failed: {str(e)}"}), 500


@bp.route("/suggestions", methods=["GET"])
def get_jd_suggestions():
    """Get job description suggestions from knowledge base.
    
    Query params:
    - position: Job title to search for
    - jurisdiction: MY or SG
    """
    position = request.args.get("position", "")
    jurisdiction = request.args.get("jurisdiction", "MY")
    
    if not position:
        return jsonify({"error": "Position parameter is required"}), 400
    
    if jurisdiction not in ["MY", "SG"]:
        return jsonify({"error": "Jurisdiction must be 'MY' or 'SG'"}), 400
    
    hr_agent = get_hr_agent()
    if not hr_agent:
        return jsonify({"error": "HR Agent not initialized"}), 500
    
    try:
        suggestions = hr_agent.get_jd_suggestions(position, jurisdiction)
        return jsonify(suggestions)
    
    except Exception as e:
        logger.error(f"Error getting JD suggestions: {e}")
        return jsonify({"error": f"Failed to get suggestions: {str(e)}"}), 500


@bp.route("/positions", methods=["GET"])
def list_available_positions():
    """List available positions from the knowledge base.
    
    Query params:
    - jurisdiction: MY or SG (optional, returns both if not specified)
    """
    jurisdiction = request.args.get("jurisdiction")
    
    if jurisdiction and jurisdiction not in ["MY", "SG"]:
        return jsonify({"error": "Jurisdiction must be 'MY' or 'SG'"}), 400
    
    hr_agent = get_hr_agent()
    if not hr_agent:
        return jsonify({"error": "HR Agent not initialized"}), 500
    
    try:
        # Query the JD index for available positions
        if not hr_agent.jd_index:
            return jsonify({
                "positions": [],
                "message": "JD knowledge base not available"
            })
        
        query_engine = hr_agent.jd_index.as_query_engine(
            similarity_top_k=10,
            response_mode="compact"
        )
        
        # Build query based on jurisdiction
        if jurisdiction:
            query = f"List all job positions in {jurisdiction} jurisdiction"
        else:
            query = "List all job positions in both Malaysia and Singapore"
        
        response = query_engine.query(query)
        
        return jsonify({
            "jurisdiction": jurisdiction or "ALL",
            "positions": str(response)
        })
    
    except Exception as e:
        logger.error(f"Error listing positions: {e}")
        return jsonify({"error": f"Failed to list positions: {str(e)}"}), 500


@bp.route("/compare", methods=["POST"])
def compare_jds():
    """Compare multiple job descriptions.
    
    Request body:
    {
        "jds": [
            {
                "source": "text" | "linkedin" | "web" | "rag",
                "data": { ... },
                "label": "JD 1"
            },
            ...
        ]
    }
    """
    data = request.get_json()
    if not data or not data.get("jds"):
        return jsonify({"error": "Request body with 'jds' array is required"}), 400
    
    hr_agent = get_hr_agent()
    if not hr_agent:
        return jsonify({"error": "HR Agent not initialized"}), 500
    
    jds = data["jds"]
    if len(jds) < 2:
        return jsonify({"error": "At least 2 JDs are required for comparison"}), 400
    
    try:
        analyses = []
        
        for jd_item in jds:
            source = jd_item.get("source", "text").lower()
            jd_data = jd_item.get("data", {})
            label = jd_item.get("label", f"JD {len(analyses) + 1}")
            jurisdiction = jd_item.get("jurisdiction")
            
            # Analyze each JD
            if source == "text":
                analysis = hr_agent.analyze_jd_from_text(jd_data.get("text", ""), jurisdiction)
            elif source == "linkedin":
                analysis = hr_agent.analyze_jd_from_linkedin(jd_data.get("url", ""))
            elif source == "web":
                analysis = hr_agent.analyze_jd_from_web_search(jd_data.get("query", ""))
            elif source == "rag":
                analysis = hr_agent.analyze_jd_from_rag(jd_data.get("position", ""), jurisdiction or "MY")
            else:
                continue
            
            analyses.append({
                "label": label,
                "analysis": {
                    "position": analysis.position,
                    "department": analysis.department,
                    "jurisdiction": analysis.jurisdiction,
                    "salary_range": list(analysis.salary_range),
                    "work_model": analysis.work_model,
                    "confidence_score": analysis.confidence_score
                }
            })
        
        # Generate comparison summary
        comparison = {
            "analyses": analyses,
            "summary": {
                "total_jds": len(analyses),
                "jurisdictions": list(set(a["analysis"]["jurisdiction"] for a in analyses)),
                "salary_ranges": [a["analysis"]["salary_range"] for a in analyses],
                "work_models": list(set(a["analysis"]["work_model"] for a in analyses))
            }
        }
        
        return jsonify(comparison)
    
    except Exception as e:
        logger.error(f"Error comparing JDs: {e}")
        return jsonify({"error": f"JD comparison failed: {str(e)}"}), 500


@bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for HR Agent."""
    hr_agent = get_hr_agent()
    
    return jsonify({
        "status": "healthy" if hr_agent else "not_initialized",
        "jd_index_available": hr_agent.jd_index is not None if hr_agent else False,
        "llm_available": hr_agent.llm is not None if hr_agent else False,
        "embed_model_available": hr_agent.embed_model is not None if hr_agent else False
    })
