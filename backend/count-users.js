#!/usr/bin/env node

/**
 * GitHub Actions用のユーザー数カウントスクリプト
 */

import { getActiveUsers, splitIntoBatches } from './user-batch-collector.js';

async function main() {
  try {
    console.log('🔍 アクティブユーザーを検索中...');
    
    const users = await getActiveUsers();
    const batches = splitIntoBatches(users, 3);
    
    // 環境変数から最大バッチ数を取得（デフォルト: 10）
    const maxBatches = parseInt(process.env.MAX_BATCHES || '10');
    const batchCount = Math.min(batches.length, maxBatches);
    
    console.log(`📊 統計:`);
    console.log(`   アクティブユーザー: ${users.length}名`);
    console.log(`   作成可能バッチ数: ${batches.length}`);
    console.log(`   実行予定バッチ数: ${batchCount}`);
    
    // GitHub Actions出力用
    console.log(`BATCH_COUNT=${batchCount}`);
    console.log(`TOTAL_USERS=${users.length}`);
    
    // ユーザーの詳細をログ出力
    if (users.length > 0) {
      console.log('\n👥 アクティブユーザー一覧:');
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email || user.uid} (API: ✅)`);
      });
    }
    
    if (batchCount === 0) {
      console.log('⚠️ 処理対象のユーザーがいません');
      process.exit(0);
    }
    
    console.log(`\n🚀 ${batchCount}個のバッチで処理を実行します`);
    
  } catch (error) {
    console.error('❌ ユーザー数カウントエラー:', error);
    console.log('BATCH_COUNT=0');
    console.log('TOTAL_USERS=0');
    process.exit(1);
  }
}

main();