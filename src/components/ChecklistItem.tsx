import { ChecklistItemData } from '@/types';
import { cn } from '@/lib/cn';

interface Props {
  index: number;
  item: ChecklistItemData;
  isCurrent: boolean;
  children?: React.ReactNode;
}

export function ChecklistItem({ index, item, isCurrent, children }: Props) {
  if (item.status !== 'pending' && !isCurrent) {
    const icon = item.status === 'ok' ? '✅' : '⚠️';
    const textColor = item.status === 'ok' ? 'text-gray-400' : 'text-danger-600';
    return (
      <div className="flex items-center gap-3 py-3 px-1">
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <p className={cn('text-sm font-medium line-through', textColor)}>
            {index}. {item.title}
          </p>
          {item.note && <p className="text-xs text-danger-500 mt-0.5 line-clamp-1">{item.note}</p>}
        </div>
        {item.photoUrl && <img src={item.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
      </div>
    );
  }

  if (isCurrent) {
    return (
      <div className="rounded-2xl p-5 bg-white border-2 border-primary-500 shadow-lg my-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">지금 항목</span>
          {item.require_photo && <span className="text-xs text-danger-500 font-semibold">📷 사진 필수</span>}
        </div>
        <h3 className="text-lg font-bold text-gray-900">{index}. {item.title}</h3>
        {item.description && <p className="text-sm text-gray-500 mt-1 mb-3">{item.description}</p>}
        {children}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-3 px-1 opacity-40">
      <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
      <p className="text-sm text-gray-500">{index}. {item.title}</p>
    </div>
  );
}
