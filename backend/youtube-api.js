import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// デフォルトのYouTube APIクライアント
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

/**
 * カスタムAPIキー用のYouTube APIクライアントを作成
 */
function createYouTubeClient(apiKey) {
  return google.youtube({
    version: 'v3',
    auth: apiKey
  });
}

/**
 * Search for videos using keywords
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum results to return
 * @param {string} publishedAfter - ISO date string for videos published after this date
 * @returns {Promise<Array>} Array of video data
 */
export async function searchVideos(query, maxResults = 50, publishedAfter = null) {
  try {
    // ランダム要素を追加して検索結果の多様性を確保
    const orders = ['relevance', 'date', 'viewCount'];
    const randomOrder = orders[Math.floor(Math.random() * orders.length)];
    
    const searchParams = {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults,
      order: randomOrder,
      regionCode: 'JP',
      relevanceLanguage: 'ja'
    };

    if (publishedAfter) {
      searchParams.publishedAfter = publishedAfter;
      
      // ランダムな終了日を設定してより多様な期間から検索
      if (Math.random() > 0.5) {
        const randomEndDate = new Date();
        randomEndDate.setDate(randomEndDate.getDate() - Math.floor(Math.random() * 30));
        searchParams.publishedBefore = randomEndDate.toISOString();
      }
    }

    const response = await youtube.search.list(searchParams);
    return response.data.items || [];
  } catch (error) {
    console.error(`Video search error for query "${query}":`, error.message);
    return [];
  }
}

/**
 * Get detailed channel information
 * @param {string} channelId - YouTube channel ID
 * @param {string} apiKey - YouTube API key (optional, uses default if not provided)
 * @returns {Promise<Object|null>} Channel data or null if not found
 */
export async function getChannelDetails(channelId, apiKey = null) {
  try {
    const youtubeClient = apiKey ? createYouTubeClient(apiKey) : youtube;
    
    const response = await youtubeClient.channels.list({
      part: 'snippet,statistics,contentDetails',
      id: channelId
    });

    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }

    const channel = response.data.items[0];
    
    // デバッグ用ログ追加
    console.log(`📊 Channel statistics for ${channel.snippet.title}:`, {
      subscriberCount: channel.statistics?.subscriberCount,
      videoCount: channel.statistics?.videoCount,
      viewCount: channel.statistics?.viewCount,
      hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount
    });
    
    return {
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      description: channel.snippet.description,
      thumbnailUrl: channel.snippet.thumbnails?.default?.url || channel.snippet.thumbnails?.medium?.url,
      channelUrl: `https://www.youtube.com/channel/${channel.id}`,
      subscriberCount: parseInt(channel.statistics?.subscriberCount || 0),
      videoCount: parseInt(channel.statistics?.videoCount || 0),
      totalViews: parseInt(channel.statistics?.viewCount || 0),
      publishedAt: channel.snippet.publishedAt,
      uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads
    };
  } catch (error) {
    console.error(`Channel details error for ID "${channelId}":`, error.message);
    return null;
  }
}

/**
 * Get channel's first video (oldest video)
 * @param {string} channelId - Channel ID
 * @param {string} apiKey - YouTube API key (optional, uses default if not provided)
 * @returns {Promise<Object|null>} First video data or null
 */
