import { db, COLLECTIONS } from './firebase-config.js';
import { getChannelDetails } from './youtube-api.js';

/**
 * チャンネルを追跡リストに追加（新しいステータス管理システム対応）
 * @param {string} channelId - チャンネルID
 * @returns {Promise<boolean>} 成功時true
 */
export async function addChannelToTracking(channelId) {
  try {
    // 新しいステータス管理システムを使用
    const { updateChannelStatus } = await import('./firestore-service.js');
    
    // チャンネルを 'tracking' ステータスに設定
    const success = await updateChannelStatus(channelId, 'tracking');
    
    if (success) {
      // 初回のトラッキングデータを記録
      const channelData = await getChannelDetails(channelId);
      if (channelData) {
        await recordTrackingData(channelId, channelData);
        console.log(`✅ Added channel to tracking: ${channelData.channelTitle}`);
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error adding channel to tracking:`, error);
    return false;
  }
}

/**
 * チャンネルのトラッキングデータを記録
 * @param {string} channelId - チャンネルID
 * @param {Object} channelData - チャンネルデータ（省略時は再取得）
 * @returns {Promise<boolean>} 成功時true
 */
export async function recordTrackingData(channelId, channelData = null) {
  try {
    if (!channelData) {
      channelData = await getChannelDetails(channelId);
      if (!channelData) {
        console.error(`Failed to get channel details for ${channelId}`);
        return false;
      }
    }

    const trackingDoc = {
      channelId,
      subscriberCount: parseInt(channelData.subscriberCount) || 0,
      videoCount: parseInt(channelData.videoCount) || 0,
      totalViews: parseInt(channelData.totalViews) || 0,
      recordedAt: new Date()
    };

    // tracking_data コレクションに週次データとして保存
    const docId = `${channelId}_${new Date().toISOString().split('T')[0]}`;
    await db.collection(COLLECTIONS.TRACKING_DATA).doc(docId).set(trackingDoc);

    console.log(`📊 Recorded tracking data for: ${channelData.channelTitle}`);
    return true;
  } catch (error) {
    console.error(`Error recording tracking data:`, error);
    return false;
  }
}

/**
 * 追跡中のチャンネル一覧を取得（新しいステータス管理システム対応）
 * @returns {Promise<Array>} 追跡中チャンネルの配列
 */
export async function getTrackedChannels() {
  try {
    // 新しいステータス管理システムを使用
    const { getChannelsByStatus } = await import('./firestore-service.js');
    const trackingChannels = await getChannelsByStatus('tracking');
    
    console.log(`📊 Found ${trackingChannels.length} channels with tracking status`);
    return trackingChannels;
  } catch (error) {
    console.error('Error getting tracked channels:', error);
    return [];
  }
}

/**
 * チャンネルのトラッキングデータ履歴を取得
 * @param {string} channelId - チャンネルID
 * @param {number} days - 過去何日分のデータを取得するか（デフォルト: 30日）
 * @returns {Promise<Array>} トラッキングデータの配列
 */
export async function getChannelTrackingHistory(channelId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // インデックスエラーを避けるためorderByを削除し、クライアントサイドでソート
    const snapshot = await db.collection(COLLECTIONS.TRACKING_DATA)
      .where('channelId', '==', channelId)
      .get();

    const data = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(item => {
        const recordedAt = item.recordedAt.toDate ? item.recordedAt.toDate() : new Date(item.recordedAt);
        return recordedAt >= startDate;
      })
      .sort((a, b) => {
        const dateA = a.recordedAt.toDate ? a.recordedAt.toDate() : new Date(a.recordedAt);
        const dateB = b.recordedAt.toDate ? b.recordedAt.toDate() : new Date(b.recordedAt);
        return dateA - dateB;
      });

    return data;
  } catch (error) {
    console.error('Error getting channel tracking history:', error);
    return [];
  }
}

/**
 * チャンネルが追跡中かどうかをチェック
 * @param {string} channelId - チャンネルID
 * @returns {Promise<boolean>} 追跡中の場合true
 */
export async function isChannelTracked(channelId) {
  try {
    const doc = await db.collection(COLLECTIONS.TRACKED_CHANNELS).doc(channelId).get();
    return doc.exists && doc.data().isActive;
  } catch (error) {
    console.error('Error checking if channel is tracked:', error);
    return false;
  }
}

/**
 * 全ての追跡中チャンネルのデータを更新
 * @returns {Promise<Object>} 更新結果の統計
 */
export async function updateAllTrackingData() {
  try {
    const trackedChannels = await getTrackedChannels();
    let successful = 0;
    let failed = 0;

    console.log(`📊 Updating tracking data for ${trackedChannels.length} channels...`);

    for (const trackedChannel of trackedChannels) {
      const success = await recordTrackingData(trackedChannel.channelId);
      if (success) {
        successful++;
      } else {
        failed++;
      }
      
      // API制限対策
      await sleep(500);
    }

    const results = {
      total: trackedChannels.length,
      successful,
      failed
    };

    console.log(`✅ Tracking update completed: ${successful} successful, ${failed} failed`);
    return results;
  } catch (error) {
    console.error('Error updating all tracking data:', error);
    return { total: 0, successful: 0, failed: 0 };
  }
}

/**
 * 待機関数
 * @param {number} ms - 待機時間（ミリ秒）
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}