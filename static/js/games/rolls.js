// Rolls Game
class RollsGame {
    constructor(container, app) {
        this.container = container;
        this.app = app;
        this.gameInterval = null;
        this.currentGame = null;
        this.timeRemaining = 10;
        this.betColor = null;
        this.betAmount = 0;
        
        this.render();
        this.startGameLoop();
    }

    render() {
        this.container.innerHTML = `
            <div class="rolls-container">
                <button class="btn-secondary" onclick="app.showPage('games')" style="margin-bottom: 20px;">
                    ← Назад
                </button>
                
                <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 20px;">🎲 Rolls</h2>
                
                <div class="rolls-timer" id="timer">ROLLING IN 10</div>
                
                <div class="rolls-chips" id="chips-container"></div>
                
                <div class="rolls-history" id="rolls-history"></div>
                
                <div class="rolls-betting">
                    <div class="bet-option red" data-color="red">
                        <div class="bet-color">💎</div>
                        <div class="bet-multiplier">2x</div>
                        <div class="bet-amount-display" id="red-bets">0 TON</div>
                    </div>
                    <div class="bet-option blue" data-color="blue">
                        <div class="bet-color">💎</div>
                        <div class="bet-multiplier">2x</div>
                        <div class="bet-amount-display" id="blue-bets">0 TON</div>
                    </div>
                    <div class="bet-option green" data-color="green">
                        <div class="bet-color">💎</div>
                        <div class="bet-multiplier">10x</div>
                        <div class="bet-amount-display" id="green-bets">0 TON</div>
                    </div>
                </div>
                
                <div class="bet-controls">
                    <div class="control-group">
                        <div class="control-label">Сумма ставки (TON)</div>
                        <input type="number" class="control-input" id="rolls-bet-amount" placeholder="0.00" step="0.01" min="${CONFIG.GAMES.ROLLS.MIN_BET}">
                    </div>
                    <button class="btn-primary" id="place-bet-btn">Поставить</button>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.loadHistory();
    }

    setupEventListeners() {
        document.querySelectorAll('.bet-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const color = e.currentTarget.dataset.color;
                this.selectColor(color, e.currentTarget);
            });
        });

        document.getElementById('place-bet-btn').addEventListener('click', () => this.placeBet());
    }

    selectColor(color, element) {
        document.querySelectorAll('.bet-option').forEach(opt => opt.style.opacity = '0.5');
        element.style.opacity = '1';
        this.betColor = color;
    }

    async placeBet() {
        const amount = parseFloat(document.getElementById('rolls-bet-amount').value);

        if (!amount || amount < CONFIG.GAMES.ROLLS.MIN_BET) {
            this.app.showNotification(`Минимальная ставка: ${CONFIG.GAMES.ROLLS.MIN_BET} TON`, 'error');
            return;
        }

        if (!this.betColor) {
            this.app.showNotification('Выберите цвет', 'error');
            return;
        }

        if (amount > this.app.balance) {
            this.app.showNotification('Недостаточно средств', 'error');
            return;
        }

        try {
            await api.placeBet(this.betColor, amount);
            await this.app.loadUserData();
            this.app.showNotification('Ставка принята', 'success');
            this.updateBetsDisplay();
        } catch (error) {
            this.app.showNotification('Ошибка ставки', 'error');
        }
    }

    async startGameLoop() {
        this.currentGame = await api.getCurrentRollsGame();
        
        this.gameInterval = setInterval(async () => {
            this.timeRemaining--;
            document.getElementById('timer').textContent = `ROLLING IN ${this.timeRemaining}`;

            if (this.timeRemaining <= 0) {
                await this.playRound();
                this.timeRemaining = 10;
            }

            this.updateBetsDisplay();
        }, 1000);
    }

    async playRound() {
        try {
            this.generateChips();
            
            // Имитация выбора победителя
            const random = Math.random() * 100;
            let winningColor;
            
            if (random < 2) {
                winningColor = 'green';
            } else if (random < 51) {
                winningColor = 'red';
            } else {
                winningColor = 'blue';
            }

            setTimeout(() => {
                this.highlightWinner(winningColor);
                this.loadHistory();
            }, 2000);
        } catch (error) {
            console.error('Error playing round:', error);
        }
    }

    generateChips() {
        const container = document.getElementById('chips-container');
        container.innerHTML = '';
        
        const chips = [];
        
        // 2 зеленых
        chips.push('green', 'green');
        
        // 49 красных и 49 синих
        for (let i = 0; i < 49; i++) {
            chips.push('red', 'blue');
        }
        
        // Перемешать
        chips.sort(() => Math.random() - 0.5);
        
        // Анимация прокрутки
        chips.forEach((color, index) => {
            const chip = document.createElement('div');
            chip.className = `chip ${color}`;
            chip.textContent = '💎';
            container.appendChild(chip);
            
            setTimeout(() => {
                chip.style.transform = `translateX(-${index * 68}px)`;
            }, 100);
        });
    }

    highlightWinner(color) {
        document.querySelectorAll('.chip').forEach(chip => {
            if (chip.classList.contains(color)) {
                chip.classList.add('winner');
            }
        });

        this.app.showNotification(`Победный цвет: ${color}`, 'info');
    }

    async updateBetsDisplay() {
        try {
            const bets = await api.getRollsBets(this.currentGame.game_number);
            
            const redTotal = bets.filter(b => b.color === 'red').reduce((sum, b) => sum + b.amount, 0);
            const blueTotal = bets.filter(b => b.color === 'blue').reduce((sum, b) => sum + b.amount, 0);
            const greenTotal = bets.filter(b => b.color === 'green').reduce((sum, b) => sum + b.amount, 0);

            document.getElementById('red-bets').textContent = `${redTotal.toFixed(2)} TON`;
            document.getElementById('blue-bets').textContent = `${blueTotal.toFixed(2)} TON`;
            document.getElementById('green-bets').textContent = `${greenTotal.toFixed(2)} TON`;
        } catch (error) {
            console.error('Error updating bets:', error);
        }
    }

    async loadHistory() {
        try {
            const history = await api.getRollsHistory(100);
            const container = document.getElementById('rolls-history');
            
            container.innerHTML = '<div style="font-size: 12px; color: #8892b0; margin-bottom: 8px;">Last 100</div>';
            
            const stats = { red: 0, blue: 0, green: 0 };
            
            history.slice(0, 100).forEach(game => {
                const chip = document.createElement('div');
                chip.className = `history-chip ${game.winning_color}`;
                container.appendChild(chip);
                stats[game.winning_color]++;
            });

            const statsDiv = document.createElement('div');
            statsDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 8px; font-size: 12px;';
            statsDiv.innerHTML = `
                <span style="color: #e74c3c;">${stats.red}</span>
                <span style="color: #3498db;">${stats.blue}</span>
                <span style="color: #2ecc71;">${stats.green}</span>
            `;
            container.appendChild(statsDiv);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }
}