export async function getChannelFirstVideo(channelId, apiKey = null) {
  try {
    const youtubeClient = apiKey ? createYouTubeClient(apiKey) : youtube;
    
    // First, get channel details to find uploads playlist
    const channelResponse = await youtubeClient.channels.list({
      part: 'contentDetails',
      id: channelId
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return null;
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;
    
    // Get the last few pages of the uploads playlist to find the oldest video
    let oldestVideo = null;
    let nextPageToken = '';
    let pageCount = 0;
    const maxPages = 10; // Limit to avoid excessive API calls
    
    do {
      const response = await youtubeClient.playlistItems.list({
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: 50,
        pageToken: nextPageToken || undefined
      });

      if (!response.data.items || response.data.items.length === 0) {
        break;
      }

      // Check each video to find the oldest one so far
      for (const item of response.data.items) {
        const publishedAt = new Date(item.snippet.publishedAt);
        if (!oldestVideo || publishedAt < new Date(oldestVideo.publishedAt)) {
          oldestVideo = {
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
          };
        }
      }

      nextPageToken = response.data.nextPageToken;
      pageCount++;
    } while (nextPageToken && pageCount < maxPages);

    return oldestVideo;
  } catch (error) {
    console.error(`First video error for channel "${channelId}":`, error.message);
    return null;
  }
}

/**
 * Get channel's latest video
 * @param {string} uploadsPlaylistId - Uploads playlist ID from channel details
 * @returns {Promise<Object|null>} Latest video data or null
 */
export async function getChannelLatestVideo(uploadsPlaylistId) {
  try {
    const response = await youtube.playlistItems.list({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: 1
    });

    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }

    const latestVideo = response.data.items[0];
    return {
      videoId: latestVideo.snippet.resourceId.videoId,
      title: latestVideo.snippet.title,
      publishedAt: latestVideo.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${latestVideo.snippet.resourceId.videoId}`
    };
  } catch (error) {
    console.error(`Latest video error for playlist "${uploadsPlaylistId}":`, error.message);
    return null;
  }
}

/**
 * Extract unique channel IDs from video search results
 * @param {Array} videos - Array of video data from search
 * @returns {Set} Set of unique channel IDs
 */
export function extractChannelIds(videos) {
  const channelIds = new Set();
  videos.forEach(video => {
    if (video.snippet?.channelId) {
      channelIds.add(video.snippet.channelId);
    }
  });
  return channelIds;
}

/**
 * Calculate growth rate based on channel age and subscriber count
 * @param {number} subscriberCount - Current subscriber count
 * @param {string} publishedAt - Channel creation date
 * @returns {number} Growth rate percentage
 */
export function calculateGrowthRate(subscriberCount, publishedAt) {
  try {
    const createdDate = new Date(publishedAt);
    const now = new Date();
    const ageInMonths = (now - createdDate) / (1000 * 60 * 60 * 24 * 30);
    
    if (ageInMonths <= 0) return 0;
    
    // Simple growth rate calculation: subscribers per month / 1000 * 100
    const growthRate = (subscriberCount / ageInMonths / 1000) * 100;
    return Math.round(Math.min(growthRate, 999)); // Cap at 999%
  } catch (error) {
    console.error('Growth rate calculation error:', error);
    return 0;
  }
}

/**
 * Get channel's most popular video
 * @param {string} channelId - Channel ID
 * @returns {Promise<Object|null>} Most popular video data or null
 */
export async function getChannelMostPopularVideo(channelId) {
  try {
    // Search for videos from this channel ordered by view count
    const response = await youtube.search.list({
      part: 'snippet',
      channelId: channelId,
      maxResults: 50,
      order: 'viewCount', // Order by view count (most popular first)
      type: 'video'
    });

    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }

    // Get the first video (most popular)
    const mostPopularVideo = response.data.items[0];
    
    // Get detailed video statistics
    const videoDetailsResponse = await youtube.videos.list({
      part: 'statistics,snippet',
      id: mostPopularVideo.id.videoId
    });

    if (!videoDetailsResponse.data.items || videoDetailsResponse.data.items.length === 0) {
      return null;
    }

    const videoDetails = videoDetailsResponse.data.items[0];
    
    return {
      videoId: videoDetails.id,
      title: videoDetails.snippet.title,
      description: videoDetails.snippet.description,
      thumbnailUrl: videoDetails.snippet.thumbnails?.medium?.url || videoDetails.snippet.thumbnails?.default?.url,
      publishedAt: videoDetails.snippet.publishedAt,
      viewCount: parseInt(videoDetails.statistics.viewCount || 0),
      likeCount: parseInt(videoDetails.statistics.likeCount || 0),
      commentCount: parseInt(videoDetails.statistics.commentCount || 0),
      url: `https://www.youtube.com/watch?v=${videoDetails.id}`
    };
  } catch (error) {
    console.error(`Most popular video error for channel "${channelId}":`, error.message);
    return null;
  }
}

/**
 * Search for channels by keyword
 * @param {string} keyword - Search keyword
 * @param {number} maxResults - Maximum results to return
 * @returns {Promise<Array>} Array of channel IDs
 */
export async function searchChannelsByKeyword(keyword, maxResults = 50) {
  try {
    const response = await youtube.search.list({
      part: 'snippet',
      q: keyword,
      type: 'channel',
      maxResults,
      regionCode: 'JP'
    });

    const channelIds = [];
    if (response.data.items) {
      response.data.items.forEach(item => {
        if (item.snippet?.channelId) {
          channelIds.push(item.snippet.channelId);
        }
      });
    }

    return channelIds;
  } catch (error) {
    console.error(`Channel search error for keyword "${keyword}":`, error.message);
    return [];
  }
}

/**
 * Get related channels (placeholder - YouTube API doesn't directly support this)
 * This is a workaround using channel's featured channels or similar channels
 * @param {string} channelId - Source channel ID
 * @returns {Promise<Array>} Array of related channel IDs
 */
export async function getRelatedChannels(channelId) {
  try {
    // Workaround: Search for videos from this channel and find other channels
    // that appear in search results for similar content
    const channelDetails = await getChannelDetails(channelId);
    if (!channelDetails) return [];

    // Use channel keywords for search
    const searchTerms = channelDetails.channelTitle.split(' ').slice(0, 3).join(' ');
    const response = await youtube.search.list({
      part: 'snippet',
      q: searchTerms + ' BGM',
      type: 'video',
      maxResults: 50,
      regionCode: 'JP'
    });

    const relatedChannelIds = new Set();
    if (response.data.items) {
      response.data.items.forEach(item => {
        if (item.snippet?.channelId && item.snippet.channelId !== channelId) {
          relatedChannelIds.add(item.snippet.channelId);
        }
      });
    }

    return Array.from(relatedChannelIds);
  } catch (error) {
    console.error(`Related channels error for channel "${channelId}":`, error.message);
    return [];
  }
}

/**
 * Search for playlists and extract channel IDs
 * @param {string} keyword - Search keyword
 * @param {number} maxResults - Maximum results to return
 * @returns {Promise<Array>} Array of channel IDs from playlists
 */
export async function searchPlaylistChannels(keyword, maxResults = 50) {
  try {
    const response = await youtube.search.list({
      part: 'snippet',
      q: keyword,
      type: 'playlist',
      maxResults,
      regionCode: 'JP'
    });

    const channelIds = new Set();
    if (response.data.items) {
      response.data.items.forEach(item => {
        if (item.snippet?.channelId) {
          channelIds.add(item.snippet.channelId);
        }
      });
    }

    return Array.from(channelIds);
  } catch (error) {
    console.error(`Playlist search error for keyword "${keyword}":`, error.message);
    return [];
  }
}

/**
 * 統合チャンネル検索・収集関数
 * ユーザーのAPIキーと設定を使用してチャンネルを検索・収集
 */
export async function searchAndCollectChannels(config, existingChannelIds = new Set()) {
  const { apiKey, keywordCount, videosPerKeyword, maxChannelsPerRun, ...filterConfig } = config;
  
  try {
    console.log(`🔍 収集開始: ${keywordCount}キーワード, ${videosPerKeyword}動画/キーワード`);
    
    // カスタムAPIキーでYouTubeクライアント作成
    const customYoutube = createYouTubeClient(apiKey);
    
    // BGMキーワードを取得
    const { getHighPriorityKeywords } = await import('./keywords.js');
    const keywords = getHighPriorityKeywords(keywordCount);
    
    const allChannelIds = new Set();
    let processedKeywords = 0;
    
    // キーワードごとに検索
    for (const keyword of keywords) {
      try {
        console.log(`  🔍 キーワード "${keyword}" を検索中...`);
        
        // 動画検索でチャンネルIDを収集
        const videoChannelIds = await searchVideoChannels(customYoutube, keyword, videosPerKeyword);
        
        // チャンネル検索も実行
        const directChannelIds = await searchChannelsDirect(customYoutube, keyword, 20);
        
        // 結果をマージ
        [...videoChannelIds, ...directChannelIds].forEach(channelId => {
          if (!existingChannelIds.has(channelId)) {
            allChannelIds.add(channelId);
          }
        });
        
        processedKeywords++;
        console.log(`    ✓ ${videoChannelIds.length + directChannelIds.length}件発見 (累計: ${allChannelIds.size}件)`);
        
        // API制限対策の待機
        await sleep(200);
        
      } catch (error) {
        console.warn(`⚠️ キーワード "${keyword}" 検索エラー:`, error.message);
        // 個別キーワードエラーは無視して継続
      }
    }
    
    console.log(`📋 発見したユニークチャンネル: ${allChannelIds.size}件`);
    
    if (allChannelIds.size === 0) {
      return [];
    }
    
    // チャンネル詳細を取得してフィルタリング
    const channelIds = Array.from(allChannelIds).slice(0, maxChannelsPerRun);
    const validChannels = await processChannelDetails(customYoutube, channelIds, filterConfig);
    
    console.log(`✅ フィルタ通過チャンネル: ${validChannels.length}件`);
    return validChannels;
    
  } catch (error) {
    console.error('❌ チャンネル収集エラー:', error);
    throw error;
  }
}

/**
 * 動画検索からチャンネルIDを抽出
 */
async function searchVideoChannels(youtubeClient, keyword, maxResults) {
  try {
    const publishedAfter = new Date();
    publishedAfter.setMonth(publishedAfter.getMonth() - 6); // 6ヶ月以内
    
    const response = await youtubeClient.search.list({
      part: 'snippet',
      q: keyword + ' BGM',
      type: 'video',
      maxResults,
      order: 'relevance',
      publishedAfter: publishedAfter.toISOString(),
      regionCode: 'JP',
      relevanceLanguage: 'ja'
    });
    
    const channelIds = new Set();
    if (response.data.items) {
      response.data.items.forEach(item => {
        if (item.snippet?.channelId) {
          channelIds.add(item.snippet.channelId);
        }
      });
    }
    
    return Array.from(channelIds);
  } catch (error) {
    console.warn(`動画検索エラー (${keyword}):`, error.message);
    return [];
  }
}

/**
 * 直接チャンネル検索
 */
async function searchChannelsDirect(youtubeClient, keyword, maxResults) {
  try {
    const response = await youtubeClient.search.list({
      part: 'snippet',
      q: keyword + ' BGM',
      type: 'channel',
      maxResults,
      regionCode: 'JP'
    });
    
    const channelIds = [];
    if (response.data.items) {
      response.data.items.forEach(item => {
        if (item.snippet?.channelId) {
          channelIds.push(item.snippet.channelId);
        }
      });
    }
    
    return channelIds;
  } catch (error) {
    console.warn(`チャンネル検索エラー (${keyword}):`, error.message);
    return [];
  }
}

/**
 * チャンネル詳細取得とフィルタリング
 */
async function processChannelDetails(youtubeClient, channelIds, filterConfig) {
  const validChannels = [];
  const batchSize = 50; // YouTube API制限
  
  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    
    try {
      const response = await youtubeClient.channels.list({
        part: 'snippet,statistics,contentDetails',
        id: batch.join(',')
      });
      
      if (response.data.items) {
        for (const channel of response.data.items) {
          const channelData = await processChannelData(youtubeClient, channel, filterConfig);
          if (channelData) {
            validChannels.push(channelData);
          }
        }
      }
      
      // API制限対策
      await sleep(100);
      
    } catch (error) {
      console.warn(`チャンネル詳細取得エラー (バッチ ${i}-${i + batchSize}):`, error.message);
    }
  }
  
  return validChannels;
}

