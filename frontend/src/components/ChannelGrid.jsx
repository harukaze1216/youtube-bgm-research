import ChannelCard from './ChannelCard';

const ChannelGrid = ({ channels, onChannelClick, onAddToTracking }) => {
  if (channels.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📈</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          まだチャンネルが追加されていません
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          上記の検索欄からYouTubeチャンネルを追加して分析を開始してください
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {channels.map((channel) => (
        <ChannelCard
          key={channel.channelId}
          channel={channel}
          onChannelClick={onChannelClick}
          onAddToTracking={onAddToTracking}
        />
      ))}
    </div>
  );
};

export default ChannelGrid;