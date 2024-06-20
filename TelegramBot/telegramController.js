const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();

const telegramController = (data) => {
  const db = new sqlite3.Database('botdata.db');
  const bot = new TelegramBot(process.env.API_TOKEN, {

    polling: true
    
  });

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS botdata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      choice TEXT
    )`);
  });
  
  module.exports = db;

  bot.on("polling_error", err => console.log(err.data.error.message));

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
  
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '1Ф1-23', callback_data: '1Ф1-23' },
            { text: '1Пр1-23', callback_data: '1Пр1-23' },
            { text: '2Ф1-22', callback_data: '2Ф1-22' }
          ],
          [
            { text: '2Пр1-22', callback_data: '2Пр1-22' },
            { text: '3Ф1-21', callback_data: '3Ф1-21' },
            { text: '3Пр1-21', callback_data: '3Пр1-21' }
          ],
          [
            { text: '4Пр1-20', callback_data: '4Пр1-20' }
          ]
        ]
      }
    };
  
    bot.sendMessage(chatId, 'Выберите один из вариантов:', options);
  });

bot.on('callback_query', (query) => {
  const userId = query.from.id;
  const choice = query.data;

  db.get(`SELECT user_id FROM botdata WHERE user_id = ?`, [userId], (err, row) => {
    if (err) {
      console.error('Ошибка при запросе в базу данных:', err.message);
      return;
    }

    if (row) {
      db.run(`UPDATE botdata SET choice = ? WHERE user_id = ?`, [choice, userId], (err) => {
        if (err) {
          console.error('Ошибка при обновлении записи в базе данных:', err.message);
          return;
        }
        console.log(`Пользователь с ID ${userId} обновил свой выбор: ${choice}`);
        bot.sendMessage(userId, `Вы обновили свой выбор: ${choice}`);
      });
    } else {
      db.run(`INSERT INTO botdata (user_id, choice) VALUES (?, ?)`, [userId, choice], (err) => {
        if (err) {
          console.error('Ошибка при сохранении в базу данных:', err.message);
          return;
        }
        console.log(`Пользователь с ID ${userId} выбрал: ${choice}`);
        bot.sendMessage(userId, `Вы выбрали: ${choice}`);
      });
    }
  });
});
}

module.exports = telegramController;