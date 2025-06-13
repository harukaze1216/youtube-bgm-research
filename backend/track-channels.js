import dotenv from 'dotenv';
import { updateAllTrackingData } from './tracking-service.js';

dotenv.config();

/**
 * メイントラッキング処理
 */
async function main() {
  console.log('📊 Channel Tracking Update Started');
  console.log('=====================================');

  try {
    // 全ての追跡中チャンネルのデータを更新
    const results = await updateAllTrackingData();

    console.log('\n📈 Tracking Update Summary:');
    console.log('============================');
    console.log(`Total tracked channels: ${results.total}`);
    console.log(`Successfully updated: ${results.successful}`);
    console.log(`Failed updates: ${results.failed}`);

    if (results.failed > 0) {
      console.log(`\n⚠️ ${results.failed} channels failed to update`);
    }

    console.log('\n✅ Tracking update completed successfully!');

  } catch (error) {
    console.error('❌ Tracking update failed:', error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n🛑 Tracking update interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Tracking update terminated');
  process.exit(0);
});

// メイン処理を実行
main();