// import React, { useState } from 'react';
// import { AuthProvider, useAuth } from './contexts/AuthContext';
// import { LoginPage } from './components/auth/LoginPage';
// import { Layout } from './components/Layout';
// import { EmployeeLayout } from './components/employee/EmployeeLayout';
// import { Dashboard } from './components/Dashboard';
// import { DocumentGen } from './components/DocumentGen';
// import { ChatAssistant } from './components/ChatAssistant';
// import { WorkforceAnalytics } from './components/WorkforceAnalytics';
// import { ModelTraining } from './components/ModelTraining';
// import { KnowledgeBase } from './components/KnowledgeBase';
// import { LeaveManagement } from './components/LeaveManagement';
// import { Onboarding } from './components/Onboarding';
// import { CandidatePortal } from './components/CandidatePortal';
// import { NewEmployeePage } from './components/NewEmployeePage';
// import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
// import { MyOnboarding } from './components/employee/MyOnboarding';
// import { MyLeave } from './components/employee/MyLeave';
// import { MyDocuments } from './components/employee/MyDocuments';
// import { MyProfile } from './components/employee/MyProfile';
// import { ViewState } from './types';

// function AppContent() {
//   const { user, isAuthenticated, isLoading } = useAuth();
//   const [currentView, setCurrentView] = useState<ViewState>('dashboard');

//   // Show loading state
//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-slate-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-derivhr-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-slate-500 font-medium">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   // Show new employee page (accessible without authentication)
//   if (currentView === 'new_employee') {
//     return <NewEmployeePage onNavigate={setCurrentView} isAuthenticated={isAuthenticated} />;
//   }

//   // Show login page if not authenticated
//   if (!isAuthenticated || !user) {
//     return <LoginPage 
//       onLoginSuccess={() => setCurrentView('dashboard')} 
//       onNewOnboarding={() => setCurrentView('new_employee')}
//     />;
//   }

//   // HR Admin Portal
//   if (user.role === 'hr_admin') {
//     const renderHRView = () => {
//       switch (currentView) {
//         case 'dashboard':
//           return <Dashboard onNavigate={setCurrentView} />;
//         case 'documents':
//           return <DocumentGen />;
//         case 'assistant':
//           return <ChatAssistant />;
//         case 'knowledge':
//           return <KnowledgeBase />;
//         case 'planning':
//           return <WorkforceAnalytics />;
//         case 'training':
//           return <ModelTraining />;
//         case 'leave':
//           return <LeaveManagement />;
//         case 'onboarding':
//           return <Onboarding />;
//         case 'candidate':
//           return <CandidatePortal />;
//         default:
//           return <Dashboard />;
//       }
//     };

//     return (
//       <Layout currentView={currentView} onNavigate={setCurrentView}>
//         {renderHRView()}
//       </Layout>
//     );
//   }

//   // Employee Portal
//   if (user.role === 'employee') {
//     const renderEmployeeView = () => {
//       switch (currentView) {
//         case 'employee_dashboard':
//           return <EmployeeDashboard onNavigate={setCurrentView} />;
//         case 'my_onboarding':
//           return <MyOnboarding />;
//         case 'my_leave':
//           return <MyLeave />;
//         case 'my_documents':
//           return <MyDocuments />;
//         case 'my_profile':
//           return <MyProfile />;
//         default:
//           return <EmployeeDashboard onNavigate={setCurrentView} />;
//       }
//     };

//     return (
//       <EmployeeLayout currentView={currentView} onNavigate={setCurrentView}>
//         {renderEmployeeView()}
//       </EmployeeLayout>
//     );
//   }

//   // Fallback
//   return <LoginPage onLoginSuccess={() => {}} />;
// }

// function App() {
//   return (
//     <AuthProvider>
//       <AppContent />
//     </AuthProvider>
//   );
// }

// export default App;


