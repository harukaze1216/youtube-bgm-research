#!/usr/bin/env node

/**
 * トラッキングデータの保存状況を確認するスクリプト
 */

import dotenv from 'dotenv';
import { db } from './firebase-config.js';

dotenv.config();

async function checkTrackingData() {
  console.log('🔍 トラッキングデータ保存状況の確認');
  console.log('=====================================');

  try {
    // 全ユーザーのトラッキングデータを確認
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`📋 検索対象ユーザー数: ${usersSnapshot.docs.length}`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`\n👤 ユーザー: ${userData.email || userId}`);
      
      // このユーザーのトラッキングデータを確認
      const trackingDataSnapshot = await db.collection('users').doc(userId)
        .collection('trackingData').get();
      
      console.log(`📊 トラッキングデータ件数: ${trackingDataSnapshot.docs.length}`);
      
      if (trackingDataSnapshot.docs.length > 0) {
        // 最新のトラッキングデータを表示
        const sortedDocs = trackingDataSnapshot.docs.sort((a, b) => {
          const aTime = a.data().recordedAt?.toDate() || new Date(0);
          const bTime = b.data().recordedAt?.toDate() || new Date(0);
          return bTime - aTime;
        });
        
        console.log(`\n📈 最新のトラッキングデータ (上位5件):`);
        
        for (let i = 0; i < Math.min(5, sortedDocs.length); i++) {
          const doc = sortedDocs[i];
          const data = doc.data();
          const recordedAt = data.recordedAt?.toDate() || new Date(data.recordedAt);
          
          console.log(`  ${i + 1}. ${data.channelTitle}`);
          console.log(`     - チャンネルID: ${data.channelId}`);
          console.log(`     - 登録者数: ${data.subscriberCount?.toLocaleString() || 'N/A'}`);
          console.log(`     - 動画数: ${data.videoCount?.toLocaleString() || 'N/A'}`);
          console.log(`     - 総再生回数: ${data.totalViews?.toLocaleString() || 'N/A'}`);
          console.log(`     - 記録日時: ${recordedAt.toLocaleString('ja-JP')}`);
          console.log(`     - ドキュメントID: ${doc.id}`);
        }
        
        // 特定のチャンネル（Chilluxe）を検索
        const chilluxeData = trackingDataSnapshot.docs.filter(doc => 
          doc.data().channelTitle?.toLowerCase().includes('chilluxe') ||
          doc.data().channelId?.includes('chilluxe')
        );
        
        if (chilluxeData.length > 0) {
          console.log(`\n🎵 Chilluxe関連のデータ: ${chilluxeData.length}件`);
          chilluxeData.forEach((doc, index) => {
            const data = doc.data();
            const recordedAt = data.recordedAt?.toDate() || new Date(data.recordedAt);
            console.log(`  ${index + 1}. ${data.channelTitle}`);
            console.log(`     - 登録者数: ${data.subscriberCount?.toLocaleString()}`);
            console.log(`     - 記録日時: ${recordedAt.toLocaleString('ja-JP')}`);
          });
        } else {
          console.log(`\n🔍 Chilluxe関連のデータは見つかりませんでした`);
        }
        
        // 今日のデータがあるかチェック
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayData = trackingDataSnapshot.docs.filter(doc => {
          const recordedAt = doc.data().recordedAt?.toDate() || new Date(doc.data().recordedAt);
          return recordedAt >= today;
        });
        
        console.log(`\n📅 今日（${today.toLocaleDateString('ja-JP')}）のデータ: ${todayData.length}件`);
        
      } else {
        console.log(`⚠️ トラッキングデータがありません`);
      }
      
      // このユーザーのトラッキング中チャンネルも確認
      const trackingChannelsSnapshot = await db.collection('users').doc(userId)
        .collection('channels')
        .where('status', '==', 'tracking')
        .get();
      
      console.log(`🎯 トラッキング中チャンネル数: ${trackingChannelsSnapshot.docs.length}`);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// スクリプト実行
checkTrackingData();