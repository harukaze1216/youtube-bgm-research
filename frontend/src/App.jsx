import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, setDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import SearchSection from './components/SearchSection';
import FilterSection from './components/FilterSection';
import StatsOverview from './components/StatsOverview';
import ChannelGrid from './components/ChannelGrid';
import ChannelModal from './components/ChannelModal';
import Settings from './components/Settings';
import TrackingDashboard from './components/TrackingDashboard';
import ChannelHistory from './components/ChannelHistory';
import UserProfile from './components/UserProfile';
import AddChannelModal from './components/AddChannelModal';
import FeedbackModal from './components/FeedbackModal';
import LoginForm from './components/Auth/LoginForm';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelDetails, setChannelDetails] = useState(null);
  const [trackedChannels, setTrackedChannels] = useState(new Set());
  const [currentView, setCurrentView] = useState('channels');
  const [selectedChannelForTracking, setSelectedChannelForTracking] = useState(null);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [filters, setFilters] = useState({
    sortBy: 'growth_rate',
    filterBy: 'unset', // デフォルトを未仕分けに変更
    search: ''
  });

  // Load channels from Firestore when user is authenticated
  useEffect(() => {
    if (user) {
      loadChannels();
      loadTrackedChannels();
    }
  }, [user]);

  // Apply filters and sorting
  useEffect(() => {
    applyFilters();
  }, [channels, filters, trackedChannels]);

  // Reload channels when filter changes
  useEffect(() => {
    if (user && filters.filterBy !== 'all' && filters.filterBy !== 'growing' && filters.filterBy !== 'large' && filters.filterBy !== 'small') {
      loadChannels();
    }
  }, [filters.filterBy, user]);

  const loadChannels = async () => {
    if (!user) return; // ユーザーが認証されていない場合は何もしない
    
    try {
      setLoading(true);
      const { getChannelsByStatus } = await import('./services/channelService');
      
      // 現在のフィルターに応じてチャンネルを取得
      let channelData = [];
      
      switch (filters.filterBy) {
        case 'unset':
          channelData = await getChannelsByStatus('unset', user.uid);
          break;
        case 'tracking':
          channelData = await getChannelsByStatus('tracking', user.uid);
          break;
        case 'non-tracking':
          channelData = await getChannelsByStatus('non-tracking', user.uid);
          break;
        case 'rejected':
          channelData = await getChannelsByStatus('rejected', user.uid);
          break;
        case 'all':
          channelData = await getChannelsByStatus('all', user.uid);
          break;
        default:
          // デフォルトは未仕分けのチャンネルのみ表示
          channelData = await getChannelsByStatus('unset', user.uid);
          break;
      }
      
      setChannels(channelData);
    } catch (error) {
      console.error('チャンネルデータの読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrackedChannels = async () => {
    if (!user) return; // ユーザーが認証されていない場合は何もしない
    
    try {
      const { getTrackedChannels } = await import('./services/channelService');
      const trackedChannelsData = await getTrackedChannels(user.uid);
      
      const trackedIds = new Set(trackedChannelsData.map(ch => ch.channelId));
      setTrackedChannels(trackedIds);
    } catch (error) {
      console.error('追跡チャンネルデータの読み込みエラー:', error);
    }
  };

  const applyFilters = () => {
    let filtered = channels.map(channel => ({
      ...channel,
      isTracked: trackedChannels.has(channel.channelId)
    }));

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(channel =>
        channel.channelTitle.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Category filter (only for basic filters, not status filters)
    switch (filters.filterBy) {
      case 'growing':
        filtered = filtered.filter(channel => (channel.growthRate || 0) > 20);
        break;
      case 'large':
        filtered = filtered.filter(channel => channel.subscriberCount > 100000);
        break;
      case 'small':
        filtered = filtered.filter(channel => channel.subscriberCount < 10000);
        break;
      // Status filters are handled in loadChannels()
    }

    // Sort
    switch (filters.sortBy) {
      case 'growth_rate':
        filtered.sort((a, b) => (b.growthRate || 0) - (a.growthRate || 0));
        break;
      case 'subscribers':
        filtered.sort((a, b) => b.subscriberCount - a.subscriberCount);
        break;
      case 'views':
        filtered.sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0));
        break;
      case 'added_date':
        filtered.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB - dateA;
        });
        break;
    }

    setFilteredChannels(filtered);
  };

  const handleAddChannel = async (channelInput) => {
    try {
      const { 
        extractChannelId, 
        fetchChannelInfo, 
        fetchChannelFirstVideo,
        checkChannelExists,
        isBGMChannel,
        calculateGrowthRate,
        addChannelToFirestore
      } = await import('./services/channelService');
      
      // チャンネルIDを抽出
      const channelId = extractChannelId(channelInput);
      
      // 既存チェック
      const exists = await checkChannelExists(channelId, user.uid);
      if (exists) {
        alert('このチャンネルは既に追加されています');
        return;
      }
      
      // チャンネル情報を取得
      const channelInfo = await fetchChannelInfo(channelId, user.uid);
      
      // BGMチャンネルかチェック
      if (!isBGMChannel(channelInfo.channelTitle, channelInfo.description)) {
        const proceed = confirm('このチャンネルはBGM関連ではない可能性があります。追加しますか？');
        if (!proceed) return;
      }
      
      // 最初の動画を取得
      const firstVideo = await fetchChannelFirstVideo(channelInfo.uploadsPlaylistId, user.uid);
      
      // 成長率を計算
      const growthRate = calculateGrowthRate(channelInfo, firstVideo);
      
      // 完全なチャンネルデータを構築
      const channelData = {
        ...channelInfo,
        firstVideoDate: firstVideo?.publishedAt || channelInfo.publishedAt,
        growthRate,
        keywords: [], // BGM関連キーワードを後で追加可能
        uploadsPlaylistId: channelInfo.uploadsPlaylistId // 人気動画取得用
      };
      
      // Firestoreに保存
      await addChannelToFirestore(channelData, user.uid);
      
      // チャンネル一覧を更新
      await loadChannels();
      
      alert(`✅ チャンネル「${channelInfo.channelTitle}」を追加しました`);
      
    } catch (error) {
      console.error('チャンネル追加エラー:', error);
      alert(`❌ チャンネル追加に失敗しました: ${error.message}`);
    }
  };

  const handleRemoveChannel = async (idOrChannelId) => {
    try {
      // FirestoreドキュメントIDまたはYouTubeチャンネルIDのどちらでも対応
      let docIdToDelete = idOrChannelId;
      
      // もしYouTubeチャンネルIDが渡された場合、対応するFirestoreドキュメントIDを見つける
      if (idOrChannelId.startsWith('UC') && idOrChannelId.length === 24) {
        const channelToDelete = channels.find(ch => ch.channelId === idOrChannelId);
        if (channelToDelete) {
          docIdToDelete = channelToDelete.id;
        } else {
          console.error('削除対象のチャンネルが見つかりません');
          return;
        }
      }
      
      await deleteDoc(doc(db, 'users', user.uid, 'channels', docIdToDelete));
      await loadChannels();
      console.log(`✅ チャンネルを削除しました: ${docIdToDelete}`);
    } catch (error) {
      console.error('チャンネル削除エラー:', error);
      alert('チャンネルの削除に失敗しました');
    }
  };

  const handleAddToTracking = async (channel) => {
    try {
      if (trackedChannels.has(channel.channelId)) {
        return; // 既に追跡中
      }

      // 追跡リストに追加（ユーザー固有のサブコレクション）
      await setDoc(doc(db, 'users', user.uid, 'trackedChannels', channel.channelId), {
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        channelUrl: channel.channelUrl,
        thumbnailUrl: channel.thumbnailUrl,
        addedAt: new Date(),
        isActive: true
      });

      // 初回トラッキングデータを記録（ユーザー固有のサブコレクション）
      await setDoc(doc(db, 'users', user.uid, 'trackingData', `${channel.channelId}_${new Date().toISOString().split('T')[0]}`), {
        channelId: channel.channelId,
        subscriberCount: channel.subscriberCount,
        videoCount: channel.videoCount,
        totalViews: channel.totalViews,
        recordedAt: new Date()
      });

      // ローカル状態を更新
      setTrackedChannels(prev => new Set([...prev, channel.channelId]));
      
      console.log(`✅ Added to tracking: ${channel.channelTitle}`);
    } catch (error) {
      console.error('追跡追加エラー:', error);
    }
  };

  const handleChannelClick = async (channel) => {
    setSelectedChannel(channel);
    setChannelDetails({
      ...channel,
      mostPopularVideo: {
        title: "最も人気の動画（取得中...）",
        viewCount: 0,
        thumbnailUrl: "",
        url: ""
      }
    });
    
    try {
      const { fetchChannelMostPopularVideo, fetchChannelInfo } = await import('./services/channelService');
      
      // uploadsPlaylistIdが未設定の場合は取得
      let uploadsPlaylistId = channel.uploadsPlaylistId;
      if (!uploadsPlaylistId) {
        console.log('uploadsPlaylistId not found, fetching channel info...');
        const channelInfo = await fetchChannelInfo(channel.channelId, user.uid);
        uploadsPlaylistId = channelInfo.uploadsPlaylistId;
      }
      
      console.log('Using uploadsPlaylistId:', uploadsPlaylistId);
      
      // 最も人気の動画を取得
      const popularVideo = await fetchChannelMostPopularVideo(uploadsPlaylistId, user.uid);
      
      if (popularVideo) {
        setChannelDetails({
          ...channel,
          mostPopularVideo: popularVideo
        });
      } else {
        setChannelDetails({
          ...channel,
          mostPopularVideo: {
            title: "人気動画が見つかりませんでした",
            viewCount: 0,
            thumbnailUrl: "",
            url: ""
          }
        });
      }
    } catch (error) {
      console.error('人気動画取得エラー:', error);
      setChannelDetails({
        ...channel,
        mostPopularVideo: {
          title: "人気動画の取得に失敗しました",
          viewCount: 0,
          thumbnailUrl: "",
          url: ""
        }
      });
    }
  };

  const closeModal = () => {
    setSelectedChannel(null);
    setChannelDetails(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm isLogin={isLogin} setIsLogin={setIsLogin} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">チャンネルデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  const handleChannelAdded = () => {
    loadChannels(); // チャンネル追加後にリストを更新
  };

  const renderContent = () => {
    switch (currentView) {
      case 'settings':
        return <Settings />;
      case 'profile':
        return <UserProfile />;
      case 'tracking':
        return <TrackingDashboard selectedChannelId={selectedChannelForTracking} />;
      case 'history':
        return <ChannelHistory />;
      default:
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                チャンネル管理
              </h1>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddChannelModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  + 手動追加
                </button>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  📝 フィードバック
                </button>
              </div>
            </div>
            
            <SearchSection onAddChannel={handleAddChannel} />
            
            <FilterSection 
              filters={filters} 
              onFiltersChange={setFilters} 
            />
            
            <StatsOverview channels={filteredChannels} />
            
            <ChannelGrid 
              channels={filteredChannels}
              onChannelClick={handleChannelClick}
              onAddToTracking={handleAddToTracking}
              onStatusChange={async (channelId, status, reason) => {
                const { updateChannelStatus } = await import('./services/channelService');
                await updateChannelStatus(channelId, status, user.uid, reason);
                await loadChannels(); // データを再読み込み
              }}
            />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header 
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
      
      <ChannelModal
        channel={channelDetails || selectedChannel}
        isOpen={!!selectedChannel}
        onClose={closeModal}
        onRemove={handleRemoveChannel}
      />
      
      <AddChannelModal
        isOpen={showAddChannelModal}
        onClose={() => setShowAddChannelModal(false)}
        onChannelAdded={handleChannelAdded}
      />
      
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
