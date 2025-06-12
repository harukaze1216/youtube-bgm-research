const FilterSection = ({ filters, onFiltersChange }) => {
  const handleSortChange = (sortBy) => {
    onFiltersChange({ ...filters, sortBy });
  };

  const handleFilterChange = (filterBy) => {
    onFiltersChange({ ...filters, filterBy });
  };

  const handleSearchChange = (search) => {
    onFiltersChange({ ...filters, search });
  };

  return (
    <div className="card mb-8">
      <div className="flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">並び替え:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="growth_rate">成長率順</option>
            <option value="subscribers">登録者数順</option>
            <option value="views">再生回数順</option>
            <option value="recent_videos">最新動画数順</option>
            <option value="added_date">追加日順</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">フィルター:</label>
          <select
            value={filters.filterBy}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">全て</option>
            <option value="growing">成長中</option>
            <option value="large">大規模</option>
            <option value="small">小規模</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <label className="text-sm font-medium text-gray-700">検索:</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="チャンネル名検索..."
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent flex-1 min-w-0"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterSection;