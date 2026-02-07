import { describe, it, expect } from 'vitest';
import { AGENTS, getAgentConfig } from './agentRegistry';

describe('Agent Registry', () => {
  it('should have correct configuration for HR agent', () => {
    const agent = getAgentConfig('HR');
    expect(agent).toBeDefined();
    expect(agent.name).toBe('Global HR Specialist');
    expect(agent.allowedTools).toContain('ot_calc');
    expect(agent.themeColor).toBe('derivhr');
  });

  it('should have correct configuration for Finance agent', () => {
    const agent = getAgentConfig('Finance');
    expect(agent.allowedTools).toContain('epf_calc');
    expect(agent.themeColor).toBe('emerald');
  });

  it('should return correct agent object from registry', () => {
    expect(AGENTS['Logistics']).toBeDefined();
    expect(AGENTS['Logistics'].id).toBe('Logistics');
  });
});
