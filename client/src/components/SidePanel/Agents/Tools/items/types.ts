import type { TPlugin, TSkillSummary, Action } from 'librechat-data-provider';
import type { MCPServerInfo } from '~/common';

export type AgentItemKind = 'builtin' | 'tool' | 'mcp' | 'skill' | 'action';

export type BuiltinId = 'execute_code' | 'web_search' | 'file_search' | 'artifacts' | 'context';

export type AgentItemStatus = 'ready' | 'needs_setup' | 'disabled';

export interface BuiltinItem {
  kind: 'builtin';
  id: BuiltinId;
  name: string;
  description: string;
  iconKey: string;
  status?: AgentItemStatus;
}

export interface ToolItem {
  kind: 'tool';
  id: string;
  name: string;
  description: string;
  iconKey: string;
  plugin: TPlugin;
  status?: AgentItemStatus;
}

export interface McpItem {
  kind: 'mcp';
  id: string;
  name: string;
  description: string;
  iconKey: string;
  server: MCPServerInfo;
  toolCount: number;
  status?: AgentItemStatus;
}

export interface SkillItem {
  kind: 'skill';
  id: string;
  name: string;
  description: string;
  iconKey: string;
  skill: TSkillSummary;
  status?: AgentItemStatus;
}

export interface ActionItem {
  kind: 'action';
  id: string;
  name: string;
  description: string;
  iconKey: string;
  action: Action;
  endpointCount: number;
  status?: AgentItemStatus;
}

export type AgentItem = BuiltinItem | ToolItem | McpItem | SkillItem | ActionItem;

export type ItemFilter = {
  search?: string;
  kind?: AgentItemKind | 'all';
  category?: string | 'all';
  view?: 'marketplace' | 'installed' | 'favorites' | 'mine';
};
