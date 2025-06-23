import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const UserProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    language: 'ja',
    theme: 'light',
    notifications: {
      email: true,
      browser: true,
      surgingChannels: true
    },
    preferences: {
      defaultSort: 'growthRate',
      itemsPerPage: 20,
      autoRefresh: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const profileDoc = await getDoc(doc(db, 'users', user.uid, 'profile', 'config'));
      if (profileDoc.exists()) {
        setProfile(prev => ({ ...prev, ...profileDoc.data() }));
      } else {
        // 初回の場合、デフォルト値で保存
        const defaultProfile = {
          ...profile,
          name: user.displayName || user.email?.split('@')[0] || '',
          registeredAt: new Date(),
          lastLogin: new Date()
        };
        await setDoc(doc(db, 'users', user.uid, 'profile', 'config'), defaultProfile);
        setProfile(defaultProfile);
      }
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
      setMessage('プロフィールの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'profile', 'config'), {
        ...profile,
        updatedAt: new Date()
      });
      setMessage('プロフィールを保存しました');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('プロフィール保存エラー:', error);
      setMessage('プロフィールの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedProfile = (category, field, value) => {
    setProfile(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">ユーザープロフィール</h1>
          <p className="text-gray-600 mt-1">アカウント情報と環境設定を管理します</p>
          
          {message && (
            <div className={`mt-4 p-3 rounded-md ${
              message.includes('失敗') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </div>

        <div className="p-6 space-y-8">
          {/* 基本情報 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表示名
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateProfile('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="表示名を入力"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  メールアドレスの変更はFirebase Authenticationで行ってください
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  言語設定
                </label>
                <select
                  value={profile.language}
                  onChange={(e) => updateProfile('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  テーマ
                </label>
                <select
                  value={profile.theme}
                  onChange={(e) => updateProfile('theme', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="light">ライト</option>
                  <option value="dark">ダーク</option>
                  <option value="auto">システム設定に従う</option>
                </select>
              </div>
            </div>
          </section>

          {/* 通知設定 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">通知設定</h2>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={profile.notifications.email}
                  onChange={(e) => updateNestedProfile('notifications', 'email', e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">メール通知</span>
                  <p className="text-xs text-gray-500">重要な更新をメールで通知します</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={profile.notifications.browser}
                  onChange={(e) => updateNestedProfile('notifications', 'browser', e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">ブラウザ通知</span>
                  <p className="text-xs text-gray-500">ブラウザでプッシュ通知を表示します</p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={profile.notifications.surgingChannels}
                  onChange={(e) => updateNestedProfile('notifications', 'surgingChannels', e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">急上昇チャンネル通知</span>
                  <p className="text-xs text-gray-500">追跡中のチャンネルが急成長した際に通知します</p>
                </div>
              </label>
            </div>
          </section>

          {/* 表示設定 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">表示設定</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  デフォルト並び順
                </label>
                <select
                  value={profile.preferences.defaultSort}
                  onChange={(e) => updateNestedProfile('preferences', 'defaultSort', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="growthRate">成長率順</option>
                  <option value="subscriberCount">登録者数順</option>
                  <option value="createdAt">追加日順</option>
                  <option value="channelTitle">チャンネル名順</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1ページの表示件数
                </label>
                <select
                  value={profile.preferences.itemsPerPage}
                  onChange={(e) => updateNestedProfile('preferences', 'itemsPerPage', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={10}>10件</option>
                  <option value={20}>20件</option>
                  <option value={50}>50件</option>
                  <option value={100}>100件</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={profile.preferences.autoRefresh}
                  onChange={(e) => updateNestedProfile('preferences', 'autoRefresh', e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">自動更新</span>
                  <p className="text-xs text-gray-500">データを定期的に自動更新します</p>
                </div>
              </label>
            </div>
          </section>

          {/* アカウント統計 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">アカウント統計</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">---</div>
                <div className="text-sm text-gray-600">登録チャンネル数</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">---</div>
                <div className="text-sm text-gray-600">追跡中</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">---</div>
                <div className="text-sm text-gray-600">API使用量</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {profile.registeredAt ? Math.floor((Date.now() - new Date(profile.registeredAt)) / (1000 * 60 * 60 * 24)) : '---'}
                </div>
                <div className="text-sm text-gray-600">利用開始日数</div>
              </div>
            </div>
          </section>

          {/* 保存ボタン */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : 'プロフィールを保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;