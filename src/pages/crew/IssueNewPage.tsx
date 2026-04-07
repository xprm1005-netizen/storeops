import { useNavigate } from 'react-router-dom';
import { IssueForm } from '@/components/IssueForm';

export function IssueNewPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-full">
      <header className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="text-2xl text-gray-600">←</button>
          <h1 className="flex-1 text-base font-bold text-gray-900">특이사항 보고</h1>
        </div>
      </header>
      <div className="p-4">
        <IssueForm />
      </div>
    </div>
  );
}
