// Конфигурация приложения
const CONFIG = {
    // API endpoint - замените на свой URL после деплоя
    API_URL: 'https://your-backend-url.com',
    
    // Telegram Bot username
    BOT_USERNAME: 'YourBotUsername',
    
    // TON Connect настройки
    TON_CONNECT: {
        manifestUrl: 'https://your-github-pages.github.io/tonconnect-manifest.json'
    },
    
    // Настройки игр
    GAMES: {
        GIFT_UPGRADE: {
            MIN_BET: 0.01,
            MAX_BET: 100,
            MULTIPLIERS: [1.3, 2, 3, 5, 10, 20]
        },
        ROLLS: {
            MIN_BET: 0.01,
            MAX_BET: 50,
            GAME_INTERVAL: 10000, // 10 секунд
            COLORS: {
                RED: { multiplier: 2, count: 49 },
                BLUE: { multiplier: 2, count: 49 },
                GREEN: { multiplier: 10, count: 2 }
            }
        },
        MUTANTS: {
            MIN_DEPOSIT_REQUIRED: 5,
            CASES: {
                FREE: {
                    name: 'Ежедневный кейс',
                    price: 0,
                    cooldown: 86400000, // 24 часа
                    rewards: [
                        { name: '0.05 TON', value: 0.05, chance: 100 }
                    ]
                },
                REGULAR_1: {
                    name: 'Обычный кейс #1',
                    price: 5,
                    rewards: [
                        { name: 'Jolly Chimp', type: 'nft', value: 15, chance: 5.36 },
                        { name: '1 TON', value: 1, chance: 79 },
                        { name: '3.4 TON', value: 3.4, chance: 10.64 },
                        { name: 'Restless Jar', type: 'nft', value: 25, chance: 2 },
                        { name: 'Neko Helmet', type: 'nft', value: 50, chance: 0.2 },
                        { name: 'Ничего', value: 0, chance: 2.8 }
                    ]
                },
                REGULAR_2: {
                    name: 'Обычный кейс #2',
                    price: 5,
                    rewards: [
                        { name: 'Jolly Chimp', type: 'nft', value: 15, chance: 5.36 },
                        { name: '1 TON', value: 1, chance: 79 },
                        { name: '3.4 TON', value: 3.4, chance: 10.64 },
                        { name: 'Restless Jar', type: 'nft', value: 25, chance: 2 },
                        { name: 'Neko Helmet', type: 'nft', value: 50, chance: 0.2 },
                        { name: 'Ничего', value: 0, chance: 2.8 }
                    ]
                },
                SNOOP_GIFTS: {
                    name: 'Snoop Gifts',
                    price: 7,
                    limited: true,
                    rewards: [
                        { name: 'Low Rider', type: 'nft', value: 500, chance: 0.01 },
                        { name: 'Cigar Doggystyle', type: 'nft', value: 200, chance: 0.36 },
                        { name: 'Cigar Infinity', type: 'nft', value: 100, chance: 1 },
                        { name: 'Cigar Space', type: 'nft', value: 75, chance: 1.76 },
                        { name: 'Snoop Dog King Snoop', type: 'nft', value: 50, chance: 2.52 },
                        { name: 'Snoop Dog', type: 'nft', value: 30, chance: 8.41 },
                        { name: 'Swag Bag', type: 'nft', value: 20, chance: 9 },
                        { name: '2.2 TON', value: 2.2, chance: 80 },
                        { name: 'Ничего', value: 0, chance: -3.06 }
                    ]
                }
            }
        }
    },
    
    // Настройки выводов
    WITHDRAWAL: {
        MIN_AMOUNT: 10,
        MIN_REF_TRANSFER: 3
    },
    
    // Конвертация Stars в TON
    STARS_TO_TON_RATE: 1.099 / 100, // 100 stars = 1.099 TON
    
    // Реферальная система
    REFERRAL: {
        DEFAULT_PERCENT: 10,
        MIN_TRANSFER: 3
    }
};

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
