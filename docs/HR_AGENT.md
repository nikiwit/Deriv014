# HR Agent - Job Description Analyzer

## Overview

The HR Agent is an intelligent system that analyzes job descriptions from multiple sources and automatically generates employment contracts. It leverages AI and RAG (Retrieval-Augmented Generation) to understand job requirements and create compliant contracts for Malaysia (MY) and Singapore (SG) jurisdictions.

## Features

### 1. Multi-Source Job Description Analysis

The HR Agent can analyze job descriptions from four different sources:

- **Text Input**: Paste raw job description text directly
- **LinkedIn URL**: Provide a LinkedIn job posting URL (mock implementation - requires API integration)
- **Web Search**: Search for job descriptions online (mock implementation - requires search API)
- **Knowledge Base (RAG)**: Query the internal job description database for similar positions

### 2. Intelligent JD Analysis

The agent extracts structured information from job descriptions:

- **Position Title**: Job role and title
- **Department**: Team or department assignment
- **Jurisdiction**: Auto-detects Malaysia (MY) or Singapore (SG) based on context
- **Salary Range**: Extracts compensation information
- **Responsibilities**: Key job duties and tasks
- **Qualifications**: Required skills, education, and experience
- **Benefits**: Compensation and perks offered
- **Work Model**: Remote, hybrid, or on-site arrangement
- **Reporting Structure**: Who the role reports to
- **Confidence Score**: AI confidence in the analysis (0.0 to 1.0)

### 3. Contract Generation

Based on the JD analysis, the agent can:

- Generate employment contracts compliant with local labor laws
- Auto-populate contract fields from JD data
- Support both Malaysia (Employment Act 1955) and Singapore (Employment Act Cap. 91)
- Include jurisdiction-specific benefits and statutory requirements
- Generate downloadable PDF contracts

### 4. Additional Features

- **JD Comparison**: Compare multiple job descriptions side-by-side
- **Position Suggestions**: Get suggestions from the knowledge base
- **Available Positions**: List all positions in the knowledge base
- **Health Check**: Monitor agent status and availability

## Architecture

### Backend Components

#### `backend/app/hr_agent.py`

Core HR Agent service with the following classes:

- **`HRAgent`**: Main agent class that orchestrates JD analysis
  - `analyze_jd_from_text()`: Analyze raw JD text using LLM
  - `analyze_jd_from_rag()`: Query knowledge base for similar positions
  - `analyze_jd_from_linkedin()`: Extract JD from LinkedIn URL (mock)
  - `analyze_jd_from_web_search()`: Search and analyze JDs (mock)
  - `generate_contract_params()`: Create contract parameters from analysis
  - `get_jd_suggestions()`: Get position suggestions from knowledge base

- **`JDAnalysis`**: Dataclass for structured JD analysis results
- **`ContractGenerationRequest`**: Dataclass for contract generation requests

#### `backend/app/routes/hr_agent.py`

Flask API endpoints:

- **POST `/api/hr-agent/analyze`**: Analyze a job description
  - Request: `{ source, data, jurisdiction }`
  - Response: JD analysis with all extracted fields

- **POST `/api/hr-agent/generate-contract`**: Generate contract from JD
  - Request: `{ employee_name, nric, employee_address, start_date, jd_source, jd_data, jurisdiction }`
  - Response: Generated contract with download URL

- **GET `/api/hr-agent/suggestions`**: Get JD suggestions
  - Query: `position`, `jurisdiction`
  - Response: Similar positions and suggestions

- **GET `/api/hr-agent/positions`**: List available positions
  - Query: `jurisdiction` (optional)
  - Response: All positions in knowledge base

- **POST `/api/hr-agent/compare`**: Compare multiple JDs
  - Request: `{ jds: [{ source, data, label }, ...] }`
  - Response: Comparison analysis

- **GET `/api/hr-agent/health`**: Health check endpoint
  - Response: Agent status and component availability

### Frontend Components

#### `components/HRAgent.tsx`

React component with the following features:

- **Source Selection**: Choose between text, LinkedIn, web search, or RAG
- **Input Forms**: Dynamic forms based on selected source
- **Jurisdiction Toggle**: Switch between Malaysia and Singapore
- **Analysis Display**: Show extracted JD information with confidence score
- **Contract Generation Form**: Employee details for contract creation
- **Result Display**: Show generated contract with download button
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during processing

## Integration Points

### 1. App Initialization

The HR Agent is initialized in `backend/app/__init__.py`:

