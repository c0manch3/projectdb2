import { useAppSelector } from '@/store';

export default function ChatLogsPage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Chat Logs</h1>
      </div>

      <div className="card p-6">
        <p className="text-gray-500 text-center py-12">
          Telegram chat logs will be displayed here
        </p>
      </div>
    </div>
  );
}
