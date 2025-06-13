const ChannelModal = ({ channel, isOpen, onClose, onRemove }) => {
  if (!isOpen || !channel) return null;

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
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleRemove = () => {
    if (confirm('このチャンネルを追跡リストから削除しますか？')) {
      onRemove(channel.channelId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            チャンネル詳細
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-start gap-6 mb-6">
            <img
              src={channel.thumbnailUrl || '/default-avatar.png'}
              alt={channel.channelTitle}
              className="w-24 h-24 rounded-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/96x96/e5e7eb/9ca3af?text=🎵';
              }}
            />
            
            <div className="flex-1">
              <h4 className="text-2xl font-bold text-gray-900 mb-2">
                {channel.channelTitle}
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">登録者数:</span>
                  <span className="ml-2 font-semibold">
                    {formatNumber(channel.subscriberCount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">総再生回数:</span>
                  <span className="ml-2 font-semibold">
                    {formatNumber(channel.totalViews || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">動画数:</span>
                  <span className="ml-2 font-semibold">
                    {channel.videoCount || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">開設日:</span>
                  <span className="ml-2 font-semibold">
                    {formatDate(channel.publishedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">初投稿:</span>
                  <span className="ml-2 font-semibold">
                    {formatDate(channel.firstVideoDate)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">成長率:</span>
                  <span className="ml-2 font-semibold text-blue-600">
                    {channel.growthRate || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {channel.keywords && channel.keywords.length > 0 && (
            <div className="mb-6">
              <h5 className="text-sm font-semibold text-gray-900 mb-2">タグ</h5>
              <div className="flex flex-wrap gap-2">
                {channel.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {channel.latestVideo && (
            <div className="mb-6">
              <h5 className="text-sm font-semibold text-gray-900 mb-3">最新動画</h5>
              <div className="bg-gray-50 rounded-lg p-4">
                <h6 className="font-medium text-gray-900 mb-1">
                  {channel.latestVideo.title}
                </h6>
                <p className="text-sm text-gray-600 mb-2">
                  投稿日: {formatDate(channel.latestVideo.publishedAt)}
                </p>
                <a
                  href={channel.latestVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  動画を見る →
                </a>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => window.open(channel.channelUrl, '_blank')}
            className="btn-primary flex-1"
          >
            チャンネル訪問
          </button>
          <button
            onClick={handleRemove}
            className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
          >
            追跡削除
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelModal;