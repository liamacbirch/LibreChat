import { useFormContext, useWatch } from 'react-hook-form';
import { Switch } from '@librechat/client';
import { ArtifactModes, AgentCapabilities } from 'librechat-data-provider';
import type { AgentForm, ExtendedFile } from '~/common';
import type { BuiltinId } from '../../items/types';
import type { TranslationKeys } from '~/hooks/useLocalize';
import FileContext from '../../../FileContext';
import FileSearch from '../../../FileSearch';
import FileSearchCheckbox from '../../../FileSearchCheckbox';
import CodeFiles from '../../../Code/Files';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface Props {
  builtinId: BuiltinId;
  agentId: string;
  contextFiles: Array<[string, ExtendedFile]>;
  knowledgeFiles: Array<[string, ExtendedFile]>;
  codeFiles: Array<[string, ExtendedFile]>;
  description?: string;
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

export default function BuiltinSection({
  builtinId,
  agentId,
  contextFiles,
  knowledgeFiles,
  codeFiles,
  description,
}: Props) {
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
      <div className="flex flex-col gap-4">
        <ToggleRow
          label={localize('com_ui_run_code')}
          checked={executeCodeValue}
          onCheckedChange={(next) =>
            setValue(AgentCapabilities.execute_code, next, { shouldDirty: true })
          }
        />
        <CodeFiles agent_id={agentId} files={codeFiles} />
      </div>
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
    body = (
      <div className="flex flex-col gap-4">
        <FileSearchCheckbox />
        <FileSearch agent_id={agentId} files={knowledgeFiles} />
      </div>
    );
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
    body = <FileContext agent_id={agentId} files={contextFiles} />;
  }

  const localizedDescription = description ? localize(description as TranslationKeys) : '';

  return (
    <div className="flex flex-col gap-5">
      {localizedDescription && (
        <p className="text-sm leading-relaxed text-text-secondary">{localizedDescription}</p>
      )}
      {body}
    </div>
  );
}
