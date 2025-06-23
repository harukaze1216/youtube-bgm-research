import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const FeedbackModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'bug',
    title: '',
    description: '',
    steps: '',
    expected: '',
    actual: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const feedbackTypes = [
    { value: 'bug', label: '🐛 バグ報告', icon: '🐛' },
    { value: 'feature', label: '💡 機能要望', icon: '💡' },
    { value: 'improvement', label: '🔧 改善提案', icon: '🔧' },
    { value: 'other', label: '❓ その他', icon: '❓' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateIssueBody = () => {
    const type = feedbackTypes.find(t => t.value === formData.type);
    let body = `## ${type.icon} ${type.label}\n\n`;
    
    body += `**説明:**\n${formData.description}\n\n`;
    
    if (formData.type === 'bug') {
      body += `**再現手順:**\n${formData.steps}\n\n`;
      body += `**期待される動作:**\n${formData.expected}\n\n`;
      body += `**実際の動作:**\n${formData.actual}\n\n`;
    }
    
    body += `**報告者:** ${user.email}\n`;
    body += `**報告日時:** ${new Date().toLocaleString('ja-JP')}\n`;
    body += `**ブラウザ:** ${navigator.userAgent}\n`;
    
    return body;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) return;

    setLoading(true);
    try {
      // フィードバックレポートをFirestoreに保存
      const feedbackRef = collection(db, 'users', user.uid, 'feedbackReports');
      const issueBody = generateIssueBody();
      
      await addDoc(feedbackRef, {
        title: formData.title,
        body: issueBody,
        type: formData.type,
        status: 'pending', // pending | sent | error
        githubIssueNum: null,
        createdAt: new Date(),
        userEmail: user.email
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        // フォームをリセット
        setFormData({
          type: 'bug',
          title: '',
          description: '',
          steps: '',
          expected: '',
          actual: ''
        });
      }, 2000);

    } catch (error) {
      console.error('フィードバック送信エラー:', error);
      alert('フィードバックの送信に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 w-full max-w-md text-center">
          <div className="text-green-600 text-4xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            フィードバックを送信しました
          </h3>
          <p className="text-gray-600">
            ご報告いただき、ありがとうございます。<br />
            開発チームが確認次第、対応いたします。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              📝 フィードバック・不具合報告
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* フィードバックタイプ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              報告タイプ
            </label>
            <div className="grid grid-cols-2 gap-3">
              {feedbackTypes.map(type => (
                <label
                  key={type.value}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    formData.type === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
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
                  <span className="text-sm font-medium">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="問題や要望を簡潔に表現してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              詳細説明 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="問題の詳細や要望内容を具体的に記載してください"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* バグ報告時の追加フィールド */}
          {formData.type === 'bug' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  再現手順
                </label>
                <textarea
                  value={formData.steps}
                  onChange={(e) => handleInputChange('steps', e.target.value)}
                  placeholder="1. ○○をクリック&#10;2. △△を入力&#10;3. □□ボタンを押す&#10;4. エラーが発生"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  期待される動作
                </label>
                <textarea
                  value={formData.expected}
                  onChange={(e) => handleInputChange('expected', e.target.value)}
                  placeholder="本来どのような動作をするべきかを記載してください"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  実際の動作
                </label>
                <textarea
                  value={formData.actual}
                  onChange={(e) => handleInputChange('actual', e.target.value)}
                  placeholder="実際に起こった動作やエラーメッセージを記載してください"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {/* プライバシー情報 */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              📋 送信される情報
            </h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 報告内容（上記で入力された内容）</li>
              <li>• ユーザーのメールアドレス: {user?.email}</li>
              <li>• 報告日時</li>
              <li>• ブラウザ情報（デバッグ用）</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              ※ 個人的なAPIキーやパスワードなどの機密情報は送信されません
            </p>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || !formData.description.trim() || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '送信中...' : '送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;