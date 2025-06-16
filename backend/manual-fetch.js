#!/usr/bin/env node

/**
 * 手動データ取得スクリプト
 * 個別のチャンネルデータを手動で取得・更新するためのコマンドラインツール
 */

import dotenv from 'dotenv';
import { 
  getChannelDetails, 
  getChannelFirstVideo, 
  getChannelLatestVideo 
} from './youtube-api.js';
import { filterChannel } from './channel-filter.js';
import { 
  saveChannels, 
  updateChannelStatus, 
  bulkUpdateChannelStatus, 
  getChannelsByStatus, 
  getStatusStatistics 
} from './firestore-service.js';

dotenv.config();

/**
 * 使用方法を表示
 */
function showUsage() {
  console.log(`
🎵 YouTube BGM チャンネル手動データ取得ツール
================================================

使用方法:
  node manual-fetch.js <command> <options>

コマンド:
  channel <channelId>           - 指定チャンネルの詳細情報を取得・保存
  details <channelId>           - チャンネル詳細のみ表示（保存なし）
  latest <channelId>            - 最新動画情報を取得
  popular <channelId>           - 最も人気の動画を取得
  first <channelId>             - 最初の動画情報を取得
  update <channelId>            - 既存チャンネルの統計を更新
  validate <channelId>          - チャンネルがBGMフィルターを通過するかチェック
  list [status]                 - データベース内のチャンネル一覧を表示
  remove <channelId>            - データベースからチャンネルを削除
  
  【ステータス管理】
  track <channelId>             - チャンネルをトラッキング対象に設定
  untrack <channelId>           - チャンネルをトラッキング対象外に設定
  reject <channelId> [reason]   - チャンネルを除外対象に設定
  approve <channelId>           - チャンネルを承認（トラッキング対象外に設定）
  stats                         - ステータス別統計を表示
  bulk-track <file>             - ファイルからチャンネルIDを読み込んで一括トラッキング
  bulk-reject <file> [reason]   - ファイルからチャンネルIDを読み込んで一括除外

例:
  node manual-fetch.js channel UCxxxxxxxxxxxxxxxxxxxxx
  node manual-fetch.js details UCxxxxxxxxxxxxxxxxxxxxx
  node manual-fetch.js latest UCxxxxxxxxxxxxxxxxxxxxx
  node manual-fetch.js popular UCxxxxxxxxxxxxxxxxxxxxx
  node manual-fetch.js update UCxxxxxxxxxxxxxxxxxxxxx
  node manual-fetch.js remove UCxxxxxxxxxxxxxxxxxxxxx
  node manual-fetch.js list
  node manual-fetch.js list tracking
  node manual-fetch.js track UCxxxxxxxxxxxxxxxxxxxxx
  node manual-fetch.js reject UCxxxxxxxxxxxxxxxxxxxxx "音楽以外のコンテンツ"
  node manual-fetch.js stats
  node manual-fetch.js bulk-track channel_ids.txt

オプション:
  --save                        - 結果をFirestoreに保存（detailsコマンドで使用）
  --force                       - フィルターを無視して強制保存
  --verbose                     - 詳細ログを表示
`);
}

/**
 * チャンネル詳細情報を取得・表示
 */
async function fetchChannelDetails(channelId, options = {}) {
  try {
    console.log(`📋 チャンネル詳細を取得中: ${channelId}`);
    
    const channelData = await getChannelDetails(channelId);
    if (!channelData) {
      console.log('❌ チャンネルが見つかりません');
      return null;
    }

    console.log(`\n✅ チャンネル情報:`);
    console.log(`📺 タイトル: ${channelData.channelTitle}`);
    console.log(`👥 登録者数: ${channelData.subscriberCount.toLocaleString()}`);
    console.log(`🎥 動画数: ${channelData.videoCount.toLocaleString()}`);
    console.log(`👁️ 総再生回数: ${channelData.totalViews.toLocaleString()}`);
    console.log(`📅 開設日: ${new Date(channelData.publishedAt).toLocaleDateString('ja-JP')}`);
    console.log(`🔗 URL: ${channelData.channelUrl}`);
    
    if (channelData.description) {
      console.log(`📝 説明: ${channelData.description.substring(0, 100)}...`);
    }

    return channelData;
  } catch (error) {
    console.error('❌ チャンネル詳細取得エラー:', error.message);
    return null;
  }
}

