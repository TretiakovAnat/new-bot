const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token);

// Функция для проверки и отправки напоминаний
async function checkAndSendReminders() {
  try {
    console.log('🔍 Перевіряю нагадування про стажування...');
    
    if (!fs.existsSync(path.join(__dirname, 'credentials.json')) || !process.env.GOOGLE_SHEET_ID) {
      console.log('📊 Google Sheets не налаштовано, пропускаю перевірку');
      return;
    }

    const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Проверяем все листы
    const sheetsToCheck = ['Водії', 'Клінери', 'HR', 'Менеджери', 'SMM', 'Комірники'];
    
    for (const sheetName of sheetsToCheck) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) continue;

        const headers = rows[0];
        const internshipDateIndex = headers.indexOf('Дата стажування');
        const phoneIndex = headers.indexOf('Телефон');
        const usernameIndex = headers.indexOf('Username');
        const personalDataIndex = headers.indexOf('Особисті дані');
        
        if (internshipDateIndex === -1) continue;

        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length > internshipDateIndex && row[internshipDateIndex]) {
            const internshipDate = parseDate(row[internshipDateIndex]);
            if (internshipDate) {
              // Проверяем, если стажировка завтра
              if (isSameDate(internshipDate, tomorrow)) {
                const userId = row[1]; // ID пользователя
                const username = row[usernameIndex] || 'Кандидат';
                const phone = row[phoneIndex] || 'не вказано';
                const personalData = row[personalDataIndex] || 'не вказано';
                
                // Отправляем напоминание администраторам
                const admins = process.env.ADMINS.split(',').map(id => Number(id.trim()));
                for (const adminId of admins) {
                  try {
                    await bot.sendMessage(adminId, 
                      `🔔 Нагадування про стажування!\n\n` +
                      `Кандидат: ${username}\n` +
                      `Особисті дані: ${personalData}\n` +
                      `Телефон: ${phone}\n` +
                      `Посада: ${sheetName}\n` +
                      `Дата стажування: ${formatDate(internshipDate)}\n\n` +
                      `Не забудьте підготуватися!`
                    );
                  } catch (error) {
                    console.error('Помилка відправки нагадування адміну:', error);
                  }
                }

                console.log(`📨 Нагадування відправлено для ${username} (${sheetName})`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Помилка перевірки листа ${sheetName}:`, error);
      }
    }
  } catch (error) {
    console.error('Помилка перевірки нагадувань:', error);
  }
}

// Вспомогательные функции для работы с датами
function parseDate(dateStr) {
  try {
    if (!dateStr) return null;
    
    // Пробуем разные форматы дат
    if (dateStr.includes('.')) {
      const [day, month, year] = dateStr.split('.').map(Number);
      if (day && month && year) {
        return new Date(year, month - 1, day);
      }
    }
    
    // Пробуем стандартный формат
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    return null;
  } catch (error) {
    console.error('Помилка парсингу дати:', dateStr);
    return null;
  }
}

function isSameDate(date1, date2) {
  if (!date1 || !date2) return false;
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

function formatDate(date) {
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Запускаем проверку каждый день в 9:00
function startReminderScheduler() {
  // Проверяем сразу при запуске
  checkAndSendReminders();
  
  // Устанавливаем ежедневную проверку
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 9 && now.getMinutes() === 0) {
      checkAndSendReminders();
    }
  }, 60000); // Проверяем каждую минуту

  console.log('⏰ Система нагадувань запущена (перевірка о 9:00 щодня)');
}

module.exports = {
  checkAndSendReminders,
  startReminderScheduler
};