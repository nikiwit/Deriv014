import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, ChevronRight, FileText, User, Building, Shield, Calendar, RefreshCw, Download, Send } from 'lucide-react';

interface OnboardingPhase {
  phase: string;
  name: string;
  start_date: string;
  end_date: string;
  tasks: OnboardingTask[];
}

interface OnboardingTask {
  id: string;
  task: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner: string;
  due_date?: string;
}

interface OnboardingPlan {
  plan_id: string;
  employee_id: string;
  employee_name: string;
  position: string;
  department: string;
  jurisdiction: string;
  employment_type: string;
  start_date: string;
  status: string;
  phases: OnboardingPhase[];
  total_tasks: number;
  completed_tasks: number;
  progress_percentage: number;
}

interface DocumentPackage {
  package_id: string;
  documents: DocumentItem[];
  total_documents: number;
  completed_documents: number;
  status: string;
}

interface DocumentItem {
  type: string;
  required: boolean;
  status: 'pending' | 'generated' | 'sent' | 'signed';
}

const API_BASE = '/api/agents';

const phaseIcons: Record<string, React.ReactNode> = {
  pre_onboarding: <Calendar className="w-5 h-5" />,
  day_one: <User className="w-5 h-5" />,
  first_week: <Building className="w-5 h-5" />,
  first_month: <Shield className="w-5 h-5" />,
  probation: <CheckCircle className="w-5 h-5" />,
};

const phaseColors: Record<string, string> = {
  pre_onboarding: 'bg-purple-100 text-purple-700 border-purple-300',
  day_one: 'bg-blue-100 text-blue-700 border-blue-300',
  first_week: 'bg-green-100 text-green-700 border-green-300',
  first_month: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  probation: 'bg-orange-100 text-orange-700 border-orange-300',
};

