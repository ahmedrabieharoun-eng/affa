// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    API_URL: 'https://noisy-dust-b9e8.mmrr2872008.workers.dev',
    BOT_USERNAME: '@Crystal_Ranch_bot',
    DEPOSIT_WALLET: 'UQAzGsppYQfQwVnVVQDt2Jq9r4cm7fO3iVuLCxv30FixJq1-',
    PRODUCTION_INTERVAL: 60000,
    MARKET_REFRESH: 15000,
    DEPOSIT_VERIFY_INTERVAL: 10000,
    CSRF_TOKEN: 'crystal-ranch-secure-token-2026',
    CRYSTAL_PRICE: 25,
    TASK_REWARD: 0.001,
    MAX_ACTIVE_ORDERS: 2,
    MIN_ORDER_PRICE: 0.0002,
    ORDER_PENALTY_FEE: 0.2,
    COW_HATCH_COST: 50000,
    COW_ACTIVATION_COST: { 1: 200, 2: 350, 3: 1200 },
    COW_UPGRADE_COST: { 1: 6000, 2: 20000 },
    COW_PRODUCTION_DAILY: { 1: 500, 2: 1000, 3: 2500 },
    STORAGE_CAPACITY: {
        1: 40000, 2: 80000, 3: 150000, 4: 300000,
        5: 600000, 6: 1000000, 7: 2000000, 8: 4000000,
        9: 8000000, 10: 16000000
    },
    STORAGE_UPGRADE_COST: {
        1: 10000, 2: 20000, 3: 40000, 4: 80000,
        5: 160000, 6: 320000, 7: 640000, 8: 1280000,
        9: 2560000
    }
};

