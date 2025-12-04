require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const {
  startQuestionnaire,
  handleQuestionnaireMessage,
  handleQuestionnaireCallback,
  userQuestionnaireStates // добавь это
} = require('./Questionnaire');
const { startScheduling, handleSchedulingCallback, userSchedulingStates, generateGroupSelectionButtons, generateCalendar } = require('./Scheduler');
const { getActiveBroadcasts, stopBroadcast, stopAllBroadcasts } = require('./bot-session');
const { startCategorySelection, handleCategoryCallback, handleConfirmationCallback, getUserCategory } = require('./Categories');
const { checkGoogleSheets } = require('./googleSheets');
const { startReminderScheduler } = require('./reminders');
const SessionManager = require('./SessionManager');
const SessionUtils = require('./session/SessionUtils'); // Добавляем импорт SessionUtils


const token = process.env.BOT_TOKEN;
const admins = process.env.ADMINS ? process.env.ADMINS.split(',').map(id => Number(id.trim())) : [];

const bot = new TelegramBot(token, { polling: true });

// Проверка подключения к Google Sheets при запуске
setTimeout(async () => {
    const { checkGoogleSheets } = require('./googleSheets');
    const isConnected = await checkGoogleSheets();
    console.log(isConnected ? '✅ Google Sheets подключено' : '❌ Google Sheets не подключено');
}, 2000);

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('webhook_error', (error) => {
  console.error('Webhook error:', error);
});

// Функция для обновления сессии при любом сообщении
async function updateUserSession(msg) {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    
    await SessionManager.updateSession(userId, {
        chat_id: chatId,
        username: msg.from.username,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name
    });
    
    console.log(`📝 Сессия обновлена для пользователя ${userId}`);
}

// Красивое приветственное сообщение для CleanЧиствуд
const welcomeMessage = `
🏠 CleanЧиствуд 

Привіт 👋 
Ми — компанія CleanЧиствуд, займаємось професійним прибиранням квартир та офісів.

📱 Наш Instagram: 
https://www.instagram.com/clean_chistwood

🌐 Наш сайт:
https://www.cleanchistwood.com.ua/

👉 Оберіть вашу категорію та заповніть анкету:
`;

// Функция показа меню администратора
function showAdminMenu(chatId) {
  bot.sendMessage(chatId, '🏠 CleanЧиствуд - Панель адміністратора', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📤 Запланувати розсилку', callback_data: 'schedule' }],
        [{ text: '📋 Мої розсилки', callback_data: 'broadcasts' }],
        [{ text: '⛔ Зупинити всі розсилки', callback_data: 'stop_all_broadcasts' }],
        [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
      ],
    },
  });
}