import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { Layout } from './components/Layout';
import { EmployeeLayout } from './components/employee/EmployeeLayout';
import { Dashboard } from './components/Dashboard';
import { DocumentGen } from './components/DocumentGen';
import { ChatAssistant } from './components/ChatAssistant';
import { WorkforceAnalytics } from './components/WorkforceAnalytics';
import { ModelTraining } from './components/ModelTraining';
import { KnowledgeBase } from './components/KnowledgeBase';
import { LeaveManagement } from './components/LeaveManagement';
import { Onboarding } from './components/Onboarding';
import { CandidatePortal } from './components/CandidatePortal';
import { NewEmployeePage } from './components/NewEmployeePage';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { MyOnboarding } from './components/employee/MyOnboarding';
import { MyLeave } from './components/employee/MyLeave';
import { MyDocuments } from './components/employee/MyDocuments';
import { MyProfile } from './components/employee/MyProfile';
import { EmployeeChatAssistant } from './components/EmployeeChatAssistant';
import { ViewState, User, UserRole } from './types';

// Helper: load user profile from localStorage if exists
function getUserFromOnboardingProfile(): User | null {
  try {
    const savedProfile = localStorage.getItem('onboardingProfile');
    if (!savedProfile) return null;

    const data = JSON.parse(savedProfile);

    // Map onboardingData to User interface
    const user: User = {
      id: data.email || 'temp-id',
      email: data.email,
      firstName: data.fullName?.split(' ')[0] || '',
      lastName: data.fullName?.split(' ').slice(1).join(' ') || '',
      role: 'employee' as UserRole,
      department: data.department || '',
      employeeId: '', // optional: generate later
      startDate: data.startDate || '',
      onboardingComplete: true,
      profilePicture: '',
      nationality: data.nationality || 'Malaysian',
      nric: data.nric || ''
    };
    return user;
  } catch (e) {
    console.warn('Failed to load onboarding profile from localStorage', e);
    return null;
  }
}

function AppContent() {
  const { user: authUser, isAuthenticated, isLoading, setUser } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [loadingLocalUser, setLoadingLocalUser] = useState(true);

  // Try to load onboardingProfile as a temporary authenticated user
  useEffect(() => {
    const localUser = getUserFromOnboardingProfile();
    if (localUser) {
      setUser(localUser); // set in auth context
      setCurrentView('dashboard');
    }
    setLoadingLocalUser(false);
  }, [setUser]);

  if (isLoading || loadingLocalUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-derivhr-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'new_employee') {
    return <NewEmployeePage onNavigate={setCurrentView} isAuthenticated={isAuthenticated} />;
  }

  if (!isAuthenticated || !authUser) {
    return <LoginPage 
      onLoginSuccess={() => setCurrentView('dashboard')} 
      onNewOnboarding={() => setCurrentView('new_employee')}
    />;
  }

  // HR Admin Portal
  if (authUser.role === 'hr_admin') {
    const renderHRView = () => {
      switch (currentView) {
        case 'dashboard':
          return <Dashboard onNavigate={setCurrentView} />;
        case 'documents':
          return <DocumentGen />;
        case 'assistant':
          return <ChatAssistant />;
        case 'knowledge':
          return <KnowledgeBase />;
        case 'planning':
          return <WorkforceAnalytics />;
        case 'training':
          return <ModelTraining />;
        case 'leave':
          return <LeaveManagement />;
        case 'onboarding':
          return <Onboarding />;
        case 'candidate':
          return <CandidatePortal />;
        default:
          return <Dashboard />;
      }
    };

    return (
      <Layout currentView={currentView} onNavigate={setCurrentView}>
        {renderHRView()}
      </Layout>
    );
  }

  // Employee Portal
  if (authUser.role === 'employee') {
    const renderEmployeeView = () => {
      switch (currentView) {
        case 'employee_dashboard':
          return <EmployeeDashboard onNavigate={setCurrentView} />;
        case 'my_onboarding':
          return <MyOnboarding />;
        case 'my_leave':
          return <MyLeave />;
        case 'my_documents':
          return <MyDocuments />;
        case 'employee_chat':
          return <EmployeeChatAssistant />;
        case 'my_profile':
          return <MyProfile />;
        default:
          return <EmployeeDashboard onNavigate={setCurrentView} />;
      }
    };

    return (
      <EmployeeLayout currentView={currentView} onNavigate={setCurrentView}>
        {renderEmployeeView()}
      </EmployeeLayout>
    );
  }

  return <LoginPage onLoginSuccess={() => {}} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

