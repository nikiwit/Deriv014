import { JobLevel, JobDepartment, JobDescription, JobContract } from '../types';

// Mock job data parsing (in production, this would parse the actual file)
const parseJobContracts = (): JobDescription[] => {
  return [
    {
      title: "Software Engineer",
      department: "Engineering",
      level: "Mid",
      salary: 8500,
      responsibilities: [
        "Design and implement software solutions",
        "Collaborate with cross-functional teams",
        "Write clean, maintainable code"
      ],
      requirements: [
        "3+ years experience in software development",
        "Proficiency in React, TypeScript, and Node.js",
        "Experience with cloud platforms (AWS, GCP)"
      ],
      benefits: [
        "Health insurance",
        "Performance bonuses",
        "Professional development budget"
      ]
    },
    {
      title: "Senior HR Manager",
      department: "HR",
      level: "Senior",
      salary: 12000,
      responsibilities: [
        "Lead HR operations and strategy",
        "Manage employee relations",
        "Develop and implement HR policies"
      ],
      requirements: [
        "5+ years in HR management",
        "Strong leadership and communication skills",
        "Experience with HRIS systems"
      ],
      benefits: [
        "Performance-based bonuses",
        "Company car and fuel allowance",
        "Comprehensive medical coverage"
      ]
    },
    {
      title: "Marketing Specialist",
      department: "Marketing",
      level: "Junior",
      salary: 6000,
      responsibilities: [
        "Execute marketing campaigns",
        "Create engaging content for social media",
        "Analyze market trends and competitor activities"
      ],
      requirements: [
        "Bachelor's degree in Marketing or related field",
        "Creative thinking and problem-solving skills",
        "Proficiency in digital marketing tools"
      ],
      benefits: [
        "Health and medical insurance",
        "Annual leave entitlement (14 days)",
        "Marketing campaign budget"
      ]
    },
    {
      title: "Finance Executive",
      department: "Finance",
      level: "Executive",
      salary: 18000,
      responsibilities: [
        "Oversee financial planning and analysis",
        "Manage budget and forecasting",
        "Ensure regulatory compliance"
      ],
      requirements: [
        "CPA or ACCA certification",
        "7+ years in financial management",
        "Strong analytical and strategic thinking skills"
      ],
      benefits: [
        "Performance-based bonuses",
        "Stock options",
        "Comprehensive insurance coverage"
      ]
    }
  ];
};

export const generateJobContract = (
  jobTitle: string,
  department: JobDepartment,
  level: JobLevel,
  jurisdiction: "MY" | "SG"
): JobContract => {
  const jobData = parseJobContracts().find(
    j => j.title === jobTitle
  );

  if (!jobData) {
    throw new Error(`Job "${jobTitle}" not found in job contracts database`);
  }

  const contractDate = new Date().toISOString().split('T')[0];

  return {
    id: `contract_${Date.now()}`,
    employeeName: "[EMPLOYEE_NAME]",
    position: jobData.title,
    department: jobData.department,
    level: jobData.level,
    salary: `RM ${jobData.salary.toLocaleString()}`,
    startDate: jobData.startDate || contractDate,
    contractType: "Permanent",
    benefits: jobData.benefits || [],
    jurisdiction: jurisdiction === "MY" ? "Malaysia (Employment Act 1955)" : "Singapore (Employment Act)",
    generatedAt: contractDate
  };
};

export const getAvailableJobs = (): JobDescription[] => {
  return parseJobContracts();
};

export const getJobByTitle = (title: string): JobDescription | undefined => {
  return parseJobContracts().find(j => j.title === title);
};
