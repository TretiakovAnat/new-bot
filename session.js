require('dotenv').config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const sessionString = process.env.SESSION_STRING || "";

// Создаем клиента
const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
  connectionRetries: 5,
});

let isSessionConnected = false;

// Функция для подключения сессии
async function connectSession() {
  try {
    if (!client.connected) {
      console.log('🔌 Підключення бот-сесії...');
      await client.connect();
      
      // Проверяем, нужна ли авторизация
      if (!await client.checkAuthorization()) {
        console.log('🔐 Потрібна авторизація...');
        await client.start({
          phoneNumber: async () => await input.text("Будь ласка, введіть ваш номер: "),
          password: async () => await input.text("Будь ласка, введіть ваш пароль: "),
          phoneCode: async () => await input.text("Будь ласка, введіть код: "),
          onError: (err) => console.log(err),
        });
      }
      
      console.log('✅ Сесія успішно підключена!');
      try {
        const me = await client.getMe();
        console.log('👤 Користувач:', me);
      } catch (error) {
        console.log('ℹ️ Інформація про користувача недоступна');
      }
      isSessionConnected = true;
    } else {
      console.log('✅ Сесія вже підключена');
      isSessionConnected = true;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Помилка підключення сесії:', error);
    isSessionConnected = false;
    return false;
  }
}

// Функция для отправки сообщений
async function sendBroadcastMessage(message, selectedGroups) {
  if (!isSessionConnected || !client.connected) {
    console.log('❌ Бот-сесія не підключена або клієнт не активний. Не можу відправити повідомлення.');
    console.log('Статус підключення:', isSessionConnected);
    console.log('Статус клієнта:', client.connected);
    return false;
  }
  
  try {
    console.log(`📤 Відправляємо повідомлення до ${selectedGroups.length} груп...`);
    
    for (const groupId of selectedGroups) {
      try {
        await client.sendMessage(groupId, { message: message });
        console.log(`✅ Повідомлення відправлено до групи: ${groupId}`);
        // Задержка между сообщениями чтобы избежать ограничений
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Помилка відправлення до групи ${groupId}:`, error.message);
      }
    }
    
    console.log('✅ Розсилка завершена!');
    return true;
    
  } catch (error) {
    console.error('❌ Загальна помилка при розсилці:', error);
    return false;
  }
}

// Функция для получения списка групп/чатов
async function getGroups() {
  if (!isSessionConnected) {
    console.log('❌ Сесія не підключена');
    return [];
  }
  
  try {
    const dialogs = await client.getDialogs();
    const groups = dialogs.filter(dialog => 
      dialog.isGroup || dialog.isChannel
    );
    
    return groups.map(dialog => ({
      id: dialog.id,
      name: dialog.name,
      isChannel: dialog.isChannel,
      isGroup: dialog.isGroup
    }));
    
  } catch (error) {
    console.error('❌ Помилка отримання груп:', error);
    return [];
  }
}

// Функция для запуска
async function start() {
  isSessionConnected = await connectSession();
  if (isSessionConnected) {
    console.log('👤 Бот-сесія запущена успішно!');
  } else {
    console.log('❌ Бот-сесія не підключена. Розсилка не працюватиме.');
  }
  return isSessionConnected;
}

// Функция для остановки
async function stop() {
  try {
    await client.disconnect();
    isSessionConnected = false;
    console.log('✅ Сесія зупинена');
  } catch (error) {
    console.error('❌ Помилка при зупинці сесії:', error);
  }
}

// Обработка graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Отримано SIGINT. Зупиняємо сесію...');
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Отримано SIGTERM. Зупиняємо сесію...');
  await stop();
  process.exit(0);
});

module.exports = { 
  client, 
  connectSession, 
  start, 
  stop,
  sendBroadcastMessage, 
  getGroups,
  isSessionConnected 
};