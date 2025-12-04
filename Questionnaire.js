const userQuestionnaireStates = new Map();

const { getUserCategory } = require('./Categories');
const { saveQuestionnaireToSheet } = require('./googleSheets');
const { getFullQuestionsForCategory, getQuestionsForCategory } = require('./QuestionManager');
const calendarManager = require('./CalendarManager');
const SessionManager = require('./session/SessionManager');

// Функция для создания безопасного callback_data
function createSafeCallbackData(questionId, optionText) {
  const safeText = optionText
    .replace(/[^a-zA-Z0-9а-яіїєґІЇЄҐ]/g, '')
    .substring(0, 30);
  return `ans_${questionId}_${safeText}`;
}

// Функция для извлечения оригинального текста из callback_data
function extractOriginalText(callbackData, questions, currentQuestionId) {
  if (callbackData.startsWith('ans_')) {
    const parts = callbackData.split('_');
    const questionId = parseInt(parts[1], 10);
    const safeText = parts.slice(2).join('_');
    const question = questions.find(q => q.id === questionId);
    if (question && question.type === 'options') {
      const originalOption = question.options.find(opt =>
        opt.replace(/[^a-zA-Z0-9а-яіїєґІЇЄҐ]/g, '') === safeText
      );
      return originalOption || safeText;
    }
  }
  return callbackData.replace('answer_', '');
}

// Проверка телефона (украинские форматы)
function isValidPhoneNumber(phone) {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  const ukrainianPatterns = [
    /^380\d{9}$/, // 380XXXXXXXXX
    /^0\d{9}$/,   // 0XXXXXXXXX
    /^\d{10}$/,   // XXXXXXXXXX
    /^\+380\d{9}$/ // +380XXXXXXXXX
  ];
  return ukrainianPatterns.some(pattern => pattern.test(cleanPhone));
}

// Проверка валидности URL
function isValidURL(url) {
  if (!url) return false;
  try {
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?$/;
    return urlPattern.test(url.trim());
  } catch {
    return false;
  }
}

// Запуск анкеты
async function startQuestionnaire(bot, query) {
  try {
    const chatId = query.message.chat.id;
    const userId = query.from.id;

    const userData = {
      first_name: query.from.first_name,
      last_name: query.from.last_name,
      username: query.from.username,
    };

    const userCategory = getUserCategory(userId);
    if (!userCategory) {
      await bot.sendMessage(chatId, '❌ Спочатку оберіть категорію!');
      return;
    }

    userQuestionnaireStates.set(userId, {
      category: userCategory.category,
      categoryName: userCategory.categoryName,
      currentQuestion: 0,
      answers: [],
      chatId,
      userData,
    });

    await sendNextQuestion(bot, userId, chatId);
  } catch (error) {
    console.error('Error in startQuestionnaire:', error);
  }
}

