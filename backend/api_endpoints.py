"""
API Endpoints для обработки запросов от Frontend
"""
from aiohttp import web
import json
import random
from database.db_manager import DatabaseManager

db = DatabaseManager()

# User endpoints
async def get_user_data(request):
    """Получить данные пользователя"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    
    user_info = await db.get_user_info(user_id)
    balance_data = await db.get_balance(user_id)
    
    return web.json_response({
        'user': user_info,
        'balance': balance_data['balance'],
        'ref_balance': balance_data['ref_balance']
    })

async def get_balance(request):
    """Получить баланс"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    balance_data = await db.get_balance(user_id)
    return web.json_response(balance_data)

async def update_activity(request):
    """Обновить активность пользователя"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    await db.update_last_activity(user_id)
    return web.json_response({'status': 'ok'})

# Gift Upgrade Game
async def play_gift_upgrade(request):
    """Играть в Gift Upgrade"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    data = await request.json()
    
    bet_amount = float(data['bet_amount'])
    multiplier = float(data['multiplier'])
    
    # Проверка баланса
    balance_data = await db.get_balance(user_id)
    if balance_data['balance'] < bet_amount:
        return web.json_response({'error': 'Insufficient balance'}, status=400)
    
    # Вычисление шанса выигрыша
    win_chance = min(100 / multiplier, 90)
    is_win = random.random() * 100 < win_chance
    
    # Обновление баланса
    if is_win:
        win_amount = bet_amount * multiplier
        await db.add_balance(user_id, win_amount - bet_amount)
        result = 'win'
    else:
        await db.remove_balance(user_id, bet_amount)
        win_amount = 0
        result = 'loss'
    
    # Сохранение в историю
    await db.add_game_played(user_id)
    
    return web.json_response({
        'result': result,
        'bet_amount': bet_amount,
        'win_amount': win_amount,
        'multiplier': multiplier,
        'balance': (await db.get_balance(user_id))['balance']
    })

async def get_gift_upgrade_history(request):
    """История Gift Upgrade"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    limit = int(request.query.get('limit', 10))
    
    # Заглушка - в реальности нужно добавить метод в db_manager
    return web.json_response([])

# Rolls Game
async def get_current_rolls_game(request):
    """Текущая игра Rolls"""
    # Заглушка - нужна логика для синхронизации игр
    return web.json_response({
        'game_number': 1,
        'time_remaining': 10
    })

async def place_rolls_bet(request):
    """Сделать ставку в Rolls"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    data = await request.json()
    
    color = data['color']
    amount = float(data['amount'])
    
    # Проверка баланса
    balance_data = await db.get_balance(user_id)
    if balance_data['balance'] < amount:
        return web.json_response({'error': 'Insufficient balance'}, status=400)
    
    # Снятие средств
    await db.remove_balance(user_id, amount)
    
    return web.json_response({'status': 'ok'})

async def get_rolls_history(request):
    """История Rolls"""
    limit = int(request.query.get('limit', 100))
    # Заглушка
    return web.json_response([])

async def get_rolls_bets(request):
    """Ставки текущей игры Rolls"""
    game_number = int(request.query.get('game_number', 1))
    # Заглушка
    return web.json_response([])

# Mutants (Cases)
async def can_open_free_case(request):
    """Проверка возможности открыть бесплатный кейс"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    can_claim = await db.can_claim_free_case(user_id)
    
    return web.json_response({
        'can_claim': can_claim,
        'time_remaining': 0 if can_claim else 86400
    })

async def open_case(request):
    """Открыть кейс"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    data = await request.json()
    
    case_name = data['case_name']
    
    # Логика открытия кейса
    # Здесь нужна полная реализация с учетом процентов
    
    # Пример:
    reward_name = "1 TON"
    reward_value = 1.0
    
    if reward_value > 0:
        await db.add_balance(user_id, reward_value)
    
    return web.json_response({
        'reward_name': reward_name,
        'reward_value': reward_value,
        'balance': (await db.get_balance(user_id))['balance']
    })

# Inventory
async def get_inventory(request):
    """Получить инвентарь"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    inventory = await db.get_inventory(user_id)
    return web.json_response(inventory)

async def sell_inventory_item(request):
    """Продать предмет"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    data = await request.json()
    
    item_id = data['item_id']
    value = await db.sell_inventory_item(item_id, user_id)
    
    return web.json_response({
        'status': 'ok',
        'value': value,
        'balance': (await db.get_balance(user_id))['balance']
    })

