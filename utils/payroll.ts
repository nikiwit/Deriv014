import { PUBLIC_HOLIDAYS_MY } from '../constants';

export const calculateOvertime = (
  salary: number, 
  hours: number, 
  type: 'normal' | 'rest' | 'holiday',
  isManualLabour: boolean = false,
  state: string = 'Selangor',
  dateString?: string
) => {
  // Employment Act 1955 Coverage for OT (Section 60I):
  // Coverage extends to:
  // 1. Employees earning <= RM 4,000/month (Amendment 2022)
  // 2. Employees engaged in manual labour (regardless of salary)
  // 3. Employees supervising manual labour, operating vehicles, etc.
  
  const isCoveredByEA60I = salary <= 4000 || isManualLabour;
  
  // Ordinary Rate of Pay (ORP) formula for monthly rated employees
  const orp = salary / 26;
  const hourlyRate = orp / 8;

  let multiplier = 1.5;
  let description = "Normal Working Day (1.5x)";
  let warning = "";
  let isStateHoliday = false;

  // Check if specific date is a holiday in the specific state
  if (dateString) {
      const holiday = PUBLIC_HOLIDAYS_MY.find(h => h.date === dateString);
      if (holiday) {
          if (holiday.type === 'National' || holiday.states.includes('ALL') || holiday.states.includes(state)) {
              isStateHoliday = true;
          }
      }
  }

  // Override type if date matches a holiday
  if (isStateHoliday && type !== 'holiday') {
      type = 'holiday';
      warning += `Note: ${dateString} is a Public Holiday in ${state}. Rate adjusted automatically. `;
  }

  if (!isCoveredByEA60I) {
      warning += "Employee earns > RM 4,000. Statutory OT (EA 1955) is NOT mandatory unless specified in contract. Calculation uses standard formula for reference. ";
  }
  
  if (type === 'rest') {
    // Section 60(3): Work on rest day
    // Daily rated: 2 days wages. Monthly rated: 1/26 * 2? 
    // Simplified for tool: 2.0x hourly
    multiplier = 2.0;
    description = "Rest Day (2.0x)";
  }
  if (type === 'holiday') {
    // Section 60D(3): Work on public holiday
    // 2 days wages at ORP + Holiday Pay itself (effectively 3.0x for work done on that day if we count the paid holiday)
    // Standard practice for OT calculation on PH is usually 3.0x ORP
    multiplier = 3.0; 
    description = "Public Holiday (3.0x)";
  }

  const amount = hourlyRate * hours * multiplier;
  
  return { 
    hourlyRate: hourlyRate.toFixed(2), 
    multiplier, 
    amount: amount.toFixed(2),
    description,
    warning: warning.trim()
  };
};

export const calculateContributions = (salary: number) => {
    // EPF - KWSP Act 1991
    // Statutory Rate: Employee 11%
    // Employer: 13% for wage <= 5000, 12% for wage > 5000.
    const epfEmployeeRate = 0.11;
    const epfEmployerRate = salary <= 5000 ? 0.13 : 0.12;

    const epfEmployee = salary * epfEmployeeRate;
    const epfEmployer = salary * epfEmployerRate;

    // SOCSO & EIS Ceiling raised to RM 6,000 as of Oct 1, 2024 (Amendment Act A1720 & A1721)
    const socsoEisCeiling = 6000;

    // SOCSO - Employee Social Security Act 1969 (Category 1 - Employment Injury & Invalidity)
    const socsoSalary = Math.min(salary, socsoEisCeiling);
    const socsoEmployee = socsoSalary * 0.005; // Approx 0.5%
    const socsoEmployer = socsoSalary * 0.0175; // Approx 1.75%

    // EIS - Employment Insurance System
    const eisSalary = Math.min(salary, socsoEisCeiling);
    const eisEmployee = eisSalary * 0.002; // 0.2%
    const eisEmployer = eisSalary * 0.002; // 0.2%

    return {
        epf: { 
            employee: epfEmployee.toFixed(2), 
            employer: epfEmployer.toFixed(2),
            rateEm: `${(epfEmployeeRate*100).toFixed(0)}%`,
            rateEr: `${(epfEmployerRate*100).toFixed(0)}%`
        },
        socso: { 
            employee: socsoEmployee.toFixed(2), 
            employer: socsoEmployer.toFixed(2) 
        },
        eis: { 
            employee: eisEmployee.toFixed(2), 
            employer: eisEmployer.toFixed(2) 
        },
        totalDeductions: (epfEmployee + socsoEmployee + eisEmployee).toFixed(2),
        netSalary: (salary - epfEmployee - socsoEmployee - eisEmployee).toFixed(2)
    };
};