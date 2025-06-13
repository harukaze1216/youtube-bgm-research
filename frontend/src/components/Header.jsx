import { useState } from 'react';

const Header = ({ currentView, onViewChange }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    // TODO: Implement dark mode toggle
  };

  const navItems = [
    { id: 'channels', label: 'チャンネル一覧', icon: '🎵' },
    { id: 'tracking', label: 'トラッキング', icon: '📈' },
    { id: 'settings', label: '設定', icon: '⚙️' }
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 mr-8">
              🎵 YouTube BGMチャンネル分析
            </h1>
            
            <nav className="flex space-x-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="ダークモード切り替え"
            >
              🌗
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;