import { db, COLLECTIONS } from './firebase-config.js';

/**
 * Firestore操作を管理するサービス
 */

/**
 * チャンネルがすでに存在するかチェック
 * @param {string} channelId - YouTube チャンネルID
 * @returns {Promise<boolean>} 存在する場合true
 */
export async function channelExists(channelId) {
  try {
    const doc = await db.collection(COLLECTIONS.BGM_CHANNELS).doc(channelId).get();
    return doc.exists;
  } catch (error) {
    console.error(`Error checking channel existence for ${channelId}:`, error);
    return false;
  }
}

/**
 * チャンネルデータをFirestoreに保存
 * @param {Object} channelData - チャンネルデータ
 * @returns {Promise<boolean>} 保存成功時true
 */
export async function saveChannel(channelData) {
  try {
    // チャンネルIDをドキュメントIDとして使用
    const docRef = db.collection(COLLECTIONS.BGM_CHANNELS).doc(channelData.channelId);
    
    // 既存チャンネルチェック
    const exists = await channelExists(channelData.channelId);
    if (exists) {
      console.log(`Channel already exists: ${channelData.channelTitle}`);
      return false;
    }

    // データの前処理
    const processedData = processChannelData(channelData);
    
    // 新規チャンネルはステータス未設定のまま保存（ユーザーが手動で仕分けするため）
    // processedData.status = 'non-tracking'; // コメントアウト
    // processedData.statusUpdatedAt = new Date();
    // processedData.statusUpdatedBy = 'system';
    
    await docRef.set(processedData);
    console.log(`✅ Saved channel: ${channelData.channelTitle} (${channelData.subscriberCount} subscribers)`);
    return true;
  } catch (error) {
    console.error(`Error saving channel ${channelData.channelId}:`, error);
    return false;
  }
}

/**
 * 複数チャンネルを一括保存
 * @param {Array} channels - チャンネルデータの配列
 * @returns {Promise<Object>} 保存結果の統計
 */
