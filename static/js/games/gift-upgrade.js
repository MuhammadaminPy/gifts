// Gift Upgrade Game
class GiftUpgradeGame {
    constructor(container, app) {
        this.container = container;
        this.app = app;
        this.betAmount = 0;
        this.selectedMultiplier = null;
        this.isSpinning = false;
        
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="gift-upgrade-container">
                <button class="btn-secondary" onclick="app.showPage('games')" style="align-self: flex-start; margin-bottom: 20px;">
                    ← Назад
                </button>
                
                <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 20px;">🎁 Gift Upgrade</h2>
                
                <div class="wheel-container">
                    <div class="wheel-pointer"></div>
                    <div class="wheel" id="wheel">
                        <div class="wheel-center">🎁</div>
                    </div>
                </div>

                <div class="bet-controls">
                    <div class="control-group">
                        <div class="control-label">Сумма ставки (TON)</div>
                        <input type="number" class="control-input" id="bet-amount" placeholder="0.00" step="0.01" min="${CONFIG.GAMES.GIFT_UPGRADE.MIN_BET}">
                    </div>

                    <div class="control-group">
                        <div class="control-label">Выберите множитель</div>
                        <div class="multiplier-select" id="multiplier-select"></div>
                    </div>

                    <button class="btn-primary" id="spin-btn">Вращать</button>
                </div>

                <div class="game-history" id="game-history" style="display: none;">
                    <div class="history-title">Последняя игра</div>
                    <div id="last-game"></div>
                </div>
            </div>
        `;

        this.setupMultipliers();
        this.setupEventListeners();
        this.loadHistory();
    }

    setupMultipliers() {
        const container = document.getElementById('multiplier-select');
        CONFIG.GAMES.GIFT_UPGRADE.MULTIPLIERS.forEach(mult => {
            const btn = document.createElement('button');
            btn.className = 'multiplier-btn';
            btn.textContent = `${mult}x`;
            btn.onclick = () => this.selectMultiplier(mult, btn);
            container.appendChild(btn);
        });
    }

    selectMultiplier(multiplier, btnElement) {
        document.querySelectorAll('.multiplier-btn').forEach(btn => btn.classList.remove('selected'));
        btnElement.classList.add('selected');
        this.selectedMultiplier = multiplier;
        this.updateWheel(multiplier);
    }

    updateWheel(multiplier) {
        const wheel = document.getElementById('wheel');
        const winChance = Math.min(100 / multiplier, 90);
        const segments = 20;
        
        let html = '<div class="wheel-center">🎁</div>';
        
        for (let i = 0; i < segments; i++) {
            const angle = (360 / segments) * i;
            const isWin = (i / segments * 100) < winChance;
            const color = isWin ? '#2ecc71' : '#e74c3c';
            
            html += `<div class="wheel-segment" style="
                transform: rotate(${angle}deg);
                background: ${color};
            "></div>`;
        }
        
        wheel.innerHTML = html;
    }

    setupEventListeners() {
        document.getElementById('spin-btn').onclick = () => this.spin();
    }

    async spin() {
        if (this.isSpinning) return;

        const betAmount = parseFloat(document.getElementById('bet-amount').value);

        if (!betAmount || betAmount < CONFIG.GAMES.GIFT_UPGRADE.MIN_BET) {
            this.app.showNotification(`Минимальная ставка: ${CONFIG.GAMES.GIFT_UPGRADE.MIN_BET} TON`, 'error');
            return;
        }

        if (!this.selectedMultiplier) {
            this.app.showNotification('Выберите множитель', 'error');
            return;
        }

        if (betAmount > this.app.balance) {
            this.app.showNotification('Недостаточно средств', 'error');
            return;
        }

        this.isSpinning = true;
        document.getElementById('spin-btn').disabled = true;

        try {
            const result = await api.playGiftUpgrade(betAmount, this.selectedMultiplier);
            
            // Анимация вращения
            const wheel = document.getElementById('wheel');
            const rotations = 5 + Math.random() * 3;
            const finalAngle = result.result === 'win' ? 45 : 225;
            const totalRotation = rotations * 360 + finalAngle;
            
            wheel.style.transform = `rotate(${totalRotation}deg)`;
            
            setTimeout(async () => {
                await this.app.loadUserData();
                this.showResult(result);
                this.loadHistory();
                this.isSpinning = false;
                document.getElementById('spin-btn').disabled = false;
                wheel.style.transform = 'rotate(0deg)';
            }, 3000);
            
        } catch (error) {
            this.app.showNotification('Ошибка игры', 'error');
            this.isSpinning = false;
            document.getElementById('spin-btn').disabled = false;
        }
    }

    showResult(result) {
        const message = result.result === 'win' 
            ? `🎉 Выигрыш! +${result.win_amount} TON`
            : `😢 Проигрыш -${result.bet_amount} TON`;
        
        this.app.showNotification(message, result.result === 'win' ? 'success' : 'error');
    }

    async loadHistory() {
        try {
            const history = await api.getGiftUpgradeHistory(1);
            
            if (history.length > 0) {
                const game = history[0];
                const historyDiv = document.getElementById('game-history');
                historyDiv.style.display = 'block';
                
                document.getElementById('last-game').innerHTML = `
                    <div class="history-item ${game.result}">
                        <div>
                            <div>Ставка: ${game.bet_amount} TON</div>
                            <div>Множитель: ${game.multiplier}x</div>
                        </div>
                        <div style="text-align: right; font-weight: 600;">
                            ${game.result === 'win' ? '+' : '-'}${game.win_amount} TON
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }
}
