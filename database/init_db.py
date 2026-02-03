"""
Скрипт для инициализации базы данных
Запустите этот файл один раз перед первым запуском бота
"""
import asyncio
import sys
sys.path.append('..')
from database.db_manager import DatabaseManager

async def main():
    print("🔧 Инициализация базы данных...")
    db = DatabaseManager()
    await db.init_database()
    print("✅ База данных успешно создана!")
    print("📊 Создано таблиц: users, gift_upgrade_games, rolls_games, rolls_bets, case_openings, inventory, deposits, withdrawals, free_case_claims")

if __name__ == '__main__':
    asyncio.run(main())
