#!/usr/bin/env node

/**
 * 拡張チャンネル収集スクリプト
 * 複数の手法を組み合わせてより多くのBGMチャンネルを発見
 */

import dotenv from 'dotenv';
import {
  searchVideos,
  getChannelDetails,
  getChannelFirstVideo,
  getChannelLatestVideo,
  extractChannelIds,
  getRelatedChannels,
  searchChannelsByKeyword
} from './youtube-api.js';
import { getAllKeywords, getHighPriorityKeywords } from './keywords.js';
import { filterChannels } from './channel-filter.js';
import { saveChannels, getExistingChannelIds } from './firestore-service.js';

dotenv.config();

// 拡張収集設定
const ENHANCED_CONFIG = {
  // 基本設定
  keywordCount: 30,           // より多くのキーワードを使用
  videosPerKeyword: 50,       // キーワードあたりの動画検索数
  monthsThreshold: 12,        // 1年間のチャンネルを対象
  
  // 条件緩和
  minSubscribers: 50,         // 最小登録者数をさらに緩和
  maxSubscribers: 2000000,    // 最大登録者数を拡大
  minVideos: 1,               // 最小動画数を大幅緩和
  minGrowthRate: 1,           // 最小成長率を大幅緩和
  
  // 処理量設定
  maxChannelsPerRun: 1000,    // 処理チャンネル数を大幅増加
  targetNewChannels: 100,     // 目標新規チャンネル数を増加
  
  // 新機能
  useRelatedChannels: true,   // 関連チャンネル検索を有効化
  useChannelSearch: true,     // チャンネル名検索を有効化
  usePlaylistSearch: true,    // プレイリスト検索を有効化
};

/**
 * 拡張チャンネル収集メイン処理
 */
async function enhancedChannelCollection() {
  console.log('🚀 Enhanced BGM Channel Collection Started');
  console.log('==========================================');
  
  try {
    // 1. 既存チャンネルIDを取得
    const existingChannelIds = await getExistingChannelIds();
    console.log(`📊 Current database: ${existingChannelIds.size} channels`);
    
    // 2. 優先度の高いキーワードを取得
    const priorityKeywords = getHighPriorityKeywords(ENHANCED_CONFIG.keywordCount);
    const allKeywords = getAllKeywords();
    console.log(`📝 Using ${priorityKeywords.length} priority keywords from ${allKeywords.length} available keywords`);
    console.log(`🎯 Priority keywords: ${priorityKeywords.slice(0, 10).join(', ')}...`);
    
    // 3. チャンネルID収集用のセット
    const allChannelIds = new Set();
    
    // 手法1: 従来の動画検索（優先キーワード使用）
    console.log('\\n🔍 Method 1: Video Search');
    await collectFromVideoSearch(priorityKeywords, allChannelIds, existingChannelIds);
    
    // 手法2: チャンネル名直接検索
    if (ENHANCED_CONFIG.useChannelSearch) {
      console.log('\\n🔍 Method 2: Channel Name Search');
      await collectFromChannelSearch(priorityKeywords, allChannelIds, existingChannelIds);
    }
    
    // 手法3: 関連チャンネル探索
    if (ENHANCED_CONFIG.useRelatedChannels) {
      console.log('\\n🔍 Method 3: Related Channels');
      await collectFromRelatedChannels(existingChannelIds, allChannelIds);
    }
    
    // 手法4: プレイリスト検索
    if (ENHANCED_CONFIG.usePlaylistSearch) {
      console.log('\\n🔍 Method 4: Playlist Search');
      await collectFromPlaylistSearch(priorityKeywords, allChannelIds, existingChannelIds);
    }
    
    console.log(`\\n📊 Total unique new channels found: ${allChannelIds.size}`);
    
    // 4. チャンネル詳細情報の取得
    const channelsWithDetails = await fetchChannelDetails(Array.from(allChannelIds));
    
    // 5. フィルタリング
    const filteredChannels = filterChannels(channelsWithDetails, {
      monthsThreshold: ENHANCED_CONFIG.monthsThreshold,
      minSubscribers: ENHANCED_CONFIG.minSubscribers,
      maxSubscribers: ENHANCED_CONFIG.maxSubscribers,
      minVideos: ENHANCED_CONFIG.minVideos,
      minGrowthRate: ENHANCED_CONFIG.minGrowthRate
    });
    
    // 6. 保存
    const saveResults = await saveChannels(filteredChannels);
    
    // 7. 結果レポート
    printCollectionReport(allChannelIds.size, channelsWithDetails.length, filteredChannels.length, saveResults);
    
  } catch (error) {
    console.error('❌ Enhanced collection failed:', error);
    process.exit(1);
  }
}

/**
 * 手法1: 動画検索からチャンネルを収集
 */
async function collectFromVideoSearch(keywords, channelIds, existingIds) {
  const selectedKeywords = keywords.slice(0, ENHANCED_CONFIG.keywordCount);
  
  for (const keyword of selectedKeywords) {
    try {
      console.log(`   Searching videos for: "${keyword}"`);
      
      const searchStartDate = new Date();
      searchStartDate.setMonth(searchStartDate.getMonth() - ENHANCED_CONFIG.monthsThreshold);
      
      const videos = await searchVideos(keyword, ENHANCED_CONFIG.videosPerKeyword, searchStartDate.toISOString());
      const foundChannelIds = extractChannelIds(videos);
      
      let newCount = 0;
      foundChannelIds.forEach(id => {
        if (!existingIds.has(id) && !channelIds.has(id)) {
          channelIds.add(id);
          newCount++;
        }
      });
      
      console.log(`   Found ${foundChannelIds.size} channels (${newCount} new)`);
      await sleep(1000);
      
    } catch (error) {
      console.error(`   Error searching for "${keyword}":`, error.message);
    }
  }
}

