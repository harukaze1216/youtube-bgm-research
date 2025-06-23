import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * チャンネルURLまたはIDからチャンネルIDを抽出
 */
export function extractChannelId(input) {
  const cleanInput = input.trim();
  
  // チャンネルURLの各パターンに対応
  const patterns = [
    /youtube\.com\/channel\/([UC][a-zA-Z0-9_-]{22})/,  // /channel/UCxxx
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,               // /c/channelname
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,            // /user/username
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,                 // /@handle
    /^(UC[a-zA-Z0-9_-]{22})$/,                         // 直接チャンネルID
  ];
  
  for (const pattern of patterns) {
    const match = cleanInput.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return cleanInput; // パターンに一致しない場合はそのまま返す
}

/**
 * YouTube Data APIを使ってチャンネル情報を取得
 */
export async function fetchChannelInfo(channelId) {
  try {
    // YouTube Data API v3のエンドポイント
    const API_KEY = 'AIzaSyDN1sTee52txGVYpQwSWgAD7FUr4NNJinQ';
    const baseUrl = 'https://www.googleapis.com/youtube/v3/channels';
    const params = new URLSearchParams({
      key: API_KEY,
      id: channelId,
      part: 'snippet,statistics,contentDetails'
    });
    
    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API呼び出しエラー');
    }
    
    if (!data.items || data.items.length === 0) {
      throw new Error('チャンネルが見つかりません');
    }
    
    const channel = data.items[0];
    const snippet = channel.snippet;
    const statistics = channel.statistics;
    
    return {
      channelId: channel.id,
      channelTitle: snippet.title,
      description: snippet.description,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      channelUrl: `https://www.youtube.com/channel/${channel.id}`,
      subscriberCount: parseInt(statistics.subscriberCount) || 0,
      videoCount: parseInt(statistics.videoCount) || 0,
      totalViews: parseInt(statistics.viewCount) || 0,
      publishedAt: snippet.publishedAt,
      uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads
    };
  } catch (error) {
    console.error('チャンネル情報取得エラー:', error);
    throw error;
  }
}

/**
 * チャンネルの最初の動画を取得
 */
export async function fetchChannelFirstVideo(uploadsPlaylistId) {
  try {
    const API_KEY = 'AIzaSyDN1sTee52txGVYpQwSWgAD7FUr4NNJinQ';
    const baseUrl = 'https://www.googleapis.com/youtube/v3/playlistItems';
    
    let oldestVideo = null;
    let nextPageToken = '';
    let pageCount = 0;
    const maxPages = 10; // 最大10ページ（最大500動画）まで検索
    
    console.log(`📹 最初の動画を検索中: ${uploadsPlaylistId}`);
    
    do {
      const params = new URLSearchParams({
        key: API_KEY,
        playlistId: uploadsPlaylistId,
        part: 'snippet',
        maxResults: 50
      });
      
      if (nextPageToken) {
        params.append('pageToken', nextPageToken);
      }
      
      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'API呼び出しエラー');
      }
      
      if (data.items && data.items.length > 0) {
        // このページの動画から最も古いものを探す
        for (const item of data.items) {
          const publishedAt = new Date(item.snippet.publishedAt);
          
          if (!oldestVideo || publishedAt < new Date(oldestVideo.publishedAt)) {
            oldestVideo = {
              title: item.snippet.title,
              publishedAt: item.snippet.publishedAt,
              videoId: item.snippet.resourceId.videoId
            };
          }
        }
        
        console.log(`   ページ ${pageCount + 1}: ${data.items.length}本の動画をチェック`);
        console.log(`   現在の最古動画: ${oldestVideo?.title} (${oldestVideo?.publishedAt})`);
      }
      
      nextPageToken = data.nextPageToken;
      pageCount++;
      
      // API制限対策の待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } while (nextPageToken && pageCount < maxPages);
    
    console.log(`✅ 最初の動画検索完了: ${oldestVideo?.title || 'なし'}`);
    return oldestVideo;
    
  } catch (error) {
    console.error('最初の動画取得エラー:', error);
    return null;
  }
}

/**
 * チャンネルが既に存在するかチェック
 */
export async function checkChannelExists(channelId) {
  try {
    const channelsRef = collection(db, 'bgm_channels');
    const q = query(channelsRef, where('channelId', '==', channelId));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('チャンネル存在チェックエラー:', error);
    return false;
  }
}

/**
 * BGM関連チャンネルかどうかを判定
 */
