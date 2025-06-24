const TrackingChart = ({ trackingData, title }) => {
  console.log(`TrackingChart for ${title}:`, trackingData);
  
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
  console.log(`Chart range for ${title}: ${minValue} - ${maxValue}`);
  
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {/* Line chart visualization */}
      <div className="mb-4">
        <div className="relative h-32 bg-gray-50 rounded p-4">
          <svg width="100%" height="100%" className="overflow-visible">
            {trackingData.length > 1 && trackingData.map((point, index) => {
              if (index === 0) return null;
              
              const prevPoint = trackingData[index - 1];
              const x1 = trackingData.length === 1 ? 50 : ((index - 1) / (trackingData.length - 1)) * 100;
              const x2 = trackingData.length === 1 ? 50 : (index / (trackingData.length - 1)) * 100;
              const y1 = maxValue === minValue ? 50 : 100 - ((prevPoint.value - minValue) / (maxValue - minValue)) * 80;
              const y2 = maxValue === minValue ? 50 : 100 - ((point.value - minValue) / (maxValue - minValue)) * 80;
              
              return (
                <line
                  key={index}
                  x1={`${x1}%`}
                  y1={`${y1}%`}
                  x2={`${x2}%`}
                  y2={`${y2}%`}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  className="transition-all duration-300"
                />
              );
            })}
            
            {trackingData.map((point, index) => {
              const x = trackingData.length === 1 ? 50 : (index / (trackingData.length - 1)) * 100;
              const y = maxValue === minValue ? 50 : 100 - ((point.value - minValue) / (maxValue - minValue)) * 80;
              const isLatest = index === trackingData.length - 1;
              
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="4"
                  fill={isLatest ? "#1d4ed8" : "#3b82f6"}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
          
          <div className="flex justify-between mt-2">
            {trackingData.map((point, index) => (
              <div key={index} className="text-xs text-gray-600 text-center flex-1">
                <div>
                  {new Date(point.date).toLocaleDateString('ja-JP', { 
                    month: 'numeric', 
                    day: 'numeric' 
                  })}
                </div>
                {point.formattedDate && (
                  <div className="text-xs text-gray-400">
                    {point.formattedDate}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Historical data table */}
      <div className="mb-4 max-h-32 overflow-y-auto">
        <h4 className="text-sm font-medium text-gray-700 mb-2">履歴データ</h4>
        <div className="space-y-1">
          {trackingData.slice().reverse().map((point, index) => (
            <div key={index} className="flex justify-between items-center text-xs">
              <div className="flex flex-col">
                <span className="text-gray-600">
                  {new Date(point.date).toLocaleDateString('ja-JP')}
                </span>
                {point.formattedDate && (
                  <span className="text-xs text-gray-400">
                    取得: {point.formattedDate}
                  </span>
                )}
              </div>
              <span className="font-medium text-gray-900">
                {point.value.toLocaleString()}
              </span>
            </div>
          ))}
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