// ============================================
// TRANSLATIONS
// ============================================
const TRANSLATIONS = {
    en: {
        'nav.farm': 'Farm',
        'nav.market': 'Market',
        'nav.crystal': 'Crystal',
        'nav.friends': 'Friends',
        'nav.tasks': 'Tasks',
        'nav.profile': 'Profile',
        'status.milk': 'MILK',
        'status.eggs': 'EGGS',
        'status.crystal': 'CRYSTAL',
        'status.deposit': 'Deposit',
        'farm.cow.name': 'Cow',
        'farm.chicken.name': 'Chicken',
        'farm.crystal.name': 'Crystal Engine',
        'farm.prod': 'Prod',
        'farm.owned': 'Owned',
        'farm.supply': 'Supply',
        'farm.buy': 'Buy',
        'farm.hatch': 'Hatch',
        'farm.start': 'Start',
        'farm.yield': 'Yield',
        'market.title': 'P2P Market',
        'market.buy': 'Buy',
        'market.myOrders': 'My Orders',
        'market.milk': 'Milk',
        'market.eggs': 'Eggs',
        'market.totalOrders': 'Total Orders',
        'market.milkQty': 'Milk',
        'market.eggsQty': 'Eggs',
        'market.bestPrice': 'Best Price',
        'market.createSell': 'Create Sell Order',
        'market.refresh': 'Refresh',
        'market.loadMore': 'Show More',
        'market.noOrders': 'No active sell orders',
        'market.activeOrders': 'Active Orders',
        'market.history': 'History',
        'crystal.title': 'Crystal Conversion',
        'crystal.perTon': 'TON per Crystal',
        'crystal.yourCrystals': 'Your Crystals',
        'crystal.youReceive': 'You Receive',
        'crystal.convert': 'Convert',
        'crystal.milkAvailable': 'Milk available',
        'crystal.eggsAvailable': 'Eggs available',
        'referral.title': 'Referral Program',
        'referral.description': 'Earn <strong style="color:var(--primary-pink); font-size:20px">10%</strong> commission when your friends buy machines with TON!',
        'referral.share': 'Share this link with friends',
        'referral.friends': 'Friends',
        'referral.claim': 'Claim Earnings',
        'referral.recent': 'Recent Referrals',
        'referral.noReferrals': 'No referrals yet',
        'referral.earningsHistory': 'Earnings History',
        'referral.noEarnings': 'No earnings yet',
        'tasks.title': 'Tasks & Rewards',
        'tasks.partner': 'Partner Tasks',
        'tasks.community': 'Community Tasks',
        'tasks.addTask': 'Add Task',
        'tasks.refresh': 'Refresh',
        'tasks.noTasks': 'No tasks available',
        'tasks.taskType': 'Task Type',
        'tasks.channel': 'Channel',
        'tasks.bot': 'Bot',
        'tasks.channelNote': '⚠️ Bot must be admin in the channel for verification to work!',
        'tasks.link': 'Link',
        'tasks.targetUsers': 'Target Users (min 100)',
        'tasks.rewardPerUser': 'Reward Per User (TON)',
        'tasks.rewardFixed': 'Fixed at 0.001 TON per completion',
        'tasks.yourBalance': 'Your Balance',
        'tasks.confirm': 'Confirm & Pay',
        'tasks.verify': 'Task Verification',
        'tasks.join': 'Join',
        'tasks.check': 'Verify & Claim',
        'tasks.reward': 'Reward',
        'profile.totalMachines': 'Total Machines',
        'profile.production': 'Production',
        'profile.assets': 'Assets',
        'profile.balance': 'Balance',
        'profile.withdraw': 'Withdraw TON',
        'profile.withdrawAmount': 'Amount (min 0.1 TON)',
        'profile.withdrawAddress': 'TON Wallet Address',
        'profile.fee': 'Fee (5%)',
        'profile.youReceive': 'You receive',
        'profile.withdrawBtn': 'Withdraw',
        'modal.sell.title': 'Sell Order',
        'modal.sell.resource': 'Resource',
        'modal.sell.quantity': 'Quantity (min 100)',
        'modal.sell.place': 'Place Sell Order',
        'modal.confirm.title': 'Confirm Purchase',
        'modal.confirm.package': 'Milk Package',
        'modal.confirm.cancel': 'Cancel',
        'modal.confirm.confirm': 'Confirm & Pay',
        'modal.hatch.title': 'Hatch Machine',
        'modal.hatch.cowCost': '50,000 Milk',
        'modal.hatch.chickenCost': '5,000 Eggs',
        'modal.hatch.hatchBtn': 'Hatch',
        'modal.deposit.title': 'Deposit TON',
        'modal.deposit.wallet': 'Wallet',
        'modal.deposit.notConnected': 'Not connected',
        'modal.deposit.connect': 'Connect',
        'modal.deposit.important': 'IMPORTANT:',
        'modal.deposit.warning': 'Your User ID',
        'modal.deposit.mustBeComment': 'must be the ONLY comment',
        'modal.deposit.amount': 'Amount (TON)',
        'modal.deposit.submit': 'Deposit TON',
        'modal.deposit.processing': 'Processing deposit...',
        'help.title': 'How to Play',
        'help.cow.title': 'Cow Machine',
        'help.cow.desc': '1 TON · 41 Milk/hour<br>Global cap: 1000 machines<br>Hatch: 50,000 Milk = 1 Cow',
        'help.chicken.title': 'Chicken Machine',
        'help.chicken.desc': '1 TON · 41 Eggs/hour<br>Unlocks after all Cows sold',
        'help.crystal.title': 'Crystal Engine',
        'help.crystal.desc': '20 TON · 20k Milk + 20k Eggs = 1 Crystal<br>Convert Crystals → TON',
        'help.hatch.title': 'Hatch System',
        'help.hatch.desc': '50,000 Milk = 1 Cow<br>5,000 Eggs = 1 Chicken<br>No global cap limit',
        'help.market.title': 'P2P Market',
        'help.market.desc': 'Trade Milk & Eggs with other players<br>Card system · Best price 🔥',
        'help.referral.title': 'Referral',
        'help.referral.desc': 'Earn 10% of every TON purchase made by your friends<br>Auto-added to balance',
        'help.tasks.title': 'Tasks & Rewards',
        'help.tasks.desc': 'Complete tasks to earn 0.001 TON<br>Create your own community tasks (min 100 users)',
        'help.leaderboard.title': 'Leaderboard Competition',
        'help.leaderboard.desc': '1 new cow = 10 points · Top 20 win 150 TON total<br>Ends when 1000 cows sold<br>⚠️ You must buy a cow to appear on leaderboard!'
    },
    ru: {
        'nav.farm': 'Ферма',
        'nav.market': 'Рынок',
        'nav.crystal': 'Кристалл',
        'nav.friends': 'Друзья',
        'nav.tasks': 'Задания',
        'nav.profile': 'Профиль',
        'status.milk': 'МОЛОКО',
        'status.eggs': 'ЯЙЦА',
        'status.crystal': 'КРИСТАЛЛ',
        'status.deposit': 'Депозит',
        'farm.cow.name': 'Корова',
        'farm.chicken.name': 'Курица',
        'farm.crystal.name': 'Кристальный двигатель',
        'farm.prod': 'Произ',
        'farm.owned': 'Влад',
        'farm.supply': 'Предл',
        'farm.buy': 'Купить',
        'farm.hatch': 'Вывести',
        'farm.start': 'Запустить',
        'farm.yield': 'Выход',
        'market.title': 'P2P Рынок',
        'market.buy': 'Купить',
        'market.myOrders': 'Мои заказы',
        'market.milk': 'Молоко',
        'market.eggs': 'Яйца',
        'market.totalOrders': 'Всего',
        'market.milkQty': 'Молоко',
        'market.eggsQty': 'Яйца',
        'market.bestPrice': 'Лучшая цена',
        'market.createSell': 'Создать ордер',
        'market.refresh': 'Обновить',
        'market.loadMore': 'Показать еще',
        'market.noOrders': 'Нет активных ордеров',
        'market.activeOrders': 'Активные',
        'market.history': 'История',
        'crystal.title': 'Конвертация кристаллов',
        'crystal.perTon': 'TON за кристалл',
        'crystal.yourCrystals': 'Ваши кристаллы',
        'crystal.youReceive': 'Вы получите',
        'crystal.convert': 'Конвертировать',
        'crystal.milkAvailable': 'Молоко доступно',
        'crystal.eggsAvailable': 'Яйца доступны',
        'referral.title': 'Реферальная программа',
        'referral.description': 'Зарабатывайте 10% комиссии, когда ваши друзья покупают машины!',
        'referral.share': 'Поделитесь этой ссылкой с друзьями',
        'referral.friends': 'Друзей',
        'referral.claim': 'Забрать доход',
        'referral.recent': 'Недавние рефералы',
        'referral.noReferrals': 'Пока нет рефералов',
        'referral.earningsHistory': 'История доходов',
        'referral.noEarnings': 'Пока нет доходов',
        'tasks.title': 'Задания и награды',
        'tasks.partner': 'Партнерские',
        'tasks.community': 'Сообщества',
        'tasks.addTask': 'Добавить задание',
        'tasks.refresh': 'Обновить',
        'tasks.noTasks': 'Нет доступных заданий',
        'tasks.taskType': 'Тип задания',
        'tasks.channel': 'Канал',
        'tasks.bot': 'Бот',
        'tasks.channelNote': '⚠️ Бот должен быть администратором канала!',
        'tasks.link': 'Ссылка',
        'tasks.targetUsers': 'Цель (мин 100)',
        'tasks.rewardPerUser': 'Награда за пользователя',
        'tasks.rewardFixed': 'Фиксировано 0.001 TON',
        'tasks.yourBalance': 'Ваш баланс',
        'tasks.confirm': 'Подтвердить и оплатить',
        'tasks.verify': 'Проверка задания',
        'tasks.join': 'Присоединиться',
        'tasks.check': 'Проверить и получить',
        'tasks.reward': 'Награда',
        'profile.totalMachines': 'Всего машин',
        'profile.production': 'Производство',
        'profile.assets': 'Активы',
        'profile.balance': 'Баланс',
        'profile.withdraw': 'Вывести TON',
        'profile.withdrawAmount': 'Сумма (мин 0.1 TON)',
        'profile.withdrawAddress': 'TON адрес кошелька',
        'profile.fee': 'Комиссия (5%)',
        'profile.youReceive': 'Вы получите',
        'profile.withdrawBtn': 'Вывести',
        'modal.sell.title': 'Ордер на продажу',
        'modal.sell.resource': 'Ресурс',
        'modal.sell.quantity': 'Количество (мин 100)',
        'modal.sell.place': 'Разместить ордер',
        'modal.confirm.title': 'Подтверждение покупки',
        'modal.confirm.package': 'Пакет молока',
        'modal.confirm.cancel': 'Отмена',
        'modal.confirm.confirm': 'Подтвердить и оплатить',
        'modal.hatch.title': 'Вывести машину',
        'modal.hatch.cowCost': '50,000 Молока',
        'modal.hatch.chickenCost': '5,000 Яиц',
        'modal.hatch.hatchBtn': 'Вывести',
        'modal.deposit.title': 'Депозит TON',
        'modal.deposit.wallet': 'Кошелек',
        'modal.deposit.notConnected': 'Не подключен',
        'modal.deposit.connect': 'Подключить',
        'modal.deposit.important': 'ВАЖНО:',
        'modal.deposit.warning': 'Ваш User ID',
        'modal.deposit.mustBeComment': 'должен быть ЕДИНСТВЕННЫМ комментарием',
        'modal.deposit.amount': 'Сумма (TON)',
        'modal.deposit.submit': 'Депозит TON',
        'modal.deposit.processing': 'Обработка депозита...',
        'help.title': 'Как играть',
        'help.cow.title': 'Корова',
        'help.cow.desc': '1 TON · 41 Молоко/час<br>Всего: 1000 машин<br>Вывод: 50,000 Молока = 1 Корова',
        'help.chicken.title': 'Курица',
        'help.chicken.desc': '1 TON · 41 Яйца/час<br>Открывается после всех коров',
        'help.crystal.title': 'Кристальный двигатель',
        'help.crystal.desc': '20 TON · 20k Молока + 20k Яиц = 1 Кристалл<br>Конвертация в TON',
        'help.hatch.title': 'Система вывода',
        'help.hatch.desc': '50,000 Молока = 1 Корова<br>5,000 Яиц = 1 Курица<br>Без лимита',
        'help.market.title': 'P2P Рынок',
        'help.market.desc': 'Торгуйте молоком и яйцами<br>Карточная система',
        'help.referral.title': 'Рефералы',
        'help.referral.desc': '10% от покупок друзей',
        'help.tasks.title': 'Задания',
        'help.tasks.desc': 'Выполняйте задания за 0.001 TON',
        'help.leaderboard.title': 'Соревнование',
        'help.leaderboard.desc': '1 новая корова = 10 очков · Топ-20 выигрывают 150 TON<br>Заканчивается когда продано 1000 коров'
    }
};

