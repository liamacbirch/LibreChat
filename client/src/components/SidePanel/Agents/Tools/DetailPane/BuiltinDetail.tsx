import { useFormContext, useWatch } from 'react-hook-form';
import { Switch } from '@librechat/client';
import { ArtifactModes, AgentCapabilities } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import type { BuiltinId } from '../items/types';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface Props {
  builtinId: BuiltinId;
  agentId: string;
  onRemove: () => void;
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}

function ToggleRow({ label, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border-light p-4">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

interface ModeTabsProps {
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}

function ModeTabs({ value, onChange, options }: ModeTabsProps) {
  return (
    <div
      role="tablist"
      className="grid grid-cols-3 gap-1 rounded-xl border border-border-light p-1"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.label}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-surface-tertiary text-text-primary'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface StubProps {
  message: string;
}

function PlaceholderStub({ message }: StubProps) {
  return (
    <div className="rounded-xl border border-dashed border-border-light p-4 text-center text-xs text-text-tertiary">
      {message}
    </div>
  );
}

export default function BuiltinDetail({ builtinId, onRemove }: Props) {
  const localize = useLocalize();
  const { control, setValue } = useFormContext<AgentForm>();

  const executeCodeValue = (useWatch({ control, name: AgentCapabilities.execute_code }) ??
    false) as boolean;
  const webSearchValue = (useWatch({ control, name: AgentCapabilities.web_search }) ??
    false) as boolean;
  const artifactsValue = (useWatch({ control, name: AgentCapabilities.artifacts }) ?? '') as string;

  let body: React.ReactNode = null;

  if (builtinId === 'execute_code') {
    body = (
      <ToggleRow
        label={localize('com_ui_run_code')}
        checked={executeCodeValue}
        onCheckedChange={(next) =>
          setValue(AgentCapabilities.execute_code, next, { shouldDirty: true })
        }
      />
    );
  } else if (builtinId === 'web_search') {
    body = (
      <ToggleRow
        label={localize('com_ui_web_search')}
        checked={webSearchValue}
        onCheckedChange={(next) =>
          setValue(AgentCapabilities.web_search, next, { shouldDirty: true })
        }
      />
    );
  } else if (builtinId === 'file_search') {
    body = <PlaceholderStub message={localize('com_assistants_file_search_info')} />;
  } else if (builtinId === 'artifacts') {
    body = (
      <ModeTabs
        value={artifactsValue}
        onChange={(next) => setValue(AgentCapabilities.artifacts, next, { shouldDirty: true })}
        options={[
          { value: ArtifactModes.DEFAULT, label: localize('com_ui_default') },
          { value: 'always', label: localize('com_ui_always') },
          { value: '', label: localize('com_ui_disabled') },
        ]}
      />
    );
  } else if (builtinId === 'context') {
    body = <PlaceholderStub message={localize('com_agents_file_context_description')} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {body}
      <button
        type="button"
        onClick={onRemove}
        className="self-start rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-500/10"
      >
        {localize('com_ui_tools_remove')}
      </button>
    </div>
  );
}
