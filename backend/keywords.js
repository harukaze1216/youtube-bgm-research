/**
 * BGM関連のキーワード定義
 * ジャンルと利用シーン別に分類
 */

export const BGM_KEYWORDS = {
  // ジャンル別キーワード
  genres: [
    'lofi',
    'lo-fi',
    'chill music',
    'jazz BGM',
    'ambient music',
    'piano BGM',
    'classical BGM',
    'acoustic BGM',
    'instrumental music',
    'chillhop',
    'downtempo',
    'meditation music',
    'synthwave',
    'chillwave',
    'new age',
    'nature sounds',
    'white noise',
    'brown noise',
    'rain sounds',
    'forest sounds',
    'ocean sounds',
    'binaural beats',
    '432hz',
    '528hz',
    'healing frequency'
  ],
  
  // 利用シーン別キーワード
  scenes: [
    'study music',
    'work music',
    'focus music',
    'sleep music',
    'relaxing BGM',
    'coffee shop music',
    'reading music',
    'concentration music',
    'background music',
    'calm music',
    'peaceful music',
    'zen music',
    'workout music',
    'yoga music',
    'spa music',
    'massage music',
    'cooking music',
    'driving music',
    'morning music',
    'evening music',
    'night music',
    'rainy day music',
    'sunday morning',
    'deep focus',
    'productivity music'
  ],
  
  // 日本語キーワード
  japanese: [
    'BGM',
    '作業用BGM',
    '勉強用BGM',
    'リラックス BGM',
    '睡眠用BGM',
    'カフェ BGM',
    '集中BGM',
    'ピアノBGM',
    'ジャズBGM',
    'ヒーリングミュージック',
    '瞑想BGM',
    'ヨガBGM',
    'スパBGM',
    '読書BGM',
    'ドライブBGM',
    '雨音BGM',
    '自然音BGM',
    'おしゃれBGM',
    'モーニングBGM',
    'イブニングBGM',
    'ナイトBGM',
    '癒しの音楽',
    '集中力アップ',
    '疲労回復',
    'ストレス解消'
  ]
};

/**
 * 全キーワードを取得
 * @returns {Array<string>} 全てのキーワードの配列
 */
export function getAllKeywords() {
  return [
    ...BGM_KEYWORDS.genres,
    ...BGM_KEYWORDS.scenes,
    ...BGM_KEYWORDS.japanese
  ];
}

/**
 * ランダムにキーワードを選択
 * @param {number} count - 取得するキーワード数
 * @returns {Array<string>} ランダムに選択されたキーワード
 */
export function getRandomKeywords(count = 5) {
  const allKeywords = getAllKeywords();
  const shuffled = allKeywords.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * チャンネルタイトルや説明からBGM関連かどうかを判定
 * @param {string} title - チャンネルタイトル
 * @param {string} description - チャンネル説明
 * @returns {boolean} BGM関連チャンネルかどうか
 */
export function isBGMChannel(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  
  // BGM関連キーワードが含まれているかチェック
  const bgmIndicators = [
    'bgm', 'music', 'lofi', 'chill', 'relax', 'study', 'work', 'sleep',
    'piano', 'jazz', 'ambient', 'instrumental', 'meditation', 'healing',
    'カフェ', '作業用', '勉強用', '睡眠', 'リラックス', 'ヒーリング'
  ];
  
  // 除外キーワード（BGMではないもの）
  const excludeKeywords = [
    'game', 'gaming', 'gameplay', 'review', 'tutorial', 'vlog',
    'comedy', 'entertainment', 'news', 'sports', 'cooking',
    'ゲーム', 'レビュー', 'チュートリアル', 'ニュース', 'スポーツ', '料理'
  ];
  
  // 除外キーワードが含まれている場合はfalse
  for (const exclude of excludeKeywords) {
    if (text.includes(exclude)) {
      return false;
    }
  }
  
  // BGM関連キーワードが含まれている場合はtrue
  for (const indicator of bgmIndicators) {
    if (text.includes(indicator)) {
      return true;
    }
  }
  
  return false;
}

/**
 * チャンネルに該当するキーワードを抽出
 * @param {string} title - チャンネルタイトル
 * @param {string} description - チャンネル説明
 * @returns {Array<string>} 該当するキーワードの配列
 */
export function extractMatchingKeywords(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  const allKeywords = getAllKeywords();
  
  return allKeywords.filter(keyword => 
    text.includes(keyword.toLowerCase())
  );
}

/**
 * Firestoreから設定されたキーワードを取得
 * @returns {Promise<string[]>} 設定されたキーワード配列
 */
export async function getKeywordsFromSettings() {
  try {
    // Firebase Admin SDKを使用してFirestoreからデータを取得
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    
    const settingsDoc = await db.collection('settings').doc('app_config').get();
    
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      const searchKeywords = settings.searchKeywords;
      
      if (searchKeywords && Array.isArray(searchKeywords) && searchKeywords.length > 0) {
        console.log(`🔍 Using keywords from Firestore settings: ${searchKeywords.length} keywords`);
        return searchKeywords;
      }
    }
    
    // フォールバック: デフォルトキーワードを使用
    console.log('⚠️ Settings not found or empty, using default keywords');
    return getAllKeywords();
  } catch (error) {
    console.error('❌ Error loading keywords from settings:', error.message);
    console.log('🔄 Falling back to default keywords');
    return getAllKeywords();
  }
}

/**
 * 日付ベースでキーワードをローテーション
 * @param {number} count - 選択するキーワード数
 * @param {string[]} keywords - 使用するキーワード配列（オプション）
 * @returns {string[]} ローテーションで選択されたキーワード
 */
export function getRotatingKeywords(count = 8, keywords = null) {
  const allKeywords = keywords || getAllKeywords();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const startIndex = (dayOfYear * 3) % allKeywords.length; // 3日ごとに開始位置をシフト
  
  const selectedKeywords = [];
  for (let i = 0; i < count; i++) {
    const index = (startIndex + i) % allKeywords.length;
    selectedKeywords.push(allKeywords[index]);
  }
  
  return selectedKeywords;
}

/**
 * 設定を考慮したキーワード取得（非同期版）
 * @param {number} count - 選択するキーワード数
 * @returns {Promise<string[]>} 選択されたキーワード配列
 */
export async function getRotatingKeywordsFromSettings(count = 8) {
  try {
    const keywordsFromSettings = await getKeywordsFromSettings();
    return getRotatingKeywords(count, keywordsFromSettings);
  } catch (error) {
    console.error('Error getting keywords from settings:', error);
    return getRotatingKeywords(count);
  }
}