/**
 * 手法2: チャンネル名直接検索
 */
async function collectFromChannelSearch(keywords, channelIds, existingIds) {
  // BGM関連のチャンネル名パターン
  const channelNamePatterns = [
    'BGM Channel',
    'Lofi Music',
    'Chill Beats',
    'Study Music',
    'Relaxing Music',
    'Ambient Sounds',
    'ヒーリングミュージック',
    '作業用BGM',
    'カフェミュージック'
  ];
  
  for (const pattern of channelNamePatterns) {
    try {
      console.log(`   Searching channels for: "${pattern}"`);
      
      // YouTube APIのチャンネル検索を使用（実装が必要）
      const foundChannels = await searchChannelsByKeyword(pattern);
      
      let newCount = 0;
      foundChannels.forEach(channelId => {
        if (!existingIds.has(channelId) && !channelIds.has(channelId)) {
          channelIds.add(channelId);
          newCount++;
        }
      });
      
      console.log(`   Found ${foundChannels.length} channels (${newCount} new)`);
      await sleep(1000);
      
    } catch (error) {
      console.error(`   Error searching channels for "${pattern}":`, error.message);
    }
  }
}

/**
 * 手法3: 関連チャンネル探索
 */
async function collectFromRelatedChannels(existingIds, channelIds) {
  // 既存のBGMチャンネルから関連チャンネルを探索
  const sampleChannels = Array.from(existingIds).slice(0, 20); // サンプルとして20チャンネルを使用
  
  for (const channelId of sampleChannels) {
    try {
      console.log(`   Exploring related channels for: ${channelId}`);
      
      const relatedChannels = await getRelatedChannels(channelId);
      
      let newCount = 0;
      relatedChannels.forEach(id => {
        if (!existingIds.has(id) && !channelIds.has(id)) {
          channelIds.add(id);
          newCount++;
        }
      });
      
      console.log(`   Found ${relatedChannels.length} related channels (${newCount} new)`);
      await sleep(2000); // 関連チャンネル検索は重いので長めの待機
      
    } catch (error) {
      console.error(`   Error getting related channels for ${channelId}:`, error.message);
    }
  }
}

/**
 * 手法4: プレイリスト検索
 */
async function collectFromPlaylistSearch(keywords, channelIds, existingIds) {
  const playlistKeywords = [
    'chill playlist',
    'study playlist',
    'lofi playlist',
    'BGMプレイリスト',
    '作業用プレイリスト'
  ];
  
  for (const keyword of playlistKeywords) {
    try {
      console.log(`   Searching playlists for: "${keyword}"`);
      
      // プレイリスト検索からチャンネルを抽出（実装が必要）
      const playlistChannels = await searchPlaylistChannels(keyword);
      
      let newCount = 0;
      playlistChannels.forEach(channelId => {
        if (!existingIds.has(channelId) && !channelIds.has(channelId)) {
          channelIds.add(channelId);
          newCount++;
        }
      });
      
      console.log(`   Found ${playlistChannels.length} playlist channels (${newCount} new)`);
      await sleep(1000);
      
    } catch (error) {
      console.error(`   Error searching playlists for "${keyword}":`, error.message);
    }
  }
}

/**
 * チャンネル詳細情報を取得
 */
async function fetchChannelDetails(channelIds) {
  const channelsWithDetails = [];
  const maxChannels = Math.min(channelIds.length, ENHANCED_CONFIG.maxChannelsPerRun);
  
  console.log(`\\n🔍 Fetching details for ${maxChannels} channels...`);
  
  for (let i = 0; i < maxChannels; i++) {
    const channelId = channelIds[i];
    
    try {
      const channelDetails = await getChannelDetails(channelId);
      if (!channelDetails) continue;
      
      const firstVideo = await getChannelFirstVideo(channelId);
      const latestVideo = await getChannelLatestVideo(channelDetails.uploadsPlaylistId);
      
      channelsWithDetails.push({
        channel: { ...channelDetails, latestVideo },
        firstVideo
      });
      
      if ((i + 1) % 50 === 0) {
        console.log(`   Progress: ${i + 1}/${maxChannels} channels processed`);
      }
      
      await sleep(300);
      
    } catch (error) {
      console.error(`   ❌ Error processing channel ${channelId}:`, error.message);
    }
  }
  
  return channelsWithDetails;
}

/**
 * 結果レポート出力
 */
function printCollectionReport(totalFound, processed, filtered, saveResults) {
  console.log('\\n🎯 Enhanced Collection Report:');
  console.log('================================');
  console.log(`Total channels discovered: ${totalFound}`);
  console.log(`Channels processed: ${processed}`);
  console.log(`Channels passed filtering: ${filtered}`);
  console.log(`Channels saved: ${saveResults.saved}`);
  console.log(`Channels skipped (existing): ${saveResults.skipped}`);
  console.log(`Errors: ${saveResults.errors}`);
  
  if (filtered > 0) {
    console.log(`\\n🎵 Collection efficiency: ${((saveResults.saved / totalFound) * 100).toFixed(1)}%`);
  }
}

/**
 * 待機関数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// プレイリスト検索の実装（スタブ）
async function searchPlaylistChannels(keyword) {
  // TODO: プレイリスト検索の実装
  return [];
}

// スクリプトの実行
if (import.meta.url === `file://${process.argv[1]}`) {
  enhancedChannelCollection();
}