# Agent Tools Marketplace — Design Spec

**Status:** Draft
**Date:** 2026-05-23
**Owner:** Berry
**Scope:** Frontend redesign of `/client/src/components/SidePanel/Agents/` — unification of Capabilities + Extensions + four entry dialogs into one in-panel chip section plus one Marketplace dialog. UI-only; no backend changes.

---

## 1. Goals & non-goals

### Goals

- Collapse the two separate sections (Capabilities, Extensions) and four entry points (Tools dialog, MCP dialog, Skills dialog, Actions side-panel) into **one unified "Marketplace" dialog** plus **one compact in-panel chip row**.
- Treat built-in capabilities (Code Interpreter, Web Search, Artifacts, File Context, File Search) as **first-party items** that live in the same catalog and use the same card UI as everything else.
- Reuse existing dialog/form components for heavy configuration (`PluginAuthForm`, `CustomUserVarsSection`, `ActionsAuth`, `ActionsInput`, `FileContext`, `FileSearch`, `CodeFiles`, `ApiKeyDialog`) — no rewrites of working forms.
- Keep the underlying form schema (`tools`, `skills`, `actions`, capability flags, `code_files` / `context_files` / `knowledge_files`) **unchanged** so backend, persistence, and existing agents keep working without migration.

### Non-goals

- No backend changes, new endpoints, or data migration.
- Not redesigning items themselves (Skill cards, Action schemas, MCP tooltips stay as they are — only their host UI changes).
- Not removing admin-level permissions. Capabilities the admin disabled remain hidden the same way they are today.
- Not building a community / public marketplace — "Marketplace" here means "the catalog of what's available to *this* user on *this* deployment".
- Not changing the existing Version History or other agent-panel features outside of Capabilities and Extensions.

---

## 2. Architecture overview

The redesign is a UI layer on top of unchanged data. Three new pieces, three deletions, one new shared concept (`AgentItem`).

```
client/src/components/SidePanel/Agents/
├── Tools/                                 ← NEW unified marketplace
│   ├── ToolsSection.tsx                   ← in-panel chip-row summary (replaces Capabilities + Extensions)
│   ├── ToolChip.tsx                       ← polymorphic chip (icon + name + state dot)
│   ├── ToolsMarketplaceDialog.tsx         ← the 3-column dialog (sidebar / catalog / detail)
│   ├── MarketplaceSidebar.tsx             ← views + type + category filters
│   ├── MarketplaceCatalog.tsx             ← virtualized grid of ToolCards
│   ├── ToolCard.tsx                       ← unified card for every kind
│   ├── DetailPane/
│   │   ├── DetailPane.tsx                 ← router that picks the renderer per item kind
│   │   ├── BuiltinDetail.tsx              ← built-in capabilities
│   │   ├── SkillDetail.tsx
│   │   ├── ToolDetail.tsx
│   │   ├── McpDetail.tsx
│   │   └── ActionDetail.tsx
│   ├── popouts/
│   │   ├── PluginAuthPopout.tsx           ← OGDialog wrapping PluginAuthForm
│   │   ├── McpVarsPopout.tsx              ← OGDialog wrapping CustomUserVarsSection
│   │   └── ActionEditorPopout.tsx         ← OGDialog wrapping the extracted ActionEditor
│   ├── items/                             ← pure logic — no React
│   │   ├── types.ts                       ← AgentItem union + kind discriminator
│   │   ├── selectors.ts                   ← deriveSelectedItems(form) → AgentItem[]
│   │   ├── catalog.ts                     ← buildCatalog(config, queries) → AgentItem[]
│   │   ├── mutations.ts                   ← toggleItem(form, item) → form patch
│   │   ├── filtering.ts                   ← search + sidebar filters
│   │   └── icons.ts                       ← getIconForItem(item)
│   └── __tests__/
└── Capabilities.tsx                       ← DELETE
└── Extensions.tsx                         ← DELETE
└── ActionsPanel.tsx                       ← DELETE (extracted into shared ActionEditor)
```

