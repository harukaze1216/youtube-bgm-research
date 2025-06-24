#!/usr/bin/env node

/**
 * レガシー tracking コレクションから trackingData コレクションへデータ移行
 */

import dotenv from 'dotenv';
import { db } from './firebase-config.js';

dotenv.config();

async function migrateTrackingCollections() {
  console.log('🔄 トラッキングコレクション移行開始');
  console.log('=====================================');

  try {
    // 全ユーザーを取得
    const usersSnapshot = await db.collection('users').get();
    
    let totalMigrated = 0;
    let totalUsers = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`\n👤 ユーザー: ${userData.email || userId}`);
      
      // レガシー tracking コレクションをチェック
      const legacyTrackingSnapshot = await db.collection('users').doc(userId)
        .collection('tracking').get();
      
      // 新しい trackingData コレクションをチェック  
      const newTrackingSnapshot = await db.collection('users').doc(userId)
        .collection('trackingData').get();
      
      console.log(`📊 レガシーデータ: ${legacyTrackingSnapshot.docs.length}件`);
      console.log(`📊 新データ: ${newTrackingSnapshot.docs.length}件`);
      
      if (legacyTrackingSnapshot.docs.length > 0) {
        totalUsers++;
        
        console.log(`🔄 ${legacyTrackingSnapshot.docs.length}件のデータ移行開始...`);
        
        // レガシーデータの分析
        const legacyData = legacyTrackingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`🔍 レガシーデータサンプル:`);
        for (let i = 0; i < Math.min(3, legacyData.length); i++) {
          const data = legacyData[i];
          console.log(`  ${i + 1}. ${data.channelTitle || data.title || 'Unknown'}`);
          console.log(`     - channelId: ${data.channelId || 'N/A'}`);
          console.log(`     - subscriberCount: ${data.subscriberCount || 'N/A'}`);
          console.log(`     - recordedAt: ${data.recordedAt || data.timestamp || 'N/A'}`);
          console.log(`     - Doc ID: ${data.id}`);
        }
        
        // データ移行処理
        let migratedCount = 0;
        
        for (const legacyDoc of legacyTrackingSnapshot.docs) {
          try {
            const legacyData = legacyDoc.data();
            
            console.log(`🔍 Processing document: ${legacyDoc.id}`);
            console.log(`📊 Original data keys:`, Object.keys(legacyData));
            console.log(`📊 Sample values:`, {
              channelId: legacyData.channelId,
              channelTitle: legacyData.channelTitle,
              title: legacyData.title,
              subscriberCount: legacyData.subscriberCount
            });
            
            // データクリーニング関数
            const cleanValue = (value, defaultValue = null) => {
              if (value === undefined || value === null || value === '') {
                return defaultValue;
              }
              return value;
            };
            
            const cleanNumberValue = (value, defaultValue = 0) => {
              const parsed = parseInt(value);
              return isNaN(parsed) ? defaultValue : parsed;
            };
            
            // 新しい形式にデータを変換
            const newData = {
              channelId: cleanValue(legacyData.channelId || legacyData.channel_id, 'unknown'),
              channelTitle: cleanValue(
                legacyData.channelTitle || legacyData.title || legacyData.channel_title, 
                'Unknown Channel'
              ),
              subscriberCount: cleanNumberValue(
                legacyData.subscriberCount || legacyData.subscriber_count, 
                0
              ),
              videoCount: cleanNumberValue(
                legacyData.videoCount || legacyData.video_count, 
                0
              ),
              totalViews: cleanNumberValue(
                legacyData.totalViews || legacyData.total_views || legacyData.viewCount, 
                0
              ),
              recordedAt: cleanValue(
                legacyData.recordedAt || legacyData.timestamp, 
                new Date()
              ),
              // 移行メタデータ
              migratedFrom: 'legacy_tracking',
              migratedAt: new Date(),
              originalDocId: legacyDoc.id
            };
            
            // undefined値の最終チェック
            Object.keys(newData).forEach(key => {
              if (newData[key] === undefined) {
                console.warn(`⚠️ Undefined value detected for ${key}, setting to null`);
                newData[key] = null;
              }
            });
            
            console.log(`✅ Cleaned data:`, {
              channelId: newData.channelId,
              channelTitle: newData.channelTitle,
              subscriberCount: newData.subscriberCount,
              videoCount: newData.videoCount
            });
            
            // 重複チェック
            const existingQuery = await db.collection('users').doc(userId)
              .collection('trackingData')
              .where('channelId', '==', newData.channelId)
              .where('originalDocId', '==', legacyDoc.id)
              .get();
            
            if (existingQuery.docs.length === 0) {
              // 新しいコレクションに保存
              await db.collection('users').doc(userId)
                .collection('trackingData')
                .add(newData);
              
              migratedCount++;
              console.log(`  ✅ 移行完了: ${newData.channelTitle}`);
            } else {
              console.log(`  ⏭️ スキップ (既存): ${newData.channelTitle}`);
            }
            
          } catch (error) {
            console.error(`  ❌ 移行エラー (${legacyDoc.id}):`, error.message);
          }
        }
        
        console.log(`✅ ユーザー ${userData.email || userId}: ${migratedCount}件移行完了`);
        totalMigrated += migratedCount;
        
        // レガシーコレクションのバックアップ確認
        console.log(`⚠️ レガシーコレクション 'tracking' は保持されます（手動削除推奨）`);
      }
    }
    
    console.log('\n📊 移行結果サマリー:');
    console.log(`- 対象ユーザー数: ${totalUsers}`);
    console.log(`- 移行データ数: ${totalMigrated}`);
    console.log(`- 完了時刻: ${new Date().toLocaleString('ja-JP')}`);
    
    if (totalMigrated > 0) {
      console.log('\n🎯 次の手順:');
      console.log('1. フロントエンドでデータ表示を確認');
      console.log('2. 問題なければレガシーコレクション削除を検討');
      console.log('3. Firebase Console で tracking コレクション確認');
    }
    
  } catch (error) {
    console.error('❌ 移行エラー:', error);
    throw error;
  }
}

// 確認プロンプト（本番実行時）
async function confirmMigration() {
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️ 本番環境での実行が検出されました');
    console.log('データ移行を実行しますか？ (実際の確認は GitHub Actions ログで)');
  }
  
  return true; // GitHub Actions では自動実行
}

// メイン実行
async function main() {
  try {
    const confirmed = await confirmMigration();
    if (confirmed) {
      await migrateTrackingCollections();
    } else {
      console.log('移行がキャンセルされました');
    }
  } catch (error) {
    console.error('❌ メイン処理エラー:', error);
    process.exit(1);
  }
}

main();