// Функция для показа главного меню
function showMainMenu(chatId, userId) {
  const isAdmin = admins.includes(userId);
  
  if (isAdmin) {
    showAdminMenu(chatId);
  } else {
    const userCategory = getUserCategory(userId);
    
    if (userCategory) {
      bot.sendMessage(chatId, `🏠 CleanЧиствуд\n\n👋 Вітаємо знову! Ваша категорія: ${userCategory.categoryName}\n\nЩо бажаєте зробити?`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Додати категорію', callback_data: 'change_category' }],
            [{ text: '📱 Наш Instagram', url: 'https://www.instagram.com/clean_chistwood?igsh=MXhuMWtwNmpyNTBjNg==' }],
            [{ text: '🌐 Наш сайт', url: 'https://www.cleanchistwood.com.ua/' }],
            [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
          ]
        }
      });
    } else {
      bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚗 Водій', callback_data: 'category_driver' }],
            [{ text: '🧹 Клінер', callback_data: 'category_cleaner' }],
            [{ text: '📋 HR', callback_data: 'category_hr' }],
            [{ text: '👔 Менеджер', callback_data: 'category_manager' }],
            [{ text: '📱 SMM', callback_data: 'category_smm' }],
            [{ text: '📦 Комірник', callback_data: 'category_storekeeper' }],
            [{ text: '🏢 Працівник ТРЦ', callback_data: 'category_mall_worker' }],
            [
              { text: '📱 Наш Instagram', url: 'https://www.instagram.com/clean_chistwood?igsh=MXhuMWtwNmpyNTBjNg==' },
              { text: '🌐 Наш сайт', url: 'https://www.cleanchistwood.com.ua/' }
            ],
            [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
          ]
        }
      });
    }
  }
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Обновляем сессию при старте
  await updateUserSession(msg);
  
  showMainMenu(chatId, userId);
});
async function finishQuestionnaire(bot, userId, chatId, state) {
  try {
    // Пример: отправка финального сообщения
   await bot.sendMessage(chatId, '✅ Дякуємо, ви успішно заповнили анкету!', {
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: '✉️ Написати HR',
          url: 'https://t.me/CleanHR'
        }
      ]
    ]
  }
});

    // Здесь можно сохранить данные анкети в Google Sheets или БД
    // Например:
    // await saveQuestionnaireToSheet(state);

    // Очистить состояние, если ещё не удалено
    // userQuestionnaireStates.delete(userId); // Обычно удаляется в вызывающем коде

  } catch (err) {
    console.error(`❌ Помилка при завершенні анкети для ${userId}:`, err);
    await bot.sendMessage(chatId, '⚠️ Сталася помилка при завершенні анкети. Спробуйте пізніше.');
  }
}


