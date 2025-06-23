/**
 * ブラウザ環境でのデータ移行ユーティリティ
 * フロントエンドから実行するためのFirebaseクライアントSDK版
 */

import { collection, getDocs, doc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// 移行先ユーザーID
const TARGET_USER_ID = 'aLb81rrXbdPfZj2BL4Jb64osrwq2';

/**
 * bgm_channels コレクションのデータ移行
 */
export async function migrateBgmChannels() {
  console.log('🔄 bgm_channels コレクションの移行を開始...');
  
  try {
    const snapshot = await getDocs(collection(db, 'bgm_channels'));
    let updatedCount = 0;
    let totalCount = snapshot.size;
    
    console.log(`📊 対象ドキュメント数: ${totalCount}`);
    
    // バッチ処理（Firestoreの制限: 500件/バッチ）
    const batchSize = 500;
    const batches = [];
    let currentBatch = writeBatch(db);
    let batchCount = 0;
    
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      
      // userIdが未設定または空の場合のみ更新
      if (!data.userId || data.userId === '' || data.userId === null) {
        const docRef = doc(db, 'bgm_channels', docSnap.id);
        currentBatch.update(docRef, { 
          userId: TARGET_USER_ID,
          migratedAt: new Date(),
          migratedFrom: 'legacy-data'
        });
        updatedCount++;
        batchCount++;
        
        // バッチサイズに達したら新しいバッチを作成
        if (batchCount >= batchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          batchCount = 0;
        }
      }
    });
    
    // 残りのバッチを追加
    if (batchCount > 0) {
      batches.push(currentBatch);
    }
    
    // 全バッチを実行
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`   バッチ ${i + 1}/${batches.length} 完了`);
    }
    
    if (updatedCount > 0) {
      console.log(`✅ bgm_channels: ${updatedCount}件 / ${totalCount}件 を更新しました`);
    } else {
      console.log(`ℹ️ bgm_channels: 更新対象のデータがありませんでした`);
    }
    
    return { updated: updatedCount, total: totalCount };
  } catch (error) {
    console.error('❌ bgm_channels の移行でエラー:', error);
    throw error;
  }
}

/**
 * tracked_channels コレクションのデータ移行
 */
