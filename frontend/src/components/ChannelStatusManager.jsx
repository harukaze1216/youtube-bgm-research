import { useState } from 'react';
import { updateChannelStatus } from '../services/channelService';

const ChannelStatusManager = ({ channel, userId, onStatusChange }) => {
  const [loading, setLoading] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const statusOptions = [
    { value: 'unset', label: '未設定', color: 'bg-gray-100 text-gray-800', icon: '❓' },
    { value: 'tracking', label: '追跡中', color: 'bg-green-100 text-green-800', icon: '📈' },
    { value: 'non-tracking', label: '非追跡', color: 'bg-yellow-100 text-yellow-800', icon: '⏸️' },
    { value: 'rejected', label: '除外', color: 'bg-red-100 text-red-800', icon: '❌' }
  ];

  const currentStatus = statusOptions.find(s => s.value === (channel.status || 'unset'));

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'rejected') {
      setShowReasonModal(true);
      return;
    }

    await updateStatus(newStatus);
  };

  const handleRejectWithReason = async () => {
    await updateStatus('rejected', rejectionReason);
    setShowReasonModal(false);
    setRejectionReason('');
  };

  const updateStatus = async (status, reason = null) => {
    setLoading(true);
    try {
      const success = await updateChannelStatus(channel.id, status, userId, reason);
      if (success) {
        onStatusChange?.(channel.id, status, reason);
      }
    } catch (error) {
      console.error('ステータス更新エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <select
          value={channel.status || 'unset'}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={loading}
          className={`text-sm px-3 py-1 rounded-full border-0 cursor-pointer disabled:cursor-not-allowed ${currentStatus.color}`}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.icon} {option.label}
            </option>
          ))}
        </select>
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* 除外理由入力モーダル */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              除外理由を入力
            </h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="このチャンネルを除外する理由を入力してください（任意）"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleRejectWithReason}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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

export default ChannelStatusManager;