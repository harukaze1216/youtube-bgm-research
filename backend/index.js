#!/usr/bin/env node

/**
 * BGM Channel Research Backend
 * メインエントリーポイント
 */

import dotenv from 'dotenv';
import { getChannels, getChannelStats, searchChannels } from './firestore-service.js';

dotenv.config();

/**
 * コマンドライン引数の処理
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const options = {};
  
  // オプション解析
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
      options[key] = isNaN(value) ? value : Number(value);
    }
  }
  
  return { command, options };
}

/**
 * ヘルプメッセージ
 */
function showHelp() {
  console.log(`
🎵 BGM Channel Research Backend
===============================

Available commands:

  collect                    Run channel collection
  list [--limit N]          List saved channels
  stats                     Show database statistics
  search [--options]        Search channels with filters
  help                      Show this help message

Search options:
  --minSubscribers N        Minimum subscriber count
  --maxSubscribers N        Maximum subscriber count
  --minGrowthRate N         Minimum growth rate
  --limit N                 Maximum results
  --orderBy field           Sort by field (subscriberCount, growthRate, etc.)
  --orderDirection dir      Sort direction (asc, desc)

Examples:
  npm start list --limit 10
  npm start search --minSubscribers 5000 --orderBy growthRate
  npm run collect
`);
}

/**
 * チャンネル一覧表示
 */
async function listChannels(options = {}) {
  try {
    const limit = options.limit || 20;
    console.log(`📋 Fetching ${limit} channels...`);
    
    const channels = await getChannels(limit);
    
    if (channels.length === 0) {
      console.log('❌ No channels found in database.');
      return;
    }
    
    console.log(`\n🎵 BGM Channels (${channels.length} results):`);
    console.log('='.repeat(50));
    
    channels.forEach((channel, index) => {
      console.log(`${index + 1}. ${channel.channelTitle}`);
      console.log(`   📊 ${channel.subscriberCount?.toLocaleString() || 0} subscribers | Growth: ${channel.growthRate || 0}%`);
      console.log(`   📅 Added: ${channel.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}`);
      console.log(`   🔗 ${channel.channelUrl}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing channels:', error);
  }
}

/**
 * 統計情報表示
 */
async function showStats() {
  try {
    console.log('📊 Fetching database statistics...');
    
    const stats = await getChannelStats();
    
    if (!stats) {
      console.log('❌ Could not fetch statistics.');
      return;
    }
    
    console.log('\n📈 Database Statistics:');
    console.log('='.repeat(30));
    console.log(`Total channels: ${stats.totalChannels}`);
    console.log(`Average subscribers: ${stats.averageSubscribers.toLocaleString()}`);
    console.log(`Average growth rate: ${stats.averageGrowthRate}%`);
    
    if (stats.topChannel) {
      console.log(`\n🏆 Top Performer:`);
      console.log(`   ${stats.topChannel.channelTitle}`);
      console.log(`   📊 ${stats.topChannel.subscriberCount.toLocaleString()} subscribers`);
      console.log(`   📈 ${stats.topChannel.growthRate}% growth rate`);
      console.log(`   🔗 ${stats.topChannel.channelUrl}`);
    }
    
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
  }
}

/**
 * チャンネル検索
 */
async function searchChannelsCommand(options = {}) {
  try {
    console.log('🔍 Searching channels with filters...');
    console.log('Filters:', options);
    
    const channels = await searchChannels(options);
    
    if (channels.length === 0) {
      console.log('❌ No channels found matching the criteria.');
      return;
    }
    
    console.log(`\n🎯 Search Results (${channels.length} channels):`);
    console.log('='.repeat(50));
    
    channels.forEach((channel, index) => {
      console.log(`${index + 1}. ${channel.channelTitle}`);
      console.log(`   📊 ${channel.subscriberCount?.toLocaleString() || 0} subscribers | Growth: ${channel.growthRate || 0}%`);
      console.log(`   🏷️ Tags: ${channel.keywords?.slice(0, 3).join(', ') || 'None'}`);
      console.log(`   📅 Added: ${channel.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}`);
      console.log(`   🔗 ${channel.channelUrl}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error searching channels:', error);
  }
}

/**
 * チャンネル収集の実行
 */
async function runCollection() {
  try {
    console.log('🚀 Starting channel collection...');
    
    // 別プロセスで収集スクリプトを実行
    const { spawn } = await import('child_process');
    
    const collectProcess = spawn('node', ['collect-channels.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    collectProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Collection completed successfully');
      } else {
        console.log(`❌ Collection failed with code ${code}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error running collection:', error);
  }
}

/**
 * メイン関数
 */
async function main() {
  const { command, options } = parseArgs();
  
  console.log('🎵 BGM Channel Research Backend');
  console.log(`Command: ${command}`);
  
  switch (command) {
    case 'collect':
      await runCollection();
      break;
      
    case 'list':
      await listChannels(options);
      break;
      
    case 'stats':
      await showStats();
      break;
      
    case 'search':
      await searchChannelsCommand(options);
      break;
      
    case 'help':
    default:
      showHelp();
      break;
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// スクリプトの実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}