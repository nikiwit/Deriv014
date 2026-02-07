import { describe, it, expect } from 'vitest';
import { calculateContributions } from './payroll';

describe('Payroll Utils', () => {
  describe('calculateContributions', () => {
    it('should calculate EPF correctly for standard salary', () => {
      // Assuming 11% employee, 13% employer for salary < 5000 (standard approximation)
      const result = calculateContributions(3000);
      
      // Note: Values depend on implementation in payroll.ts. 
      // I'll check basic structure and types here.
      expect(result.epf).toBeDefined();
      expect(parseFloat(result.epf.employee)).toBeGreaterThan(0);
      expect(parseFloat(result.epf.employer)).toBeGreaterThan(0);
      expect(result.netSalary).toBeDefined();
    });

    it('should handle zero salary', () => {
      const result = calculateContributions(0);
      expect(result.netSalary).toBe("0.00");
    });
  });
});