bot.on('callback_query', async (query) => {
  try {
    // Обновляем сессию при callback
    await updateUserSession(query.message);
    
    const userId = query.from.id;
    const isAdmin = admins.includes(userId);
    const chatId = query.message.chat.id;

    console.log('Callback received:', query.data);

    // Всегда отвечаем на callback query сначала
    await bot.answerCallbackQuery(query.id).catch(err => {
      console.log('Callback query already answered or expired:', err.message);
    });

// Обработка callback'ов календаря - передаем в CalendarManager
// Обработка callback'ов календаря - передаем в CalendarManager
// Обработка callback'ов календаря - передаем в CalendarManager
if (query.data.startsWith('calendar_')) {
  const calendarManager = require('./CalendarManager');
  const result = await calendarManager.handleCalendarCallback(bot, query);
  
  // Если календарь вернул дату (подтверждение), обрабатываем в анкете
  if (result instanceof Date) {
    const state = userQuestionnaireStates.get(userId);
    if (state) {
      // Сохраняем ответ с датой
      const questions = require('./QuestionManager').getFullQuestionsForCategory(state.category);
      const currentQuestion = questions[state.currentQuestion];
      const shortQuestions = require('./QuestionManager').getQuestionsForCategory(state.category);
      const shortQuestion = shortQuestions[state.currentQuestion].question;
      
      state.answers.push({
        question: shortQuestion,
        fullQuestion: currentQuestion.question,
        answer: result.toLocaleDateString('uk-UA')
      });

      // Переходим к следующему вопросу
      state.currentQuestion++;

      // Если вопросы закончились
      if (state.currentQuestion >= questions.length) {
        await finishQuestionnaire(bot, userId, chatId, state);
        userQuestionnaireStates.delete(userId);
      } else {
        // Отправляем следующий вопрос
        const { sendNextQuestion } = require('./Questionnaire');
        await sendNextQuestion(bot, userId, chatId);
      }
    }
  }
  return;
}

    // Обработка callback'ов планировщика - ДОБАВЛЕНО В НАЧАЛО
    if (query.data.startsWith('scheduler_')) {
      await handleSchedulingCallback(bot, query);
      return;
    }

    // Обработка подтверждения ознакомления
    if (query.data.startsWith('confirm_')) {
      await handleConfirmationCallback(bot, query);
      return;
    }

    // Обработка главного меню
    if (query.data === 'main_menu') {
      try {
        await bot.deleteMessage(chatId, query.message.message_id);
      } catch (deleteError) {
        console.log('Cannot delete message:', deleteError.message);
      }
      
      showMainMenu(chatId, userId);
      return;
    }

    // Обработка категорий (для всех пользователей)
    if (query.data.startsWith('category_')) {
      await handleCategoryCallback(bot, query);
      return;
    }

    if (query.data === 'change_category') {
      await bot.sendMessage(chatId, '🏠 CleanЧиствуд\n\n👋 Оберіть вашу категорію:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚗 Водій', callback_data: 'category_driver' }],
            [{ text: '🧹 Клінер', callback_data: 'category_cleaner' }],
            [{ text: '📋 HR', callback_data: 'category_hr' }],
            [{ text: '👔 Менеджер', callback_data: 'category_manager' }],
            [{ text: '📱 SMM', callback_data: 'category_smm' }],
            [{ text: '📦 Комірник', callback_data: 'category_storekeeper' }],
            [{ text: '🏢 Працівник ТРЦ', callback_data: 'category_mall_worker' }],
            [
              { text: '📱 Наш Instagram', url: 'https://www.instagram.com/clean_chistwood?igsh=MXhuMWtwNmpyNTBjNg==' },
              { text: '🌐 Наш сайт', url: 'https://www.cleanchistwood.com.ua/' }
            ],
            [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
          ]
        }
      });
      return;
    }

    // Админские функции
    if (isAdmin) {
      if (query.data === 'schedule') {
        await startScheduling(bot, query);
        return;
      }

      if (query.data === 'broadcasts') {
        await showActiveBroadcasts(chatId);
        return;
      }

      if (query.data === 'stop_all_broadcasts') {
        const stoppedCount = stopAllBroadcasts();
        
        if (stoppedCount > 0) {
          await bot.sendMessage(chatId, `✅ Зупинено ${stoppedCount} розсилок`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
              ]
            }
          });
        } else {
          await bot.sendMessage(chatId, '❌ Активних розсилок немає', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
              ]
            }
          });
        }
        return;
      }

      // УДАЛЕНО: обработка планировщика отсюда, так как она теперь в начале
    }

    // Анкета (для всех пользователей)
    if (query.data === 'questionnaire') {
      const userCategory = getUserCategory(userId);
      if (!userCategory && !isAdmin) {
        await bot.sendMessage(chatId, '❌ Спочатку оберіть категорію!');
        showMainMenu(chatId, userId);
        return;
      }
      await startQuestionnaire(bot, query);
      return;
    }

 try {
    await handleQuestionnaireCallback(bot, query);
} catch (error) {
    console.error('Error in questionnaire callback:', error);
    // Если это ошибка из-за отсутствия userQuestionnaireStates, обрабатываем календарь
    if (error.message.includes('userQuestionnaireStates is not defined')) {
        // Пробуем обработать как callback календаря
        const calendarManager = require('./CalendarManager');
        const result = await calendarManager.handleCalendarCallback(bot, query);
        if (result === null) {
            // Календарь обработал callback успешно
            return;
        }
    }
}
    
  } catch (error) {
    console.error('Error in callback handler:', error);
  }
});

