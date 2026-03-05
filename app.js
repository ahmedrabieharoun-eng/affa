// ==================== MAIN APPLICATION ====================

let App = {
    userId: null,
    user: null,
    global: null,
    constants: null,
    referral: null,
    market: null,
    tasks: null,
    leaderboard: null,
    
    // Ranch state
    ranch: {
        cowLevels: { 1: 0, 2: 0, 3: 0 },
        cowActive: { 1: 0, 2: 0, 3: 0 },
        cowActiveUntil: { 1: null, 2: null, 3: null },
        hourlyProduction: 0,
        milkStored: 0,
        storageCapacity: 40000,
        storageLevel: 1,
        storageFull: false
    },
    
    telegram: null,
    wallet: null,
    tonConnectUI: null,
    
    timerInterval: null,
    marketInterval: null,
    depositCheckInterval: null,
    
    currentMarketResource: 'milk',
    currentMarketPage: 1,
    hasMoreOrders: false,
    currentDepositId: null,
    currentTxHash: null,
    
    pendingOrder: null,
    pendingTask: null,
    currentLanguage: 'en',
    
    referralsPage: 1,
    earningsPage: 1,
    hasMoreReferrals: false,
    hasMoreEarnings: false,
    
    currentTaskTab: 'partner',
    
    // Activate popup state
    activateLevel: 1,
    activateMax: 0,
    activateCostPerCow: 200,
    
    initialized: false
};

window.App = App;

const lastClickTimers = {};
const CLICK_COOLDOWN = 10000;

// ==================== UTILITY FUNCTIONS ====================

function checkClickCooldown(buttonId) {
    const now = Date.now();
    const lastClick = lastClickTimers[buttonId] || 0;
    const timeLeft = CLICK_COOLDOWN - (now - lastClick);
    
    if (timeLeft > 0) {
        const secondsLeft = Math.ceil(timeLeft / 1000);
        showNotification(
            App.currentLanguage === 'ru' ? 
            `⏳ Пожалуйста, подождите ${secondsLeft} секунд перед повторным нажатием` : 
            `⏳ Please wait ${secondsLeft} seconds before clicking again`,
            'warning'
        );
        return false;
    }
    
    lastClickTimers[buttonId] = now;
    return true;
}

window.checkClickCooldown = checkClickCooldown;

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

window.disableButtonTemporarily = disableButtonTemporarily;

function validateAndCooldown(buttonId, buttonElement) {
    if (!checkClickCooldown(buttonId)) {
        return false;
    }
    
    disableButtonTemporarily(buttonElement, buttonId);
    return true;
}

window.validateAndCooldown = validateAndCooldown;