```python
# HR Agent
from app import hr_agent
hr_agent.init_hr_agent(app)

# Register blueprint
from app.routes import hr_agent as hr_agent_routes
app.register_blueprint(hr_agent_routes.bp)
```

### 2. Frontend Navigation

Added to navigation in `constants.tsx`:

```typescript
{ id: 'hr_agent', label: 'JD Analyzer', icon: <Sparkles size={20} /> }
```

Added to view routing in `App.tsx`:

```typescript
case 'hr_agent':
  return <HRAgent />;
```

### 3. Knowledge Base

The agent uses existing job description files:

- `md_files/deriv_my_job_descriptions.md`: Malaysia positions
- `md_files/deriv_sg_job_descriptions.md`: Singapore positions

These files are indexed by LlamaIndex for RAG queries.

## Usage Examples

### Example 1: Analyze JD from Text

```bash
curl -X POST http://localhost:5001/api/hr-agent/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "source": "text",
    "data": {
      "text": "We are looking for a Full Stack Developer with 2+ years experience in React and Node.js..."
    },
    "jurisdiction": "MY"
  }'
```

### Example 2: Generate Contract from JD

```bash
curl -X POST http://localhost:5001/api/hr-agent/generate-contract \
  -H "Content-Type: application/json" \
  -d '{
    "employee_name": "John Doe",
    "nric": "123456-12-1234",
    "employee_address": "123 Main St, Kuala Lumpur",
    "start_date": "2024-03-01",
    "jd_source": "rag",
    "jd_data": {
      "position": "Full Stack Developer"
    },
    "jurisdiction": "MY"
  }'
```

### Example 3: Get Position Suggestions

```bash
curl "http://localhost:5001/api/hr-agent/suggestions?position=Developer&jurisdiction=MY"
```

## Configuration

### Environment Variables

Required environment variables (set in `.env.local`):

```bash
GOOGLE_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```

### App Configuration

Configuration in `backend/app/config.py`:

```python
LLM_MODEL = "models/gemini-2.5-flash"
EMBEDDING_MODEL = "text-embedding-3-small"
MD_FILES_DIR = "../md_files"
```

## Future Enhancements

### Planned Features

1. **LinkedIn API Integration**: Real LinkedIn job posting extraction
2. **Web Search API**: Integration with Google/Bing Search API
3. **Multi-JD Comparison**: Advanced comparison with visual diff
4. **Contract Templates**: More contract templates for different roles
5. **Export Options**: Export to Word, PDF, or HTML
6. **Version History**: Track contract revisions
7. **Approval Workflow**: Multi-step contract approval process
8. **Analytics**: JD analysis trends and insights

### Technical Improvements

1. **Caching**: Cache JD analysis results
2. **Batch Processing**: Analyze multiple JDs at once
3. **Streaming**: Stream analysis results for better UX
4. **Validation**: Validate JD completeness before analysis
5. **Error Recovery**: Better error handling and retry logic

## Troubleshooting

### Common Issues

**Issue**: HR Agent not initialized
- **Solution**: Check that `GOOGLE_API_KEY` and `OPENAI_API_KEY` are set in `.env.local`

**Issue**: JD analysis returns low confidence
- **Solution**: Provide more detailed job descriptions or use RAG source

**Issue**: Contract generation fails
- **Solution**: Ensure all required fields are provided (employee_name, start_date)

**Issue**: Knowledge base returns no results
- **Solution**: Add more job descriptions to `md_files/` directory

### Logs

Check backend logs for detailed error messages:

```bash
# View Flask logs
tail -f backend/logs/app.log

# Check for HR Agent errors
grep "HR Agent" backend/logs/app.log
```

## API Reference

See `backend/API_REFERENCE.md` for complete API documentation.

## Testing

### Manual Testing

1. Start the backend server:
   ```bash
   cd backend
   python run.py
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Navigate to "JD Analyzer" in the sidebar

4. Test each source type:
   - Paste JD text and analyze
   - Enter LinkedIn URL and analyze
   - Search for positions and analyze
   - Query knowledge base and analyze

5. Generate a contract from the analysis

6. Download and verify the generated PDF

### Automated Testing

Run the test suite (if available):

```bash
# Backend tests
cd backend
pytest tests/test_hr_agent.py

# Frontend tests
npm test
```

## Support

For issues or questions:

1. Check the logs in the terminal
2. Review the API documentation in `backend/API_REFERENCE.md`
3. Examine the code in `backend/app/hr_agent.py`
4. Check the frontend component in `components/HRAgent.tsx`

## License

This feature is part of the DerivHR project.
