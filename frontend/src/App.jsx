import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import Header from './components/Header';
import SearchSection from './components/SearchSection';
import FilterSection from './components/FilterSection';
import StatsOverview from './components/StatsOverview';
import ChannelGrid from './components/ChannelGrid';
import ChannelModal from './components/ChannelModal';

function App() {
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelDetails, setChannelDetails] = useState(null);
  const [trackedChannels, setTrackedChannels] = useState(new Set());
  const [filters, setFilters] = useState({
    sortBy: 'growth_rate',
    filterBy: 'all',
    search: ''
  });

  // Load channels from Firestore
  useEffect(() => {
    loadChannels();
    loadTrackedChannels();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    applyFilters();
  }, [channels, filters, trackedChannels]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'bgm_channels'));
      const channelData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChannels(channelData);
    } catch (error) {
      console.error('チャンネルデータの読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrackedChannels = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'tracked_channels'));
      const trackedIds = new Set(
        querySnapshot.docs
          .filter(doc => doc.data().isActive)
          .map(doc => doc.id)
      );
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

    // Category filter
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
    // TODO: Implement channel addition logic
    console.log('チャンネル追加:', channelInput);
    // For now, just reload to check for new data
    await loadChannels();
  };

  const handleRemoveChannel = async (channelId) => {
    try {
      await deleteDoc(doc(db, 'bgm_channels', channelId));
      await loadChannels();
    } catch (error) {
      console.error('チャンネル削除エラー:', error);
    }
  };

  const handleAddToTracking = async (channel) => {
    try {
      if (trackedChannels.has(channel.channelId)) {
        return; // 既に追跡中
      }

      // 追跡リストに追加
      await setDoc(doc(db, 'tracked_channels', channel.channelId), {
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        channelUrl: channel.channelUrl,
        thumbnailUrl: channel.thumbnailUrl,
        addedAt: new Date(),
        isActive: true
      });

      // 初回トラッキングデータを記録
      await setDoc(doc(db, 'tracking_data', `${channel.channelId}_${new Date().toISOString().split('T')[0]}`), {
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
    setChannelDetails(null); // Reset previous details
    
    // TODO: Fetch most popular video data from backend
    // For now, use dummy data
    const dummyPopularVideo = {
      title: "最も人気の動画（取得中...）",
      viewCount: 0,
      thumbnailUrl: "",
      url: ""
    };
    
    setChannelDetails({
      ...channel,
      mostPopularVideo: dummyPopularVideo
    });
  };

  const closeModal = () => {
    setSelectedChannel(null);
    setChannelDetails(null);
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        />
      </main>
      
      <ChannelModal
        channel={channelDetails || selectedChannel}
        isOpen={!!selectedChannel}
        onClose={closeModal}
        onRemove={handleRemoveChannel}
      />
    </div>
  );
}

export default App;