### The `AgentItem` concept

`AgentItem` is a discriminated union:

```ts
type AgentItemKind = 'builtin' | 'tool' | 'mcp' | 'skill' | 'action';

type AgentItem =
  | { kind: 'builtin'; id: AgentCapability; ... }
  | { kind: 'tool'; id: string; plugin: TPlugin; ... }
  | { kind: 'mcp'; id: string; server: McpServerInfo; ... }
  | { kind: 'skill'; id: string; skill: TSkillSummary; ... }
  | { kind: 'action'; id: string; action: Action; ... };
```

All UI components consume `AgentItem`. Selectors derive `AgentItem[]` from existing form state (`tools[]`, `skills[]`, `actions[]`, capability booleans). Mutations write back into those same fields. **The data model is unchanged** — `AgentItem` is a view-layer abstraction only.

Implications:
- The form continues to dirty/clean the same fields it does today, so version history, dirty detection, save/restore all keep working unmodified.
- `agentsConfig.capabilities` (admin server config) still gates which built-ins appear in the catalog. The marketplace just renders the gating differently.

---

## 3. In-panel summary — `ToolsSection`

Replaces the entire space currently used by **Capabilities** + **Extensions**. Single `Section` titled **Tools**, count badge in the header, and a wrapping flex of chips inside.

```
┌─ Tools  [ 7 ]                                      ＋ Add ─┐
│  [ ✓ Code Int. ]  [ 🌐 Web Search • ]  [ ✨ Artifacts ]   │
│  [ 📄 Files · 3 ]  [ 🖧 Everything · 14 ]  [ ⚡ Reviewer ] │
│  [ ↗ Linear  ]                                            │
└────────────────────────────────────────────────────────────┘
```

### `ToolChip` — single polymorphic component

- **Left:** icon (12px) — same icon used on the catalog card, color-coded by `kind`.
- **Middle:** name (truncate after ~14 chars).
- **Optional count suffix** for items that carry sub-data — `· 14` for MCP tool count, `· 3` for file count, `· 12` for action endpoints.
- **Optional state dot** in the top-right corner of the chip:
  - **Red dot** → "Needs setup" (Web Search with no key, MCP with unfilled vars, action with failed OAuth).
  - **Amber dot** → "Disabled" by an admin permission change after the agent was saved.
  - **No dot** → fully configured.
- **Hover:** light surface, reveals a small × on the right for quick removal.
- **Click:** opens the marketplace pre-focused on that item (sidebar pre-selects its kind, catalog scrolls to the card, detail pane opens with the config form).

### `＋ Add` trailing chip

Opens the marketplace clean (sidebar on Marketplace view, no detail pane).

### Section header

Matches the visual treatment of other Sections (`border-border-light bg-transparent rounded-xl`). Counter in the header parens shows total selected items. Stays open by default; collapsible.

### Chip ordering

Stable per-kind grouping (Official → MCP → Tools → Skills → Actions), each group internally insertion-order. Stable order matters for visual recognition.

### Empty state

A single dashed-border empty card spanning the row with copy "*No tools yet — Add a tool to give your agent extra abilities.*" plus a centered Add button. Replaces today's separate Capabilities/Extensions empty paths.

### Skills global toggle

The `skills_enabled` form field is **retained** as an explicit kill-switch and moves to the Advanced panel. The in-panel chip row simply reflects what's in `skills[]`; if `skills_enabled` is `false`, selected skill chips render with the amber "Disabled" dot. Users wanting to disable all skills for an agent in one click do so from Advanced.

---

## 4. Marketplace dialog — three-column shell

Re-uses the **1024×80vh `OGDialog`** frame from the current Skills dialog. Grid becomes `220px / minmax(360px, 1fr) / 0 or 420px` — the detail column is **conditional**, not always present.

```
┌─────────┬─────────────────────────────┬─────────────────────────┐
│ sidebar │ catalog                     │ detail (only when open) │
│  220px  │ flexible                    │ 420px                   │
└─────────┴─────────────────────────────┴─────────────────────────┘
```

### 4.1 Sidebar — `MarketplaceSidebar`

Three groups, in this order:

- **Views** — Marketplace (default), Installed, Favorites, Made by you.
- **Type** — All / Official / Tools / Skills / MCP / Actions, each with the same icon used in chips/cards. Counts shown in parens.
- **Category** — pulled from `useCategories()` (already used by Skills). Categories union across all item kinds — a skill tagged `productivity` and an action tagged `productivity` filter together.

Top of the sidebar: the title "**Marketplace**" plus a single **＋ Create new…** popup that fans out to:
- New Skill → navigates to `/skills/new` (closes dialog).
- Add MCP server → opens MCP setup flow (existing `CustomUserVarsSection` path or admin link if no perm).
- Add Action → opens the popout action editor.
- Add custom plugin → links to the user plugin install flow (gated by permission).

Each "Create new…" entry hides when the user lacks the matching create permission.

### 4.2 Catalog — `MarketplaceCatalog`

Single grid; 2 columns at 1024px, 3 at xl widths. **Virtualized scroll** using `react-virtuoso` (already in the project — same library used by `VirtualizedAgentGrid`). **No pagination.**

Sectioned headers inside the grid when the user is in the **Marketplace** view:
1. **Built-in** — pinned official cards (always rendered first; max five).
2. **Recently used** — last 10 items added across any agent the user owns. Persistence via `localStorage` keyed by user ID.
3. **Skills**, **Tools**, **MCP servers**, **Actions** — each kind in its own labeled section.

When the user filters by Type or Category, sections collapse and only the matching grid renders.

**Search input** at the top filters by name + description across all kinds. Uses the same shape as today's Skills search (left-icon, 38px height, transparent border).

### `ToolCard` — single component, four-height (`h-32`) cards

- Title (truncate), kind icon (color-coded), description (2-line clamp), pills row, selected checkdot.
- Kind-specific pills: `Official`, `Needs key`, `OAuth`, `14 tools`, `3 files`, `Mode: default`, `★ Favorite`, `🌐 Public`, `👤 Shared`.
- Selected state: green ring + tinted background + green checkdot, same as the Skills card today.
- Cards are `<button>` elements (single-click toggles); cards with config requirements **also** open the detail pane on first add.

### 4.3 Detail pane — `DetailPane`

Opens to the right when the user clicks any selected card *or any unselected card that requires configuration to enable*. Width 420px on `lg+`; on `md` the catalog shrinks. On narrow screens (`< lg`) the detail pane goes full-modal-overlay so it doesn't crush the catalog.

**Header section:** large item icon, title, kind label, status pill (Added / Connected / Needs setup), and a `× close` that returns to catalog-only view.

**Body sections per kind** routed by `DetailPane.tsx`:
- **Built-in** → `BuiltinDetail` — inline forms for mode toggles, API keys, and file pickers. Reuses `FileContext`, `FileSearch`, `CodeFiles`.
- **Skill** → `SkillDetail` — name, description, favorite star, category tag, "Open in skills editor" link.
- **Tool** → `ToolDetail` — plugin metadata; if auth required, "Configure" button **pops out** to `PluginAuthPopout`.
- **MCP** → `McpDetail` — server status, tool count, "Configure variables" button → **pops out** to `McpVarsPopout`.
- **Action** → `ActionDetail` — identity (name, auth type, endpoint count); "Edit" button → **pops out** to `ActionEditorPopout`.

**Footer:** `Remove from agent` (destructive, left-aligned) · `Cancel` · `Save` (where applicable). Saves write into the underlying form state immediately for built-ins and inline edits; popouts manage their own save flow and close back to the marketplace on completion.

---

## 5. Configuration flows — per-kind specifics

### 5.1 Built-in capabilities — all inline

