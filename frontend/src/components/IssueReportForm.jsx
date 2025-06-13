import { useState } from 'react';
import { createGitHubIssue, getBrowserInfo, hasGitHubToken } from '../services/githubService';

const IssueReportForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'bug',
    severity: 'medium',
    reproductionSteps: '',
    expectedBehavior: '',
    actualBehavior: '',
    additionalInfo: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // バリデーション
    if (!formData.title.trim()) {
      alert('タイトルを入力してください');
      return;
    }
    
    if (!formData.body.trim()) {
      alert('内容を入力してください');
      return;
    }

    if (!hasGitHubToken()) {
      alert('GitHub Personal Access Tokenが設定されていません。設定ページでトークンを設定してください。');
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      // ブラウザ情報を追加
      const issueData = {
        ...formData,
        browserInfo: getBrowserInfo(),
        userAgent: navigator.userAgent
      };

      const result = await createGitHubIssue(issueData);
      
      setSubmitResult({
        success: true,
        message: 'Issueが正常に作成されました！',
        issue: result.issue
      });

      // フォームをリセット
      setFormData({
        title: '',
        body: '',
        type: 'bug',
        severity: 'medium',
        reproductionSteps: '',
        expectedBehavior: '',
        actualBehavior: '',
        additionalInfo: ''
      });

    } catch (error) {
      console.error('Issue作成エラー:', error);
      setSubmitResult({
        success: false,
        message: `エラーが発生しました: ${error.message}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const issueTypes = [
    { value: 'bug', label: '🐛 バグ報告', description: '予期しない動作や不具合' },
    { value: 'feature', label: '✨ 機能要望', description: '新機能や改善の提案' },
    { value: 'question', label: '❓ 質問・サポート', description: '使い方やその他の質問' }
  ];

  const severityLevels = [
    { value: 'low', label: '🟢 低', description: '軽微な問題' },
    { value: 'medium', label: '🟡 中', description: '通常の問題' },
    { value: 'high', label: '🔴 高', description: '重要な問題' },
    { value: 'critical', label: '🚨 緊急', description: 'アプリが使用不可' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              🐛 不具合・要望を報告
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            報告はGitHub Issuesに自動投稿されます
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Issue種別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              種別
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {issueTypes.map(type => (
                <label
                  key={type.value}
                  className={`cursor-pointer p-3 rounded-lg border-2 transition-colors ${
                    formData.type === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={type.value}
                    checked={formData.type === type.value}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="sr-only"
                  />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {type.description}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 重要度 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              重要度
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {severityLevels.map(level => (
                <label
                  key={level.value}
                  className={`cursor-pointer p-2 rounded-lg border-2 transition-colors ${
                    formData.severity === level.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={level.value}
                    checked={formData.severity === level.value}
                    onChange={(e) => handleInputChange('severity', e.target.value)}
                    className="sr-only"
                  />
                  <div className="text-sm font-medium text-gray-900 dark:text-white text-center">
                    {level.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                    {level.description}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              タイトル *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="input-field"
              placeholder="問題や要望を簡潔に記述してください"
              required
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              内容 *
            </label>
            <textarea
              value={formData.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              className="input-field h-32 resize-none"
              placeholder="問題の詳細や要望内容を具体的に記述してください"
              required
            />
          </div>

          {/* 詳細項目の表示切り替え */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              {showAdvanced ? '▼ 詳細項目を非表示' : '▶ 詳細項目を表示（任意）'}
            </button>
          </div>

          {/* 詳細項目 */}
          {showAdvanced && (
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              {/* 再現手順 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  再現手順
                </label>
                <textarea
                  value={formData.reproductionSteps}
                  onChange={(e) => handleInputChange('reproductionSteps', e.target.value)}
                  className="input-field h-24 resize-none"
                  placeholder="1. 〜をクリック&#10;2. 〜を入力&#10;3. 問題が発生"
                />
              </div>

              {/* 期待する動作 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  期待する動作
                </label>
                <textarea
                  value={formData.expectedBehavior}
                  onChange={(e) => handleInputChange('expectedBehavior', e.target.value)}
                  className="input-field h-20 resize-none"
                  placeholder="本来どうなるべきかを記述してください"
                />
              </div>

              {/* 実際の動作 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  実際の動作
                </label>
                <textarea
                  value={formData.actualBehavior}
                  onChange={(e) => handleInputChange('actualBehavior', e.target.value)}
                  className="input-field h-20 resize-none"
                  placeholder="実際に何が起こるかを記述してください"
                />
              </div>

              {/* 追加情報 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  追加情報
                </label>
                <textarea
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  className="input-field h-20 resize-none"
                  placeholder="スクリーンショットのURL、関連情報など"
                />
              </div>
            </div>
          )}

          {/* 投稿結果 */}
          {submitResult && (
            <div className={`p-4 rounded-lg ${
              submitResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              <div className="font-medium mb-2">
                {submitResult.success ? '✅ 成功' : '❌ エラー'}
              </div>
              <div className="text-sm mb-2">
                {submitResult.message}
              </div>
              {submitResult.success && submitResult.issue && (
                <div className="text-sm">
                  <a
                    href={submitResult.issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Issue #{submitResult.issue.number} を確認する →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* フッター */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim() || !formData.body.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  投稿中...
                </>
              ) : (
                <>
                  📤 投稿する
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueReportForm;