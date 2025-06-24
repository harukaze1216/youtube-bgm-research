#!/usr/bin/env node

/**
 * トラッキングデータの不一致問題をデバッグするスクリプト
 */

import dotenv from 'dotenv';
import { db } from './firebase-config.js';

dotenv.config();

async function debugTrackingMismatch() {
  console.log('🔍 トラッキングデータ不一致問題のデバッグ');
  console.log('=====================================');

  try {
    // 全ユーザーを取得
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`\n👤 ユーザー: ${userData.email || userId}`);
      
      // このユーザーのtrackingチャンネルを確認
      const trackingChannelsSnapshot = await db.collection('users').doc(userId)
        .collection('channels')
        .where('status', '==', 'tracking')
        .get();
      
      console.log(`🎯 トラッキング中チャンネル数: ${trackingChannelsSnapshot.docs.length}`);
      
      // トラッキングデータを確認
      const trackingDataSnapshot = await db.collection('users').doc(userId)
        .collection('trackingData').get();
      
      console.log(`📊 保存済みトラッキングデータ数: ${trackingDataSnapshot.docs.length}`);
      
      if (trackingChannelsSnapshot.docs.length > 0) {
        console.log('\n📋 トラッキング中チャンネルの詳細:');
        
        for (let i = 0; i < Math.min(3, trackingChannelsSnapshot.docs.length); i++) {
          const channelDoc = trackingChannelsSnapshot.docs[i];
          const channelData = channelDoc.data();
          
          console.log(`\n  ${i + 1}. ${channelData.channelTitle}`);
          console.log(`     - Firestore Doc ID: ${channelDoc.id}`);
          console.log(`     - channelId: ${channelData.channelId}`);
          console.log(`     - channelUrl: ${channelData.channelUrl}`);
          
          // このチャンネルのトラッキングデータを検索
          const channelTrackingData = trackingDataSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.channelId === channelData.channelId;
          });
          
          console.log(`     - 対応するトラッキングデータ: ${channelTrackingData.length}件`);
          
          if (channelTrackingData.length > 0) {
            const latestData = channelTrackingData[channelTrackingData.length - 1];
            const data = latestData.data();
            const recordedAt = data.recordedAt?.toDate() || new Date(data.recordedAt);
            
            console.log(`     - 最新データ: ${data.subscriberCount}登録者, ${recordedAt.toLocaleString('ja-JP')}`);
            console.log(`     - ドキュメントID: ${latestData.id}`);
          } else {
            console.log(`     - ⚠️ このチャンネルのトラッキングデータが見つかりません！`);
            
            // 類似のchannelIdを検索
            const similarData = trackingDataSnapshot.docs.filter(doc => {
              const data = doc.data();
              return data.channelTitle === channelData.channelTitle ||
                     data.channelId?.includes(channelData.channelId?.slice(-10));
            });
            
            if (similarData.length > 0) {
              console.log(`     - 🔍 類似データ見つかりました:`);
              similarData.forEach(doc => {
                const data = doc.data();
                console.log(`       - ${data.channelTitle} (channelId: ${data.channelId})`);
              });
            }
          }
        }
      }
      
      if (trackingDataSnapshot.docs.length > 0) {
        console.log('\n📊 保存済みトラッキングデータのサンプル:');
        
        for (let i = 0; i < Math.min(3, trackingDataSnapshot.docs.length); i++) {
          const doc = trackingDataSnapshot.docs[i];
          const data = doc.data();
          const recordedAt = data.recordedAt?.toDate() || new Date(data.recordedAt);
          
          console.log(`\n  ${i + 1}. ${data.channelTitle}`);
          console.log(`     - ドキュメントID: ${doc.id}`);
          console.log(`     - channelId: ${data.channelId}`);
          console.log(`     - 登録者数: ${data.subscriberCount}`);
          console.log(`     - 記録日時: ${recordedAt.toLocaleString('ja-JP')}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// スクリプト実行
debugTrackingMismatch();