| Capability | Detail-pane content | Form fields written |
|---|---|---|
| Code Interpreter | Switch ("Enabled"). When on, an `ExpandableRow` exposes the existing `CodeFiles` picker. | `execute_code`, `code_files[]` |
| Web Search | Provider mode tabs (Serper / Tavily / SearXNG — read from `webSearchAuth.authTypes`) + inline API key form. | `web_search` plus user-scoped key via `useUpdateUserPluginsMutation` |
| Artifacts | Mode tabs (Default / Always / Disabled), optional custom prompt textarea. | `artifacts` mode string |
| File Context | Inline `FileContext` component (drag-drop + list). | `context_files[]` |
| File Search | Inline `FileSearch` component (drag-drop + list). | `knowledge_files[]` |

All built-ins write the same form fields that exist today — `Capabilities.tsx`'s logic moves into `BuiltinDetail.tsx` mostly verbatim. Permissions/admin gating from `useAgentCapabilities` keeps determining which built-ins appear in the catalog.

The current standalone `ApiKeyDialog` for Web Search becomes an *inline section* of `BuiltinDetail`. The component is small (a single form) and is easier to host inline than to leave as a separate modal triggered from the catalog.

### 5.2 Regular tools — inline summary, popout for auth

Detail pane shows plugin metadata (name, description, icon, author). If the plugin needs auth (`authConfig.length > 0 && !authenticated`), a yellow "Needs key" callout appears with a "Configure" button. Clicking opens `PluginAuthPopout` — a secondary `OGDialog` containing `PluginAuthForm`. On submit, installs the key via `useUpdateUserPluginsMutation`. When the popout closes, the detail pane refreshes its auth state.

### 5.3 MCP servers — inline summary, popout for vars

Detail pane shows server name, tool count, configured/uninitialized state. If the server has unfilled `customUserVars`, a yellow callout and "Configure variables" button pop out the existing `CustomUserVarsSection`. The two states currently surfaced by `UnconfiguredMCPTool` and `UninitializedMCPTool` become **card-level pills** in the catalog (`Needs setup`, `Uninitialized`) plus inline callouts in the detail pane.

### 5.4 Skills — entirely inline

Detail pane: name, description, category, favorite toggle, public/shared badges. Footer offers "Remove from agent" + an "Edit skill" link that navigates to `/skills/:id/edit` (closes dialog). No popout needed because the editor is a dedicated route.

### 5.5 Actions — inline summary, popout for editor

Detail pane shows: endpoint count, auth type, "Test connection" button. "Edit action" button pops out an `ActionEditorPopout` — built by hoisting the body of `ActionsPanel.tsx` into an `ActionEditor` component that is shared by both the popout and any remaining caller. Same form, same fields, same submit path; only the chrome changes (no `ChevronLeft` back button, full save/cancel footer instead).

The same popout doubles as the **Create new action** flow from the sidebar's `＋ Create new…` menu.

### 5.6 Cross-cutting save behaviour

- Inline saves write to react-hook-form state with `shouldDirty: true`, so the Save button at the bottom of the agent panel reflects them.
- Popout saves commit through their existing mutations (plugin install, action create/update), then re-emit the catalog query so the marketplace sees fresh state immediately.
- Removing an item from the detail pane is symmetric to clicking it again on the card: a single mutation function `toggleItem(form, item)` handles both directions.

---

## 6. Permissions, edge cases & states

### 6.1 Permissions matrix

| Source | Effect on marketplace |
|---|---|
| Server admin disabled the capability (`agentsConfig.capabilities` excludes it) | Item hidden completely. Existing agents that had it stored keep it in their form state until the user removes/re-saves; the in-panel chip shows the amber "Disabled" dot. |
| User lacks `PermissionTypes.MCP_SERVERS · USE` | MCP section + sidebar entry hidden. |
| User lacks `PermissionTypes.SKILLS · USE` | Skills section + sidebar entry hidden. |
| User lacks `…CREATE` on the matching type | The `＋ Create new…` sub-entry for that type hidden. Existing items remain selectable. |
| Plugin requires auth and user is unauthenticated | Card visible, shows `Needs key` pill, detail pane offers Configure popout. |
| MCP requires custom user vars and user hasn't filled them | Card shows `Needs setup` pill plus inline yellow strip in the detail pane. |
| Item is `disabled` server-side mid-session | Card greys out; chip in panel shows amber dot; tooltip explains. |

