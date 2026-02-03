// Главный файл приложения
class CasinoApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentPage = 'games';
        this.userData = null;
        this.balance = 0;
        this.refBalance = 0;
        
        this.init();
    }

    async init() {
        // Настройка Telegram WebApp
        this.tg.ready();
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        
        // Установка темы
        document.body.style.backgroundColor = this.tg.backgroundColor || '#0a0e27';
        
        // Загрузка данных пользователя
        await this.loadUserData();
        
        // Инициализация UI
        this.setupEventListeners();
        this.showPage('games');
        
        // Скрыть загрузчик
        document.getElementById('loader').style.display = 'none';
        document.getElementById('main-container').style.display = 'block';
        
        // Обновление активности каждые 30 секунд
        setInterval(() => this.updateActivity(), 30000);
    }

    async loadUserData() {
        try {
            const data = await api.getUserData();
            this.userData = data.user;
            this.balance = data.balance;
            this.refBalance = data.ref_balance;
            
            this.updateHeader();
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showNotification('Ошибка загрузки данных', 'error');
        }
    }

    updateHeader() {
        // Обновление аватара
        const avatar = document.getElementById('user-avatar');
        if (this.tg.initDataUnsafe?.user?.photo_url) {
            avatar.src = this.tg.initDataUnsafe.user.photo_url;
        } else {
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userData?.first_name || 'User')}&background=4a90e2&color=fff`;
        }
        
        // Обновление имени и ранга
        document.getElementById('user-name').textContent = this.userData?.first_name || 'User';
        document.getElementById('user-rank').textContent = `Rank: ${this.userData?.games_played || 0}`;
        
        // Обновление баланса
        document.getElementById('balance').textContent = this.balance.toFixed(2);
    }

    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.showPage(page);
            });
        });

        // Кнопка пополнения
        document.getElementById('add-balance-btn').addEventListener('click', () => {
            this.showDepositModal();
        });

        // Закрытие модальных окон
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });

        // Клик вне модального окна
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    showPage(page) {
        // Обновление навигации
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Показ контента
        this.currentPage = page;
        const contentArea = document.getElementById('content-area');

        switch(page) {
            case 'games':
                this.showGamesPage(contentArea);
                break;
            case 'leaderboard':
                this.showLeaderboard(contentArea);
                break;
            case 'profile':
                this.showProfile(contentArea);
                break;
        }
    }

    showGamesPage(container) {
        container.innerHTML = `
            <h1 style="font-size: 28px; font-weight: 600; margin-bottom: 20px;">Games</h1>
            <div class="games-grid">
                <div class="game-card" data-game="gift-upgrade">
                    <div class="game-card-header">
                        <div class="game-icon">🎁</div>
                        <div class="game-title">Gift Upgrade</div>
                    </div>
                    <div class="game-description">
                        Выбери множитель и испытай удачу на рулетке!
                    </div>
                </div>
                
                <div class="game-card" data-game="rolls">
                    <div class="game-card-header">
                        <div class="game-icon">🎲</div>
                        <div class="game-title">Rolls</div>
                    </div>
                    <div class="game-description">
                        Ставь на цвет и выигрывай каждые 10 секунд!
                    </div>
                </div>
                
                <div class="game-card" data-game="mutants">
                    <div class="game-card-header">
                        <div class="game-icon">📦</div>
                        <div class="game-title">Mutants</div>
                    </div>
                    <div class="game-description">
                        Открывай кейсы и получай ценные NFT подарки!
                    </div>
                </div>
            </div>
        `;

        // Добавление обработчиков на карточки игр
        container.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const game = e.currentTarget.dataset.game;
                this.openGame(game);
            });
        });
    }

    openGame(gameName) {
        const contentArea = document.getElementById('content-area');
        
        switch(gameName) {
            case 'gift-upgrade':
                new GiftUpgradeGame(contentArea, this);
                break;
            case 'rolls':
                new RollsGame(contentArea, this);
                break;
            case 'mutants':
                new MutantsGame(contentArea, this);
                break;
        }
    }

    async showLeaderboard(container) {
        container.innerHTML = `
            <div class="leaderboard-container">
                <h1 class="leaderboard-title">🏆 Лидерборд</h1>
                <div class="leaderboard-list" id="leaderboard-list">
                    <div style="text-align: center; padding: 40px;">
                        <div class="loader-spinner"></div>
                    </div>
                </div>
            </div>
        `;

        try {
            const leaderboard = await api.getLeaderboard();
            const listElement = document.getElementById('leaderboard-list');
            
            if (leaderboard.length === 0) {
                listElement.innerHTML = '<div class="empty-inventory">Пока нет данных</div>';
                return;
            }

            listElement.innerHTML = leaderboard.map((user, index) => {
                const rank = index + 1;
                let itemClass = 'leaderboard-item';
                
                if (rank === 1) itemClass += ' top1';
                else if (rank === 2) itemClass += ' top2';
                else if (rank === 3) itemClass += ' top3';
                else if (rank >= 4 && rank <= 7) itemClass += ' top4-7';

                const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name)}&background=4a90e2&color=fff`;

                return `
                    <div class="${itemClass}">
                        <div class="leaderboard-rank">#${rank}</div>
                        <div class="leaderboard-avatar">
                            <img src="${avatar}" alt="${user.first_name}">
                        </div>
                        <div class="leaderboard-info">
                            <div class="leaderboard-name">${user.first_name}</div>
                            <div class="leaderboard-amount">${user.total_deposits.toFixed(2)} TON</div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            document.getElementById('leaderboard-list').innerHTML = 
                '<div class="empty-inventory">Ошибка загрузки</div>';
        }
    }

    async showProfile(container) {
        container.innerHTML = `
            <div class="profile-container">
                <div class="profile-header">
                    <div class="profile-avatar">
                        <img id="profile-avatar" src="" alt="Avatar">
                    </div>
                    <div class="profile-name" id="profile-name">Loading...</div>
                    <div class="profile-username" id="profile-username">@username</div>
                </div>

                <div class="profile-stats">
                    <div class="stat-card">
                        <div class="stat-value" id="stat-games">0</div>
                        <div class="stat-label">🎮 Games</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="stat-deposits">0</div>
                        <div class="stat-label">💰 Balance</div>
                    </div>
                </div>

                <div class="profile-actions">
                    <button class="profile-btn primary" id="topup-btn">
                        💳 Пополнить баланс
                    </button>
                    <button class="profile-btn" id="withdraw-btn">
                        💸 Вывести средства
                    </button>
                    <button class="profile-btn" id="referral-btn">
                        👥 Реферальная программа
                    </button>
                </div>

                <div class="inventory-section">
                    <div class="inventory-header">
                        <div class="inventory-title">📦 Инвентарь (<span id="inventory-count">0</span>)</div>
                        <button class="sell-all-btn" id="sell-all-btn" style="display: none;">Продать все</button>
                    </div>
                    <div class="inventory-grid" id="inventory-grid">
                        <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                            <div class="loader-spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Обновление данных профиля
        await this.updateProfileData();

        // Обработчики кнопок
        document.getElementById('topup-btn').addEventListener('click', () => this.showDepositModal());
        document.getElementById('withdraw-btn').addEventListener('click', () => this.showWithdrawModal());
        document.getElementById('referral-btn').addEventListener('click', () => this.showReferralModal());
        document.getElementById('sell-all-btn').addEventListener('click', () => this.sellAllItems());
    }

    async updateProfileData() {
        try {
            const stats = await api.getUserStats();
            const inventory = await api.getInventory();

            // Аватар
            const avatar = document.getElementById('profile-avatar');
            if (this.tg.initDataUnsafe?.user?.photo_url) {
                avatar.src = this.tg.initDataUnsafe.user.photo_url;
            } else {
                avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userData?.first_name || 'User')}&background=4a90e2&color=fff`;
            }

            // Имя и username
            document.getElementById('profile-name').textContent = this.userData?.first_name || 'User';
            document.getElementById('profile-username').textContent = 
                this.userData?.username ? `@${this.userData.username}` : '';

            // Статистика
            document.getElementById('stat-games').textContent = stats.games_played || 0;
            document.getElementById('stat-deposits').textContent = `${(stats.total_deposits || 0).toFixed(2)}`;

            // Инвентарь
            this.displayInventory(inventory);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    }

    displayInventory(inventory) {
        const grid = document.getElementById('inventory-grid');
        const countElement = document.getElementById('inventory-count');
        const sellAllBtn = document.getElementById('sell-all-btn');

        countElement.textContent = inventory.length;

        if (inventory.length === 0) {
            grid.innerHTML = '<div class="empty-inventory" style="grid-column: 1 / -1;">Инвентарь пуст</div>';
            sellAllBtn.style.display = 'none';
            return;
        }

        sellAllBtn.style.display = 'block';

        grid.innerHTML = inventory.map(item => `
            <div class="inventory-item" data-item-id="${item.id}">
                <div class="item-icon">🎁</div>
                <div class="item-name-small">${item.item_name}</div>
            </div>
        `).join('');

        // Обработчики кликов на предметы
        grid.querySelectorAll('.inventory-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const itemId = e.currentTarget.dataset.itemId;
                const itemData = inventory.find(i => i.id == itemId);
                this.showItemModal(itemData);
            });
        });
    }

    showItemModal(item) {
        const modal = document.getElementById('item-modal');
        document.getElementById('item-name').textContent = item.item_name;
        document.getElementById('item-value').textContent = `${item.item_value} TON`;
        
        modal.classList.add('active');

        // Обработчики кнопок
        const sellBtn = document.getElementById('sell-item');
        const withdrawBtn = document.getElementById('withdraw-item');

        sellBtn.onclick = async () => {
            try {
                await api.sellItem(item.id);
                await this.loadUserData();
                await this.updateProfileData();
                modal.classList.remove('active');
                this.showNotification(`Продано за ${item.item_value} TON`, 'success');
            } catch (error) {
                this.showNotification('Ошибка продажи', 'error');
            }
        };

        withdrawBtn.onclick = () => {
            modal.classList.remove('active');
            this.tg.showAlert(`Для вывода ${item.item_name} напишите администратору:\n\nСообщение: "Hi ${item.item_name}"`);
        };
    }

    async sellAllItems() {
        if (!confirm('Продать все предметы из инвентаря?')) return;

        try {
            const result = await api.sellAllItems();
            await this.loadUserData();
            await this.updateProfileData();
            this.showNotification(`Продано на ${result.total_value} TON`, 'success');
        } catch (error) {
            this.showNotification('Ошибка продажи', 'error');
        }
    }

    showDepositModal() {
        const modal = document.getElementById('deposit-modal');
        modal.classList.add('active');

        const methods = modal.querySelectorAll('.deposit-method');
        const form = document.getElementById('deposit-form');
        const amountInput = document.getElementById('deposit-amount');
        const confirmBtn = document.getElementById('confirm-deposit');

        let selectedMethod = null;

        methods.forEach(btn => {
            btn.onclick = () => {
                methods.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedMethod = btn.dataset.method;
                form.style.display = 'block';
            };
        });

        confirmBtn.onclick = async () => {
            const amount = parseFloat(amountInput.value);

            if (!amount || amount < 0.1) {
                this.showNotification('Минимальная сумма: 0.1 TON', 'error');
                return;
            }

            try {
                if (selectedMethod === 'ton') {
                    // Интеграция с TON Connect
                    this.showNotification('Функция в разработке', 'info');
                } else if (selectedMethod === 'stars') {
                    const stars = Math.ceil(amount / CONFIG.STARS_TO_TON_RATE);
                    this.tg.showAlert(`Для пополнения на ${amount} TON нужно ${stars} Stars`);
                }
                
                modal.classList.remove('active');
            } catch (error) {
                this.showNotification('Ошибка пополнения', 'error');
            }
        };
    }

    showWithdrawModal() {
        const modal = document.getElementById('withdraw-modal');
        modal.classList.add('active');

        const amountInput = document.getElementById('withdraw-amount');
        const walletInput = document.getElementById('withdraw-wallet');
        const confirmBtn = document.getElementById('confirm-withdraw');

        confirmBtn.onclick = async () => {
            const amount = parseFloat(amountInput.value);
            const wallet = walletInput.value.trim();

            if (amount < CONFIG.WITHDRAWAL.MIN_AMOUNT) {
                this.showNotification(`Минимальная сумма вывода: ${CONFIG.WITHDRAWAL.MIN_AMOUNT} TON`, 'error');
                return;
            }

            if (amount > this.balance) {
                this.showNotification('Недостаточно средств', 'error');
                return;
            }

            if (!wallet) {
                this.showNotification('Укажите адрес кошелька', 'error');
                return;
            }

            try {
                const result = await api.createWithdrawal(amount, wallet);
                await api.notifyWithdrawalRequest(this.userData.user_id, amount, wallet, result.request_id);
                await this.loadUserData();
                modal.classList.remove('active');
                this.showNotification('Заявка создана. Ожидайте одобрения', 'success');
            } catch (error) {
                this.showNotification('Ошибка создания заявки', 'error');
            }
        };
    }

    async showReferralModal() {
        const modal = document.getElementById('referral-modal');
        modal.classList.add('active');

        try {
            const refData = await api.getReferralData();

            document.getElementById('ref-count').textContent = refData.referrals_count;
            document.getElementById('ref-earned').textContent = `${refData.total_earned.toFixed(2)} TON`;
            document.getElementById('ref-balance').textContent = `${this.refBalance.toFixed(2)} TON`;

            const refLink = `https://t.me/${CONFIG.BOT_USERNAME}?start=ref_${this.userData.user_id}`;
            document.getElementById('ref-link').value = refLink;

            document.getElementById('copy-ref-link').onclick = () => {
                navigator.clipboard.writeText(refLink);
                this.showNotification('Ссылка скопирована', 'success');
            };

            document.getElementById('transfer-ref-balance').onclick = async () => {
                if (this.refBalance < CONFIG.REFERRAL.MIN_TRANSFER) {
                    this.showNotification(`Минимум для перевода: ${CONFIG.REFERRAL.MIN_TRANSFER} TON`, 'error');
                    return;
                }

                try {
                    await api.transferRefBalance();
                    await this.loadUserData();
                    modal.classList.remove('active');
                    this.showNotification('Баланс переведен', 'success');
                } catch (error) {
                    this.showNotification('Ошибка перевода', 'error');
                }
            };
        } catch (error) {
            console.error('Error loading referral data:', error);
        }
    }

    showNotification(message, type = 'info') {
        this.tg.showAlert(message);
    }

    async updateActivity() {
        try {
            await api.updateActivity();
        } catch (error) {
            console.error('Error updating activity:', error);
        }
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CasinoApp();
});