/**
 * 最新動画を取得
 */
async function fetchLatestVideo(channelId) {
  try {
    console.log(`📺 最新動画を取得中: ${channelId}`);
    
    const channelData = await getChannelDetails(channelId);
    if (!channelData) {
      console.log('❌ チャンネルが見つかりません');
      return;
    }

    const latestVideo = await getChannelLatestVideo(channelData.uploadsPlaylistId);
    if (!latestVideo) {
      console.log('❌ 最新動画が見つかりません');
      return;
    }

    console.log(`\n✅ 最新動画:`);
    console.log(`🎬 タイトル: ${latestVideo.title}`);
    console.log(`📅 投稿日: ${new Date(latestVideo.publishedAt).toLocaleDateString('ja-JP')}`);
    console.log(`🔗 URL: https://www.youtube.com/watch?v=${latestVideo.videoId}`);
    
  } catch (error) {
    console.error('❌ 最新動画取得エラー:', error.message);
  }
}

/**
 * 最も人気の動画を取得（簡易版）
 */
async function fetchPopularVideo(channelId) {
  try {
    console.log(`🔥 最も人気の動画を取得中: ${channelId}`);
    console.log(`💡 この機能は開発中です。フロントエンドで利用可能です。`);
    console.log(`🔗 チャンネルURL: https://www.youtube.com/channel/${channelId}/videos?sort=p`);
    
  } catch (error) {
    console.error('❌ 人気動画取得エラー:', error.message);
  }
}

/**
 * 最初の動画を取得
 */
async function fetchFirstVideo(channelId) {
  try {
    console.log(`🥇 最初の動画を取得中: ${channelId}`);
    
    const channelData = await getChannelDetails(channelId);
    if (!channelData) {
      console.log('❌ チャンネルが見つかりません');
      return;
    }

    const firstVideo = await getChannelFirstVideo(channelData.uploadsPlaylistId);
    if (!firstVideo) {
      console.log('❌ 最初の動画が見つかりません');
      return;
    }

    console.log(`\n✅ 最初の動画:`);
    console.log(`🎬 タイトル: ${firstVideo.title}`);
    console.log(`📅 投稿日: ${new Date(firstVideo.publishedAt).toLocaleDateString('ja-JP')}`);
    console.log(`🔗 URL: https://www.youtube.com/watch?v=${firstVideo.videoId}`);
    
  } catch (error) {
    console.error('❌ 最初の動画取得エラー:', error.message);
  }
}

/**
 * 完全なチャンネル情報を取得・保存
 */
async function fetchAndSaveChannel(channelId, options = {}) {
  try {
    console.log(`🎵 チャンネル情報を取得・保存中: ${channelId}`);
    
    // チャンネル基本情報
    const channelData = await getChannelDetails(channelId);
    if (!channelData) {
      console.log('❌ チャンネルが見つかりません');
      return;
    }

    // 最初の動画
    const firstVideo = await getChannelFirstVideo(channelData.uploadsPlaylistId);
    
    // フィルタリング（強制保存でない場合）
    if (!options.force) {
      const filteredChannel = filterChannel(channelData, firstVideo);
      if (!filteredChannel) {
        console.log('❌ チャンネルがフィルター条件を満たしません');
        console.log('   --force オプションで強制保存できます');
        return;
      }
    }

    // データ構築
    const channelWithDetails = {
      channel: channelData,
      firstVideo: firstVideo
    };

    // 保存
    const result = await saveChannels([channelWithDetails]);
    
    console.log(`\n✅ 保存結果:`);
    console.log(`📊 保存済み: ${result.saved}`);
    console.log(`⏭️ スキップ: ${result.skipped}`);
    console.log(`❌ エラー: ${result.errors}`);
    
  } catch (error) {
    console.error('❌ チャンネル取得・保存エラー:', error.message);
  }
}