### 6.2 Ephemeral agents

`isEphemeralAgent(agent_id)` disables: Actions section in sidebar (matches today's `setActivePanel(Panel.actions)` guard), `＋ Create new action` entry. A warning toast (re-using `com_assistants_actions_disabled`) fires if the user attempts it. Tools / MCP / Skills behave normally for ephemeral agents.

### 6.3 Loading & error states

- **Initial open** — sidebar + catalog renders immediately with skeleton cards (4 placeholder cards per section). Skills query + MCP query + plugin query run in parallel; each section fills as its query resolves.
- **Search with empty results** — same empty illustration the Skills dialog uses today.
- **Mutation errors** — toast + revert. Existing `useUpdateUserPluginsMutation` error path is preserved.
- **Catalog query failures** — inline retry button per failed section, not a full-dialog error wall.

### 6.4 Accessibility checklist

- Sidebar is a `<nav aria-label="Marketplace filters">` with `role="list"` + `aria-pressed` on each filter button (same pattern as `SidebarItem` in Skills today).
- Catalog is a `<section aria-label="Available tools">` with `role="list"` wrapping `ToolCard` buttons. Each card is a real `<button>` with `aria-pressed` reflecting selection.
- Detail pane uses `aria-live="polite"` so screen readers announce when a card click reveals it.
- The wrapping chip row in the agent panel uses `<ul role="list">` + per-chip `<li>`. Each chip is a button with `aria-label` of the form *"{Name}, configured. Click to edit."* Remove × is a separate button to avoid double-click semantics.
- Keyboard: `Cmd+K` (or `/`) inside the dialog focuses the search; `ArrowLeft/Right` cycles catalog cards; `Enter` toggles selection; `Esc` closes the detail pane if open, otherwise the dialog.
- Focus management on popout: when the popout closes, focus returns to the detail-pane "Configure" button that opened it.

### 6.5 Mobile / narrow widths

- `< lg` (1024px): detail pane becomes a full-screen overlay rather than a side column; catalog hides while the detail is open.
- `< md` (768px): sidebar collapses into a single dropdown at the top of the catalog ("Filter: All").
- These breakpoints reuse Tailwind thresholds already in the project.

### 6.6 Telemetry

None added; this is UI-only.

---

## 7. File-by-file change plan

### Component additions

- `Tools/ToolsSection.tsx` — in-panel summary section + chip row (replaces both old sections).
- `Tools/ToolChip.tsx` — single polymorphic chip with state-dot + remove-on-hover.
- `Tools/ToolsMarketplaceDialog.tsx` — 3-column `OGDialog` shell. Owns open/close, focus management, view+filter+search state via reducer.
- `Tools/MarketplaceSidebar.tsx` — sidebar with View/Type/Category groups and the `＋ Create new…` menu.
- `Tools/MarketplaceCatalog.tsx` — virtualized grid of sections + cards.
- `Tools/ToolCard.tsx` — unified card; thin variants by kind inline.
- `Tools/DetailPane/DetailPane.tsx` — router by `item.kind`.
- `Tools/DetailPane/BuiltinDetail.tsx` — hosts the five built-ins.
- `Tools/DetailPane/SkillDetail.tsx`, `ToolDetail.tsx`, `McpDetail.tsx`, `ActionDetail.tsx`.
- `Tools/popouts/PluginAuthPopout.tsx`, `McpVarsPopout.tsx`, `ActionEditorPopout.tsx`.

### Logic additions (pure TS, no React)

- `Tools/items/types.ts` — `AgentItem` discriminated union + helper types.
- `Tools/items/selectors.ts` — `deriveSelectedItems(form, catalog) → AgentItem[]`.
- `Tools/items/catalog.ts` — `buildCatalog({ agentsConfig, regularTools, mcpServersMap, skills, actions }) → AgentItem[]`.
- `Tools/items/mutations.ts` — `toggleItem`, `removeItem`, `setBuiltinConfig`, `installPluginAndAdd`, etc.; return form-patch objects.
- `Tools/items/filtering.ts` — search + sidebar filter predicates.
- `Tools/items/icons.ts` — `getIconForItem(item)` mapping kind+id → lucide icon + color.

### Edits

- `AgentConfig.tsx` — replace `<Capabilities …/>` + `<Extensions agentId={…} />` with `<ToolsSection agentId={…} />`. Net deletion of ~12 lines.
- `AgentPanelSwitch.tsx` — remove the `Panel.actions` route. Callers that today open the action editor are rewritten to open `ActionEditorPopout`.
- `Providers/AgentPanelContext.tsx` — `action` / `setAction` stays (the popout reads it), but `activePanel === Panel.actions` is no longer used. Mark `Panel.actions` deprecated; keep the enum value to avoid breaking unrelated callers.
- `Advanced/AdvancedPanel.tsx` — add the `skills_enabled` kill-switch toggle here (moves out of the in-panel chip row).
- `client/src/locales/en/translation.json` — add new keys (`com_ui_tools_marketplace`, `com_ui_tools_section_title`, `com_ui_tools_empty`, `com_ui_tools_needs_setup`, `com_ui_tools_disabled_by_admin`, `com_ui_tools_remove`, `com_ui_create_new_menu`, etc.). Existing `com_assistants_*` and `com_ui_extensions_*` keys remain in place until the cleanup phase, then are pruned.

### Deletions

- `Agents/Capabilities.tsx` — logic moves into `BuiltinDetail.tsx`.
- `Agents/Extensions.tsx` — superseded by `ToolsSection.tsx`.
- `Tools/ToolSelectDialog.tsx` — catalog absorbs it.
- `Tools/MCPToolSelectDialog.tsx` — catalog absorbs it.
- `Skills/dialogs/SkillSelectDialog.tsx` — catalog absorbs it. (Keep `CreateSkillDialog`, `DeleteSkill`, `UploadSkillDialog` — used outside the agent panel.)
- `Agents/ActionsPanel.tsx` — body extracted into a shared `ActionEditor` consumed by the popout; the side-panel file itself is deleted.

### Component reuse — keep as-is

`PluginAuthForm`, `CustomUserVarsSection`, `ApiKeyDialog`, `FileContext`, `FileSearch`, `CodeFiles`, `Artifacts`, `ActionsAuth`, `ActionsInput`, `CategoryIcon`, `useCategories`, `useSkillFavorites`, `useAgentCapabilities`, `useVerifyAgentToolAuth`, `useMCPServerManager`, `useRemoveMCPTool`, `useUpdateUserPluginsMutation`, `useListSkillsQuery`, `useMCPToolsQuery`, `usePluginDialogHelpers`. None get touched.

### Tests

- **New:** `ToolsSection.spec.tsx`, `ToolChip.spec.tsx`, `ToolsMarketplaceDialog.spec.tsx`, `catalog.spec.ts`, `selectors.spec.ts`, `mutations.spec.ts`, `filtering.spec.ts`.
- **Updated:** `AgentFooter.spec.tsx` (verify it doesn't depend on `Capabilities` or `Extensions`).
- **Deleted:** tests bound 1:1 to `Capabilities.tsx`, `Extensions.tsx`, `ToolSelectDialog.tsx`, `MCPToolSelectDialog.tsx`, `SkillSelectDialog.tsx`. Behavioural coverage moves into the new specs.

### Sizing estimate

~1,800 LOC added (mostly small, well-bounded files), ~1,500 LOC deleted. Net +300, with much smaller per-file averages (today `Extensions.tsx` is 495 lines; new `MarketplaceCatalog.tsx` should land under ~180).

---

## 8. Implementation phases

Five phases, each producing a green test suite and a working app before moving on. The whole thing can ship without a feature flag because the data model never changes — at any phase, reverting commits restores the prior state without losing data.

### Phase 1 — Foundation (no UI changes)

- Add `Tools/items/*.ts` (types, selectors, catalog, mutations, filtering, icons) with full unit-test coverage.
- Pure functions over existing types — nothing in the UI consumes them yet.
- **Exit criteria:** `catalog.spec.ts` proves `buildCatalog` returns the right `AgentItem[]` for representative configs (built-ins enabled/disabled, MCP configured/unconfigured, action present, skills permitted/not). `selectors.spec.ts` proves `deriveSelectedItems` reproduces today's "what's enabled" answer from every existing form state we have fixtures for.
- One commit, ~300 LOC, zero risk.

### Phase 2 — Marketplace dialog (read-only path, behind dev entry point)

- Build `ToolsMarketplaceDialog`, `MarketplaceSidebar`, `MarketplaceCatalog`, `ToolCard`.
- Wire to `items/catalog.ts`; no detail pane yet — cards just toggle selection.
- Add a temporary dev-only entry point in `AgentFooter` ("Open new marketplace") so the dialog can be tested against real agents without removing the existing UI.
- **Exit criteria:** dialog opens, filters work, search works, clicking a card toggles the form field correctly for every kind (verified by reading dirty fields after click). Tests cover all four kinds and the built-in toggle path.

### Phase 3 — Detail pane and popouts

- Add `DetailPane` + each kind-specific detail body, starting with **built-ins** (highest reuse value — replaces in-panel toggles immediately) and finishing with **actions** (most complex).
- Hoist the popouts: `PluginAuthPopout`, `McpVarsPopout`, `ActionEditorPopout`. Each is a thin wrapper around an existing component — write the popout in the same commit that extracts the inner component into a reusable form.
- **Exit criteria:** every path that today opens a side-panel or full-modal can be reproduced through the marketplace dialog. Manual smoke pass on each: configure web search key, set artifacts mode, attach a file to file-context, configure MCP user vars, install a tool with auth, edit an action.

### Phase 4 — Replace in-panel UI

- Add `ToolsSection` + `ToolChip`. Replace `<Capabilities>` and `<Extensions>` in `AgentConfig.tsx`.
- Move the `skills_enabled` kill-switch toggle into `AdvancedPanel.tsx`.
- Remove `Panel.actions` route from `AgentPanelSwitch`; `setActivePanel(Panel.actions)` callers rewrite to open `ActionEditorPopout`.
- Delete the dev-only "Open new marketplace" entry from Phase 2 — `ToolsSection` is the only entry point now.
- **Exit criteria:** agent panel renders with the new chip row; every previous workflow (toggle web search, attach files, add a tool, configure MCP, create an action) reaches a working completion through the new UI. Existing E2E suite + manual run-through.

### Phase 5 — Cleanup

- Delete `Capabilities.tsx`, `Extensions.tsx`, `ToolSelectDialog.tsx`, `MCPToolSelectDialog.tsx`, `SkillSelectDialog.tsx`, `ActionsPanel.tsx`.
- Remove now-orphaned translation keys (`com_ui_extensions_*`, etc.).
- Verify no imports reference the deleted files (`grep` + `tsc` clean).
- One commit; reverts to a known-good state if anything regressed in Phase 4.

Each phase is independently shippable — Phase 1 and 2 can land on `main` ahead of the cutover with zero user-visible change.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Reusing `PluginAuthForm` / `CustomUserVarsSection` outside their current containers exposes implicit context dependencies. | Phase 3 explicitly extracts each into a pure component first (no behaviour change), tested in isolation, before wrapping in the popout. |
| Action editor today lives at `Panel.actions` — any deep-link or external consumer using the panel route breaks. | `grep -r "Panel.actions"` audit during Phase 4; keep the enum value so type checks pass; route any remaining callers to the popout. |
| Three-column dialog (220 + 360 + 420 = 1000px content) feels cramped on small laptops. | Detail pane is conditional; on `< lg` it becomes a full overlay. Side-by-side only at `lg+`. Same breakpoint logic the Skills dialog already uses. |
| Virtualization adds a runtime dependency. | Use `react-virtuoso` already in the project (`VirtualizedAgentGrid`). No new dependency. |
| `localStorage` for "Recently used" leaks across users on shared devices. | Key by user ID; clear on logout via existing auth-context teardown. Cap to 10 entries. |

---

## 10. Open questions for implementation (resolved)

These were debated during brainstorming and are settled:

1. **`skills_enabled`** — kept as explicit kill-switch in Advanced; not implicit.
2. **"Recently used" section** — included in v1.
3. **Dialog title** — "Marketplace".

---

## 11. Translation key additions

Initial set, may expand during implementation. Single source of truth: `client/src/locales/en/translation.json`.

- `com_ui_tools_marketplace` — "Marketplace"
- `com_ui_tools_marketplace_search` — "Search the marketplace…"
- `com_ui_tools_section_title` — "Tools"
- `com_ui_tools_section_count` — "{{count}} enabled"
- `com_ui_tools_empty` — "No tools yet"
- `com_ui_tools_empty_hint` — "Add a tool to give your agent extra abilities."
- `com_ui_tools_needs_setup` — "Needs setup"
- `com_ui_tools_disabled_by_admin` — "Disabled by admin"
- `com_ui_tools_remove` — "Remove from agent"
- `com_ui_tools_create_new` — "Create new…"
- `com_ui_tools_official` — "Official"
- `com_ui_tools_recently_used` — "Recently used"
- `com_ui_tools_view_marketplace` — "Marketplace"
- `com_ui_tools_view_installed` — "Installed"
- `com_ui_tools_view_favorites` — "Favorites"
- `com_ui_tools_view_made_by_you` — "Made by you"
- `com_ui_tools_kind_official` — "Official"
- `com_ui_tools_kind_tools` — "Tools"
- `com_ui_tools_kind_skills` — "Skills"
- `com_ui_tools_kind_mcp` — "MCP servers"
- `com_ui_tools_kind_actions` — "Actions"
- `com_ui_tools_skills_enabled_kill_switch` — "Allow skills for this agent"
- `com_ui_tools_skills_enabled_kill_switch_hint` — "When off, the agent ignores any selected skills."

---

## 12. Acceptance criteria

The redesign is complete when:

1. The agent builder side panel renders `<ToolsSection>` in place of the previous `<Capabilities>` + `<Extensions>` sections.
2. Clicking `＋ Add` (or any chip) opens the Marketplace dialog with the three-column shell.
3. All five built-in capabilities appear as "Official" cards at the top of the marketplace and are configurable inline.
4. Tools, MCP servers, skills, and actions appear as cards in their respective sections.
5. Configuration popouts (`PluginAuthPopout`, `McpVarsPopout`, `ActionEditorPopout`) open when the user clicks Configure on a card that needs heavy setup.
6. The `skills_enabled` kill-switch lives in Advanced and disables all skill chips when off.
7. Existing agents load with their previously enabled items rendered as chips, no data migration needed.
8. All previously-passing tests continue to pass, and new tests cover the marketplace dialog, chip row, and items module.
9. `Capabilities.tsx`, `Extensions.tsx`, the three old selection dialogs, and `ActionsPanel.tsx` are deleted from the repository.

---

## Appendix A — Brainstorming session record

Decisions captured during the brainstorming session, in the order they were made:

1. **Scope of unification** — Full marketplace; everything is an "Item".
2. **Configuration UX** — Inline detail panel inside the dialog.
3. **In-panel summary** — Single "Tools" section with wrapping chip row.
4. **Heavy flows** — Inline for built-ins, popout for everything tool-ish.
5. **`skills_enabled`** — Keep explicit kill-switch in Advanced.
6. **Recently used** — Keep.
7. **Dialog title** — Marketplace.
