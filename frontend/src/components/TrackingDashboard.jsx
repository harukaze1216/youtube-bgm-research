import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import TrackingChart from './TrackingChart';

const TrackingDashboard = ({ selectedChannelId }) => {
  const { user } = useAuth();
  const [trackingData, setTrackingData] = useState({
    subscriberCount: [],
    videoCount: [],
    totalViews: []
  });
  const [loading, setLoading] = useState(false);
  const [trackedChannels, setTrackedChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [currentSelectedChannelId, setCurrentSelectedChannelId] = useState(selectedChannelId);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getGrowthBadgeColor = (rate) => {
    if (rate >= 50) return 'bg-green-100 text-green-800';
    if (rate >= 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    if (user) {
      loadTrackedChannels();
    }
  }, [user]);

  useEffect(() => {
    if (user && currentSelectedChannelId) {
      loadTrackingData(currentSelectedChannelId);
    }
  }, [currentSelectedChannelId, user]);

  const loadTrackedChannels = async () => {
    if (!user) return;
    
    try {
      setChannelsLoading(true);
      // 新しいステータス管理システムを使用
      const { getChannelsByStatus } = await import('../services/channelService');
      const trackingChannels = await getChannelsByStatus('tracking', user.uid);
      
      setTrackedChannels(trackingChannels);
    } catch (error) {
      console.error('追跡チャンネル一覧の取得エラー:', error);
    } finally {
      setChannelsLoading(false);
    }
  };

  const loadTrackingData = async (channelId) => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Loading tracking data for:', channelId);
      
      // 実際のtracking_dataを取得
      const querySnapshot = await getDocs(
        query(
          collection(db, 'users', user.uid, 'trackingData'),
          where('channelId', '==', channelId),
          orderBy('recordedAt', 'asc')
        )
      );
      
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Found tracking data:', data);
      
      if (data.length > 0) {
        // 実際のトラッキングデータが存在する場合
        const sortedData = data
          .filter(d => d.recordedAt)
          .sort((a, b) => {
            const dateA = a.recordedAt.toDate ? a.recordedAt.toDate() : new Date(a.recordedAt);
            const dateB = b.recordedAt.toDate ? b.recordedAt.toDate() : new Date(b.recordedAt);
            return dateA - dateB;
          });
        
        const subscriberData = sortedData.map(d => ({
          date: d.recordedAt.toDate ? d.recordedAt.toDate() : new Date(d.recordedAt),
          value: d.subscriberCount || 0,
          formattedDate: (d.recordedAt.toDate ? d.recordedAt.toDate() : new Date(d.recordedAt)).toLocaleDateString('ja-JP')
        }));
        
        const videoData = sortedData.map(d => ({
          date: d.recordedAt.toDate ? d.recordedAt.toDate() : new Date(d.recordedAt),
          value: d.videoCount || 0,
          formattedDate: (d.recordedAt.toDate ? d.recordedAt.toDate() : new Date(d.recordedAt)).toLocaleDateString('ja-JP')
        }));
        
        const viewsData = sortedData.map(d => ({
          date: d.recordedAt.toDate ? d.recordedAt.toDate() : new Date(d.recordedAt),
          value: d.totalViews || 0,
          formattedDate: (d.recordedAt.toDate ? d.recordedAt.toDate() : new Date(d.recordedAt)).toLocaleDateString('ja-JP')
        }));
        
        const realTrackingData = {
          subscriberCount: subscriberData,
          videoCount: videoData,
          totalViews: viewsData
        };
        
        console.log('Setting real tracking data:', realTrackingData);
        setTrackingData(realTrackingData);
      } else {
        // トラッキングデータがない場合は空のデータを設定
        console.log('No tracking data found for channel:', channelId);
        setTrackingData({
          subscriberCount: [],
          videoCount: [],
          totalViews: []
        });
      }
    } catch (error) {
      console.error('トラッキングデータの取得エラー:', error);
      // エラーの場合も空のデータを設定
      setTrackingData({
        subscriberCount: [],
        videoCount: [],
        totalViews: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && currentSelectedChannelId) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">トラッキングデータを読み込み中...</p>
      </div>
    );
  }

  if (channelsLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">トラッキングチャンネルを読み込み中...</p>
      </div>
    );
  }

  if (!currentSelectedChannelId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            チャンネルを選択してください
          </h3>
          <p className="text-gray-600 mb-6">
            追跡中のチャンネルから1つを選択すると、実際のトラッキングデータを表示します
          </p>
          {trackedChannels.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                💡 <strong>トラッキングデータについて</strong><br />
                自動収集システムにより週次でデータが蓄積されます。<br />
                データがない場合は「トラッキングデータがありません」と表示されます。
              </p>
            </div>
          )}
          
          {trackedChannels.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trackedChannels.map(channel => (
                <div
                  key={channel.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div 
                      onClick={() => {
                        console.log('Selecting channel:', channel.channelId, channel);
                        setCurrentSelectedChannelId(channel.channelId);
                        loadTrackingData(channel.channelId);
                      }}
                      className="cursor-pointer flex items-center gap-3 flex-1"
                    >
                      <img
                        src={channel.thumbnailUrl || '/default-avatar.png'}
                        alt={channel.channelTitle}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/48x48/e5e7eb/9ca3af?text=🎵';
                        }}
                      />
                      <div className="text-left flex-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {channel.channelTitle}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-600">
                            {formatNumber(channel.subscriberCount || 0)} 登録者
                          </span>
                          {channel.growthRate && (
                            <span
                              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                getGrowthBadgeColor(channel.growthRate)
                              }`}
                            >
                              成長率 {channel.growthRate}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(channel.channelUrl, '_blank');
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      訪問 →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {trackedChannels.length === 0 && (
            <p className="text-gray-500">
              まだトラッキング中のチャンネルがありません。<br />
              チャンネル一覧からチャンネルを「追跡」ステータスに設定してください。
            </p>
          )}
        </div>
      </div>
    );
  }

  const selectedChannel = trackedChannels.find(c => c.channelId === currentSelectedChannelId);

  return (
    <div className="space-y-6">
      {selectedChannel && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <img
                src={selectedChannel.thumbnailUrl || '/default-avatar.png'}
                alt={selectedChannel.channelTitle}
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/64x64/e5e7eb/9ca3af?text=🎵';
                }}
              />
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedChannel.channelTitle}
                  </h2>
                  <button
                    onClick={() => window.open(selectedChannel.channelUrl, '_blank')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    訪問 →
                  </button>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{formatNumber(selectedChannel.subscriberCount || 0)} 登録者</span>
                  <span>{formatNumber(selectedChannel.videoCount || 0)} 動画</span>
                  {selectedChannel.growthRate && (
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                        getGrowthBadgeColor(selectedChannel.growthRate)
                      }`}
                    >
                      成長率 {selectedChannel.growthRate}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setCurrentSelectedChannelId(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              ← チャンネル一覧に戻る
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <TrackingChart
          trackingData={trackingData.subscriberCount}
          title="📈 登録者数の推移"
        />
        <TrackingChart
          trackingData={trackingData.videoCount}
          title="🎥 動画数の推移"
        />
        <TrackingChart
          trackingData={trackingData.totalViews}
          title="👁️ 総再生回数の推移"
        />
      </div>
    </div>
  );
};

export default TrackingDashboard;