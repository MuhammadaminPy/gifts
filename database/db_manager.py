import aiosqlite
import asyncio
from datetime import datetime, timedelta
import json
import random
import string

class DatabaseManager:
    def __init__(self, db_path='database/casino.db'):
        self.db_path = db_path
    
    async def init_database(self):
        """Инициализация базы данных"""
        async with aiosqlite.connect(self.db_path) as db:
            # Таблица пользователей
            await db.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    username TEXT,
                    first_name TEXT,
                    balance REAL DEFAULT 0,
                    ref_balance REAL DEFAULT 0,
                    total_deposits REAL DEFAULT 0,
                    games_played INTEGER DEFAULT 0,
                    ref_percent INTEGER DEFAULT 10,
                    referred_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Таблица игр Gift Upgrade
            await db.execute('''
                CREATE TABLE IF NOT EXISTS gift_upgrade_games (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    bet_amount REAL,
                    multiplier REAL,
                    win_amount REAL,
                    result TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            ''')
            
            # Таблица игр Rolls
            await db.execute('''
                CREATE TABLE IF NOT EXISTS rolls_games (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_number INTEGER,
                    winning_color TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Таблица ставок в Rolls
            await db.execute('''
                CREATE TABLE IF NOT EXISTS rolls_bets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    game_number INTEGER,
                    bet_color TEXT,
                    bet_amount REAL,
                    win_amount REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            ''')
            
            # Таблица открытия кейсов
            await db.execute('''
                CREATE TABLE IF NOT EXISTS case_openings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    case_name TEXT,
                    case_price REAL,
                    reward_name TEXT,
                    reward_value REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            ''')
            
            # Таблица инвентаря
            await db.execute('''
                CREATE TABLE IF NOT EXISTS inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    item_name TEXT,
                    item_value REAL,
                    item_type TEXT,
                    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            ''')
            
            # Таблица пополнений
            await db.execute('''
                CREATE TABLE IF NOT EXISTS deposits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    amount REAL,
                    method TEXT,
                    status TEXT DEFAULT 'completed',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            ''')
            
            # Таблица выводов
            await db.execute('''
                CREATE TABLE IF NOT EXISTS withdrawals (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER,
                    amount REAL,
                    wallet TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            ''')
            
            # Таблица последнего бесплатного кейса
            await db.execute('''
                CREATE TABLE IF NOT EXISTS free_case_claims (
                    user_id INTEGER PRIMARY KEY,
                    last_claim TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            ''')
            
            await db.commit()
    
    async def register_user(self, user_id, username, first_name, referred_by=None):
        """Регистрация нового пользователя"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                'INSERT OR IGNORE INTO users (user_id, username, first_name, referred_by) VALUES (?, ?, ?, ?)',
                (user_id, username, first_name, referred_by)
            )
            await db.commit()
            
            # Если есть реферер, начислить ему бонус за привлечение
            if referred_by:
                await db.execute(
                    'UPDATE users SET ref_balance = ref_balance + 0 WHERE user_id = ?',
                    (referred_by,)
                )
                await db.commit()
    
    async def update_last_activity(self, user_id):
        """Обновление последней активности"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE user_id = ?',
                (user_id,)
            )
            await db.commit()
    
    async def get_balance(self, user_id):
        """Получение баланса пользователя"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                'SELECT balance, ref_balance FROM users WHERE user_id = ?',
                (user_id,)
            )
            row = await cursor.fetchone()
            return {'balance': row[0] if row else 0, 'ref_balance': row[1] if row else 0}
    
    async def add_balance(self, user_id, amount):
        """Добавление баланса"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                'UPDATE users SET balance = balance + ? WHERE user_id = ?',
                (amount, user_id)
            )
            await db.commit()
    
    async def remove_balance(self, user_id, amount):
        """Удаление баланса"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                'UPDATE users SET balance = balance - ? WHERE user_id = ?',
                (amount, user_id)
            )
            await db.commit()
    
    async def add_deposit(self, user_id, amount, method):
        """Добавление записи о пополнении"""
        async with aiosqlite.connect(self.db_path) as db:
            # Добавить пополнение
            await db.execute(
                'INSERT INTO deposits (user_id, amount, method) VALUES (?, ?, ?)',
                (user_id, amount, method)
            )
            
            # Обновить баланс
            await db.execute(
                'UPDATE users SET balance = balance + ?, total_deposits = total_deposits + ? WHERE user_id = ?',
                (amount, amount, user_id)
            )
            
            # Начислить рефереру
            cursor = await db.execute(
                'SELECT referred_by FROM users WHERE user_id = ?',
                (user_id,)
            )
            row = await cursor.fetchone()
            
            if row and row[0]:
                referred_by = row[0]
                cursor = await db.execute(
                    'SELECT ref_percent FROM users WHERE user_id = ?',
                    (referred_by,)
                )
                ref_row = await cursor.fetchone()
                
                if ref_row:
                    ref_percent = ref_row[0]
                    ref_bonus = amount * (ref_percent / 100)
                    
                    await db.execute(
                        'UPDATE users SET ref_balance = ref_balance + ? WHERE user_id = ?',
                        (ref_bonus, referred_by)
                    )
            
            await db.commit()
    
    async def create_withdrawal_request(self, user_id, amount, wallet):
        """Создание запроса на вывод"""
        request_id = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                'INSERT INTO withdrawals (id, user_id, amount, wallet) VALUES (?, ?, ?, ?)',
                (request_id, user_id, amount, wallet)
            )
            
            # Заблокировать средства
            await db.execute(
                'UPDATE users SET balance = balance - ? WHERE user_id = ?',
                (amount, user_id)
            )
            
            await db.commit()
        
        return request_id
    
    async def approve_withdrawal(self, request_id):
        """Одобрение вывода"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                'SELECT user_id, amount FROM withdrawals WHERE id = ? AND status = "pending"',
                (request_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                await db.execute(
                    'UPDATE withdrawals SET status = "approved", processed_at = CURRENT_TIMESTAMP WHERE id = ?',
                    (request_id,)
                )
                await db.commit()
                
                return {'user_id': row[0], 'amount': row[1]}
        
        return None
    
    async def reject_withdrawal(self, request_id):
        """Отклонение вывода"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                'SELECT user_id, amount FROM withdrawals WHERE id = ? AND status = "pending"',
                (request_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                user_id, amount = row
                
                # Вернуть средства
                await db.execute(
                    'UPDATE users SET balance = balance + ? WHERE user_id = ?',
                    (amount, user_id)
                )
                
                await db.execute(
                    'UPDATE withdrawals SET status = "rejected", processed_at = CURRENT_TIMESTAMP WHERE id = ?',
                    (request_id,)
                )
                
                await db.commit()
                
                return {'user_id': user_id, 'amount': amount}
        
        return None
    
    async def transfer_ref_balance(self, user_id):
        """Перевод реферального баланса на основной"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                'SELECT ref_balance FROM users WHERE user_id = ?',
                (user_id,)
            )
            row = await cursor.fetchone()
            
            if row and row[0] >= 3:
                ref_balance = row[0]
                
                await db.execute(
                    'UPDATE users SET balance = balance + ?, ref_balance = 0 WHERE user_id = ?',
                    (ref_balance, user_id)
                )
                await db.commit()
                
                return ref_balance
        
        return 0
    
    async def get_user_info(self, user_id):
        """Получение информации о пользователе"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                'SELECT * FROM users WHERE user_id = ?',
                (user_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                return dict(row)
        
        return None
    
    async def get_user_referrals(self, user_id):
        """Получение списка рефералов"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                'SELECT user_id, username, total_deposits, created_at FROM users WHERE referred_by = ?',
                (user_id,)
            )
            rows = await cursor.fetchall()
            
            return [dict(row) for row in rows]
    
    async def get_admin_stats(self):
        """Получение статистики для админа"""
        async with aiosqlite.connect(self.db_path) as db:
            # Всего пользователей
            cursor = await db.execute('SELECT COUNT(*) FROM users')
            total_users = (await cursor.fetchone())[0]
            
            # Онлайн (активность за последние 5 минут)
            cursor = await db.execute(
                'SELECT COUNT(*) FROM users WHERE last_activity > datetime("now", "-5 minutes")'
            )
            online_now = (await cursor.fetchone())[0]
            
            # Новые за 24 часа
            cursor = await db.execute(
                'SELECT COUNT(*) FROM users WHERE created_at > datetime("now", "-1 day")'
            )
            new_24h = (await cursor.fetchone())[0]
            
            # Всего пополнено
            cursor = await db.execute('SELECT COALESCE(SUM(amount), 0) FROM deposits')
            total_deposits = (await cursor.fetchone())[0]
            
            return {
                'total_users': total_users,
                'online_now': online_now,
                'new_24h': new_24h,
                'total_deposits': total_deposits
            }
    
    async def get_leaderboard(self, limit=35):
        """Получение лидерборда"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                'SELECT user_id, username, first_name, total_deposits FROM users ORDER BY total_deposits DESC LIMIT ?',
                (limit,)
            )
            rows = await cursor.fetchall()
            
            return [dict(row) for row in rows]
    
    async def add_game_played(self, user_id):
        """Увеличить счетчик игр"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                'UPDATE users SET games_played = games_played + 1 WHERE user_id = ?',
                (user_id,)
            )
            await db.commit()
    
    async def get_inventory(self, user_id):
        """Получение инвентаря пользователя"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                'SELECT * FROM inventory WHERE user_id = ?',
                (user_id,)
            )
            rows = await cursor.fetchall()
            
            return [dict(row) for row in rows]
    
    async def add_to_inventory(self, user_id, item_name, item_value, item_type):
        """Добавление предмета в инвентарь"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                'INSERT INTO inventory (user_id, item_name, item_value, item_type) VALUES (?, ?, ?, ?)',
                (user_id, item_name, item_value, item_type)
            )
            await db.commit()
    
    async def sell_inventory_item(self, item_id, user_id):
        """Продажа предмета из инвентаря"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                'SELECT item_value FROM inventory WHERE id = ? AND user_id = ?',
                (item_id, user_id)
            )
            row = await cursor.fetchone()
            
            if row:
                item_value = row[0]
                
                await db.execute('DELETE FROM inventory WHERE id = ?', (item_id,))
                await db.execute(
                    'UPDATE users SET balance = balance + ? WHERE user_id = ?',
                    (item_value, user_id)
                )
                await db.commit()
                
                return item_value
        
        return 0
    
    async def can_claim_free_case(self, user_id):
        """Проверка возможности открыть бесплатный кейс"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                'SELECT last_claim FROM free_case_claims WHERE user_id = ?',
                (user_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return True
            
            last_claim = datetime.fromisoformat(row[0])
            now = datetime.now()
            
            return (now - last_claim).total_seconds() >= 86400  # 24 часа
    
    async def claim_free_case(self, user_id):
        """Отметка об открытии бесплатного кейса"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                'INSERT OR REPLACE INTO free_case_claims (user_id, last_claim) VALUES (?, CURRENT_TIMESTAMP)',
                (user_id,)
            )
            await db.commit()
