// GroupManager.js
const { client } = require('./session');

class GroupManager {
    constructor() {
        this.availableGroups = [];
        this.groupDatabase = new Map(); // База групп с актуальными ID
        this.lastUpdate = null;
    }

    // Автоматическое обновление списка групп через сессию
    async updateGroupsFromSession() {
        try {
            console.log('🔄 Автоматическое обновление списка групп через сессию...');
            
            if (!client.connected) {
                console.log('❌ Клиент сессии не подключен');
                return false;
            }

            // Получаем все диалоги через сессию
            const dialogs = await client.getDialogs();
            const groups = dialogs.filter(dialog => 
                dialog.isGroup || dialog.isChannel
            );

            // Обновляем список доступных групп
            this.availableGroups = groups.map(group => ({
                id: group.id,
                name: group.title || 'Без названия',
                username: group.username || null,
                isChannel: group.isChannel,
                isGroup: group.isGroup,
                entity: group // Сохраняем оригинальный entity
            }));

            // Обновляем базу данных групп
            this.updateGroupDatabase();
            
            this.lastUpdate = new Date();
            console.log(`✅ Обновлено ${this.availableGroups.length} групп через сессию`);
            return true;

        } catch (error) {
            console.error('❌ Ошибка при обновлении групп через сессию:', error);
            return false;
        }
    }

    // Обновление базы данных групп
    updateGroupDatabase() {
        for (const group of this.availableGroups) {
            const existingGroup = this.groupDatabase.get(group.name);
            
            if (existingGroup) {
                // Если группа уже есть в базе, обновляем ID и сохраняем историю
                if (existingGroup.currentId !== group.id) {
                    console.log(`🔄 Обновление ID для "${group.name}": ${existingGroup.currentId} → ${group.id}`);
                    
                    // Сохраняем старый ID в историю
                    if (!existingGroup.previousIds.includes(existingGroup.currentId)) {
                        existingGroup.previousIds.push(existingGroup.currentId);
                    }
                    
                    // Обновляем текущий ID
                    existingGroup.currentId = group.id;
                    existingGroup.entity = group.entity;
                    existingGroup.updatedAt = new Date();
                }
            } else {
                // Новая группа
                this.groupDatabase.set(group.name, {
                    currentId: group.id,
                    previousIds: [],
                    entity: group.entity,
                    username: group.username,
                    isChannel: group.isChannel,
                    isGroup: group.isGroup,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
    }

    // Поиск группы по названию (с авто-обновлением)
    async findGroupByName(groupName, autoUpdate = true) {
        // Сначала ищем в доступных группах
        let foundGroup = this.availableGroups.find(group => 
            group.name.toLowerCase().includes(groupName.toLowerCase()) ||
            groupName.toLowerCase().includes(group.name.toLowerCase())
        );

        // Если не нашли и разрешено авто-обновление, обновляем и ищем снова
        if (!foundGroup && autoUpdate) {
            await this.updateGroupsFromSession();
            foundGroup = this.availableGroups.find(group => 
                group.name.toLowerCase().includes(groupName.toLowerCase()) ||
                groupName.toLowerCase().includes(group.name.toLowerCase())
            );
        }

        return foundGroup;
    }

    // Поиск группы по ID
    findGroupById(groupId) {
        return this.availableGroups.find(group => group.id === groupId);
    }

    // Получение актуального ID по названию группы
    async getGroupIdByName(groupName) {
        const groupData = this.groupDatabase.get(groupName);
        if (groupData) {
            return groupData.currentId;
        }

        // Если группы нет в базе, пробуем найти через сессию
        const group = await this.findGroupByName(groupName);
        return group ? group.id : null;
    }

    // Умная отправка сообщения по названию группы
    async smartSendToGroup(groupName, message) {
        try {
            // Находим группу через сессию
            const group = await this.findGroupByName(groupName);
            
            if (!group) {
                console.log(`❌ Группа "${groupName}" не найдена через сессию`);
                return false;
            }

            // Отправляем сообщение
            await client.sendMessage(group.entity, { 
                message: message,
                parseMode: 'html'
            });

            console.log(`✅ Сообщение отправлено в "${group.name}" (ID: ${group.id})`);
            return true;

        } catch (error) {
            console.error(`❌ Ошибка отправки в "${groupName}":`, error);
            
            // Если ошибка связана с неверным ID, пробуем обновить группы
            if (error.message.includes('CHANNEL_INVALID') || error.message.includes('Could not find the input entity')) {
                console.log('🔄 Пробуем обновить список групп из-за ошибки ID...');
                await this.updateGroupsFromSession();
            }
            
            return false;
        }
    }

    // Получение списка всех доступных групп
    getAllGroups() {
        return this.availableGroups;
    }

    // Получение статистики базы групп
    getDatabaseStats() {
        return {
            totalGroups: this.groupDatabase.size,
            availableGroups: this.availableGroups.length,
            lastUpdate: this.lastUpdate,
            groupsWithHistory: Array.from(this.groupDatabase.values()).filter(g => g.previousIds.length > 0).length
        };
    }

    // Логирование базы групп
    logGroupDatabase() {
        console.log('📋 База данных групп:');
        this.groupDatabase.forEach((data, name) => {
            console.log(`🏷️  ${name}`);
            console.log(`   📌 Текущий ID: ${data.currentId}`);
            console.log(`   📚 История ID: ${data.previousIds.join(', ') || 'нет'}`);
            console.log(`   👤 Username: ${data.username || 'нет'}`);
            console.log(`   📅 Обновлено: ${data.updatedAt.toLocaleString('uk-UA')}`);
            console.log('---');
        });
    }
}

// Создаем глобальный экземпляр
const groupManager = new GroupManager();

// Периодическое обновление групп (каждые 6 часов)
setInterval(async () => {
    await groupManager.updateGroupsFromSession();
}, 6 * 60 * 60 * 1000);

// Обновление при старте
setTimeout(async () => {
    await groupManager.updateGroupsFromSession();
}, 5000);

module.exports = groupManager;