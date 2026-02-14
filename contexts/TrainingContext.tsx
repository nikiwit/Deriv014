import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { TrainingItem, TrainingItemStatus, EmployeeTrainingProgress, TrainingCategory } from '../types';
import { DEFAULT_TRAINING_ITEMS, MOCK_EMPLOYEE_TRAINING_PROGRESS } from '../constants';

const STORAGE_KEY = 'derivhr_training_progress';

// ============================================
// Finance-specific training items for John Doe
// ============================================
const FINANCE_TRAINING_ITEMS: Omit<TrainingItem, 'id' | 'status' | 'completedAt' | 'score'>[] = [
  // IT Systems (finance tools)
  { title: 'SAP Financial Module Setup',          description: 'Navigate SAP FICO for general ledger, accounts payable, and accounts receivable',  category: 'it_systems',    format: 'interactive', estimatedMinutes: 45, required: true,  order: 1 },
  { title: 'Bloomberg Terminal Basics',            description: 'Market data access, portfolio analytics, and financial news feeds',                 category: 'it_systems',    format: 'video',       estimatedMinutes: 30, required: true,  order: 2 },
  { title: 'Internal Expense & Reporting Tools',   description: 'How to use DerivHR for claims, budget tracking, and monthly close reports',        category: 'it_systems',    format: 'interactive', estimatedMinutes: 20, required: true,  order: 3 },

  // Compliance (financial regulations)
  { title: 'Anti-Money Laundering (AML)',           description: 'Regulatory obligations, suspicious transaction reporting, and KYC procedures',    category: 'compliance',    format: 'video',       estimatedMinutes: 60, required: true,  order: 1, dueDate: '2026-03-15' },
  { title: 'Financial Reporting Standards (MFRS)',  description: 'Malaysian Financial Reporting Standards and IFRS alignment requirements',          category: 'compliance',    format: 'quiz',        estimatedMinutes: 45, required: true,  order: 2, dueDate: '2026-03-15' },
  { title: 'SOX Compliance & Internal Controls',    description: 'Sarbanes-Oxley requirements, segregation of duties, and audit trail management',  category: 'compliance',    format: 'document',    estimatedMinutes: 30, required: true,  order: 3, dueDate: '2026-03-30' },

  // Orientation
  { title: 'Welcome to Deriv',                     description: 'Company history, mission, vision, and organizational structure',                    category: 'orientation',   format: 'video',       estimatedMinutes: 20, required: true,  order: 1 },
  { title: 'Finance Department Overview',           description: 'Team structure, key stakeholders, reporting lines, and collaboration with Treasury & Risk', category: 'orientation', format: 'document', estimatedMinutes: 15, required: true, order: 2 },
  { title: 'Office Tour & Facilities',              description: 'Virtual tour of offices and booking shared spaces',                                category: 'orientation',   format: 'video',       estimatedMinutes: 10, required: false, order: 3 },

  // Role-Specific (finance workflows)
  { title: 'Month-End Close Process',              description: 'Step-by-step guide for journal entries, reconciliations, and reporting deadlines',   category: 'role_specific', format: 'interactive', estimatedMinutes: 60, required: true,  order: 1 },
  { title: 'Financial Analysis & Forecasting',     description: 'Revenue modeling, variance analysis, and cash flow forecasting techniques',          category: 'role_specific', format: 'video',       estimatedMinutes: 45, required: true,  order: 2 },
  { title: 'Intercompany Transactions & Transfer Pricing', description: 'Cross-entity reconciliation and arm\'s length pricing documentation',       category: 'role_specific', format: 'document',    estimatedMinutes: 30, required: true,  order: 3 },

  // Soft Skills
  { title: 'Presenting Financial Data to Stakeholders', description: 'How to communicate complex financial insights clearly to non-finance teams',   category: 'soft_skills',   format: 'live_session', estimatedMinutes: 60, required: false, order: 1 },
  { title: 'Cross-Department Collaboration',        description: 'Working effectively with Product, Engineering, and Operations teams',               category: 'soft_skills',   format: 'video',        estimatedMinutes: 25, required: false, order: 2 },

  // Security
  { title: 'Financial Data Security & Access Control', description: 'Handling sensitive financial data, PCI-DSS basics, and access permissions',     category: 'security',      format: 'quiz',        estimatedMinutes: 30, required: true,  order: 1, dueDate: '2026-03-01' },
  { title: 'Fraud Detection & Prevention',          description: 'Red flags in financial transactions, internal fraud indicators, and escalation paths', category: 'security',   format: 'document',    estimatedMinutes: 20, required: true,  order: 2 },
  { title: 'Physical Security & Clean Desk Policy', description: 'Badge access, visitor policies, and securing financial documents',                  category: 'security',      format: 'video',       estimatedMinutes: 10, required: false, order: 3 },
];