/**
 * チャンネルフィルター検証
 */
async function validateChannel(channelId) {
  try {
    console.log(`🔍 チャンネルフィルター検証中: ${channelId}`);
    
    const channelData = await getChannelDetails(channelId);
    if (!channelData) {
      console.log('❌ チャンネルが見つかりません');
      return;
    }

    const firstVideo = await getChannelFirstVideo(channelData.uploadsPlaylistId);
    const filteredChannel = filterChannel(channelData, firstVideo);
    
    console.log(`\n📋 フィルター検証結果:`);
    console.log(`チャンネル: ${channelData.channelTitle}`);
    
    if (filteredChannel) {
      console.log(`✅ フィルター通過`);
      console.log(`📊 成長率: ${filteredChannel.growthRate}%`);
      console.log(`🏷️ キーワード: ${filteredChannel.keywords.join(', ')}`);
    } else {
      console.log(`❌ フィルター不通過`);
      console.log(`   理由: BGM関連でない、条件を満たさない、など`);
    }
    
  } catch (error) {
    console.error('❌ フィルター検証エラー:', error.message);
  }
}

/**
 * データベース内チャンネル一覧表示
 */
async function listChannels() {
  try {
    const { getDocs, collection } = await import('firebase/firestore');
    const { db } = await import('./firebase-config.js');
    
    console.log(`📋 データベース内チャンネル一覧:`);
    
    const snapshot = await getDocs(collection(db, 'bgm_channels'));
    
    if (snapshot.empty) {
      console.log('❌ チャンネルが見つかりません');
      return;
    }

    const channels = [];
    snapshot.forEach(doc => {
      channels.push({ id: doc.id, ...doc.data() });
    });

    // 登録者数順でソート
    channels.sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0));

    console.log(`\n📊 総数: ${channels.length} チャンネル\n`);

    channels.forEach((channel, index) => {
      console.log(`${index + 1}. ${channel.channelTitle}`);
      console.log(`   👥 ${(channel.subscriberCount || 0).toLocaleString()} 登録者`);
      console.log(`   📈 成長率: ${channel.growthRate || 0}%`);
      console.log(`   🆔 ${channel.channelId}`);
      console.log(`   📄 Firestore ID: ${channel.id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ チャンネル一覧取得エラー:', error.message);
  }
}

/**
 * ステータス別チャンネル一覧表示
 */
async function listChannelsByStatus(status = 'all') {
  try {
    console.log(`📋 ステータス別チャンネル一覧 (${status}):`);
    
    const channels = await getChannelsByStatus(status, { 
      orderBy: 'subscriberCount', 
      orderDirection: 'desc' 
    });
    
    if (channels.length === 0) {
      console.log(`❌ ステータス "${status}" のチャンネルが見つかりません`);
      return;
    }

    console.log(`\n📊 総数: ${channels.length} チャンネル\n`);

    channels.forEach((channel, index) => {
      const statusEmoji = {
        'tracking': '📊',
        'non-tracking': '📋',
        'rejected': '❌'
      }[channel.status] || '❓';
      
      console.log(`${index + 1}. ${channel.channelTitle}`);
      console.log(`   ${statusEmoji} ステータス: ${channel.status || '未設定'}`);
      console.log(`   👥 ${(channel.subscriberCount || 0).toLocaleString()} 登録者`);
      console.log(`   📈 成長率: ${channel.growthRate || 0}%`);
      
      if (channel.status === 'rejected' && channel.rejectionReason) {
        console.log(`   📝 除外理由: ${channel.rejectionReason}`);
      }
      
      if (channel.statusUpdatedAt) {
        console.log(`   🔄 更新日: ${new Date(channel.statusUpdatedAt.toDate()).toLocaleDateString('ja-JP')}`);
      }
      
      console.log(`   🆔 ${channel.channelId}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ ステータス別チャンネル一覧取得エラー:', error.message);
  }
}

// ======== ステータス管理機能 ========

/**
 * チャンネルをトラッキング対象に設定
 */
async function trackChannel(channelId) {
  try {
    console.log(`📊 チャンネルをトラッキング対象に設定中: ${channelId}`);
    
    const result = await updateChannelStatus(channelId, 'tracking');
    if (result) {
      console.log('✅ チャンネルをトラッキング対象に設定しました');
    } else {
      console.log('❌ ステータス更新に失敗しました');
    }
  } catch (error) {
    console.error('❌ トラッキング設定エラー:', error.message);
  }
}

/**
 * チャンネルをトラッキング対象外に設定
 */
async function untrackChannel(channelId) {
  try {
    console.log(`📋 チャンネルをトラッキング対象外に設定中: ${channelId}`);
    
    const result = await updateChannelStatus(channelId, 'non-tracking');
    if (result) {
      console.log('✅ チャンネルをトラッキング対象外に設定しました');
    } else {
      console.log('❌ ステータス更新に失敗しました');
    }
  } catch (error) {
    console.error('❌ トラッキング対象外設定エラー:', error.message);
  }
}

/**
 * チャンネルを除外対象に設定
 */
async function rejectChannel(channelId, reason = null) {
  try {
    console.log(`❌ チャンネルを除外対象に設定中: ${channelId}`);
    if (reason) {
      console.log(`理由: ${reason}`);
    }
    
    const result = await updateChannelStatus(channelId, 'rejected', reason);
    if (result) {
      console.log('✅ チャンネルを除外対象に設定しました');
    } else {
      console.log('❌ ステータス更新に失敗しました');
    }
  } catch (error) {
    console.error('❌ 除外設定エラー:', error.message);
  }
}

/**
 * チャンネルを承認（トラッキング対象外に設定）
 */
async function approveChannel(channelId) {
  try {
    console.log(`✅ チャンネルを承認中: ${channelId}`);
    
    const result = await updateChannelStatus(channelId, 'non-tracking');
    if (result) {
      console.log('✅ チャンネルを承認しました（トラッキング対象外）');
    } else {
      console.log('❌ ステータス更新に失敗しました');
    }
  } catch (error) {
    console.error('❌ 承認エラー:', error.message);
  }
}

/**
 * ステータス統計を表示
 */
async function showStatusStatistics() {
  try {
    console.log('📊 ステータス統計を取得中...');
    
    const stats = await getStatusStatistics();
    
    console.log('\n======== チャンネルステータス統計 ========');
    console.log(`📊 総数: ${stats.total}`);
    console.log(`📊 トラッキング中: ${stats.tracking || 0}`);
    console.log(`📋 トラッキング対象外: ${stats['non-tracking'] || 0}`);
    console.log(`❌ 除外済み: ${stats.rejected || 0}`);
    console.log(`❓ 未設定: ${stats.undefined || 0}`);
    console.log('=====================================\n');
    
  } catch (error) {
    console.error('❌ 統計取得エラー:', error.message);
  }
}

/**
 * ファイルからチャンネルIDを読み込んで一括処理
 */
async function processBulkChannels(filePath, status, reason = null) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ ファイルが見つかりません: ${filePath}`);
      return;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const channelIds = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.startsWith('UC') && line.length === 24);
    
    if (channelIds.length === 0) {
      console.log('❌ 有効なチャンネルIDが見つかりません');
      return;
    }
    
    console.log(`📊 ${channelIds.length}件のチャンネルを${status}に設定中...`);
    
    const result = await bulkUpdateChannelStatus(channelIds, status, reason);
    
    console.log(`\n✅ 一括処理完了:`);
    console.log(`  成功: ${result.success}件`);
    console.log(`  失敗: ${result.failed}件`);
    
  } catch (error) {
    console.error('❌ 一括処理エラー:', error.message);
  }
}

/**
 * チャンネルをデータベースから削除
 */
async function removeChannel(channelId) {
  try {
    const { getDocs, getDoc, collection, deleteDoc, doc, query, where } = await import('firebase/firestore');
    const { db } = await import('./firebase-config.js');
    
    console.log(`🗑️ チャンネル削除中: ${channelId}`);
    
    // チャンネルIDまたはFirestoreドキュメントIDで検索
    let docToDelete = null;
    
    if (channelId.startsWith('UC') && channelId.length === 24) {
      // YouTubeチャンネルIDの場合
      const q = query(collection(db, 'bgm_channels'), where('channelId', '==', channelId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('❌ 指定されたチャンネルが見つかりません');
        return;
      }
      
      docToDelete = snapshot.docs[0];
    } else {
      // FirestoreドキュメントIDの場合
      const docRef = doc(db, 'bgm_channels', channelId);
      const docSnapshot = await getDoc(docRef);
      
      if (!docSnapshot.exists()) {
        console.log('❌ 指定されたドキュメントが見つかりません');
        return;
      }
      
      docToDelete = docSnapshot;
    }
    
    const channelData = docToDelete.data();
    const channelTitle = channelData.channelTitle || 'Unknown';
    
    // 削除確認
    console.log(`\n削除対象: ${channelTitle}`);
    console.log(`YouTube ID: ${channelData.channelId}`);
    console.log(`Firestore ID: ${docToDelete.id}`);
    
    // 実際の削除処理
    await deleteDoc(docToDelete.ref);
    
    console.log(`\n✅ チャンネルを削除しました: ${channelTitle}`);
    
  } catch (error) {
    console.error('❌ チャンネル削除エラー:', error.message);
  }
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showUsage();
    return;
  }

  const command = args[0];
  const channelId = args[1];
  
  // オプション解析
  const options = {
    save: args.includes('--save'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose')
  };

  switch (command) {
    case 'channel':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      await fetchAndSaveChannel(channelId, options);
      break;

    case 'details':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      const details = await fetchChannelDetails(channelId, options);
      if (details && options.save) {
        await fetchAndSaveChannel(channelId, options);
      }
      break;

    case 'latest':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      await fetchLatestVideo(channelId);
      break;

    case 'popular':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      await fetchPopularVideo(channelId);
      break;

    case 'first':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      await fetchFirstVideo(channelId);
      break;

    case 'validate':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      await validateChannel(channelId);
      break;

    case 'list':
      const status = channelId || 'all'; // channelIdをstatusとして使用
      await listChannelsByStatus(status);
      break;

    case 'remove':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      await removeChannel(channelId);
      break;

    // ステータス管理コマンド
    case 'track':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      await trackChannel(channelId);
      break;

    case 'untrack':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      await untrackChannel(channelId);
      break;

    case 'reject':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      const reason = args[2] || null;
      await rejectChannel(channelId, reason);
      break;

    case 'approve':
      if (!channelId) {
        console.log('❌ チャンネルIDを指定してください');
        return;
      }
      await approveChannel(channelId);
      break;

    case 'stats':
      await showStatusStatistics();
      break;

    case 'bulk-track':
      if (!channelId) {
        console.log('❌ ファイルパスを指定してください');
        return;
      }
      await processBulkChannels(channelId, 'tracking');
      break;

    case 'bulk-reject':
      if (!channelId) {
        console.log('❌ ファイルパスを指定してください');
        return;
      }
      const bulkReason = args[2] || null;
      await processBulkChannels(channelId, 'rejected', bulkReason);
      break;

    default:
      console.log(`❌ 不明なコマンド: ${command}`);
      showUsage();
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}