// ============================================
// LEADERBOARD INFO TRANSLATIONS
// ============================================
const LEADERBOARD_INFO_TRANSLATIONS = {
    en: {
        title: '🏆 How does the competition work?',
        grandPrize: '🏆 Grand Prize',
        totalPrize: 'Total prize pool 150 TON distributed to top 20 players',
        howToParticipate: '🐮 How to participate?',
        howToDesc: 'Each new cow you buy = 10 points in the competition<br>You must buy at least one cow to appear on the leaderboard',
        whenEnds: '⏰ When does it end?',
        whenDesc: 'The competition ends when 1000 cows are sold',
        gotIt: '✅ Got it',
        prizeList: [
            { rank: '1st', prize: '40 TON' },
            { rank: '2nd', prize: '30 TON' },
            { rank: '3rd', prize: '20 TON' },
            { rank: '4th', prize: '10 TON' },
            { rank: '5th', prize: '8 TON' },
            { rank: '6th', prize: '6 TON' },
            { rank: '7th', prize: '5 TON' },
            { rank: '8th', prize: '4 TON' },
            { rank: '9th-10th', prize: '3 TON' },
            { rank: '11th-18th', prize: '2 TON' },
            { rank: '19th-20th', prize: '1 TON' }
        ]
    },
    ru: {
        title: '🏆 Как работает соревнование?',
        grandPrize: '🏆 Главный приз',
        totalPrize: 'Общий призовой фонд 150 TON распределяется между топ-20 игроками',
        howToParticipate: '🐮 Как участвовать?',
        howToDesc: 'Каждая новая купленная корова = 10 очков в соревновании<br>Вы должны купить хотя бы одну корову, чтобы появиться в таблице лидеров',
        whenEnds: '⏰ Когда заканчивается?',
        whenDesc: 'Соревнование заканчивается, когда продано 1000 коров',
        gotIt: '✅ Понятно',
        prizeList: [
            { rank: '1 место', prize: '40 TON' },
            { rank: '2 место', prize: '30 TON' },
            { rank: '3 место', prize: '20 TON' },
            { rank: '4 место', prize: '10 TON' },
            { rank: '5 место', prize: '8 TON' },
            { rank: '6 место', prize: '6 TON' },
            { rank: '7 место', prize: '5 TON' },
            { rank: '8 место', prize: '4 TON' },
            { rank: '9-10 место', prize: '3 TON' },
            { rank: '11-18 место', prize: '2 TON' },
            { rank: '19-20 место', prize: '1 TON' }
        ]
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const lastClickTimers = {};
const CLICK_COOLDOWN = 10000;

function checkClickCooldown(buttonId) {
    const now = Date.now();
    const lastClick = lastClickTimers[buttonId] || 0;
    const timeLeft = CLICK_COOLDOWN - (now - lastClick);
    
    if (timeLeft > 0) {
        const secondsLeft = Math.ceil(timeLeft / 1000);
        showNotification(
            App.currentLanguage === 'ru' 
                ? `⏳ Пожалуйста, подождите ${secondsLeft} секунд перед повторным нажатием` 
                : `⏳ Please wait ${secondsLeft} seconds before clicking again`,
            'warning'
        );
        return false;
    }
    
    lastClickTimers[buttonId] = now;
    return true;
}

async function disableButtonTemporarily(buttonElement, buttonId) {
    if (!buttonElement) return;
    buttonElement.disabled = true;
    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = `<i class="fas fa-hourglass-half"></i> ⏳ ${Math.ceil(CLICK_COOLDOWN / 1000)}s`;
    
    setTimeout(() => {
        buttonElement.disabled = false;
        buttonElement.innerHTML = originalText;
    }, CLICK_COOLDOWN);
}

function validateAndCooldown(buttonId, buttonElement) {
    if (!checkClickCooldown(buttonId)) {
        return false;
    }
    disableButtonTemporarily(buttonElement, buttonId);
    return true;
}

function showNotification(message, type = 'success', duration = 5000) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message.replace(/\n/g, '<br>');
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

function formatFullPrecision(num) {
    if (num === null || num === undefined) return '0';
    if (Math.abs(num) < 0.0001 && num !== 0) {
        return num.toFixed(8).replace(/\.?0+$/, '');
    }
    return num.toFixed(8).replace(/\.?0+$/, '');
}

function formatTON(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0';
    if (Math.abs(amount) < 0.0001 && amount !== 0) {
        return amount.toFixed(8).replace(/\.?0+$/, '');
    }
    return parseFloat(amount).toFixed(4);
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

// ============================================
// LANGUAGE FUNCTIONS
// ============================================
function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    
    App.currentLanguage = lang;
    localStorage.setItem('crystal_ranch_lang', lang);
    
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (TRANSLATIONS[lang][key]) {
            let text = TRANSLATIONS[lang][key];
            if (element.tagName === 'P' || element.tagName === 'DIV') {
                text = text.replace(/<br>/g, '<br>');
                element.innerHTML = text;
            } else {
                text = text.replace(/<br>/g, ' ');
                element.textContent = text;
            }
        }
    });
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    
    if (App.tonConnectUI) {
        App.tonConnectUI.language = lang === 'ru' ? 'ru' : 'en';
    }
    
    updateLeaderboardInfoLanguage();
}

