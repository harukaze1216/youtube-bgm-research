#!/usr/bin/env node

/**
 * スマートBGMチャンネル収集スクリプト
 * APIクォータを考慮した効率的な収集を実行
 */

import dotenv from 'dotenv';
import {
  displayQuotaStatus,
  recommendCollectionParams,
  checkQuotaAvailable,
  recordApiUsage,
  getQuotaResetTime
} from './quota-monitor.js';
import {
  searchVideos,
  getChannelDetails,
  getChannelFirstVideo,
  getChannelLatestVideo,
  extractChannelIds
} from './youtube-api.js';
import { getHighPriorityKeywords } from './keywords.js';
import { filterChannels } from './channel-filter.js';
import { saveChannels, getChannelStats, getExistingChannelIds } from './firestore-service.js';

dotenv.config();

/**
 * スマート収集メイン処理
 */
async function smartCollection() {
  console.log('🧠 Smart BGM Channel Collection Started');
  console.log('========================================');
  
  // 1. クォータ状況確認
  displayQuotaStatus();
  const resetInfo = getQuotaResetTime();
  
  if (!resetInfo.canRunToday) {
    console.log('\\n⏰ Quota reset scheduled soon. Skipping collection to avoid quota exhaustion.');
    console.log(`Next collection window: ${resetInfo.resetTime}`);
    return;
  }
  
  // 2. 推奨パラメータ取得
  const params = recommendCollectionParams();
  console.log(`\\n🎯 ${params.message}`);
  console.log(`Estimated cost: ${params.estimatedCost} units`);
  console.log(`Keywords: ${params.keywordCount}, Videos/keyword: ${params.videosPerKeyword}`);
  
  if (params.keywordCount === 0) {
    console.log('\\n❌ Insufficient quota for collection. Please wait for quota reset.');
    return;
  }
  
  // 3. 実行確認
  if (!checkQuotaAvailable(params.estimatedCost)) {
    console.log('\\n❌ Cannot proceed with collection due to quota constraints.');
    return;
  }
  
  try {
    // 4. 既存チャンネル取得
    const existingChannelIds = await getExistingChannelIds();
    console.log(`\\n📊 Current database: ${existingChannelIds.size} channels`);
    
    // 5. 日次ローテーションキーワード選択
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const allPriorityKeywords = getHighPriorityKeywords(50);
    const startIndex = (dayOfYear * 2) % allPriorityKeywords.length;
    
    const selectedKeywords = [];
    for (let i = 0; i < params.keywordCount; i++) {
      const index = (startIndex + i) % allPriorityKeywords.length;
      selectedKeywords.push(allPriorityKeywords[index]);
    }
    
    console.log(`\\n🔄 Daily rotation (day ${dayOfYear}): ${selectedKeywords.join(', ')}`);
    
    // 6. チャンネル収集
    const allChannelIds = new Set();
    let searchCount = 0;
    
    for (const keyword of selectedKeywords) {
      // クォータチェック
      if (!checkQuotaAvailable(100)) {
        console.log(`\\n⚠️ Stopping search early due to quota constraints`);
        break;
      }
      
      console.log(`\\n🔍 Searching: "${keyword}"`);
      
      try {
        const searchStartDate = new Date();
        searchStartDate.setMonth(searchStartDate.getMonth() - 6);
        
        const videos = await searchVideos(keyword, params.videosPerKeyword, searchStartDate.toISOString());
        recordApiUsage('search');
        searchCount++;
        
        const channelIds = extractChannelIds(videos);
        let newCount = 0;
        
        channelIds.forEach(id => {
          if (!existingChannelIds.has(id) && !allChannelIds.has(id)) {
            allChannelIds.add(id);
            newCount++;
          }
        });
        
        console.log(`   Found ${channelIds.size} channels (${newCount} new)`);
        
        // 適切な待機時間
        await sleep(1000);
        
      } catch (error) {
        console.error(`   ❌ Error searching "${keyword}":`, error.message);
        if (error.message.includes('quota')) {
          console.log('   ⚠️ Hit quota limit, stopping search');
          break;
        }
      }
    }
    
    console.log(`\\n📊 Collection summary:`);
    console.log(`Searches performed: ${searchCount}/${selectedKeywords.length}`);
    console.log(`Unique new channels found: ${allChannelIds.size}`);
    
    if (allChannelIds.size === 0) {
      console.log('\\n✅ No new channels found. Collection completed.');
      displayQuotaStatus();
      return;
    }
    
    // 7. チャンネル詳細取得（クォータ効率考慮）
    const channelsToProcess = Math.min(allChannelIds.size, params.maxChannelsPerRun);
    const channelArray = Array.from(allChannelIds).slice(0, channelsToProcess);
    
    console.log(`\\n🔍 Processing ${channelsToProcess} channels...`);
    
    const channelsWithDetails = [];
    let processedCount = 0;
    
    for (const channelId of channelArray) {
      // クォータチェック（チャンネル詳細3units必要）
      if (!checkQuotaAvailable(3)) {
        console.log(`\\n⚠️ Stopping channel processing due to quota constraints`);
        break;
      }
      
      try {
        const channelDetails = await getChannelDetails(channelId);
        recordApiUsage('channels');
        
        if (!channelDetails) {
          continue;
        }
        
        const firstVideo = await getChannelFirstVideo(channelId);
        recordApiUsage('playlistItems');
        
        const latestVideo = await getChannelLatestVideo(channelDetails.uploadsPlaylistId);
        recordApiUsage('playlistItems');
        
        channelsWithDetails.push({
          channel: { ...channelDetails, latestVideo },
          firstVideo
        });
        
        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`   Progress: ${processedCount}/${channelsToProcess} channels`);
        }
        
        await sleep(300);
        
      } catch (error) {
        console.error(`   ❌ Error processing ${channelId}:`, error.message);
        if (error.message.includes('quota')) {
          console.log('   ⚠️ Hit quota limit, stopping processing');
          break;
        }
      }
    }
    
    console.log(`\\n✅ Processed ${channelsWithDetails.length} channels`);
    
    // 8. フィルタリング
    const filteredChannels = filterChannels(channelsWithDetails, {
      monthsThreshold: 3,
      minSubscribers: 500,
      maxSubscribers: 1000,
      minVideos: 2,
      minGrowthRate: 3
    });
    
    console.log(`\\n✨ ${filteredChannels.length} channels passed filtering`);
    
    // 9. 保存
    if (filteredChannels.length > 0) {
      const saveResults = await saveChannels(filteredChannels);
      
      console.log('\\n🎯 Smart Collection Results:');
      console.log('=============================');
      console.log(`Channels found: ${allChannelIds.size}`);
      console.log(`Channels processed: ${channelsWithDetails.length}`);
      console.log(`Channels saved: ${saveResults.saved}`);
      console.log(`Channels skipped: ${saveResults.skipped}`);
    } else {
      console.log('\\n📝 No channels met the criteria.');
    }
    
    // 10. 最終クォータ状況
    console.log('\\n📊 Final quota status:');
    displayQuotaStatus();
    
    // 11. 統計更新
    const stats = await getChannelStats();
    if (stats) {
      console.log('\\n📈 Database Statistics:');
      console.log(`Total channels: ${stats.totalChannels}`);
      console.log(`Average subscribers: ${stats.averageSubscribers.toLocaleString()}`);
    }
    
    console.log('\\n✅ Smart collection completed successfully!');
    
  } catch (error) {
    console.error('❌ Smart collection failed:', error);
    displayQuotaStatus();
    process.exit(1);
  }
}

/**
 * 待機関数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  smartCollection();
}