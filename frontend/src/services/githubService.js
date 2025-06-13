/**
 * GitHub Issues API連携サービス
 */

const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'harukaze1216';
const REPO_NAME = 'youtube-bgm-research';

/**
 * GitHub Personal Access Tokenを取得
 */
function getGitHubToken() {
  // 設定から取得（後で実装）
  return localStorage.getItem('github_token') || null;
}

/**
 * GitHub APIリクエストヘッダーを生成
 */
function getApiHeaders(token) {
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
}

/**
 * GitHub Issueを作成
 * @param {Object} issueData - Issue作成データ
 * @param {string} issueData.title - Issueタイトル
 * @param {string} issueData.body - Issue本文
 * @param {string} issueData.type - Issue種別（'bug' | 'feature' | 'question'）
 * @param {string} issueData.severity - 重要度（'low' | 'medium' | 'high' | 'critical'）
 * @param {string} issueData.browserInfo - ブラウザ情報
 * @param {string} issueData.userAgent - ユーザーエージェント
 * @returns {Promise<Object>} 作成されたIssue情報
 */
export async function createGitHubIssue(issueData) {
  const token = getGitHubToken();
  
  if (!token) {
    throw new Error('GitHub Personal Access Tokenが設定されていません。設定ページでトークンを設定してください。');
  }

  try {
    // ラベルを種別と重要度から決定
    const labels = getIssueLabels(issueData.type, issueData.severity);
    
    // Issue本文をMarkdown形式で生成
    const body = generateIssueBody(issueData);
    
    // GitHub Issues APIにリクエスト
    const response = await fetch(`${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
      method: 'POST',
      headers: getApiHeaders(token),
      body: JSON.stringify({
        title: issueData.title,
        body: body,
        labels: labels
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API Error: ${errorData.message || response.statusText}`);
    }

    const createdIssue = await response.json();
    
    return {
      success: true,
      issue: {
        number: createdIssue.number,
        title: createdIssue.title,
        url: createdIssue.html_url,
        state: createdIssue.state,
        createdAt: createdIssue.created_at
      }
    };

  } catch (error) {
    console.error('GitHub Issue作成エラー:', error);
    throw error;
  }
}

/**
 * Issue種別と重要度からラベルを生成
 */
function getIssueLabels(type, severity) {
  const labels = [];
  
  // 種別ラベル
  switch (type) {
    case 'bug':
      labels.push('bug');
      break;
    case 'feature':
      labels.push('enhancement');
      break;
    case 'question':
      labels.push('question');
      break;
    default:
      labels.push('feedback');
  }
  
  // 重要度ラベル
  switch (severity) {
    case 'critical':
      labels.push('priority: critical');
      break;
    case 'high':
      labels.push('priority: high');
      break;
    case 'medium':
      labels.push('priority: medium');
      break;
    case 'low':
      labels.push('priority: low');
      break;
  }
  
  // 自動投稿ラベル
  labels.push('user-reported');
  
  return labels;
}

/**
 * Issue本文をMarkdown形式で生成
 */
function generateIssueBody(issueData) {
  const now = new Date();
  const timestamp = now.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `## 概要
${issueData.body}

## Issue詳細

**種別:** ${getTypeLabel(issueData.type)}  
**重要度:** ${getSeverityLabel(issueData.severity)}  
**投稿日時:** ${timestamp}

## 環境情報

**ブラウザ:** ${issueData.browserInfo || 'Unknown'}  
**User Agent:** ${issueData.userAgent || 'Unknown'}  
**URL:** ${window.location.href}

## 再現手順

${issueData.reproductionSteps || '未記入'}

## 期待する動作

${issueData.expectedBehavior || '未記入'}

## 実際の動作

${issueData.actualBehavior || '未記入'}

## 追加情報

${issueData.additionalInfo || '特になし'}

---
*この Issue は YouTube BGM チャンネル分析アプリから自動投稿されました*`;
}

/**
 * 種別ラベルを日本語で取得
 */
function getTypeLabel(type) {
  switch (type) {
    case 'bug': return '🐛 バグ報告';
    case 'feature': return '✨ 機能要望';
    case 'question': return '❓ 質問・サポート';
    default: return '💬 フィードバック';
  }
}

/**
 * 重要度ラベルを日本語で取得
 */
function getSeverityLabel(severity) {
  switch (severity) {
    case 'critical': return '🚨 緊急';
    case 'high': return '🔴 高';
    case 'medium': return '🟡 中';
    case 'low': return '🟢 低';
    default: return '🔵 通常';
  }
}

/**
 * ブラウザ情報を取得
 */
export function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';
  let version = 'Unknown';

  if (userAgent.includes('Chrome')) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    version = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/([0-9.]+)/);
    version = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Safari')) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/([0-9.]+)/);
    version = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
    const match = userAgent.match(/Edge\/([0-9.]+)/);
    version = match ? match[1] : 'Unknown';
  }

  return `${browser} ${version}`;
}

/**
 * GitHub Personal Access Tokenを設定
 */
export function setGitHubToken(token) {
  if (token && token.trim()) {
    localStorage.setItem('github_token', token.trim());
    return true;
  } else {
    localStorage.removeItem('github_token');
    return false;
  }
}

/**
 * 設定されているGitHub Tokenの存在確認
 */
export function hasGitHubToken() {
  const token = localStorage.getItem('github_token');
  return token && token.trim().length > 0;
}

/**
 * GitHub Tokenの妥当性を検証
 */
export async function validateGitHubToken(token) {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: getApiHeaders(token)
    });
    
    return response.ok;
  } catch (error) {
    console.error('GitHub Token validation error:', error);
    return false;
  }
}