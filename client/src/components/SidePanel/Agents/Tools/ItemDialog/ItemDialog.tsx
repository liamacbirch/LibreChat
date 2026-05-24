import { OGDialog, OGDialogContent } from '@librechat/client';
import type { AgentItem } from '../items/types';
import ItemDialogHeader from './ItemDialogHeader';
import ItemDialogBody from './ItemDialogBody';

interface Props {
  item: AgentItem | null;
  agentId: string;
  onClose: () => void;
}

export default function ItemDialog({ item, agentId, onClose }: Props) {
  return (
    <OGDialog open={item !== null} onOpenChange={(next) => !next && onClose()}>
      <OGDialogContent
        className="w-11/12 max-w-[560px] gap-0 overflow-hidden rounded-2xl p-0 md:max-h-[85vh]"
        data-testid="item-dialog"
      >
        {item && (
          <div className="flex max-h-[85vh] flex-col">
            <ItemDialogHeader item={item} />
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
              <ItemDialogBody item={item} agentId={agentId} onClose={onClose} />
            </div>
          </div>
        )}
      </OGDialogContent>
    </OGDialog>
  );
}
