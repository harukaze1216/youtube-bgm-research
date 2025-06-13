import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { setGitHubToken, hasGitHubToken, validateGitHubToken } from '../services/githubService';

const Settings = () => {
  const [settings, setSettings] = useState({
    // 基本設定
    youtubeApiKey: '',
    githubToken: '',
    searchKeywords: ['BGM', 'instrumental', 'background music', 'ambient', 'lo-fi', 'chill', 'relaxing', 'study music'],
    
    // 収集設定
    collectionFrequency: 'daily',
    keywordCount: 8,
    videosPerKeyword: 40,
    maxChannelsPerRun: 150,
    
    // フィルタリング設定
    monthsThreshold: 3,
    minSubscribers: 1000,
    maxSubscribers: 500000,
    minVideos: 5,
    minGrowthRate: 10,
    
    // BGM判定設定
    bgmKeywords: ['BGM', 'instrumental', 'background music', 'ambient', 'lo-fi', 'chill', 'relaxing', 'study music', 'meditation', 'sleep music'],
    bgmExclusions: ['lyrics', '歌詞', 'vocal', 'sing', 'rap', 'talk', 'podcast'],
    
    // トラッキング設定
    trackingFrequency: 'weekly',
    trackingRetentionDays: 365,
    
    // 表示設定
    theme: 'light',
    defaultSort: 'growthRate',
    itemsPerPage: 20,
    
    // セキュリティ設定
    enableApiUsageDisplay: true,
    maxDailyApiCalls: 10000
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [githubTokenStatus, setGithubTokenStatus] = useState('unchecked');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'app_config'));
      if (settingsDoc.exists()) {
        setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
      }
      
      // GitHub Tokenの状態をチェック
      if (hasGitHubToken()) {
        setGithubTokenStatus('valid');
        setSettings(prev => ({ ...prev, githubToken: '●●●●●●●●●●●●' }));
      }
    } catch (error) {
      console.error('設定の読み込みエラー:', error);
      setMessage('設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // GitHub Tokenの処理
      if (settings.githubToken && settings.githubToken !== '●●●●●●●●●●●●') {
        const isValid = await validateGitHubToken(settings.githubToken);
        if (isValid) {
          setGitHubToken(settings.githubToken);
          setGithubTokenStatus('valid');
          setMessage('設定を保存しました（GitHub Token有効）');
        } else {
          setGithubTokenStatus('invalid');
          setMessage('GitHub Tokenが無効です');
          return;
        }
      } else if (settings.githubToken === '') {
        setGitHubToken('');
        setGithubTokenStatus('unchecked');
      }
      
      // 設定をFirestoreに保存（GitHub Tokenは除く）
      const settingsToSave = { ...settings };
      delete settingsToSave.githubToken;
      
      await setDoc(doc(db, 'settings', 'app_config'), settingsToSave);
      
      if (!settings.githubToken || settings.githubToken === '●●●●●●●●●●●●') {
        setMessage('設定を保存しました');
      }
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('設定の保存エラー:', error);
      setMessage('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async (format) => {
    try {
      // チャンネルデータとトラッキングデータを取得
      const channelsSnapshot = await getDocs(collection(db, 'channels'));
      const trackingSnapshot = await getDocs(collection(db, 'tracking_data'));
      
      const channels = channelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tracking = trackingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const data = { channels, tracking, exportedAt: new Date().toISOString() };
      
      if (format === 'csv') {
        // CSVエクスポート
        const csvContent = convertToCSV(channels);
        downloadFile(csvContent, 'youtube-bgm-channels.csv', 'text/csv');
      } else {
        // JSONエクスポート
        const jsonContent = JSON.stringify(data, null, 2);
        downloadFile(jsonContent, 'youtube-bgm-data.json', 'application/json');
      }
      
      setMessage(`${format.toUpperCase()}でエクスポートしました`);
    } catch (error) {
      console.error('エクスポートエラー:', error);
      setMessage('エクスポートに失敗しました');
    }
  };

  const convertToCSV = (channels) => {
    const headers = [
      'チャンネル名', 'チャンネルID', '登録者数', '動画数', '成長率(%)', 
      '開設日', '最初の動画日', 'キーワード', 'URL'
    ];
    
    const rows = channels.map(channel => [
      channel.channelTitle || '',
      channel.channelId || '',
      channel.subscriberCount || 0,
      channel.videoCount || 0,
      channel.growthRate || 0,
      channel.publishedAt ? new Date(channel.publishedAt).toLocaleDateString('ja-JP') : '',
      channel.firstVideoDate ? new Date(channel.firstVideoDate).toLocaleDateString('ja-JP') : '',
      (channel.keywords || []).join('; '),
      channel.channelUrl || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addKeyword = (type) => {
    const input = prompt(`新しい${type === 'search' ? '検索' : type === 'bgm' ? 'BGM' : '除外'}キーワードを入力してください:`);
    if (input && input.trim()) {
      const field = type === 'search' ? 'searchKeywords' : type === 'bgm' ? 'bgmKeywords' : 'bgmExclusions';
      setSettings(prev => ({
        ...prev,
        [field]: [...prev[field], input.trim()]
      }));
    }
  };

  const removeKeyword = (type, index) => {
    const field = type === 'search' ? 'searchKeywords' : type === 'bgm' ? 'bgmKeywords' : 'bgmExclusions';
    setSettings(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const tabs = [
    { id: 'basic', label: '基本設定', icon: '⚙️' },
    { id: 'collection', label: '収集設定', icon: '🔍' },
    { id: 'filtering', label: 'フィルタリング', icon: '📊' },
    { id: 'bgm', label: 'BGM判定', icon: '🎵' },
    { id: 'tracking', label: 'トラッキング', icon: '📈' },
    { id: 'display', label: '表示設定', icon: '🎨' },
    { id: 'data', label: 'データ管理', icon: '💾' },
    { id: 'security', label: 'セキュリティ', icon: '🔒' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">設定</h1>
          <p className="text-gray-600 mt-1">アプリケーションの動作をカスタマイズできます</p>
          
          {message && (
            <div className={`mt-4 p-3 rounded-md ${
              message.includes('失敗') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="flex">
          {/* タブナビゲーション */}
          <div className="w-64 border-r border-gray-200 p-4">
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* タブコンテンツ */}
          <div className="flex-1 p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">基本設定</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube API キー
                  </label>
                  <input
                    type="password"
                    value={settings.youtubeApiKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, youtubeApiKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="YouTube Data API v3 キーを入力"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Google Cloud Consoleで取得したAPIキーを設定してください
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Personal Access Token
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={settings.githubToken}
                      onChange={(e) => setSettings(prev => ({ ...prev, githubToken: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 pr-10 ${
                        githubTokenStatus === 'valid' ? 'border-green-300' :
                        githubTokenStatus === 'invalid' ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxx"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {githubTokenStatus === 'valid' && <span className="text-green-500">✓</span>}
                      {githubTokenStatus === 'invalid' && <span className="text-red-500">✗</span>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    不具合・要望報告機能でGitHub Issuesに投稿するために必要です
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    GitHub Settings → Developer settings → Personal access tokens で作成
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    検索キーワード
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {settings.searchKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword('search', index)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => addKeyword('search')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + キーワードを追加
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'collection' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">収集設定</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      収集頻度
                    </label>
                    <select
                      value={settings.collectionFrequency}
                      onChange={(e) => setSettings(prev => ({ ...prev, collectionFrequency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="daily">毎日</option>
                      <option value="weekly">毎週</option>
                      <option value="monthly">毎月</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      使用キーワード数
                    </label>
                    <input
                      type="number"
                      value={settings.keywordCount}
                      onChange={(e) => setSettings(prev => ({ ...prev, keywordCount: parseInt(e.target.value) || 8 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      max="20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      キーワードあたり動画数
                    </label>
                    <input
                      type="number"
                      value={settings.videosPerKeyword}
                      onChange={(e) => setSettings(prev => ({ ...prev, videosPerKeyword: parseInt(e.target.value) || 40 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="10"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大チャンネル処理数
                    </label>
                    <input
                      type="number"
                      value={settings.maxChannelsPerRun}
                      onChange={(e) => setSettings(prev => ({ ...prev, maxChannelsPerRun: parseInt(e.target.value) || 150 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="50"
                      max="500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'filtering' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">フィルタリング設定</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      チャンネル作成期間（ヶ月）
                    </label>
                    <input
                      type="number"
                      value={settings.monthsThreshold}
                      onChange={(e) => setSettings(prev => ({ ...prev, monthsThreshold: parseInt(e.target.value) || 3 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      max="12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最小登録者数
                    </label>
                    <input
                      type="number"
                      value={settings.minSubscribers}
                      onChange={(e) => setSettings(prev => ({ ...prev, minSubscribers: parseInt(e.target.value) || 1000 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大登録者数
                    </label>
                    <input
                      type="number"
                      value={settings.maxSubscribers}
                      onChange={(e) => setSettings(prev => ({ ...prev, maxSubscribers: parseInt(e.target.value) || 500000 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="1000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最小動画数
                    </label>
                    <input
                      type="number"
                      value={settings.minVideos}
                      onChange={(e) => setSettings(prev => ({ ...prev, minVideos: parseInt(e.target.value) || 5 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最小成長率（%）
                    </label>
                    <input
                      type="number"
                      value={settings.minGrowthRate}
                      onChange={(e) => setSettings(prev => ({ ...prev, minGrowthRate: parseInt(e.target.value) || 10 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bgm' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">BGM判定設定</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    BGM関連キーワード
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {settings.bgmKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword('bgm', index)}
                          className="ml-1 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => addKeyword('bgm')}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    + キーワードを追加
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    除外キーワード
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {settings.bgmExclusions.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword('exclusion', index)}
                          className="ml-1 text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => addKeyword('exclusion')}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    + キーワードを追加
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'tracking' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">トラッキング設定</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      トラッキング頻度
                    </label>
                    <select
                      value={settings.trackingFrequency}
                      onChange={(e) => setSettings(prev => ({ ...prev, trackingFrequency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="daily">毎日</option>
                      <option value="weekly">毎週</option>
                      <option value="monthly">毎月</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      データ保持期間（日）
                    </label>
                    <input
                      type="number"
                      value={settings.trackingRetentionDays}
                      onChange={(e) => setSettings(prev => ({ ...prev, trackingRetentionDays: parseInt(e.target.value) || 365 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="30"
                      max="1095"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'display' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">表示設定</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      テーマ
                    </label>
                    <select
                      value={settings.theme}
                      onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="light">ライト</option>
                      <option value="dark">ダーク</option>
                      <option value="auto">自動</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      デフォルト並び順
                    </label>
                    <select
                      value={settings.defaultSort}
                      onChange={(e) => setSettings(prev => ({ ...prev, defaultSort: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="growthRate">成長率順</option>
                      <option value="subscriberCount">登録者数順</option>
                      <option value="publishedAt">新着順</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      1ページの表示件数
                    </label>
                    <select
                      value={settings.itemsPerPage}
                      onChange={(e) => setSettings(prev => ({ ...prev, itemsPerPage: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={10}>10件</option>
                      <option value={20}>20件</option>
                      <option value={50}>50件</option>
                      <option value={100}>100件</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">データ管理</h2>
                
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">データエクスポート</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      収集したチャンネルデータとトラッキングデータをエクスポートできます
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => exportData('csv')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        CSV形式でエクスポート
                      </button>
                      <button
                        onClick={() => exportData('json')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        JSON形式でエクスポート
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">データバックアップ</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      定期的にデータのバックアップを作成することをお勧めします
                    </p>
                    <button
                      onClick={() => exportData('json')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                      今すぐバックアップ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">セキュリティ設定</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.enableApiUsageDisplay}
                        onChange={(e) => setSettings(prev => ({ ...prev, enableApiUsageDisplay: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">API使用量の表示</span>
                    </label>
                    <p className="text-sm text-gray-500 ml-6">
                      YouTube API使用量をダッシュボードに表示します
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      1日のAPI呼び出し制限
                    </label>
                    <input
                      type="number"
                      value={settings.maxDailyApiCalls}
                      onChange={(e) => setSettings(prev => ({ ...prev, maxDailyApiCalls: parseInt(e.target.value) || 10000 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      min="1000"
                      max="1000000"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      YouTube APIの1日あたりのクォータ制限を設定
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 保存ボタン */}
            <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : '設定を保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;