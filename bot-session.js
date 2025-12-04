require('dotenv').config();
const { client, connectSession } = require('./session');
const groupManager = require('./GroupManager'); // Добавляем импорт GroupManager
const { Button } = require('telegram/tl/custom/button'); // Добавляем импорт Button

let isSessionConnected = false;

const admins = process.env.ADMINS.split(',').map(id => Number(id.trim()));

// Удаляем жесткий список ALL_GROUPS и используем функцию из GroupManager
function getAllGroups() {
    return groupManager.getAllGroups();
}

// Отправка меню выбора
async function showGroupSelectionMenu(chatId) {
  await client.sendMessage(chatId, {
    message: "Выберите действие:",
    buttons: [
      [Button.inline("📢 Выбрать все чаты", "select_all")],
      [Button.inline("❌ Отмена", "cancel")]
    ]
  });
}

// Обработчик callback-кнопок
client.addEventHandler(async (event) => {
  if (!event.message || !event.data) return;

  const data = event.data.toString();

  if (data === "select_all") {
    await event.message.edit({ text: "✅ Выбраны все чаты!" });
    await sendBroadcastMessage("🚀 Сообщение во все чаты!", getAllGroups());
  }

  if (data === "cancel") {
    await event.message.edit({ text: "❌ Действие отменено" });
  }
});

// Глобальная переменная для хранения активных рассылок
const activeBroadcasts = new Map();