export function isBGMChannel(title, description) {
  const bgmKeywords = [
    'BGM', 'instrumental', 'background music', 'ambient', 'lo-fi', 'lofi',
    'chill', 'relaxing', 'study music', 'meditation', 'sleep music',
    'インスト', 'インストゥルメンタル', 'ヒーリング', 'リラックス',
    '作業用', '勉強用', '睡眠用', '瞑想', 'アンビエント'
  ];
  
  const exclusionKeywords = [
    'lyrics', '歌詞', 'vocal', 'sing', 'singing', 'song', 'rap', 'talk', 'podcast',
    'ボーカル', '歌', '歌い手', 'トーク', 'ラップ'
  ];
  
  const text = `${title} ${description}`.toLowerCase();
  
  // 除外キーワードがある場合は BGM チャンネルではない
  for (const keyword of exclusionKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      return false;
    }
  }
  
  // BGM関連キーワードがある場合は BGM チャンネル
  for (const keyword of bgmKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * チャンネルの最も人気の動画を取得
 */
export async function fetchChannelMostPopularVideo(uploadsPlaylistId) {
  try {
    if (!uploadsPlaylistId) {
      console.error('uploadsPlaylistId is required');
      return null;
    }
    
    const API_KEY = 'AIzaSyDN1sTee52txGVYpQwSWgAD7FUr4NNJinQ';
    const baseUrl = 'https://www.googleapis.com/youtube/v3/playlistItems';
    
    let mostPopularVideo = null;
    let nextPageToken = '';
    let pageCount = 0;
    const maxPages = 5; // 最大5ページ（最大250動画）まで検索
    
    console.log(`🔥 最も人気の動画を検索中: ${uploadsPlaylistId}`);
    
    do {
      const params = new URLSearchParams({
        key: API_KEY,
        playlistId: uploadsPlaylistId,
        part: 'snippet',
        maxResults: 50
      });
      
      if (nextPageToken) {
        params.append('pageToken', nextPageToken);
      }
      
      // タイムアウト付きでAPI呼び出し
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト
      
      const response = await fetch(`${baseUrl}?${params}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error?.message?.includes('quota')) {
          throw new Error('YouTube API の使用量制限に達しました。しばらく待ってから再試行してください。');
        }
        throw new Error(data.error?.message || 'API呼び出しエラー');
      }
      
      if (data.items && data.items.length > 0) {
        // このページの動画の詳細情報を取得
        const videoIds = data.items.map(item => item.snippet.resourceId.videoId);
        const videoDetails = await fetchVideoStatistics(videoIds);
        
        // 動画詳細と組み合わせて最も人気の動画を探す
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const stats = videoDetails[item.snippet.resourceId.videoId];
          
          if (stats) {
            const viewCount = parseInt(stats.viewCount) || 0;
            
            if (!mostPopularVideo || viewCount > mostPopularVideo.viewCount) {
              mostPopularVideo = {
                title: item.snippet.title,
                viewCount: viewCount,
                likeCount: parseInt(stats.likeCount) || 0,
                commentCount: parseInt(stats.commentCount) || 0,
                publishedAt: item.snippet.publishedAt,
                thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                videoId: item.snippet.resourceId.videoId,
                url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
              };
            }
          }
        }
        
        console.log(`   ページ ${pageCount + 1}: ${data.items.length}本の動画をチェック`);
        console.log(`   現在の最人気動画: ${mostPopularVideo?.title} (${mostPopularVideo?.viewCount?.toLocaleString()}回再生)`);
      }
      
      nextPageToken = data.nextPageToken;
      pageCount++;
      
      // API制限対策の待機
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } while (nextPageToken && pageCount < maxPages);
    
    console.log(`✅ 最人気動画検索完了: ${mostPopularVideo?.title || 'なし'}`);
    return mostPopularVideo;
    
  } catch (error) {
    console.error('最人気動画取得エラー:', error);
    return null;
  }
}

/**
 * 複数動画の統計情報を一括取得
 */
async function fetchVideoStatistics(videoIds) {
  try {
    const API_KEY = 'AIzaSyDN1sTee52txGVYpQwSWgAD7FUr4NNJinQ';
    const baseUrl = 'https://www.googleapis.com/youtube/v3/videos';
    const params = new URLSearchParams({
      key: API_KEY,
      id: videoIds.join(','),
      part: 'statistics'
    });
    
    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API呼び出しエラー');
    }
    
    const videoStats = {};
    if (data.items) {
      data.items.forEach(item => {
        videoStats[item.id] = item.statistics;
      });
    }
    
    return videoStats;
  } catch (error) {
    console.error('動画統計取得エラー:', error);
    return {};
  }
}

/**
 * チャンネルの成長率を計算
 */
export function calculateGrowthRate(channelInfo, firstVideo) {
  try {
    const startDate = firstVideo ? 
      new Date(firstVideo.publishedAt) : 
      new Date(channelInfo.publishedAt);
    
    const now = new Date();
    const ageInMonths = (now - startDate) / (1000 * 60 * 60 * 24 * 30);
    
    if (ageInMonths <= 0) return 0;
    
    // 月間平均登録者増加数を基に成長率を計算
    const monthlyGrowth = channelInfo.subscriberCount / ageInMonths;
    const growthRate = (monthlyGrowth / 1000) * 100;
    
    return Math.round(Math.min(growthRate, 999));
  } catch (error) {
    console.error('成長率計算エラー:', error);
    return 0;
  }
}

/**
 * チャンネルをFirestoreに追加
 */
export async function addChannelToFirestore(channelData, userId) {
  try {
    const channelsRef = collection(db, 'bgm_channels');
    await addDoc(channelsRef, {
      ...channelData,
      userId: userId || 'temp-user',
      createdAt: new Date(),
      addedManually: true
    });
    return true;
  } catch (error) {
    console.error('Firestore保存エラー:', error);
    throw error;
  }
}

/**
 * チャンネルを表示済みとしてマーク
 * @param {string} channelDocId - Firestoreドキュメント ID
 */
export async function markChannelAsViewed(channelDocId) {
  try {
    const channelRef = doc(db, 'bgm_channels', channelDocId);
    await updateDoc(channelRef, {
      isViewed: true,
      viewedAt: serverTimestamp()
    });
    console.log(`Channel marked as viewed: ${channelDocId}`);
  } catch (error) {
    console.error('Error marking channel as viewed:', error);
    throw error;
  }
}

/**
 * チャンネルのステータスを更新
 * @param {string} channelId - チャンネルID（ドキュメントID）
 * @param {string} status - 新しいステータス ('tracking', 'non-tracking', 'rejected')
 * @param {string} reason - ステータス変更理由（オプション）
 * @returns {Promise<boolean>} 更新成功時true
 */
export async function updateChannelStatus(channelId, status, reason = null) {
  try {
    const channelRef = doc(db, 'bgm_channels', channelId);
    
    const updateData = {
      status: status,
      statusUpdatedAt: new Date(),
      statusUpdatedBy: 'user'
    };
    
    if (reason) {
      updateData.rejectionReason = reason;
    }
    
    await updateDoc(channelRef, updateData);
    console.log(`✅ Updated channel status: ${channelId} -> ${status}`);
    return true;
  } catch (error) {
    console.error(`Error updating channel status for ${channelId}:`, error);
    return false;
  }
}

/**
 * ステータス別チャンネル検索
 * @param {string} status - 検索するステータス ('tracking', 'non-tracking', 'rejected', 'unset', 'all')
 * @param {Object} additionalFilters - 追加フィルター
 * @returns {Promise<Array>} チャンネルリスト
 */
export async function getChannelsByStatus(status = 'all', userId, additionalFilters = {}) {
  try {
    let q = collection(db, 'bgm_channels');
    
    // 一時的にユーザーIDフィルタリングを無効化
    // if (userId) {
    //   q = query(q, where('userId', '==', userId));
    // }
    
    // ステータスフィルター（unsetと'all'の場合は全件取得してからフィルタリング）
    if (status !== 'all' && status !== 'unset') {
      q = query(q, where('status', '==', status));
    }
    
    const querySnapshot = await getDocs(q);
    const channels = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      channels.push({
        id: doc.id,
        ...data
      });
    });
    
    // ステータス別のフィルタリング
    let filteredChannels = channels;
    if (status === 'unset') {
      // statusフィールドが存在しない、null、undefined、または空文字列の場合
      filteredChannels = channels.filter(channel => 
        !channel.status || 
        channel.status === null || 
        channel.status === undefined || 
        channel.status === ''
      );
    }
    
    console.log(`📊 Found ${filteredChannels.length} channels with status: ${status} for user: ${userId}`);
    return filteredChannels;
  } catch (error) {
    console.error('Error getting channels by status:', error);
    return [];
  }
}

/**
 * Firestoreからチャンネル一覧を取得（フィルタ対応）
 * @param {Object} filters - フィルタ条件
 */
export async function getChannelsFromFirestore(filters = {}) {
  try {
    let q = collection(db, 'bgm_channels');
    
    // 基本的なクエリにソートを追加
    const querySnapshot = await getDocs(q);
    const channels = [];
    
    querySnapshot.forEach((doc) => {
      channels.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return channels;
  } catch (error) {
    console.error('Error getting channels from Firestore:', error);
    throw error;
  }
}