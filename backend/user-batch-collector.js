#!/usr/bin/env node

/**
 * ユーザーバッチ収集スクリプト
 * 指定されたユーザーバッチの設定とAPIキーを使用してチャンネル収集
 * エラー耐性を重視した堅牢な実装
 */

import dotenv from 'dotenv';
import { db } from './firebase-config.js';

dotenv.config();

/**
 * アクティブユーザーを取得してバッチに分割
 */
async function getActiveUsers() {
  try {
    console.log('👥 アクティブユーザーを取得中...');
    
    // すべてのユーザーを取得
    const usersSnapshot = await db.collection('users').get();
    const activeUsers = [];
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        // ユーザーの設定をチェック
        const settingsDoc = await db.collection('users').doc(userDoc.id)
          .collection('settings').doc('config').get();
        
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          
          // APIキーが設定されているユーザーのみ対象
          if (settings.youtubeApiKey && 
              settings.youtubeApiKey.startsWith('AIza') && 
              settings.youtubeApiKey.length >= 35) {
            
            activeUsers.push({
              uid: userDoc.id,
              email: userDoc.data().email || 'unknown',
              apiKey: settings.youtubeApiKey,
              settings: settings
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️ ユーザー ${userDoc.id} の設定取得エラー:`, error.message);
        // 個別ユーザーのエラーは無視して継続
      }
    }
    
    console.log(`✅ アクティブユーザー: ${activeUsers.length}名`);
    return activeUsers;
    
  } catch (error) {
    console.error('❌ ユーザー取得エラー:', error);
    throw error;
  }
}

/**
 * ユーザーをバッチに分割
 */
function splitIntoBatches(users, batchSize = 3) {
  const batches = [];
  for (let i = 0; i < users.length; i += batchSize) {
    batches.push(users.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * 指定バッチのユーザーでチャンネル収集を実行
 */
async function collectForUserBatch(batchIndex) {
  const startTime = Date.now();
  let totalCollected = 0;
  let totalErrors = 0;
  
  try {
    console.log(`🚀 バッチ ${batchIndex} の収集開始`);
    
    // アクティブユーザーを取得
    const activeUsers = await getActiveUsers();
    if (activeUsers.length === 0) {
      console.log('ℹ️ アクティブユーザーが見つかりません');
      return { success: true, collected: 0, errors: 0 };
    }
    
    // バッチに分割
    const batches = splitIntoBatches(activeUsers, 3);
    if (batchIndex >= batches.length) {
      console.log(`ℹ️ バッチ ${batchIndex} は範囲外です（最大: ${batches.length - 1}）`);
      return { success: true, collected: 0, errors: 0 };
    }
    
    const batchUsers = batches[batchIndex];
    console.log(`📋 バッチ ${batchIndex} 処理対象: ${batchUsers.length}ユーザー`);
    
    // バッチ内の各ユーザーを並列処理
    const userPromises = batchUsers.map(async (user, index) => {
      return await collectForSingleUser(user, `${batchIndex}-${index}`);
    });
    
    const results = await Promise.allSettled(userPromises);
    
    // 結果を集計
    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalCollected += result.value.collected;
        totalErrors += result.value.errors;
      } else {
        console.error('❌ ユーザー処理エラー:', result.reason);
        totalErrors++;
      }
    }
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ バッチ ${batchIndex} 完了: ${totalCollected}件収集, ${totalErrors}エラー, ${duration.toFixed(1)}秒`);
    
    return {
      success: totalErrors < batchUsers.length, // 全滅でなければ成功とみなす
      batchIndex,
      usersProcessed: batchUsers.length,
      collected: totalCollected,
      errors: totalErrors,
      duration
    };
    
  } catch (error) {
    console.error(`❌ バッチ ${batchIndex} エラー:`, error);
    return {
      success: false,
      batchIndex,
      error: error.message,
      collected: totalCollected,
      errors: totalErrors + 1
    };
  }
}

/**
 * 単一ユーザーでのチャンネル収集
 */
async function collectForSingleUser(user, logPrefix) {
  let collected = 0;
  let errors = 0;
  
  try {
    console.log(`🔍 [${logPrefix}] ${user.email} の収集開始`);
    
    // ユーザーのAPIキーでチャンネル検索
    const { searchAndCollectChannels } = await import('./youtube-api.js');
    
    // ユーザー設定を使用
    const config = {
      apiKey: user.apiKey,
      keywordCount: user.settings.keywordCount || 8,
      videosPerKeyword: user.settings.videosPerKeyword || 40,
      maxChannelsPerRun: user.settings.maxChannelsPerRun || 150,
      monthsThreshold: user.settings.monthsThreshold || 3,
      minSubscribers: user.settings.minSubscribers || 1000,
      maxSubscribers: user.settings.maxSubscribers || 500000,
      minVideos: user.settings.minVideos || 5,
      minGrowthRate: user.settings.minGrowthRate || 10
    };
    
    // 既存チャンネルIDを取得（重複回避）
    const existingChannelsSnapshot = await db.collection('users')
      .doc(user.uid).collection('channels').get();
    const existingChannelIds = new Set(
      existingChannelsSnapshot.docs.map(doc => doc.data().channelId)
    );
    
    // チャンネル検索・収集
    const newChannels = await searchAndCollectChannels(config, existingChannelIds);
    
    if (newChannels.length > 0) {
      // ユーザーのチャンネルコレクションに保存
      const batch = db.batch();
      let batchCount = 0;
      
      for (const channel of newChannels) {
        const channelRef = db.collection('users')
          .doc(user.uid).collection('channels').doc();
        
        batch.set(channelRef, {
          ...channel,
          status: 'unset',
          collectedAt: new Date(),
          collectedBy: 'automated'
        });
        
        batchCount++;
        
        // Firestoreバッチ制限対策
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      collected = newChannels.length;
    }
    
    console.log(`✅ [${logPrefix}] ${user.email}: ${collected}件収集`);
    
    // API使用量を記録
    await recordApiUsage(user.uid, collected);
    
  } catch (error) {
    console.error(`❌ [${logPrefix}] ${user.email} エラー:`, error.message);
    errors = 1;
    
    // エラーログを保存
    await recordCollectionError(user.uid, error.message);
  }
  
  return { collected, errors };
}

/**
 * API使用量を記録
 */
async function recordApiUsage(userId, channelsCollected) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = db.collection('users').doc(userId)
      .collection('apiUsage').doc(today);
    
    await usageRef.set({
      date: today,
      channelsCollected,
      lastCollection: new Date()
    }, { merge: true });
    
  } catch (error) {
    console.warn('API使用量記録エラー:', error.message);
  }
}

/**
 * 収集エラーを記録
 */
async function recordCollectionError(userId, errorMessage) {
  try {
    await db.collection('users').doc(userId)
      .collection('collectionErrors').add({
        error: errorMessage,
        timestamp: new Date(),
        source: 'batch-collector'
      });
  } catch (error) {
    console.warn('エラー記録失敗:', error.message);
  }
}

/**
 * メイン実行関数
 */
async function main() {
  const batchIndex = parseInt(process.argv[2]);
  
  if (isNaN(batchIndex) || batchIndex < 0) {
    console.error('❌ 使用法: node user-batch-collector.js <バッチインデックス>');
    console.error('例: node user-batch-collector.js 0');
    process.exit(1);
  }
  
  console.log('🎵 User Batch Collection Started');
  console.log(`📋 バッチインデックス: ${batchIndex}`);
  console.log('=====================================');
  
  try {
    const result = await collectForUserBatch(batchIndex);
    
    console.log('\n📊 実行結果:');
    console.log(`   成功: ${result.success ? 'Yes' : 'No'}`);
    console.log(`   収集件数: ${result.collected}`);
    console.log(`   エラー数: ${result.errors}`);
    if (result.duration) {
      console.log(`   実行時間: ${result.duration.toFixed(1)}秒`);
    }
    
    // 非成功時は終了コード1で終了
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('💥 予期しないエラー:', error);
    process.exit(1);
  }
}

// スクリプト直接実行時のみmainを実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { getActiveUsers, splitIntoBatches, collectForUserBatch };