function showNotification(message, type = 'success', duration = 5000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
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

window.showNotification = showNotification;

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

window.setLanguage = setLanguage;

// ==================== INITIALIZATION ====================

async function initApp() {
    console.log('Crystal Ranch · Initializing...');
    
    const savedLang = localStorage.getItem('crystal_ranch_lang') || 'en';
    setLanguage(savedLang);
    
    await setupTelegram();
    await initializeUser();
    
    setTimeout(() => initTONConnect(), 1000);
    
    await loadGameState();
    
    setupIntervals();
    setupEventListeners();
    
    console.log('Crystal Ranch · Ready');
}

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
                const profileName = document.getElementById('profileName');
                const profileUsername = document.getElementById('profileUsername');
                const profileUserId = document.getElementById('profileUserId');
                const depositUserIdDisplay = document.getElementById('depositUserIdDisplay');
                
                if (profileName) profileName.innerHTML = fullName;
                if (profileUsername) profileUsername.innerHTML = tgUser.username ? `@${tgUser.username}` : '@crystal_ranch';
                if (profileUserId) profileUserId.innerHTML = `ID: ${App.userId}`;
                if (depositUserIdDisplay) depositUserIdDisplay.innerHTML = App.userId;
                
                if (tgUser.photo_url) {
                    const avatar = document.getElementById('profileAvatar');
                    if (avatar) {
                        avatar.innerHTML = `<img src="${tgUser.photo_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    }
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
            const profileName = document.getElementById('profileName');
            const profileUsername = document.getElementById('profileUsername');
            const profileUserId = document.getElementById('profileUserId');
            const depositUserIdDisplay = document.getElementById('depositUserIdDisplay');
            
            if (profileName) profileName.innerHTML = 'Demo Farmer';
            if (profileUsername) profileUsername.innerHTML = '@demo';
            if (profileUserId) profileUserId.innerHTML = `ID: ${App.userId}`;
            if (depositUserIdDisplay) depositUserIdDisplay.innerHTML = App.userId;
            resolve();
        }
    });
}

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
            body: JSON.stringify({
                action: 'initializeUser',
                data: { 
                    startParam,
                    userInfo 
                }
            })
        });
        
        const result = await response.json();
        console.log('Initialize user result:', result);
        return result;
    } catch (error) {
        console.error('Init user error:', error);
    }
}

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
    
    if (display) display.innerHTML = `${shortAddress} · ${App.wallet.appName}`;
    if (btn) {
        btn.innerHTML = '<i class="fas fa-unplug"></i> ' + (App.currentLanguage === 'ru' ? 'Отключить' : 'Disconnect');
        btn.onclick = disconnectWallet;
    }
    
    const submitDepositBtn = document.getElementById('submitDepositBtn');
    if (submitDepositBtn) submitDepositBtn.disabled = false;
}

function handleWalletDisconnected() {
    App.wallet = null;
    
    const display = document.getElementById('walletAddressDisplay');
    const btn = document.getElementById('connectWalletBtn');
    
    if (display) display.innerHTML = App.currentLanguage === 'ru' ? 'Не подключен' : 'Not connected';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-plug"></i> ' + (App.currentLanguage === 'ru' ? 'Подключить' : 'Connect');
        btn.onclick = connectWallet;
    }
    
    const submitDepositBtn = document.getElementById('submitDepositBtn');
    if (submitDepositBtn) submitDepositBtn.disabled = true;
}

async function connectWallet() {
    if (App.tonConnectUI) {
        await App.tonConnectUI.openModal();
    }
}

window.connectWallet = connectWallet;

async function disconnectWallet() {
    if (App.tonConnectUI) {
        await App.tonConnectUI.disconnect();
    }
}

window.disconnectWallet = disconnectWallet;

// ==================== GAME STATE ====================

async function loadGameState() {
    try {
        const state = await callAPI('getState');
        
        App.user = state.user;
        App.global = state.global;
        App.constants = state.constants;
        App.referral = state.referral || { 
            totalReferrals: 0, 
            totalEarnings: 0, 
            recentReferrals: [],
            recentEarnings: []
        };
        App.market = state.market || { 
            milk: { sellOrders: 0, buyOrders: 0, bestSellPrice: 0, bestBuyPrice: 0, totalMilk: 0, totalEggs: 0 },
            eggs: { sellOrders: 0, buyOrders: 0, bestSellPrice: 0, bestBuyPrice: 0 }
        };
        App.tasks = state.tasks || {
            partner: [],
            community: []
        };
        App.leaderboard = state.leaderboard || {
            isActive: true,
            totalCowSales: 0,
            cowCap: 1000,
            remainingCows: 1000,
            leaderboard: [],
            currentUser: { rank: 0, cowCount: 0, points: 0, prize: 0, photoUrl: '' },
            prizesDistributed: false,
            winners: {}
        };
        
        // Initialize ranch state from API or defaults
        if (state.ranch) {
            App.ranch = state.ranch;
        } else {
            // Calculate ranch state from user data
            const cowsOwned = App.user?.cows_owned || 0;
            // For demo, assume all cows are level 1
            App.ranch.cowLevels = { 1: cowsOwned, 2: 0, 3: 0 };
            App.ranch.cowActive = { 1: Math.min(cowsOwned, 10), 2: 0, 3: 0 };
            App.ranch.milkStored = Math.floor(Math.random() * 20000);
            App.ranch.storageCapacity = 40000;
            App.ranch.storageLevel = 1;
            
            // Calculate hourly production
            const active1 = App.ranch.cowActive[1];
            const active2 = App.ranch.cowActive[2];
            const active3 = App.ranch.cowActive[3];
            
            const dailyProd = (active1 * CONFIG.COW_PRODUCTION_DAILY[1]) +
                            (active2 * CONFIG.COW_PRODUCTION_DAILY[2]) +
                            (active3 * CONFIG.COW_PRODUCTION_DAILY[3]);
            
            App.ranch.hourlyProduction = dailyProd / 24;
            App.ranch.storageFull = App.ranch.milkStored >= App.ranch.storageCapacity;
        }
        
        if (App.global) {
            App.global.diamond_price = CONFIG.CRYSTAL_PRICE;
        }
        
        updateAllUI();
        updateReferralUI();
        updateTasksUI();
        updateLeaderboardUI();
        updateRanchUI();
        
        animateTonBalance();
        
        updateLockedStates();
        
        if (state.pendingDeposits && state.pendingDeposits.length > 0) {
            const pending = state.pendingDeposits[0];
            if (pending.status === 'pending') {
                startDepositVerification(pending.depositId, pending.txHash);
            }
        }
        
    } catch (error) {
        console.error('Load game state error:', error);
    }
}

window.loadGameState = loadGameState;

function updateAllUI() {
    if (!App.user || !App.global) return;
    
    const statusMilk = document.getElementById('statusMilk');
    const statusEggs = document.getElementById('statusEggs');
    const statusDiamond = document.getElementById('statusDiamond');
    const statusTon = document.getElementById('statusTon');
    const milkPerHour = document.getElementById('milkPerHour');
    const eggsPerHour = document.getElementById('eggsPerHour');
    const crystalPriceHeader = document.getElementById('crystalPriceHeader');
    
    if (statusMilk) statusMilk.innerHTML = formatNumber(App.user.milk);
    if (statusEggs) statusEggs.innerHTML = formatNumber(App.user.eggs);
    if (statusDiamond) statusDiamond.innerHTML = formatNumber(App.user.diamond);
    if (statusTon) statusTon.innerHTML = formatTON(App.user.tonBalance);
    if (milkPerHour) milkPerHour.innerHTML = App.user.milkPerHour || 0;
    if (eggsPerHour) eggsPerHour.innerHTML = App.user.eggsPerHour || 0;
    if (crystalPriceHeader) crystalPriceHeader.innerHTML = CONFIG.CRYSTAL_PRICE;
    
    updateProductionTimer();
    
    const cowsOwned = document.getElementById('cowsOwned');
    const cowProgressText = document.getElementById('cowProgressText');
    const cowProgressFill = document.getElementById('cowProgressFill');
    const buyCowBtn = document.getElementById('buyCowBtn');
    const cowBadge = document.getElementById('cowBadge');
    
    if (cowsOwned) cowsOwned.innerHTML = App.user.cows_owned || 0;
    const cowProgress = App.global.cows_progress || 0;
    if (cowProgressText) cowProgressText.innerHTML = `${App.global.cows_sold || 0}/${App.global.cows_cap}`;
    if (cowProgressFill) cowProgressFill.style.width = `${cowProgress}%`;

    if (App.global.cows_remaining <= 0) {
        if (buyCowBtn) {
            buyCowBtn.disabled = true;
            buyCowBtn.innerHTML = '<i class="fas fa-ban"></i> ' + (App.currentLanguage === 'ru' ? 'Продано' : 'Sold Out');
        }
        if (cowBadge) {
            cowBadge.innerHTML = App.currentLanguage === 'ru' ? 'ПРОДАНО' : 'SOLD OUT';
            cowBadge.className = 'machine-badge badge-soldout';
        }
    } else {
        if (buyCowBtn) {
            buyCowBtn.disabled = false;
            buyCowBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + (App.currentLanguage === 'ru' ? 'Купить' : 'Buy');
        }
        if (cowBadge) {
            cowBadge.innerHTML = `${App.global.cows_remaining} ` + (App.currentLanguage === 'ru' ? 'ОСТАЛОСЬ' : 'LEFT');
            cowBadge.className = 'machine-badge badge-available';
        }
    }
    
    const chickensOwned = document.getElementById('chickensOwned');
    const chickenProgressText = document.getElementById('chickenProgressText');
    const chickenProgressFill = document.getElementById('chickenProgressFill');
    const buyChickenBtn = document.getElementById('buyChickenBtn');
    const chickenBadge = document.getElementById('chickenBadge');
    
    if (chickensOwned) chickensOwned.innerHTML = App.user.chickens_owned || 0;
    const chickenProgress = App.global.chickens_progress || 0;
    if (chickenProgressText) chickenProgressText.innerHTML = `${App.global.chickens_sold || 0}/${App.global.chickens_cap}`;
    if (chickenProgressFill) chickenProgressFill.style.width = `${chickenProgress}%`;

    if (!App.global.chicken_unlocked) {
        if (buyChickenBtn) {
            buyChickenBtn.disabled = true;
            buyChickenBtn.innerHTML = '<i class="fas fa-lock"></i> ' + (App.currentLanguage === 'ru' ? 'Заблокировано' : 'Locked');
        }
        if (chickenBadge) {
            chickenBadge.innerHTML = App.currentLanguage === 'ru' ? 'ЗАБЛОК' : 'LOCKED';
            chickenBadge.className = 'machine-badge badge-locked';
        }
    } else if (App.user.chickens_owned > 0) {
        if (buyChickenBtn) {
            buyChickenBtn.disabled = true;
            buyChickenBtn.innerHTML = '<i class="fas fa-check"></i> ' + (App.currentLanguage === 'ru' ? 'Владею' : 'Owned');
        }
        if (chickenBadge) {
            chickenBadge.innerHTML = App.currentLanguage === 'ru' ? 'ВЛАДЕЮ' : 'OWNED';
            chickenBadge.className = 'machine-badge badge-owned';
        }
    } else if (App.global.chickens_remaining <= 0) {
        if (buyChickenBtn) {
            buyChickenBtn.disabled = true;
            buyChickenBtn.innerHTML = '<i class="fas fa-ban"></i> ' + (App.currentLanguage === 'ru' ? 'Продано' : 'Sold Out');
        }
        if (chickenBadge) {
            chickenBadge.innerHTML = App.currentLanguage === 'ru' ? 'ПРОДАНО' : 'SOLD OUT';
            chickenBadge.className = 'machine-badge badge-soldout';
        }
    } else {
        if (buyChickenBtn) {
            buyChickenBtn.disabled = App.user.tonBalance < 1;
            buyChickenBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + (App.currentLanguage === 'ru' ? 'Купить' : 'Buy');
        }
        if (chickenBadge) {
            chickenBadge.innerHTML = `${App.global.chickens_remaining} ` + (App.currentLanguage === 'ru' ? 'ОСТАЛОСЬ' : 'LEFT');
            chickenBadge.className = 'machine-badge badge-available';
        }
    }
    
    const diamondEnginesOwned = document.getElementById('diamondEnginesOwned');
    const buyDiamondBtn = document.getElementById('buyDiamondBtn');
    const startDiamondBtn = document.getElementById('startDiamondBtn');
    const diamondBadge = document.getElementById('diamondBadge');
    
    if (diamondEnginesOwned) diamondEnginesOwned.innerHTML = App.user.diamond_engines_owned || 0;

    if (!App.global.diamond_unlocked) {
        if (buyDiamondBtn) {
            buyDiamondBtn.disabled = true;
            buyDiamondBtn.innerHTML = '<i class="fas fa-lock"></i> ' + (App.currentLanguage === 'ru' ? 'Заблокировано' : 'Locked');
        }
        if (startDiamondBtn) startDiamondBtn.disabled = true;
        if (diamondBadge) {
            diamondBadge.innerHTML = App.currentLanguage === 'ru' ? 'ЗАБЛОК' : 'LOCKED';
            diamondBadge.className = 'machine-badge badge-locked';
        }
    } else if (App.user.diamond_engines_owned > 0) {
        if (buyDiamondBtn) {
            buyDiamondBtn.disabled = true;
            buyDiamondBtn.innerHTML = '<i class="fas fa-check"></i> ' + (App.currentLanguage === 'ru' ? 'Владею' : 'Owned');
        }
        if (diamondBadge) {
            diamondBadge.innerHTML = App.currentLanguage === 'ru' ? 'ВЛАДЕЮ' : 'OWNED';
            diamondBadge.className = 'machine-badge badge-owned';
        }
        
        const canProduce = (App.user.milk || 0) >= 20000 && (App.user.eggs || 0) >= 20000;
        if (startDiamondBtn) {
            startDiamondBtn.disabled = !canProduce;
            startDiamondBtn.innerHTML = canProduce ? 
                '<i class="fas fa-play"></i> ' + (App.currentLanguage === 'ru' ? 'Запустить' : 'Start') : 
                '<i class="fas fa-ban"></i> ' + (App.currentLanguage === 'ru' ? 'Нужно 20k' : 'Need 20k');
        }
    } else {
        if (buyDiamondBtn) {
            buyDiamondBtn.disabled = App.user.tonBalance < 20;
            buyDiamondBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + (App.currentLanguage === 'ru' ? 'Купить' : 'Buy');
        }
        if (startDiamondBtn) startDiamondBtn.disabled = true;
        if (diamondBadge) {
            diamondBadge.innerHTML = App.currentLanguage === 'ru' ? 'ДОСТУПНО' : 'AVAILABLE';
            diamondBadge.className = 'machine-badge badge-available';
        }
    }
    
    const diamondBalanceMain = document.getElementById('diamondBalanceMain');
    const crystalPriceMain = document.getElementById('crystalPriceMain');
    const milkForDiamond = document.getElementById('milkForDiamond');
    const eggsForDiamond = document.getElementById('eggsForDiamond');
    const tonReceiveMain = document.getElementById('tonReceiveMain');
    
    if (diamondBalanceMain) diamondBalanceMain.innerHTML = formatNumber(App.user.diamond || 0);
    if (crystalPriceMain) crystalPriceMain.innerHTML = CONFIG.CRYSTAL_PRICE;
    if (milkForDiamond) milkForDiamond.innerHTML = formatNumber(App.user.milk || 0);
    if (eggsForDiamond) eggsForDiamond.innerHTML = formatNumber(App.user.eggs || 0);
    
    const convertAmount = document.getElementById('convertAmount')?.value || 0;
    const tonReceive = convertAmount * CONFIG.CRYSTAL_PRICE;
    if (tonReceiveMain) tonReceiveMain.innerHTML = formatTON(tonReceive);
    
    const profileMilk = document.getElementById('profileMilk');
    const profileEggs = document.getElementById('profileEggs');
    const profileDiamond = document.getElementById('profileDiamond');
    const profileTon = document.getElementById('profileTon');
    const profileMilkRate = document.getElementById('profileMilkRate');
    const profileEggsRate = document.getElementById('profileEggsRate');
    const profileDiamondPrice = document.getElementById('profileDiamondPrice');
    
    if (profileMilk) profileMilk.innerHTML = formatNumber(App.user.milk || 0);
    if (profileEggs) profileEggs.innerHTML = formatNumber(App.user.eggs || 0);
    if (profileDiamond) profileDiamond.innerHTML = formatNumber(App.user.diamond || 0);
    if (profileTon) profileTon.innerHTML = formatTON(App.user.tonBalance || 0);
    if (profileMilkRate) profileMilkRate.innerHTML = App.user.milkPerHour || 0;
    if (profileEggsRate) profileEggsRate.innerHTML = App.user.eggsPerHour || 0;
    if (profileDiamondPrice) profileDiamondPrice.innerHTML = CONFIG.CRYSTAL_PRICE;
    
    const totalMachines = (App.user.cows_owned || 0) + (App.user.chickens_owned || 0) + (App.user.diamond_engines_owned || 0);
    const totalMachinesEl = document.getElementById('totalMachines');
    const totalProductionEl = document.getElementById('totalProduction');
    
    if (totalMachinesEl) totalMachinesEl.innerHTML = totalMachines;
    if (totalProductionEl) totalProductionEl.innerHTML = (App.user.milkPerHour + App.user.eggsPerHour) + '/h';
    
    if (App.user.referralCode) {
        const botUsername = CONFIG.BOT_USERNAME.replace('@', '');
        const referralLink = `https://t.me/${botUsername}?startapp=ref_${App.userId}`;
        const referralLinkEl = document.getElementById('referralLink');
        if (referralLinkEl) referralLinkEl.value = referralLink;
    }
    
    const totalReferralsEl = document.getElementById('totalReferrals');
    if (totalReferralsEl) totalReferralsEl.innerHTML = App.referral?.totalReferrals || 0;
    
    const claimBtn = document.getElementById('claimReferralBtn');
    if (claimBtn) {
        if (App.user.referralEarnings > 0) {
            claimBtn.disabled = false;
            claimBtn.innerHTML = `<i class="fas fa-hand-holding-usd"></i> ` + 
                (App.currentLanguage === 'ru' ? 'Забрать ' : 'Claim ') + 
                `${formatTON(App.user.referralEarnings)} TON`;
        } else {
            claimBtn.disabled = true;
            claimBtn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> ' + 
                (App.currentLanguage === 'ru' ? 'Нет дохода' : 'No Earnings');
        }
    }
    
    const hatchCowBalance = document.getElementById('hatchCowBalance');
    const hatchChickenBalance = document.getElementById('hatchChickenBalance');
    
    if (hatchCowBalance) hatchCowBalance.innerHTML = (App.currentLanguage === 'ru' ? 'Ваше молоко: ' : 'Your milk: ') + formatNumber(App.user.milk || 0);
    if (hatchChickenBalance) hatchChickenBalance.innerHTML = (App.currentLanguage === 'ru' ? 'Ваши яйца: ' : 'Your eggs: ') + formatNumber(App.user.eggs || 0);
    
    const withdrawAmount = parseFloat(document.getElementById('withdrawAmount')?.value) || 0;
    const fee = withdrawAmount * 0.05;
    const net = withdrawAmount - fee;
    const withdrawFee = document.getElementById('withdrawFee');
    const withdrawNet = document.getElementById('withdrawNet');
    
    if (withdrawFee) withdrawFee.innerHTML = `${formatTON(fee)} TON`;
    if (withdrawNet) withdrawNet.innerHTML = `${formatTON(net)} TON`;
    
    const taskUserBalance = document.getElementById('taskUserBalance');
    if (taskUserBalance) taskUserBalance.innerHTML = formatTON(App.user.tonBalance || 0);
}

function updateProductionTimer() {
    if (App.user && App.user.secondsUntilNext !== undefined) {
        const seconds = App.user.secondsUntilNext;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const productionTimer = document.getElementById('productionTimer');
        const ranchProductionTimer = document.getElementById('ranchProductionTimer');
        
        if (productionTimer) productionTimer.innerHTML = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        if (ranchProductionTimer) ranchProductionTimer.innerHTML = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function animateTonBalance() {
    const tonElement = document.getElementById('statusTon');
    if (tonElement) {
        tonElement.classList.add('increased');
        setTimeout(() => {
            tonElement.classList.remove('increased');
        }, 300);
    }
}

function updateLockedStates() {
    const chickenLocked = document.getElementById('chickenLockedOverlay');
    const chickenTimer = document.getElementById('chickenUnlockTimer');
    
    if (App.global && !App.global.chicken_unlocked) {
        if (chickenLocked) chickenLocked.style.display = 'flex';
        const remaining = App.global.cows_remaining || 0;
        if (chickenTimer) chickenTimer.innerHTML = `🔓 Unlocks after ${remaining} more cows sold`;
    } else {
        if (chickenLocked) chickenLocked.style.display = 'none';
    }
    
    const diamondLocked = document.getElementById('diamondLockedOverlay');
    const diamondTimer = document.getElementById('diamondUnlockTimer');
    
    if (App.global && !App.global.diamond_unlocked) {
        if (diamondLocked) diamondLocked.style.display = 'flex';
        const chickenRemaining = App.global.chickens_remaining || 0;
        if (diamondTimer) diamondTimer.innerHTML = `🔓 Unlocks after ${chickenRemaining} more chickens sold`;
    } else {
        if (diamondLocked) diamondLocked.style.display = 'none';
    }
}

// ==================== MARKET FUNCTIONS ====================

async function updateMarketUI(page = 1, reset = true) {
    if (!App.currentMarketResource) return;
    
    try {
        const sellOrders = await callAPI('getMarketOrders', {
            resource: App.currentMarketResource,
            type: 'sell',
            page: page,
            limit: 10
        });
        
        let totalOrders = sellOrders.orders?.length || 0;
        let milkQty = 0, eggsQty = 0;
        
        if (App.currentMarketResource === 'milk') {
            milkQty = sellOrders.orders?.reduce((sum, o) => sum + o.remaining, 0) || 0;
        } else {
            eggsQty = sellOrders.orders?.reduce((sum, o) => sum + o.remaining, 0) || 0;
        }
        
        const marketTotalOrders = document.getElementById('marketTotalOrders');
        const marketMilkQty = document.getElementById('marketMilkQty');
        const marketEggsQty = document.getElementById('marketEggsQty');
        const marketBestPrice = document.getElementById('marketBestPrice');
        
        if (marketTotalOrders) marketTotalOrders.innerHTML = totalOrders;
        if (marketMilkQty) marketMilkQty.innerHTML = formatNumber(milkQty);
        if (marketEggsQty) marketEggsQty.innerHTML = formatNumber(eggsQty);
        
        const bestSell = App.market?.[App.currentMarketResource]?.bestSellPrice || 0.0001;
        if (marketBestPrice) marketBestPrice.innerHTML = formatFullPrecision(bestSell);
        
        const sellGrid = document.getElementById('sellOrdersGrid');
        const loadMoreBtn = document.getElementById('loadMoreSellBtn');
        
        if (sellOrders.orders && sellOrders.orders.length > 0) {
            let html = '';
            
            if (reset) {
                if (sellGrid) sellGrid.innerHTML = '';
                App.currentMarketPage = 1;
                App.hasMoreOrders = sellOrders.hasMore;
            }
            
            sellOrders.orders.forEach(order => {
                const pricePerUnit = order.pricePerUnit;
                const total = order.remaining * pricePerUnit;
                const resourceEmoji = App.currentMarketResource === 'milk' ? '🥛' : '🥚';
                const resourceName = App.currentMarketResource === 'milk' ? 'MILK' : 'EGG';
                
                html += `<div class="market-card" onclick="showPurchaseConfirm('${order.id}', '${order.resource}', ${order.remaining}, ${pricePerUnit})">
                    <div class="card-inner">
                        <div class="card-title ${order.type}">${resourceName}</div>
                        <div class="amount-box">
                            <span class="egg-icon">${resourceEmoji}</span>
                            <span>${formatNumber(order.remaining)}</span>
                        </div>
                        <div class="price-label">PRICE</div>
                        <div class="price-box">
                            <img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; filter: drop-shadow(0 0 2px rgba(255,255,255,0.5));">
                            <span>${formatFullPrecision(total)}</span>
                        </div>
                        <div class="unit-price">${formatFullPrecision(pricePerUnit)} TON/${resourceName.toLowerCase()}</div>
                        <button class="buy-btn">${App.currentLanguage === 'ru' ? 'Купить' : 'Buy'}</button>
                    </div>
                </div>`;
            });
            
            if (reset) {
                if (sellGrid) sellGrid.innerHTML = html;
            } else {
                if (sellGrid) sellGrid.innerHTML += html;
            }
            
            if (loadMoreBtn) loadMoreBtn.style.display = sellOrders.hasMore ? 'block' : 'none';
            
        } else {
            if (sellGrid) {
                sellGrid.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 25px; color: var(--text-secondary);"><i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"></i><p>' + 
                    (App.currentLanguage === 'ru' ? 'Нет активных заказов на продажу' : 'No active sell orders') + '</p></div>';
            }
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        }
        
        loadMyOrders();
        
    } catch (error) {
        console.error('Market UI update error:', error);
    }
}

window.updateMarketUI = updateMarketUI;

function updateSellDetails() {
    const quantity = parseInt(document.getElementById('sellQuantity')?.value) || 0;
    const totalPrice = parseFloat(document.getElementById('sellTotalPrice')?.value) || 0;
    const sellPerUnitHint = document.getElementById('sellPerUnitHint');
    const sellPenaltyWarning = document.getElementById('sellPenaltyWarning');
    const sellTotalTon = document.getElementById('sellTotalTon');
    const sellFeeDisplay = document.getElementById('sellFeeDisplay');
    const sellBalanceHint = document.getElementById('sellBalanceHint');
    
    if (quantity > 0 && totalPrice > 0) {
        const perUnit = totalPrice / quantity;
        if (sellPerUnitHint) sellPerUnitHint.innerHTML = `≈ ${formatFullPrecision(perUnit)} TON per unit`;
        
        if (sellPenaltyWarning) {
            if (perUnit < CONFIG.MIN_ORDER_PRICE) {
                sellPenaltyWarning.style.display = 'block';
                sellPenaltyWarning.innerHTML = `⚠️ Price below ${CONFIG.MIN_ORDER_PRICE} TON will incur ${CONFIG.ORDER_PENALTY_FEE} TON penalty fee (non-refundable)`;
            } else {
                sellPenaltyWarning.style.display = 'none';
            }
        }
    } else {
        if (sellPerUnitHint) sellPerUnitHint.innerHTML = `≈ 0 TON per unit`;
        if (sellPenaltyWarning) sellPenaltyWarning.style.display = 'none';
    }
    
    const fee = totalPrice * 0.1;
    const sellerGets = totalPrice - fee;
    if (sellTotalTon) sellTotalTon.innerHTML = `Total: ${formatFullPrecision(totalPrice)} TON (You get: ${formatFullPrecision(sellerGets)} TON after 10% fee)`;
    if (sellFeeDisplay) sellFeeDisplay.innerHTML = `⚠️ 10% market fee (${formatFullPrecision(fee)} TON) will be deducted when sold`;
    
    const resource = document.querySelector('input[name="sellResource"]:checked')?.value || 'milk';
    const balance = resource === 'milk' ? App.user?.milk : App.user?.eggs;
    if (sellBalanceHint) sellBalanceHint.innerHTML = `Available: ${formatNumber(balance || 0)} ${resource === 'milk' ? 'Milk' : 'Eggs'}`;
}

window.updateSellDetails = updateSellDetails;

// ==================== REFERRAL FUNCTIONS ====================

function updateReferralUI() {
    if (!App.referral) return;
    
    const totalReferrals = document.getElementById('totalReferrals');
    if (totalReferrals) totalReferrals.innerHTML = App.referral.totalReferrals || 0;
    
    App.referralsPage = 1;
    App.earningsPage = 1;
    
    displayReferrals(1);
    displayEarnings(1);
}

function displayReferrals(page = 1, append = false) {
    const recentList = document.getElementById('recentReferralsList');
    const loadMoreBtn = document.getElementById('loadMoreReferralsBtn');
    
    if (!recentList) return;
    
    if (App.referral.recentReferrals && App.referral.recentReferrals.length > 0) {
        const itemsPerPage = 10;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedReferrals = App.referral.recentReferrals.slice(startIndex, endIndex);
        
        let html = '';
        
        paginatedReferrals.forEach(ref => {
            const joinDate = ref.joinedAt ? new Date(ref.joinedAt).toLocaleDateString('en-GB') : 'Recently';
            const name = ref.firstName || ref.username || `User ${ref.userId?.substring(0, 6)}`;
            
            let avatarHtml = '';
            if (ref.photoUrl) {
                avatarHtml = `<img src="${ref.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
            } else {
                avatarHtml = name.charAt(0).toUpperCase();
            }
            
            html += `<div style="display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div style="width: 36px; height: 36px; background: linear-gradient(145deg, var(--primary-pink), var(--crystal-blue)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; overflow: hidden; color: white; font-weight: 600;">
                    ${avatarHtml}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-weight: 600; font-size: 12px;">${name}</div>
                        <div style="font-weight: 700; color: var(--neon-green); font-size: 11px;">+${formatTON(ref.totalEarnedFromThisUser || 0)} TON</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                        <div style="font-size: 9px; color: var(--text-muted);">${joinDate}</div>
                    </div>
                </div>
            </div>`;
        });
        
        if (append) {
            recentList.innerHTML += html;
        } else {
            recentList.innerHTML = html;
        }
        
        const hasMore = App.referral.recentReferrals.length > endIndex;
        App.hasMoreReferrals = hasMore;
        if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'block' : 'none';
        
    } else {
        recentList.innerHTML = '<div style="text-align: center; padding: 18px; color: var(--text-secondary);">' + 
            (App.currentLanguage === 'ru' ? 'Нет рефералов' : 'No referrals yet') + '</div>';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
}

function displayEarnings(page = 1, append = false) {
    const earningsList = document.getElementById('earningsHistoryList');
    const loadMoreBtn = document.getElementById('loadMoreEarningsBtn');
    
    if (!earningsList) return;
    
    if (App.referral.recentEarnings && App.referral.recentEarnings.length > 0) {
        const itemsPerPage = 10;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedEarnings = App.referral.recentEarnings.slice(startIndex, endIndex);
        
        let html = '';
        
        paginatedEarnings.forEach(earning => {
            const date = new Date(earning.timestamp).toLocaleDateString('en-GB');
            const name = earning.firstName || earning.username || `User ${earning.userId?.substring(0, 6)}`;
            
            let typeDisplay = '';
            if (earning.type === 'cow_purchase') typeDisplay = '🐮 Корова';
            else if (earning.type === 'chicken_purchase') typeDisplay = '🐔 Курица';
            else if (earning.type === 'diamond_engine_purchase') typeDisplay = '💎 Кристальный двигатель';
            else typeDisplay = earning.type || 'покупка';
            
            html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <div style="font-size: 11px; font-weight: 600;">${name}</div>
                    <div style="font-size: 9px; color: var(--text-muted);">${typeDisplay}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 11px; font-weight: 700; color: var(--neon-green);">+${formatTON(earning.amount)} TON</div>
                    <div style="font-size: 8px; color: var(--text-muted);">${date}</div>
                </div>
            </div>`;
        });
        
        if (append) {
            earningsList.innerHTML += html;
        } else {
            earningsList.innerHTML = html;
        }
        
        const hasMore = App.referral.recentEarnings.length > endIndex;
        App.hasMoreEarnings = hasMore;
        if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'block' : 'none';
        
    } else {
        earningsList.innerHTML = '<div style="text-align: center; padding: 18px; color: var(--text-secondary);">' + 
            (App.currentLanguage === 'ru' ? 'Нет доходов' : 'No earnings yet') + '</div>';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
}

function loadMoreReferrals() {
    App.referralsPage++;
    displayReferrals(App.referralsPage, true);
}

function loadMoreEarnings() {
    App.earningsPage++;
    displayEarnings(App.earningsPage, true);
}

window.loadMoreReferrals = loadMoreReferrals;
window.loadMoreEarnings = loadMoreEarnings;

// ==================== TASKS FUNCTIONS ====================

function updateTasksUI() {
    if (!App.tasks) return;
    
    const tasksGrid = document.getElementById('tasksGrid');
    if (!tasksGrid) return;
    
    const currentTab = App.currentTaskTab;
    const tasks = App.tasks[currentTab] || [];
    
    if (tasks.length === 0) {
        tasksGrid.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);"><i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i><p data-i18n="tasks.noTasks">No tasks available</p></div>';
        return;
    }
    
    let html = '';
    
    tasks.forEach(task => {
        const isCompleted = task.completedBy && task.completedBy.includes(App.userId);
        const taskIcon = task.type === 'channel' ? '📢' : '🤖';
        const taskTypeText = task.type === 'channel' ? 
            (App.currentLanguage === 'ru' ? 'Канал' : 'Channel') : 
            (App.currentLanguage === 'ru' ? 'Бот' : 'Bot');
        
        const taskClass = task.id.startsWith('partner_') ? 'partner-task' : '';
        
        const hasJoined = sessionStorage.getItem(`task_${task.id}_joined`) === 'true';
        
        html += `<div class="task-card ${taskClass}" style="padding: 10px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <div style="width: 24px; height: 24px; background: rgba(255,92,168,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">${taskIcon}</div>
                <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${task.name || taskTypeText}</div>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 14px; height: 14px; object-fit: contain;">
                    <span style="font-size: 11px; font-weight: 600; color: var(--neon-green);">${formatTON(task.reward || CONFIG.TASK_REWARD)}</span>
                </div>` +
                
                (isCompleted ? 
                    `<span style="font-size: 10px; color: var(--text-muted);"><i class="fas fa-check-circle" style="color: var(--neon-green);"></i> ${App.currentLanguage === 'ru' ? 'Выполнено' : 'Done'}</span>` :
                    `<button class="task-btn" id="taskBtn_${task.id}" style="padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 600; background: ${hasJoined ? 'linear-gradient(145deg, var(--neon-green), #00b35e)' : 'linear-gradient(145deg, var(--crystal-blue), #0099cc)'}; color: white; border: none; cursor: pointer;" onclick="window.handleTaskButton('${task.id}', '${task.link}', '${task.type}', ${hasJoined})">
                        ${hasJoined ? (App.currentLanguage === 'ru' ? 'Проверить' : 'Verify') : (App.currentLanguage === 'ru' ? 'Присоединиться' : 'Join')}
                    </button>`
                ) +
            `</div>
        </div>`;
    });
    
    tasksGrid.innerHTML = html;
}

window.updateTasksUI = updateTasksUI;

window.handleTaskButton = function(taskId, link, taskType, hasJoined) {
    if (!hasJoined) {
        sessionStorage.setItem(`task_${taskId}_joined`, 'true');
        window.open(link, '_blank');
        
        setTimeout(() => {
            const btn = document.getElementById(`taskBtn_${taskId}`);
            if (btn) {
                btn.innerHTML = App.currentLanguage === 'ru' ? 'Проверить' : 'Verify';
                btn.style.background = 'linear-gradient(145deg, var(--neon-green), #00b35e)';
                btn.setAttribute('onclick', `window.verifyTask('${taskId}', '${taskType}')`);
            }
        }, 2000);
    } else {
        window.verifyTask(taskId, taskType);
    }
};

window.verifyTask = async function(taskId, taskType) {
    try {
        const task = App.tasks[App.currentTaskTab].find(t => t.id === taskId);
        
        if (!task) {
            showNotification('Task not found', 'error');
            return;
        }
        
        const modal = document.getElementById('taskVerifyModal');
        const verifyEmoji = document.getElementById('verifyEmoji');
        const verifyTitle = document.getElementById('verifyTitle');
        const verifyLink = document.getElementById('verifyLink');
        const verifyReward = document.getElementById('verifyReward');
        const verifyJoinLink = document.getElementById('verifyJoinLink');
        const verifyStatus = document.getElementById('verifyStatus');
        const verifyCheckBtn = document.getElementById('verifyCheckBtn');
        
        if (verifyEmoji) verifyEmoji.innerHTML = task.type === 'channel' ? '📢' : '🤖';
        if (verifyTitle) verifyTitle.innerHTML = task.type === 'channel' ? 
            (App.currentLanguage === 'ru' ? 'Присоединиться к каналу' : 'Join Channel') : 
            (App.currentLanguage === 'ru' ? 'Запустить бота' : 'Start Bot');
        if (verifyLink) verifyLink.innerHTML = task.link;
        if (verifyReward) verifyReward.innerHTML = formatTON(task.reward || CONFIG.TASK_REWARD) + ' TON';
        if (verifyJoinLink) verifyJoinLink.href = task.link;
        
        if (verifyStatus) {
            verifyStatus.style.display = 'none';
            verifyStatus.innerHTML = '';
        }
        
        if (verifyCheckBtn) {
            verifyCheckBtn.onclick = async function() {
                await performTaskVerification(task);
            };
        }
        
        if (modal) modal.classList.add('active');
        
    } catch (error) {
        console.error('Task verification error:', error);
        showNotification('Verification failed', 'error');
    }
};

async function performTaskVerification(task) {
    const buttonId = 'verifyCheckBtn';
    const button = document.getElementById('verifyCheckBtn');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    try {
        const statusDiv = document.getElementById('verifyStatus');
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = '<div style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> ' + 
                (App.currentLanguage === 'ru' ? 'Проверка...' : 'Verifying...') + '</div>';
        }
        
        const result = await callAPI('verifyTask', {
            taskId: task.id,
            taskType: task.type
        });
        
        if (result) {
            if (statusDiv) {
                statusDiv.innerHTML = '<div style="color: var(--neon-green); text-align: center;">✅ ' + 
                    (App.currentLanguage === 'ru' ? 'Задание выполнено! Награда добавлена.' : 'Task completed! Reward added.') + 
                    '</div>';
            }
            
            showNotification(
                App.currentLanguage === 'ru' ? 
                `✅ Задание выполнено! +${formatTON(task.reward || CONFIG.TASK_REWARD)} TON` : 
                `✅ Task completed! +${formatTON(task.reward || CONFIG.TASK_REWARD)} TON`,
                'success'
            );
            
            sessionStorage.removeItem(`task_${task.id}_joined`);
            
            setTimeout(() => {
                window.closeAllModals();
                loadGameState();
            }, 2000);
        }
        
    } catch (error) {
        console.error('Task verification error:', error);
        
        const statusDiv = document.getElementById('verifyStatus');
        if (statusDiv) {
            statusDiv.style.display = 'block';
            
            let errorMessage = error.message || '';
            
            if (errorMessage.includes('Not a member') || errorMessage.includes('NOT_MEMBER')) {
                statusDiv.innerHTML = '<div style="color: var(--danger-red); text-align: center;">❌ ' + 
                    (App.currentLanguage === 'ru' ? 'Не участник канала' : 'Not a member of the channel') + '</div>';
                
                sessionStorage.removeItem(`task_${task.id}_joined`);
            } else if (errorMessage.includes('already completed') || errorMessage.includes('TASK_ALREADY_COMPLETED')) {
                statusDiv.innerHTML = '<div style="color: var(--warning); text-align: center;">⚠️ ' + 
                    (App.currentLanguage === 'ru' ? 'Задание уже выполнено' : 'Task already completed') + '</div>';
            } else {
                statusDiv.innerHTML = '<div style="color: var(--danger-red); text-align: center;">❌ ' + 
                    (errorMessage || (App.currentLanguage === 'ru' ? 'Ошибка проверки' : 'Verification error')) + '</div>';
            }
        }
    }
}

// ==================== LEADERBOARD FUNCTIONS ====================

function updateLeaderboardUI() {
    if (!App.leaderboard) return;
    
    const leaderboard = App.leaderboard;
    
    const leaderboardCowsSold = document.getElementById('leaderboardCowsSold');
    const leaderboardProgressFill = document.getElementById('leaderboardProgressFill');
    const leaderboardRemaining = document.getElementById('leaderboardRemaining');
    const userRank = document.getElementById('userRank');
    const userPoints = document.getElementById('userPoints');
    const userPrize = document.getElementById('userPrize');
    const winnersSection = document.getElementById('winnersSection');
    const leaderboardEndMessage = document.getElementById('leaderboardEndMessage');
    
    if (leaderboardCowsSold) leaderboardCowsSold.innerHTML = leaderboard.totalCowSales || 0;
    const progressPercent = ((leaderboard.totalCowSales || 0) / 1000) * 100;
    if (leaderboardProgressFill) leaderboardProgressFill.style.width = `${progressPercent}%`;
    if (leaderboardRemaining) leaderboardRemaining.innerHTML = `Remaining: ${leaderboard.remainingCows || 0}`;
    
    const currentUser = leaderboard.currentUser || { rank: 0, points: 0, cowCount: 0, prize: 0, photoUrl: '' };
    if (userRank) userRank.innerHTML = `#${currentUser.rank || 0}`;
    if (userPoints) userPoints.innerHTML = currentUser.points || 0;
    if (userPrize) userPrize.innerHTML = `<img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 12px; height: 12px; object-fit: contain;"> ${currentUser.prize || 0}`;
    
    if (!leaderboard.isActive && leaderboard.prizesDistributed) {
        if (winnersSection) winnersSection.style.display = 'block';
        displayWinners(leaderboard.winners);
        if (leaderboardEndMessage) leaderboardEndMessage.innerHTML = '<i class="fas fa-check-circle" style="color: var(--neon-green);"></i> Competition ended! Prizes distributed.';
    } else {
        if (winnersSection) winnersSection.style.display = 'none';
    }
    
    displayLeaderboardList(leaderboard.leaderboard);
    
    if (currentUser && currentUser.photoUrl) {
        const userAvatar = document.getElementById('profileAvatar');
        if (userAvatar) {
            userAvatar.innerHTML = `<img src="${currentUser.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
        }
    }
}

function displayLeaderboardList(leaderboardList) {
    const container = document.getElementById('leaderboardList');
    if (!container) return;
    
    if (!leaderboardList || leaderboardList.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);"><i class="fas fa-trophy" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i><p>No players yet - Buy a cow to appear!</p></div>';
        return;
    }
    
    let html = '';
    leaderboardList.slice(0, 50).forEach(player => {
        const rank = player.rank;
        const name = player.firstName || player.username || `Farmer #${player.userId?.substring(0, 4)}`;
        const points = player.points || 0;
        const prize = player.prize || 0;
        
        let rankClass = '';
        
        if (rank === 1) {
            rankClass = 'gold';
        } else if (rank === 2) {
            rankClass = 'silver';
        } else if (rank === 3) {
            rankClass = 'bronze';
        }
        
        html += `<div class="leaderboard-card ${rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : ''}">
            <div class="card-content">
                <div class="rank-badge ${rankClass}">
                    ${rank}
                </div>
                <div class="user-info">
                    <div class="user-name-row">
                        <span class="user-name">${name}</span>
                        ${rank <= 3 ? '<span class="user-crown"><i class="fas fa-crown"></i></span>' : ''}
                    </div>
                    <div class="user-username"></div>
                </div>
                <div class="points-section">
                    <div class="points-box">
                        <i class="fas fa-cow"></i> ${points}
                    </div>
                    ${prize > 0 ? 
                        `<div class="prize-pill">
                            <img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 16px; height: 16px; object-fit: contain;"> 
                            ${prize}
                        </div>` : ''
                    }
                </div>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

function displayWinners(winners) {
    const container = document.getElementById('winnersList');
    if (!container) return;
    
    if (!winners || Object.keys(winners).length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 10px;">No winners recorded</div>';
        return;
    }
    
    let html = '';
    const sortedWinners = Object.values(winners).sort((a, b) => a.rank - b.rank);
    
    sortedWinners.forEach(winner => {
        const name = winner.firstName || winner.username || `Farmer #${winner.userId?.substring(0, 6)}`;
        html += `<div class="winner-item">
            <span class="winner-rank">#${winner.rank}</span>
            <span class="winner-name">${name}</span>
            <span class="winner-prize">${winner.prize} TON</span>
        </div>`;
    });
    
    container.innerHTML = html;
}

// ==================== INTERVALS & EVENT LISTENERS ====================

function setupIntervals() {
    if (App.timerInterval) clearInterval(App.timerInterval);
    App.timerInterval = setInterval(() => {
        if (App.user && App.user.secondsUntilNext > 0) {
            App.user.secondsUntilNext--;
            updateProductionTimer();
        } else {
            loadGameState();
        }
    }, 1000);
    
    if (App.marketInterval) clearInterval(App.marketInterval);
    App.marketInterval = setInterval(() => {
        if (App.currentMarketResource) {
            updateMarketUI(1, true);
        }
    }, CONFIG.MARKET_REFRESH);
    
    setInterval(() => {
        loadGameState();
    }, 30000);
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const section = document.getElementById(sectionId);
            if (section) section.classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            if (sectionId === 'sectionTasks') {
                updateTasksUI();
            }
            
            if (sectionId === 'sectionLeaderboard') {
                loadGameState();
            }
        });
    });
    
    // Leaderboard button
    const leaderboardButton = document.getElementById('leaderboardButton');
    if (leaderboardButton) {
        leaderboardButton.addEventListener('click', function() {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const section = document.getElementById('sectionLeaderboard');
            if (section) section.classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            loadGameState();
        });
    }
    
    // Language switcher
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.dataset.lang;
            setLanguage(lang);
            
            if (App.tonConnectUI) {
                App.tonConnectUI.language = lang === 'ru' ? 'ru' : 'en';
            }
            
            updateAllUI();
        });
    });
    
    // Market tabs
    document.querySelectorAll('[data-market-tab]').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('[data-market-tab]').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabValue = this.dataset.marketTab;
            const marketBuyView = document.getElementById('marketBuyView');
            const marketMyOrdersView = document.getElementById('marketMyOrdersView');
            
            if (marketBuyView) marketBuyView.style.display = tabValue === 'buy' ? 'block' : 'none';
            if (marketMyOrdersView) marketMyOrdersView.style.display = tabValue === 'orders' ? 'block' : 'none';
            
            if (tabValue === 'orders') {
                loadMyOrders();
            }
        });
    });
    
    // Task tabs
    document.querySelectorAll('[data-task-tab]').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('[data-task-tab]').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            App.currentTaskTab = this.dataset.taskTab;
            updateTasksUI();
        });
    });
    
    // Resource switch
    document.querySelectorAll('[data-resource]').forEach(res => {
        res.addEventListener('click', function() {
            document.querySelectorAll('[data-resource]').forEach(r => r.classList.remove('active'));
            this.classList.add('active');
            App.currentMarketResource = this.dataset.resource;
            App.currentMarketPage = 1;
            updateMarketUI(1, true);
        });
    });
    
    // Task type radio
    document.querySelectorAll('input[name="taskType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const note = document.getElementById('channelNote');
            if (note) note.style.display = this.value === 'channel' ? 'block' : 'none';
        });
    });
    
    // Refresh buttons
    const refreshMarketBtn = document.getElementById('refreshMarketBtn');
    if (refreshMarketBtn) {
        refreshMarketBtn.addEventListener('click', function() {
            App.currentMarketPage = 1;
            updateMarketUI(1, true);
            this.querySelector('i').style.animation = 'spin-slow 0.5s infinite linear';
            setTimeout(() => {
                this.querySelector('i').style.animation = 'spin-slow 2s infinite linear';
            }, 500);
        });
    }
    
    const refreshTasksBtn = document.getElementById('refreshTasksBtn');
    if (refreshTasksBtn) {
        refreshTasksBtn.addEventListener('click', function() {
            loadGameState();
            this.querySelector('i').style.animation = 'spin-slow 0.5s infinite linear';
            setTimeout(() => {
                this.querySelector('i').style.animation = 'spin-slow 2s infinite linear';
            }, 500);
        });
    }
    
    // Load more buttons
    const loadMoreSellBtn = document.getElementById('loadMoreSellBtn');
    if (loadMoreSellBtn) {
        loadMoreSellBtn.addEventListener('click', function() {
            App.currentMarketPage++;
            updateMarketUI(App.currentMarketPage, false);
        });
    }
    
    const loadMoreReferralsBtn = document.getElementById('loadMoreReferralsBtn');
    if (loadMoreReferralsBtn) {
        loadMoreReferralsBtn.addEventListener('click', loadMoreReferrals);
    }
    
    const loadMoreEarningsBtn = document.getElementById('loadMoreEarningsBtn');
    if (loadMoreEarningsBtn) {
        loadMoreEarningsBtn.addEventListener('click', loadMoreEarnings);
    }
    
    // Buy buttons
    const buyCowBtn = document.getElementById('buyCowBtn');
    if (buyCowBtn) buyCowBtn.addEventListener('click', window.buyCow);
    
    const buyChickenBtn = document.getElementById('buyChickenBtn');
    if (buyChickenBtn) buyChickenBtn.addEventListener('click', window.buyChicken);
    
    const buyDiamondBtn = document.getElementById('buyDiamondBtn');
    if (buyDiamondBtn) buyDiamondBtn.addEventListener('click', window.buyDiamondEngine);
    
    const startDiamondBtn = document.getElementById('startDiamondBtn');
    if (startDiamondBtn) startDiamondBtn.addEventListener('click', window.startDiamondProduction);
    
    // Hatch buttons
    const hatchCowBtn = document.getElementById('hatchCowBtn');
    if (hatchCowBtn) hatchCowBtn.addEventListener('click', window.openHatchModal);
    
    const hatchChickenBtn = document.getElementById('hatchChickenBtn');
    if (hatchChickenBtn) hatchChickenBtn.addEventListener('click', window.openHatchModal);
    
    const hatchCowConfirm = document.getElementById('hatchCowConfirm');
    if (hatchCowConfirm) hatchCowConfirm.addEventListener('click', window.hatchCow);
    
    const hatchChickenConfirm = document.getElementById('hatchChickenConfirm');
    if (hatchChickenConfirm) hatchChickenConfirm.addEventListener('click', window.hatchChicken);
    
    // Convert button
    const convertDiamondBtn = document.getElementById('convertDiamondBtn');
    if (convertDiamondBtn) convertDiamondBtn.addEventListener('click', window.convertDiamond);
    
    const convertAmount = document.getElementById('convertAmount');
    if (convertAmount) convertAmount.addEventListener('input', updateAllUI);
    
    // Referral buttons
    const copyReferralBtn = document.getElementById('copyReferralBtn');
    if (copyReferralBtn) copyReferralBtn.addEventListener('click', window.copyReferralLink);
    
    const claimReferralBtn = document.getElementById('claimReferralBtn');
    if (claimReferralBtn) claimReferralBtn.addEventListener('click', window.claimReferral);
    
    // Withdraw
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) withdrawBtn.addEventListener('click', window.withdraw);
    
    const withdrawAmount = document.getElementById('withdrawAmount');
    if (withdrawAmount) withdrawAmount.addEventListener('input', updateAllUI);
    
    // Market
    const createSellOrderBtnTop = document.getElementById('createSellOrderBtnTop');
    if (createSellOrderBtnTop) createSellOrderBtnTop.addEventListener('click', window.openSellOrderModal);
    
    const submitSellOrderBtn = document.getElementById('submitSellOrderBtn');
    if (submitSellOrderBtn) submitSellOrderBtn.addEventListener('click', window.createSellOrder);
    
    // Deposit
    const depositButton = document.getElementById('depositButton');
    if (depositButton) depositButton.addEventListener('click', window.openDepositModal);
    
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    if (connectWalletBtn) connectWalletBtn.addEventListener('click', connectWallet);
    
    const submitDepositBtn = document.getElementById('submitDepositBtn');
    if (submitDepositBtn) submitDepositBtn.addEventListener('click', window.initiateDeposit);
    
    // Tasks
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', window.openAddTaskModal);
    
    const submitTaskBtn = document.getElementById('submitTaskBtn');
    if (submitTaskBtn) submitTaskBtn.addEventListener('click', window.createTask);
    
    const taskTarget = document.getElementById('taskTarget');
    if (taskTarget) taskTarget.addEventListener('input', window.calculateTaskPrice);
    
    // Sell percent presets
    document.querySelectorAll('[data-sell-percent]').forEach(btn => {
        btn.addEventListener('click', function() {
            const percent = parseInt(this.dataset.sellPercent) / 100;
            const resource = document.querySelector('input[name="sellResource"]:checked')?.value || 'milk';
            const balance = resource === 'milk' ? App.user?.milk : App.user?.eggs;
            const amount = Math.floor(balance * percent);
            const sellQuantity = document.getElementById('sellQuantity');
            if (sellQuantity) sellQuantity.value = Math.max(100, amount);
            updateSellDetails();
        });
    });
    
    // Deposit presets
    document.querySelectorAll('[data-deposit]').forEach(btn => {
        btn.addEventListener('click', function() {
            const depositAmountInput = document.getElementById('depositAmountInput');
            if (depositAmountInput) depositAmountInput.value = this.dataset.deposit;
        });
    });
    
    // Sell resource radio
    document.querySelectorAll('input[name="sellResource"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateAllUI();
            updateSellDetails();
        });
    });
    
    // Help buttons
    const helpButton = document.getElementById('helpButton');
    if (helpButton) {
        helpButton.addEventListener('click', function() {
            const helpModal = document.getElementById('helpModal');
            if (helpModal) helpModal.classList.add('active');
        });
    }
    
    const closeHelp = document.getElementById('closeHelp');
    if (closeHelp) {
        closeHelp.addEventListener('click', function() {
            const helpModal = document.getElementById('helpModal');
            if (helpModal) helpModal.classList.remove('active');
        });
    }
    
    // Modal close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Input listeners
    const sellQuantity = document.getElementById('sellQuantity');
    if (sellQuantity) sellQuantity.addEventListener('input', updateSellDetails);
    
    const sellTotalPrice = document.getElementById('sellTotalPrice');
    if (sellTotalPrice) sellTotalPrice.addEventListener('input', updateSellDetails);
}

// ==================== WINDOW FUNCTIONS ====================

window.closeAllModals = function() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
    App.pendingOrder = null;
    App.pendingTask = null;
};

window.openSellOrderModal = function() {
    const modal = document.getElementById('sellOrderModal');
    if (modal) modal.classList.add('active');
    updateSellDetails();
};

window.openHatchModal = function() {
    const modal = document.getElementById('hatchModal');
    if (modal) modal.classList.add('active');
};

window.openAddTaskModal = function() {
    const modal = document.getElementById('addTaskModal');
    if (modal) modal.classList.add('active');
    if (window.calculateTaskPrice) window.calculateTaskPrice();
};

window.openDepositModal = function() {
    const modal = document.getElementById('depositModal');
    if (modal) modal.classList.add('active');
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', initApp);
