"""
Training templates for different departments.
Defines the training items assigned to new employees based on their department.
"""

# ============================================
# Finance Training (17 items)
# ============================================
FINANCE_TRAINING_ITEMS = [
    # IT Systems (finance tools) - 3 items
    {
        'title': 'SAP Financial Module Setup',
        'description': 'Navigate SAP FICO for general ledger, accounts payable, and accounts receivable',
        'category': 'it_systems',
        'format': 'interactive',
        'estimatedMinutes': 45,
        'required': True,
        'order': 1
    },
    {
        'title': 'Bloomberg Terminal Basics',
        'description': 'Market data access, portfolio analytics, and financial news feeds',
        'category': 'it_systems',
        'format': 'video',
        'estimatedMinutes': 30,
        'required': True,
        'order': 2
    },
    {
        'title': 'Internal Expense & Reporting Tools',
        'description': 'How to use DerivHR for claims, budget tracking, and monthly close reports',
        'category': 'it_systems',
        'format': 'interactive',
        'estimatedMinutes': 20,
        'required': True,
        'order': 3
    },

    # Compliance (financial regulations) - 3 items
    {
        'title': 'Anti-Money Laundering (AML)',
        'description': 'Regulatory obligations, suspicious transaction reporting, and KYC procedures',
        'category': 'compliance',
        'format': 'video',
        'estimatedMinutes': 60,
        'required': True,
        'order': 1,
        'dueDate': '2026-03-15'
    },
    {
        'title': 'Financial Reporting Standards (MFRS)',
        'description': 'Malaysian Financial Reporting Standards and IFRS alignment requirements',
        'category': 'compliance',
        'format': 'quiz',
        'estimatedMinutes': 45,
        'required': True,
        'order': 2,
        'dueDate': '2026-03-15'
    },
    {
        'title': 'SOX Compliance & Internal Controls',
        'description': 'Sarbanes-Oxley requirements, segregation of duties, and audit trail management',
        'category': 'compliance',
        'format': 'document',
        'estimatedMinutes': 30,
        'required': True,
        'order': 3,
        'dueDate': '2026-03-30'
    },

    # Orientation - 3 items
    {
        'title': 'Welcome to Deriv',
        'description': 'Company history, mission, vision, and organizational structure',
        'category': 'orientation',
        'format': 'video',
        'estimatedMinutes': 20,
        'required': True,
        'order': 1
    },
    {
        'title': 'Finance Department Overview',
        'description': 'Team structure, key stakeholders, reporting lines, and collaboration with Treasury & Risk',
        'category': 'orientation',
        'format': 'document',
        'estimatedMinutes': 15,
        'required': True,
        'order': 2
    },
    {
        'title': 'Office Tour & Facilities',
        'description': 'Virtual tour of offices and booking shared spaces',
        'category': 'orientation',
        'format': 'video',
        'estimatedMinutes': 10,
        'required': False,
        'order': 3
    },

    # Role-Specific (finance workflows) - 3 items
    {
        'title': 'Month-End Close Process',
        'description': 'Step-by-step guide for journal entries, reconciliations, and reporting deadlines',
        'category': 'role_specific',
        'format': 'interactive',
        'estimatedMinutes': 60,
        'required': True,
        'order': 1
    },
    {
        'title': 'Financial Analysis & Forecasting',
        'description': 'Revenue modeling, variance analysis, and cash flow forecasting techniques',
        'category': 'role_specific',
        'format': 'video',
        'estimatedMinutes': 45,
        'required': True,
        'order': 2
    },
    {
        'title': 'Intercompany Transactions & Transfer Pricing',
        'description': 'Cross-entity reconciliation and arm\'s length pricing documentation',
        'category': 'role_specific',
        'format': 'document',
        'estimatedMinutes': 30,
        'required': True,
        'order': 3
    },

    # Soft Skills - 2 items
    {
        'title': 'Presenting Financial Data to Stakeholders',
        'description': 'How to communicate complex financial insights clearly to non-finance teams',
        'category': 'soft_skills',
        'format': 'live_session',
        'estimatedMinutes': 60,
        'required': False,
        'order': 1
    },
    {
        'title': 'Cross-Department Collaboration',
        'description': 'Working effectively with Product, Engineering, and Operations teams',
        'category': 'soft_skills',
        'format': 'video',
        'estimatedMinutes': 25,
        'required': False,
        'order': 2
    },

    # Security - 3 items
    {
        'title': 'Financial Data Security & Access Control',
        'description': 'Handling sensitive financial data, PCI-DSS basics, and access permissions',
        'category': 'security',
        'format': 'quiz',
        'estimatedMinutes': 30,
        'required': True,
        'order': 1,
        'dueDate': '2026-03-01'
    },
    {
        'title': 'Fraud Detection & Prevention',
        'description': 'Red flags in financial transactions, internal fraud indicators, and escalation paths',
        'category': 'security',
        'format': 'document',
        'estimatedMinutes': 20,
        'required': True,
        'order': 2
    },
    {
        'title': 'Physical Security & Clean Desk Policy',
        'description': 'Badge access, visitor policies, and securing financial documents',
        'category': 'security',
        'format': 'video',
        'estimatedMinutes': 10,
        'required': False,
        'order': 3
    },
]