// Функция показа активных рассылок
async function showActiveBroadcasts(chatId) {
  try {
    const broadcasts = getActiveBroadcasts();
    console.log('Active broadcasts:', broadcasts);
    
    if (!broadcasts || broadcasts.length === 0) {
      await bot.sendMessage(chatId, '📭 Активних розсилок немає.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
          ]
        }
      });
      return;
    }
    
    let message = '📋 Активні розсилки:\n\n';
    
    broadcasts.forEach((broadcast, index) => {
      try {
        const elapsed = Math.floor((new Date() - new Date(broadcast.startedAt)) / 1000 / 60);
        const messagePreview = broadcast.message ? 
          (broadcast.message.substring(0, 50) + (broadcast.message.length > 50 ? '...' : '')) : 
          'Немає тексту';
        
        message += `${index + 1}. Розсилка ID: ${broadcast.id || 'Невідомо'}\n`;
        message += `Повідомлення: ${messagePreview}\n`;
        message += `Групи: ${broadcast.targetGroups}\n`;
        
        if (broadcast.selectedGroups && broadcast.selectedGroups.length > 0) {
          message += `Обрано: ${broadcast.selectedGroups.join(', ')}\n`;
        }
        
        message += `Інтервал: ${formatInterval(broadcast.interval)}\n`;
        message += `Запущена: ${formatDate(broadcast.startedAt)}\n`;
        
        if (broadcast.endDate) {
          message += `Завершення: ${formatDate(broadcast.endDate)}\n`;
        }
        
        message += `Працює: ${elapsed} хв.\n\n`;
      } catch (error) {
        console.error('Error formatting broadcast:', error);
        message += `${index + 1}. Помилка форматування розсилки\n\n`;
      }
    });
    
    message += 'ℹ️ Використовуйте: /stop_broadcast <ID> для зупинки конкретної розсилки';
    
    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⛔ Зупинити всі', callback_data: 'stop_all_broadcasts' }],
          [{ text: '🔄 Оновити', callback_data: 'broadcasts' }],
          [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
        ]
      }
    });

  } catch (error) {
    console.error('Error showing broadcasts:', error);
    await bot.sendMessage(chatId, '❌ Сталася помилка при отриманні списку розсилок\n\n' + error.message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
        ]
      }
    });
  }
}

// Вспомогательные функции форматирования
function formatInterval(interval) {
  const intervals = {
    '1m': '1 хвилина',
    '15m': '15 хвилин',
    '30m': '30 хвилин',
    '1h': '1 година',
    '2h': '2 години',
    '3h': '3 години',
    '4h': '4 години',
    '6h': '6 годин',
    '12h': '12 годин',
    '1d': '1 день'
  };
  return intervals[interval] || interval;
}

function formatDate(date) {
  try {
    if (!date) return 'невідомо';
    return new Date(date).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'невідомо';
  }
}