// Функция рассылки через сессию в выбранные группы
async function sendBroadcastMessage(message, selectedGroups) {
  if (!isSessionConnected) {
    console.log('❌ Бот-сесія не підключена. Не можу відправити повідомлення.');
    return false;
  }

  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  console.log(`📤 Спроба відправки повідомлення в ${selectedGroups.length} груп`);
  
  for (const group of selectedGroups) {
    try {
      console.log(`📨 Відправка в групу: ${group.name} (${group.id})`);
      
      // Проверяем, что клиент подключен
      if (!client.connected) {
        throw new Error('Клієнт не підключений');
      }
      
      // Получаем entity для группы/канала
      let entity;
      try {
        entity = await client.getEntity(group.id);
      } catch (entityError) {
        console.log(`❌ Не могу получить entity для ${group.id}: ${entityError.message}`);
        // Пропускаем эту группу
        errors.push({
          group: group.name,
          error: `Cannot access entity: ${entityError.message}`
        });
        errorCount++;
        continue;
      }
      
      // Отправляем сообщение
      const result = await client.sendMessage(entity, { 
        message: message,
        parseMode: 'html'
      });
      
      console.log(`✅ Успішно відправлено в ${group.name}`);
      successCount++;
      
      // Увеличиваем задержку между отправками (3-5 секунд)
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
      
    } catch (err) {
      console.error(`❌ Помилка відправки в групу ${group.name} (${group.id}):`, err.message);
      errors.push({
        group: group.name,
        error: err.message
      });
      errorCount++;
      
      // Если ошибка связана с флуд-контролем, делаем большую паузу
      if (err.message.includes('FLOOD') || err.message.includes('Too Many') || err.message.includes('wait')) {
        console.log('⏸️ Велика пауза через флуд-контроль (30 секунд)...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else if (err.message.includes('CHAT_WRITE_FORBIDDEN') || err.message.includes('CHANNEL_INVALID')) {
        // Пропускаем проблемные группы
        console.log(`⏭️ Пропускаем проблемную группу: ${group.name}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.log(`📊 Результат розсилки: ${successCount} успішно, ${errorCount} помилок`);
  
  if (errors.length > 0) {
    console.log('❌ Помилки:');
    errors.forEach(error => {
      console.log(`   - ${error.group}: ${error.error}`);
    });
  }
  
  return successCount > 0;
}

// Альтернативная функция рассылки через GroupManager
async function sendBroadcastMessageWithGroupManager(message, selectedGroups) {
  if (!isSessionConnected) {
    console.log('❌ Бот-сесія не підключена. Не можу відправити повідомлення.');
    return false;
  }

  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  console.log(`📤 Спроба відправки повідомлення в ${selectedGroups.length} груп через GroupManager`);
  
  for (const group of selectedGroups) {
    try {
      console.log(`📨 Відправка в групу: ${group.name} (${group.id})`);
      
      // Используем умную отправку через GroupManager
      const success = await groupManager.smartSendToGroup(group.name, message);
      
      if (success) {
        console.log(`✅ Успішно відправлено в ${group.name}`);
        successCount++;
      } else {
        console.log(`❌ Не вдалося відправити в ${group.name}`);
        errorCount++;
      }
      
      // Увеличиваем задержку между отправками (3-5 секунд)
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
      
    } catch (err) {
      console.error(`❌ Помилка відправки в групу ${group.name}:`, err.message);
      errors.push({
        group: group.name,
        error: err.message
      });
      errorCount++;
      
      // Если ошибка связана с флуд-контролем, делаем большую паузу
      if (err.message.includes('FLOOD') || err.message.includes('Too Many') || err.message.includes('wait')) {
        console.log('⏸️ Велика пауза через флуд-контроль (30 секунд)...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }
  
  console.log(`📊 Результат розсилки: ${successCount} успішно, ${errorCount} помилок`);
  
  if (errors.length > 0) {
    console.log('❌ Помилки:');
    errors.forEach(error => {
      console.log(`   - ${error.group}: ${error.error}`);
    });
  }
  
  return successCount > 0;
}

// Запуск рассылки с интервалом
// В bot-session.js
function startScheduledBroadcast(message, intervalKey, endDate, selectedGroups) {
  const intervalMap = {
    '1m': 1 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '3h': 3 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };

  const intervalMs = intervalMap[intervalKey];
  if (!intervalMs) {
    console.error(`❌ Неверный интервал: ${intervalKey}`);
    return null;
  }

  // Создаем уникальный ID для этой рассылки
  const broadcastId = `broadcast_${Date.now()}`;
  
  console.log(`🚀 Начало рассылки в ${selectedGroups.length} групп`);
  
  // Функция для отправки сообщения
  const sendBroadcast = async () => {
    try {
      await sendBroadcastMessage(message, selectedGroups);
    } catch (error) {
      console.error('❌ Ошибка при рассылке:', error);
    }
  };

  // Отправляем первое сообщение сразу
  sendBroadcast();

  // Запускаем интервал
  const intervalId = setInterval(() => {
    if (new Date() >= endDate) {
      clearInterval(intervalId);
      activeBroadcasts.delete(broadcastId);
      console.log('🛑 Рассылка завершена по расписанию');
      return;
    }
    console.log(`🔄 Повторная рассылка в ${selectedGroups.length} групп`);
    sendBroadcast();
  }, intervalMs);

  // Сохраняем информацию о рассылке
  activeBroadcasts.set(broadcastId, {
    intervalId,
    message,
    interval: intervalKey,
    endDate,
    startedAt: new Date(),
    targetGroups: selectedGroups.length,
    selectedGroups: selectedGroups.map(g => g.name)
  });

  console.log(`🔄 Рассылка запущена с интервалом ${intervalKey}, завершение: ${endDate}`);
  return broadcastId;
}

// Функция для получения информации о рассылках
function getActiveBroadcasts() {
  return Array.from(activeBroadcasts.entries()).map(([id, info]) => ({
    id,
    ...info,
    targetGroups: info.targetGroups || 'Невідомо'
  }));
}

// Функция остановки рассылки
function stopBroadcast(broadcastId) {
  if (activeBroadcasts.has(broadcastId)) {
    clearInterval(activeBroadcasts.get(broadcastId).intervalId);
    activeBroadcasts.delete(broadcastId);
    console.log(`🛑 Рассылка ${broadcastId} остановлена`);
    return true;
  }
  return false;
}

// Функция остановки ВСЕХ рассылок
function stopAllBroadcasts() {
  let stoppedCount = 0;
  
  // Создаем копию массива для итерации
  const broadcasts = Array.from(activeBroadcasts.entries());
  
  for (const [broadcastId, info] of broadcasts) {
    try {
      clearInterval(info.intervalId);
      activeBroadcasts.delete(broadcastId);
      stoppedCount++;
      console.log(`🛑 Рассылка ${broadcastId} остановлена`);
    } catch (error) {
      console.error(`Ошибка при остановке рассылки ${broadcastId}:`, error);
    }
  }
  
  return stoppedCount;
}

async function start() {
  try {
    isSessionConnected = await connectSession();
    if (isSessionConnected) {
      console.log('👤 Бот-сесія запущена успішно!');
    } else {
      console.log('❌ Бот-сесія не підключена. Розсилка не працюватиме.');
    }
  } catch (error) {
    console.error('❌ Помилка запуску бот-сесії:', error);
    isSessionConnected = false;
  }
}

start();

// Экспортируем функции для использования в других модулях
module.exports = {
  sendBroadcastMessage,
  sendBroadcastMessageWithGroupManager,
  startScheduledBroadcast,
  getActiveBroadcasts,
  stopBroadcast,
  stopAllBroadcasts,
  activeBroadcasts,
  getAllGroups, // Экспортируем функцию вместо константы
  showGroupSelectionMenu
};