# ============================================
# Engineering Training (17 items)
# ============================================
ENGINEERING_TRAINING_ITEMS = [
    # IT Systems - 5 items
    {
        'title': 'Git & Version Control Workflow',
        'description': 'Branching strategies, pull requests, code review process, and CI/CD integration',
        'category': 'it_systems',
        'format': 'interactive',
        'estimatedMinutes': 45,
        'required': True,
        'order': 1
    },
    {
        'title': 'Development Environment Setup',
        'description': 'IDE configuration, local dev stack, Docker, debugging tools, and linting standards',
        'category': 'it_systems',
        'format': 'document',
        'estimatedMinutes': 60,
        'required': True,
        'order': 2
    },
    {
        'title': 'JIRA & Agile Workflows',
        'description': 'Sprint planning, ticket management, story points, and team ceremonies',
        'category': 'it_systems',
        'format': 'video',
        'estimatedMinutes': 30,
        'required': True,
        'order': 3
    },
    {
        'title': 'Internal Tools & API Access',
        'description': 'Authentication systems, API keys, staging environments, and monitoring dashboards',
        'category': 'it_systems',
        'format': 'interactive',
        'estimatedMinutes': 40,
        'required': True,
        'order': 4
    },
    {
        'title': 'HR Portal & Leave Systems',
        'description': 'How to use DerivHR portal, submit claims, and view payslips',
        'category': 'it_systems',
        'format': 'video',
        'estimatedMinutes': 15,
        'required': True,
        'order': 5
    },

    # Compliance - 3 items
    {
        'title': 'Code of Conduct & Ethics',
        'description': 'Engineering ethics, open-source licensing, and intellectual property guidelines',
        'category': 'compliance',
        'format': 'document',
        'estimatedMinutes': 25,
        'required': True,
        'order': 1,
        'dueDate': '2026-03-15'
    },
    {
        'title': 'Data Protection (PDPA/GDPR)',
        'description': 'Handling user data, PII protection, data retention policies, and breach procedures',
        'category': 'compliance',
        'format': 'quiz',
        'estimatedMinutes': 30,
        'required': True,
        'order': 2,
        'dueDate': '2026-03-15'
    },
    {
        'title': 'Information Security Best Practices',
        'description': 'Secure coding practices, input validation, SQL injection prevention, XSS mitigation',
        'category': 'compliance',
        'format': 'video',
        'estimatedMinutes': 35,
        'required': True,
        'order': 3
    },

    # Orientation - 3 items
    {
        'title': 'Welcome to Deriv',
        'description': 'Company history, mission, vision, and organizational structure',
        'category': 'orientation',
        'format': 'video',
        'estimatedMinutes': 20,
        'required': True,
        'order': 1
    },
    {
        'title': 'Engineering Team Overview',
        'description': 'Team structure, tech stack, product roadmap, and key stakeholders',
        'category': 'orientation',
        'format': 'document',
        'estimatedMinutes': 15,
        'required': True,
        'order': 2
    },
    {
        'title': 'Office Tour & Facilities',
        'description': 'Virtual tour of offices, desk booking, and shared workspaces',
        'category': 'orientation',
        'format': 'video',
        'estimatedMinutes': 10,
        'required': False,
        'order': 3
    },

    # Role-Specific - 3 items
    {
        'title': 'Architecture & Design Patterns',
        'description': 'Microservices, RESTful APIs, database design, and system scalability principles',
        'category': 'role_specific',
        'format': 'video',
        'estimatedMinutes': 50,
        'required': True,
        'order': 1
    },
    {
        'title': 'Testing & Quality Assurance',
        'description': 'Unit tests, integration tests, TDD/BDD practices, and code coverage standards',
        'category': 'role_specific',
        'format': 'interactive',
        'estimatedMinutes': 45,
        'required': True,
        'order': 2
    },
    {
        'title': 'On-Call & Incident Management',
        'description': 'Production support, escalation paths, post-mortem process, and runbook usage',
        'category': 'role_specific',
        'format': 'document',
        'estimatedMinutes': 30,
        'required': False,
        'order': 3
    },

    # Soft Skills - 1 item
    {
        'title': 'Technical Communication',
        'description': 'Writing design docs, code comments, documentation, and presenting to non-technical teams',
        'category': 'soft_skills',
        'format': 'live_session',
        'estimatedMinutes': 60,
        'required': False,
        'order': 1
    },

    # Security - 2 items
    {
        'title': 'Cybersecurity Awareness',
        'description': 'Phishing, social engineering, password hygiene, and 2FA enforcement',
        'category': 'security',
        'format': 'quiz',
        'estimatedMinutes': 25,
        'required': True,
        'order': 1,
        'dueDate': '2026-03-01'
    },
    {
        'title': 'Secure Development Lifecycle',
        'description': 'Threat modeling, security code reviews, dependency scanning, and penetration testing',
        'category': 'security',
        'format': 'document',
        'estimatedMinutes': 40,
        'required': True,
        'order': 2
    },
]

