import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import IssueReportForm from './IssueReportForm';

const Header = ({ currentView, onViewChange }) => {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);

  // ページ読み込み時にテーマを復元
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    // ダークモード切り替えの実装
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { id: 'channels', label: 'チャンネル一覧', icon: '🎵' },
    { id: 'tracking', label: 'トラッキング', icon: '📈' },
    { id: 'history', label: '履歴', icon: '📋' },
    { id: 'profile', label: 'プロフィール', icon: '👤' },
    { id: 'settings', label: '設定', icon: '⚙️' }
  ];

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* メインヘッダー */}
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              🎵 YouTube BGM分析
            </h1>
          </div>
          
          {/* ユーザー情報とアクション */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden sm:block truncate max-w-32">
              {user?.email}
            </span>
            <button
              onClick={() => setShowIssueForm(true)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="不具合・要望を報告"
            >
              🐛
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="ダークモード切り替え"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="ログアウト"
            >
              🚪
            </button>
          </div>
        </div>
        
        {/* タブナビゲーション */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-0 overflow-x-auto">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  currentView === item.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {showIssueForm && (
        <IssueReportForm onClose={() => setShowIssueForm(false)} />
      )}
    </header>
  );
};

export default Header;