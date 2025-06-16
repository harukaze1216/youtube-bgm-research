import { useState } from 'react';

const ChannelStatusActions = ({ channel, onStatusChange }) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'tracking':
        return {
          text: 'トラッキング中',
          className: 'bg-green-100 text-green-800 border border-green-300'
        };
      case 'non-tracking':
        return {
          text: '対象外',
          className: 'bg-yellow-100 text-yellow-800 border border-yellow-300'
        };
      case 'rejected':
        return {
          text: '除外済み',
          className: 'bg-red-100 text-red-800 border border-red-300'
        };
      default:
        return null;
    }
  };

  const handleTrack = (e) => {
    e.stopPropagation();
    onStatusChange(channel.id, 'tracking');
  };

  const handleUntrack = (e) => {
    e.stopPropagation();
    onStatusChange(channel.id, 'non-tracking');
  };

  const handleReject = (e) => {
    e.stopPropagation();
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    onStatusChange(channel.id, 'rejected', rejectReason || '手動で除外');
    setShowRejectModal(false);
    setRejectReason('');
  };

  const statusBadge = getStatusBadge(channel.status);

  // ステータスが設定済みの場合はバッジを表示
  if (statusBadge) {
    return (
      <span
        className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusBadge.className}`}
      >
        {statusBadge.text}
      </span>
    );
  }

  // ステータス未設定の場合はアクションボタンを表示
  return (
    <>
      <div className="flex gap-1">
        <button
          onClick={handleTrack}
          className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 border border-green-300 rounded hover:bg-green-200 transition-colors min-w-[48px]"
          title="トラッキング対象に追加"
        >
          追跡
        </button>
        <button
          onClick={handleUntrack}
          className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-200 transition-colors min-w-[48px]"
          title="トラッキング対象外に設定"
        >
          対象外
        </button>
        <button
          onClick={handleReject}
          className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 border border-red-300 rounded hover:bg-red-200 transition-colors min-w-[48px]"
          title="完全に除外"
        >
          除外
        </button>
      </div>

      {/* 除外理由入力モーダル */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">チャンネルを除外</h3>
            <p className="text-sm text-gray-600 mb-4">
              「{channel.channelTitle}」を除外します。理由を入力してください（任意）：
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border rounded-lg resize-none h-20 text-sm"
              placeholder="除外理由（例：BGM以外のコンテンツ、品質が低い、など）"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleRejectConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                除外する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChannelStatusActions;