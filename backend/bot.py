import os
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiohttp import web
import asyncio
from database.db_manager import DatabaseManager

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Токены и настройки
BOT_TOKEN = os.getenv('BOT_TOKEN', 'YOUR_BOT_TOKEN')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://your-github-pages-url.github.io')
ADMIN_ID = int(os.getenv('ADMIN_ID', '0'))
WEBHOOK_PATH = f'/bot/{BOT_TOKEN}'
WEBHOOK_URL = os.getenv('WEBHOOK_URL', '')  # URL вашего сервера для webhook

# Инициализация
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
db = DatabaseManager()

# Клавиатура с Web App
def get_main_keyboard():
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎮 Открыть Casino", web_app=WebAppInfo(url=WEBAPP_URL))]
    ])
    return keyboard

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Обработка команды /start"""
    user_id = message.from_user.id
    username = message.from_user.username or "Anonymous"
    first_name = message.from_user.first_name or "User"
    
    # Проверка реферальной ссылки
    ref_id = None
    if message.text and len(message.text.split()) > 1:
        ref_code = message.text.split()[1]
        if ref_code.startswith('ref_'):
            ref_id = int(ref_code.replace('ref_', ''))
    
    # Регистрация пользователя
    await db.register_user(user_id, username, first_name, ref_id)
    
    # Уведомление админа о новом пользователе
    if user_id != ADMIN_ID:
        try:
            await bot.send_message(
                ADMIN_ID,
                f"🆕 Новый пользователь!\n"
                f"ID: {user_id}\n"
                f"Username: @{username}\n"
                f"Name: {first_name}"
            )
        except Exception as e:
            logger.error(f"Failed to notify admin: {e}")
    
    await message.answer(
        f"👋 Добро пожаловать, {first_name}!\n\n"
        f"🎰 Это казино-бот с играми:\n"
        f"• Gift Upgrade - рулетка с выбором множителя\n"
        f"• Rolls - цветная рулетка в реальном времени\n"
        f"• Mutants - открытие кейсов с NFT\n\n"
        f"💎 Нажми на кнопку ниже, чтобы начать играть!",
        reply_markup=get_main_keyboard()
    )

@dp.message(Command("admin"))
async def cmd_admin(message: types.Message):
    """Админ панель"""
    if message.from_user.id != ADMIN_ID:
        await message.answer("❌ У вас нет доступа к админ-панели!")
        return
    
    stats = await db.get_admin_stats()
    
    text = (
        f"📊 Админ панель\n\n"
        f"👥 Всего пользователей: {stats['total_users']}\n"
        f"🟢 Онлайн сейчас: {stats['online_now']}\n"
        f"📈 Новых за 24ч: {stats['new_24h']}\n"
        f"💰 Всего пополнено: {stats['total_deposits']:.2f} TON\n\n"
        f"Используйте команды:\n"
        f"/addbalance [user_id] [amount] - добавить баланс\n"
        f"/removebalance [user_id] [amount] - убрать баланс\n"
        f"/setreferral [user_id] [percent] - установить реф %\n"
        f"/userinfo [user_id] - информация о пользователе"
    )
    
    await message.answer(text)

@dp.message(Command("addbalance"))
async def cmd_add_balance(message: types.Message):
    """Добавление баланса пользователю"""
    if message.from_user.id != ADMIN_ID:
        return
    
    try:
        parts = message.text.split()
        user_id = int(parts[1])
        amount = float(parts[2])
        
        await db.add_balance(user_id, amount)
        await message.answer(f"✅ Добавлено {amount} TON пользователю {user_id}")
        
        # Уведомление пользователя
        try:
            await bot.send_message(
                user_id,
                f"💰 Ваш баланс пополнен на {amount} TON администратором!"
            )
        except:
            pass
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")

@dp.message(Command("removebalance"))
async def cmd_remove_balance(message: types.Message):
    """Удаление баланса у пользователя"""
    if message.from_user.id != ADMIN_ID:
        return
    
    try:
        parts = message.text.split()
        user_id = int(parts[1])
        amount = float(parts[2])
        
        await db.remove_balance(user_id, amount)
        await message.answer(f"✅ Убрано {amount} TON у пользователя {user_id}")
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")

@dp.message(Command("userinfo"))
async def cmd_user_info(message: types.Message):
    """Информация о пользователе"""
    if message.from_user.id != ADMIN_ID:
        return
    
    try:
        user_id = int(message.text.split()[1])
        info = await db.get_user_info(user_id)
        
        if not info:
            await message.answer("❌ Пользователь не найден")
            return
        
        referrals = await db.get_user_referrals(user_id)
        
        text = (
            f"📋 Информация о пользователе\n\n"
            f"🆔 ID: {info['user_id']}\n"
            f"👤 Username: @{info['username']}\n"
            f"💰 Баланс: {info['balance']:.2f} TON\n"
            f"💎 Реф. баланс: {info['ref_balance']:.2f} TON\n"
            f"📊 Всего пополнено: {info['total_deposits']:.2f} TON\n"
            f"🎮 Игр сыграно: {info['games_played']}\n"
            f"👥 Рефералов: {len(referrals)}\n"
            f"📈 Реф. процент: {info['ref_percent']}%\n"
            f"📅 Регистрация: {info['created_at']}"
        )
        
        await message.answer(text)
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")

# Webhook обработчики для уведомлений от фронтенда
async def webhook_handler(request):
    """Обработка webhook от веб-приложения"""
    try:
        data = await request.json()
        action = data.get('action')
        
        if action == 'deposit_notification':
            # Уведомление админа о пополнении
            user_id = data.get('user_id')
            amount = data.get('amount')
            method = data.get('method')
            
            user_info = await db.get_user_info(user_id)
            username = user_info['username'] if user_info else 'Unknown'
            
            await bot.send_message(
                ADMIN_ID,
                f"💰 Новое пополнение!\n\n"
                f"👤 Пользователь: @{username} (ID: {user_id})\n"
                f"💵 Сумма: {amount} TON\n"
                f"💳 Метод: {method}"
            )
        
        elif action == 'withdrawal_request':
            # Запрос на вывод
            user_id = data.get('user_id')
            amount = data.get('amount')
            wallet = data.get('wallet')
            request_id = data.get('request_id')
            
            user_info = await db.get_user_info(user_id)
            username = user_info['username'] if user_info else 'Unknown'
            
            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [
                    InlineKeyboardButton(text="✅ Одобрить", callback_data=f"approve_{request_id}"),
                    InlineKeyboardButton(text="❌ Отклонить", callback_data=f"reject_{request_id}")
                ]
            ])
            
            await bot.send_message(
                ADMIN_ID,
                f"💸 Новый запрос на вывод!\n\n"
                f"👤 Пользователь: @{username} (ID: {user_id})\n"
                f"💵 Сумма: {amount} TON\n"
                f"👛 Кошелек: {wallet}\n"
                f"🆔 ID запроса: {request_id}",
                reply_markup=keyboard
            )
        
        return web.json_response({'status': 'ok'})
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return web.json_response({'status': 'error', 'message': str(e)}, status=500)

@dp.callback_query(F.data.startswith('approve_'))
async def approve_withdrawal(callback: types.CallbackQuery):
    """Одобрение вывода средств"""
    if callback.from_user.id != ADMIN_ID:
        return
    
    request_id = callback.data.replace('approve_', '')
    
    # Обновление статуса в БД
    withdrawal = await db.approve_withdrawal(request_id)
    
    if withdrawal:
        await callback.answer("✅ Вывод одобрен")
        await callback.message.edit_text(
            callback.message.text + "\n\n✅ ОДОБРЕНО",
            reply_markup=None
        )
        
        # Уведомление пользователя
        try:
            await bot.send_message(
                withdrawal['user_id'],
                f"✅ Ваш запрос на вывод {withdrawal['amount']} TON одобрен!\n"
                f"Средства будут отправлены на кошелек в течение 24 часов."
            )
        except:
            pass
    else:
        await callback.answer("❌ Ошибка при одобрении")

@dp.callback_query(F.data.startswith('reject_'))
async def reject_withdrawal(callback: types.CallbackQuery):
    """Отклонение вывода средств"""
    if callback.from_user.id != ADMIN_ID:
        return
    
    request_id = callback.data.replace('reject_', '')
    
    # Обновление статуса в БД
    withdrawal = await db.reject_withdrawal(request_id)
    
    if withdrawal:
        await callback.answer("❌ Вывод отклонен")
        await callback.message.edit_text(
            callback.message.text + "\n\n❌ ОТКЛОНЕНО",
            reply_markup=None
        )
        
        # Уведомление пользователя
        try:
            await bot.send_message(
                withdrawal['user_id'],
                f"❌ Ваш запрос на вывод {withdrawal['amount']} TON отклонен.\n"
                f"Средства возвращены на ваш баланс."
            )
        except:
            pass
    else:
        await callback.answer("❌ Ошибка при отклонении")

async def on_startup(app):
    """Действия при запуске"""
    await db.init_database()
    if WEBHOOK_URL:
        await bot.set_webhook(WEBHOOK_URL + WEBHOOK_PATH)
        logger.info(f"Webhook set to {WEBHOOK_URL + WEBHOOK_PATH}")

async def on_shutdown(app):
    """Действия при остановке"""
    await bot.delete_webhook()
    await bot.session.close()

def main():
    """Запуск бота"""
    # Создание веб-приложения
    app = web.Application()
    
    # Добавление webhook обработчика
    app.router.add_post('/webhook/notify', webhook_handler)
    
    # Настройка бота
    webhook_handler_obj = SimpleRequestHandler(dispatcher=dp, bot=bot)
    webhook_handler_obj.register(app, path=WEBHOOK_PATH)
    
    # События
    app.on_startup.append(on_startup)
    app.on_shutdown.append(on_shutdown)
    
    # Запуск сервера
    web.run_app(app, host='0.0.0.0', port=8080)

if __name__ == '__main__':
    main()
