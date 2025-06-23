import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ユーザーログイン時にユーザードキュメントを確認/作成
        await ensureUserDocument(user);
      }
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /**
   * ユーザードキュメントの存在を確認し、必要に応じて作成
   */
  const ensureUserDocument = async (user) => {
    try {
      // トップレベルのユーザードキュメントを確認/作成
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log('👤 トップレベルユーザードキュメントを作成中:', user.email);
        await setDoc(userRef, {
          email: user.email,
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'ユーザー',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      } else {
        // 既存ユーザーの最終ログイン時刻を更新
        await setDoc(userRef, {
          lastLogin: serverTimestamp()
        }, { merge: true });
      }
      
      // ユーザープロフィールドキュメントを確認
      const userProfileRef = doc(db, 'users', user.uid, 'profile', 'config');
      const userProfileDoc = await getDoc(userProfileRef);
      
      if (!userProfileDoc.exists()) {
        console.log('👤 ユーザープロフィールを作成中:', user.email);
        
        // デフォルトプロフィールを作成
        await setDoc(userProfileRef, {
          name: user.displayName || user.email?.split('@')[0] || 'ユーザー',
          email: user.email,
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
          },
          registeredAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
        
        console.log('✅ ユーザープロフィール作成完了');
      } else {
        // 既存ユーザーの最終ログイン時刻を更新
        await setDoc(userProfileRef, {
          lastLogin: serverTimestamp()
        }, { merge: true });
      }
      
      // 設定ドキュメントを確認
      const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'config');
      const userSettingsDoc = await getDoc(userSettingsRef);
      
      if (!userSettingsDoc.exists()) {
        console.log('⚙️ ユーザー設定を作成中');
        
        // デフォルト設定を作成
        await setDoc(userSettingsRef, {
          // YouTube APIキーは空で開始（ユーザーが入力）
          youtubeApiKey: '',
          
          // 検索キーワード
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
          maxDailyApiCalls: 10000,
          
          createdAt: serverTimestamp()
        });
        
        console.log('✅ ユーザー設定作成完了');
      }
      
    } catch (error) {
      console.error('ユーザードキュメント作成エラー:', error);
      // エラーが発生してもログインは継続
    }
  };

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const register = async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // 新規登録時は自動的にonAuthStateChangedでensureUserDocumentが呼ばれる
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};