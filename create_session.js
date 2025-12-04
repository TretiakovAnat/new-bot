require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;

(async () => {
  console.log('Починаємо авторизацію...');

  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('Введіть номер телефону: '),
    password: async () => await input.text('Введіть пароль (якщо є): '),
    phoneCode: async () => await input.text('Введіть код з Telegram: '),
    onError: (err) => console.log(err),
  });

  console.log('Авторизація пройшла успішно!');

  // Покажи строку сессии, которую надо сохранить
  console.log('Збережіть цю строку сесії у .env як SESSION_STRING:');
  console.log(client.session.save());

  process.exit(0);
})();
