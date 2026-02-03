// Mutants Game (Case Opening)
class MutantsGame {
    constructor(container, app) {
        this.container = container;
        this.app = app;
        this.currentTab = 'all';
        
        this.checkAccess();
    }

    async checkAccess() {
        const stats = await api.getUserStats();
        
        if (stats.total_deposits < CONFIG.GAMES.MUTANTS.MIN_DEPOSIT_REQUIRED) {
            this.container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2>📦 Mutants</h2>
                    <p style="margin: 20px 0; color: #8892b0;">
                        Эта игра доступна только при пополнении от ${CONFIG.GAMES.MUTANTS.MIN_DEPOSIT_REQUIRED}+ TON
                    </p>
                    <button class="btn-primary" onclick="app.showPage('games')">Вернуться</button>
                </div>
            `;
            return;
        }

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="mutants-container">
                <button class="btn-secondary" onclick="app.showPage('games')" style="margin-bottom: 20px;">
                    ← Назад
                </button>
                
                <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 20px;">📦 Mutants</h2>
                
                <div class="case-tabs">
                    <button class="case-tab active" data-tab="all">Все</button>
                    <button class="case-tab" data-tab="free">Бесплатные</button>
                    <button class="case-tab" data-tab="limited">Лимитированные</button>
                </div>
                
                <div class="cases-grid" id="cases-grid"></div>
            </div>
        `;

        this.setupEventListeners();
        this.displayCases();
    }

    setupEventListeners() {
        document.querySelectorAll('.case-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.case-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTab = e.target.dataset.tab;
                this.displayCases();
            });
        });
    }

    async displayCases() {
        const grid = document.getElementById('cases-grid');
        const cases = CONFIG.GAMES.MUTANTS.CASES;
        
        let filteredCases = Object.entries(cases);
        
        if (this.currentTab === 'free') {
            filteredCases = filteredCases.filter(([key, c]) => c.price === 0);
        } else if (this.currentTab === 'limited') {
            filteredCases = filteredCases.filter(([key, c]) => c.limited);
        }

        grid.innerHTML = '';

        for (const [key, caseData] of filteredCases) {
            const card = document.createElement('div');
            card.className = 'case-card';
            if (caseData.limited) card.classList.add('limited');

            let extraInfo = '';
            
            if (caseData.price === 0) {
                const canClaim = await api.canOpenFreeCase();
                extraInfo = canClaim.can_claim 
                    ? '<div class="case-timer">Доступен!</div>'
                    : `<div class="case-timer">${this.formatTime(canClaim.time_remaining)}</div>`;
            }

            card.innerHTML = `
                <div class="case-image">${caseData.price === 0 ? '🎁' : (caseData.limited ? '⭐' : '📦')}</div>
                <div class="case-name">${caseData.name}</div>
                <div class="case-price">${caseData.price === 0 ? 'FREE' : `⭐ ${caseData.price}`}</div>
                ${extraInfo}
            `;

            card.addEventListener('click', () => this.openCaseModal(key, caseData));
            grid.appendChild(card);
        }
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }

    openCaseModal(caseKey, caseData) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${caseData.name}</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 80px; margin-bottom: 16px;">
                            ${caseData.price === 0 ? '🎁' : (caseData.limited ? '⭐' : '📦')}
                        </div>
                        <div style="font-size: 24px; font-weight: 600; color: #f39c12;">
                            ${caseData.price === 0 ? 'FREE' : `${caseData.price} TON`}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 14px; color: #8892b0; margin-bottom: 12px;">Возможные награды:</div>
                        ${caseData.rewards.map(reward => `
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 8px;">
                                <span>${reward.name}</span>
                                <span style="color: #f39c12;">${reward.chance}%</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="btn-primary" id="open-case-btn">Открыть кейс</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.querySelector('#open-case-btn').onclick = async () => {
            await this.openCase(caseKey, caseData);
            modal.remove();
        };
    }

    async openCase(caseKey, caseData) {
        if (caseData.price > 0 && caseData.price > this.app.balance) {
            this.app.showNotification('Недостаточно средств', 'error');
            return;
        }

        try {
            const result = await api.openCase(caseKey);
            
            // Анимация открытия
            this.showOpeningAnimation(result);
            
            await this.app.loadUserData();
            this.displayCases();
        } catch (error) {
            this.app.showNotification('Ошибка открытия кейса', 'error');
        }
    }

    showOpeningAnimation(result) {
        const animation = document.createElement('div');
        animation.className = 'modal active';
        
        animation.innerHTML = `
            <div class="modal-content">
                <div class="modal-body" style="text-align: center; padding: 40px;">
                    <div class="loader-spinner" style="margin: 0 auto 20px;"></div>
                    <div style="font-size: 18px;">Открываем кейс...</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(animation);

        setTimeout(() => {
            animation.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>🎉 Награда!</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body" style="text-align: center;">
                        <div style="font-size: 64px; margin: 20px 0;">🎁</div>
                        <div style="font-size: 24px; font-weight: 600; margin-bottom: 12px;">
                            ${result.reward_name}
                        </div>
                        <div style="font-size: 18px; color: #f39c12;">
                            ${result.reward_value > 0 ? `${result.reward_value} TON` : ''}
                        </div>
                        <button class="btn-primary" style="margin-top: 20px;" onclick="this.closest('.modal').remove()">
                            Отлично!
                        </button>
                    </div>
                </div>
            `;

            animation.querySelector('.close-modal').onclick = () => animation.remove();
        }, 2000);
    }
}
