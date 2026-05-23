import { getIconForItem } from '../icons';
import type { AgentItem } from '../types';

describe('getIconForItem', () => {
  test('returns icon + color for built-in execute_code', () => {
    const item: AgentItem = {
      kind: 'builtin',
      id: 'execute_code',
      name: 'Code',
      description: '',
      iconKey: 'execute_code',
    };
    const result = getIconForItem(item);
    expect(result.Icon).toBeDefined();
    expect(result.colorClass).toMatch(/emerald|green/);
  });

  test('returns a distinct color class per kind', () => {
    const kinds: AgentItem['kind'][] = ['tool', 'mcp', 'skill', 'action'];
    const colors = kinds.map((k) => {
      const item = {
        kind: k,
        id: 'x',
        name: 'x',
        description: '',
        iconKey: 'fallback',
      } as unknown as AgentItem;
      return getIconForItem(item).colorClass;
    });
    expect(new Set(colors).size).toBe(kinds.length);
  });

  test('falls back to a generic icon for unknown built-in ids', () => {
    const item: AgentItem = {
      kind: 'builtin',
      id: 'unknown_capability' as never,
      name: 'X',
      description: '',
      iconKey: 'unknown_capability',
    };
    const result = getIconForItem(item);
    expect(result.Icon).toBeDefined();
  });
});
