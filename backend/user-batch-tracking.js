#!/usr/bin/env node

/**
 * ユーザーバッチトラッキングスクリプト
 * 各ユーザーの設定とAPIキーを使用してトラッキングデータを更新
 */

import dotenv from 'dotenv';
import { db } from './firebase-config.js';
import { getChannelDetails } from './youtube-api.js';

dotenv.config();

/**
 * アクティブなトラッキングユーザーを取得
 */
async function getActiveTrackingUsers() {
  try {
    console.log('👥 アクティブトラッキングユーザーを取得中...');
    
    const usersSnapshot = await db.collection('users').get();
    const activeUsers = [];
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        // ユーザーの設定をチェック
        const settingsDoc = await db.collection('users').doc(userDoc.id)
          .collection('settings').doc('config').get();
        
        if (settingsDoc.exists) {
          const settings = settingsDoc.data();
          
          // APIキーが設定されているユーザーのみ対象
          if (settings.youtubeApiKey && 
              settings.youtubeApiKey.startsWith('AIza') && 
              settings.youtubeApiKey.length >= 35) {
            
            // トラッキング中のチャンネルがあるかチェック
            const trackingChannels = await db.collection('users').doc(userDoc.id)
              .collection('channels')
              .where('status', '==', 'tracking')
              .get();
            
            if (trackingChannels.docs.length > 0) {
              activeUsers.push({
                uid: userDoc.id,
                email: userDoc.data().email || 'unknown',
                apiKey: settings.youtubeApiKey,
                trackingChannelsCount: trackingChannels.docs.length,
                settings: settings
              });
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ ユーザー ${userDoc.id} の確認エラー:`, error.message);
      }
    }
    
    console.log(`✅ トラッキング対象ユーザー: ${activeUsers.length}名`);
    return activeUsers;
    
  } catch (error) {
    console.error('❌ ユーザー取得エラー:', error);
    throw error;
  }
}

/**
 * 単一ユーザーのトラッキングデータを更新
 */
async function updateUserTrackingData(user, logPrefix) {
  let totalUpdated = 0;
  let errors = 0;
  
  try {
    console.log(`🔄 [${logPrefix}] ${user.email} のトラッキング更新開始`);
    
    // ユーザーのトラッキング中チャンネルを取得
    const trackingChannels = await db.collection('users').doc(user.uid)
      .collection('channels')
      .where('status', '==', 'tracking')
      .get();
    
    console.log(`📊 [${logPrefix}] ${trackingChannels.docs.length}件のトラッキング対象チャンネル`);
    
    // バッチ処理でトラッキングデータを更新
    for (const channelDoc of trackingChannels.docs) {
      try {
        const channelData = channelDoc.data();
        const channelId = channelData.channelId;
        
        console.log(`  📈 [${logPrefix}] ${channelData.channelTitle} を更新中...`);
        
        // 最新のチャンネル情報を取得（ユーザーのAPIキーを使用）
        const latestData = await getChannelDetails(channelId, user.apiKey);
        
        if (latestData) {
          // トラッキングデータを保存
          const trackingDoc = {
            channelId,
            channelTitle: latestData.channelTitle,
            subscriberCount: parseInt(latestData.subscriberCount) || 0,
            videoCount: parseInt(latestData.videoCount) || 0,
            totalViews: parseInt(latestData.totalViews) || 0,
            recordedAt: new Date()
          };
          
          const docId = `${channelId}_${new Date().toISOString().split('T')[0]}`;
          await db.collection('users').doc(user.uid)
            .collection('trackingData').doc(docId).set(trackingDoc);
          
          totalUpdated++;
          console.log(`    ✅ [${logPrefix}] ${channelData.channelTitle} 更新完了`);
        } else {
          console.warn(`    ⚠️ [${logPrefix}] ${channelData.channelTitle} データ取得失敗`);
          errors++;
        }
        
        // API制限を避けるため少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (channelError) {
        console.error(`    ❌ [${logPrefix}] チャンネル更新エラー:`, channelError.message);
        errors++;
      }
    }
    
    console.log(`✅ [${logPrefix}] ${user.email}: ${totalUpdated}件更新, ${errors}件エラー`);
    
    return { totalUpdated, errors };
    
  } catch (error) {
    console.error(`❌ [${logPrefix}] ${user.email} エラー:`, error.message);
    return { totalUpdated: 0, errors: 1 };
  }
}

/**
 * ユーザーをバッチに分割
 */
function splitIntoBatches(users, batchSize) {
  const batches = [];
  for (let i = 0; i < users.length; i += batchSize) {
    batches.push(users.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * 指定されたバッチのトラッキング更新
 */
async function updateTrackingForUserBatch(batchIndex) {
  console.log('🎵 User Batch Tracking Update Started');
  console.log(`📋 バッチインデックス: ${batchIndex}`);
  console.log('=====================================');
  
  try {
    const activeUsers = await getActiveTrackingUsers();
    
    if (activeUsers.length === 0) {
      console.log('⚠️ トラッキング対象のユーザーがいません');
      return {
        success: true,
        totalUpdated: 0,
        totalErrors: 0,
        batchIndex,
        processedUsers: 0
      };
    }
    
    // ユーザーを3人ずつのバッチに分割
    const batches = splitIntoBatches(activeUsers, 3);
    
    if (batchIndex >= batches.length) {
      console.log(`⚠️ バッチ ${batchIndex} は範囲外です（最大: ${batches.length - 1}）`);
      return {
        success: true,
        totalUpdated: 0,
        totalErrors: 0,
        batchIndex,
        processedUsers: 0
      };
    }
    
    const batchUsers = batches[batchIndex];
    console.log(`📋 バッチ ${batchIndex} 処理対象: ${batchUsers.length}ユーザー`);
    
    let totalUpdated = 0;
    let totalErrors = 0;
    
    // バッチ内の各ユーザーを順次処理
    for (let i = 0; i < batchUsers.length; i++) {
      const user = batchUsers[i];
      const logPrefix = `${batchIndex}-${i}`;
      
      const result = await updateUserTrackingData(user, logPrefix);
      totalUpdated += result.totalUpdated;
      totalErrors += result.errors;
      
      // ユーザー間で少し待機
      if (i < batchUsers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ バッチ ${batchIndex} 完了: ${totalUpdated}件更新, ${totalErrors}エラー`);
    
    return {
      success: totalErrors === 0,
      totalUpdated,
      totalErrors,
      batchIndex,
      processedUsers: batchUsers.length
    };
    
  } catch (error) {
    console.error('❌ バッチトラッキング更新エラー:', error);
    throw error;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  const batchIndex = parseInt(process.argv[2]) || 0;
  
  try {
    const startTime = Date.now();
    
    const result = await updateTrackingForUserBatch(batchIndex);
    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n📊 実行結果:');
    console.log(`   成功: ${result.success ? 'Yes' : 'No'}`);
    console.log(`   更新件数: ${result.totalUpdated}`);
    console.log(`   エラー数: ${result.totalErrors}`);
    console.log(`   処理ユーザー数: ${result.processedUsers}`);
    console.log(`   実行時間: ${executionTime}秒`);
    
    if (!result.success) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ メイン処理エラー:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();