// Helper functions for backend data conversion
function calculateProgress(items: TrainingItem[]): number {
  if (!items || items.length === 0) return 0;
  const completedCount = items.filter(t => t.status === 'completed').length;
  return Math.round((completedCount / items.length) * 100);
}

function determineStatus(items: TrainingItem[]): 'not_started' | 'in_progress' | 'completed' | 'overdue' {
  if (!items || items.length === 0) return 'not_started';

  const completedCount = items.filter(t => t.status === 'completed').length;

  if (completedCount === 0) return 'not_started';
  if (completedCount === items.length) return 'completed';

  // Check if any items are overdue
  const hasOverdue = items.some(t =>
    t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()
  );

  return hasOverdue ? 'overdue' : 'in_progress';
}

// Department-to-training mapping (for future expansion)
function getTrainingItemsForDepartment(department: string): Omit<TrainingItem, 'id' | 'status' | 'completedAt' | 'score'>[] {
  const dept = department.toLowerCase();
  if (dept.includes('finance') || dept.includes('accounting')) return FINANCE_TRAINING_ITEMS;
  // Default: generic training for all other departments
  return DEFAULT_TRAINING_ITEMS;
}

function initializeEmployeeItems(department: string, completedCount: number): TrainingItem[] {
  const template = getTrainingItemsForDepartment(department);
  return template.map((t, idx) => ({
    ...t,
    id: `training_${idx}`,
    status: (
      idx < completedCount ? 'completed' :
      idx === completedCount ? 'in_progress' :
      idx === completedCount + 1 ? 'available' : 'locked'
    ) as TrainingItemStatus,
    completedAt: idx < completedCount ? '2026-02-01T10:00:00Z' : undefined,
    score: idx < completedCount && t.format === 'quiz' ? 85 + Math.floor(Math.random() * 15) : undefined,
  }));
}

// ============================================
// Context Interface
// ============================================

interface TrainingContextType {
  // Get training progress for a specific employee
  getEmployeeProgress: (employeeId: string) => EmployeeTrainingProgress | undefined;
  // Get all employees' training progress (for HR view)
  getAllProgress: () => EmployeeTrainingProgress[];
  // Mark a training item as complete for an employee
  completeItem: (employeeId: string, itemId: string) => void;
  // Get training items for the current employee (convenience)
  getItems: (employeeId: string) => TrainingItem[];
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const useTraining = (): TrainingContextType => {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
};

// ============================================
// Provider
// ============================================

interface TrainingProviderProps {
  children: ReactNode;
}

function buildInitialState(): Record<string, EmployeeTrainingProgress> {
  // Try to load from localStorage first
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load training progress from localStorage', e);
  }

  // Build initial mock state
  const state: Record<string, EmployeeTrainingProgress> = {};

  // John Doe gets finance-specific training (the showcase employee)
  state['EMP-2024-001'] = {
    employeeId: 'EMP-2024-001',
    employeeName: 'John Doe',
    department: 'Finance',
    role: 'Financial Analyst',
    startDate: '2024-01-15',
    overallProgress: 41,
    status: 'in_progress',
    lastActivityDate: '2026-02-12',
    items: initializeEmployeeItems('Finance', 7),
  };

  // Other employees use the generic training from MOCK data
  for (const emp of MOCK_EMPLOYEE_TRAINING_PROGRESS) {
    if (emp.employeeId === 'EMP-2024-001') continue; // Skip John, already added above
    state[emp.employeeId] = { ...emp };
  }

  return state;
}

