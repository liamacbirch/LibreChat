import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen } from '@testing-library/react';
import BuiltinDetail from '../BuiltinDetail';

const mockSetValue = jest.fn();

jest.mock('react-hook-form', () => ({
  useFormContext: () => ({
    control: {},
    setValue: mockSetValue,
  }),
  useWatch: ({ name }: { name: string }) => {
    const map: Record<string, unknown> = {
      execute_code: false,
      web_search: false,
      file_search: false,
      artifacts: '',
    };
    return map[name];
  },
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('@librechat/client', () => {
  const React = jest.requireActual('react');
  return {
    Switch: ({
      checked,
      onCheckedChange,
      ...props
    }: {
      checked?: boolean;
      onCheckedChange: (next: boolean) => void;
      [key: string]: unknown;
    }) =>
      React.createElement('input', {
        type: 'checkbox',
        checked,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onCheckedChange(e.target.checked),
        ...props,
      }),
  };
});

describe('BuiltinDetail', () => {
  beforeEach(() => {
    mockSetValue.mockClear();
  });

  test('execute_code shows a toggle that writes to the form', () => {
    render(<BuiltinDetail builtinId="execute_code" agentId="a" onRemove={jest.fn()} />);
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    expect(mockSetValue).toHaveBeenCalledWith(
      'execute_code',
      true,
      expect.objectContaining({ shouldDirty: true }),
    );
  });

  test('web_search shows a toggle that writes to the form', () => {
    render(<BuiltinDetail builtinId="web_search" agentId="a" onRemove={jest.fn()} />);
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    expect(mockSetValue).toHaveBeenCalledWith(
      'web_search',
      true,
      expect.objectContaining({ shouldDirty: true }),
    );
  });

  test('artifacts renders three mode tabs', () => {
    render(<BuiltinDetail builtinId="artifacts" agentId="a" onRemove={jest.fn()} />);
    expect(screen.getByRole('tab', { name: /default/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /always/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /disabled/i })).toBeInTheDocument();
  });

  test('clicking an artifacts mode tab writes to the form', () => {
    render(<BuiltinDetail builtinId="artifacts" agentId="a" onRemove={jest.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: /always/i }));
    expect(mockSetValue).toHaveBeenCalledWith(
      'artifacts',
      expect.any(String),
      expect.objectContaining({ shouldDirty: true }),
    );
  });

  test('context renders a "files picker coming soon" stub', () => {
    render(<BuiltinDetail builtinId="context" agentId="a" onRemove={jest.fn()} />);
    expect(screen.getByText(/context/i)).toBeInTheDocument();
  });

  test('file_search renders a stub', () => {
    render(<BuiltinDetail builtinId="file_search" agentId="a" onRemove={jest.fn()} />);
    expect(screen.getByText(/file_search|search/i)).toBeInTheDocument();
  });

  test('Remove from agent button calls onRemove', () => {
    const onRemove = jest.fn();
    render(<BuiltinDetail builtinId="execute_code" agentId="a" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /com_ui_tools_remove/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