export async function migrateTrackedChannels() {
  console.log('🔄 tracked_channels コレクションの移行を開始...');
  
  try {
    const snapshot = await getDocs(collection(db, 'tracked_channels'));
    let updatedCount = 0;
    let totalCount = snapshot.size;
    
    console.log(`📊 対象ドキュメント数: ${totalCount}`);
    
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      
      // userIdが未設定または空の場合のみ更新
      if (!data.userId || data.userId === '' || data.userId === null) {
        const docRef = doc(db, 'tracked_channels', docSnap.id);
        batch.update(docRef, { 
          userId: TARGET_USER_ID,
          migratedAt: new Date(),
          migratedFrom: 'legacy-data'
        });
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ tracked_channels: ${updatedCount}件 / ${totalCount}件 を更新しました`);
    } else {
      console.log(`ℹ️ tracked_channels: 更新対象のデータがありませんでした`);
    }
    
    return { updated: updatedCount, total: totalCount };
  } catch (error) {
    console.error('❌ tracked_channels の移行でエラー:', error);
    throw error;
  }
}

/**
 * tracking_data コレクションのデータ移行
 */
export async function migrateTrackingData() {
  console.log('🔄 tracking_data コレクションの移行を開始...');
  
  try {
    const snapshot = await getDocs(collection(db, 'tracking_data'));
    let updatedCount = 0;
    let totalCount = snapshot.size;
    
    console.log(`📊 対象ドキュメント数: ${totalCount}`);
    
    // バッチ処理
    const batchSize = 500;
    const batches = [];
    let currentBatch = writeBatch(db);
    let batchCount = 0;
    
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      
      // userIdが未設定または空の場合のみ更新
      if (!data.userId || data.userId === '' || data.userId === null) {
        const docRef = doc(db, 'tracking_data', docSnap.id);
        currentBatch.update(docRef, { 
          userId: TARGET_USER_ID,
          migratedAt: new Date(),
          migratedFrom: 'legacy-data'
        });
        updatedCount++;
        batchCount++;
        
        if (batchCount >= batchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          batchCount = 0;
        }
      }
    });
    
    if (batchCount > 0) {
      batches.push(currentBatch);
    }
    
    // 全バッチを実行
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`   バッチ ${i + 1}/${batches.length} 完了`);
    }
    
    if (updatedCount > 0) {
      console.log(`✅ tracking_data: ${updatedCount}件 / ${totalCount}件 を更新しました`);
    } else {
      console.log(`ℹ️ tracking_data: 更新対象のデータがありませんでした`);
    }
    
    return { updated: updatedCount, total: totalCount };
  } catch (error) {
    console.error('❌ tracking_data の移行でエラー:', error);
    throw error;
  }
}

/**
 * データ移行結果の確認
 */
export async function verifyMigration() {
  console.log('🔍 移行結果の確認を開始...');
  
  try {
    // 各コレクションでユーザーIDが設定されたデータ数を確認
    const bgmChannelsQuery = query(
      collection(db, 'bgm_channels'),
      where('userId', '==', TARGET_USER_ID)
    );
    const bgmChannelsCount = await getDocs(bgmChannelsQuery);
    
    const trackedChannelsQuery = query(
      collection(db, 'tracked_channels'),
      where('userId', '==', TARGET_USER_ID)
    );
    const trackedChannelsCount = await getDocs(trackedChannelsQuery);
    
    const trackingDataQuery = query(
      collection(db, 'tracking_data'),
      where('userId', '==', TARGET_USER_ID)
    );
    const trackingDataCount = await getDocs(trackingDataQuery);
    
    console.log('\n📈 移行結果サマリー:');
    console.log(`   bgm_channels: ${bgmChannelsCount.size}件`);
    console.log(`   tracked_channels: ${trackedChannelsCount.size}件`);
    console.log(`   tracking_data: ${trackingDataCount.size}件`);
    console.log(`   ユーザーID: ${TARGET_USER_ID}`);
    
    return {
      bgmChannels: bgmChannelsCount.size,
      trackedChannels: trackedChannelsCount.size,
      trackingData: trackingDataCount.size
    };
  } catch (error) {
    console.error('❌ 移行結果確認でエラー:', error);
    throw error;
  }
}

/**
 * メイン移行関数
 */
export async function migrateAllData() {
  console.log('🚀 データ移行を開始します');
  console.log(`📌 移行先ユーザーID: ${TARGET_USER_ID}`);
  console.log('='.repeat(50));
  
  try {
    const startTime = Date.now();
    
    // 1. bgm_channels の移行
    const bgmResult = await migrateBgmChannels();
    
    // 2. tracked_channels の移行
    const trackedResult = await migrateTrackedChannels();
    
    // 3. tracking_data の移行
    const trackingResult = await migrateTrackingData();
    
    // 4. 移行結果の確認
    const verification = await verifyMigration();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n🎉 データ移行が完了しました！');
    console.log('='.repeat(50));
    console.log(`⏱️ 実行時間: ${duration.toFixed(2)}秒`);
    console.log('\n📊 移行統計:');
    console.log(`   bgm_channels: ${bgmResult.updated}/${bgmResult.total}件`);
    console.log(`   tracked_channels: ${trackedResult.updated}/${trackedResult.total}件`);
    console.log(`   tracking_data: ${trackingResult.updated}/${trackingResult.total}件`);
    console.log(`   総移行件数: ${bgmResult.updated + trackedResult.updated + trackingResult.updated}件`);
    
    return {
      success: true,
      results: {
        bgm: bgmResult,
        tracked: trackedResult,
        tracking: trackingResult
      },
      verification,
      duration
    };
    
  } catch (error) {
    console.error('💥 データ移行でエラーが発生しました:', error);
    return {
      success: false,
      error: error.message
    };
  }
}