/**
 * 個別チャンネルデータ処理
 */
async function processChannelData(youtubeClient, channel, filterConfig) {
  try {
    const snippet = channel.snippet;
    const statistics = channel.statistics;
    
    // 基本データ抽出
    const channelData = {
      channelId: channel.id,
      channelTitle: snippet.title,
      description: snippet.description || '',
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      channelUrl: `https://www.youtube.com/channel/${channel.id}`,
      subscriberCount: parseInt(statistics.subscriberCount) || 0,
      videoCount: parseInt(statistics.videoCount) || 0,
      totalViews: parseInt(statistics.viewCount) || 0,
      publishedAt: snippet.publishedAt,
      uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads
    };
    
    // BGMフィルタリング
    if (!isBGMChannel(channelData.channelTitle, channelData.description)) {
      return null;
    }
    
    // 基本条件フィルタリング
    if (!passesBasicFilters(channelData, filterConfig)) {
      return null;
    }
    
    // 最初の動画を取得して成長率計算
    const firstVideo = await getChannelFirstVideoFromPlaylist(channelData.uploadsPlaylistId, youtubeClient);
    const growthRate = calculateGrowthRate(channelData.subscriberCount, 
      firstVideo?.publishedAt || channelData.publishedAt);
    
    // 成長率フィルタ
    if (growthRate < filterConfig.minGrowthRate) {
      return null;
    }
    
    return {
      ...channelData,
      firstVideoDate: firstVideo?.publishedAt || channelData.publishedAt,
      growthRate,
      scoreBgmRelev: calculateBGMRelevanceScore(channelData.channelTitle, channelData.description)
    };
    
  } catch (error) {
    console.warn(`チャンネルデータ処理エラー (${channel.id}):`, error.message);
    return null;
  }
}

