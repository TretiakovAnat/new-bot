// Scheduler.js (исправленная версия)
const userSchedulingStates = new Map();
const { startScheduledBroadcast } = require('./bot-session');
const groupManager = require('./GroupManager'); // Добавляем импорт GroupManager


console.log('Scheduler loaded - GroupManager status:', {
    hasGroups: groupManager.getAllGroups().length > 0,
    groupCount: groupManager.getAllGroups().length,
    lastUpdate: groupManager.lastUpdate
});


// Генерация календаря
function generateCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const calendar = [];
  let row = [];

  // Пустые ячейки перед первым днем
  for (let i = 0; i < startingDay; i++) {
    row.push({ text: ' ', callback_data: 'ignore' });
  }

  // Дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    row.push({ 
      text: String(day), 
      callback_data: `scheduler_date_${dateStr}` 
    });

    if (row.length === 7) {
      calendar.push(row);
      row = [];
    }
  }

  // Заполняем оставшиеся ячейки
  if (row.length > 0) {
    while (row.length < 7) {
      row.push({ text: ' ', callback_data: 'ignore' });
    }
    calendar.push(row);
  }

  // Кнопки навигации
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const navigation = [
    [
      { 
        text: '←', 
        callback_data: `scheduler_month_${prevYear}_${prevMonth}` 
      },
      { 
        text: `${getMonthName(month)} ${year}`, 
        callback_data: 'ignore' 
      },
      { 
        text: '→', 
        callback_data: `scheduler_month_${nextYear}_${nextMonth}` 
      }
    ]
  ];

  return [...navigation, ...calendar];
}

function getMonthName(month) {
  const months = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 
    'Травень', 'Червень', 'Липень', 'Серпень', 
    'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ];
  return months[month];
}

function generateTimeButtons() {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      times.push({
        text: timeStr,
        callback_data: `scheduler_time_${timeStr}`
      });
    }
  }

  // Разбиваем на строки по 4 кнопки
  const rows = [];
  for (let i = 0; i < times.length; i += 4) {
    rows.push(times.slice(i, i + 4));
  }

  return rows;
}

function generateIntervalButtons() {
  return [
    [
      { text: '1 хв', callback_data: 'scheduler_interval_1m' },
      { text: '15 хв', callback_data: 'scheduler_interval_15m' },
      { text: '30 хв', callback_data: 'scheduler_interval_30m' }
    ],
    [
      { text: '1 год', callback_data: 'scheduler_interval_1h' },
      { text: '2 год', callback_data: 'scheduler_interval_2h' },
      { text: '3 год', callback_data: 'scheduler_interval_3h' }
    ],
    [
      { text: '4 год', callback_data: 'scheduler_interval_4h' },
      { text: '6 год', callback_data: 'scheduler_interval_6h' },
      { text: '12 год', callback_data: 'scheduler_interval_12h' }
    ],
    [
      { text: '1 день', callback_data: 'scheduler_interval_1d' }
    ]
  ];
}

