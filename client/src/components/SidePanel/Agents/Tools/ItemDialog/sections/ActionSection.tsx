import { useEffect } from 'react';
import type { ActionItem } from '../../items/types';
import ActionEditor from '../../ActionEditor';
import { useAgentPanelContext } from '~/Providers';

interface Props {
  item: ActionItem;
  agentId: string;
  onClose: () => void;
}

export default function ActionSection({ item, agentId, onClose }: Props) {
  const { setAction } = useAgentPanelContext();

  useEffect(() => {
    setAction(item.action);
    return () => setAction(undefined);
  }, [item.action, setAction]);

  return (
    <div className="flex flex-col gap-5">
      <ActionEditor agentId={agentId} onClose={onClose} onDeleted={onClose} />
    </div>
  );
}