bot.on('message', async (msg) => {
  try {
    // Обновляем сессию при любом сообщении
    await updateUserSession(msg);
    
    // Остальная логика обработки сообщений...
    const userId = msg.from.id;
    const isAdmin = admins.includes(userId);

    // Обработка сообщений для планировщика
    const schedulingState = userSchedulingStates.get(userId);
    if (schedulingState && schedulingState.step === 'waiting_for_message') {
      const groupButtons = generateGroupSelectionButtons([]);
      
      userSchedulingStates.set(userId, {
        ...schedulingState,
        step: 'selecting_groups',
        message: msg.text
      });

      await bot.sendMessage(schedulingState.chatId, 
        `📋 Оберіть групи для розсилки:\n\nПовідомлення: ${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}`,
        {
          reply_markup: { inline_keyboard: groupButtons }
        }
      );
      return;
    }

    // Обработка команды остановки рассылки
    if (isAdmin && msg.text && msg.text.startsWith('/stop_broadcast ')) {
      const broadcastId = msg.text.split(' ')[1];
      if (broadcastId && stopBroadcast(broadcastId)) {
        await bot.sendMessage(msg.chat.id, `✅ Розсилка ${broadcastId} зупинена.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
            ]
          }
        });
      } else {
        await bot.sendMessage(msg.chat.id, `❌ Розсилка з ID ${broadcastId} не знайдена.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
            ]
          }
        });
      }
      return;
    }

    // Обработка команды /menu
    if (msg.text === '/menu') {
      showMainMenu(msg.chat.id, userId);
      return;
    }

    // Обработка команды /category
    if (msg.text === '/category' && !isAdmin) {
      showMainMenu(msg.chat.id, userId);
      return;
    }

    // Обработка команды /instagram
    if (msg.text === '/instagram') {
      bot.sendMessage(msg.chat.id, '📱 Наш Instagram:\nhttps://www.instagram.com/clean_chistwood\n\n🌐 Наш сайт:\nhttps://www.cleanchistwood.com.ua/', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📱 Instagram', url: 'https://www.instagram.com/clean_chistwood' },
              { text: '🌐 Сайт', url: 'https://www.cleanchistwood.com.ua/' }
            ],
            [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
          ]
        }
      });
      return;
    }

    // Обработка команды /help
    if (msg.text === '/help') {
      let helpText = '🏠 CleanЧиствуд - Довідка\n\n';
      helpText += 'Доступні команди:\n';
      helpText += '/start - Почати роботу з ботом\n';
      helpText += '/menu - Головне меню\n';
      helpText += '/category - Змінити категорію\n';
      helpText += '/instagram - Наші соцмережі\n';
      helpText += '/help - Ця довідка\n\n';
      
      if (isAdmin) {
        helpText += 'Команди адміністратора:\n';
        helpText += '/groups - Статистика груп\n';
        helpText += '/update_groups - Оновити групи\n';
        helpText += '/group_list - Список груп\n';
        helpText += '/stop_broadcast <ID> - Зупинити розсилку\n';
      }
      
      bot.sendMessage(msg.chat.id, helpText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Головне меню', callback_data: 'main_menu' }]
          ]
        }
      });
      return;
    }

    // Добавленные команды для работы с группами
    if (isAdmin && msg.text === '/groups') {
      const groupManager = require('./GroupManager');
      const stats = groupManager.getDatabaseStats();
      
      let message = `📊 Статистика групп:\n\n`;
      message += `📋 Всего в базе: ${stats.totalGroups}\n`;
      message += `🔄 Доступно через сессию: ${stats.availableGroups}\n`;
      message += `🕐 Последнее обновление: ${stats.lastUpdate ? stats.lastUpdate.toLocaleString('uk-UA') : 'никогда'}\n`;
      message += `📚 Групп с историей ID: ${stats.groupsWithHistory}\n\n`;
      message += `Используйте /update_groups для принудительного обновления`;

      await bot.sendMessage(msg.chat.id, message);
      return;
    }

    if (isAdmin && msg.text === '/update_groups') {
      const groupManager = require('./GroupManager');
      const success = await groupManager.updateGroupsFromSession();
      
      if (success) {
        const stats = groupManager.getDatabaseStats();
        await bot.sendMessage(msg.chat.id, 
          `✅ Группы успешно обновлены!\n\n` +
          `Доступно групп: ${stats.availableGroups}\n` +
          `Последнее обновление: ${stats.lastUpdate.toLocaleString('uk-UA')}`
        );
      } else {
        await bot.sendMessage(msg.chat.id, '❌ Не удалось обновить группы');
      }
      return;
    }

    if (isAdmin && msg.text === '/group_list') {
      const groupManager = require('./GroupManager');
      const groups = groupManager.getAllGroups();
      
      if (groups.length === 0) {
        await bot.sendMessage(msg.chat.id, '📭 Нет доступных групп');
        return;
      }
      
      let message = `📋 Доступные группы (${groups.length}):\n\n`;
      
      groups.forEach((group, index) => {
        message += `${index + 1}. ${group.name}\n`;
        message += `   ID: ${group.id}\n`;
        message += `   Username: ${group.username || 'нет'}\n`;
        message += `   Тип: ${group.isChannel ? 'Канал' : 'Группа'}\n`;
        message += '---\n';
      });
      
      // Разбиваем сообщение если слишком длинное
      if (message.length > 4000) {
        const parts = message.match(/[\s\S]{1,4000}/g) || [];
        for (const part of parts) {
          await bot.sendMessage(msg.chat.id, part);
        }
      } else {
        await bot.sendMessage(msg.chat.id, message);
      }
      return;
    }

    // Обработка анкеты
    const userCategory = getUserCategory(userId);
    if (userCategory && !isAdmin) {
      await handleQuestionnaireMessage(bot, msg);
      return;
    }

    // Если сообщение не обработано, показываем главное меню
    if (!msg.text?.startsWith('/')) {
      showMainMenu(msg.chat.id, userId);
    }

  } catch (error) {
    console.error('Error in message handler:', error);
  }
});

// Запуск планировщика напоминаний
startReminderScheduler(bot);

console.log('🤖 Бот запущен...');

module.exports = bot;