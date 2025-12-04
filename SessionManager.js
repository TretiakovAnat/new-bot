// SessionManager.js
const fs = require('fs');
const path = require('path');

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.backupPath = path.join(__dirname, 'session_backups');
        
        // Создаем папку для бэкапов если не существует
        if (!fs.existsSync(this.backupPath)) {
            fs.mkdirSync(this.backupPath, { recursive: true });
        }
        
        // Загружаем сессии при запуске
        this.loadSessions();
    }

    // Создание/обновление сессии
    updateSession(userId, sessionData) {
        const existingSession = this.sessions.get(userId) || {};
        this.sessions.set(userId, { ...existingSession, ...sessionData, updatedAt: new Date() });
        return true;
    }

    getSession(userId) {
        return this.sessions.get(userId);
    }

    deleteSession(userId) {
        return this.sessions.delete(userId);
    }

    getAllSessions() {
        return Object.fromEntries(this.sessions);
    }

    getChatId(userId) {
        const session = this.getSession(userId);
        return session ? session.chat_id : null;
    }

    getActiveUsers(days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return Array.from(this.sessions.entries())
            .filter(([_, session]) => new Date(session.updatedAt) > cutoffDate)
            .map(([userId, _]) => userId);
    }

    // Резервное копирование сессий
    backupSessions() {
        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                sessions: Object.fromEntries(this.sessions)
            };

            const filename = `sessions_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            const filepath = path.join(this.backupPath, filename);

            fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
            console.log(`✅ Резервная копия сессий создана: ${filename}`);
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка создания резервной копии:', error);
            return false;
        }
    }

    // Загрузка сессий из файла
    loadSessions() {
        try {
            // Ищем последний бэкап
            const files = fs.readdirSync(this.backupPath)
                .filter(file => file.startsWith('sessions_backup_') && file.endsWith('.json'))
                .sort()
                .reverse();

            if (files.length > 0) {
                const latestFile = files[0];
                const filepath = path.join(this.backupPath, latestFile);
                const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                
                this.sessions = new Map(Object.entries(data.sessions || {}));
                console.log(`✅ Сессии загружены из бэкапа: ${latestFile}`);
            }
        } catch (error) {
            console.log('ℹ️ Нет доступных бэкапов для загрузки');
        }
    }
}

// Создаем глобальный экземпляр
const sessionManager = new SessionManager();

module.exports = sessionManager;