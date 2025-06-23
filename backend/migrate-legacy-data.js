#!/usr/bin/env node

/**
 * レガシーデータ移行スクリプト
 * 旧システムのデータを指定ユーザーのサブコレクションに移行
 */

import { db } from './firebase-config.js';

const TARGET_USER_ID = process.env.TARGET_USER_ID || 'aLb81rrXbdPfZj2BL4Jb64osrwq2';

/**
 * BGMチャンネルデータを移行
 */
async function migrateBgmChannels() {
  console.log('📋 BGMチャンネルデータを移行中...');
  
  try {
    // 旧コレクションからデータを取得
    const legacyChannelsSnapshot = await db.collection('bgm_channels').get();
    console.log(`📊 見つかったレガシーチャンネル: ${legacyChannelsSnapshot.docs.length}件`);
    
    if (legacyChannelsSnapshot.docs.length === 0) {
      console.log('⚠️ 移行対象のBGMチャンネルがありません');
      return 0;
    }
    
    // バッチ処理で移行
    const batch = db.batch();
    let batchCount = 0;
    let totalMigrated = 0;
    
    for (const doc of legacyChannelsSnapshot.docs) {
      const channelData = doc.data();
      
      // 新しいユーザーサブコレクションに追加
      const newChannelRef = db.collection('users').doc(TARGET_USER_ID)
        .collection('channels').doc(doc.id);
      
      // データ構造を新形式に適合
      const migratedData = {
        ...channelData,
        // 移行情報を追加
        migratedFrom: 'bgm_channels',
        migratedAt: new Date(),
        // デフォルト値を設定
        status: channelData.status || 'unset',
        addedBy: 'migration',
        addedAt: channelData.addedAt || channelData.createdAt || new Date()
      };
      
      batch.set(newChannelRef, migratedData);
      batchCount++;
      
      // 500件ごとにコミット（Firestoreの制限）
      if (batchCount >= 500) {
        await batch.commit();
        totalMigrated += batchCount;
        console.log(`✅ ${totalMigrated}件移行完了...`);
        batchCount = 0;
      }
    }
    
    // 残りをコミット
    if (batchCount > 0) {
      await batch.commit();
      totalMigrated += batchCount;
    }
    
    console.log(`✅ BGMチャンネル移行完了: ${totalMigrated}件`);
    return totalMigrated;
    
  } catch (error) {
    console.error('❌ BGMチャンネル移行エラー:', error);
    throw error;
  }
}

/**
 * トラッキングデータを移行
 */
async function migrateTrackingData() {
  console.log('📋 トラッキングデータを移行中...');
  
  try {
    // 旧コレクションからデータを取得
    const legacyTrackingSnapshot = await db.collection('tracking_data').get();
    console.log(`📊 見つかったレガシートラッキングデータ: ${legacyTrackingSnapshot.docs.length}件`);
    
    if (legacyTrackingSnapshot.docs.length === 0) {
      console.log('⚠️ 移行対象のトラッキングデータがありません');
      return 0;
    }
    
    // バッチ処理で移行
    const batch = db.batch();
    let batchCount = 0;
    let totalMigrated = 0;
    
    for (const doc of legacyTrackingSnapshot.docs) {
      const trackingData = doc.data();
      
      // 新しいユーザーサブコレクションに追加
      const newTrackingRef = db.collection('users').doc(TARGET_USER_ID)
        .collection('tracking').doc(doc.id);
      
      // データ構造を新形式に適合
      const migratedData = {
        ...trackingData,
        // 移行情報を追加
        migratedFrom: 'tracking_data',
        migratedAt: new Date(),
        // ユーザーIDを追加
        userId: TARGET_USER_ID
      };
      
      batch.set(newTrackingRef, migratedData);
      batchCount++;
      
      // 500件ごとにコミット
      if (batchCount >= 500) {
        await batch.commit();
        totalMigrated += batchCount;
        console.log(`✅ ${totalMigrated}件移行完了...`);
        batchCount = 0;
      }
    }
    
    // 残りをコミット
    if (batchCount > 0) {
      await batch.commit();
      totalMigrated += batchCount;
    }
    
    console.log(`✅ トラッキングデータ移行完了: ${totalMigrated}件`);
    return totalMigrated;
    
  } catch (error) {
    console.error('❌ トラッキングデータ移行エラー:', error);
    throw error;
  }
}

/**
 * トラッキング対象チャンネルを移行
 */