function updateLeaderboardInfoLanguage() {
    const lang = App.currentLanguage || 'en';
    const translations = LEADERBOARD_INFO_TRANSLATIONS[lang];
    
    document.getElementById('infoTitle').innerHTML = translations.title;
    document.getElementById('infoGrandPrize').innerHTML = translations.grandPrize;
    document.getElementById('infoTotalPrize').innerHTML = translations.totalPrize;
    document.getElementById('infoHowToParticipate').innerHTML = translations.howToParticipate;
    document.getElementById('infoHowToDesc').innerHTML = translations.howToDesc;
    document.getElementById('infoWhenEnds').innerHTML = translations.whenEnds;
    document.getElementById('infoWhenDesc').innerHTML = translations.whenDesc;
    document.getElementById('infoGotIt').innerHTML = translations.gotIt;
    
    let prizeHtml = '';
    translations.prizeList.forEach(item => {
        prizeHtml += `<div class="info-prize-row"><span>${item.rank}</span> <span style="color: #FFD700;">${item.prize}</span></div>`;
    });
    document.getElementById('infoPrizeList').innerHTML = prizeHtml;
}

// ============================================
// API CALL FUNCTION
// ============================================
async function callAPI(action, data = {}) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Action': action,
            'X-CSRF-Token': CONFIG.CSRF_TOKEN
        };
        
        if (App.telegram && App.telegram.initData) {
            headers['Authorization'] = `Telegram ${App.telegram.initData}`;
        }
        
        const response = await fetch(`${CONFIG.API_URL}/api`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ action, data })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            console.error(`API Error [${action}]:`, result.error);
            showNotification(result.error || 'Transaction failed', 'error');
            throw new Error(result.error);
        }
        
        return result.data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// ============================================
// TELEGRAM SETUP
// ============================================
async function setupTelegram() {
    return new Promise((resolve) => {
        if (window.Telegram && window.Telegram.WebApp) {
            App.telegram = window.Telegram.WebApp;
            App.telegram.ready();
            App.telegram.expand();
            
            if (App.telegram.initDataUnsafe && App.telegram.initDataUnsafe.user) {
                const tgUser = App.telegram.initDataUnsafe.user;
                App.userId = String(tgUser.id);
                
                const fullName = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Farmer';
                document.getElementById('profileName').innerHTML = fullName;
                document.getElementById('profileUsername').innerHTML = tgUser.username ? `@${tgUser.username}` : '@crystal_ranch';
                document.getElementById('profileUserId').innerHTML = `ID: ${App.userId}`;
                document.getElementById('depositUserIdDisplay').innerHTML = App.userId;
                
                if (tgUser.photo_url) {
                    const avatar = document.getElementById('profileAvatar');
                    avatar.innerHTML = `<img src="${tgUser.photo_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                }
            }
            
            if (App.telegram.initDataUnsafe && App.telegram.initDataUnsafe.start_param) {
                const startParam = App.telegram.initDataUnsafe.start_param;
                console.log('Start param:', startParam);
                if (startParam.startsWith('ref_')) {
                    sessionStorage.setItem('referrer', startParam);
                }
            }
            resolve();
        } else {
            App.userId = 'demo_' + Math.floor(Math.random() * 1000000);
            document.getElementById('profileName').innerHTML = 'Demo Farmer';
            document.getElementById('profileUsername').innerHTML = '@demo';
            document.getElementById('profileUserId').innerHTML = `ID: ${App.userId}`;
            document.getElementById('depositUserIdDisplay').innerHTML = App.userId;
            resolve();
        }
    });
}

// ============================================
// TON CONNECT SETUP
// ============================================
async function initTONConnect() {
    try {
        if (window.TON_CONNECT_UI) {
            const manifestUrl = `${CONFIG.API_URL}/tonconnect-manifest.json`;
            App.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
                manifestUrl: manifestUrl,
                language: App.currentLanguage === 'ru' ? 'ru' : 'en',
                uiPreferences: { theme: 'DARK' }
            });
            
            App.tonConnectUI.onStatusChange((wallet) => {
                if (wallet) {
                    handleWalletConnected(wallet);
                } else {
                    handleWalletDisconnected();
                }
            });
            
            setTimeout(() => {
                if (App.tonConnectUI.connected) {
                    App.tonConnectUI.getWallets();
                }
            }, 500);
        }
    } catch (error) {
        console.error('TON Connect init error:', error);
    }
}

function handleWalletConnected(wallet) {
    App.wallet = {
        address: wallet.account.address,
        chain: wallet.account.chain,
        appName: wallet.device.appName
    };
    
    const display = document.getElementById('walletAddressDisplay');
    const btn = document.getElementById('connectWalletBtn');
    const shortAddress = `${App.wallet.address.substring(0, 6)}...${App.wallet.address.substring(App.wallet.address.length - 4)}`;
    
    display.innerHTML = `${shortAddress} · ${App.wallet.appName}`;
    btn.innerHTML = '<i class="fas fa-unplug"></i> ' + (App.currentLanguage === 'ru' ? 'Отключить' : 'Disconnect');
    btn.onclick = disconnectWallet;
    document.getElementById('submitDepositBtn').disabled = false;
}

function handleWalletDisconnected() {
    App.wallet = null;
    const display = document.getElementById('walletAddressDisplay');
    const btn = document.getElementById('connectWalletBtn');
    
    display.innerHTML = App.currentLanguage === 'ru' ? 'Не подключен' : 'Not connected';
    btn.innerHTML = '<i class="fas fa-plug"></i> ' + (App.currentLanguage === 'ru' ? 'Подключить' : 'Connect');
    btn.onclick = connectWallet;
    document.getElementById('submitDepositBtn').disabled = true;
}

async function connectWallet() {
    if (App.tonConnectUI) {
        await App.tonConnectUI.openModal();
    }
}

async function disconnectWallet() {
    if (App.tonConnectUI) {
        await App.tonConnectUI.disconnect();
    }
}

// ============================================
// INITIALIZE USER
// ============================================
async function initializeUser() {
    try {
        const referrer = sessionStorage.getItem('referrer');
        const startParam = referrer || null;
        const tgUser = App.telegram?.initDataUnsafe?.user;
        
        const userInfo = tgUser ? {
            first_name: tgUser.first_name,
            last_name: tgUser.last_name,
            username: tgUser.username,
            photo_url: tgUser.photo_url
        } : null;
        
        const response = await fetch(`${CONFIG.API_URL}/api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Telegram ${App.telegram?.initData || ''}`,
                'X-Action': 'initializeUser',
                'X-CSRF-Token': CONFIG.CSRF_TOKEN
            },
            body: JSON.stringify({ action: 'initializeUser', data: { startParam, userInfo } })
        });
        
        const result = await response.json();
        console.log('Initialize user result:', result);
        return result;
    } catch (error) {
        console.error('Init user error:', error);
    }
}