// Отправка следующего вопроса
async function sendNextQuestion(bot, userId, chatId) {
  try {
    const state = userQuestionnaireStates.get(userId);
    if (!state) return;

    const questions = getFullQuestionsForCategory(state.category);
    if (!questions || questions.length === 0) {
      await bot.sendMessage(chatId, '❌ Для вашої категорії ще не налаштовані питання.');
      userQuestionnaireStates.delete(userId);
      return;
    }

    const currentQuestion = questions[state.currentQuestion];

    if (currentQuestion.type === 'text') {
      await bot.sendMessage(chatId, currentQuestion.question);
    } else if (currentQuestion.type === 'options') {
      const keyboard = currentQuestion.options.map(option => [
        {
          text: option,
          callback_data: createSafeCallbackData(currentQuestion.id, option),
        },
      ]);

      await bot.sendMessage(chatId, currentQuestion.question, {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } else if (currentQuestion.type === 'calendar') {
      await calendarManager.startCalendarSelection(bot, chatId, userId, currentQuestion.question);
    }
  } catch (error) {
    console.error('Error in sendNextQuestion:', error);
  }
}

// Обработка callback из анкеты
async function handleQuestionnaireCallback(bot, query) {
  try {
    const userId = query.from.id;
    const chatId = query.message.chat.id;
    const state = userQuestionnaireStates.get(userId);

    if (!state) return;

    // Обработка календаря
    if (query.data.startsWith('calendar_')) {
      const selectedDate = await calendarManager.handleCalendarCallback(bot, query);

      if (selectedDate) {
        const questions = getFullQuestionsForCategory(state.category);
        const currentQuestion = questions[state.currentQuestion];
        const shortQuestions = getQuestionsForCategory(state.category);
        const shortQuestion = shortQuestions[state.currentQuestion]?.question || '';

        state.answers.push({
          question: shortQuestion,
          fullQuestion: currentQuestion.question,
          answer: selectedDate.toLocaleDateString('uk-UA'),
        });

        state.currentQuestion++;

        if (state.currentQuestion >= questions.length) {
          await finishQuestionnaire(bot, userId, chatId, state);
          userQuestionnaireStates.delete(userId);
        } else {
          await sendNextQuestion(bot, userId, chatId);
        }
      }
      return;
    }

    // Обработка обычных ответов
    const questions = getFullQuestionsForCategory(state.category);
    const currentQuestion = questions[state.currentQuestion];

    let answer;
    if (query.data.startsWith('ans_')) {
      answer = extractOriginalText(query.data, questions, currentQuestion.id);
    } else if (query.data.startsWith('answer_')) {
      answer = query.data.replace('answer_', '');
    } else {
      return;
    }

    const shortQuestions = getQuestionsForCategory(state.category);
    const shortQuestion = shortQuestions[state.currentQuestion]?.question || '';

    state.answers.push({
      question: shortQuestion,
      fullQuestion: currentQuestion.question,
      answer,
    });

    state.currentQuestion++;

    await bot.answerCallbackQuery(query.id, { text: '✅ Відповідь збережено' });

    if (state.currentQuestion >= questions.length) {
      await finishQuestionnaire(bot, userId, chatId, state);
      userQuestionnaireStates.delete(userId);
    } else {
      await sendNextQuestion(bot, userId, chatId);
    }
  } catch (error) {
    console.error('Error in handleQuestionnaireCallback:', error);
  }
}

// Обработка текстовых сообщений (ответы на вопросы)
async function handleQuestionnaireMessage(bot, msg) {
  try {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const text = msg.text;
    const state = userQuestionnaireStates.get(userId);

    if (!state || !text) return;

    const questions = getFullQuestionsForCategory(state.category);
    const currentQuestion = questions[state.currentQuestion];

    if (currentQuestion && currentQuestion.type === 'text') {
      const isPhoneQuestion = /телефон|Телефон|номер/.test(currentQuestion.question);
      const isPortfolioQuestion = state.category === 'smm' && /портфоліо|Портфоліо|посилання|робіт/.test(currentQuestion.question);

      if (isPhoneQuestion && !isValidPhoneNumber(text)) {
        await bot.sendMessage(
          chatId,
          '❌ Будь ласка, введіть коректний номер телефону у форматі:\n' +
            '• +380XXXXXXXXX\n' +
            '• 0XXXXXXXXX\n' +
            '• XXXXXXXXXX\n\n' +
            'Приклад: +380991234567 або 0991234567'
        );
        return;
      }

      if (isPortfolioQuestion && !isValidURL(text) && text.toLowerCase() !== 'немає') {
        await bot.sendMessage(
          chatId,
          '❌ Будь ласка, введіть коректне посилання (URL).\n\n' +
            'Приклади валідних посилань:\n' +
            '• https://www.instagram.com/your_profile\n' +
            '• http://example.com/portfolio\n' +
            '• t.me/your_channel\n\n' +
            'Введіть коректне посилання або напишіть "немає" якщо у вас немає портфоліо.'
        );
        return;
      }

      const shortQuestions = getQuestionsForCategory(state.category);
      const shortQuestion = shortQuestions[state.currentQuestion]?.question || '';

      state.answers.push({
        question: shortQuestion,
        fullQuestion: currentQuestion.question,
        answer: text,
      });

      state.currentQuestion++;

      if (state.currentQuestion >= questions.length) {
        await finishQuestionnaire(bot, userId, chatId, state);
        userQuestionnaireStates.delete(userId);
      } else {
        await sendNextQuestion(bot, userId, chatId);
      }
    }
  } catch (error) {
    console.error('Error in handleQuestionnaireMessage:', error);
  }
}

// Завершение анкеты и отправка результатов
// Завершение анкеты и отправка результатов
// Завершение анкеты и отправка результатов
async function finishQuestionnaire(bot, userId, chatId, state) {
  try {
    console.log('🚀 finishQuestionnaire вызвана для пользователя:', userId);

    // Обновление сессии
    await SessionManager.updateSession(userId, {
      category: state.category,
      categoryName: state.categoryName,
      questionnaire_completed: true,
      questionnaire_date: new Date().toISOString(),
    });

    // Формируем сообщение с результатами
    let message = `🎉 Анкету завершено! Категорія: ${state.categoryName}\n\n📋 Ваші відповіді:\n\n`;
    
    state.answers.forEach((item, index) => {
      message += `${index + 1}. ${item.fullQuestion}\n   Відповідь: ${item.answer}\n\n`;
    });

    // Сохраняем в Google Sheets - ПРАВИЛЬНЫЙ ВЫЗОВ ФУНКЦИИ
    try {
      console.log('📤 Попытка сохранения в Google Sheets...');
      
      // Формируем ответы в правильном формате (только значения)
      const answers = state.answers.map(item => item.answer);
      
     // В функции finishQuestionnaire замените:
const success = await saveQuestionnaireToSheet(
  userId, 
  state.userData, 
  state.category, 
  state.answers.map(item => item.answer) // Передаем массив ответов
);
      
      console.log('✅ saveQuestionnaireToSheet завершена:', success);

      if (!success) {
        console.error('❌ Не удалось сохранить данные в Google Таблицу');
        const admins = (process.env.ADMINS || '').split(',').map(id => Number(id.trim())).filter(Boolean);
        for (const adminId of admins) {
          try {
            await bot.sendMessage(adminId, `❌ Помилка збереження анкети користувача ${userId} в Google Sheets`);
          } catch (adminError) {
            console.error('Error sending error to admin:', adminError);
          }
        }
      }
    } catch (sheetError) {
      console.error('❌ Критична помилка при збереженні в Google Sheets:', sheetError);
    }

    // Отправляем результаты пользователю
    await bot.sendMessage(chatId, message);

    // Отправляем администраторам
    const admins = (process.env.ADMINS || '').split(',').map(id => Number(id.trim())).filter(Boolean);
    if (admins.length > 0) {
      const adminMessage =
        `📩 Нова анкета від користувача:\n` +
        `👤 ID: ${userId}\n` +
        `📛 Ім'я: ${state.userData.first_name || 'Не вказано'} ${state.userData.last_name || ''}\n` +
        `@${state.userData.username || 'Без username'}\n` +
        `📊 Категорія: ${state.categoryName}\n\n` +
        message;

      for (const adminId of admins) {
        try {
          await bot.sendMessage(adminId, adminMessage);
          console.log(`✅ Анкета відправлена адміністратору ${adminId}`);
        } catch (adminError) {
          console.error(`❌ Помилка відправки адміністратору ${adminId}:`, adminError.message);
        }
      }
    } else {
      console.log('ℹ️ Адміністратори не знайдені в ENV змінних');
    }

    // Отправляем кнопку для связи с HR
    await bot.sendMessage(
      chatId,
      '🎉 Дякуємо за заповнення анкети!\n\nДля подальшого спілкування та узгодження деталей, будь ласка, звертайтеся до нашого HR:\n\n👤 @CleanHR',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💼 Написати HR', url: 'https://t.me/CleanHR' }],
            [{ text: '🏠 Головне меню', callback_data: 'main_menu' }],
          ],
        },
      }
    );
  } catch (error) {
    console.error('Error in finishQuestionnaire:', error);
    try {
      await bot.sendMessage(
        chatId,
        '🎉 Дякуємо за заповнення анкети! Ваші дані обробляються.\n\nДля подальшого спілкування звертайтеся до нашого HR: @CleanHR'
      );
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }
  }
}
module.exports = {
  startQuestionnaire,
  handleQuestionnaireMessage,
  handleQuestionnaireCallback,
  userQuestionnaireStates,
};