// Генерация кнопок выбора групп с использованием GroupManager
// Scheduler.js (исправленная функция generateGroupSelectionButtons)
function generateGroupSelectionButtons(selectedGroups = []) {
    const buttons = [];

    // Получаем группы через менеджер
    const availableGroups = groupManager.getAllGroups();
    
    // Если группы еще не загружены
    if (availableGroups.length === 0) {
        buttons.push([
            { 
                text: '🔄 Групи завантажуються...', 
                callback_data: 'ignore' 
            }
        ]);
        
        buttons.push([
            { 
                text: '🔄 Оновити список груп', 
                callback_data: 'scheduler_refresh_groups' 
            }
        ]);
        
        // Добавляем кнопку возврата в меню
        buttons.push([
            { 
                text: '🏠 Головне меню', 
                callback_data: 'main_menu' 
            }
        ]);
        
        return buttons; // ВАЖНО: возвращаем кнопки здесь
    }
  
    // Кнопка "Выбрать все группы"
    const allGroupsSelected = selectedGroups.length === availableGroups.length && availableGroups.length > 0;

    buttons.push([
        { 
            text: allGroupsSelected ? '✅ Всі групи' : '☑️ Вибрати всі групи', 
            callback_data: 'scheduler_select_all' 
        }
    ]);

    // Кнопки для каждой группы
    availableGroups.forEach((group, index) => {
        const isSelected = selectedGroups.some(g => g.id === group.id);
        const buttonText = isSelected ? `✅ ${group.name}` : `☑️ ${group.name}`;
        
        if (index % 2 === 0) {
            buttons.push([
                { 
                    text: buttonText, 
                    callback_data: `scheduler_group_${group.id}` 
                }
            ]);
        } else {
            // Добавляем к последней строке если она существует
            if (buttons.length > 0) {
                buttons[buttons.length - 1].push({
                    text: buttonText, 
                    callback_data: `scheduler_group_${group.id}`
                });
            } else {
                buttons.push([{
                    text: buttonText, 
                    callback_data: `scheduler_group_${group.id}`
                }]);
            }
        }
    });

    // Кнопка подтверждения выбора
    if (selectedGroups.length > 0) {
        buttons.push([
            { 
                text: `🚀 Розпочати розсилку (${selectedGroups.length} груп)`, 
                callback_data: 'scheduler_groups_done' 
            }
        ]);
    }
    
    buttons.push([
        { 
            text: '🏠 Головне меню', 
            callback_data: 'main_menu' 
        }
    ]);
    
    return buttons;
}

// В Scheduler.js, добавьте в начало файла
console.log('Scheduler loaded - GroupManager status:', {
  hasGroups: groupManager.getAllGroups().length > 0,
  groupCount: groupManager.getAllGroups().length,
  lastUpdate: groupManager.lastUpdate
});

// В Scheduler.js, в функции startScheduling
// В Scheduler.js, в функции startScheduling
async function startScheduling(bot, query) {
    try {
        const chatId = query.message.chat.id;
        const userId = query.from.id;

        // ОБНОВЛЯЕМ ГРУППЫ ПЕРЕД НАЧАЛОМ
        await bot.sendMessage(chatId, '🔄 Оновлюємо список груп...');
        
        const updateSuccess = await groupManager.updateGroupsFromSession();
        const availableGroups = groupManager.getAllGroups();
        
        userSchedulingStates.set(userId, { 
            step: 'waiting_for_message', 
            chatId,
            selectedGroups: [],
            message: null
        });

        if (!updateSuccess || availableGroups.length === 0) {
            await bot.sendMessage(chatId, 
                '❌ Не вдалося отримати список груп. Перевірте підключення сесії.\n\n' +
                'Введіть повідомлення для розсилки, а групи оберемо пізніше:'
            );
        } else {
            await bot.sendMessage(chatId, 
                `✅ Знайдено ${availableGroups.length} груп. Введіть повідомлення для розсилки:`
            );
        }
    } catch (error) {
        console.error('Error in startScheduling:', error);
        await bot.sendMessage(chatId, '❌ Помилка при запуску планування. Спробуйте ще раз.');
    }
}