# ============================================
# Default Training (18 items)
# ============================================
DEFAULT_TRAINING_ITEMS = [
    # IT Systems - 3 items
    {
        'title': 'Internal Tools Onboarding',
        'description': 'Jira, Confluence, and Slack workspace setup and best practices',
        'category': 'it_systems',
        'format': 'interactive',
        'estimatedMinutes': 30,
        'required': True,
        'order': 1
    },
    {
        'title': 'Development Environment Setup',
        'description': 'Git workflows, CI/CD pipelines, and code review process',
        'category': 'it_systems',
        'format': 'document',
        'estimatedMinutes': 45,
        'required': True,
        'order': 2
    },
    {
        'title': 'HR Portal & Payroll Systems',
        'description': 'How to use DerivHR portal, submit claims, and view payslips',
        'category': 'it_systems',
        'format': 'video',
        'estimatedMinutes': 15,
        'required': True,
        'order': 3
    },

    # Compliance - 3 items
    {
        'title': 'Anti-Money Laundering (AML)',
        'description': 'Regulatory requirements and reporting obligations',
        'category': 'compliance',
        'format': 'video',
        'estimatedMinutes': 45,
        'required': True,
        'order': 1,
        'dueDate': '2026-03-15'
    },
    {
        'title': 'Data Protection (PDPA/GDPR)',
        'description': 'Personal data handling, consent, and breach procedures',
        'category': 'compliance',
        'format': 'quiz',
        'estimatedMinutes': 30,
        'required': True,
        'order': 2,
        'dueDate': '2026-03-15'
    },
    {
        'title': 'Code of Conduct',
        'description': 'Ethics, conflicts of interest, and whistleblowing policy',
        'category': 'compliance',
        'format': 'document',
        'estimatedMinutes': 20,
        'required': True,
        'order': 3
    },

    # Orientation - 3 items
    {
        'title': 'Welcome to Deriv',
        'description': 'Company history, mission, vision, and organizational structure',
        'category': 'orientation',
        'format': 'video',
        'estimatedMinutes': 20,
        'required': True,
        'order': 1
    },
    {
        'title': 'Benefits & Perks Overview',
        'description': 'Insurance, wellness programs, learning budget, and more',
        'category': 'orientation',
        'format': 'document',
        'estimatedMinutes': 15,
        'required': False,
        'order': 2
    },
    {
        'title': 'Office Tour & Facilities',
        'description': 'Virtual tour of offices and booking shared spaces',
        'category': 'orientation',
        'format': 'video',
        'estimatedMinutes': 10,
        'required': False,
        'order': 3
    },

    # Role-Specific - 3 items
    {
        'title': 'Department Processes & Workflows',
        'description': 'Team-specific standard operating procedures',
        'category': 'role_specific',
        'format': 'interactive',
        'estimatedMinutes': 60,
        'required': True,
        'order': 1
    },
    {
        'title': 'Product Knowledge Deep Dive',
        'description': 'Understanding our product suite and customer segments',
        'category': 'role_specific',
        'format': 'video',
        'estimatedMinutes': 45,
        'required': True,
        'order': 2
    },
    {
        'title': 'Stakeholder Map & Escalation Paths',
        'description': 'Key contacts and decision-making chains',
        'category': 'role_specific',
        'format': 'document',
        'estimatedMinutes': 15,
        'required': False,
        'order': 3
    },

    # Soft Skills - 2 items
    {
        'title': 'Effective Communication',
        'description': 'Written and verbal communication in a remote-first company',
        'category': 'soft_skills',
        'format': 'live_session',
        'estimatedMinutes': 60,
        'required': False,
        'order': 1
    },
    {
        'title': 'Giving & Receiving Feedback',
        'description': 'Constructive feedback frameworks and growth mindset',
        'category': 'soft_skills',
        'format': 'video',
        'estimatedMinutes': 25,
        'required': False,
        'order': 2
    },

    # Security - 3 items
    {
        'title': 'Cybersecurity Awareness',
        'description': 'Phishing, social engineering, and password hygiene',
        'category': 'security',
        'format': 'quiz',
        'estimatedMinutes': 25,
        'required': True,
        'order': 1,
        'dueDate': '2026-03-01'
    },
    {
        'title': 'Incident Response Protocol',
        'description': 'What to do if you suspect a security breach',
        'category': 'security',
        'format': 'document',
        'estimatedMinutes': 15,
        'required': True,
        'order': 2
    },
    {
        'title': 'Physical Security & Access Control',
        'description': 'Badge access, visitor policies, and clean desk policy',
        'category': 'security',
        'format': 'video',
        'estimatedMinutes': 10,
        'required': False,
        'order': 3
    },
]


def get_training_template_for_department(department: str) -> str:
    """
    Map department to training template.

    Args:
        department: Employee's department (e.g., 'Finance', 'Engineering', 'Marketing')

    Returns:
        Template name: 'finance', 'engineering', or 'default'
    """
    dept_lower = (department or '').lower()

    # Finance departments
    if any(keyword in dept_lower for keyword in ['finance', 'accounting', 'treasury']):
        return 'finance'

    # Engineering/IT departments
    if any(keyword in dept_lower for keyword in ['engineering', 'tech', 'development', 'it', 'software', 'devops', 'data']):
        return 'engineering'

    # All other departments (Marketing, Sales, HR, Operations, etc.)
    return 'default'


def get_training_items_for_template(template: str) -> list:
    """
    Get training items for a specific template.

    Args:
        template: Template name ('finance', 'engineering', or 'default')

    Returns:
        List of training item dictionaries
    """
    if template == 'finance':
        return FINANCE_TRAINING_ITEMS
    elif template == 'engineering':
        return ENGINEERING_TRAINING_ITEMS
    else:
        return DEFAULT_TRAINING_ITEMS
