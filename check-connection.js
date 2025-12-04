// check-connection.js - СОЗДАЙТЕ новый файл
require('dotenv').config();
const { checkGoogleSheets } = require('./googleSheets');

async function testConnection() {
  console.log('🧪 Тестируем подключение к Google Sheets...');
  
  const isConnected = await checkGoogleSheets();
  
  if (isConnected) {
    console.log('✅ Подключение успешно!');
  } else {
    console.log('❌ Подключение не удалось');
    console.log('\n🔧 Проверьте:');
    console.log('1. Файл credentials.json в корне проекта');
    console.log('2. GOOGLE_SHEET_ID в .env файле');
    console.log('3. Service account имеет доступ к таблице');
  }
}

testConnection();