export const OnboardingWorkflow: React.FC<{
  employeeData?: Record<string, any>;
}> = ({ employeeData = {} }) => {
  const [plan, setPlan] = useState<OnboardingPlan | null>(null);
  const [documentPackage, setDocumentPackage] = useState<DocumentPackage | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [jurisdiction, setJurisdiction] = useState(employeeData.jurisdiction || 'MY');
  const [employmentType, setEmploymentType] = useState(employeeData.employment_type || 'full_time');
  const [startDate, setStartDate] = useState(employeeData.start_date || new Date().toISOString().split('T')[0]);
  const [employeeId, setEmployeeId] = useState(employeeData.id || '');

  const createOnboardingPlan = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'onboarding_agent',
          payload: {
            action: 'create_plan',
          },
          context: {
            employee_id: employeeId || `emp_${Date.now()}`,
            employee_name: employeeData.full_name || employeeData.name || 'New Employee',
            position: employeeData.position || 'Employee',
            department: employeeData.department || 'General',
            jurisdiction,
            employment_type: employmentType,
            start_date: startDate,
          },
        }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setPlan(data.data);
        setActivePhase(data.data.phases?.[0]?.phase || null);
      }
    } catch (error) {
      console.error('Failed to create onboarding plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDocumentPackage = async () => {
    if (!plan) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'onboarding_agent',
          payload: {
            action: 'document_package',
          },
          context: {
            employee_id: plan.employee_id,
            jurisdiction: plan.jurisdiction,
            employment_type: plan.employment_type,
          },
        }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setDocumentPackage(data.data);
      }
    } catch (error) {
      console.error('Failed to generate document package:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    if (!plan) return;
    
    try {
      await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'onboarding_agent',
          payload: {
            action: 'update_checklist',
          },
          context: {
            employee_id: plan.employee_id,
            item_id: taskId,
            status,
          },
        }),
      });
      
      setPlan(prev => {
        if (!prev) return null;
        const updatedPhases = prev.phases.map(phase => ({
          ...phase,
          tasks: phase.tasks.map(task =>
            task.id === taskId ? { ...task, status: status as any } : task
          ),
        }));
        const completedTasks = updatedPhases.reduce(
          (sum, phase) => sum + phase.tasks.filter(t => t.status === 'completed').length,
          0
        );
        return {
          ...prev,
          phases: updatedPhases,
          completed_tasks: completedTasks,
          progress_percentage: Math.round((completedTasks / prev.total_tasks) * 100),
        };
      });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const advancePhase = async () => {
    if (!plan || !activePhase) return;
    
    try {
      const response = await fetch(`${API_BASE}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'onboarding_agent',
          payload: {
            action: 'advance_phase',
          },
          context: {
            employee_id: plan.employee_id,
            current_phase: activePhase,
          },
        }),
      });
      const data = await response.json();
      if (data.success && data.data?.new_phase) {
        setActivePhase(data.data.new_phase);
      }
    } catch (error) {
      console.error('Failed to advance phase:', error);
    }
  };

  useEffect(() => {
    if (employeeData.id && employeeData.start_date) {
      createOnboardingPlan();
    }
  }, [employeeData.id]);

  return (
    <div className="space-y-6">
      {/* Setup Panel */}
      {!plan && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Create Onboarding Plan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="EMP001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="MY">Malaysia</option>
                <option value="SG">Singapore</option>
              </select>
            </div>
          </div>

          <button
            onClick={createOnboardingPlan}
            disabled={!employeeId || !startDate || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            Create Onboarding Plan
          </button>
        </div>
      )}

      {/* Progress Overview */}
      {plan && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">{plan.employee_name}</h2>
              <p className="text-sm text-gray-500">{plan.position} • {plan.department}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{plan.progress_percentage}%</p>
              <p className="text-sm text-gray-500">{plan.completed_tasks}/{plan.total_tasks} tasks</p>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
            <div
              className="h-3 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${plan.progress_percentage}%` }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={generateDocumentPackage}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Generate Documents
            </button>
            <button
              onClick={advancePhase}
              disabled={!activePhase}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              Advance Phase
            </button>
          </div>
        </div>
      )}

      {/* Phases */}
      {plan && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {plan.phases.map((phase, index) => {
            const isActive = activePhase === phase.phase;
            const isCompleted = phase.tasks.every(t => t.status === 'completed');
            const completedInPhase = phase.tasks.filter(t => t.status === 'completed').length;
            
            return (
              <div
                key={phase.phase}
                onClick={() => setActivePhase(phase.phase)}
                className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all border-2 ${
                  isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-200'
                }`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-3 ${phaseColors[phase.phase]}`}>
                  {phaseIcons[phase.phase]}
                </div>
                
                <h3 className="font-medium text-sm">{phase.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {completedInPhase}/{phase.tasks.length} tasks
                </p>
                
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-400'}`}
                    style={{ width: `${(completedInPhase / phase.tasks.length) * 100}%` }}
                  />
                </div>
                
                <p className="text-xs text-gray-400 mt-2">
                  {phase.start_date} - {phase.end_date}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tasks for Active Phase */}
      {plan && activePhase && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {plan.phases.find(p => p.phase === activePhase)?.name} Tasks
          </h2>

          <div className="space-y-3">
            {plan.phases
              .find(p => p.phase === activePhase)
              ?.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    task.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : task.status === 'in_progress'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (task.status === 'completed') {
                          updateTaskStatus(task.id, 'pending');
                        } else {
                          updateTaskStatus(task.id, 'completed');
                        }
                      }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        task.status === 'completed'
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {task.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                    </button>
                    <div>
                      <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                        {task.task}
                      </p>
                      <p className="text-xs text-gray-500">Owner: {task.owner}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200"
                      >
                        Start
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Document Package */}
      {documentPackage && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Document Package</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentPackage.documents.map((doc, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  doc.status === 'signed'
                    ? 'bg-green-50 border-green-200'
                    : doc.status === 'sent'
                    ? 'bg-blue-50 border-blue-200'
                    : doc.status === 'generated'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-sm">{doc.type.replace(/_/g, ' ')}</span>
                  </div>
                  {doc.required && (
                    <span className="text-xs text-red-500">Required</span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-xs capitalize ${
                    doc.status === 'signed' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {doc.status}
                  </span>
                  <div className="flex gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded" title="Download">
                      <Download className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="Send">
                      <Send className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingWorkflow;