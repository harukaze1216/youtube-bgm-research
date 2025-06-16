#!/usr/bin/env node

/**
 * BGMチャンネル収集スクリプト
 * YouTube APIを使って新しいBGMチャンネルを検索・収集し、Firestoreに保存
 */

import dotenv from 'dotenv';
import {
  searchVideos,
  getChannelDetails,
  getChannelFirstVideo,
  getChannelLatestVideo,
  extractChannelIds
} from './youtube-api.js';
import { getRandomKeywords, getRotatingKeywords, getRotatingKeywordsFromSettings } from './keywords.js';
import { filterChannels } from './channel-filter.js';
import { saveChannels, getChannelStats, getExistingChannelIds } from './firestore-service.js';

dotenv.config();

// 収集設定
const COLLECTION_CONFIG = {
  keywordCount: 12,         // 使用するキーワード数（増加）
  videosPerKeyword: 50,     // キーワードあたりの動画検索数（増加）
  monthsThreshold: 3,       // 何ヶ月以内のチャンネルを対象とするか
  minSubscribers: 500,      // 最小登録者数（緩和）
  maxSubscribers: 500000,   // 最大登録者数
  minVideos: 3,             // 最小動画数（緩和）
  minGrowthRate: 5,         // 最小成長率（緩和）
  maxChannelsPerRun: 200,   // 1回の実行で処理する最大チャンネル数（増加）
  targetNewChannels: 10,    // 目標新規チャンネル数
};

/**
 * メイン収集処理
 */
async function main() {
  console.log('🎵 BGM Channel Collection Started');
  console.log('=====================================');
  
  try {
    // 1. 既存チャンネルIDを取得（重複回避のため）
    const existingChannelIds = await getExistingChannelIds();
    
    // 2. キーワード選択（設定から取得、フォールバックあり）
    const keywords = await getRotatingKeywordsFromSettings(COLLECTION_CONFIG.keywordCount);
    console.log(`📝 Selected keywords (from settings): ${keywords.join(', ')}`);

    // 3. 動的な検索期間を設定（既存チャンネル数に応じて調整）
    const searchPeriodMonths = existingChannelIds.size > 10 ? 
      COLLECTION_CONFIG.monthsThreshold + 2 : // 既存チャンネルが多い場合は期間を延長
      COLLECTION_CONFIG.monthsThreshold;
    
    console.log(`📅 Search period: ${searchPeriodMonths} months (adjusted based on ${existingChannelIds.size} existing channels)`);

    // 4. 動画検索とチャンネルID収集
    const allChannelIds = new Set();
    
    for (const keyword of keywords) {
      console.log(`\n🔍 Searching videos for: "${keyword}"`);
      
      // 動的な期間で動画を検索
      const searchStartDate = new Date();
      searchStartDate.setMonth(searchStartDate.getMonth() - searchPeriodMonths);
      
      const videos = await searchVideos(
        keyword, 
        COLLECTION_CONFIG.videosPerKeyword,
        searchStartDate.toISOString()
      );
      
      const channelIds = extractChannelIds(videos);
      
      // 既存チャンネルを除外
      const newChannelIds = new Set();
      channelIds.forEach(id => {
        if (!existingChannelIds.has(id)) {
          newChannelIds.add(id);
        }
      });
      
      console.log(`   Found ${channelIds.size} channels (${newChannelIds.size} new, ${channelIds.size - newChannelIds.size} existing)`);
      
      // 新しいチャンネルIDのみを統合
      newChannelIds.forEach(id => allChannelIds.add(id));
      
      // API制限対策の待機
      await sleep(1000);
    }

    console.log(`\n📊 Total new channels to process: ${allChannelIds.size}`);

    // 3. チャンネル詳細情報の取得
    const channelsWithDetails = [];
    const channelArray = Array.from(allChannelIds).slice(0, COLLECTION_CONFIG.maxChannelsPerRun);
    
    console.log(`\n🔍 Fetching details for ${channelArray.length} channels...`);
    
    for (let i = 0; i < channelArray.length; i++) {
      const channelId = channelArray[i];
      
      try {
        // チャンネル基本情報を取得
        const channelDetails = await getChannelDetails(channelId);
        if (!channelDetails) {
          console.log(`   ⚠️ No details found for channel: ${channelId}`);
          continue;
        }

        // 最初の動画と最新動画を取得
        const firstVideo = await getChannelFirstVideo(channelId);
        const latestVideo = await getChannelLatestVideo(channelDetails.uploadsPlaylistId);

        channelsWithDetails.push({
          channel: { ...channelDetails, latestVideo },
          firstVideo
        });

        // 進捗表示
        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${channelArray.length} channels processed`);
        }

        // API制限対策の待機
        await sleep(500);
        
      } catch (error) {
        console.error(`   ❌ Error processing channel ${channelId}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully fetched details for ${channelsWithDetails.length} channels`);

    // 4. チャンネルフィルタリング
    console.log('\n🔍 Filtering channels...');
    const filteredChannels = filterChannels(channelsWithDetails, {
      monthsThreshold: COLLECTION_CONFIG.monthsThreshold,
      minSubscribers: COLLECTION_CONFIG.minSubscribers,
      maxSubscribers: COLLECTION_CONFIG.maxSubscribers,
      minVideos: COLLECTION_CONFIG.minVideos,
      minGrowthRate: COLLECTION_CONFIG.minGrowthRate
    });

    console.log(`\n✨ ${filteredChannels.length} channels passed filtering`);

    if (filteredChannels.length === 0) {
      console.log('❌ No channels met the criteria. Try adjusting filter settings.');
      return;
    }

    // 5. Firestoreに保存
    const saveResults = await saveChannels(filteredChannels);

    // 6. 結果サマリー
    console.log('\n🎯 Collection Summary:');
    console.log('======================');
    console.log(`Keywords used: ${keywords.length}`);
    console.log(`Channels found: ${allChannelIds.size}`);
    console.log(`Channels processed: ${channelsWithDetails.length}`);
    console.log(`Channels filtered: ${filteredChannels.length}`);
    console.log(`Channels saved: ${saveResults.saved}`);
    console.log(`Channels skipped: ${saveResults.skipped}`);
    console.log(`Errors: ${saveResults.errors}`);

    // 7. 保存したチャンネルの詳細
    if (filteredChannels.length > 0) {
      console.log('\n🎵 Newly Found BGM Channels:');
      console.log('=============================');
      
      filteredChannels
        .sort((a, b) => b.growthRate - a.growthRate)
        .slice(0, 10)
        .forEach((channel, index) => {
          console.log(`${index + 1}. ${channel.channelTitle}`);
          console.log(`   📊 ${channel.subscriberCount.toLocaleString()} subscribers | Growth: ${channel.growthRate}%`);
          console.log(`   🔗 ${channel.channelUrl}`);
          console.log(`   🏷️ Tags: ${channel.keywords.slice(0, 3).join(', ')}`);
          console.log('');
        });
    }

    // 8. 全体統計
    const stats = await getChannelStats();
    if (stats) {
      console.log('\n📈 Database Statistics:');
      console.log('=======================');
      console.log(`Total channels: ${stats.totalChannels}`);
      console.log(`Average subscribers: ${stats.averageSubscribers.toLocaleString()}`);
      console.log(`Average growth rate: ${stats.averageGrowthRate}%`);
      if (stats.topChannel) {
        console.log(`Top performer: ${stats.topChannel.channelTitle} (${stats.topChannel.subscriberCount.toLocaleString()} subscribers)`);
      }
    }

    console.log('\n✅ Collection completed successfully!');

  } catch (error) {
    console.error('❌ Collection failed:', error);
    process.exit(1);
  }
}

/**
 * 待機関数
 * @param {number} ms - 待機時間（ミリ秒）
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * エラーハンドリング
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// スクリプトの実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}