/**
 * BGMチャンネル判定
 */
function isBGMChannel(title, description) {
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
  
  // 除外キーワードチェック
  for (const keyword of exclusionKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      return false;
    }
  }
  
  // BGMキーワードチェック
  for (const keyword of bgmKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * 基本フィルタリング
 */
function passesBasicFilters(channelData, config) {
  // 登録者数チェック
  if (channelData.subscriberCount < config.minSubscribers || 
      channelData.subscriberCount > config.maxSubscribers) {
    return false;
  }
  
  // 動画数チェック
  if (channelData.videoCount < config.minVideos) {
    return false;
  }
  
  // チャンネル作成日チェック
  const channelAge = (Date.now() - new Date(channelData.publishedAt)) / (1000 * 60 * 60 * 24 * 30);
  if (channelAge > config.monthsThreshold) {
    return false;
  }
  
  return true;
}

/**
 * BGM関連度スコア計算
 */
function calculateBGMRelevanceScore(title, description) {
  let score = 0;
  const text = `${title} ${description}`.toLowerCase();
  
  const highValueKeywords = ['bgm', 'instrumental', 'ambient', 'lo-fi', 'lofi'];
  const mediumValueKeywords = ['chill', 'relaxing', 'study music', 'meditation'];
  
  highValueKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 20;
  });
  
  mediumValueKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 10;
  });
  
  return Math.min(score, 100);
}

