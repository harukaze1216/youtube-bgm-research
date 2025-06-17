/**
 * YouTube API クォータ監視ユーティリティ
 */

let quotaUsed = 0;
const DAILY_QUOTA_LIMIT = 10000; // YouTube Data API v3 default quota
const API_COSTS = {
  search: 100,           // search.list
  channels: 1,           // channels.list
  playlistItems: 1,      // playlistItems.list
  videos: 1              // videos.list
};

/**
 * API使用コストを記録
 * @param {string} apiType - API種別
 * @param {number} count - 呼び出し回数（デフォルト1）
 */
export function recordApiUsage(apiType, count = 1) {
  const cost = (API_COSTS[apiType] || 1) * count;
  quotaUsed += cost;
  
  console.log(`📊 API Usage: ${apiType} (+${cost} units) | Total: ${quotaUsed}/${DAILY_QUOTA_LIMIT}`);
  
  if (quotaUsed > DAILY_QUOTA_LIMIT * 0.9) {
    console.warn(`⚠️ WARNING: Approaching quota limit (${quotaUsed}/${DAILY_QUOTA_LIMIT})`);
  }
  
  return quotaUsed;
}

/**
 * クォータ残量をチェック
 * @param {number} requiredUnits - 必要なクォータ単位
 * @returns {boolean} 実行可能かどうか
 */
export function checkQuotaAvailable(requiredUnits) {
  const remaining = DAILY_QUOTA_LIMIT - quotaUsed;
  
  if (remaining < requiredUnits) {
    console.error(`❌ Insufficient quota: Need ${requiredUnits}, Available ${remaining}`);
    return false;
  }
  
  return true;
}

/**
 * クォータリセット時刻までの時間を計算
 * @returns {Object} リセットまでの時間情報
 */
export function getQuotaResetTime() {
  const now = new Date();
  const resetTime = new Date();
  
  // YouTube APIは太平洋時間午前0時にリセット（UTC-8 or UTC-7）
  // 日本時間では午後5時（冬時間）または午後4時（夏時間）
  const isPST = now.getMonth() >= 10 || now.getMonth() < 3; // 11,12,1,2月は冬時間
  const resetHourJST = isPST ? 17 : 16;
  
  resetTime.setHours(resetHourJST, 0, 0, 0);
  
  if (now.getHours() >= resetHourJST) {
    resetTime.setDate(resetTime.getDate() + 1);
  }
  
  const hoursUntilReset = Math.ceil((resetTime - now) / (1000 * 60 * 60));
  
  return {
    resetTime: resetTime.toLocaleString('ja-JP'),
    hoursUntilReset,
    canRunToday: hoursUntilReset > 1
  };
}

/**
 * 現在のクォータ状況を表示
 */
export function displayQuotaStatus() {
  const resetInfo = getQuotaResetTime();
  const usagePercentage = ((quotaUsed / DAILY_QUOTA_LIMIT) * 100).toFixed(1);
  
  console.log('\\n📊 YouTube API Quota Status:');
  console.log('============================');
  console.log(`Used: ${quotaUsed}/${DAILY_QUOTA_LIMIT} units (${usagePercentage}%)`);
  console.log(`Remaining: ${DAILY_QUOTA_LIMIT - quotaUsed} units`);
  console.log(`Next reset: ${resetInfo.resetTime} (${resetInfo.hoursUntilReset}h)`);
  console.log(`Can run today: ${resetInfo.canRunToday ? 'Yes' : 'No - Wait for reset'}`);
}

/**
 * 効率的な収集パラメータを推奨
 * @param {number} availableQuota - 利用可能クォータ
 * @returns {Object} 推奨パラメータ
 */
export function recommendCollectionParams(availableQuota = null) {
  const remaining = availableQuota || (DAILY_QUOTA_LIMIT - quotaUsed);
  
  // 検索1回 = 100units, チャンネル詳細1回 = 1unit, 追加情報取得 = 2units
  // 1チャンネル処理に約3units必要
  
  let recommendedParams;
  
  if (remaining >= 5000) {
    // 十分なクォータ
    recommendedParams = {
      keywordCount: 15,
      videosPerKeyword: 30,
      maxChannelsPerRun: 300,
      message: 'Full collection mode'
    };
  } else if (remaining >= 2000) {
    // 中程度のクォータ
    recommendedParams = {
      keywordCount: 8,
      videosPerKeyword: 20,
      maxChannelsPerRun: 150,
      message: 'Standard collection mode'
    };
  } else if (remaining >= 500) {
    // 少ないクォータ
    recommendedParams = {
      keywordCount: 3,
      videosPerKeyword: 10,
      maxChannelsPerRun: 50,
      message: 'Conservative collection mode'
    };
  } else {
    // クォータ不足
    recommendedParams = {
      keywordCount: 0,
      videosPerKeyword: 0,
      maxChannelsPerRun: 0,
      message: 'Insufficient quota - skip collection'
    };
  }
  
  const estimatedCost = recommendedParams.keywordCount * 100 + 
                       recommendedParams.maxChannelsPerRun * 3;
  
  return {
    ...recommendedParams,
    estimatedCost,
    remainingAfter: remaining - estimatedCost
  };
}