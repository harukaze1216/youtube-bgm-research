const StatsOverview = ({ channels }) => {
  const totalChannels = channels.length;
  const avgGrowth = channels.length > 0 
    ? Math.round(channels.reduce((sum, ch) => sum + (ch.growthRate || 0), 0) / channels.length)
    : 0;
  
  const topPerformer = channels.length > 0
    ? channels.reduce((top, ch) => 
        (ch.growthRate || 0) > (top.growthRate || 0) ? ch : top, channels[0]
      )
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="stat-card">
        <div className="text-3xl font-bold text-blue-600 mb-1">
          {totalChannels}
        </div>
        <div className="text-sm text-gray-600">追跡チャンネル数</div>
      </div>
      
      <div className="stat-card">
        <div className="text-3xl font-bold text-purple-600 mb-1">
          {avgGrowth}%
        </div>
        <div className="text-sm text-gray-600">平均成長率</div>
      </div>
      
      <div className="stat-card">
        <div className="text-lg font-semibold text-gray-900 mb-1 truncate">
          {topPerformer ? topPerformer.channelTitle : '-'}
        </div>
        <div className="text-sm text-gray-600">トップパフォーマー</div>
      </div>
    </div>
  );
};

export default StatsOverview;