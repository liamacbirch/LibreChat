import { useState, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFormContext, useWatch } from 'react-hook-form';
import { Button, OGDialog, OGDialogContent, useToastContext } from '@librechat/client';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import type { AgentItem, AgentItemKind, ItemFilter } from './items/types';
import type { CategoryOption } from './CategoryFilter';
import { useLocalize, useHasAccess, useCategories } from '~/hooks';
import { useListSkillsQuery } from '~/data-provider';
import { useAgentPanelContext } from '~/Providers';
import MarketplaceSidebar from './MarketplaceSidebar';
import MarketplaceCatalog from './MarketplaceCatalog';
import CategoryFilter from './CategoryFilter';
import ItemDialog from './ItemDialog/ItemDialog';
import AddMcpServerDialog from './ItemDialog/AddMcpServerDialog';
import { computeToggleAction } from './items/mutations';
import { deriveSelectedItems } from './items/selectors';
import { applyFilter } from './items/filtering';
import { buildCatalog } from './items/catalog';

interface ToolsMarketplaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
}

type View = NonNullable<ItemFilter['view']>;
type Kind = AgentItemKind | 'all';

export default function ToolsMarketplaceDialog({
  open,
  onOpenChange,
  agentId,
}: ToolsMarketplaceDialogProps) {
  const localize = useLocalize();
  const { control, getValues, setValue } = useFormContext<AgentForm>();
  const { agentsConfig, regularTools, mcpServersMap, actions } = useAgentPanelContext();

  const hasMcpAccess = useHasAccess({
    permissionType: PermissionTypes.MCP_SERVERS,
    permission: Permissions.USE,
  });
  const hasSkillsAccess = useHasAccess({
    permissionType: PermissionTypes.SKILLS,
    permission: Permissions.USE,
  });

  const { data: skillsData } = useListSkillsQuery({ limit: 100 }, { enabled: hasSkillsAccess });

  const tools = (useWatch({ control, name: 'tools' }) ?? []) as string[];
  const skills = (useWatch({ control, name: 'skills' }) ?? []) as string[];
  const executeCode = (useWatch({ control, name: 'execute_code' }) ?? false) as boolean;
  const webSearch = (useWatch({ control, name: 'web_search' }) ?? false) as boolean;
  const fileSearch = (useWatch({ control, name: 'file_search' }) ?? false) as boolean;
  const artifacts = (useWatch({ control, name: 'artifacts' }) ?? '') as string;
  const agent = useWatch({ control, name: 'agent' });
  const contextFiles = (agent?.context_files ?? []) as Array<[string, unknown]>;
  const knowledgeFiles = (agent?.knowledge_files ?? []) as Array<[string, unknown]>;
  const codeFiles = (agent?.code_files ?? []) as Array<[string, unknown]>;

  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { categories } = useCategories({ className: 'size-4', hasAccess: true });
  const categoryOptions = useMemo<CategoryOption[]>(
    () =>
      ((categories ?? []) as Array<{ value?: string; label: string; icon?: React.ReactNode }>)
        .filter((c) => Boolean(c.value))
        .map((c) => ({ value: c.value as string, label: c.label, icon: c.icon })),
    [categories],
  );

  const [view, setView] = useState<View>('marketplace');
  const [kind, setKind] = useState<Kind>('all');
  const [category, setCategory] = useState<string | 'all'>('all');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState<AgentItem | null>(null);
  const [addMcpOpen, setAddMcpOpen] = useState(false);

  const handleCreateNew = useCallback(
    (createKind: 'skill' | 'mcp' | 'action') => {
      if (createKind === 'skill') {
        navigate('/skills/new');
        onOpenChange(false);
        return;
      }
      if (createKind === 'mcp') {
        setAddMcpOpen(true);
        return;
      }
      showToast({ message: localize('com_ui_coming_soon'), status: 'info' });
    },
    [navigate, onOpenChange, showToast, localize],
  );

  const agentActions = useMemo(
    () => (actions ?? []).filter((a) => a.agent_id === agentId),
    [actions, agentId],
  );

  const catalog = useMemo(
    () =>
      buildCatalog({
        agentsConfig: { capabilities: agentsConfig?.capabilities ?? [] },
        regularTools: regularTools ?? [],
        mcpServersMap: mcpServersMap ?? new Map(),
        skills: skillsData?.skills ?? [],
        actions: agentActions,
        permissions: { mcp: hasMcpAccess, skills: hasSkillsAccess },
      }),
    [
      agentsConfig,
      regularTools,
      mcpServersMap,
      skillsData,
      agentActions,
      hasMcpAccess,
      hasSkillsAccess,
    ],
  );

  const selectedItems = useMemo(
    () =>
      deriveSelectedItems(
        {
          execute_code: executeCode,
          web_search: webSearch,
          file_search: fileSearch,
          artifacts,
          tools,
          skills,
          context_files: contextFiles,
          knowledge_files: knowledgeFiles,
          code_files: codeFiles,
        },
        catalog,
        agentActions,
      ),
    [
      executeCode,
      webSearch,
      fileSearch,
      artifacts,
      tools,
      skills,
      contextFiles,
      knowledgeFiles,
      codeFiles,
      catalog,
      agentActions,
    ],
  );
  const selectedIds = useMemo(() => new Set(selectedItems.map((i) => i.id)), [selectedItems]);

  const counts = useMemo(
    () => ({
      builtin: catalog.filter((i) => i.kind === 'builtin').length,
      tool: catalog.filter((i) => i.kind === 'tool').length,
      mcp: catalog.filter((i) => i.kind === 'mcp').length,
      skill: catalog.filter((i) => i.kind === 'skill').length,
      action: catalog.filter((i) => i.kind === 'action').length,
    }),
    [catalog],
  );

  const filtered = useMemo(
    () => applyFilter(catalog, { search, kind, category, view }),
    [catalog, search, kind, category, view],
  );

  const handleToggle = useCallback(
    (item: AgentItem) => {
      const patch = computeToggleAction(item, { selected: selectedIds.has(item.id) });
      switch (patch.type) {
        case 'builtin':
          setValue(patch.field as keyof AgentForm, patch.value as never, { shouldDirty: true });
          break;
        case 'tool-add': {
          const current = (getValues('tools') ?? []) as string[];
          setValue('tools', Array.from(new Set([...current, patch.id])), { shouldDirty: true });
          break;
        }
        case 'tool-remove': {
          const current = (getValues('tools') ?? []) as string[];
          setValue(
            'tools',
            current.filter((t) => t !== patch.id),
            { shouldDirty: true },
          );
          break;
        }
        case 'skill-add': {
          const current = (getValues('skills') ?? []) as string[];
          setValue('skills', Array.from(new Set([...current, patch.id])), { shouldDirty: true });
          break;
        }
        case 'skill-remove': {
          const current = (getValues('skills') ?? []) as string[];
          setValue(
            'skills',
            current.filter((s) => s !== patch.id),
            { shouldDirty: true },
          );
          break;
        }
        default:
          break;
      }
    },
    [getValues, setValue, selectedIds],
  );

  const handleCardClick = useCallback(
    (item: AgentItem) => {
      if (item.kind === 'mcp' || item.kind === 'action') {
        setDetailItem(item);
        return;
      }
      const wasSelected = selectedIds.has(item.id);
      if (!wasSelected && item.status === 'needs_setup') {
        setDetailItem(item);
        return;
      }
      handleToggle(item);
    },
    [handleToggle, selectedIds],
  );

  const handleConfigure = useCallback((item: AgentItem) => {
    setDetailItem(item);
  }, []);

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent
        className="w-11/12 max-w-[1200px] overflow-hidden rounded-2xl border-border-medium p-0 shadow-xl md:max-h-[92vh]"
        showCloseButton={false}
      >
        <div className="flex h-[88vh] max-h-[840px]">
          <MarketplaceSidebar
            activeView={view}
            activeKind={kind}
            onSelectView={setView}
            onSelectKind={setKind}
            counts={counts}
            totalCount={catalog.length}
            onCreateNew={handleCreateNew}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 px-6 py-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={localize('com_ui_tools_marketplace_search')}
                  aria-label={localize('com_ui_tools_marketplace_search')}
                  className="h-10 w-full rounded-xl border border-border-light bg-transparent pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
                />
              </div>
              <CategoryFilter options={categoryOptions} value={category} onChange={setCategory} />
              <Button
                variant="outline"
                size="icon"
                className="size-10 shrink-0 rounded-xl text-text-secondary hover:text-text-primary"
                onClick={() => onOpenChange(false)}
                aria-label={localize('com_ui_tools_close')}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <MarketplaceCatalog
                items={filtered}
                selectedIds={selectedIds}
                onToggle={handleCardClick}
                onConfigure={handleConfigure}
              />
            </div>
          </div>
        </div>
        <ItemDialog item={detailItem} agentId={agentId} onClose={() => setDetailItem(null)} />
        <AddMcpServerDialog open={addMcpOpen} onOpenChange={setAddMcpOpen} />
      </OGDialogContent>
    </OGDialog>
  );
}
