// API модуль для взаимодействия с бэкендом
class API {
    constructor() {
        this.baseUrl = CONFIG.API_URL;
        this.tg = window.Telegram.WebApp;
        this.userId = this.tg.initDataUnsafe?.user?.id || 0;
        this.userData = this.tg.initDataUnsafe?.user || {};
    }

    async request(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-User-Id': this.userId.toString(),
                'X-Telegram-Init-Data': this.tg.initData
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Пользовательские данные
    async getUserData() {
        return await this.request('/api/user/data');
    }

    async getBalance() {
        return await this.request('/api/user/balance');
    }

    async updateActivity() {
        return await this.request('/api/user/activity', 'POST');
    }

    // Gift Upgrade
    async playGiftUpgrade(betAmount, multiplier) {
        return await this.request('/api/games/gift-upgrade/play', 'POST', {
            bet_amount: betAmount,
            multiplier: multiplier
        });
    }

    async getGiftUpgradeHistory(limit = 1) {
        return await this.request(`/api/games/gift-upgrade/history?limit=${limit}`);
    }

    // Rolls
    async getCurrentRollsGame() {
        return await this.request('/api/games/rolls/current');
    }

    async placeBet(color, amount) {
        return await this.request('/api/games/rolls/bet', 'POST', {
            color: color,
            amount: amount
        });
    }

    async getRollsHistory(limit = 100) {
        return await this.request(`/api/games/rolls/history?limit=${limit}`);
    }

    async getRollsBets(gameNumber) {
        return await this.request(`/api/games/rolls/bets?game_number=${gameNumber}`);
    }

    // Mutants (Cases)
    async canOpenFreeCase() {
        return await this.request('/api/games/mutants/free-case-status');
    }

    async openCase(caseName) {
        return await this.request('/api/games/mutants/open-case', 'POST', {
            case_name: caseName
        });
    }

    async getCaseHistory(limit = 10) {
        return await this.request(`/api/games/mutants/history?limit=${limit}`);
    }

    // Инвентарь
    async getInventory() {
        return await this.request('/api/inventory');
    }

    async sellItem(itemId) {
        return await this.request('/api/inventory/sell', 'POST', {
            item_id: itemId
        });
    }

    async sellAllItems() {
        return await this.request('/api/inventory/sell-all', 'POST');
    }

    // Лидерборд
    async getLeaderboard(limit = 35) {
        return await this.request(`/api/leaderboard?limit=${limit}`);
    }

    // Рефералы
    async getReferralData() {
        return await this.request('/api/referral/data');
    }

    async transferRefBalance() {
        return await this.request('/api/referral/transfer', 'POST');
    }

    // Депозиты
    async createDeposit(amount, method) {
        return await this.request('/api/deposit/create', 'POST', {
            amount: amount,
            method: method
        });
    }

    async processStarsPayment(stars) {
        return await this.request('/api/deposit/stars', 'POST', {
            stars: stars
        });
    }

    // Выводы
    async createWithdrawal(amount, wallet) {
        return await this.request('/api/withdrawal/create', 'POST', {
            amount: amount,
            wallet: wallet
        });
    }

    async getWithdrawalHistory() {
        return await this.request('/api/withdrawal/history');
    }

    // Статистика пользователя
    async getUserStats() {
        return await this.request('/api/user/stats');
    }

    // Уведомление backend о событиях
    async notifyDeposit(userId, amount, method) {
        return await this.request('/webhook/notify', 'POST', {
            action: 'deposit_notification',
            user_id: userId,
            amount: amount,
            method: method
        });
    }

    async notifyWithdrawalRequest(userId, amount, wallet, requestId) {
        return await this.request('/webhook/notify', 'POST', {
            action: 'withdrawal_request',
            user_id: userId,
            amount: amount,
            wallet: wallet,
            request_id: requestId
        });
    }
}

// Создаем глобальный экземпляр API
const api = new API();