export async function saveChannels(channels) {
  let saved = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`\n📊 Saving ${channels.length} channels to Firestore...`);

  for (const channel of channels) {
    try {
      const success = await saveChannel(channel);
      if (success) {
        saved++;
      } else {
        skipped++;
      }
      
      // レート制限対策（Firestoreの書き込み制限を避ける）
      await sleep(100);
    } catch (error) {
      console.error(`Failed to save channel ${channel.channelId}:`, error);
      errors++;
    }
  }

  const results = {
    total: channels.length,
    saved,
    skipped,
    errors
  };

  console.log(`\n📈 Save Results:`);
  console.log(`  ✅ Saved: ${saved}`);
  console.log(`  ⏭️ Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);

  return results;
}

/**
 * 保存されているチャンネル一覧を取得
 * @param {number} limit - 取得件数制限
 * @returns {Promise<Array>} チャンネルデータの配列
 */
export async function getChannels(limit = 100) {
  try {
    const snapshot = await db.collection(COLLECTIONS.BGM_CHANNELS)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const channels = [];
    snapshot.forEach(doc => {
      channels.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return channels;
  } catch (error) {
    console.error('Error fetching channels:', error);
    return [];
  }
}

/**
 * 特定の条件でチャンネルを検索
 * @param {Object} filters - 検索条件
 * @returns {Promise<Array>} マッチしたチャンネルの配列
 */
export async function searchChannels(filters = {}) {
  try {
    let query = db.collection(COLLECTIONS.BGM_CHANNELS);

    // 登録者数でフィルタ
    if (filters.minSubscribers) {
      query = query.where('subscriberCount', '>=', filters.minSubscribers);
    }
    if (filters.maxSubscribers) {
      query = query.where('subscriberCount', '<=', filters.maxSubscribers);
    }

    // 成長率でフィルタ
    if (filters.minGrowthRate) {
      query = query.where('growthRate', '>=', filters.minGrowthRate);
    }

    // 日付でフィルタ
    if (filters.createdAfter) {
      query = query.where('createdAt', '>=', filters.createdAfter);
    }

    // 並び替え
    if (filters.orderBy) {
      const direction = filters.orderDirection || 'desc';
      query = query.orderBy(filters.orderBy, direction);
    }

    // 件数制限
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    const channels = [];
    
    snapshot.forEach(doc => {
      channels.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return channels;
  } catch (error) {
    console.error('Error searching channels:', error);
    return [];
  }
}

/**
 * 既存のチャンネルIDセットを取得
 */
export async function getExistingChannelIds() {
  try {
    const snapshot = await db.collection(COLLECTIONS.BGM_CHANNELS).get();
    
    const existingIds = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.channelId) {
        existingIds.add(data.channelId);
      }
    });
    
    console.log(`📊 Found ${existingIds.size} existing channels in database`);
    return existingIds;
  } catch (error) {
    console.error('既存チャンネルID取得エラー:', error);
    return new Set();
  }
}

// ======== チャンネルステータス管理機能 ========

/**
 * チャンネルのステータスを更新
 * @param {string} channelId - チャンネルID
 * @param {string} status - 新しいステータス ('tracking', 'non-tracking', 'rejected')
 * @param {string} reason - ステータス変更理由（オプション）
 * @returns {Promise<boolean>} 更新成功時true
 */
export async function updateChannelStatus(channelId, status, reason = null) {
  try {
    const docRef = db.collection(COLLECTIONS.BGM_CHANNELS).doc(channelId);
    
    const updateData = {
      status: status,
      statusUpdatedAt: new Date(),
      statusUpdatedBy: 'system' // 必要に応じて実際のユーザーIDに変更
    };
    
    if (reason) {
      updateData.rejectionReason = reason;
    }
    
    await docRef.update(updateData);
    console.log(`✅ Updated channel status: ${channelId} -> ${status}`);
    return true;
  } catch (error) {
    console.error(`Error updating channel status for ${channelId}:`, error);
    return false;
  }
}

/**
 * 複数チャンネルのステータスを一括更新
 * @param {Array} channelIds - チャンネルIDの配列
 * @param {string} status - 新しいステータス
 * @param {string} reason - ステータス変更理由（オプション）
 * @returns {Promise<Object>} 更新結果 {success: number, failed: number}
 */
export async function bulkUpdateChannelStatus(channelIds, status, reason = null) {
  let success = 0;
  let failed = 0;
  
  for (const channelId of channelIds) {
    const result = await updateChannelStatus(channelId, status, reason);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }
  
  console.log(`📊 Bulk status update completed: ${success} success, ${failed} failed`);
  return { success, failed };
}

/**
 * ステータス別チャンネル検索
 * @param {string} status - 検索するステータス ('tracking', 'non-tracking', 'rejected', 'all')
 * @param {Object} additionalFilters - 追加フィルター
 * @returns {Promise<Array>} チャンネルリスト
 */
export async function getChannelsByStatus(status = 'all', additionalFilters = {}) {
  try {
    let query = db.collection(COLLECTIONS.BGM_CHANNELS);
    
    // ステータスフィルター
    if (status !== 'all') {
      query = query.where('status', '==', status);
    }
    
    // 追加フィルター適用
    if (additionalFilters.minSubscribers) {
      query = query.where('subscriberCount', '>=', additionalFilters.minSubscribers);
    }
    
    if (additionalFilters.orderBy) {
      const direction = additionalFilters.orderDirection || 'desc';
      query = query.orderBy(additionalFilters.orderBy, direction);
    }
    
    if (additionalFilters.limit) {
      query = query.limit(additionalFilters.limit);
    }
    
    const snapshot = await query.get();
    const channels = [];
    
    snapshot.forEach(doc => {
      channels.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`📊 Found ${channels.length} channels with status: ${status}`);
    return channels;
  } catch (error) {
    console.error('Error getting channels by status:', error);
    return [];
  }
}

/**
 * ステータス統計を取得
 * @returns {Promise<Object>} ステータス別カウント
 */
export async function getStatusStatistics() {
  try {
    const snapshot = await db.collection(COLLECTIONS.BGM_CHANNELS).get();
    
    const stats = {
      total: 0,
      tracking: 0,
      'non-tracking': 0,
      rejected: 0,
      undefined: 0 // ステータス未設定
    };
    
    snapshot.forEach(doc => {
      const data = doc.data();
      stats.total++;
      
      const status = data.status || 'undefined';
      if (stats[status] !== undefined) {
        stats[status]++;
      } else {
        stats.undefined++;
      }
    });
    
    console.log('📊 Status statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Error getting status statistics:', error);
    return {};
  }
}

/**
 * チャンネル統計を取得
 * @returns {Promise<Object>} 統計データ
 */
export async function getChannelStats() {
  try {
    const snapshot = await db.collection(COLLECTIONS.BGM_CHANNELS).get();
    
    if (snapshot.empty) {
      return {
        totalChannels: 0,
        averageSubscribers: 0,
        averageGrowthRate: 0,
        topChannel: null
      };
    }

    let totalSubscribers = 0;
    let totalGrowthRate = 0;
    let topChannel = null;
    let maxSubscribers = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      totalSubscribers += data.subscriberCount || 0;
      totalGrowthRate += data.growthRate || 0;
      
      if (data.subscriberCount > maxSubscribers) {
        maxSubscribers = data.subscriberCount;
        topChannel = data;
      }
    });

    const count = snapshot.size;

    return {
      totalChannels: count,
      averageSubscribers: Math.round(totalSubscribers / count),
      averageGrowthRate: Math.round(totalGrowthRate / count),
      topChannel
    };
  } catch (error) {
    console.error('Error getting channel stats:', error);
    return null;
  }
}

/**
 * 古いチャンネルデータを削除
 * @param {number} daysOld - 何日前のデータを削除するか
 * @returns {Promise<number>} 削除件数
 */
export async function cleanupOldChannels(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const snapshot = await db.collection(COLLECTIONS.BGM_CHANNELS)
      .where('createdAt', '<', cutoffDate)
      .get();

    if (snapshot.empty) {
      console.log('No old channels to cleanup.');
      return 0;
    }

    const batch = db.batch();
    let deleteCount = 0;

    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    await batch.commit();
    console.log(`🗑️ Cleaned up ${deleteCount} old channels`);
    
    return deleteCount;
  } catch (error) {
    console.error('Error cleaning up old channels:', error);
    return 0;
  }
}

/**
 * チャンネルデータを処理・正規化
 * @param {Object} channelData - 生のチャンネルデータ
 * @returns {Object} 処理済みのチャンネルデータ
 */
function processChannelData(channelData) {
  return {
    channelId: channelData.channelId,
    channelTitle: channelData.channelTitle,
    description: channelData.description || '',
    channelUrl: channelData.channelUrl,
    thumbnailUrl: channelData.thumbnailUrl || '',
    subscriberCount: parseInt(channelData.subscriberCount) || 0,
    videoCount: parseInt(channelData.videoCount) || 0,
    totalViews: parseInt(channelData.totalViews) || 0,
    publishedAt: channelData.publishedAt ? new Date(channelData.publishedAt) : null,
    firstVideoDate: channelData.firstVideoDate ? new Date(channelData.firstVideoDate) : null,
    growthRate: parseInt(channelData.growthRate) || 0,
    keywords: channelData.keywords || [],
    latestVideo: channelData.latestVideo || null,
    createdAt: new Date()
  };
}

/**
 * 待機関数
 * @param {number} ms - 待機時間（ミリ秒）
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}