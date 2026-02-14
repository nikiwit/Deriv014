import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Briefcase,
  Building2,
  Calendar,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const API_BASE = "";

interface PendingEmployee {
  employee_id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  start_date: string;
  progress: number;
}

interface VerifyIdentityPageProps {
  onVerified: (employeeId: string) => void;
  onBack: () => void;
}

export const VerifyIdentityPage: React.FC<VerifyIdentityPageProps> = ({
  onVerified,
  onBack,
}) => {
  const { loginWithUser } = useAuth();
  const [employees, setEmployees] = useState<PendingEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<PendingEmployee | null>(null);
  const [nric, setNric] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending employees
  useEffect(() => {
    const fetchPendingEmployees = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/multiagent/onboarding/pending-employees`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.employees && data.employees.length > 0) {
            setEmployees(data.employees);
          }
          // If no real employees, fall through to demo
        }
      } catch (err) {
        console.error("Failed to fetch pending employees:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingEmployees();
  }, []);

  // Demo employees - always available for testing
  const demoEmployees: PendingEmployee[] = [
    {
      employee_id: "emp_demo_001",
      name: "John Doe",
      email: "john.doe@example.com",
      position: "Software Engineer",
      department: "Engineering",
      start_date: "2026-03-01",
      progress: 45,
    },
    {
      employee_id: "emp_demo_002",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      position: "Marketing Specialist",
      department: "Marketing",
      start_date: "2026-03-15",
      progress: 20,
    },
  ];

  // Use demo employees if no real employees found
  const displayEmployees = employees.length > 0 ? employees : demoEmployees;

  // Filter employees by search
  const filteredEmployees = displayEmployees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleVerify = async () => {
    if (!selectedEmployee || !nric.trim()) {
      setError("Please enter your NRIC number");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/multiagent/onboarding/verify-identity`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: selectedEmployee.employee_id,
            nric: nric.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // If API fails, allow demo mode for demo employees
        if (selectedEmployee.employee_id.startsWith("emp_demo_")) {
          // Demo mode - allow any NRIC
        } else {
          setError(data.error || "Verification failed");
          setVerifying(false);
          return;
        }
      }

      // Login as the employee and proceed to onboarding
      const user = {
        id: selectedEmployee.employee_id,
        email: selectedEmployee.email,
        firstName: selectedEmployee.name.split(" ")[0],
        lastName: selectedEmployee.name.split(" ").slice(1).join(" ") || "",
        role: "employee" as const,
        department: selectedEmployee.department,
        employeeId: selectedEmployee.employee_id,
        startDate: selectedEmployee.start_date,
        onboardingComplete: false,
        profilePicture: "",
      };

      loginWithUser(user);
      onVerified(selectedEmployee.employee_id);
    } catch (err) {
      // For demo employees, allow bypass
      if (selectedEmployee.employee_id.startsWith("emp_demo_")) {
        const user = {
          id: selectedEmployee.employee_id,
          email: selectedEmployee.email,
          firstName: selectedEmployee.name.split(" ")[0],
          lastName: selectedEmployee.name.split(" ").slice(1).join(" ") || "",
          role: "employee" as const,
          department: selectedEmployee.department,
          employeeId: selectedEmployee.employee_id,
          startDate: selectedEmployee.start_date,
          onboardingComplete: false,
          profilePicture: "",
        };

        loginWithUser(user);
        onVerified(selectedEmployee.employee_id);
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-jade-500 mx-auto mb-4" size={40} />
          <p className="text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-jade-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-jade-600" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            Verify Your Identity
          </h1>
          <p className="text-slate-600">
            Select your name and verify with NRIC to access your onboarding
          </p>
        </div>

        {!selectedEmployee ? (
          <>
            {/* Search */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-jade-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {filteredEmployees.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="text-slate-300 mx-auto mb-4" size={48} />
                  <p className="text-slate-500 font-medium">
                    {searchQuery
                      ? "No employees found matching your search"
                      : "No pending employees found"}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    If you believe this is an error, please contact HR
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.employee_id}
                      onClick={() => setSelectedEmployee(emp)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 bg-jade-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="text-jade-600" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate">{emp.name}</p>
                        <p className="text-sm text-slate-500 truncate">{emp.email}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Briefcase size={12} />
                            {emp.position}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Building2 size={12} />
                            {emp.department}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-jade-600">
                          {emp.progress}%
                        </div>
                        <div className="text-xs text-slate-400">complete</div>
                      </div>
                      <ArrowRight className="text-slate-300" size={20} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Verification Form */
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {/* Selected Employee */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl mb-6">
              <div className="w-12 h-12 bg-jade-100 rounded-full flex items-center justify-center">
                <User className="text-jade-600" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900">{selectedEmployee.name}</p>
                <p className="text-sm text-slate-500">{selectedEmployee.email}</p>
                <p className="text-xs text-slate-400">
                  {selectedEmployee.position} • {selectedEmployee.department}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  setNric("");
                  setError(null);
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Change
              </button>
            </div>

            {/* NRIC Input */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Enter your NRIC number to verify
              </label>
              <input
                type="text"
                value={nric}
                onChange={(e) => setNric(e.target.value)}
                placeholder="e.g., 901231-01-1234 or last 4 digits"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-jade-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-2">
                Enter your full NRIC or last 4 digits for verification
                {selectedEmployee?.employee_id.startsWith("emp_demo_") && (
                  <span className="text-jade-600 font-medium"> • Demo: any NRIC works</span>
                )}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl mb-6">
                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  setNric("");
                  setError(null);
                }}
                className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={verifying || !nric.trim()}
                className="flex-1 py-3 px-4 bg-jade-500 text-white rounded-xl font-bold hover:bg-jade-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Verify & Continue
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Back to Login */}
        <div className="text-center mt-8">
          <button
            onClick={onBack}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};