/**
 * 非同期待機関数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * カスタムAPIキー用のチャンネル最初の動画取得
 */
async function getChannelFirstVideoFromPlaylist(uploadsPlaylistId, youtubeClient) {
  if (!uploadsPlaylistId) return null;
  
  try {
    // プレイリストの最後のページから取得（古い動画から）
    let oldestVideo = null;
    let nextPageToken = '';
    let pageCount = 0;
    const maxPages = 10;
    
    do {
      const params = {
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: 50
      };
      
      if (nextPageToken) {
        params.pageToken = nextPageToken;
      }
      
      const response = await youtubeClient.playlistItems.list(params);
      
      if (response.data.items && response.data.items.length > 0) {
        for (const item of response.data.items) {
          const publishedAt = new Date(item.snippet.publishedAt);
          if (!oldestVideo || publishedAt < new Date(oldestVideo.publishedAt)) {
            oldestVideo = {
              title: item.snippet.title,
              publishedAt: item.snippet.publishedAt,
              videoId: item.snippet.resourceId.videoId
            };
          }
        }
      }
      
      nextPageToken = response.data.nextPageToken;
      pageCount++;
      
      // API制限対策
      await sleep(100);
      
    } while (nextPageToken && pageCount < maxPages);
    
    return oldestVideo;
    
  } catch (error) {
    console.warn('最初の動画取得エラー:', error.message);
    return null;
  }
}