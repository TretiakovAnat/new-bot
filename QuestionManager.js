
const fs = require('fs');
const path = require('path');

const QUESTIONS_FILE = path.join(__dirname, 'questions.json');

// Вопросы по умолчанию для каждой категории
const defaultQuestions = {
  driver: [
    {
      id: 1,
      question: "Особисті дані",
      fullQuestion: "🚗 Ваше ім'я, вік, район проживання?",
      type: 'text',
      required: true
    },
    {
      id: 2,
      question: "Посвідчення B",
      fullQuestion: "🚗 Маєте водійське посвідчення категорії B?",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 3,
      question: "Стаж",
      fullQuestion: "🚗 Стаж водіння:",
      type: 'options',
      options: ['1–2 роки', '3–5 років', '5+ років'],
      required: true
    },
    {
      id: 4,
      question: "Досвід",
      fullQuestion: "🚗 Досвід роботи водієм:",
      type: 'options',
      options: ['Немає', 'Таксі', 'Доставка', 'Власне авто', 'Перевезення'],
      required: true
    },
    {
      id: 5,
      question: "Nissan",
      fullQuestion: "🚗 Чи готові працювати з корпоративним авто електро Nissan E-NV 200?",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 6,
      question: "Графік",
      fullQuestion: "🚗 Зручний графік:",
      type: 'options',
      options: ['Повний день', '5/2', 'Вихідні'],
      required: true
    },
    {
      id: 7,
      question: "Стажування",
      fullQuestion: "🚗 Готовність пройти стажувальний день:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 8,
      question: "Телефон",
      fullQuestion: "🚗 Контактний номер телефону:",
      type: 'text',
      required: true
    },
      {
      id: 9,
      question: "Дата стажування",
      fullQuestion: "🚗 Оберіть дату стажування:",
      type: 'calendar',
      required: true
    }
  ],

  cleaner: [
    {
      id: 1,
      question: "Особисті дані",
      fullQuestion: "🧹 Ваше ім'я, вік, район проживання?",
      type: 'text',
      required: true
    },
    {
      id: 2,
      question: "Досвід",
      fullQuestion: "🧹 Досвід роботи у клінінгу:",
      type: 'options',
      options: ['Немає', 'До 1 року', '1–3 роки', '3+ роки'],
      required: true
    },
    {
      id: 3,

      question: "Мити вікна",

      question: "Хімія",

      fullQuestion: "🧹 Чи вмієте мити вікна?",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 4,
      question: "Графік",
      fullQuestion: "🧹 Графік роботи:",
      type: 'options',
      options: ['Повний день', '5/2', '2/2', 'Підробіток'],
      required: true
    },
    {
      id: 5,
      question: "Фізична",
      fullQuestion: "🧹 Готовність до фізичної роботи:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 6,
      question: "Їздити",
      fullQuestion: "🧹 Чи готові їздити на об'єкти по місту?",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 7,
      question: "Стажування",
      fullQuestion: "🧹 Готовність пройти стажувальний день:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 8,
      question: "Телефон",
      fullQuestion: "🧹 Контактний номер телефону:",
      type: 'text',
      required: true
    },
       {
      id: 9,
      question: "Дата стажування",
      fullQuestion: "🧹 Оберіть дату стажування:",
      type: 'calendar',
      required: true
    }
  ],

  hr: [
    {
      id: 1,
      question: "Особисті дані",
      fullQuestion: "👥 Ваше ім'я, вік, район проживання?",
      type: 'text',
      required: true
    },
    {
      id: 2,
      question: "Досвід HR",
      fullQuestion: "👥 Досвід у HR/рекрутингу:",
      type: 'options',
      options: ['Немає', 'До 1 року', '1–3 роки', '3+ роки'],
      required: true
    },
    {
      id: 3,
      question: "Платформи",
      fullQuestion: "👥 Платформи для пошуку кандидатів якими володієте:",
      type: 'options',
      options: ['Work.ua', 'Robota.ua', 'Jooble', 'Соцмережі', 'Всі'],
      required: true
    },
    {
      id: 4,
      question: "Масовий підбір",
      fullQuestion: "👥 Досвід підбору персоналу:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 5,
      question: "Формат",
      fullQuestion: "👥 Формат роботи:",
      type: 'options',
      options: ['5/2', '2/2'],
      required: true
    },
    {
      id: 6,
      question: "Випробувальний",
      fullQuestion: "👥 Готовність пройти випробувальний період:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 7,
      question: "Телефон",
      fullQuestion: "👥 Контактний номер телефону:",
      type: 'text',
      required: true
    },

    {
      id: 8,
      question: "Дата стажування",
      fullQuestion: "👥 Оберіть дату стажування:",
      type: 'calendar',
      required: true
    }
  ],

  manager: [
    {
      id: 1,
      question: "Особисті дані",
      fullQuestion: "👔 Ваше ім'я, вік, район проживання?",
      type: 'text',
      required: true
    },
    {
      id: 2,
      question: "Керування",
      fullQuestion: "👔 Досвід керування командою:",
      type: 'options',
      options: ['Немає', 'До 1 року', '1–3 роки', '3+ роки'],
      required: true
    },
    {
      id: 3,
      question: "Досвід клінінгу",
      fullQuestion: "👔 Досвід у сфері клінінгу:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 4,
      question: "Контроль якості",
      fullQuestion: "👔 Чи готові контролювати якість і спілкуватися з клієнтами?",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 5,
      question: "Організація",
      fullQuestion: "👔 Уміння організовувати людей:",
      type: 'options',
      options: ['Добре', 'Середньо', 'Потрібен досвід'],
      required: true
    },
    {
      id: 6,
      question: "Графік",
      fullQuestion: "👔 Готовність працювати за графіком:",
      type: 'options',
      options: ['5/2', '2/2', 'Обидва'],
      required: true
    },
    {
      id: 7,
      question: "Продажі",
      fullQuestion: "👔 Чи мали досвід з продажами:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 8,
      question: "Стажування",
      fullQuestion: "👔 Готовність пройти стажувальний день:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 9,
      question: "Телефон",
      fullQuestion: "👔 Контактний номер телефону:",
      type: 'text',
      required: true
    },
    {
      id: 10,
      question: "Дата стажування",
      fullQuestion: "👔 Оберіть дату стажування:",
      type: 'calendar',
      required: true
    }
  ],

  smm: [
    {
      id: 1,
      question: "Особисті дані",
      fullQuestion: "📱 Ваше ім'я, вік, район проживання?",
      type: 'text',
      required: true
    },
    {
      id: 2,
      question: "Досвід SMM",
      fullQuestion: "📱 Досвід ведення соцмереж для бізнесу:",
      type: 'options',
      options: ['Немає', 'До 1 року', '1–3 роки', '3+ роки'],
      required: true
    },
    {
      id: 3,
      question: "Платформи",
      fullQuestion: "📱 З якими платформами працювали?",
      type: 'options',
      options: ['Instagram', 'TikTok', 'Facebook', 'Інше'],
      required: true
    },
    {
      id: 4,
      question: "Контент",
      fullQuestion: "📱 Вміння створювати контент:",
      type: 'options',
      options: ['Пости', 'Відео', 'Обидва'],
      required: true
    },
    {
      id: 5,
      question: "Інструменти",
      fullQuestion: "📱 Інструменти:",
      type: 'options',
      options: ['Canva', 'CapCut', 'Photoshop', 'Інше'],
      required: true
    },
    {
      id: 6,
      question: "Таргет",
      fullQuestion: "📱 Чи знайомі з таргетованою рекламою?",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 7,
      question: "Зйомка",
      fullQuestion: "📱 Чи готові виїзжати на об'єкти для зйомки контенту:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 8,
      question: "Тестове",
      fullQuestion: "📱 Готовність виконати тестове завдання:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 9,
      question: "Портфоліо",
      fullQuestion: "📱 Надішліть посилання на приклади ваших робіт (тільки URL-адреси):",
      type: 'text',
      required: false
    },
    {
      id: 10,
      question: "Телефон",
      fullQuestion: "📱 Контактний номер телефону:",
      type: 'text',
      required: true
    },
   {
      id: 11,
      question: "Дата стажування",
      fullQuestion: "📱 Оберіть дату стажування:",
      type: 'calendar',
      required: true
    }
  ],

  storekeeper: [
    {
      id: 1,
      question: "Особисті дані",
      fullQuestion: "📦 Ваше ім'я, вік, район проживання?",
      type: 'text',
      required: true
    },
    {
      id: 2,
      question: "Досвід складу",
      fullQuestion: "📦 Досвід роботи на складі:",
      type: 'options',
      options: ['Немає', 'До 1 року', '1–3 роки', '3+ роки'],
      required: true
    },
    {
      id: 3,
      question: "Інвентаризація",
      fullQuestion: "📦 Інвентаризація та облік:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 4,
      question: "Облік матеріалів",
      fullQuestion: "📦 Чи готові вести облік витратних матеріалів/хімії?",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 5,
      question: "Excel",
      fullQuestion: "📦 Рівень роботи з Excel/Google Sheets:",
      type: 'options',
      options: ['Початковий', 'Середній', 'Впевнений'],
      required: true
    },
    {
      id: 6,
      question: "Фізична",
      fullQuestion: "📦 Фізична робота:",
      type: 'options',
      options: ['Комфортно', 'Складно'],
      required: true
    },
    {
      id: 7,
      question: "Графік 7-11",
      fullQuestion: "📦 Графік роботи 5/2, з 07:00 до 11:00:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 8,
      question: "Локація",
      fullQuestion: "📦 Локація складу:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 9,
      question: "Випробувальний",
      fullQuestion: "📦 Готовність пройти випробувальний період:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 10,
      question: "Телефон",
      fullQuestion: "📦 Контактний номер телефону:",
      type: 'text',
      required: true
    },
      {
      id: 11,
      question: "Дата стажування",
      fullQuestion: "📦 Оберіть дату стажування:",
      type: 'calendar',
      required: true
    }
  ],

  mall_worker: [
    {
      id: 1,
      question: "Особисті дані",
      fullQuestion: "🏢 Ваше ім'я, вік, район проживання?",
      type: 'text',
      required: true
    },
    {
      id: 2,
      question: "Досвід клінінгу",
      fullQuestion: "🏢 Досвід роботи у сфері клінінгу:",
      type: 'options',
      options: ['Немає', 'До 1 року', '1–3 роки', '3+ роки'],
      required: true
    },
    {
      id: 3,
      question: "Види прибирання",
      fullQuestion: "🏢 Які види прибирання вам знайомі?",
      type: 'options',
      options: ['Квартири', 'Офіси', 'ТРЦ / великі приміщення', 'Після ремонту', 'Інше'],
      required: true
    },
    {
      id: 4,
      question: "Робота в команді",
      fullQuestion: "🏢 Наскільки комфортна для вас робота в команді?",
      type: 'options',
      options: ['Комфортно', 'Більше подобається самостійно'],
      required: true
    },
    {
      id: 5,
      question: "Фізична активність",
      fullQuestion: "🏢 Ставлення до фізично активної роботи (11 годин у зміні):",
      type: 'options',
      options: ['Комфортно', 'Складно'],
      required: true
    },
    {
      id: 6,
      question: "Графік 3/2",
      fullQuestion: "🏢 Готовність працювати за графіком 3/2 по 11 годин:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 7,
      question: "Локація",
      fullQuestion: "🏢 Чи зручна вам локація (Софіївська Борщагівка, Яблунева 4):",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 8,
      question: "Стажування",
      fullQuestion: "🏢 Готовність пройти стажувальний день:",
      type: 'options',
      options: ['✅ Так', '❌ Ні'],
      required: true
    },
    {
      id: 9,
      question: "Телефон",
      fullQuestion: "🏢 Контактний номер телефону:",
      type: 'text',
      required: true
    },
     {
      id: 10,
      question: "Дата стажування",
      fullQuestion: "🏢 Оберіть дату стажування:",
      type: 'calendar',
      required: true
    }
  ]
};

// Загрузка вопросов из файла
function loadQuestions() {
  try {
    if (fs.existsSync(QUESTIONS_FILE)) {
      const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки вопросов:', error);
  }
  
  // Создаем файл с вопросами по умолчанию, если его нет
  saveQuestions(defaultQuestions);
  return defaultQuestions;
}

// Сохранение вопросов в файл
function saveQuestions(questions) {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
    console.log('✅ Вопросы сохранены в файл');
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения вопросов:', error);
    return false;
  }
}

// Получение вопросов для категории (короткие для таблицы)
function getQuestionsForCategory(category) {
  const questions = loadQuestions();
  return questions[category] || [];
}

// Получение полных вопросов для отображения (с emoji)
function getFullQuestionsForCategory(category) {
  const questions = loadQuestions();
  return questions[category] ? questions[category].map(q => ({
    ...q,
    question: q.fullQuestion || q.question
    })) : [];
}

module.exports = {
  loadQuestions,
  saveQuestions,
  getQuestionsForCategory,
  getFullQuestionsForCategory
};
