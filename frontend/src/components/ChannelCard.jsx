import { useState } from 'react';
import { markChannelAsViewed } from '../services/channelService';

const ChannelCard = ({ channel, onChannelClick, onAddToTracking }) => {
  const [isViewed, setIsViewed] = useState(channel.isViewed || false);
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getGrowthBadgeColor = (rate) => {
    if (rate >= 50) return 'bg-green-100 text-green-800';
    if (rate >= 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const isNewChannel = (createdAt) => {
    if (isViewed) return false; // 表示済みの場合はNEWを表示しない
    if (!createdAt) return false;
    const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const daysSinceAdded = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceAdded <= 7; // 7日以内に追加されたチャンネル
  };

  const handleCardClick = async () => {
    // NEWバッジを消すためにチャンネルを表示済みとしてマーク
    if (!isViewed && channel.id) {
      try {
        await markChannelAsViewed(channel.id);
        setIsViewed(true);
      } catch (error) {
        console.error('Error marking channel as viewed:', error);
      }
    }

    if (onChannelClick) {
      onChannelClick(channel);
    }
  };

  return (
    <div 
      className="channel-card cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-4">
        <img
          src={channel.thumbnailUrl || '/default-avatar.png'}
          alt={channel.channelTitle}
          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/64x64/e5e7eb/9ca3af?text=🎵';
          }}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {channel.channelTitle}
            </h3>
            {isNewChannel(channel.createdAt) && (
              <span className="inline-block px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full animate-pulse">
                NEW!
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-sm text-gray-600">
              {formatNumber(channel.subscriberCount)} 登録者
            </span>
            <span className="text-sm text-gray-500">•</span>
            <span className="text-sm text-gray-600">
              開設: {formatDate(channel.publishedAt)}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {channel.keywords && channel.keywords.slice(0, 3).map((keyword, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
          
          {channel.latestVideo && (
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-medium">最新:</span> {channel.latestVideo.title}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                getGrowthBadgeColor(channel.growthRate || 0)
              }`}
            >
              成長率 {channel.growthRate || 0}%
            </span>
            
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToTracking(channel);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  channel.isTracked 
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200'
                }`}
                disabled={channel.isTracked}
              >
                {channel.isTracked ? '追跡中' : '追跡に追加'}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(channel.channelUrl, '_blank');
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                訪問 →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelCard;