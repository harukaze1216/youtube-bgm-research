#!/usr/bin/env node

/**
 * Firebase認証状況をデバッグするスクリプト
 */

import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Firebase認証状況のデバッグ');
console.log('=====================================');

// 環境変数の確認
console.log('📋 環境変数の状況:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`- FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID || 'undefined'}`);
console.log(`- FIREBASE_SERVICE_ACCOUNT_KEY 存在: ${!!process.env.FIREBASE_SERVICE_ACCOUNT_KEY}`);
console.log(`- GOOGLE_APPLICATION_CREDENTIALS 存在: ${!!process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  console.log('\n🔑 FIREBASE_SERVICE_ACCOUNT_KEY の詳細:');
  console.log(`- 文字数: ${key.length}`);
  console.log(`- 最初の文字: "${key.charAt(0)}"`);
  console.log(`- 最初の10文字: "${key.substring(0, 10)}"`);
  console.log(`- 最後の10文字: "${key.substring(key.length - 10)}"`);
  console.log(`- JSON形式判定: ${key.startsWith('{') ? 'Plain JSON' : 'Base64 encoded'}`);
  
  try {
    let parsed;
    if (key.startsWith('{')) {
      parsed = JSON.parse(key);
    } else {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      console.log(`- Base64デコード後の最初の10文字: "${decoded.substring(0, 10)}"`);
      parsed = JSON.parse(decoded);
    }
    
    console.log('✅ JSON解析成功');
    console.log(`- type: ${parsed.type}`);
    console.log(`- project_id: ${parsed.project_id}`);
    console.log(`- client_email: ${parsed.client_email}`);
    console.log(`- private_key_id: ${parsed.private_key_id}`);
    console.log(`- private_key 存在: ${!!parsed.private_key}`);
    console.log(`- private_key 最初の30文字: "${parsed.private_key?.substring(0, 30)}"`);
    
  } catch (error) {
    console.error('❌ JSON解析エラー:', error.message);
    console.error('- エラー位置:', error.message.includes('position') ? error.message.match(/position (\d+)/)?.[1] : 'unknown');
  }
}

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log('\n📁 GOOGLE_APPLICATION_CREDENTIALS の詳細:');
  console.log(`- パス: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  
  try {
    const fs = await import('fs');
    const path = process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('/') 
      ? process.env.GOOGLE_APPLICATION_CREDENTIALS 
      : `./${process.env.GOOGLE_APPLICATION_CREDENTIALS}`;
    
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf8');
      console.log(`- ファイル存在: Yes`);
      console.log(`- ファイルサイズ: ${content.length} 文字`);
      console.log(`- 最初の20文字: "${content.substring(0, 20)}"`);
      
      try {
        const parsed = JSON.parse(content);
        console.log('✅ ファイルJSON解析成功');
        console.log(`- type: ${parsed.type}`);
        console.log(`- project_id: ${parsed.project_id}`);
        console.log(`- client_email: ${parsed.client_email}`);
      } catch (parseError) {
        console.error('❌ ファイルJSON解析エラー:', parseError.message);
      }
    } else {
      console.log(`- ファイル存在: No`);
    }
  } catch (fileError) {
    console.error('❌ ファイル読み込みエラー:', fileError.message);
  }
}

// Firebase Admin SDK の初期化テスト
console.log('\n🔥 Firebase Admin SDK 初期化テスト:');
try {
  const { default: admin } = await import('firebase-admin');
  
  if (admin.apps.length > 0) {
    console.log('✅ Firebase Admin SDK は既に初期化済み');
    console.log(`- アプリ数: ${admin.apps.length}`);
    
    // Firestoreの接続テスト
    try {
      const db = admin.firestore();
      console.log('✅ Firestore インスタンス取得成功');
      
      // 簡単な読み取りテストを試行
      const testQuery = db.collection('test_connection').limit(1);
      await testQuery.get();
      console.log('✅ Firestore 接続テスト成功');
      
    } catch (firestoreError) {
      console.error('❌ Firestore 接続テストエラー:', firestoreError.message);
    }
  } else {
    console.log('⚠️ Firebase Admin SDK は未初期化');
  }
  
} catch (firebaseError) {
  console.error('❌ Firebase Admin SDK エラー:', firebaseError.message);
}

console.log('\n🎯 推奨される次のステップ:');
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log('1. GitHub SecretsにFIREBASE_SERVICE_ACCOUNT_KEYを設定');
  console.log('2. または、ローカルでGOOGLE_APPLICATION_CREDENTIALSを設定');
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.log('1. 上記のJSON解析結果を確認');
  console.log('2. エラーがある場合は、Secretの値を再確認');
} else {
  console.log('1. 上記のファイル読み込み結果を確認');
  console.log('2. ファイルパスと内容を再確認');
}