async def sell_all_items(request):
    """Продать все предметы"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    inventory = await db.get_inventory(user_id)
    
    total_value = sum(item['item_value'] for item in inventory)
    
    for item in inventory:
        await db.sell_inventory_item(item['id'], user_id)
    
    return web.json_response({
        'status': 'ok',
        'total_value': total_value,
        'balance': (await db.get_balance(user_id))['balance']
    })

# Leaderboard
async def get_leaderboard(request):
    """Получить лидерборд"""
    limit = int(request.query.get('limit', 35))
    leaderboard = await db.get_leaderboard(limit)
    return web.json_response(leaderboard)

# Referrals
async def get_referral_data(request):
    """Получить реферальные данные"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    referrals = await db.get_user_referrals(user_id)
    balance_data = await db.get_balance(user_id)
    
    total_earned = sum(ref['total_deposits'] * 0.1 for ref in referrals)
    
    return web.json_response({
        'referrals_count': len(referrals),
        'referrals': referrals,
        'ref_balance': balance_data['ref_balance'],
        'total_earned': total_earned
    })

async def transfer_ref_balance(request):
    """Перевести реферальный баланс"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    transferred = await db.transfer_ref_balance(user_id)
    
    return web.json_response({
        'status': 'ok',
        'transferred': transferred,
        'balance': (await db.get_balance(user_id))['balance']
    })

# Deposits
async def create_deposit(request):
    """Создать депозит"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    data = await request.json()
    
    amount = float(data['amount'])
    method = data['method']
    
    # Здесь должна быть интеграция с TON Connect или Stars
    # Пока просто добавляем баланс
    await db.add_deposit(user_id, amount, method)
    
    return web.json_response({
        'status': 'ok',
        'balance': (await db.get_balance(user_id))['balance']
    })

# Withdrawals
async def create_withdrawal(request):
    """Создать запрос на вывод"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    data = await request.json()
    
    amount = float(data['amount'])
    wallet = data['wallet']
    
    balance_data = await db.get_balance(user_id)
    if balance_data['balance'] < amount:
        return web.json_response({'error': 'Insufficient balance'}, status=400)
    
    request_id = await db.create_withdrawal_request(user_id, amount, wallet)
    
    return web.json_response({
        'status': 'ok',
        'request_id': request_id
    })

async def get_user_stats(request):
    """Статистика пользователя"""
    user_id = int(request.headers.get('X-Telegram-User-Id', 0))
    user_info = await db.get_user_info(user_id)
    
    return web.json_response({
        'games_played': user_info['games_played'],
        'total_deposits': user_info['total_deposits'],
        'balance': user_info['balance']
    })

# Setup routes
def setup_routes(app):
    """Настройка маршрутов"""
    # User
    app.router.add_get('/api/user/data', get_user_data)
    app.router.add_get('/api/user/balance', get_balance)
    app.router.add_post('/api/user/activity', update_activity)
    app.router.add_get('/api/user/stats', get_user_stats)
    
    # Gift Upgrade
    app.router.add_post('/api/games/gift-upgrade/play', play_gift_upgrade)
    app.router.add_get('/api/games/gift-upgrade/history', get_gift_upgrade_history)
    
    # Rolls
    app.router.add_get('/api/games/rolls/current', get_current_rolls_game)
    app.router.add_post('/api/games/rolls/bet', place_rolls_bet)
    app.router.add_get('/api/games/rolls/history', get_rolls_history)
    app.router.add_get('/api/games/rolls/bets', get_rolls_bets)
    
    # Mutants
    app.router.add_get('/api/games/mutants/free-case-status', can_open_free_case)
    app.router.add_post('/api/games/mutants/open-case', open_case)
    
    # Inventory
    app.router.add_get('/api/inventory', get_inventory)
    app.router.add_post('/api/inventory/sell', sell_inventory_item)
    app.router.add_post('/api/inventory/sell-all', sell_all_items)
    
    # Leaderboard
    app.router.add_get('/api/leaderboard', get_leaderboard)
    
    # Referrals
    app.router.add_get('/api/referral/data', get_referral_data)
    app.router.add_post('/api/referral/transfer', transfer_ref_balance)
    
    # Deposits & Withdrawals
    app.router.add_post('/api/deposit/create', create_deposit)
    app.router.add_post('/api/withdrawal/create', create_withdrawal)