async function migrateTrackedChannels() {
  console.log('📋 トラッキング対象チャンネルを移行中...');
  
  try {
    // 旧コレクションからデータを取得
    const legacyTrackedSnapshot = await db.collection('tracked_channels').get();
    console.log(`📊 見つかったレガシートラッキング対象: ${legacyTrackedSnapshot.docs.length}件`);
    
    if (legacyTrackedSnapshot.docs.length === 0) {
      console.log('⚠️ 移行対象のトラッキング対象チャンネルがありません');
      return 0;
    }
    
    // 既存のチャンネルをtrackingステータスに更新
    const batch = db.batch();
    let batchCount = 0;
    let totalMigrated = 0;
    
    for (const doc of legacyTrackedSnapshot.docs) {
      const channelId = doc.id;
      
      // ユーザーのチャンネルコレクションで該当チャンネルを探して更新
      const channelRef = db.collection('users').doc(TARGET_USER_ID)
        .collection('channels').doc(channelId);
      
      // ステータスをtrackingに更新
      batch.update(channelRef, {
        status: 'tracking',
        trackingStartedAt: doc.data().addedAt || new Date(),
        migratedTracking: true
      });
      
      batchCount++;
      
      // 500件ごとにコミット
      if (batchCount >= 500) {
        await batch.commit();
        totalMigrated += batchCount;
        console.log(`✅ ${totalMigrated}件移行完了...`);
        batchCount = 0;
      }
    }
    
    // 残りをコミット
    if (batchCount > 0) {
      await batch.commit();
      totalMigrated += batchCount;
    }
    
    console.log(`✅ トラッキング対象チャンネル移行完了: ${totalMigrated}件`);
    return totalMigrated;
    
  } catch (error) {
    console.error('❌ トラッキング対象チャンネル移行エラー:', error);
    throw error;
  }
}

/**
 * 移行前の確認
 */
async function checkMigrationTarget() {
  console.log('🔍 移行対象ユーザーを確認中...');
  
  try {
    // ユーザーの存在確認
    const userDoc = await db.collection('users').doc(TARGET_USER_ID).get();
    
    if (!userDoc.exists) {
      console.error('❌ 移行対象ユーザーが存在しません:', TARGET_USER_ID);
      console.log('💡 ユーザーが先にログインして、ユーザードキュメントを作成してください');
      return false;
    }
    
    console.log('✅ 移行対象ユーザー確認:', userDoc.data().email || 'unknown');
    
    // 既存データの確認
    const existingChannels = await db.collection('users').doc(TARGET_USER_ID)
      .collection('channels').get();
    console.log(`📊 既存チャンネル数: ${existingChannels.docs.length}件`);
    
    return true;
    
  } catch (error) {
    console.error('❌ 移行前確認エラー:', error);
    return false;
  }
}

/**
 * 移行結果のサマリーを表示
 */
async function showMigrationSummary() {
  console.log('\n📊 移行後のデータ確認...');
  
  try {
    const channelsSnapshot = await db.collection('users').doc(TARGET_USER_ID)
      .collection('channels').get();
    const trackingSnapshot = await db.collection('users').doc(TARGET_USER_ID)
      .collection('tracking').get();
    
    console.log(`📈 ユーザー ${TARGET_USER_ID} のデータ:`);
    console.log(`   チャンネル: ${channelsSnapshot.docs.length}件`);
    console.log(`   トラッキングデータ: ${trackingSnapshot.docs.length}件`);
    
    // ステータス別の件数
    const statusCounts = {};
    channelsSnapshot.docs.forEach(doc => {
      const status = doc.data().status || 'unset';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('   ステータス別:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`     ${status}: ${count}件`);
    });
    
  } catch (error) {
    console.error('❌ サマリー表示エラー:', error);
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🚀 レガシーデータ移行開始');
  console.log(`📋 移行対象ユーザー: ${TARGET_USER_ID}`);
  console.log('=====================================\n');
  
  try {
    // 移行前確認
    const canProceed = await checkMigrationTarget();
    if (!canProceed) {
      process.exit(1);
    }
    
    console.log('\n🔄 データ移行を開始します...\n');
    
    // 各データタイプを移行
    const channelsMigrated = await migrateBgmChannels();
    console.log('');
    
    const trackingMigrated = await migrateTrackingData();
    console.log('');
    
    const trackedMigrated = await migrateTrackedChannels();
    console.log('');
    
    // サマリー表示
    await showMigrationSummary();
    
    console.log('\n✅ レガシーデータ移行完了');
    console.log(`📊 移行結果:`);
    console.log(`   BGMチャンネル: ${channelsMigrated}件`);
    console.log(`   トラッキングデータ: ${trackingMigrated}件`);
    console.log(`   トラッキング対象: ${trackedMigrated}件`);
    
  } catch (error) {
    console.error('❌ 移行処理でエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();