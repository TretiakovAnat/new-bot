class CalendarManager {
  constructor() {
    this.userCalendarStates = new Map();
  }

  // Вспомогательный метод для получения названия месяца
  getMonthName(month) {
    const months = [
      'Січень', 'Лютий', 'Березень', 'Квітень', 
      'Травень', 'Червень', 'Липень', 'Серпень', 
      'Вересень', 'Жовтень', 'Листопад', 'Грудень'
    ];
    return months[month];
  }

  // Генерация календаря
 // ... существующий код ...

// Генерация календаря
generateCalendar(year, month, selectedDate = null) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Понедельник - первый день

  const calendar = [];
  let row = [];

  // Пустые ячейки перед первым днем
  for (let i = 0; i < startingDay; i++) {
    row.push({ text: ' ', callback_data: 'calendar_ignore' });
  }

  // Дни месяца
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = this.formatDateForCallback(date);
    
    let buttonText = String(day);
    
    // Подсветка выбранной даты
    if (selectedDate && this.isSameDate(date, selectedDate)) {
      buttonText = `✅ ${day}`;
    }
    // Подсветка сегодняшней даты
    else if (this.isSameDate(date, today)) {
      buttonText = `📅 ${day}`;
    }

    row.push({ 
      text: buttonText, 
      callback_data: `calendar_select_${dateStr}` 
    });

    if (row.length === 7) {
      calendar.push(row);
      row = [];
    }
  }

  // Заполняем оставшиеся ячейки
  if (row.length > 0) {
    while (row.length < 7) {
      row.push({ text: ' ', callback_data: 'calendar_ignore' });
    }
    calendar.push(row);
  }

  // Заголовок с названиями дней недели
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  const headerRow = weekDays.map(day => ({ text: day, callback_data: 'calendar_ignore' }));

  // Навигация - только текущий месяц (без кнопок переключения)
  const navigation = [
    [
      { 
        text: `${this.getMonthName(month)} ${year}`, 
        callback_data: 'calendar_ignore' 
      }
    ]
  ];

  // Кнопки подтверждения и отмены
  const actionButtons = [
    [
      { 
        text: '✅ Підтвердити', 
        callback_data: 'calendar_confirm' 
      },
      { 
        text: '❌ Скасувати', 
        callback_data: 'calendar_cancel' 
      }
    ]
  ];

  return [...navigation, headerRow, ...calendar, ...actionButtons];
}

// ... остальной код без изменений ...

  formatDateForCallback(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  formatDateDisplay(date) {
    return date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  parseDateFromCallback(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  isSameDate(date1, date2) {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  // Начало выбора даты
  async startCalendarSelection(bot, chatId, userId, messageText = '📅 Оберіть дату стажування:') {
    const now = new Date();
    
    // Всегда используем текущий месяц и год
    const calendar = this.generateCalendar(now.getFullYear(), now.getMonth());

    this.userCalendarStates.set(userId, {
      year: now.getFullYear(),
      month: now.getMonth(),
      selectedDate: null,
      chatId: chatId
    });

    await bot.sendMessage(chatId, messageText, {
      reply_markup: {
        inline_keyboard: calendar
      }
    });
  }

  // Обработка callback'ов календаря
  async handleCalendarCallback(bot, query) {
    const userId = query.from.id;
    const chatId = query.message.chat.id;
    const data = query.data;
    const state = this.userCalendarStates.get(userId);

    if (!state) return null;

    try {
      await bot.answerCallbackQuery(query.id);

      // Навигация по месяцам
      if (data.startsWith('calendar_nav_')) {
        const [_, year, month] = data.split('_').slice(2);
        const newYear = parseInt(year);
        const newMonth = parseInt(month);

        this.userCalendarStates.set(userId, {
          ...state,
          year: newYear,
          month: newMonth
        });

        const calendar = this.generateCalendar(newYear, newMonth, state.selectedDate);
        
        await bot.editMessageReplyMarkup(
          { inline_keyboard: calendar },
          {
            chat_id: chatId,
            message_id: query.message.message_id,
          }
        );
        return null;
      }

      // Выбор даты
      if (data.startsWith('calendar_select_')) {
        const dateStr = data.replace('calendar_select_', '');
        const selectedDate = this.parseDateFromCallback(dateStr);

        this.userCalendarStates.set(userId, {
          ...state,
          selectedDate: selectedDate
        });

        const calendar = this.generateCalendar(state.year, state.month, selectedDate);
        
        await bot.editMessageReplyMarkup(
          { inline_keyboard: calendar },
          {
            chat_id: chatId,
            message_id: query.message.message_id,
          }
        );
        return null;
      }

      // Подтверждение выбора
      if (data === 'calendar_confirm') {
        if (!state.selectedDate) {
          await bot.answerCallbackQuery(query.id, { text: '❌ Будь ласка, оберіть дату!' });
          return null;
        }

        this.userCalendarStates.delete(userId);
        
        await bot.editMessageText(
          `✅ Дата обрана: ${this.formatDateDisplay(state.selectedDate)}`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
          }
        );

        return state.selectedDate;
      }

      // Отмена выбора
      if (data === 'calendar_cancel') {
        this.userCalendarStates.delete(userId);
        
        await bot.editMessageText(
          '❌ Вибір дати скасовано',
          {
            chat_id: chatId,
            message_id: query.message.message_id,
          }
        );
        return null;
      }

      // Игнорирование пустых кнопок
      if (data === 'calendar_ignore') {
        return null;
      }

    } catch (error) {
      console.error('Error in calendar callback:', error);
      return null;
    }
  }
}

module.exports = new CalendarManager();