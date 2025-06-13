import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

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
 * @returns {Promise<Object|null>} Channel data or null if not found
 */
export async function getChannelDetails(channelId) {
  try {
    const response = await youtube.channels.list({
      part: 'snippet,statistics,contentDetails',
      id: channelId
    });

    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }

    const channel = response.data.items[0];
    return {
      channelId: channel.id,
      channelTitle: channel.snippet.title,
      description: channel.snippet.description,
      thumbnailUrl: channel.snippet.thumbnails?.default?.url || channel.snippet.thumbnails?.medium?.url,
      channelUrl: `https://www.youtube.com/channel/${channel.id}`,
      subscriberCount: parseInt(channel.statistics.subscriberCount || 0),
      videoCount: parseInt(channel.statistics.videoCount || 0),
      totalViews: parseInt(channel.statistics.viewCount || 0),
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
 * @returns {Promise<Object|null>} First video data or null
 */
export async function getChannelFirstVideo(channelId) {
  try {
    // First, get channel details to find uploads playlist
    const channelResponse = await youtube.channels.list({
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
      const response = await youtube.playlistItems.list({
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