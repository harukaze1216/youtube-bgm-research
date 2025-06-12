import { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
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
  const [filters, setFilters] = useState({
    sortBy: 'growth_rate',
    filterBy: 'all',
    search: ''
  });

  // Load channels from Firestore
  useEffect(() => {
    loadChannels();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    applyFilters();
  }, [channels, filters]);

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

  const applyFilters = () => {
    let filtered = [...channels];

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

  const handleChannelClick = (channel) => {
    setSelectedChannel(channel);
  };

  const closeModal = () => {
    setSelectedChannel(null);
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
        />
      </main>
      
      <ChannelModal
        channel={selectedChannel}
        isOpen={!!selectedChannel}
        onClose={closeModal}
        onRemove={handleRemoveChannel}
      />
    </div>
  );
}

export default App;