export const TrainingProvider: React.FC<TrainingProviderProps> = ({ children }) => {
  const [progressMap, setProgressMap] = useState<Record<string, EmployeeTrainingProgress>>(buildInitialState);
  const [loadedFromBackend, setLoadedFromBackend] = useState(false);

  // Fetch training data from backend on mount
  useEffect(() => {
    const fetchTrainingFromBackend = async () => {
      try {
        // Get current user from auth session
        const authSession = localStorage.getItem('derivhr_session');
        if (!authSession) return;

        const session = JSON.parse(authSession);
        const userId = session?.user?.id;

        if (!userId) return;

        // Fetch training from backend
        const response = await fetch(`http://localhost:5001/api/training/progress/${userId}`);

        if (response.ok) {
          const data = await response.json();

          if (data.status === 'ok' && data.training_data) {
            // Convert backend format to frontend format
            const employeeId = session.user.employeeId || userId;
            const trainingProgress: EmployeeTrainingProgress = {
              employeeId: employeeId,
              employeeName: `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim(),
              department: session.user.department || '',
              role: session.user.positionTitle || '',
              startDate: session.user.startDate || '',
              items: data.training_data,
              overallProgress: calculateProgress(data.training_data),
              status: determineStatus(data.training_data),
              lastActivityDate: data.last_synced_at || data.assigned_at
            };

            setProgressMap(prev => ({
              ...prev,
              [employeeId]: trainingProgress
            }));

            setLoadedFromBackend(true);
            console.log('✓ Training loaded from backend:', data.template, data.training_data.length, 'items');
          }
        }
      } catch (error) {
        console.warn('Failed to load training from backend, using mock data:', error);
      }
    };

    fetchTrainingFromBackend();
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progressMap));
  }, [progressMap]);

  const getEmployeeProgress = useCallback((employeeId: string) => {
    return progressMap[employeeId];
  }, [progressMap]);

  const getAllProgress = useCallback(() => {
    return Object.values(progressMap);
  }, [progressMap]);

  const getItems = useCallback((employeeId: string) => {
    return progressMap[employeeId]?.items || [];
  }, [progressMap]);

  const completeItem = useCallback((employeeId: string, itemId: string) => {
    setProgressMap(prev => {
      const emp = prev[employeeId];
      if (!emp) return prev;

      const updatedItems = emp.items.map((item, _idx, arr) => {
        if (item.id === itemId) {
          return {
            ...item,
            status: 'completed' as TrainingItemStatus,
            completedAt: new Date().toISOString(),
            score: item.format === 'quiz' ? 85 + Math.floor(Math.random() * 15) : undefined,
          };
        }
        return item;
      });

      // Unlock next locked item after the completed one
      const completedIdx = updatedItems.findIndex(t => t.id === itemId);
      if (completedIdx >= 0) {
        // Find the next locked item and make it available
        for (let i = completedIdx + 1; i < updatedItems.length; i++) {
          if (updatedItems[i].status === 'locked') {
            updatedItems[i] = { ...updatedItems[i], status: 'available' };
            break;
          }
          if (updatedItems[i].status !== 'completed') break;
        }
      }

      const completedCount = updatedItems.filter(t => t.status === 'completed').length;
      const newProgress = Math.round((completedCount / updatedItems.length) * 100);
      const hasOverdue = updatedItems.some(t =>
        t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()
      );

      const updatedProgress = {
        ...prev,
        [employeeId]: {
          ...emp,
          items: updatedItems,
          overallProgress: newProgress,
          status: newProgress === 100 ? 'completed' : hasOverdue ? 'overdue' : 'in_progress',
          lastActivityDate: new Date().toISOString(),
        },
      };

      // Sync to backend
      syncToBackend(employeeId, updatedItems);

      return updatedProgress;
    });
  }, []);

  // Sync training progress to backend
  const syncToBackend = async (employeeId: string, items: TrainingItem[]) => {
    try {
      // Get user ID from auth session
      const authSession = localStorage.getItem('derivhr_session');
      if (!authSession) return;

      const session = JSON.parse(authSession);
      const userId = session?.user?.id;

      if (!userId) return;

      await fetch('http://localhost:5001/api/training/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: userId,
          training_data: items
        })
      });

      console.log('✓ Training progress synced to backend');
    } catch (error) {
      console.warn('Failed to sync training to backend:', error);
    }
  };

  const value: TrainingContextType = {
    getEmployeeProgress,
    getAllProgress,
    completeItem,
    getItems,
  };

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
};
