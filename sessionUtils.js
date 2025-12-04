// session/sessionUtils.js
const SessionManager = require('./SessionManager');

class SessionUtils {
    // Отправка сообщения пользователю через сохраненный chat_id
    static async sendToUser(bot, userId, message, options = {}) {
        try {
            const chatId = SessionManager.getChatId(userId);
            
            if (!chatId) {
                console.error(`❌ Chat ID не найден для пользователя ${userId}`);
                return false;
            }
            
            await bot.sendMessage(chatId, message, options);
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка отправки сообщения пользователю ${userId}:`, error);
            return false;
        }
    }

    // Массовая рассылка по категориям
    static async broadcastToCategory(bot, category, message, options = {}) {
        try {
            const sessions = SessionManager.getAllSessions();
            const usersInCategory = Object.entries(sessions)
                .filter(([_, session]) => session.category === category)
                .map(([userId, _]) => userId);
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const userId of usersInCategory) {
                const success = await this.sendToUser(bot, userId, message, options);
                if (success) successCount++;
                else errorCount++;
                
                // Задержка чтобы не спамить
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return { successCount, errorCount, total: usersInCategory.length };
            
        } catch (error) {
            console.error('❌ Ошибка массовой рассылки:', error);
            return { successCount: 0, errorCount: 0, total: 0 };
        }
    }

    // Получение статистики по сессиям
    static getSessionStats() {
        const sessions = SessionManager.getAllSessions();
        const total = Object.keys(sessions).length;
        
        const byCategory = {};
        Object.values(sessions).forEach(session => {
            if (session.category) {
                byCategory[session.category] = (byCategory[session.category] || 0) + 1;
            }
        });
        
        const activeUsers = SessionManager.getActiveUsers(7).length;
        
        return {
            total,
            byCategory,
            activeLast7Days: activeUsers,
            withChatId: Object.values(sessions).filter(s => s.chat_id).length
        };
    }
}

module.exports = SessionUtils;