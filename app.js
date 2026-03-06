// ===== MAIN APPLICATION =====

/**
 * Initialize the application
 */
async function initApp() {
    console.log('Crystal Ranch · Initializing...');
    
    const savedLang = localStorage.getItem('crystal_ranch_lang') || 'en';
    window.setLanguage(savedLang);
    
    await setupTelegram();
    await initializeUser();
    
    setTimeout(() => initTONConnect(), 1000);
    
    await loadGameState();
    setupIntervals();
    setupEventListeners();
    
    console.log('Crystal Ranch · Ready');
}

/**
 * Setup Telegram WebApp
 * @returns {Promise<void>}
 */
async function setupTelegram() {
    return new Promise((resolve) => {
        if (window.Telegram && window.Telegram.WebApp) {
            window.App.telegram = window.Telegram.WebApp;
            window.App.telegram.ready();
            window.App.telegram.expand();
            
            if (window.App.telegram.initDataUnsafe && window.App.telegram.initDataUnsafe.user) {
                const tgUser = window.App.telegram.initDataUnsafe.user;
                window.App.userId = String(tgUser.id);
                
                const fullName = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Farmer';
                document.getElementById('profileName').innerHTML = fullName;
                document.getElementById('profileUsername').innerHTML = tgUser.username ? `@${tgUser.username}` : '@crystal_ranch';
                document.getElementById('profileUserId').innerHTML = `ID: ${window.App.userId}`;
                document.getElementById('depositUserIdDisplay').innerHTML = window.App.userId;
                
                if (tgUser.photo_url) {
                    const avatar = document.getElementById('profileAvatar');
                    avatar.innerHTML = `<img src="${tgUser.photo_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
                }
            }
            
            if (window.App.telegram.initDataUnsafe && window.App.telegram.initDataUnsafe.start_param) {
                const startParam = window.App.telegram.initDataUnsafe.start_param;
                console.log('Start param:', startParam);
                if (startParam.startsWith('ref_')) {
                    sessionStorage.setItem('referrer', startParam);
                }
            }
            
            resolve();
        } else {
            window.App.userId = 'demo_' + Math.floor(Math.random() * 1000000);
            document.getElementById('profileName').innerHTML = 'Demo Farmer';
            document.getElementById('profileUsername').innerHTML = '@demo';
            document.getElementById('profileUserId').innerHTML = `ID: ${window.App.userId}`;
            document.getElementById('depositUserIdDisplay').innerHTML = window.App.userId;
            resolve();
        }
    });
}

/**
 * Initialize user on server
 * @returns {Promise<object>}
 */
async function initializeUser() {
    try {
        const referrer = sessionStorage.getItem('referrer');
        const startParam = referrer || null;
        
        const tgUser = window.App.telegram?.initDataUnsafe?.user;
        const userInfo = tgUser ? {
            first_name: tgUser.first_name,
            last_name: tgUser.last_name,
            username: tgUser.username,
            photo_url: tgUser.photo_url
        } : null;
        
        const response = await fetch(`${window.CONFIG.API_URL}/api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Telegram ${window.App.telegram?.initData || ''}`,
                'X-Action': 'initializeUser',
                'X-CSRF-Token': window.CONFIG.CSRF_TOKEN
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

/**
 * Initialize TON Connect
 */
async function initTONConnect() {
    try {
        if (window.TON_CONNECT_UI) {
            const manifestUrl = `${window.CONFIG.API_URL}/tonconnect-manifest.json`;
            
            window.App.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
                manifestUrl: manifestUrl,
                language: window.App.currentLanguage === 'ru' ? 'ru' : 'en',
                uiPreferences: { theme: 'DARK' }
            });
            
            window.App.tonConnectUI.onStatusChange((wallet) => {
                if (wallet) {
                    handleWalletConnected(wallet);
                } else {
                    handleWalletDisconnected();
                }
            });
            
            setTimeout(() => {
                if (window.App.tonConnectUI.connected) {
                    window.App.tonConnectUI.getWallets();
                }
            }, 500);
        }
    } catch (error) {
        console.error('TON Connect init error:', error);
    }
}

/**
 * Handle wallet connected
 * @param {object} wallet - Wallet object
 */
function handleWalletConnected(wallet) {
    window.App.wallet = {
        address: wallet.account.address,
        chain: wallet.account.chain,
        appName: wallet.device.appName
    };
    
    const display = document.getElementById('walletAddressDisplay');
    const btn = document.getElementById('connectWalletBtn');
    
    const shortAddress = `${window.App.wallet.address.substring(0, 6)}...${window.App.wallet.address.substring(window.App.wallet.address.length - 4)}`;
    display.innerHTML = `${shortAddress} · ${window.App.wallet.appName}`;
    btn.innerHTML = '<i class="fas fa-unplug"></i> ' + (window.App.currentLanguage === 'ru' ? 'Отключить' : 'Disconnect');
    btn.onclick = disconnectWallet;
    
    document.getElementById('submitDepositBtn').disabled = false;
}

/**
 * Handle wallet disconnected
 */
function handleWalletDisconnected() {
    window.App.wallet = null;
    
    const display = document.getElementById('walletAddressDisplay');
    const btn = document.getElementById('connectWalletBtn');
    
    display.innerHTML = window.App.currentLanguage === 'ru' ? 'Не подключен' : 'Not connected';
    btn.innerHTML = '<i class="fas fa-plug"></i> ' + (window.App.currentLanguage === 'ru' ? 'Подключить' : 'Connect');
    btn.onclick = connectWallet;
    
    document.getElementById('submitDepositBtn').disabled = true;
}

/**
 * Connect wallet
 */
async function connectWallet() {
    if (window.App.tonConnectUI) {
        await window.App.tonConnectUI.openModal();
    }
}

/**
 * Disconnect wallet
 */
async function disconnectWallet() {
    if (window.App.tonConnectUI) {
        await window.App.tonConnectUI.disconnect();
    }
}

/**
 * Load game state from server
 */
async function loadGameState() {
    try {
        const state = await window.callAPI('getState');
        
        window.App.user = state.user;
        window.App.global = state.global;
        window.App.constants = state.constants;
        window.App.referral = state.referral || {
            totalReferrals: 0,
            totalEarnings: 0,
            recentReferrals: [],
            recentEarnings: []
        };
        window.App.market = state.market || {
            milk: { sellOrders: 0, buyOrders: 0, bestSellPrice: 0, bestBuyPrice: 0, totalMilk: 0, totalEggs: 0 },
            eggs: { sellOrders: 0, buyOrders: 0, bestSellPrice: 0, bestBuyPrice: 0 }
        };
        window.App.tasks = state.tasks || { partner: [], community: [] };
        window.App.leaderboard = state.leaderboard || {
            isActive: true,
            totalCowSales: 0,
            cowCap: 1000,
            remainingCows: 1000,
            leaderboard: [],
            currentUser: { rank: 0, cowCount: 0, points: 0, prize: 0, photoUrl: '' },
            prizesDistributed: false,
            winners: {}
        };
        
        if (state.ranch) {
            window.App.ranch = state.ranch;
        } else {
            const cowsOwned = state.user?.cows_owned || 0;
            window.App.ranch.cowLevels = { 1: cowsOwned, 2: 0, 3: 0 };
            window.App.ranch.cowActive = { 1: Math.min(cowsOwned, 10), 2: 0, 3: 0 };
            window.App.ranch.milkStored = Math.floor(Math.random() * 20000);
            window.App.ranch.storageCapacity = 40000;
            window.App.ranch.storageLevel = 1;
            
            const active1 = window.App.ranch.cowActive[1];
            const active2 = window.App.ranch.cowActive[2];
            const active3 = window.App.ranch.cowActive[3];
            const dailyProd = (active1 * window.CONFIG.COW_PRODUCTION_DAILY[1]) +
                             (active2 * window.CONFIG.COW_PRODUCTION_DAILY[2]) +
                             (active3 * window.CONFIG.COW_PRODUCTION_DAILY[3]);
            
            window.App.ranch.hourlyProduction = dailyProd / 24;
            window.App.ranch.dailyProduction = dailyProd;
            window.App.ranch.storageFull = window.App.ranch.milkStored >= window.App.ranch.storageCapacity;
        }
        
        if (window.App.global) {
            window.App.global.diamond_price = window.CONFIG.CRYSTAL_PRICE;
        }
        
        updateAllUI();
        updateReferralUI();
        updateTasksUI();
        updateLeaderboardUI();
        updateRanchOverview();
        updateCowLevelsUI();
        updateCowSupplyUI();
        updateStorageUI();
        updateLockedStates();
        window.animateTonBalance();
        
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

/**
 * Update all UI elements
 */
function updateAllUI() {
    if (!window.App.user || !window.App.global) return;
    
    document.getElementById('statusMilk').innerHTML = window.formatNumber(window.App.user.milk);
    document.getElementById('statusEggs').innerHTML = window.formatNumber(window.App.user.eggs);
    document.getElementById('statusDiamond').innerHTML = window.formatNumber(window.App.user.diamond);
    document.getElementById('statusTon').innerHTML = window.formatTON(window.App.user.tonBalance);
    document.getElementById('milkPerHour').innerHTML = window.App.user.milkPerHour || 0;
    document.getElementById('eggsPerHour').innerHTML = window.App.user.eggsPerHour || 0;
    document.getElementById('crystalPriceHeader').innerHTML = window.CONFIG.CRYSTAL_PRICE;
    
    updateProductionTimer();
    
    document.getElementById('cowsOwned').innerHTML = window.App.user.cows_owned || 0;
    
    const cowProgress = window.App.global.cows_progress || 0;
    document.getElementById('cowProgressText').innerHTML = `${window.App.global.cows_sold || 0}/${window.App.global.cows_cap}`;
    document.getElementById('cowProgressFill').style.width = `${cowProgress}%`;
    
    const cowBtn = document.getElementById('buyCowBtn');
    const cowBadge = document.getElementById('cowBadge');
    
    if (window.App.global.cows_remaining <= 0) {
        cowBtn.disabled = true;
        cowBtn.innerHTML = '<i class="fas fa-ban"></i> ' + (window.App.currentLanguage === 'ru' ? 'Продано' : 'Sold Out');
        cowBadge.innerHTML = window.App.currentLanguage === 'ru' ? 'ПРОДАНО' : 'SOLD OUT';
        cowBadge.className = 'machine-badge badge-soldout';
    } else {
        cowBtn.disabled = false;
        cowBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + (window.App.currentLanguage === 'ru' ? 'Купить' : 'Buy');
        cowBadge.innerHTML = `${window.App.global.cows_remaining} ` + (window.App.currentLanguage === 'ru' ? 'ОСТАЛОСЬ' : 'LEFT');
        cowBadge.className = 'machine-badge badge-available';
    }
    
    document.getElementById('chickensOwned').innerHTML = window.App.user.chickens_owned || 0;
    
    const chickenProgress = window.App.global.chickens_progress || 0;
    document.getElementById('chickenProgressText').innerHTML = `${window.App.global.chickens_sold || 0}/${window.App.global.chickens_cap}`;
    document.getElementById('chickenProgressFill').style.width = `${chickenProgress}%`;
    
    const chickenBtn = document.getElementById('buyChickenBtn');
    const chickenBadge = document.getElementById('chickenBadge');
    
    if (!window.App.global.chicken_unlocked) {
        chickenBtn.disabled = true;
        chickenBtn.innerHTML = '<i class="fas fa-lock"></i> ' + (window.App.currentLanguage === 'ru' ? 'Заблокировано' : 'Locked');
        chickenBadge.innerHTML = window.App.currentLanguage === 'ru' ? 'ЗАБЛОК' : 'LOCKED';
        chickenBadge.className = 'machine-badge badge-locked';
    } else if (window.App.user.chickens_owned > 0) {
        chickenBtn.disabled = true;
        chickenBtn.innerHTML = '<i class="fas fa-check"></i> ' + (window.App.currentLanguage === 'ru' ? 'Владею' : 'Owned');
        chickenBadge.innerHTML = window.App.currentLanguage === 'ru' ? 'ВЛАДЕЮ' : 'OWNED';
        chickenBadge.className = 'machine-badge badge-owned';
    } else if (window.App.global.chickens_remaining <= 0) {
        chickenBtn.disabled = true;
        chickenBtn.innerHTML = '<i class="fas fa-ban"></i> ' + (window.App.currentLanguage === 'ru' ? 'Продано' : 'Sold Out');
        chickenBadge.innerHTML = window.App.currentLanguage === 'ru' ? 'ПРОДАНО' : 'SOLD OUT';
        chickenBadge.className = 'machine-badge badge-soldout';
    } else {
        chickenBtn.disabled = window.App.user.tonBalance < 1;
        chickenBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + (window.App.currentLanguage === 'ru' ? 'Купить' : 'Buy');
        chickenBadge.innerHTML = `${window.App.global.chickens_remaining} ` + (window.App.currentLanguage === 'ru' ? 'ОСТАЛОСЬ' : 'LEFT');
        chickenBadge.className = 'machine-badge badge-available';
    }
    
    document.getElementById('diamondEnginesOwned').innerHTML = window.App.user.diamond_engines_owned || 0;
    
    const diamondBuyBtn = document.getElementById('buyDiamondBtn');
    const diamondStartBtn = document.getElementById('startDiamondBtn');
    const diamondBadge = document.getElementById('diamondBadge');
    
    if (!window.App.global.diamond_unlocked) {
        diamondBuyBtn.disabled = true;
        diamondBuyBtn.innerHTML = '<i class="fas fa-lock"></i> ' + (window.App.currentLanguage === 'ru' ? 'Заблокировано' : 'Locked');
        diamondStartBtn.disabled = true;
        diamondBadge.innerHTML = window.App.currentLanguage === 'ru' ? 'ЗАБЛОК' : 'LOCKED';
        diamondBadge.className = 'machine-badge badge-locked';
    } else if (window.App.user.diamond_engines_owned > 0) {
        diamondBuyBtn.disabled = true;
        diamondBuyBtn.innerHTML = '<i class="fas fa-check"></i> ' + (window.App.currentLanguage === 'ru' ? 'Владею' : 'Owned');
        diamondBadge.innerHTML = window.App.currentLanguage === 'ru' ? 'ВЛАДЕЮ' : 'OWNED';
        diamondBadge.className = 'machine-badge badge-owned';
        
        const canProduce = (window.App.user.milk || 0) >= 20000 && (window.App.user.eggs || 0) >= 20000;
        diamondStartBtn.disabled = !canProduce;
        diamondStartBtn.innerHTML = canProduce ? 
            '<i class="fas fa-play"></i> ' + (window.App.currentLanguage === 'ru' ? 'Запустить' : 'Start') :
            '<i class="fas fa-ban"></i> ' + (window.App.currentLanguage === 'ru' ? 'Нужно 20k' : 'Need 20k');
    } else {
        diamondBuyBtn.disabled = window.App.user.tonBalance < 20;
        diamondBuyBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + (window.App.currentLanguage === 'ru' ? 'Купить' : 'Buy');
        diamondStartBtn.disabled = true;
        diamondBadge.innerHTML = window.App.currentLanguage === 'ru' ? 'ДОСТУПНО' : 'AVAILABLE';
        diamondBadge.className = 'machine-badge badge-available';
    }
    
    document.getElementById('diamondBalanceMain').innerHTML = window.formatNumber(window.App.user.diamond || 0);
    document.getElementById('crystalPriceMain').innerHTML = window.CONFIG.CRYSTAL_PRICE;
    document.getElementById('milkForDiamond').innerHTML = window.formatNumber(window.App.user.milk || 0);
    document.getElementById('eggsForDiamond').innerHTML = window.formatNumber(window.App.user.eggs || 0);
    
    const convertAmount = document.getElementById('convertAmount').value || 0;
    const tonReceive = convertAmount * window.CONFIG.CRYSTAL_PRICE;
    document.getElementById('tonReceiveMain').innerHTML = window.formatTON(tonReceive);
    
    document.getElementById('profileMilk').innerHTML = window.formatNumber(window.App.user.milk || 0);
    document.getElementById('profileEggs').innerHTML = window.formatNumber(window.App.user.eggs || 0);
    document.getElementById('profileDiamond').innerHTML = window.formatNumber(window.App.user.diamond || 0);
    document.getElementById('profileTon').innerHTML = window.formatTON(window.App.user.tonBalance || 0);
    document.getElementById('profileMilkRate').innerHTML = window.App.user.milkPerHour || 0;
    document.getElementById('profileEggsRate').innerHTML = window.App.user.eggsPerHour || 0;
    document.getElementById('profileDiamondPrice').innerHTML = window.CONFIG.CRYSTAL_PRICE;
    
    const totalMachines = (window.App.user.cows_owned || 0) + (window.App.user.chickens_owned || 0) + (window.App.user.diamond_engines_owned || 0);
    document.getElementById('totalMachines').innerHTML = totalMachines;
    document.getElementById('totalProduction').innerHTML = (window.App.user.milkPerHour + window.App.user.eggsPerHour) + '/h';
    
    if (window.App.user.referralCode) {
        const botUsername = window.CONFIG.BOT_USERNAME.replace('@', '');
        const referralLink = `https://t.me/${botUsername}?startapp=ref_${window.App.userId}`;
        document.getElementById('referralLink').value = referralLink;
    }
    
    document.getElementById('totalReferrals').innerHTML = window.App.referral?.totalReferrals || 0;
    
    const claimBtn = document.getElementById('claimReferralBtn');
    if (window.App.user.referralEarnings > 0) {
        claimBtn.disabled = false;
        claimBtn.innerHTML = `<i class="fas fa-hand-holding-usd"></i> ` + 
            (window.App.currentLanguage === 'ru' ? 'Забрать ' : 'Claim ') + 
            `${window.formatTON(window.App.user.referralEarnings)} TON`;
    } else {
        claimBtn.disabled = true;
        claimBtn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> ' + 
            (window.App.currentLanguage === 'ru' ? 'Нет дохода' : 'No Earnings');
    }
    
    const sellBalanceHint = document.getElementById('sellBalanceHint');
    if (sellBalanceHint) {
        const resource = document.querySelector('input[name="sellResource"]:checked')?.value || 'milk';
        const balance = resource === 'milk' ? window.App.user.milk : window.App.user.eggs;
        sellBalanceHint.innerHTML = (window.App.currentLanguage === 'ru' ? 'Доступно: ' : 'Available: ') +
            `${window.formatNumber(balance)} ${resource === 'milk' ? 'Milk' : 'Eggs'}`;
    }
    
    document.getElementById('hatchCowBalance').innerHTML = (window.App.currentLanguage === 'ru' ? 'Ваше молоко: ' : 'Your milk: ') +
        window.formatNumber(window.App.user.milk || 0);
    document.getElementById('hatchChickenBalance').innerHTML = (window.App.currentLanguage === 'ru' ? 'Ваши яйца: ' : 'Your eggs: ') +
        window.formatNumber(window.App.user.eggs || 0);
    
    const withdrawAmount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
    const fee = withdrawAmount * 0.05;
    const net = withdrawAmount - fee;
    document.getElementById('withdrawFee').innerHTML = `${window.formatTON(fee)} TON`;
    document.getElementById('withdrawNet').innerHTML = `${window.formatTON(net)} TON`;
    
    document.getElementById('taskUserBalance').innerHTML = window.formatTON(window.App.user.tonBalance || 0);
}

/**
 * Update production timer
 */
function updateProductionTimer() {
    if (window.App.user && window.App.user.secondsUntilNext !== undefined) {
        const seconds = window.App.user.secondsUntilNext;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        document.getElementById('productionTimer').innerHTML = 
            `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        document.getElementById('ranchProductionTimer').innerHTML = 
            `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

/**
 * Animate TON balance
 */
function animateTonBalance() {
    const tonElement = document.getElementById('statusTon');
    tonElement.classList.add('increased');
    setTimeout(() => {
        tonElement.classList.remove('increased');
    }, 300);
}

/**
 * Update locked states
 */
function updateLockedStates() {
    const chickenLocked = document.getElementById('chickenLockedOverlay');
    const chickenTimer = document.getElementById('chickenUnlockTimer');
    
    if (window.App.global && !window.App.global.chicken_unlocked) {
        chickenLocked.style.display = 'flex';
        const remaining = window.App.global.cows_remaining || 0;
        chickenTimer.innerHTML = `🔓 Unlocks after ${remaining} more cows sold`;
    } else {
        chickenLocked.style.display = 'none';
    }
    
    const diamondLocked = document.getElementById('diamondLockedOverlay');
    const diamondTimer = document.getElementById('diamondUnlockTimer');
    
    if (window.App.global && !window.App.global.diamond_unlocked) {
        diamondLocked.style.display = 'flex';
        const chickenRemaining = window.App.global.chickens_remaining || 0;
        diamondTimer.innerHTML = `🔓 Unlocks after ${chickenRemaining} more chickens sold`;
    } else {
        diamondLocked.style.display = 'none';
    }
}

/**
 * Update leaderboard UI
 */
function updateLeaderboardUI() {
    if (!window.App.leaderboard) return;
    
    const leaderboard = window.App.leaderboard;
    
    document.getElementById('leaderboardCowsSold').innerHTML = leaderboard.totalCowSales || 0;
    const progressPercent = ((leaderboard.totalCowSales || 0) / 1000) * 100;
    document.getElementById('leaderboardProgressFill').style.width = `${progressPercent}%`;
    document.getElementById('leaderboardRemaining').innerHTML = `Remaining: ${leaderboard.remainingCows || 0}`;
    
    const currentUser = leaderboard.currentUser || { rank: 0, points: 0, cowCount: 0, prize: 0, photoUrl: '' };
    document.getElementById('userRank').innerHTML = `#${currentUser.rank || 0}`;
    document.getElementById('userPoints').innerHTML = currentUser.points || 0;
    document.getElementById('userPrize').innerHTML = 
        `<img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 12px; height: 12px; object-fit: contain;"> ${currentUser.prize || 0}`;
    
    const winnersSection = document.getElementById('winnersSection');
    if (!leaderboard.isActive && leaderboard.prizesDistributed) {
        winnersSection.style.display = 'block';
        displayWinners(leaderboard.winners);
        document.getElementById('leaderboardEndMessage').innerHTML = 
            '<i class="fas fa-check-circle" style="color: var(--neon-green);"></i> Competition ended! Prizes distributed.';
    } else {
        winnersSection.style.display = 'none';
    }
    
    displayLeaderboardList(leaderboard.leaderboard);
    
    if (currentUser && currentUser.photoUrl) {
        const userAvatar = document.getElementById('profileAvatar');
        if (userAvatar) {
            userAvatar.innerHTML = `<img src="${currentUser.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
        }
    }
}

/**
 * Display leaderboard list
 * @param {Array} leaderboardList - List of leaderboard entries
 */
function displayLeaderboardList(leaderboardList) {
    const container = document.getElementById('leaderboardList');
    
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
        if (rank === 1) rankClass = 'gold';
        else if (rank === 2) rankClass = 'silver';
        else if (rank === 3) rankClass = 'bronze';
        
        html += `
            <div class="leaderboard-card ${rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : ''}">
                <div class="card-content" style="display: flex; align-items: center; gap: 10px;">
                    <div class="rank-badge ${rankClass}">${rank}</div>
                    <div class="user-info" style="flex: 1;">
                        <div class="user-name-row" style="display: flex; align-items: center; gap: 4px;">
                            <span class="user-name" style="font-size: 13px; font-weight: 600;">${name}</span>
                            ${rank <= 3 ? '<span class="user-crown"><i class="fas fa-crown"></i></span>' : ''}
                        </div>
                    </div>
                    <div class="points-section" style="display: flex; align-items: center; gap: 8px;">
                        <div class="points-box" style="background: rgba(255,215,0,0.1); border-radius: 20px; padding: 4px 8px; font-size: 14px;">
                            <i class="fas fa-cow"></i> ${points}
                        </div>
                        ${prize > 0 ? `
                            <div class="prize-pill" style="background: rgba(255,215,0,0.2); border-radius: 20px; padding: 4px 8px; font-size: 14px; display: flex; align-items: center; gap: 2px;">
                                <img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 14px; height: 14px;">${prize}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Display winners
 * @param {object} winners - Winners object
 */
function displayWinners(winners) {
    const container = document.getElementById('winnersList');
    
    if (!winners || Object.keys(winners).length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 10px;">No winners recorded</div>';
        return;
    }
    
    let html = '';
    const sortedWinners = Object.values(winners).sort((a, b) => a.rank - b.rank);
    
    sortedWinners.forEach(winner => {
        const name = winner.firstName || winner.username || `Farmer #${winner.userId?.substring(0, 6)}`;
        html += `
            <div class="winner-item">
                <span class="winner-rank">#${winner.rank}</span>
                <span class="winner-name">${name}</span>
                <span class="winner-prize">${winner.prize} TON</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Update referral UI
 */
function updateReferralUI() {
    if (!window.App.referral) return;
    
    document.getElementById('totalReferrals').innerHTML = window.App.referral.totalReferrals || 0;
    window.App.referralsPage = 1;
    window.App.earningsPage = 1;
    
    displayReferrals(1);
    displayEarnings(1);
}

/**
 * Display referrals
 * @param {number} page - Page number
 * @param {boolean} append - Whether to append
 */
function displayReferrals(page = 1, append = false) {
    const recentList = document.getElementById('recentReferralsList');
    const loadMoreBtn = document.getElementById('loadMoreReferralsBtn');
    
    if (window.App.referral.recentReferrals && window.App.referral.recentReferrals.length > 0) {
        const itemsPerPage = 10;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedReferrals = window.App.referral.recentReferrals.slice(startIndex, endIndex);
        
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
            
            html += `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="width: 36px; height: 36px; background: linear-gradient(145deg, var(--primary-pink), var(--crystal-blue)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; overflow: hidden; color: white; font-weight: 600;">
                        ${avatarHtml}
                    </div>
                    <div style="flex:1">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="font-weight: 600; font-size: 12px;">${name}</div>
                            <div style="font-weight: 700; color: var(--neon-green); font-size: 11px;">+${window.formatTON(ref.totalEarnedFromThisUser || 0)} TON</div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                            <div style="font-size: 9px; color: var(--text-muted);">${joinDate}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (append) {
            recentList.innerHTML += html;
        } else {
            recentList.innerHTML = html;
        }
        
        const hasMore = window.App.referral.recentReferrals.length > endIndex;
        window.App.hasMoreReferrals = hasMore;
        loadMoreBtn.style.display = hasMore ? 'block' : 'none';
    } else {
        recentList.innerHTML = '<div style="text-align: center; padding: 18px; color: var(--text-secondary);">' +
            (window.App.currentLanguage === 'ru' ? 'Нет рефералов' : 'No referrals yet') + '</div>';
        loadMoreBtn.style.display = 'none';
    }
}

/**
 * Display earnings
 * @param {number} page - Page number
 * @param {boolean} append - Whether to append
 */
function displayEarnings(page = 1, append = false) {
    const earningsList = document.getElementById('earningsHistoryList');
    const loadMoreBtn = document.getElementById('loadMoreEarningsBtn');
    
    if (window.App.referral.recentEarnings && window.App.referral.recentEarnings.length > 0) {
        const itemsPerPage = 10;
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedEarnings = window.App.referral.recentEarnings.slice(startIndex, endIndex);
        
        let html = '';
        paginatedEarnings.forEach(earning => {
            const date = new Date(earning.timestamp).toLocaleDateString('en-GB');
            const name = earning.firstName || earning.username || `User ${earning.userId?.substring(0, 6)}`;
            
            let typeDisplay = '';
            if (earning.type === 'cow_purchase') typeDisplay = '🐮 Корова';
            else if (earning.type === 'chicken_purchase') typeDisplay = '🐔 Курица';
            else if (earning.type === 'diamond_engine_purchase') typeDisplay = '💎 Кристальный двигатель';
            else typeDisplay = earning.type || 'покупка';
            
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div>
                        <div style="font-size: 11px; font-weight: 600;">${name}</div>
                        <div style="font-size: 9px; color: var(--text-muted);">${typeDisplay}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 11px; font-weight: 700; color: var(--neon-green);">+${window.formatTON(earning.amount)} TON</div>
                        <div style="font-size: 8px; color: var(--text-muted);">${date}</div>
                    </div>
                </div>
            `;
        });
        
        if (append) {
            earningsList.innerHTML += html;
        } else {
            earningsList.innerHTML = html;
        }
        
        const hasMore = window.App.referral.recentEarnings.length > endIndex;
        window.App.hasMoreEarnings = hasMore;
        loadMoreBtn.style.display = hasMore ? 'block' : 'none';
    } else {
        earningsList.innerHTML = '<div style="text-align: center; padding: 18px; color: var(--text-secondary);">' +
            (window.App.currentLanguage === 'ru' ? 'Нет доходов' : 'No earnings yet') + '</div>';
        loadMoreBtn.style.display = 'none';
    }
}

/**
 * Load more referrals
 */
function loadMoreReferrals() {
    window.App.referralsPage++;
    displayReferrals(window.App.referralsPage, true);
}

/**
 * Load more earnings
 */
function loadMoreEarnings() {
    window.App.earningsPage++;
    displayEarnings(window.App.earningsPage, true);
}

/**
 * Update tasks UI
 */
function updateTasksUI() {
    if (!window.App.tasks) return;
    
    const tasksGrid = document.getElementById('tasksGrid');
    const currentTab = window.App.currentTaskTab;
    const tasks = window.App.tasks[currentTab] || [];
    
    if (tasks.length === 0) {
        tasksGrid.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);"><i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i><p data-i18n="tasks.noTasks">No tasks available</p></div>';
        return;
    }
    
    let html = '';
    tasks.forEach(task => {
        const isCompleted = task.completedBy && task.completedBy.includes(window.App.userId);
        const taskIcon = task.type === 'channel' ? '📢' : '🤖';
        const taskTypeText = task.type === 'channel' ? 
            (window.App.currentLanguage === 'ru' ? 'Канал' : 'Channel') : 
            (window.App.currentLanguage === 'ru' ? 'Бот' : 'Bot');
        const taskClass = task.id.startsWith('partner_') ? 'partner-task' : '';
        const hasJoined = sessionStorage.getItem(`task_${task.id}_joined`) === 'true';
        
        html += `
            <div class="task-card ${taskClass}" style="padding: 10px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <div style="width: 24px; height: 24px; background: rgba(255,92,168,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">${taskIcon}</div>
                    <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${task.name || taskTypeText}</div>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 14px; height: 14px; object-fit: contain;">
                        <span style="font-size: 11px; font-weight: 600; color: var(--neon-green);">${window.formatTON(task.reward || window.CONFIG.TASK_REWARD)}</span>
                    </div>
                    ${isCompleted ? 
                        `<span style="font-size: 10px; color: var(--text-muted);"><i class="fas fa-check-circle" style="color: var(--neon-green);"></i> ${window.App.currentLanguage === 'ru' ? 'Выполнено' : 'Done'}</span>` : 
                        `<button class="task-btn" id="taskBtn_${task.id}" style="padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 600; background: ${hasJoined ? 'linear-gradient(145deg, var(--neon-green), #00b35e)' : 'linear-gradient(145deg, var(--crystal-blue), #0099cc)'}; color: white; border: none; cursor: pointer;" onclick="window.handleTaskButton('${task.id}','${task.link}','${task.type}',${hasJoined})">
                            ${hasJoined ? (window.App.currentLanguage === 'ru' ? 'Проверить' : 'Verify') : (window.App.currentLanguage === 'ru' ? 'Присоединиться' : 'Join')}
                        </button>`
                    }
                </div>
            </div>
        `;
    });
    
    tasksGrid.innerHTML = html;
}

/**
 * Handle task button click
 * @param {string} taskId - Task ID
 * @param {string} link - Task link
 * @param {string} taskType - Task type
 * @param {boolean} hasJoined - Whether user has joined
 */
function handleTaskButton(taskId, link, taskType, hasJoined) {
    if (!hasJoined) {
        sessionStorage.setItem(`task_${taskId}_joined`, 'true');
        window.open(link, '_blank');
        
        setTimeout(() => {
            const btn = document.getElementById(`taskBtn_${taskId}`);
            if (btn) {
                btn.innerHTML = window.App.currentLanguage === 'ru' ? 'Проверить' : 'Verify';
                btn.style.background = 'linear-gradient(145deg, var(--neon-green), #00b35e)';
                btn.setAttribute('onclick', `window.verifyTask('${taskId}','${taskType}')`);
            }
        }, 2000);
    } else {
        window.verifyTask(taskId, taskType);
    }
}

/**
 * Verify task
 * @param {string} taskId - Task ID
 * @param {string} taskType - Task type
 */
async function verifyTask(taskId, taskType) {
    try {
        const task = window.App.tasks[window.App.currentTaskTab].find(t => t.id === taskId);
        if (!task) {
            window.showNotification('Task not found', 'error');
            return;
        }
        
        const modal = document.getElementById('taskVerifyModal');
        
        document.getElementById('verifyEmoji').innerHTML = task.type === 'channel' ? '📢' : '🤖';
        document.getElementById('verifyTitle').innerHTML = task.type === 'channel' ? 
            (window.App.currentLanguage === 'ru' ? 'Присоединиться к каналу' : 'Join Channel') : 
            (window.App.currentLanguage === 'ru' ? 'Запустить бота' : 'Start Bot');
        document.getElementById('verifyLink').innerHTML = task.link;
        document.getElementById('verifyReward').innerHTML = window.formatTON(task.reward || window.CONFIG.TASK_REWARD) + ' TON';
        document.getElementById('verifyJoinLink').href = task.link;
        
        const statusDiv = document.getElementById('verifyStatus');
        statusDiv.style.display = 'none';
        statusDiv.innerHTML = '';
        
        document.getElementById('verifyCheckBtn').onclick = async function() {
            await performTaskVerification(task);
        };
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Task verification error:', error);
        window.showNotification('Verification failed', 'error');
    }
}

/**
 * Perform task verification
 * @param {object} task - Task object
 */
async function performTaskVerification(task) {
    const buttonId = 'verifyCheckBtn';
    const button = document.getElementById('verifyCheckBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        const statusDiv = document.getElementById('verifyStatus');
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<div style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> ' + 
            (window.App.currentLanguage === 'ru' ? 'Проверка...' : 'Verifying...') + '</div>';
        
        const result = await window.callAPI('verifyTask', { taskId: task.id, taskType: task.type });
        
        if (result) {
            statusDiv.innerHTML = '<div style="color: var(--neon-green); text-align: center;">✅ ' + 
                (window.App.currentLanguage === 'ru' ? 'Задание выполнено! Награда добавлена.' : 'Task completed! Reward added.') + '</div>';
            
            window.showNotification(
                window.App.currentLanguage === 'ru' ? 
                    `✅ Задание выполнено! +${window.formatTON(task.reward || window.CONFIG.TASK_REWARD)} TON` : 
                    `✅ Task completed! +${window.formatTON(task.reward || window.CONFIG.TASK_REWARD)} TON`,
                'success'
            );
            
            sessionStorage.removeItem(`task_${task.id}_joined`);
            
            setTimeout(() => {
                closeAllModals();
                loadGameState();
            }, 2000);
        }
    } catch (error) {
        console.error('Task verification error:', error);
        
        const statusDiv = document.getElementById('verifyStatus');
        statusDiv.style.display = 'block';
        
        let errorMessage = error.message || '';
        
        if (errorMessage.includes('Not a member') || errorMessage.includes('NOT_MEMBER')) {
            statusDiv.innerHTML = '<div style="color: var(--danger-red); text-align: center;">❌ ' + 
                (window.App.currentLanguage === 'ru' ? 'Не участник канала' : 'Not a member of the channel') + '</div>';
            sessionStorage.removeItem(`task_${task.id}_joined`);
        } else if (errorMessage.includes('already completed') || errorMessage.includes('TASK_ALREADY_COMPLETED')) {
            statusDiv.innerHTML = '<div style="color: var(--warning); text-align: center;">⚠️ ' + 
                (window.App.currentLanguage === 'ru' ? 'Задание уже выполнено' : 'Task already completed') + '</div>';
        } else {
            statusDiv.innerHTML = '<div style="color: var(--danger-red); text-align: center;">❌ ' + 
                (errorMessage || (window.App.currentLanguage === 'ru' ? 'Ошибка проверки' : 'Verification error')) + '</div>';
        }
    }
}

/**
 * Close all modals
 */
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
    window.App.pendingOrder = null;
    window.App.pendingTask = null;
}

// ===== SETUP FUNCTIONS =====

/**
 * Setup intervals
 */
function setupIntervals() {
    if (window.App.timerInterval) clearInterval(window.App.timerInterval);
    
    window.App.timerInterval = setInterval(() => {
        if (window.App.user && window.App.user.secondsUntilNext > 0) {
            window.App.user.secondsUntilNext--;
            updateProductionTimer();
        } else {
            loadGameState();
        }
    }, 1000);
    
    if (window.App.marketInterval) clearInterval(window.App.marketInterval);
    
    window.App.marketInterval = setInterval(() => {
        if (window.App.currentMarketResource) {
            updateMarketUI(1, true);
        }
    }, window.CONFIG.MARKET_REFRESH);
    
    setInterval(() => {
        loadGameState();
    }, 30000);
}

/**
 * Update market UI
 * @param {number} page - Page number
 * @param {boolean} reset - Whether to reset
 */
async function updateMarketUI(page = 1, reset = true) {
    if (!window.App.currentMarketResource) return;
    
    try {
        const sellOrders = await window.callAPI('getMarketOrders', {
            resource: window.App.currentMarketResource,
            type: 'sell',
            page: page,
            limit: 10
        });
        
        let totalOrders = sellOrders.orders?.length || 0;
        let milkQty = 0, eggsQty = 0;
        
        if (window.App.currentMarketResource === 'milk') {
            milkQty = sellOrders.orders?.reduce((sum, o) => sum + o.remaining, 0) || 0;
        } else {
            eggsQty = sellOrders.orders?.reduce((sum, o) => sum + o.remaining, 0) || 0;
        }
        
        document.getElementById('marketTotalOrders').innerHTML = totalOrders;
        document.getElementById('marketMilkQty').innerHTML = window.formatNumber(milkQty);
        document.getElementById('marketEggsQty').innerHTML = window.formatNumber(eggsQty);
        
        const bestSell = window.App.market?.[window.App.currentMarketResource]?.bestSellPrice || 0.0001;
        document.getElementById('marketBestPrice').innerHTML = window.formatFullPrecision(bestSell);
        
        const sellGrid = document.getElementById('sellOrdersGrid');
        const loadMoreBtn = document.getElementById('loadMoreSellBtn');
        
        if (sellOrders.orders && sellOrders.orders.length > 0) {
            let html = '';
            
            if (reset) {
                sellGrid.innerHTML = '';
                window.App.currentMarketPage = 1;
                window.App.hasMoreOrders = sellOrders.hasMore;
            }
            
            sellOrders.orders.forEach(order => {
                const pricePerUnit = order.pricePerUnit;
                const total = order.remaining * pricePerUnit;
                const resourceEmoji = window.App.currentMarketResource === 'milk' ? '🥛' : '🥚';
                const resourceName = window.App.currentMarketResource === 'milk' ? 'MILK' : 'EGG';
                
                html += `
                    <div class="market-card" onclick="showPurchaseConfirm('${order.id}','${order.resource}',${order.remaining},${pricePerUnit})">
                        <div class="card-inner">
                            <div class="card-title ${order.type}">${resourceName}</div>
                            <div class="amount-box">
                                <span class="egg-icon">${resourceEmoji}</span>
                                <span>${window.formatNumber(order.remaining)}</span>
                            </div>
                            <div class="price-label">PRICE</div>
                            <div class="price-box">
                                <img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; filter: drop-shadow(0 0 2px rgba(255,255,255,0.5));">
                                <span>${window.formatFullPrecision(total)}</span>
                            </div>
                            <div class="unit-price">${window.formatFullPrecision(pricePerUnit)} TON/${resourceName.toLowerCase()}</div>
                            <button class="buy-btn">${window.App.currentLanguage === 'ru' ? 'Купить' : 'Buy'}</button>
                        </div>
                    </div>
                `;
            });
            
            if (reset) {
                sellGrid.innerHTML = html;
            } else {
                sellGrid.innerHTML += html;
            }
            
            loadMoreBtn.style.display = sellOrders.hasMore ? 'block' : 'none';
        } else {
            sellGrid.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 25px; color: var(--text-secondary);"><i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;"></i><p>' + 
                (window.App.currentLanguage === 'ru' ? 'Нет активных заказов на продажу' : 'No active sell orders') + '</p></div>';
            loadMoreBtn.style.display = 'none';
        }
        
        loadMyOrders();
    } catch (error) {
        console.error('Market UI update error:', error);
    }
}

/**
 * Load my orders
 */
async function loadMyOrders() {
    try {
        const orders = await window.callAPI('getMyOrders');
        
        const activeContainer = document.getElementById('myActiveOrders');
        
        if (orders.active && orders.active.length > 0) {
            let html = '';
            
            orders.active.forEach(order => {
                const resourceEmoji = order.resource === 'milk' ? '🥛' : '🥚';
                const pricePerUnit = order.pricePerUnit;
                const total = order.remaining * pricePerUnit;
                
                html += `
                    <div class="market-card">
                        <div class="card-inner">
                            <div class="card-title ${order.type}">${order.resource === 'milk' ? 'MILK' : 'EGG'}</div>
                            <div class="amount-box">
                                <span class="egg-icon">${resourceEmoji}</span>
                                <span>${window.formatNumber(order.remaining)}/${window.formatNumber(order.quantity)}</span>
                            </div>
                            <div class="price-label">PRICE</div>
                            <div class="price-box">
                                <img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; filter: drop-shadow(0 0 2px rgba(255,255,255,0.5));">
                                <span>${window.formatFullPrecision(total)}</span>
                            </div>
                            <div class="unit-price">${window.formatFullPrecision(pricePerUnit)} TON/${order.resource === 'milk' ? 'milk' : 'egg'}</div>
                            ${order.penaltyPaid ? '<div style="font-size: 8px; color: var(--warning); margin: 4px 0;">Штраф: ' + order.penaltyAmount + ' TON</div>' : ''}
                            <button class="btn btn-secondary" style="padding: 8px; font-size: 12px; margin-top: 8px;" onclick="window.cancelOrder('${order.id}')">
                                ${window.App.currentLanguage === 'ru' ? 'Отменить' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                `;
            });
            
            activeContainer.innerHTML = html;
        } else {
            activeContainer.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 25px; color: var(--text-secondary);"><p>' + 
                (window.App.currentLanguage === 'ru' ? 'Нет активных заказов' : 'No active orders') + '</p></div>';
        }
        
        const filledContainer = document.getElementById('myFilledOrders');
        
        if (orders.filled && orders.filled.length > 0) {
            let html = '';
            
            orders.filled.slice(0, 5).forEach(order => {
                const date = new Date(order.createdAt).toLocaleDateString('en-GB');
                
                html += `
                    <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div>
                            <span style="font-weight: 600; font-size: 11px;">
                                ${order.type === 'sell' ? 
                                    (window.App.currentLanguage === 'ru' ? 'Продажа' : 'Sell') : 
                                    (window.App.currentLanguage === 'ru' ? 'Покупка' : 'Buy')} 
                                ${order.resource === 'milk' ? 
                                    (window.App.currentLanguage === 'ru' ? 'Молоко' : 'Milk') : 
                                    (window.App.currentLanguage === 'ru' ? 'Яйца' : 'Eggs')}
                            </span>
                            <span style="font-size: 9px; color: var(--text-muted); margin-left: 4px;">${date}</span>
                        </div>
                        <div>
                            <span style="color: var(--neon-green); font-size: 11px;">${window.formatNumber(order.quantity)}</span>
                            <span style="margin-left: 4px; font-size: 10px;">@ ${window.formatFullPrecision(order.pricePerUnit)}</span>
                        </div>
                    </div>
                `;
            });
            
            filledContainer.innerHTML = html;
        } else {
            filledContainer.innerHTML = '<div style="text-align: center; padding: 18px; color: var(--text-secondary);">' + 
                (window.App.currentLanguage === 'ru' ? 'Нет истории заказов' : 'No order history') + '</div>';
        }
    } catch (error) {
        console.error('Load my orders error:', error);
    }
}

/**
 * Show purchase confirmation
 * @param {string} orderId - Order ID
 * @param {string} resource - Resource type
 * @param {number} maxQuantity - Max quantity
 * @param {number} pricePerUnit - Price per unit
 */
function showPurchaseConfirm(orderId, resource, maxQuantity, pricePerUnit) {
    window.App.pendingOrder = {
        id: orderId,
        resource: resource,
        maxQuantity: maxQuantity,
        pricePerUnit: pricePerUnit,
        type: 'buy'
    };
    
    const modal = document.getElementById('confirmPurchaseModal');
    const confirmDetails = document.getElementById('confirmDetails');
    const confirmEmoji = document.getElementById('confirmEmoji');
    const confirmResource = document.getElementById('confirmResource');
    
    confirmEmoji.innerHTML = resource === 'milk' ? '🥛' : '🥚';
    confirmResource.innerHTML = resource === 'milk' ? 
        (window.App.currentLanguage === 'ru' ? 'Пакет молока' : 'Milk Package') : 
        (window.App.currentLanguage === 'ru' ? 'Пакет яиц' : 'Eggs Package');
    
    const total = maxQuantity * pricePerUnit;
    
    confirmDetails.innerHTML = `
        <div class="confirm-row">
            <span class="confirm-label">${window.App.currentLanguage === 'ru' ? 'Количество:' : 'Quantity:'}</span>
            <span class="confirm-value">${window.formatNumber(maxQuantity)}</span>
        </div>
        <div class="confirm-row">
            <span class="confirm-label">${window.App.currentLanguage === 'ru' ? 'Цена за ед:' : 'Price per unit:'}</span>
            <span class="confirm-value">${window.formatFullPrecision(pricePerUnit)} TON</span>
        </div>
        <div class="confirm-row">
            <span class="confirm-label">${window.App.currentLanguage === 'ru' ? 'Итого:' : 'Total:'}</span>
            <span class="confirm-total">
                <img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 14px; height: 14px; object-fit: contain;"> ${window.formatFullPrecision(total)}
            </span>
        </div>
    `;
    
    document.getElementById('confirmExecuteBtn').onclick = function() {
        executeOrder(orderId, maxQuantity);
    };
    
    modal.classList.add('active');
}

/**
 * Execute order
 * @param {string} orderId - Order ID
 * @param {number} quantity - Quantity
 */
async function executeOrder(orderId, quantity) {
    const buttonId = 'confirmExecuteBtn';
    const button = document.getElementById('confirmExecuteBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        const result = await window.callAPI('executeOrder', { orderId: orderId, quantity: quantity });
        
        const resourceEmoji = result.resource === 'milk' ? '🥛' : '🥚';
        const resourceName = result.resource === 'milk' ? 'MILK' : 'EGG';
        const message = `🎉 Order filled! ${quantity} ${resourceEmoji} ${resourceName} for ${window.formatFullPrecision(result.totalCost)} TON`;
        
        window.showNotification(message, 'success');
        loadGameState();
        closeAllModals();
    } catch (error) {
        console.error('Execute order error:', error);
    }
}

/**
 * Cancel order
 * @param {string} orderId - Order ID
 */
async function cancelOrder(orderId) {
    const buttonId = 'cancelOrder_' + orderId;
    const button = event?.target;
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    if (!confirm(window.App.currentLanguage === 'ru' ? 'Отменить этот заказ?' : 'Cancel this order?')) return;
    
    try {
        await window.callAPI('cancelOrder', { orderId });
        window.showNotification(window.App.currentLanguage === 'ru' ? '✅ Заказ отменен' : '✅ Order cancelled', 'success');
        loadGameState();
    } catch (error) {
        console.error('Cancel order error:', error);
    }
}

/**
 * Update sell details
 */
function updateSellDetails() {
    const quantity = parseInt(document.getElementById('sellQuantity').value) || 0;
    const totalPrice = parseFloat(document.getElementById('sellTotalPrice').value) || 0;
    
    if (quantity > 0 && totalPrice > 0) {
        const perUnit = totalPrice / quantity;
        document.getElementById('sellPerUnitHint').innerHTML = `≈ ${window.formatFullPrecision(perUnit)} TON per unit`;
        
        const penaltyWarning = document.getElementById('sellPenaltyWarning');
        
        if (perUnit < window.CONFIG.MIN_ORDER_PRICE) {
            penaltyWarning.style.display = 'block';
            penaltyWarning.innerHTML = `⚠️ Price below ${window.CONFIG.MIN_ORDER_PRICE} TON will incur ${window.CONFIG.ORDER_PENALTY_FEE} TON penalty fee (non-refundable)`;
        } else {
            penaltyWarning.style.display = 'none';
        }
    } else {
        document.getElementById('sellPerUnitHint').innerHTML = `≈ 0 TON per unit`;
        document.getElementById('sellPenaltyWarning').style.display = 'none';
    }
    
    const fee = totalPrice * 0.1;
    const sellerGets = totalPrice - fee;
    
    document.getElementById('sellTotalTon').innerHTML = 
        `Total: ${window.formatFullPrecision(totalPrice)} TON (You get: ${window.formatFullPrecision(sellerGets)} TON after 10% fee)`;
    document.getElementById('sellFeeDisplay').innerHTML = 
        `⚠️ 10% market fee (${window.formatFullPrecision(fee)} TON) will be deducted when sold`;
    
    const resource = document.querySelector('input[name="sellResource"]:checked')?.value || 'milk';
    const balance = resource === 'milk' ? window.App.user?.milk : window.App.user?.eggs;
    
    document.getElementById('sellBalanceHint').innerHTML = 
        `Available: ${window.formatNumber(balance || 0)} ${resource === 'milk' ? 'Milk' : 'Eggs'}`;
}

/**
 * Create sell order
 */
async function createSellOrder() {
    const buttonId = 'submitSellOrderBtn';
    const button = document.getElementById('submitSellOrderBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    const resource = document.querySelector('input[name="sellResource"]:checked')?.value;
    const quantity = parseInt(document.getElementById('sellQuantity').value);
    const totalPrice = parseFloat(document.getElementById('sellTotalPrice').value);
    
    if (!resource || !quantity || !totalPrice) {
        alert(window.App.currentLanguage === 'ru' ? 'Заполните все поля' : 'Fill all fields');
        return;
    }
    
    if (quantity < 100) {
        alert(window.App.currentLanguage === 'ru' ? 'Минимум 100 единиц' : 'Minimum 100 units');
        return;
    }
    
    if (totalPrice <= 0) {
        alert(window.App.currentLanguage === 'ru' ? 'Общая цена должна быть > 0' : 'Total price must be > 0');
        return;
    }
    
    const pricePerUnit = totalPrice / quantity;
    
    if (pricePerUnit < window.CONFIG.MIN_ORDER_PRICE) {
        if ((window.App.user?.tonBalance || 0) < window.CONFIG.ORDER_PENALTY_FEE) {
            alert(window.App.currentLanguage === 'ru' ? 
                `Недостаточно средств для штрафа. Нужно ${window.CONFIG.ORDER_PENALTY_FEE} TON.` : 
                `Insufficient balance for penalty fee. Need ${window.CONFIG.ORDER_PENALTY_FEE} TON.`);
            return;
        }
    }
    
    try {
        const result = await window.callAPI('createSellOrder', {
            resource: resource,
            quantity: quantity,
            pricePerUnit: pricePerUnit
        });
        
        let message = window.App.currentLanguage === 'ru' ? '✅ Ордер на продажу создан' : '✅ Sell order created';
        if (result.penaltyFee) {
            message += `. Штраф: ${result.penaltyFee} TON.`;
        }
        
        window.showNotification(message, 'success');
        closeAllModals();
        loadGameState();
    } catch (error) {
        console.error('Create sell order error:', error);
    }
}

/**
 * Buy cow
 */
async function buyCow() {
    const buttonId = 'buyCowBtn';
    const button = document.getElementById('buyCowBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    openBuyCowsPopup();
}

/**
 * Buy chicken
 */
async function buyChicken() {
    const buttonId = 'buyChickenBtn';
    const button = document.getElementById('buyChickenBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        await window.callAPI('buyChicken');
        await loadGameState();
        window.animateTonBalance();
        window.showNotification(
            window.App.currentLanguage === 'ru' ? '✅ Курица куплена!' : '✅ Chicken machine purchased!',
            'success'
        );
    } catch (error) {
        console.error('Buy chicken error:', error);
    }
}

/**
 * Buy diamond engine
 */
async function buyDiamondEngine() {
    const buttonId = 'buyDiamondBtn';
    const button = document.getElementById('buyDiamondBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        await window.callAPI('buyDiamondEngine');
        await loadGameState();
        window.animateTonBalance();
        window.showNotification(
            window.App.currentLanguage === 'ru' ? '✅ Кристальный двигатель куплен!' : '✅ Crystal Engine purchased!',
            'success'
        );
    } catch (error) {
        console.error('Buy crystal engine error:', error);
    }
}

/**
 * Start diamond production
 */
async function startDiamondProduction() {
    const buttonId = 'startDiamondBtn';
    const button = document.getElementById('startDiamondBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        await window.callAPI('startDiamondProduction');
        await loadGameState();
        window.showNotification(
            window.App.currentLanguage === 'ru' ? '💎 Кристалл создан!' : '💎 Crystal produced!',
            'success'
        );
    } catch (error) {
        console.error('Crystal production error:', error);
    }
}

/**
 * Hatch cow
 */
async function hatchCow() {
    const buttonId = 'hatchCowConfirm';
    const button = document.getElementById('hatchCowConfirm');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    const amount = parseInt(document.getElementById('hatchCowAmount').value) || 1;
    
    try {
        await window.callAPI('hatchCow', { amount });
        await loadGameState();
        window.showNotification(
            window.App.currentLanguage === 'ru' ? `🐮 Выведено ${amount} коров(а)!` : `🐮 Hatched ${amount} Cow(s)!`,
            'success'
        );
        closeAllModals();
    } catch (error) {
        console.error('Hatch cow error:', error);
    }
}

/**
 * Hatch chicken
 */
async function hatchChicken() {
    const buttonId = 'hatchChickenConfirm';
    const button = document.getElementById('hatchChickenConfirm');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    const amount = parseInt(document.getElementById('hatchChickenAmount').value) || 1;
    
    try {
        await window.callAPI('hatchChicken', { amount });
        await loadGameState();
        window.showNotification(
            window.App.currentLanguage === 'ru' ? `🐔 Выведено ${amount} куриц(а)!` : `🐔 Hatched ${amount} Chicken(s)!`,
            'success'
        );
        closeAllModals();
    } catch (error) {
        console.error('Hatch chicken error:', error);
    }
}

/**
 * Convert diamond
 */
async function convertDiamond() {
    const buttonId = 'convertDiamondBtn';
    const button = document.getElementById('convertDiamondBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    const amount = parseInt(document.getElementById('convertAmount').value);
    
    if (!amount || amount <= 0) {
        alert(window.App.currentLanguage === 'ru' ? 'Введите корректную сумму' : 'Enter valid amount');
        return;
    }
    
    if (amount > window.App.user.diamond) {
        alert(window.App.currentLanguage === 'ru' ? 'Недостаточно кристаллов' : 'Insufficient crystals');
        return;
    }
    
    try {
        const result = await window.callAPI('convertDiamond', { amount });
        await loadGameState();
        document.getElementById('convertAmount').value = '';
        window.animateTonBalance();
        window.showNotification(
            window.App.currentLanguage === 'ru' ? 
                `✅ Конвертировано ${amount} 💎 в ${result.tonReceived} TON` : 
                `✅ Converted ${amount} 💎 to ${result.tonReceived} TON`,
            'success'
        );
    } catch (error) {
        console.error('Convert crystal error:', error);
    }
}

/**
 * Withdraw TON
 */
async function withdraw() {
    const buttonId = 'withdrawBtn';
    const button = document.getElementById('withdrawBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const address = document.getElementById('withdrawAddress').value.trim();
    
    if (!amount || amount < 0.1) {
        alert(window.App.currentLanguage === 'ru' ? 'Минимальный вывод: 0.1 TON' : 'Minimum withdrawal: 0.1 TON');
        return;
    }
    
    if (!address || address.length < 10) {
        alert(window.App.currentLanguage === 'ru' ? 'Введите корректный TON адрес' : 'Enter valid TON address');
        return;
    }
    
    if (amount > window.App.user.tonBalance) {
        alert(window.App.currentLanguage === 'ru' ? 'Недостаточно средств' : 'Insufficient balance');
        return;
    }
    
    try {
        const result = await window.callAPI('withdraw', { amount, address });
        await loadGameState();
        document.getElementById('withdrawAmount').value = '';
        document.getElementById('withdrawAddress').value = '';
        
        const message = window.App.currentLanguage === 'ru' ? 
            `✅ Запрос на вывод: ${result.netAmount} TON` : 
            `✅ Withdrawal requested: ${result.netAmount} TON`;
        
        window.showNotification(message, 'success');
        closeAllModals();
    } catch (error) {
        console.error('Withdraw error:', error);
    }
}

/**
 * Claim referral earnings
 */
async function claimReferral() {
    const buttonId = 'claimReferralBtn';
    const button = document.getElementById('claimReferralBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        const result = await window.callAPI('claimReferralEarnings');
        await loadGameState();
        window.animateTonBalance();
        
        const message = window.App.currentLanguage === 'ru' ? 
            `✅ Забрано ${result.claimedAmount} TON!` : 
            `✅ Claimed ${result.claimedAmount} TON!`;
        
        window.showNotification(message, 'success');
    } catch (error) {
        console.error('Claim referral error:', error);
    }
}

/**
 * Copy referral link
 */
function copyReferralLink() {
    const input = document.getElementById('referralLink');
    input.select();
    navigator.clipboard.writeText(input.value);
    window.showNotification(
        window.App.currentLanguage === 'ru' ? '✅ Ссылка скопирована!' : '✅ Link copied!',
        'success'
    );
}

/**
 * Open sell order modal
 */
function openSellOrderModal() {
    document.getElementById('sellOrderModal').classList.add('active');
    updateSellDetails();
}

/**
 * Open hatch modal
 */
function openHatchModal() {
    document.getElementById('hatchModal').classList.add('active');
}

/**
 * Open add task modal
 */
function openAddTaskModal() {
    document.getElementById('addTaskModal').classList.add('active');
    calculateTaskPrice();
}

/**
 * Open deposit modal
 */
function openDepositModal() {
    document.getElementById('depositModal').classList.add('active');
}

/**
 * Calculate task price
 */
function calculateTaskPrice() {
    const target = parseInt(document.getElementById('taskTarget').value) || 100;
    const reward = window.CONFIG.TASK_REWARD;
    const totalCost = target * reward * 2;
    
    document.getElementById('taskTotalCost').innerHTML = `Total Cost: ${window.formatTON(totalCost)} TON`;
    
    const userBalance = window.App.user?.tonBalance || 0;
    const submitBtn = document.getElementById('submitTaskBtn');
    
    if (userBalance < totalCost) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        document.getElementById('taskTotalCost').style.color = 'var(--danger-red)';
    } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        document.getElementById('taskTotalCost').style.color = 'var(--crystal-blue)';
    }
}

/**
 * Create task
 */
async function createTask() {
    const buttonId = 'submitTaskBtn';
    const button = document.getElementById('submitTaskBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    const taskType = document.querySelector('input[name="taskType"]:checked')?.value;
    const link = document.getElementById('taskLink').value.trim();
    const target = parseInt(document.getElementById('taskTarget').value);
    
    if (!taskType || !link || !target || target < 100) {
        alert(window.App.currentLanguage === 'ru' ? 
            'Заполните все поля корректно (минимум 100 пользователей)' : 
            'Fill all fields correctly (minimum 100 users)');
        return;
    }
    
    const totalCost = target * window.CONFIG.TASK_REWARD * 2;
    
    if (totalCost > (window.App.user?.tonBalance || 0)) {
        alert(window.App.currentLanguage === 'ru' ? 'Недостаточно средств' : 'Insufficient balance');
        return;
    }
    
    try {
        const result = await window.callAPI('createTask', {
            type: taskType,
            link: link,
            targetUsers: target,
            reward: window.CONFIG.TASK_REWARD
        });
        
        window.showNotification(
            window.App.currentLanguage === 'ru' ? 
                `✅ Задание создано! Стоимость: ${window.formatTON(totalCost)} TON` : 
                `✅ Task created! Cost: ${window.formatTON(totalCost)} TON`,
            'success'
        );
        
        closeAllModals();
        loadGameState();
    } catch (error) {
        console.error('Create task error:', error);
        window.showNotification(error.message, 'error');
    }
}

/**
 * Initiate deposit
 */
async function initiateDeposit() {
    if (!window.App.wallet) {
        alert(window.App.currentLanguage === 'ru' ? 'Сначала подключите кошелек' : 'Connect wallet first');
        return;
    }
    
    const amount = parseFloat(document.getElementById('depositAmountInput').value);
    
    if (!amount || amount < 0.1) {
        alert(window.App.currentLanguage === 'ru' ? 'Минимальный депозит: 0.1 TON' : 'Minimum deposit: 0.1 TON');
        return;
    }
    
    try {
        const comment = String(window.App.userId);
        const amountInNano = String(Math.floor(amount * 1e9));
        
        if (!window.TonWeb) {
            throw new Error('TonWeb library not loaded');
        }
        
        const TonWeb = window.TonWeb;
        const tonweb = new TonWeb();
        const cell = new TonWeb.boc.Cell();
        
        cell.bits.writeUint(0, 32);
        cell.bits.writeString(comment);
        
        const boc = await cell.toBoc(false);
        const payloadBase64 = TonWeb.utils.bytesToBase64(boc);
        
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [{
                address: window.CONFIG.DEPOSIT_WALLET,
                amount: amountInNano,
                payload: payloadBase64
            }]
        };
        
        const result = await window.App.tonConnectUI.sendTransaction(transaction);
        
        window.showNotification(
            window.App.currentLanguage === 'ru' ? 
                '✅ Транзакция отправлена! Подождите около 1 минуты для зачисления' : 
                '✅ Transaction sent! Wait about 1 minute for balance to be added',
            'success'
        );
        
        await handleDepositSuccess(result, amount, comment);
    } catch (error) {
        console.error('Deposit error:', error);
        
        let errorMessage = window.App.currentLanguage === 'ru' ? 'Транзакция не удалась' : 'Transaction failed';
        
        if (error.message?.includes('rejected')) {
            errorMessage = window.App.currentLanguage === 'ru' ? 'Транзакция отклонена в кошельке' : 'Transaction rejected in wallet';
        } else if (error.message?.includes('insufficient')) {
            errorMessage = window.App.currentLanguage === 'ru' ? 'Недостаточно средств' : 'Insufficient balance';
        }
        
        const statusDiv = document.getElementById('depositStatus');
        statusDiv.classList.add('visible');
        statusDiv.querySelector('.status-icon').innerHTML = '❌';
        statusDiv.querySelector('.status-message').innerHTML = errorMessage;
        document.getElementById('depositStatusDetail').innerHTML = error.message || 
            (window.App.currentLanguage === 'ru' ? 'Пожалуйста, попробуйте снова' : 'Please try again');
    }
}

/**
 * Handle deposit success
 * @param {object} result - Transaction result
 * @param {number} amount - Deposit amount
 * @param {string} comment - Deposit comment
 */
async function handleDepositSuccess(result, amount, comment) {
    try {
        const depositResult = await window.callAPI('deposit', {
            amount: amount,
            txHash: result.boc,
            comment: comment
        });
        
        window.App.currentDepositId = depositResult.depositId;
        window.App.currentTxHash = result.boc;
        
        const statusDiv = document.getElementById('depositStatus');
        statusDiv.classList.add('visible');
        statusDiv.querySelector('.status-icon').innerHTML = '⏳';
        statusDiv.querySelector('.status-message').innerHTML = 
            window.App.currentLanguage === 'ru' ? 'Транзакция отправлена!' : 'Transaction sent!';
        document.getElementById('depositStatusDetail').innerHTML = 
            window.App.currentLanguage === 'ru' ? 'Ожидание подтверждения (≈1 мин)...' : 'Waiting for confirmation (≈1 min)...';
        
        startDepositVerification(depositResult.depositId, result.boc);
    } catch (error) {
        console.error('Deposit API error:', error);
        
        const statusDiv = document.getElementById('depositStatus');
        statusDiv.classList.add('visible');
        statusDiv.querySelector('.status-icon').innerHTML = '❌';
        statusDiv.querySelector('.status-message').innerHTML = 
            window.App.currentLanguage === 'ru' ? 'Не удалось обработать депозит' : 'Failed to process deposit';
        document.getElementById('depositStatusDetail').innerHTML = error.message;
    }
}

/**
 * Start deposit verification
 * @param {string} depositId - Deposit ID
 * @param {string} txHash - Transaction hash
 */
function startDepositVerification(depositId, txHash) {
    if (window.App.depositCheckInterval) {
        clearInterval(window.App.depositCheckInterval);
    }
    
    let attempts = 0;
    const maxAttempts = 18;
    
    window.App.depositCheckInterval = setInterval(async () => {
        attempts++;
        
        try {
            const result = await window.callAPI('verifyDeposit', { depositId: depositId, txHash: txHash });
            
            if (result.status === 'completed') {
                clearInterval(window.App.depositCheckInterval);
                
                const statusDiv = document.getElementById('depositStatus');
                statusDiv.querySelector('.status-icon').innerHTML = '✅';
                statusDiv.querySelector('.status-message').innerHTML = 
                    window.App.currentLanguage === 'ru' ? 'Депозит подтвержден!' : 'Deposit confirmed!';
                document.getElementById('depositStatusDetail').innerHTML = 
                    window.App.currentLanguage === 'ru' ? 
                        `${result.amount} TON добавлено на баланс` : 
                        `${result.amount} TON added to your balance`;
                
                window.showNotification(
                    window.App.currentLanguage === 'ru' ? 
                        `💰 Депозит подтвержден! ${result.amount} TON добавлено` : 
                        `💰 Deposit confirmed! ${result.amount} TON added`,
                    'success'
                );
                
                loadGameState();
                window.animateTonBalance();
                
                setTimeout(() => {
                    statusDiv.classList.remove('visible');
                    closeAllModals();
                }, 3000);
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(window.App.depositCheckInterval);
                
                const statusDiv = document.getElementById('depositStatus');
                statusDiv.querySelector('.status-icon').innerHTML = '⏳';
                statusDiv.querySelector('.status-message').innerHTML = 
                    window.App.currentLanguage === 'ru' ? 'Все еще проверяется...' : 'Still verifying...';
                document.getElementById('depositStatusDetail').innerHTML = 
                    window.App.currentLanguage === 'ru' ? 'Будет зачислено автоматически' : 'Will be credited automatically';
            }
        } catch (error) {
            console.error('Verification error:', error);
            
            if (attempts >= maxAttempts) {
                clearInterval(window.App.depositCheckInterval);
            }
        }
    }, 10000);
}

// ===== SETUP EVENT LISTENERS =====

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
            
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
    document.getElementById('leaderboardButton').addEventListener('click', function() {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById('sectionLeaderboard').classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        loadGameState();
    });
    
    // Ranch navigation
    document.getElementById('openRanchBtn').addEventListener('click', openRanchPage);
    document.getElementById('backFromRanchBtn').addEventListener('click', closeRanchPage);
    document.getElementById('buyCowsBtn').addEventListener('click', openBuyCowsPopup);
    
    // Cow card click
    document.getElementById('cowCard').addEventListener('click', openRanchPage);
    
    // Language switcher
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.dataset.lang;
            window.setLanguage(lang);
            if (window.App.tonConnectUI) {
                window.App.tonConnectUI.language = lang === 'ru' ? 'ru' : 'en';
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
            document.getElementById('marketBuyView').style.display = tabValue === 'buy' ? 'block' : 'none';
            document.getElementById('marketMyOrdersView').style.display = tabValue === 'orders' ? 'block' : 'none';
            
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
            window.App.currentTaskTab = this.dataset.taskTab;
            updateTasksUI();
        });
    });
    
    // Resource switch
    document.querySelectorAll('[data-resource]').forEach(res => {
        res.addEventListener('click', function() {
            document.querySelectorAll('[data-resource]').forEach(r => r.classList.remove('active'));
            this.classList.add('active');
            window.App.currentMarketResource = this.dataset.resource;
            window.App.currentMarketPage = 1;
            updateMarketUI(1, true);
        });
    });
    
    // Task type radio
    document.querySelectorAll('input[name="taskType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const note = document.getElementById('channelNote');
            note.style.display = this.value === 'channel' ? 'block' : 'none';
        });
    });
    
    // Refresh market button
    document.getElementById('refreshMarketBtn').addEventListener('click', function() {
        window.App.currentMarketPage = 1;
        updateMarketUI(1, true);
        this.querySelector('i').style.animation = 'spin-slow 0.5s infinite linear';
        setTimeout(() => {
            this.querySelector('i').style.animation = 'spin-slow 2s infinite linear';
        }, 500);
    });
    
    // Refresh tasks button
    document.getElementById('refreshTasksBtn').addEventListener('click', function() {
        loadGameState();
        this.querySelector('i').style.animation = 'spin-slow 0.5s infinite linear';
        setTimeout(() => {
            this.querySelector('i').style.animation = 'spin-slow 2s infinite linear';
        }, 500);
    });
    
    // Load more buttons
    document.getElementById('loadMoreSellBtn').addEventListener('click', function() {
        window.App.currentMarketPage++;
        updateMarketUI(window.App.currentMarketPage, false);
    });
    
    document.getElementById('loadMoreReferralsBtn').addEventListener('click', loadMoreReferrals);
    document.getElementById('loadMoreEarningsBtn').addEventListener('click', loadMoreEarnings);
    
    // Machine buttons
    document.getElementById('buyCowBtn').addEventListener('click', buyCow);
    document.getElementById('buyChickenBtn').addEventListener('click', buyChicken);
    document.getElementById('buyDiamondBtn').addEventListener('click', buyDiamondEngine);
    document.getElementById('startDiamondBtn').addEventListener('click', startDiamondProduction);
    document.getElementById('hatchCowBtn').addEventListener('click', openHatchModal);
    document.getElementById('hatchChickenBtn').addEventListener('click', openHatchModal);
    document.getElementById('hatchCowConfirm').addEventListener('click', hatchCow);
    document.getElementById('hatchChickenConfirm').addEventListener('click', hatchChicken);
    
    // Crystal conversion
    document.getElementById('convertDiamondBtn').addEventListener('click', convertDiamond);
    document.getElementById('convertAmount').addEventListener('input', updateAllUI);
    
    // Referral
    document.getElementById('copyReferralBtn').addEventListener('click', copyReferralLink);
    document.getElementById('claimReferralBtn').addEventListener('click', claimReferral);
    
    // Withdraw
    document.getElementById('withdrawBtn').addEventListener('click', withdraw);
    document.getElementById('withdrawAmount').addEventListener('input', updateAllUI);
    
    // Market
    document.getElementById('createSellOrderBtnTop').addEventListener('click', openSellOrderModal);
    document.getElementById('submitSellOrderBtn').addEventListener('click', createSellOrder);
    
    // Deposit
    document.getElementById('depositButton').addEventListener('click', openDepositModal);
    document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
    document.getElementById('submitDepositBtn').addEventListener('click', initiateDeposit);
    
    // Tasks
    document.getElementById('addTaskBtn').addEventListener('click', openAddTaskModal);
    document.getElementById('submitTaskBtn').addEventListener('click', createTask);
    document.getElementById('taskTarget').addEventListener('input', calculateTaskPrice);
    
    // Sell order presets
    document.querySelectorAll('[data-sell-percent]').forEach(btn => {
        btn.addEventListener('click', function() {
            const percent = parseInt(this.dataset.sellPercent) / 100;
            const resource = document.querySelector('input[name="sellResource"]:checked')?.value || 'milk';
            const balance = resource === 'milk' ? window.App.user.milk : window.App.user.eggs;
            const amount = Math.floor(balance * percent);
            document.getElementById('sellQuantity').value = Math.max(100, amount);
            updateSellDetails();
        });
    });
    
    // Deposit presets
    document.querySelectorAll('[data-deposit]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('depositAmountInput').value = this.dataset.deposit;
        });
    });
    
    // Sell resource radio
    document.querySelectorAll('input[name="sellResource"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateAllUI();
            updateSellDetails();
        });
    });
    
    // Help modal
    document.getElementById('helpButton').addEventListener('click', function() {
        document.getElementById('helpModal').classList.add('active');
    });
    
    document.getElementById('closeHelp').addEventListener('click', function() {
        document.getElementById('helpModal').classList.remove('active');
    });
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Sell order inputs
    document.getElementById('sellQuantity').addEventListener('input', updateSellDetails);
    document.getElementById('sellTotalPrice').addEventListener('input', updateSellDetails);
    
    // Activate popup
    document.getElementById('activateAmount').addEventListener('input', updateActivateCost);
    
    // Upgrade popup
    document.getElementById('upgradeAmount').addEventListener('input', updateUpgradeCost);
    
    // Buy popup
    document.getElementById('buyAmount').addEventListener('input', updateBuyCost);
}

// ===== EXPORT FUNCTIONS TO WINDOW =====
window.initApp = initApp;
window.loadGameState = loadGameState;
window.updateAllUI = updateAllUI;
window.updateProductionTimer = updateProductionTimer;
window.animateTonBalance = animateTonBalance;
window.updateLockedStates = updateLockedStates;
window.updateLeaderboardUI = updateLeaderboardUI;
window.updateReferralUI = updateReferralUI;
window.displayReferrals = displayReferrals;
window.displayEarnings = displayEarnings;
window.loadMoreReferrals = loadMoreReferrals;
window.loadMoreEarnings = loadMoreEarnings;
window.updateTasksUI = updateTasksUI;
window.handleTaskButton = handleTaskButton;
window.verifyTask = verifyTask;
window.closeAllModals = closeAllModals;
window.updateMarketUI = updateMarketUI;
window.loadMyOrders = loadMyOrders;
window.showPurchaseConfirm = showPurchaseConfirm;
window.executeOrder = executeOrder;
window.cancelOrder = cancelOrder;
window.updateSellDetails = updateSellDetails;
window.createSellOrder = createSellOrder;
window.buyCow = buyCow;
window.buyChicken = buyChicken;
window.buyDiamondEngine = buyDiamondEngine;
window.startDiamondProduction = startDiamondProduction;
window.hatchCow = hatchCow;
window.hatchChicken = hatchChicken;
window.convertDiamond = convertDiamond;
window.withdraw = withdraw;
window.claimReferral = claimReferral;
window.copyReferralLink = copyReferralLink;
window.openSellOrderModal = openSellOrderModal;
window.openHatchModal = openHatchModal;
window.openAddTaskModal = openAddTaskModal;
window.openDepositModal = openDepositModal;
window.calculateTaskPrice = calculateTaskPrice;
window.createTask = createTask;
window.initiateDeposit = initiateDeposit;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
