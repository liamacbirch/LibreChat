import { useFormContext } from 'react-hook-form';
import { Checkbox } from '@librechat/client';
import { Constants } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import type { McpItem } from '../../items/types';
import MCPToolItem from '../../../MCPToolItem';
import MCPConfigDialog from '~/components/MCP/MCPConfigDialog';
import MCPServerStatusIcon from '~/components/MCP/MCPServerStatusIcon';
import {
  useAgentCapabilities,
  useGetAgentsConfig,
  useMCPServerManager,
  useMCPToolOptions,
} from '~/hooks';
import { useLocalize } from '~/hooks';

interface Props {
  item: McpItem;
}

export default function McpSection({ item }: Props) {
  const localize = useLocalize();
  const { getValues, setValue } = useFormContext<AgentForm>();
  const { getServerStatusIconProps, getConfigDialogProps } = useMCPServerManager();
  const { agentsConfig } = useGetAgentsConfig();
  const { deferredToolsEnabled, programmaticToolsEnabled } = useAgentCapabilities(
    agentsConfig?.capabilities,
  );
  const { isToolDeferred, isToolProgrammatic, toggleToolDefer, toggleToolProgrammatic } =
    useMCPToolOptions();

  const serverName = item.server.serverName;
  const tools = item.server.tools ?? [];
  const hasTools = tools.length > 0;

  const getSelectedTools = (): string[] => {
    const formTools = (getValues('tools') ?? []) as string[];
    return tools.filter((t) => formTools.includes(t.tool_id)).map((t) => t.tool_id);
  };

  const updateFormTools = (next: string[]) => {
    const current = (getValues('tools') ?? []) as string[];
    const otherTools = current.filter((t) => !tools.some((st) => st.tool_id === t));
    setValue('tools', [...otherTools, ...next], { shouldDirty: true });
  };

  const toggleToolSelect = (toolId: string) => {
    const selected = getSelectedTools();
    const next = selected.includes(toolId)
      ? selected.filter((t) => t !== toolId)
      : [...selected, toolId];
    updateFormTools(next);
  };

  const toggleAll = (checked: boolean) => {
    const next = checked
      ? tools.map((t) => t.tool_id)
      : [`${Constants.mcp_server}${Constants.mcp_delimiter}${serverName}`];
    updateFormTools(next);
  };

  const selectedTools = getSelectedTools();
  const allSelected = hasTools && selectedTools.length === tools.length;
  const statusIconProps = getServerStatusIconProps(serverName);
  const configDialogProps = getConfigDialogProps();

  return (
    <div className="flex flex-col gap-5">
      {item.description && (
        <p className="text-sm leading-relaxed text-text-secondary">{item.description}</p>
      )}

      {statusIconProps && (
        <div className="flex items-center justify-between rounded-xl border border-border-light bg-surface-secondary px-3 py-2.5">
          <span className="text-sm font-medium text-text-primary">
            {item.server.isConfigured
              ? localize('com_ui_tools_mcp_status_configured')
              : localize('com_ui_tools_mcp_status_unconfigured')}
          </span>
          <MCPServerStatusIcon {...statusIconProps} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            {localize('com_ui_tools_mcp_tools_section')}
          </span>
          {hasTools && (
            <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => toggleAll(checked === true)}
                aria-label={
                  allSelected
                    ? localize('com_ui_tools_mcp_deselect_all')
                    : localize('com_ui_tools_mcp_select_all')
                }
                className="size-4 rounded border border-border-medium"
              />
              <span>
                {allSelected
                  ? localize('com_ui_tools_mcp_deselect_all')
                  : localize('com_ui_tools_mcp_select_all')}
              </span>
            </label>
          )}
        </div>
        {hasTools ? (
          <div className="flex flex-col gap-1">
            {tools.map((tool) => (
              <MCPToolItem
                key={tool.tool_id}
                tool={tool}
                isSelected={selectedTools.includes(tool.tool_id)}
                isDeferred={deferredToolsEnabled && isToolDeferred(tool.tool_id)}
                isProgrammatic={programmaticToolsEnabled && isToolProgrammatic(tool.tool_id)}
                deferredToolsEnabled={deferredToolsEnabled}
                programmaticToolsEnabled={programmaticToolsEnabled}
                onToggleSelect={() => toggleToolSelect(tool.tool_id)}
                onToggleDefer={() => toggleToolDefer(tool.tool_id)}
                onToggleProgrammatic={() => toggleToolProgrammatic(tool.tool_id)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border-light p-3 text-center text-xs text-text-tertiary">
            {localize('com_ui_tools_mcp_no_tools')}
          </p>
        )}
      </div>

      {configDialogProps && <MCPConfigDialog {...configDialogProps} />}
    </div>
  );
}
