import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * トラッキングデータを記録
 */
export async function recordTrackingData(channelId, subscriberCount, userId, additionalData = {}) {
  try {
    const trackingRef = collection(db, 'users', userId, 'trackingData');
    
    // 前回のデータを取得して差分を計算
    const previousData = await getLatestTrackingData(channelId, userId);
    const delta = previousData ? subscriberCount - previousData.subscriberCount : 0;
    
    await addDoc(trackingRef, {
      channelId,
      subscriberCount,
      delta,
      recordedAt: new Date(),
      ...additionalData
    });
    
    console.log(`📊 Tracking data recorded for channel ${channelId}: ${subscriberCount} (${delta > 0 ? '+' : ''}${delta})`);
    return true;
  } catch (error) {
    console.error('トラッキングデータ記録エラー:', error);
    throw error;
  }
}

/**
 * チャンネルの最新トラッキングデータを取得
 */
export async function getLatestTrackingData(channelId, userId) {
  try {
    const q = query(
      collection(db, 'users', userId, 'trackingData'),
      where('channelId', '==', channelId),
      orderBy('recordedAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    };
  } catch (error) {
    console.error('最新トラッキングデータ取得エラー:', error);
    return null;
  }
}

/**
 * チャンネルのトラッキング履歴を取得
 */
export async function getChannelTrackingHistory(channelId, userId, days = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const q = query(
      collection(db, 'users', userId, 'trackingData'),
      where('channelId', '==', channelId),
      where('recordedAt', '>=', cutoffDate),
      orderBy('recordedAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('トラッキング履歴取得エラー:', error);
    return [];
  }
}

/**
 * 成長率を計算（7日移動平均）
 */
export function calculateGrowthRate(trackingHistory) {
  if (trackingHistory.length < 2) return 0;
  
  // 最新データと7日前のデータを比較
  const latest = trackingHistory[trackingHistory.length - 1];
  const sevenDaysAgo = trackingHistory.find(record => {
    const daysDiff = (latest.recordedAt.toDate() - record.recordedAt.toDate()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 6 && daysDiff <= 8; // 6-8日前のデータ
  });
  
  if (!sevenDaysAgo || sevenDaysAgo.subscriberCount === 0) return 0;
  
  const growthRate = ((latest.subscriberCount - sevenDaysAgo.subscriberCount) / sevenDaysAgo.subscriberCount) * 100;
  return Math.round(growthRate * 100) / 100; // 小数点第2位まで
}

/**
 * チャンネルの成長率を更新
 */
export async function updateChannelGrowthRate(channelId, userId) {
  try {
    const history = await getChannelTrackingHistory(channelId, userId, 14); // 2週間のデータ
    const growthRate = calculateGrowthRate(history);
    
    // チャンネルドキュメントの成長率を更新
    const channelRef = doc(db, 'users', userId, 'channels', channelId);
    await updateDoc(channelRef, {
      growthRate,
      lastGrowthUpdate: serverTimestamp()
    });
    
    console.log(`📈 Updated growth rate for channel ${channelId}: ${growthRate}%`);
    return growthRate;
  } catch (error) {
    console.error('成長率更新エラー:', error);
    throw error;
  }
}

/**
 * 急上昇チャンネルを検出
 */
export async function detectSurgingChannels(userId, threshold = 50) {
  try {
    const channelsRef = collection(db, 'users', userId, 'channels');
    const q = query(
      channelsRef,
      where('status', '==', 'tracking')
    );
    
    const querySnapshot = await getDocs(q);
    const surgingChannels = [];
    
    for (const channelDoc of querySnapshot.docs) {
      const channelData = channelDoc.data();
      const history = await getChannelTrackingHistory(channelDoc.id, userId, 7);
      
      if (history.length >= 2) {
        const recentGrowth = calculateGrowthRate(history.slice(-7)); // 直近7日の成長率
        
        if (recentGrowth >= threshold) {
          surgingChannels.push({
            id: channelDoc.id,
            ...channelData,
            recentGrowthRate: recentGrowth
          });
        }
      }
    }
    
    // 成長率でソート
    surgingChannels.sort((a, b) => (b.recentGrowthRate || 0) - (a.recentGrowthRate || 0));
    
    console.log(`🚀 Found ${surgingChannels.length} surging channels`);
    return surgingChannels;
  } catch (error) {
    console.error('急上昇チャンネル検出エラー:', error);
    return [];
  }
}

/**
 * 古いトラッキングデータを削除
 */
export async function cleanupOldTrackingData(userId, retentionDays = 365) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const q = query(
      collection(db, 'users', userId, 'trackingData'),
      where('recordedAt', '<', cutoffDate)
    );
    
    const querySnapshot = await getDocs(q);
    const deleteBatch = [];
    
    querySnapshot.docs.forEach(doc => {
      deleteBatch.push(doc.ref);
    });
    
    // Firestoreのバッチ削除は別途実装が必要
    console.log(`🗑️ Found ${deleteBatch.length} old tracking records to delete`);
    return deleteBatch.length;
  } catch (error) {
    console.error('古いデータクリーンアップエラー:', error);
    return 0;
  }
}