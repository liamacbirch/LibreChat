import { useState } from 'react';
import type { ToolItem } from '../../items/types';
import PluginAuthForm from '~/components/Plugins/Store/PluginAuthForm';
import { useLocalize } from '~/hooks';

interface Props {
  item: ToolItem;
}

export default function ToolSection({ item }: Props) {
  const localize = useLocalize();
  const [authDone, setAuthDone] = useState(false);
  const needsAuth =
    Array.isArray(item.plugin.authConfig) &&
    item.plugin.authConfig.length > 0 &&
    item.plugin.authenticated !== true &&
    !authDone;

  return (
    <div className="flex flex-col gap-5">
      {item.description ? (
        <p className="text-sm leading-relaxed text-text-secondary">{item.description}</p>
      ) : (
        <p className="text-sm italic text-text-tertiary">
          {localize('com_ui_tools_no_description')}
        </p>
      )}
      {needsAuth && (
        <div className="rounded-xl border border-border-light bg-surface-secondary p-4">
          <PluginAuthForm plugin={item.plugin} isEntityTool onSubmit={() => setAuthDone(true)} />
        </div>
      )}
    </div>
  );
}
