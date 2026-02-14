import React, { useState } from 'react';
import {
  Building2,
  Users,
  Award,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  CheckCircle2,
  Clock,
  Target,
  BookOpen,
  Video,
  ClipboardList,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Bot,
  Star,
  Zap
} from 'lucide-react';
import {
  DEPARTMENTS,
  ROLE_LEVELS,
  COMPANY_ONBOARDING,
  getDepartmentOnboarding,
  getRoleOnboarding,
  OnboardingLevel,
  ModuleTask,
  Department,
  RoleLevel
} from '../../types/onboarding';

interface EmployeeOnboardingData {
  name: string;
  department: string;
  role: string;
  startDate: string;
  level: string;
}

interface OnboardingJourneyLevelsProps {
  employeeData?: EmployeeOnboardingData;
}

export const OnboardingJourneyLevels: React.FC<OnboardingJourneyLevelsProps> = ({ employeeData }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('company');
  const [activeTab, setActiveTab] = useState<'overview' | 'training' | 'lms'>('overview');
  
  // Get department and role data
  const department = DEPARTMENTS.find(d => d.code === employeeData?.department) || DEPARTMENTS[0];
  const roleLevel = ROLE_LEVELS.find(r => r.id === employeeData?.level) || ROLE_LEVELS[2];
  
  // Generate onboarding levels
  const companyOnboarding = COMPANY_ONBOARDING;
  const deptOnboarding = getDepartmentOnboarding(department.code);
  const roleOnboarding = getRoleOnboarding(roleLevel.id);

  // Calculate progress
  const calculateProgress = (onboarding: OnboardingLevel) => {
    const allTasks = onboarding.modules.flatMap(m => m.tasks);
    const completed = allTasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / allTasks.length) * 100);
  };

  const companyProgress = calculateProgress(companyOnboarding);
  const deptProgress = calculateProgress(deptOnboarding);
  const roleProgress = calculateProgress(roleOnboarding);
  const overallProgress = Math.round((companyProgress + deptProgress + roleProgress) / 3);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const renderProgressBar = (progress: number, color: string = 'blue') => {
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500'
    };
    
    return (
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  const renderTaskIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={14} className="text-purple-500" />;
      case 'document': return <FileText size={14} className="text-blue-500" />;
      case 'training': return <GraduationCap size={14} className="text-green-500" />;
      case 'meeting': return <Users size={14} className="text-orange-500" />;
      case 'assignment': return <ClipboardList size={14} className="text-pink-500" />;
      case 'certification': return <Award size={14} className="text-amber-500" />;
      case 'quiz': return <CheckCircle2 size={14} className="text-indigo-500" />;
      default: return <CheckCircle2 size={14} className="text-slate-400" />;
    }
  };

  const renderTaskStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'in_progress':
        return <Clock size={16} className="text-amber-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
    }
  };

  const sections = [
    {
      id: 'company',
      title: 'Company Onboarding',
      subtitle: 'Required for all employees',
      icon: Building2,
      color: 'blue',
      progress: companyProgress,
      data: companyOnboarding
    },
    {
      id: 'department',
      title: `${department.name} Department`,
      subtitle: 'Department-specific training',
      icon: Users,
      color: 'purple',
      progress: deptProgress,
      data: deptOnboarding
    },
    {
      id: 'role',
      title: `${roleLevel.name} Role`,
      subtitle: 'Position-specific development',
      icon: Award,
      color: 'green',
      progress: roleProgress,
      data: roleOnboarding
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Target className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Onboarding Journey</h2>
              <p className="text-slate-300 text-sm">
                {employeeData?.name || 'New Employee'} • {department.name} • {roleLevel.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{overallProgress}%</div>
            <div className="text-slate-400 text-xs">Overall Progress</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          {renderProgressBar(overallProgress, 'green')}
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <Clock size={14} className="text-slate-400" />
            <span className="text-slate-300 text-xs">
              Est. {companyOnboarding.modules.reduce((a, m) => a + m.estimatedDuration, 0) + 
                    deptOnboarding.modules.reduce((a, m) => a + m.estimatedDuration, 0) +
                    roleOnboarding.modules.reduce((a, m) => a + m.estimatedDuration, 0)} min
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <BookOpen size={14} className="text-slate-400" />
            <span className="text-slate-300 text-xs">
              {companyOnboarding.modules.length + deptOnboarding.modules.length + roleOnboarding.modules.length} Modules
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap size={14} className="text-slate-400" />
            <span className="text-slate-300 text-xs">
              {department.requiredTrainings.length + roleLevel.requiredTrainings.length} Required
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Journey Overview
          </button>
          <button
            onClick={() => setActiveTab('training')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'training' 
                ? 'border-purple-500 text-purple-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Training Plan
          </button>
          <button
            onClick={() => setActiveTab('lms')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'lms' 
                ? 'border-green-500 text-green-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Learning Center
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {sections.map((section) => {
              const SectionIcon = section.icon;
              const isExpanded = expandedSection === section.id;
              
              return (
                <div 
                  key={section.id}
                  className="border border-slate-200 rounded-xl overflow-hidden"
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${section.color}-100`}>
                        <SectionIcon size={20} className={`text-${section.color}-600`} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-slate-800">{section.title}</h3>
                        <p className="text-xs text-slate-500">{section.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-700">{section.progress}%</div>
                        <div className="w-24">
                          {renderProgressBar(section.progress, section.color)}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown size={20} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={20} className="text-slate-400" />
                      )}
                    </div>
                  </button>
                  
                  {/* Section Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50 p-4">
                      <div className="space-y-3">
                        {section.data.modules.map((module) => (
                          <div 
                            key={module.id}
                            className="bg-white rounded-lg p-3 border border-slate-200"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-slate-800 text-sm">{module.title}</h4>
                              <span className="text-xs text-slate-500">{module.estimatedDuration} min</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {module.tasks.slice(0, 3).map((task) => (
                                <div 
                                  key={task.id}
                                  className="flex items-center space-x-1"
                                  title={task.title}
                                >
                                  {renderTaskIcon(task.type)}
                                  {renderTaskStatus(task.status)}
                                </div>
                              ))}
                              {module.tasks.length > 3 && (
                                <span className="text-xs text-slate-400">+{module.tasks.length - 3}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'training' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center space-x-3 mb-3">
                <Sparkles className="text-purple-500" size={20} />
                <h3 className="font-bold text-purple-800">AI-Generated Training Plan</h3>
              </div>
              <p className="text-sm text-purple-700 mb-3">
                Based on your contract and role, we've customized your training path. 
                The plan includes company essentials, department-specific skills, and role advancement training.
              </p>
              <button className="text-sm font-medium text-purple-600 hover:text-purple-800 flex items-center space-x-1">
                <Bot size={14} />
                <span>View AI Recommendations</span>
              </button>
            </div>

            {/* Timeline View */}
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
              
              {sections.flatMap(section => 
                section.data.modules.map((module, idx) => (
                  <div key={module.id} className="relative pl-10 pb-6">
                    <div className="absolute left-2 w-5 h-5 rounded-full bg-white border-2 border-blue-500" />
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-800">{module.title}</h4>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
                          {section.title.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{module.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {module.tasks.slice(0, 2).map(task => (
                            <div key={task.id} className="flex items-center space-x-1">
                              {renderTaskIcon(task.type)}
                              <span className="text-xs text-slate-600">{task.title.slice(0, 15)}...</span>
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-slate-400">{module.estimatedDuration} min</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'lms' && (
          <LearningCenterMockup 
            department={department}
            roleLevel={roleLevel}
          />
        )}
      </div>
    </div>
  );
};

// Learning Management System Mockup Component
interface LearningCenterMockupProps {
  department: Department;
  roleLevel: RoleLevel;
}

const LearningCenterMockup: React.FC<LearningCenterMockupProps> = ({ department, roleLevel }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const courses = [
    {
      id: 'c1',
      title: 'Company Culture & Values',
      category: 'culture',
      duration: 45,
      progress: 100,
      type: 'video',
      required: true
    },
    {
      id: 'c2',
      title: 'Data Security Fundamentals',
      category: 'security',
      duration: 60,
      progress: 75,
      type: 'interactive',
      required: true
    },
    {
      id: 'c3',
      title: `${department.name} Team Overview`,
      category: 'department',
      duration: 30,
      progress: 0,
      type: 'video',
      required: true
    },
    {
      id: 'c4',
      title: 'Department Tools Training',
      category: 'technical',
      duration: 90,
      progress: 0,
      type: 'interactive',
      required: true
    },
    {
      id: 'c5',
      title: 'Leadership Essentials',
      category: 'soft_skills',
      duration: 120,
      progress: 0,
      type: 'video',
      required: roleLevel.level >= 5
    },
    {
      id: 'c6',
      title: 'Communication Skills',
      category: 'soft_skills',
      duration: 45,
      progress: 30,
      type: 'quiz',
      required: false
    },
    {
      id: 'c7',
      title: 'Product Knowledge',
      category: 'product',
      duration: 60,
      progress: 0,
      type: 'document',
      required: true
    },
    {
      id: 'c8',
      title: 'Compliance & Ethics',
      category: 'compliance',
      duration: 45,
      progress: 50,
      type: 'training',
      required: true
    }
  ];

  const categories = [
    { id: 'all', label: 'All Courses', count: courses.length },
    { id: 'required', label: 'Required', count: courses.filter(c => c.required).length },
    { id: 'in_progress', label: 'In Progress', count: courses.filter(c => c.progress > 0 && c.progress < 100).length },
    { id: 'completed', label: 'Completed', count: courses.filter(c => c.progress === 100).length }
  ];

  const getCourseIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={18} className="text-purple-500" />;
      case 'interactive': return <Play size={18} className="text-green-500" />;
      case 'quiz': return <CheckCircle2 size={18} className="text-blue-500" />;
      case 'document': return <FileText size={18} className="text-amber-500" />;
      case 'training': return <GraduationCap size={18} className="text-pink-500" />;
      default: return <BookOpen size={18} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* LMS Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <GraduationCap className="text-green-600" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Learning Center</h3>
            <p className="text-xs text-slate-500">Your personalized training platform</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Star size={16} className="text-amber-400" fill="currentColor" />
          <span className="text-sm font-medium text-slate-700">
            {courses.filter(c => c.progress === 100).length} / {courses.length} Completed
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.label}
            <span className="ml-2 text-xs opacity-70">({cat.count})</span>
          </button>
        ))}
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses
          .filter(course => {
            if (activeCategory === 'all') return true;
            if (activeCategory === 'required') return course.required;
            if (activeCategory === 'in_progress') return course.progress > 0 && course.progress < 100;
            if (activeCategory === 'completed') return course.progress === 100;
            return true;
          })
          .map(course => (
          <div 
            key={course.id}
            className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                course.progress === 100 ? 'bg-green-100' : 'bg-slate-100'
              }`}>
                {getCourseIcon(course.type)}
              </div>
              {course.required && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-medium">
                  Required
                </span>
              )}
            </div>
            
            <h4 className="font-medium text-slate-800 mb-1">{course.title}</h4>
            <div className="flex items-center space-x-3 text-xs text-slate-500 mb-3">
              <span>{course.duration} min</span>
              <span>•</span>
              <span className="capitalize">{course.type}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Progress</span>
                <span className="font-medium text-slate-700">{course.progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${course.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
            
            {course.progress === 100 && (
              <div className="mt-3 flex items-center space-x-1 text-green-600 text-sm font-medium">
                <CheckCircle2 size={14} />
                <span>Completed</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
          <Play size={16} />
          <span>Continue Learning</span>
        </button>
        <button className="flex items-center justify-center space-x-2 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors">
          <BookOpen size={16} />
          <span>View Transcript</span>
        </button>
      </div>
    </div>
  );
};

export default OnboardingJourneyLevels;