async function handleSchedulingCallback(bot, query) {
  try {
    const userId = query.from.id;
    const data = query.data;
    const state = userSchedulingStates.get(userId);

    if (!state) return;

    // Обновление списка групп
  // В handleSchedulingCallback добавьте:
if (data === 'scheduler_refresh_groups') {
    await bot.answerCallbackQuery(query.id, { text: '🔄 Оновлюємо список груп...' });
    
    // Принудительно обновляем группы
    await groupManager.updateGroupsFromSession();
    const availableGroups = groupManager.getAllGroups();
    
    // Обновляем кнопки выбора групп
    const groupButtons = generateGroupSelectionButtons(state.selectedGroups || []);
    
    await bot.editMessageReplyMarkup(
        { inline_keyboard: groupButtons },
        {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
        }
    );
    return;
}

    // Выбор всех групп
    if (data === 'scheduler_select_all') {
      const availableGroups = groupManager.getAllGroups();
      let selectedGroups = state.selectedGroups || [];
      
      if (selectedGroups.length === availableGroups.length) {
        // Если уже выбраны все, очищаем выбор
        selectedGroups = [];
      } else {
        // Выбираем все группы
        selectedGroups = [...availableGroups];
      }
      
      // Обновляем состояние
      userSchedulingStates.set(userId, {
        ...state,
        selectedGroups
      });
      
      // Обновляем кнопки выбора групп
      const groupButtons = generateGroupSelectionButtons(selectedGroups);
      
      await bot.editMessageReplyMarkup(
        { inline_keyboard: groupButtons },
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
        }
      );
      return;
    }

    // Выбор отдельных групп
// В handleSchedulingCallback, в части выбора отдельных групп
if (data.startsWith('scheduler_group_')) {
    // Парсим ID как строку, потом приведём к примитиву BigInt
    const raw = data.replace('scheduler_group_', '');
    let groupId;
    try {
        groupId = BigInt(raw);
    } catch (e) {
        console.error('Cannot parse groupId to BigInt:', raw, e);
        await bot.answerCallbackQuery(query.id, { text: '❌ Некоректний ID групи!' });
        return;
    }

    const availableGroups = groupManager.getAllGroups();

    console.log('Available groups:', availableGroups.map(g => ({ id: g.id.toString(), name: g.name })));
    console.log('Looking for group ID:', groupId.toString());

    // Находим группу: нужно сравнивать BigInt, и если g.id — обёртка, получать её value
    const group = availableGroups.find(g => {
        // если g.id уже BigInt примитив
        if (typeof g.id === 'bigint') {
            return g.id === groupId;
        }
        // если это объект с полем value (как из библиотеки)
        if (g.id && typeof g.id.value === 'bigint') {
            return g.id.value === groupId;
        }
        // если число
        if (typeof g.id === 'number') {
            return BigInt(g.id) === groupId;
        }
        return false;
    });

    if (!group) {
        console.error('Group not found:', groupId.toString());
        await bot.answerCallbackQuery(query.id, { text: '❌ Група не знайдена!' });
        return;
    }

    // Получаем состояние
    const state = userSchedulingStates.get(userId) || {};
    let selectedGroups = state.selectedGroups || [];

    // Проверка, есть ли уже эта группа в selectedGroups
    const existingIndex = selectedGroups.findIndex(g => {
        // повторим ту же логику сравнения
        if (typeof g.id === 'bigint') {
            return g.id === groupId;
        }
        if (g.id && typeof g.id.value === 'bigint') {
            return g.id.value === groupId;
        }
        if (typeof g.id === 'number') {
            return BigInt(g.id) === groupId;
        }
        return false;
    });

    if (existingIndex >= 0) {
        // Удаляем
        selectedGroups.splice(existingIndex, 1);
    } else {
        // Добавляем
        selectedGroups.push(group);
    }

    // Сохраняем новое состояние
    userSchedulingStates.set(userId, {
        ...state,
        selectedGroups
    });

    // Обновляем кнопки, чтобы визуально отобразить выбор
    const groupButtons = generateGroupSelectionButtons(selectedGroups);

    await bot.editMessageReplyMarkup(
      { inline_keyboard: groupButtons },
      {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
      }
    );

    await bot.answerCallbackQuery(query.id, { text: '✅ Група оновлена' });
    return;
}


    // Завершение выбора групп
    if (data === 'scheduler_groups_done') {
      if (!state.selectedGroups || state.selectedGroups.length === 0) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Оберіть хоча б одну групу!' });
        return;
      }
      
      userSchedulingStates.set(userId, {
        ...state,
        step: 'waiting_for_date'
      });
      
      const now = new Date();
      const calendar = generateCalendar(now.getFullYear(), now.getMonth());
      
      await bot.editMessageText(
        `📅 Оберіть дату закінчення розсилки (обрано груп: ${state.selectedGroups.length}):`,
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          reply_markup: { inline_keyboard: calendar }
        }
      );
      return;
    }

    // Навигация по месяцам
    if (data.startsWith('scheduler_month_')) {
      const [_, year, month] = data.split('_').slice(1);
      const calendar = generateCalendar(parseInt(year), parseInt(month));
      
      await bot.editMessageReplyMarkup(
        { inline_keyboard: calendar },
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
        }
      );
      return;
    }

    // Выбор даты
    if (data.startsWith('scheduler_date_')) {
      const date = data.replace('scheduler_date_', '');
      userSchedulingStates.set(userId, { 
        ...state, 
        step: 'waiting_for_time', 
        selectedDate: date 
      });

      const timeButtons = generateTimeButtons();
      
      await bot.editMessageText(
        `Оберіть час закінчення розсилки (${date}):`,
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          reply_markup: { inline_keyboard: timeButtons }
        }
      );
      return;
    }

    // Выбор времени
    if (data.startsWith('scheduler_time_')) {
      const time = data.replace('scheduler_time_', '');
      userSchedulingStates.set(userId, { 
        ...state, 
        step: 'waiting_for_interval', 
        selectedTime: time 
      });

      const intervalButtons = generateIntervalButtons();
      
      await bot.editMessageText(
        `Оберіть інтервал розсилки (${state.selectedDate} ${time}):`,
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          reply_markup: { inline_keyboard: intervalButtons }
        }
      );
      return;
    }

    // Выбор интервала
    if (data.startsWith('scheduler_interval_')) {
      const interval = data.replace('scheduler_interval_', '');
      const scheduledDate = new Date(`${state.selectedDate}T${state.selectedTime}`);
      
      // Проверяем что дата в будущем
      if (scheduledDate <= new Date()) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Дата повинна бути у майбутньому!' });
        return;
      }
      
      // Запускаем рассылку через сессию
      try {
        const broadcastId = startScheduledBroadcast(state.message, interval, scheduledDate, state.selectedGroups);
        
        const groupNames = state.selectedGroups.map(g => g.name).join(', ');
        const intervalText = interval.replace('m', ' хв').replace('h', ' год').replace('d', ' день');
        
        await bot.editMessageText(
          `✅ Розсилка запущена!\n\nID: ${broadcastId}\nІнтервал: ${intervalText}\nЗавершення: ${state.selectedDate} ${state.selectedTime}\nГрупи: ${state.selectedGroups.length}\n${groupNames}`,
          {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
          }
        );
      } catch (error) {
        console.error('Error starting broadcast:', error);
        await bot.answerCallbackQuery(query.id, { text: '❌ Помилка при запуску розсилки!' });
      }
      
      userSchedulingStates.delete(userId);
      return;
    }

    // Игнорируем пустые кнопки
    if (data === 'ignore') {
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // Возврат в главное меню
    if (data === 'main_menu') {
      userSchedulingStates.delete(userId);
      await bot.editMessageText(
        '🏠 Повернення до головного меню',
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
        }
      );
      return;
    }
  } catch (error) {
    console.error('Error in handleSchedulingCallback:', error);
    try {
      await bot.answerCallbackQuery(query.id, { text: '❌ Сталася помилка!' });
    } catch (e) {
      console.error('Error sending error message:', e);
    }
  }
}

// Обработка текстовых сообщений для получения сообщения рассылки
async function handleSchedulingMessage(bot, msg) {
  try {
    const userId = msg.from.id;
    const state = userSchedulingStates.get(userId);

    if (!state || state.step !== 'waiting_for_message') return;

    // Сохраняем сообщение
    userSchedulingStates.set(userId, {
      ...state,
      step: 'selecting_groups',
      message: msg.text
    });

    // Показываем кнопки выбора групп
    const groupButtons = generateGroupSelectionButtons([]);
    
    await bot.sendMessage(
      msg.chat.id,
      '✅ Повідомлення збережено! Тепер оберіть групи для розсилки:',
      {
        reply_markup: { inline_keyboard: groupButtons }
      }
    );
  } catch (error) {
    console.error('Error in handleSchedulingMessage:', error);
  }
}

module.exports = {
  startScheduling,
  handleSchedulingCallback,
  handleSchedulingMessage,
  userSchedulingStates,
  generateCalendar,
  generateTimeButtons,
  generateIntervalButtons,
  generateGroupSelectionButtons
};