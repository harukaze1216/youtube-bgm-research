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
    'meditation music'
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
    'zen music'
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
    'ヒーリングミュージック'
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
 * 日付ベースでキーワードをローテーション
 * @param {number} count - 選択するキーワード数
 * @returns {string[]} ローテーションで選択されたキーワード
 */
export function getRotatingKeywords(count = 8) {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const startIndex = (dayOfYear * 3) % bgmKeywords.length; // 3日ごとに開始位置をシフト
  
  const selectedKeywords = [];
  for (let i = 0; i < count; i++) {
    const index = (startIndex + i) % bgmKeywords.length;
    selectedKeywords.push(bgmKeywords[index]);
  }
  
  return selectedKeywords;
}