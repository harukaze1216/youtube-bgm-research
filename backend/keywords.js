/**
 * BGM関連のキーワード定義
 * ジャンルと利用シーン別に分類
 */

export const BGM_KEYWORDS = {
  // ジャンル別キーワード（効果的なものを厳選）
  genres: [
    'lofi',
    'lo-fi',
    'lofi hip hop',
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
    'new age music',
    'nature sounds',
    'white noise',
    'brown noise',
    'pink noise',
    'rain sounds',
    'forest sounds',
    'ocean sounds',
    'cafe sounds',
    'binaural beats',
    '432hz music',
    '528hz healing',
    'solfeggio frequencies',
    'tibetan singing bowls',
    'celtic music'
  ],
  
  // 利用シーン別キーワード（需要の高いシーンを重点的に）
  scenes: [
    'study music',
    'work music',
    'focus music',
    'concentration music',
    'sleep music',
    'relaxing music',
    'coffee shop music',
    'reading music',
    'background music',
    'calm music',
    'peaceful music',
    'zen music',
    'yoga music',
    'spa music',
    'massage music',
    'cooking music',
    'deep focus',
    'productivity music',
    'study beats',
    'work from home music',
    'mindfulness music',
    'stress relief music',
    'anxiety relief',
    'healing music',
    'therapeutic music'
  ],
  
  // 日本語キーワード（日本市場に特化）
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
    'おしゃれBGM',
    '癒しの音楽',
    '集中力アップ',
    '疲労回復',
    'ストレス解消',
    '勉強 音楽',
    '作業 音楽',
    '睡眠 音楽',
    'リラックス 音楽',
    'チルアウト',
    'アンビエント'
  ],
  
  // 新しいトレンドキーワード
  trending: [
    'study with me',
    'cozy music',
    'cottagecore music',
    'dark academia',
    'ghibli music',
    'anime lofi',
    'minecraft music',
    'aesthetic music',
    'vaporwave',
    'synthwave aesthetic',
    'retrowave',
    'bedroom pop',
    'indie folk',
    'soft piano',
    'guitar lofi'
  ],
  
  // 特定ジャンル・スタイル
  specific: [
    'jazz cafe',
    'bossa nova',
    'smooth jazz',
    'nordic music',
    'scandinavian music',
    'minimalist music',
    'drone music',
    'field recording',
    'generative music',
    'algorithmic music'
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
    ...BGM_KEYWORDS.japanese,
    ...BGM_KEYWORDS.trending,
    ...BGM_KEYWORDS.specific
  ];
}

/**
 * 効果的なキーワードを優先度順で取得
 * @param {number} count - 取得するキーワード数
 * @returns {Array<string>} 優先度順のキーワード
 */
export function getHighPriorityKeywords(count = 30) {
  // 効果的なキーワードを優先度順で定義
  const priorityKeywords = [
    // 超高優先度（最も効果的）
    'lofi', 'study music', 'BGM', '作業用BGM',
    'chill music', 'relaxing music', 'sleep music', 'piano BGM',
    
    // 高優先度（トレンド・需要高）
    'lofi hip hop', 'focus music', 'work music', '勉強用BGM',
    'jazz BGM', 'cafe music', 'ambient music', 'meditation music',
    
    // 中優先度（ニッチだが効果的）
    'study with me', 'coffee shop music', 'nature sounds', 'white noise',
    'concentration music', 'healing music', 'zen music', 'spa music',
    
    // トレンド（新しい市場）
    'aesthetic music', 'dark academia', 'cozy music', 'ghibli music',
    'anime lofi', 'vaporwave', 'synthwave', 'bedroom pop',
    
    // 日本語特化
    '睡眠用BGM', 'リラックス BGM', 'ヒーリングミュージック', '集中BGM',
    'カフェ BGM', '癒しの音楽', 'チルアウト', '瞑想BGM'
  ];
  
  return priorityKeywords.slice(0, count);
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