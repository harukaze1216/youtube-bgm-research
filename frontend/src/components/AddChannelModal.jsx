import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { extractChannelId, fetchChannelInfo, checkChannelExists, addChannelToFirestore, calculateGrowthRate, fetchChannelFirstVideo } from '../services/channelService';

const AddChannelModal = ({ isOpen, onClose, onChannelAdded }) => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      // チャンネルIDを抽出
      const channelId = extractChannelId(input.trim());
      console.log('Extracted channel ID:', channelId);

      // 既に存在するかチェック
      const exists = await checkChannelExists(channelId, user.uid);
      if (exists) {
        setError('このチャンネルは既に追加されています');
        return;
      }

      // チャンネル情報を取得
      const channelInfo = await fetchChannelInfo(channelId, user.uid);
      console.log('Channel info:', channelInfo);

      // 最初の動画を取得
      const firstVideo = await fetchChannelFirstVideo(channelInfo.uploadsPlaylistId, user.uid);
      
      // 成長率を計算
      const growthRate = calculateGrowthRate(channelInfo, firstVideo);

      // データを整形
      const channelData = {
        ...channelInfo,
        firstVideoDate: firstVideo?.publishedAt || channelInfo.publishedAt,
        growthRate,
        scoreBgmRelev: 50, // デフォルト値
        status: 'unset'
      };

      // Firestoreに保存
      await addChannelToFirestore(channelData, user.uid);

      // 成功時の処理
      onChannelAdded?.(channelData);
      setInput('');
      onClose();

    } catch (error) {
      console.error('チャンネル追加エラー:', error);
      setError(error.message || 'チャンネルの追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">チャンネルを手動追加</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              チャンネルURL または チャンネルID
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://www.youtube.com/channel/UC... または UCxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <div className="text-xs text-gray-500 mt-1">
              サポート形式:
              <ul className="list-disc ml-4 mt-1">
                <li>youtube.com/channel/UCxxxxxxxx</li>
                <li>youtube.com/c/channelname</li>
                <li>youtube.com/@handle</li>
                <li>UCxxxxxxxx (直接ID)</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddChannelModal;