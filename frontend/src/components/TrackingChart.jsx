const TrackingChart = ({ trackingData, title }) => {
  if (!trackingData || trackingData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8 text-gray-500">
          トラッキングデータがありません
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...trackingData.map(d => d.value));
  const minValue = Math.min(...trackingData.map(d => d.value));
  
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {/* Simple line chart visualization */}
      <div className="mb-4">
        <div className="flex items-end h-32 gap-2">
          {trackingData.map((point, index) => {
            const height = ((point.value - minValue) / (maxValue - minValue)) * 100;
            const isLatest = index === trackingData.length - 1;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-100 rounded-t">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isLatest ? 'bg-blue-500' : 'bg-blue-300'
                    }`}
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1 text-center">
                  {new Date(point.date).toLocaleDateString('ja-JP', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
        <div>
          <div className="text-sm text-gray-600">最新</div>
          <div className="text-lg font-semibold text-blue-600">
            {trackingData[trackingData.length - 1]?.value.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">最高</div>
          <div className="text-lg font-semibold text-green-600">
            {maxValue.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">成長</div>
          <div className={`text-lg font-semibold ${
            trackingData.length > 1 
              ? trackingData[trackingData.length - 1]?.value > trackingData[0]?.value 
                ? 'text-green-600' 
                : 'text-red-600'
              : 'text-gray-600'
          }`}>
            {trackingData.length > 1 
              ? `${((trackingData[trackingData.length - 1]?.value / trackingData[0]?.value - 1) * 100).toFixed(1)}%`
              : 'N/A'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingChart;