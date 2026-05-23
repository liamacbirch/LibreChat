import type { AgentItem, AgentItemKind } from '../types';

describe('AgentItem types', () => {
  test('discriminator narrows the union', () => {
    const builtin: AgentItem = {
      kind: 'builtin',
      id: 'execute_code',
      name: 'Code Interpreter',
      description: 'Run Python',
      iconKey: 'execute_code',
    };

    expect(builtin.kind).toBe('builtin');
    if (builtin.kind === 'builtin') {
      expect(builtin.id).toBe('execute_code');
    }
  });

  test('AgentItemKind enumerates all five kinds', () => {
    const kinds: AgentItemKind[] = ['builtin', 'tool', 'mcp', 'skill', 'action'];
    expect(new Set(kinds).size).toBe(5);
  });
});
