import { isBGMChannel, extractMatchingKeywords } from './keywords.js';

/**
 * チャンネルが条件に合致するかをフィルタリング
 */

/**
 * チャンネルの開設日が指定期間内かをチェック
 * @param {string} publishedAt - チャンネル開設日
 * @param {number} monthsThreshold - 何ヶ月以内か (デフォルト: 3ヶ月)
 * @returns {boolean} 期間内かどうか
 */
export function isRecentChannel(publishedAt, monthsThreshold = 3) {
  try {
    const publishedDate = new Date(publishedAt);
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setMonth(now.getMonth() - monthsThreshold);
    
    return publishedDate >= thresholdDate;
  } catch (error) {
    console.error('Date parsing error:', error);
    return false;
  }
}

/**
 * チャンネルの最初の動画が指定期間内かをチェック
 * @param {string} firstVideoDate - 最初の動画の投稿日
 * @param {number} monthsThreshold - 何ヶ月以内か (デフォルト: 3ヶ月)
 * @returns {boolean} 期間内かどうか
 */
export function hasRecentFirstVideo(firstVideoDate, monthsThreshold = 3) {
  if (!firstVideoDate) return false;
  return isRecentChannel(firstVideoDate, monthsThreshold);
}

/**
 * 登録者数が条件を満たすかをチェック
 * @param {number} subscriberCount - 登録者数
 * @param {number} minSubscribers - 最小登録者数 (デフォルト: 1000)
 * @param {number} maxSubscribers - 最大登録者数 (デフォルト: 1000000)
 * @returns {boolean} 条件を満たすかどうか
 */
export function hasValidSubscriberCount(subscriberCount, minSubscribers = 1000, maxSubscribers = 1000000) {
  return subscriberCount >= minSubscribers && subscriberCount <= maxSubscribers;
}

/**
 * チャンネルの動画数が適切かをチェック
 * @param {number} videoCount - 動画数
 * @param {number} minVideos - 最小動画数 (デフォルト: 5)
 * @returns {boolean} 条件を満たすかどうか
 */
export function hasValidVideoCount(videoCount, minVideos = 5) {
  return videoCount >= minVideos;
}

/**
 * チャンネルの成長率が良好かをチェック
 * @param {number} growthRate - 成長率
 * @param {number} minGrowthRate - 最小成長率 (デフォルト: 10)
 * @returns {boolean} 条件を満たすかどうか
 */
export function hasGoodGrowthRate(growthRate, minGrowthRate = 10) {
  return growthRate >= minGrowthRate;
}

/**
 * 包括的なチャンネルフィルタリング
 * @param {Object} channelData - チャンネルデータ
 * @param {Object} firstVideo - 最初の動画データ
 * @param {Object} options - フィルタオプション
 * @returns {Object|null} 条件を満たす場合はチャンネルデータ、そうでなければnull
 */
export function filterChannel(channelData, firstVideo = null, options = {}) {
  const {
    monthsThreshold = 3,
    minSubscribers = 1000,
    maxSubscribers = 1000000,
    minVideos = 5,
    minGrowthRate = 10
  } = options;

  // 基本データの存在チェック
  if (!channelData || !channelData.channelId) {
    return null;
  }

  // BGM関連チャンネルかどうかをチェック
  if (!isBGMChannel(channelData.channelTitle, channelData.description)) {
    console.log(`Filtered out (not BGM): ${channelData.channelTitle}`);
    return null;
  }

  // 登録者数チェック
  if (!hasValidSubscriberCount(channelData.subscriberCount, minSubscribers, maxSubscribers)) {
    console.log(`Filtered out (subscribers ${channelData.subscriberCount}): ${channelData.channelTitle}`);
    return null;
  }

  // 動画数チェック
  if (!hasValidVideoCount(channelData.videoCount, minVideos)) {
    console.log(`Filtered out (video count ${channelData.videoCount}): ${channelData.channelTitle}`);
    return null;
  }

  // 新しいチャンネルかどうかをチェック（チャンネル開設日または最初の動画日）
  const isRecent = isRecentChannel(channelData.publishedAt, monthsThreshold) ||
                   (firstVideo && hasRecentFirstVideo(firstVideo.publishedAt, monthsThreshold));

  if (!isRecent) {
    console.log(`Filtered out (not recent): ${channelData.channelTitle}`);
    return null;
  }

  // 成長率計算
  const growthRate = calculateChannelGrowthRate(channelData, firstVideo);
  
  if (!hasGoodGrowthRate(growthRate, minGrowthRate)) {
    console.log(`Filtered out (low growth ${growthRate}%): ${channelData.channelTitle}`);
    return null;
  }

  // 該当キーワードを抽出
  const matchingKeywords = extractMatchingKeywords(
    channelData.channelTitle, 
    channelData.description
  );

  // フィルタを通過したチャンネルデータを返す
  return {
    ...channelData,
    firstVideoDate: firstVideo?.publishedAt || channelData.publishedAt,
    growthRate,
    keywords: matchingKeywords,
    createdAt: new Date()
  };
}

/**
 * チャンネルの成長率を計算
 * @param {Object} channelData - チャンネルデータ
 * @param {Object} firstVideo - 最初の動画データ
 * @returns {number} 成長率（%）
 */
function calculateChannelGrowthRate(channelData, firstVideo) {
  try {
    // 基準日を決定（最初の動画がある場合はその日、なければチャンネル開設日）
    const startDate = firstVideo ? 
      new Date(firstVideo.publishedAt) : 
      new Date(channelData.publishedAt);
    
    const now = new Date();
    const ageInMonths = (now - startDate) / (1000 * 60 * 60 * 24 * 30);
    
    if (ageInMonths <= 0) return 0;
    
    // 月間平均登録者増加数を基に成長率を計算
    // 1000登録者/月 = 100%として計算
    const monthlyGrowth = channelData.subscriberCount / ageInMonths;
    const growthRate = (monthlyGrowth / 1000) * 100;
    
    return Math.round(Math.min(growthRate, 999)); // 999%でキャップ
  } catch (error) {
    console.error('Growth rate calculation error:', error);
    return 0;
  }
}

/**
 * 複数チャンネルを一括フィルタリング
 * @param {Array} channels - チャンネルデータの配列
 * @param {Object} options - フィルタオプション
 * @returns {Array} フィルタリング済みチャンネルの配列
 */
export function filterChannels(channels, options = {}) {
  const filteredChannels = [];
  
  for (const channelData of channels) {
    const filtered = filterChannel(channelData.channel, channelData.firstVideo, options);
    if (filtered) {
      filteredChannels.push(filtered);
    }
  }
  
  return filteredChannels;
}