import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import TrackingChart from './TrackingChart';

const TrackingDashboard = ({ selectedChannelId }) => {
  const [trackingData, setTrackingData] = useState({
    subscriberCount: [],
    videoCount: [],
    totalViews: []
  });
  const [loading, setLoading] = useState(true);
  const [trackedChannels, setTrackedChannels] = useState([]);
  const [currentSelectedChannelId, setCurrentSelectedChannelId] = useState(selectedChannelId);

  useEffect(() => {
    loadTrackedChannels();
  }, []);

  useEffect(() => {
    if (currentSelectedChannelId) {
      loadTrackingData(currentSelectedChannelId);
    }
  }, [currentSelectedChannelId]);

  const loadTrackedChannels = async () => {
    try {
      // 新しいステータス管理システムを使用
      const { getChannelsByStatus } = await import('../services/channelService');
      const trackingChannels = await getChannelsByStatus('tracking');
      
      setTrackedChannels(trackingChannels);
    } catch (error) {
      console.error('追跡チャンネル一覧の取得エラー:', error);
    }
  };

  const loadTrackingData = async (channelId) => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(
        query(
          collection(db, 'tracking_data'),
          where('channelId', '==', channelId),
          orderBy('recordedAt', 'asc')
        )
      );
      
      const data = querySnapshot.docs.map(doc => doc.data());
      
      if (data.length === 0) {
        // トラッキングデータがない場合は、チャンネルの現在データから初期データを作成
        const selectedChannel = trackedChannels.find(c => c.channelId === channelId);
        if (selectedChannel) {
          const now = new Date();
          const mockData = [{
            date: now,
            subscriberCount: selectedChannel.subscriberCount || 0,
            videoCount: selectedChannel.videoCount || 0,
            totalViews: selectedChannel.totalViews || 0
          }];
          
          setTrackingData({
            subscriberCount: mockData.map(d => ({ date: d.date, value: d.subscriberCount })),
            videoCount: mockData.map(d => ({ date: d.date, value: d.videoCount })),
            totalViews: mockData.map(d => ({ date: d.date, value: d.totalViews }))
          });
        }
        return;
      }
      
      // データを種類別に分類
      const subscriberData = data.map(d => ({
        date: d.recordedAt.toDate(),
        value: d.subscriberCount
      }));
      
      const videoData = data.map(d => ({
        date: d.recordedAt.toDate(),
        value: d.videoCount
      }));
      
      const viewsData = data.map(d => ({
        date: d.recordedAt.toDate(),
        value: d.totalViews
      }));
      
      setTrackingData({
        subscriberCount: subscriberData,
        videoCount: videoData,
        totalViews: viewsData
      });
    } catch (error) {
      console.error('トラッキングデータの取得エラー:', error);
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

  if (!currentSelectedChannelId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            チャンネルを選択してください
          </h3>
          <p className="text-gray-600 mb-6">
            追跡中のチャンネルから1つを選択すると、成長データを表示します
          </p>
          
          {trackedChannels.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trackedChannels.map(channel => (
                <div
                  key={channel.id}
                  onClick={() => {
                    setCurrentSelectedChannelId(channel.channelId);
                    loadTrackingData(channel.channelId);
                  }}
                  className="cursor-pointer p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={channel.thumbnailUrl || '/default-avatar.png'}
                      alt={channel.channelTitle}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/48x48/e5e7eb/9ca3af?text=🎵';
                      }}
                    />
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900 truncate">
                        {channel.channelTitle}
                      </h4>
                      <p className="text-sm text-gray-600">
                        ステータス更新: {channel.statusUpdatedAt ? 
                          new Date(channel.statusUpdatedAt.toDate ? channel.statusUpdatedAt.toDate() : channel.statusUpdatedAt).toLocaleDateString('ja-JP') :
                          'Unknown'
                        }
                      </p>
                    </div>
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
          <div className="flex items-center gap-4 mb-4">
            <img
              src={selectedChannel.thumbnailUrl || '/default-avatar.png'}
              alt={selectedChannel.channelTitle}
              className="w-16 h-16 rounded-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/64x64/e5e7eb/9ca3af?text=🎵';
              }}
            />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedChannel.channelTitle}
              </h2>
              <p className="text-gray-600">
                追跡開始: {new Date(selectedChannel.addedAt.toDate()).toLocaleDateString('ja-JP')}
              </p>
            </div>
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