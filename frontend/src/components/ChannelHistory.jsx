import { useState, useEffect } from 'react';
import { getChannelsByStatus } from '../services/channelService';
import { useAuth } from '../contexts/AuthContext';
import ChannelCard from './ChannelCard';

const ChannelHistory = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tracking');
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    tracking: 0,
    'non-tracking': 0,
    rejected: 0
  });

  useEffect(() => {
    if (user) {
      loadChannels();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadChannels = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const channelData = await getChannelsByStatus(activeTab, user.uid);
      setChannels(channelData);
    } catch (error) {
      console.error('チャンネル履歴読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    
    try {
      const [trackingChannels, nonTrackingChannels, rejectedChannels] = await Promise.all([
        getChannelsByStatus('tracking', user.uid),
        getChannelsByStatus('non-tracking', user.uid),
        getChannelsByStatus('rejected', user.uid)
      ]);

      setStats({
        tracking: trackingChannels.length,
        'non-tracking': nonTrackingChannels.length,
        rejected: rejectedChannels.length
      });
    } catch (error) {
      console.error('統計読み込みエラー:', error);
    }
  };

  const handleStatusChange = async (channelId, status, reason) => {
    if (!user) return;
    
    const { updateChannelStatus } = await import('../services/channelService');
    await updateChannelStatus(channelId, status, reason, user.uid);
    
    // データを再読み込み
    await loadChannels();
    await loadStats();
  };

  const tabs = [
    {
      id: 'tracking',
      label: 'トラッキング中',
      icon: '📊',
      color: 'green',
      count: stats.tracking
    },
    {
      id: 'non-tracking',
      label: '対象外',
      icon: '📋',
      color: 'yellow',
      count: stats['non-tracking']
    },
    {
      id: 'rejected',
      label: '除外済み',
      icon: '❌',
      color: 'red',
      count: stats.rejected
    }
  ];

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ユーザーが認証されていない場合
  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          チャンネル履歴
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          チャンネル履歴を表示するにはログインが必要です
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          チャンネル履歴
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          ステータス別にチャンネルの履歴を確認できます
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const colorClasses = {
              green: isActive
                ? 'bg-green-100 text-green-800 border-green-300'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-green-50 hover:text-green-700',
              yellow: isActive
                ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-yellow-50 hover:text-yellow-700',
              red: isActive
                ? 'bg-red-100 text-red-800 border-red-300'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-red-50 hover:text-red-700'
            };

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 rounded-lg border font-medium transition-all duration-200 flex items-center gap-2 ${colorClasses[tab.color]}`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  isActive ? 'bg-white bg-opacity-50' : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* チャンネル一覧 */}
      <div className="card">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {tabs.find(tab => tab.id === activeTab)?.label || 'チャンネル'} ({channels.length}件)
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              {tabs.find(tab => tab.id === activeTab)?.icon || '📋'}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {tabs.find(tab => tab.id === activeTab)?.label}のチャンネルがありません
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              チャンネルの仕分けを行うと、ここに表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {channels.map((channel) => (
              <div key={channel.id} className="relative">
                <ChannelCard
                  channel={channel}
                  onChannelClick={() => {}}
                  onAddToTracking={() => {}}
                  showStatusHistory={true}
                />
                
                {/* ステータス変更履歴 */}
                <div className="mt-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                    <span>
                      ステータス: <strong className="text-gray-900 dark:text-white">{
                        tabs.find(tab => tab.id === channel.status)?.label || channel.status || '未設定'
                      }</strong>
                    </span>
                    <span>
                      更新日時: {formatDate(channel.statusUpdatedAt)}
                    </span>
                  </div>
                  
                  {channel.status === 'rejected' && channel.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-300">
                      <span className="text-red-700 dark:text-red-300 text-sm">
                        <strong>除外理由:</strong> {channel.rejectionReason}
                      </span>
                    </div>
                  )}
                  
                  {channel.statusUpdatedBy && (
                    <div className="mt-1 text-xs text-gray-500">
                      更新者: {channel.statusUpdatedBy}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* フッター情報 */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          合計: {stats.tracking + stats['non-tracking'] + stats.rejected} チャンネル |
          トラッキング中: {stats.tracking} |
          対象外: {stats['non-tracking']} |
          除外済み: {stats.rejected}
        </p>
      </div>
    </div>
  );
};

export default ChannelHistory;