// ============================================
// GLOBAL APP STATE
// ============================================
let App = {
    userId: null,
    user: null,
    global: null,
    constants: null,
    referral: null,
    market: null,
    tasks: null,
    leaderboard: null,
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
    activateLevel: 1,
    activateMax: 0,
    activateCostPerCow: 200,
    upgradeFromLevel: 1,
    upgradeCostPerCow: 6000,
    initialized: false
};

// ============================================
// INITIALIZATION
// ============================================
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

// ============================================
// LOAD GAME STATE
// ============================================
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
        App.tasks = state.tasks || { partner: [], community: [] };
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
        
        // Initialize ranch data
        if (state.ranch) {
            App.ranch = state.ranch;
        } else {
            const cowsOwned = App.user?.cows_owned || 0;
            App.ranch.cowLevels = { 1: cowsOwned, 2: 0, 3: 0 };
            App.ranch.cowActive = { 1: Math.min(cowsOwned, 10), 2: 0, 3: 0 };
            App.ranch.milkStored = Math.floor(Math.random() * 20000);
            App.ranch.storageCapacity = 40000;
            App.ranch.storageLevel = 1;
            
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

// ============================================
// UPDATE ALL UI
// ============================================
function updateAllUI() {
    if (!App.user || !App.global) return;
    
    // Status Bar
    document.getElementById('statusMilk').innerHTML = formatNumber(App.user.milk);
    document.getElementById('statusEggs').innerHTML = formatNumber(App.user.eggs);
    document.getElementById('statusDiamond').innerHTML = formatNumber(App.user.diamond);
    document.getElementById('statusTon').innerHTML = formatTON(App.user.tonBalance);
    document.getElementById('milkPerHour').innerHTML = App.user.milkPerHour || 0;
    document.getElementById('eggsPerHour').innerHTML = App.user.eggsPerHour || 0;
    document.getElementById('crystalPriceHeader').innerHTML = CONFIG.CRYSTAL_PRICE;
    
    updateProductionTimer();
    
    // Cow Card
    document.getElementById('cowsOwned').innerHTML = App.user.cows_owned || 0;
    const cowProgress = App.global.cows_progress || 0;
    document.getElementById('cowProgressText').innerHTML = `${App.global.cows_sold || 0}/${App.global.cows_cap}`;
    document.getElementById('cowProgressFill').style.width = `${cowProgress}%`;
    
    const cowBtn = document.getElementById('buyCowBtn');
    const cowBadge = document.getElementById('cowBadge');
    
    if (App.global.cows_remaining <= 0) {
        if (cowBtn) cowBtn.disabled = true;
        if (cowBadge) {
            cowBadge.innerHTML = App.currentLanguage === 'ru' ? 'ПРОДАНО' : 'SOLD OUT';
            cowBadge.className = 'machine-badge badge-soldout';
        }
    } else {
        if (cowBtn) cowBtn.disabled = false;
        if (cowBadge) {
            cowBadge.innerHTML = `${App.global.cows_remaining} ` + (App.currentLanguage === 'ru' ? 'ОСТАЛОСЬ' : 'LEFT');
            cowBadge.className = 'machine-badge badge-available';
        }
    }
    
    // Chicken Card
    document.getElementById('chickensOwned').innerHTML = App.user.chickens_owned || 0;
    const chickenProgress = App.global.chickens_progress || 0;
    document.getElementById('chickenProgressText').innerHTML = `${App.global.chickens_sold || 0}/${App.global.chickens_cap}`;
    document.getElementById('chickenProgressFill').style.width = `${chickenProgress}%`;
    
    const chickenBtn = document.getElementById('buyChickenBtn');
    const chickenBadge = document.getElementById('chickenBadge');
    
    if (!App.global.chicken_unlocked) {
        if (chickenBtn) chickenBtn.disabled = true;
        if (chickenBadge) {
            chickenBadge.innerHTML = App.currentLanguage === 'ru' ? 'ЗАБЛОК' : 'LOCKED';
            chickenBadge.className = 'machine-badge badge-locked';
        }
    } else if (App.user.chickens_owned > 0) {
        if (chickenBtn) chickenBtn.disabled = true;
        if (chickenBadge) {
            chickenBadge.innerHTML = App.currentLanguage === 'ru' ? 'ВЛАДЕЮ' : 'OWNED';
            chickenBadge.className = 'machine-badge badge-owned';
        }
    } else if (App.global.chickens_remaining <= 0) {
        if (chickenBtn) chickenBtn.disabled = true;
        if (chickenBadge) {
            chickenBadge.innerHTML = App.currentLanguage === 'ru' ? 'ПРОДАНО' : 'SOLD OUT';
            chickenBadge.className = 'machine-badge badge-soldout';
        }
    } else {
        if (chickenBtn) {
            chickenBtn.disabled = App.user.tonBalance < 1;
            chickenBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + (App.currentLanguage === 'ru' ? 'Купить' : 'Buy');
        }
        if (chickenBadge) {
            chickenBadge.innerHTML = `${App.global.chickens_remaining} ` + (App.currentLanguage === 'ru' ? 'ОСТАЛОСЬ' : 'LEFT');
            chickenBadge.className = 'machine-badge badge-available';
        }
    }
    
    // Diamond Card
    document.getElementById('diamondEnginesOwned').innerHTML = App.user.diamond_engines_owned || 0;
    
    const diamondBuyBtn = document.getElementById('buyDiamondBtn');
    const diamondStartBtn = document.getElementById('startDiamondBtn');
    const diamondBadge = document.getElementById('diamondBadge');
    
    if (!App.global.diamond_unlocked) {
        if (diamondBuyBtn) {
            diamondBuyBtn.disabled = true;
            diamondBuyBtn.innerHTML = '<i class="fas fa-lock"></i> ' + (App.currentLanguage === 'ru' ? 'Заблокировано' : 'Locked');
        }
        if (diamondStartBtn) diamondStartBtn.disabled = true;
        if (diamondBadge) {
            diamondBadge.innerHTML = App.currentLanguage === 'ru' ? 'ЗАБЛОК' : 'LOCKED';
            diamondBadge.className = 'machine-badge badge-locked';
        }
    } else if (App.user.diamond_engines_owned > 0) {
        if (diamondBuyBtn) {
            diamondBuyBtn.disabled = true;
            diamondBuyBtn.innerHTML = '<i class="fas fa-check"></i> ' + (App.currentLanguage === 'ru' ? 'Владею' : 'Owned');
        }
        if (diamondBadge) {
            diamondBadge.innerHTML = App.currentLanguage === 'ru' ? 'ВЛАДЕЮ' : 'OWNED';
            diamondBadge.className = 'machine-badge badge-owned';
        }
        
        const canProduce = (App.user.milk || 0) >= 20000 && (App.user.eggs || 0) >= 20000;
        if (diamondStartBtn) {
            diamondStartBtn.disabled = !canProduce;
            diamondStartBtn.innerHTML = canProduce 
                ? '<i class="fas fa-play"></i> ' + (App.currentLanguage === 'ru' ? 'Запустить' : 'Start')
                : '<i class="fas fa-ban"></i> ' + (App.currentLanguage === 'ru' ? 'Нужно 20k' : 'Need 20k');
        }
    } else {
        if (diamondBuyBtn) {
            diamondBuyBtn.disabled = App.user.tonBalance < 20;
            diamondBuyBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + (App.currentLanguage === 'ru' ? 'Купить' : 'Buy');
        }
        if (diamondStartBtn) diamondStartBtn.disabled = true;
        if (diamondBadge) {
            diamondBadge.innerHTML = App.currentLanguage === 'ru' ? 'ДОСТУПНО' : 'AVAILABLE';
            diamondBadge.className = 'machine-badge badge-available';
        }
    }
    
    // Crystal Section
    document.getElementById('diamondBalanceMain').innerHTML = formatNumber(App.user.diamond || 0);
    document.getElementById('crystalPriceMain').innerHTML = CONFIG.CRYSTAL_PRICE;
    document.getElementById('milkForDiamond').innerHTML = formatNumber(App.user.milk || 0);
    document.getElementById('eggsForDiamond').innerHTML = formatNumber(App.user.eggs || 0);
    
    const convertAmount = document.getElementById('convertAmount').value || 0;
    const tonReceive = convertAmount * CONFIG.CRYSTAL_PRICE;
    document.getElementById('tonReceiveMain').innerHTML = formatTON(tonReceive);
    
    // Profile Section
    document.getElementById('profileMilk').innerHTML = formatNumber(App.user.milk || 0);
    document.getElementById('profileEggs').innerHTML = formatNumber(App.user.eggs || 0);
    document.getElementById('profileDiamond').innerHTML = formatNumber(App.user.diamond || 0);
    document.getElementById('profileTon').innerHTML = formatTON(App.user.tonBalance || 0);
    document.getElementById('profileMilkRate').innerHTML = App.user.milkPerHour || 0;
    document.getElementById('profileEggsRate').innerHTML = App.user.eggsPerHour || 0;
    document.getElementById('profileDiamondPrice').innerHTML = CONFIG.CRYSTAL_PRICE;
    
    const totalMachines = (App.user.cows_owned || 0) + (App.user.chickens_owned || 0) + (App.user.diamond_engines_owned || 0);
    document.getElementById('totalMachines').innerHTML = totalMachines;
    document.getElementById('totalProduction').innerHTML = (App.user.milkPerHour + App.user.eggsPerHour) + '/h';
    
    // Referral Link
    if (App.user.referralCode) {
        const botUsername = CONFIG.BOT_USERNAME.replace('@', '');
        const referralLink = `https://t.me/${botUsername}?startapp=ref_${App.userId}`;
        document.getElementById('referralLink').value = referralLink;
    }
    
    document.getElementById('totalReferrals').innerHTML = App.referral?.totalReferrals || 0;
    
    const claimBtn = document.getElementById('claimReferralBtn');
    if (App.user.referralEarnings > 0) {
        if (claimBtn) {
            claimBtn.disabled = false;
            claimBtn.innerHTML = `<i class="fas fa-hand-holding-usd"></i> ` + 
                (App.currentLanguage === 'ru' ? 'Забрать ' : 'Claim ') + 
                `${formatTON(App.user.referralEarnings)} TON`;
        }
    } else {
        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> ' + 
                (App.currentLanguage === 'ru' ? 'Нет дохода' : 'No Earnings');
        }
    }
    
    // Hatch Balances
    document.getElementById('hatchCowBalance').innerHTML = 
        (App.currentLanguage === 'ru' ? 'Ваше молоко: ' : 'Your milk: ') + 
        formatNumber(App.user.milk || 0);
    document.getElementById('hatchChickenBalance').innerHTML = 
        (App.currentLanguage === 'ru' ? 'Ваши яйца: ' : 'Your eggs: ') + 
        formatNumber(App.user.eggs || 0);
    
    // Withdraw Calculation
    const withdrawAmount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
    const fee = withdrawAmount * 0.05;
    const net = withdrawAmount - fee;
    document.getElementById('withdrawFee').innerHTML = `${formatTON(fee)} TON`;
    document.getElementById('withdrawNet').innerHTML = `${formatTON(net)} TON`;
    
    document.getElementById('taskUserBalance').innerHTML = formatTON(App.user.tonBalance || 0);
}

function updateProductionTimer() {
    if (App.user && App.user.secondsUntilNext !== undefined) {
        const seconds = App.user.secondsUntilNext;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        document.getElementById('productionTimer').innerHTML = 
            `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function animateTonBalance() {
    const tonElement = document.getElementById('statusTon');
    tonElement.classList.add('increased');
    setTimeout(() => {
        tonElement.classList.remove('increased');
    }, 300);
}

// ============================================
// UPDATE LOCKED STATES
// ============================================
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

// ============================================
// LEADERBOARD FUNCTIONS
// ============================================
function updateLeaderboardUI() {
    if (!App.leaderboard) return;
    
    const leaderboard = App.leaderboard;
    
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
        if (winnersSection) {
            winnersSection.style.display = 'block';
            displayWinners(leaderboard.winners);
        }
        document.getElementById('leaderboardEndMessage').innerHTML = 
            '<i class="fas fa-check-circle" style="color: var(--neon-green);"></i> Competition ended! Prizes distributed.';
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
        if (rank === 1) rankClass = 'gold';
        else if (rank === 2) rankClass = 'silver';
        else if (rank === 3) rankClass = 'bronze';
        
        html += `<div class="leaderboard-card ${rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : ''}">
            <div class="card-content">
                <div class="rank-badge ${rankClass}">${rank}</div>
                <div class="user-info">
                    <div class="user-name-row">
                        <span class="user-name">${name}</span>
                        ${rank <= 3 ? '<span class="user-crown"><i class="fas fa-crown"></i></span>' : ''}
                    </div>
                </div>
                <div class="points-section">
                    <div class="points-box"><i class="fas fa-cow"></i> ${points}</div>
                    ${prize > 0 ? `<div class="prize-pill"><img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 16px; height: 16px; object-fit: contain;">${prize}</div>` : ''}
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

// ============================================
// REFERRAL FUNCTIONS
// ============================================
function updateReferralUI() {
    if (!App.referral) return;
    
    document.getElementById('totalReferrals').innerHTML = App.referral.totalReferrals || 0;
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
                <div style="flex:1">
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

async function claimReferral() {
    const buttonId = 'claimReferralBtn';
    const button = document.getElementById('claimReferralBtn');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    try {
        const result = await callAPI('claimReferralEarnings');
        await loadGameState();
        animateTonBalance();
        
        const message = App.currentLanguage === 'ru' 
            ? `✅ Забрано ${result.claimedAmount} TON!` 
            : `✅ Claimed ${result.claimedAmount} TON!`;
        
        showNotification(message, 'success');
    } catch (error) {
        console.error('Claim referral error:', error);
    }
}

function copyReferralLink() {
    const input = document.getElementById('referralLink');
    input.select();
    navigator.clipboard.writeText(input.value);
    
    showNotification(
        App.currentLanguage === 'ru' ? '✅ Ссылка скопирована!' : '✅ Link copied!', 
        'success'
    );
}

// ============================================
// TASKS FUNCTIONS
// ============================================
function updateTasksUI() {
    if (!App.tasks) return;
    
    const tasksGrid = document.getElementById('tasksGrid');
    const currentTab = App.currentTaskTab;
    const tasks = App.tasks[currentTab] || [];
    
    if (!tasksGrid) return;
    
    if (tasks.length === 0) {
        tasksGrid.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);"><i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i><p data-i18n="tasks.noTasks">No tasks available</p></div>';
        return;
    }
    
    let html = '';
    tasks.forEach(task => {
        const isCompleted = task.completedBy && task.completedBy.includes(App.userId);
        const taskIcon = task.type === 'channel' ? '📢' : '🤖';
        const taskTypeText = task.type === 'channel' 
            ? (App.currentLanguage === 'ru' ? 'Канал' : 'Channel') 
            : (App.currentLanguage === 'ru' ? 'Бот' : 'Bot');
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
                </div>
                ${isCompleted 
                    ? `<span style="font-size: 10px; color: var(--text-muted);"><i class="fas fa-check-circle" style="color: var(--neon-green);"></i> ${App.currentLanguage === 'ru' ? 'Выполнено' : 'Done'}</span>` 
                    : `<button class="task-btn" id="taskBtn_${task.id}" style="padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 600; background: ${hasJoined ? 'linear-gradient(145deg, var(--neon-green), #00b35e)' : 'linear-gradient(145deg, var(--crystal-blue), #0099cc)'}; color: white; border: none; cursor: pointer;" onclick="window.handleTaskButton('${task.id}','${task.link}','${task.type}',${hasJoined})">
                    ${hasJoined ? (App.currentLanguage === 'ru' ? 'Проверить' : 'Verify') : (App.currentLanguage === 'ru' ? 'Присоединиться' : 'Join')}
                </button>`}
            </div>
        </div>`;
    });
    
    tasksGrid.innerHTML = html;
}

window.handleTaskButton = function(taskId, link, taskType, hasJoined) {
    if (!hasJoined) {
        sessionStorage.setItem(`task_${taskId}_joined`, 'true');
        window.open(link, '_blank');
        
        setTimeout(() => {
            const btn = document.getElementById(`taskBtn_${taskId}`);
            if (btn) {
                btn.innerHTML = App.currentLanguage === 'ru' ? 'Проверить' : 'Verify';
                btn.style.background = 'linear-gradient(145deg, var(--neon-green), #00b35e)';
                btn.setAttribute('onclick', `window.verifyTask('${taskId}','${taskType}')`);
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
        document.getElementById('verifyEmoji').innerHTML = task.type === 'channel' ? '📢' : '🤖';
        document.getElementById('verifyTitle').innerHTML = task.type === 'channel' 
            ? (App.currentLanguage === 'ru' ? 'Присоединиться к каналу' : 'Join Channel') 
            : (App.currentLanguage === 'ru' ? 'Запустить бота' : 'Start Bot');
        document.getElementById('verifyLink').innerHTML = task.link;
        document.getElementById('verifyReward').innerHTML = formatTON(task.reward || CONFIG.TASK_REWARD) + ' TON';
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
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<div style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> ' + 
            (App.currentLanguage === 'ru' ? 'Проверка...' : 'Verifying...') + '</div>';
        
        const result = await callAPI('verifyTask', { taskId: task.id, taskType: task.type });
        
        if (result) {
            statusDiv.innerHTML = '<div style="color: var(--neon-green); text-align: center;">✅ ' + 
                (App.currentLanguage === 'ru' ? 'Задание выполнено! Награда добавлена.' : 'Task completed! Reward added.') + '</div>';
            
            showNotification(
                App.currentLanguage === 'ru' 
                    ? `✅ Задание выполнено! +${formatTON(task.reward || CONFIG.TASK_REWARD)} TON` 
                    : `✅ Task completed! +${formatTON(task.reward || CONFIG.TASK_REWARD)} TON`,
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

function calculateTaskPrice() {
    const target = parseInt(document.getElementById('taskTarget').value) || 100;
    const reward = CONFIG.TASK_REWARD;
    const totalCost = target * reward * 2;
    
    document.getElementById('taskTotalCost').innerHTML = `Total Cost: ${formatTON(totalCost)} TON`;
    
    const userBalance = App.user?.tonBalance || 0;
    const submitBtn = document.getElementById('submitTaskBtn');
    
    if (userBalance < totalCost) {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
        }
        document.getElementById('taskTotalCost').style.color = 'var(--danger-red)';
    } else {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
        document.getElementById('taskTotalCost').style.color = 'var(--crystal-blue)';
    }
}

window.createTask = async function() {
    const buttonId = 'submitTaskBtn';
    const button = document.getElementById('submitTaskBtn');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    const taskType = document.querySelector('input[name="taskType"]:checked')?.value;
    const link = document.getElementById('taskLink').value.trim();
    const target = parseInt(document.getElementById('taskTarget').value);
    
    if (!taskType || !link || !target || target < 100) {
        alert(App.currentLanguage === 'ru' 
            ? 'Заполните все поля корректно (минимум 100 пользователей)' 
            : 'Fill all fields correctly (minimum 100 users)');
        return;
    }
    
    const totalCost = target * CONFIG.TASK_REWARD * 2;
    
    if (totalCost > (App.user?.tonBalance || 0)) {
        alert(App.currentLanguage === 'ru' ? 'Недостаточно средств' : 'Insufficient balance');
        return;
    }
    
    try {
        const result = await callAPI('createTask', {
            type: taskType,
            link: link,
            targetUsers: target,
            reward: CONFIG.TASK_REWARD
        });
        
        showNotification(
            App.currentLanguage === 'ru' 
                ? `✅ Задание создано! Стоимость: ${formatTON(totalCost)} TON` 
                : `✅ Task created! Cost: ${formatTON(totalCost)} TON`,
            'success'
        );
        
        window.closeAllModals();
        loadGameState();
    } catch (error) {
        console.error('Create task error:', error);
        showNotification(error.message, 'error');
    }
};

// ============================================
// MARKET FUNCTIONS
// ============================================
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
        
        document.getElementById('marketTotalOrders').innerHTML = totalOrders;
        document.getElementById('marketMilkQty').innerHTML = formatNumber(milkQty);
        document.getElementById('marketEggsQty').innerHTML = formatNumber(eggsQty);
        
        const bestSell = App.market?.[App.currentMarketResource]?.bestSellPrice || 0.0001;
        document.getElementById('marketBestPrice').innerHTML = formatFullPrecision(bestSell);
        
        const sellGrid = document.getElementById('sellOrdersGrid');
        const loadMoreBtn = document.getElementById('loadMoreSellBtn');
        
        if (sellOrders.orders && sellOrders.orders.length > 0) {
            let html = '';
            
            if (reset) {
                sellGrid.innerHTML = '';
                App.currentMarketPage = 1;
                App.hasMoreOrders = sellOrders.hasMore;
            }
            
            sellOrders.orders.forEach(order => {
                const pricePerUnit = order.pricePerUnit;
                const total = order.remaining * pricePerUnit;
                const resourceEmoji = App.currentMarketResource === 'milk' ? '🥛' : '🥚';
                const resourceName = App.currentMarketResource === 'milk' ? 'MILK' : 'EGG';
                
                html += `<div class="market-card" onclick="showPurchaseConfirm('${order.id}','${order.resource}',${order.remaining},${pricePerUnit})">
                    <div class="card-inner">
                        <div class="card-title ${order.type}">${resourceName}</div>
                        <div class="amount-box"><span class="egg-icon">${resourceEmoji}</span><span>${formatNumber(order.remaining)}</span></div>
                        <div class="price-label">PRICE</div>
                        <div class="price-box"><img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; filter: drop-shadow(0 0 2px rgba(255,255,255,0.5));"><span>${formatFullPrecision(total)}</span></div>
                        <div class="unit-price">${formatFullPrecision(pricePerUnit)} TON/${resourceName.toLowerCase()}</div>
                        <button class="buy-btn">${App.currentLanguage === 'ru' ? 'Купить' : 'Buy'}</button>
                    </div>
                </div>`;
            });
            
            if (reset) {
                sellGrid.innerHTML = html;
            } else {
                sellGrid.innerHTML += html;
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

function updateSellDetails() {
    const quantity = parseInt(document.getElementById('sellQuantity').value) || 0;
    const totalPrice = parseFloat(document.getElementById('sellTotalPrice').value) || 0;
    
    if (quantity > 0 && totalPrice > 0) {
        const perUnit = totalPrice / quantity;
        document.getElementById('sellPerUnitHint').innerHTML = `≈ ${formatFullPrecision(perUnit)} TON per unit`;
        
        const penaltyWarning = document.getElementById('sellPenaltyWarning');
        if (perUnit < CONFIG.MIN_ORDER_PRICE) {
            if (penaltyWarning) {
                penaltyWarning.style.display = 'block';
                penaltyWarning.innerHTML = `⚠️ Price below ${CONFIG.MIN_ORDER_PRICE} TON will incur ${CONFIG.ORDER_PENALTY_FEE} TON penalty fee (non-refundable)`;
            }
        } else {
            if (penaltyWarning) penaltyWarning.style.display = 'none';
        }
    } else {
        document.getElementById('sellPerUnitHint').innerHTML = `≈ 0 TON per unit`;
        if (document.getElementById('sellPenaltyWarning')) {
            document.getElementById('sellPenaltyWarning').style.display = 'none';
        }
    }
    
    const fee = totalPrice * 0.1;
    const sellerGets = totalPrice - fee;
    document.getElementById('sellTotalTon').innerHTML = `Total: ${formatFullPrecision(totalPrice)} TON (You get: ${formatFullPrecision(sellerGets)} TON after 10% fee)`;
    document.getElementById('sellFeeDisplay').innerHTML = `⚠️ 10% market fee (${formatFullPrecision(fee)} TON) will be deducted when sold`;
    
    const resource = document.querySelector('input[name="sellResource"]:checked')?.value || 'milk';
    const balance = resource === 'milk' ? App.user?.milk : App.user?.eggs;
    document.getElementById('sellBalanceHint').innerHTML = `Available: ${formatNumber(balance || 0)} ${resource === 'milk' ? 'Milk' : 'Eggs'}`;
}

window.createSellOrder = async function() {
    const buttonId = 'submitSellOrderBtn';
    const button = document.getElementById('submitSellOrderBtn');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    const resource = document.querySelector('input[name="sellResource"]:checked')?.value;
    const quantity = parseInt(document.getElementById('sellQuantity').value);
    const totalPrice = parseFloat(document.getElementById('sellTotalPrice').value);
    
    if (!resource || !quantity || !totalPrice) {
        alert(App.currentLanguage === 'ru' ? 'Заполните все поля' : 'Fill all fields');
        return;
    }
    
    if (quantity < 100) {
        alert(App.currentLanguage === 'ru' ? 'Минимум 100 единиц' : 'Minimum 100 units');
        return;
    }
    
    if (totalPrice <= 0) {
        alert(App.currentLanguage === 'ru' ? 'Общая цена должна быть > 0' : 'Total price must be > 0');
        return;
    }
    
    const pricePerUnit = totalPrice / quantity;
    
    if (pricePerUnit < CONFIG.MIN_ORDER_PRICE) {
        if ((App.user?.tonBalance || 0) < CONFIG.ORDER_PENALTY_FEE) {
            alert(App.currentLanguage === 'ru' 
                ? `Недостаточно средств для штрафа. Нужно ${CONFIG.ORDER_PENALTY_FEE} TON.` 
                : `Insufficient balance for penalty fee. Need ${CONFIG.ORDER_PENALTY_FEE} TON.`);
            return;
        }
    }
    
    const activeOrdersCount = await checkActiveOrdersCount();
    if (activeOrdersCount >= CONFIG.MAX_ACTIVE_ORDERS) {
        const message = App.currentLanguage === 'ru' 
            ? `⚠️ У вас может быть только ${CONFIG.MAX_ACTIVE_ORDERS} активных заказов. Пожалуйста, сначала отмените заказ.` 
            : `⚠️ You can only have ${CONFIG.MAX_ACTIVE_ORDERS} active orders. Please cancel an order first.`;
        showNotification(message, 'warning');
        return;
    }
    
    try {
        const result = await callAPI('createSellOrder', {
            resource: resource,
            quantity: quantity,
            pricePerUnit: pricePerUnit
        });
        
        let message = App.currentLanguage === 'ru' ? '✅ Ордер на продажу создан' : '✅ Sell order created';
        if (result.penaltyFee) {
            message += `. Штраф: ${result.penaltyFee} TON.`;
        }
        
        showNotification(message, 'success');
        window.closeAllModals();
        loadGameState();
    } catch (error) {
        console.error('Create sell order error:', error);
    }
};

async function checkActiveOrdersCount() {
    try {
        const orders = await callAPI('getMyOrders');
        const activeCount = orders.active ? orders.active.length : 0;
        return activeCount;
    } catch (error) {
        console.error('Error checking active orders:', error);
        return 0;
    }
}

window.showPurchaseConfirm = function(orderId, resource, maxQuantity, pricePerUnit) {
    App.pendingOrder = {
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
    confirmResource.innerHTML = resource === 'milk' 
        ? (App.currentLanguage === 'ru' ? 'Пакет молока' : 'Milk Package') 
        : (App.currentLanguage === 'ru' ? 'Пакет яиц' : 'Eggs Package');
    
    const total = maxQuantity * pricePerUnit;
    
    confirmDetails.innerHTML = `
        <div class="confirm-row">
            <span class="confirm-label">${App.currentLanguage === 'ru' ? 'Количество:' : 'Quantity:'}</span>
            <span class="confirm-value">${formatNumber(maxQuantity)}</span>
        </div>
        <div class="confirm-row">
            <span class="confirm-label">${App.currentLanguage === 'ru' ? 'Цена за ед:' : 'Price per unit:'}</span>
            <span class="confirm-value">${formatFullPrecision(pricePerUnit)} TON</span>
        </div>
        <div class="confirm-row">
            <span class="confirm-label">${App.currentLanguage === 'ru' ? 'Итого:' : 'Total:'}</span>
            <span class="confirm-total"><img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 14px; height: 14px; object-fit: contain;"> ${formatFullPrecision(total)}</span>
        </div>
    `;
    
    document.getElementById('confirmExecuteBtn').onclick = function() {
        window.executeOrder(orderId, maxQuantity);
    };
    
    modal.classList.add('active');
};

window.executeOrder = async function(orderId, quantity) {
    const buttonId = 'confirmExecuteBtn';
    const button = document.getElementById('confirmExecuteBtn');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    try {
        const result = await callAPI('executeOrder', {
            orderId: orderId,
            quantity: quantity
        });
        
        const resourceEmoji = result.resource === 'milk' ? '🥛' : '🥚';
        const resourceName = result.resource === 'milk' ? 'MILK' : 'EGG';
        
        const message = `🎉 Order filled! ${quantity} ${resourceEmoji} ${resourceName} for ${formatFullPrecision(result.totalCost)} TON`;
        showNotification(message, 'success');
        
        loadGameState();
        window.closeAllModals();
    } catch (error) {
        console.error('Execute order error:', error);
    }
};

window.cancelOrder = async function(orderId) {
    const buttonId = 'cancelOrder_' + orderId;
    const button = event?.target;
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    if (!confirm(App.currentLanguage === 'ru' ? 'Отменить этот заказ?' : 'Cancel this order?')) return;
    
    try {
        await callAPI('cancelOrder', { orderId });
        showNotification(
            App.currentLanguage === 'ru' ? '✅ Заказ отменен' : '✅ Order cancelled', 
            'success'
        );
        loadGameState();
    } catch (error) {
        console.error('Cancel order error:', error);
    }
};

async function loadMyOrders() {
    try {
        const orders = await callAPI('getMyOrders');
        
        const activeContainer = document.getElementById('myActiveOrders');
        if (activeContainer) {
            if (orders.active && orders.active.length > 0) {
                let html = '';
                orders.active.forEach(order => {
                    const resourceEmoji = order.resource === 'milk' ? '🥛' : '🥚';
                    const pricePerUnit = order.pricePerUnit;
                    const total = order.remaining * pricePerUnit;
                    
                    html += `<div class="market-card">
                        <div class="card-inner">
                            <div class="card-title ${order.type}">${order.resource === 'milk' ? 'MILK' : 'EGG'}</div>
                            <div class="amount-box"><span class="egg-icon">${resourceEmoji}</span><span>${formatNumber(order.remaining)}/${formatNumber(order.quantity)}</span></div>
                            <div class="price-label">PRICE</div>
                            <div class="price-box"><img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; filter: drop-shadow(0 0 2px rgba(255,255,255,0.5));"><span>${formatFullPrecision(total)}</span></div>
                            <div class="unit-price">${formatFullPrecision(pricePerUnit)} TON/${order.resource === 'milk' ? 'milk' : 'egg'}</div>
                            ${order.penaltyPaid ? '<div style="font-size: 8px; color: var(--warning); margin: 4px 0;">Штраф: ' + order.penaltyAmount + ' TON</div>' : ''}
                            <button class="btn btn-secondary" style="padding: 8px; font-size: 12px; margin-top: 8px;" onclick="window.cancelOrder('${order.id}')">${App.currentLanguage === 'ru' ? 'Отменить' : 'Cancel'}</button>
                        </div>
                    </div>`;
                });
                activeContainer.innerHTML = html;
            } else {
                activeContainer.innerHTML = '<div style="grid-column: span 2; text-align: center; padding: 25px; color: var(--text-secondary);"><p>' + 
                    (App.currentLanguage === 'ru' ? 'Нет активных заказов' : 'No active orders') + '</p></div>';
            }
        }
        
        const filledContainer = document.getElementById('myFilledOrders');
        if (filledContainer) {
            if (orders.filled && orders.filled.length > 0) {
                let html = '';
                orders.filled.slice(0, 5).forEach(order => {
                    const date = new Date(order.createdAt).toLocaleDateString('en-GB');
                    html += `<div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div>
                            <span style="font-weight: 600; font-size: 11px;">${order.type === 'sell' ? (App.currentLanguage === 'ru' ? 'Продажа' : 'Sell') : (App.currentLanguage === 'ru' ? 'Покупка' : 'Buy')} ${order.resource === 'milk' ? (App.currentLanguage === 'ru' ? 'Молоко' : 'Milk') : (App.currentLanguage === 'ru' ? 'Яйца' : 'Eggs')}</span>
                            <span style="font-size: 9px; color: var(--text-muted); margin-left: 4px;">${date}</span>
                        </div>
                        <div>
                            <span style="color: var(--neon-green); font-size: 11px;">${formatNumber(order.quantity)}</span>
                            <span style="margin-left: 4px; font-size: 10px;">@ ${formatFullPrecision(order.pricePerUnit)}</span>
                        </div>
                    </div>`;
                });
                filledContainer.innerHTML = html;
            } else {
                filledContainer.innerHTML = '<div style="text-align: center; padding: 18px; color: var(--text-secondary);">' + 
                    (App.currentLanguage === 'ru' ? 'Нет истории заказов' : 'No order history') + '</div>';
            }
        }
    } catch (error) {
        console.error('Load my orders error:', error);
    }
}

// ============================================
// CRYSTAL FUNCTIONS
// ============================================
window.convertDiamond = async function() {
    const buttonId = 'convertDiamondBtn';
    const button = document.getElementById('convertDiamondBtn');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    const amount = parseInt(document.getElementById('convertAmount').value);
    
    if (!amount || amount <= 0) {
        alert(App.currentLanguage === 'ru' ? 'Введите корректную сумму' : 'Enter valid amount');
        return;
    }
    
    if (amount > App.user.diamond) {
        alert(App.currentLanguage === 'ru' ? 'Недостаточно кристаллов' : 'Insufficient crystals');
        return;
    }
    
    try {
        const result = await callAPI('convertDiamond', { amount });
        await loadGameState();
        document.getElementById('convertAmount').value = '';
        animateTonBalance();
        
        showNotification(
            App.currentLanguage === 'ru' 
                ? `✅ Конвертировано ${amount} 💎 в ${result.tonReceived} TON` 
                : `✅ Converted ${amount} 💎 to ${result.tonReceived} TON`,
            'success'
        );
    } catch (error) {
        console.error('Convert crystal error:', error);
    }
};

// ============================================
// WITHDRAW FUNCTIONS
// ============================================
window.withdraw = async function() {
    const buttonId = 'withdrawBtn';
    const button = document.getElementById('withdrawBtn');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const address = document.getElementById('withdrawAddress').value.trim();
    
    if (!amount || amount < 0.1) {
        alert(App.currentLanguage === 'ru' ? 'Минимальный вывод: 0.1 TON' : 'Minimum withdrawal: 0.1 TON');
        return;
    }
    
    if (!address || address.length < 10) {
        alert(App.currentLanguage === 'ru' ? 'Введите корректный TON адрес' : 'Enter valid TON address');
        return;
    }
    
    if (amount > App.user.tonBalance) {
        alert(App.currentLanguage === 'ru' ? 'Недостаточно средств' : 'Insufficient balance');
        return;
    }
    
    try {
        const result = await callAPI('withdraw', { amount, address });
        await loadGameState();
        document.getElementById('withdrawAmount').value = '';
        document.getElementById('withdrawAddress').value = '';
        
        const message = App.currentLanguage === 'ru' 
            ? `✅ Запрос на вывод: ${result.netAmount} TON` 
            : `✅ Withdrawal requested: ${result.netAmount} TON`;
        
        showNotification(message, 'success');
        window.closeAllModals();
    } catch (error) {
        console.error('Withdraw error:', error);
    }
};

// ============================================
// MACHINE PURCHASE FUNCTIONS
// ============================================
window.buyCow = async function() {
    openBuyCowsPopup();
};

window.buyChicken = async function() {
    const buttonId = 'buyChickenBtn';
    const button = document.getElementById('buyChickenBtn');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    try {
        await callAPI('buyChicken');
        await loadGameState();
        animateTonBalance();
        
        showNotification(
            App.currentLanguage === 'ru' ? '✅ Курица куплена!' : '✅ Chicken machine purchased!',
            'success'
        );
    } catch (error) {
        console.error('Buy chicken error:', error);
    }
};

window.buyDiamondEngine = async function() {
    const buttonId = 'buyDiamondBtn';
    const button = document.getElementById('buyDiamondBtn');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    try {
        await callAPI('buyDiamondEngine');
        await loadGameState();
        animateTonBalance();
        
        showNotification(
            App.currentLanguage === 'ru' ? '✅ Кристальный двигатель куплен!' : '✅ Crystal Engine purchased!',
            'success'
        );
    } catch (error) {
        console.error('Buy crystal engine error:', error);
    }
};

window.startDiamondProduction = async function() {
    const buttonId = 'startDiamondBtn';
    const button = document.getElementById('startDiamondBtn');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    try {
        await callAPI('startDiamondProduction');
        await loadGameState();
        
        showNotification(
            App.currentLanguage === 'ru' ? '💎 Кристалл создан!' : '💎 Crystal produced!',
            'success'
        );
    } catch (error) {
        console.error('Crystal production error:', error);
    }
};

window.hatchCow = async function() {
    const buttonId = 'hatchCowConfirm';
    const button = document.getElementById('hatchCowConfirm');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    const amount = parseInt(document.getElementById('hatchCowAmount').value) || 1;
    
    try {
        await callAPI('hatchCow', { amount });
        await loadGameState();
        
        showNotification(
            App.currentLanguage === 'ru' 
                ? `🐮 Выведено ${amount} коров(а)!` 
                : `🐮 Hatched ${amount} Cow(s)!`,
            'success'
        );
        
        window.closeAllModals();
    } catch (error) {
        console.error('Hatch cow error:', error);
    }
};

window.hatchChicken = async function() {
    const buttonId = 'hatchChickenConfirm';
    const button = document.getElementById('hatchChickenConfirm');
    
    if (!validateAndCooldown(buttonId, button)) {
        return;
    }
    
    const amount = parseInt(document.getElementById('hatchChickenAmount').value) || 1;
    
    try {
        await callAPI('hatchChicken', { amount });
        await loadGameState();
        
        showNotification(
            App.currentLanguage === 'ru' 
                ? `🐔 Выведено ${amount} куриц(а)!` 
                : `🐔 Hatched ${amount} Chicken(s)!`,
            'success'
        );
        
        window.closeAllModals();
    } catch (error) {
        console.error('Hatch chicken error:', error);
    }
};

// ============================================
// MODAL FUNCTIONS
// ============================================
window.openSellOrderModal = function() {
    document.getElementById('sellOrderModal').classList.add('active');
    updateSellDetails();
};

window.openHatchModal = function() {
    document.getElementById('hatchModal').classList.add('active');
};

window.openAddTaskModal = function() {
    document.getElementById('addTaskModal').classList.add('active');
    calculateTaskPrice();
};

window.openDepositModal = function() {
    document.getElementById('depositModal').classList.add('active');
};

window.closeAllModals = function() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
    document.querySelectorAll('.activate-popup').forEach(popup => {
        popup.classList.remove('active');
    });
    App.pendingOrder = null;
    App.pendingTask = null;
};

// ============================================
// DEPOSIT FUNCTIONS
// ============================================
window.initiateDeposit = async function() {
    if (!App.wallet) {
        alert(App.currentLanguage === 'ru' ? 'Сначала подключите кошелек' : 'Connect wallet first');
        return;
    }
    
    const amount = parseFloat(document.getElementById('depositAmountInput').value);
    
    if (!amount || amount < 0.1) {
        alert(App.currentLanguage === 'ru' ? 'Минимальный депозит: 0.1 TON' : 'Minimum deposit: 0.1 TON');
        return;
    }
    
    try {
        const comment = String(App.userId);
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
                address: CONFIG.DEPOSIT_WALLET,
                amount: amountInNano,
                payload: payloadBase64
            }]
        };
        
        const result = await App.tonConnectUI.sendTransaction(transaction);
        
        showNotification(
            App.currentLanguage === 'ru' 
                ? '✅ Транзакция отправлена! Подождите около 1 минуты для зачисления' 
                : '✅ Transaction sent! Wait about 1 minute for balance to be added',
            'success'
        );
        
        await handleDepositSuccess(result, amount, comment);
    } catch (error) {
        console.error('Deposit error:', error);
        
        let errorMessage = App.currentLanguage === 'ru' ? 'Транзакция не удалась' : 'Transaction failed';
        
        if (error.message?.includes('rejected')) {
            errorMessage = App.currentLanguage === 'ru' ? 'Транзакция отклонена в кошельке' : 'Transaction rejected in wallet';
        } else if (error.message?.includes('insufficient')) {
            errorMessage = App.currentLanguage === 'ru' ? 'Недостаточно средств' : 'Insufficient balance';
        }
        
        const statusDiv = document.getElementById('depositStatus');
        statusDiv.classList.add('visible');
        statusDiv.querySelector('.status-icon').innerHTML = '❌';
        statusDiv.querySelector('.status-message').innerHTML = errorMessage;
        document.getElementById('depositStatusDetail').innerHTML = error.message || (App.currentLanguage === 'ru' ? 'Пожалуйста, попробуйте снова' : 'Please try again');
    }
};

async function handleDepositSuccess(result, amount, comment) {
    try {
        const depositResult = await callAPI('deposit', {
            amount: amount,
            txHash: result.boc,
            comment: comment
        });
        
        App.currentDepositId = depositResult.depositId;
        App.currentTxHash = result.boc;
        
        const statusDiv = document.getElementById('depositStatus');
        statusDiv.classList.add('visible');
        statusDiv.querySelector('.status-icon').innerHTML = '⏳';
        statusDiv.querySelector('.status-message').innerHTML = App.currentLanguage === 'ru' ? 'Транзакция отправлена!' : 'Transaction sent!';
        document.getElementById('depositStatusDetail').innerHTML = App.currentLanguage === 'ru' ? 'Ожидание подтверждения (≈1 мин)...' : 'Waiting for confirmation (≈1 min)...';
        
        startDepositVerification(depositResult.depositId, result.boc);
    } catch (error) {
        console.error('Deposit API error:', error);
        
        const statusDiv = document.getElementById('depositStatus');
        statusDiv.classList.add('visible');
        statusDiv.querySelector('.status-icon').innerHTML = '❌';
        statusDiv.querySelector('.status-message').innerHTML = App.currentLanguage === 'ru' ? 'Не удалось обработать депозит' : 'Failed to process deposit';
        document.getElementById('depositStatusDetail').innerHTML = error.message;
    }
}

function startDepositVerification(depositId, txHash) {
    if (App.depositCheckInterval) {
        clearInterval(App.depositCheckInterval);
    }
    
    let attempts = 0;
    const maxAttempts = 18;
    
    App.depositCheckInterval = setInterval(async () => {
        attempts++;
        
        try {
            const result = await callAPI('verifyDeposit', { depositId: depositId, txHash: txHash });
            
            if (result.status === 'completed') {
                clearInterval(App.depositCheckInterval);
                
                const statusDiv = document.getElementById('depositStatus');
                statusDiv.querySelector('.status-icon').innerHTML = '✅';
                statusDiv.querySelector('.status-message').innerHTML = App.currentLanguage === 'ru' ? 'Депозит подтвержден!' : 'Deposit confirmed!';
                document.getElementById('depositStatusDetail').innerHTML = App.currentLanguage === 'ru' 
                    ? `${result.amount} TON добавлено на баланс` 
                    : `${result.amount} TON added to your balance`;
                
                showNotification(
                    App.currentLanguage === 'ru' 
                        ? `💰 Депозит подтвержден! ${result.amount} TON добавлено` 
                        : `💰 Deposit confirmed! ${result.amount} TON added`,
                    'success'
                );
                
                loadGameState();
                animateTonBalance();
                
                setTimeout(() => {
                    statusDiv.classList.remove('visible');
                    window.closeAllModals();
                }, 3000);
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(App.depositCheckInterval);
                
                const statusDiv = document.getElementById('depositStatus');
                statusDiv.querySelector('.status-icon').innerHTML = '⏳';
                statusDiv.querySelector('.status-message').innerHTML = App.currentLanguage === 'ru' ? 'Все еще проверяется...' : 'Still verifying...';
                document.getElementById('depositStatusDetail').innerHTML = App.currentLanguage === 'ru' ? 'Будет зачислено автоматически' : 'Will be credited automatically';
            }
        } catch (error) {
            console.error('Verification error:', error);
            if (attempts >= maxAttempts) {
                clearInterval(App.depositCheckInterval);
            }
        }
    }, 10000);
}

// ============================================
// INTERVALS SETUP
// ============================================
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

// ============================================
// EVENT LISTENERS SETUP
// ============================================
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
    
    // Leaderboard Button
    document.getElementById('leaderboardButton').addEventListener('click', function() {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById('sectionLeaderboard').classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        loadGameState();
    });
    
    // Language Switcher
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
    
    // Market Tabs
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
    
    // Task Tabs
    document.querySelectorAll('[data-task-tab]').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('[data-task-tab]').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            App.currentTaskTab = this.dataset.taskTab;
            updateTasksUI();
        });
    });
    
    // Resource Switch
    document.querySelectorAll('[data-resource]').forEach(res => {
        res.addEventListener('click', function() {
            document.querySelectorAll('[data-resource]').forEach(r => r.classList.remove('active'));
            this.classList.add('active');
            App.currentMarketResource = this.dataset.resource;
            App.currentMarketPage = 1;
            updateMarketUI(1, true);
        });
    });
    
    // Task Type Radio
    document.querySelectorAll('input[name="taskType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const note = document.getElementById('channelNote');
            if (note) {
                note.style.display = this.value === 'channel' ? 'block' : 'none';
            }
        });
    });
    
    // Refresh Market Button
    document.getElementById('refreshMarketBtn').addEventListener('click', function() {
        App.currentMarketPage = 1;
        updateMarketUI(1, true);
        this.querySelector('i').style.animation = 'spin-slow 0.5s infinite linear';
        setTimeout(() => {
            this.querySelector('i').style.animation = 'spin-slow 2s infinite linear';
        }, 500);
    });
    
    // Refresh Tasks Button
    document.getElementById('refreshTasksBtn').addEventListener('click', function() {
        loadGameState();
        this.querySelector('i').style.animation = 'spin-slow 0.5s infinite linear';
        setTimeout(() => {
            this.querySelector('i').style.animation = 'spin-slow 2s infinite linear';
        }, 500);
    });
    
    // Load More Buttons
    document.getElementById('loadMoreSellBtn').addEventListener('click', function() {
        App.currentMarketPage++;
        updateMarketUI(App.currentMarketPage, false);
    });
    
    document.getElementById('loadMoreReferralsBtn').addEventListener('click', loadMoreReferrals);
    document.getElementById('loadMoreEarningsBtn').addEventListener('click', loadMoreEarnings);
    
    // Machine Buttons
    document.getElementById('buyChickenBtn').addEventListener('click', window.buyChicken);
    document.getElementById('buyDiamondBtn').addEventListener('click', window.buyDiamondEngine);
    document.getElementById('startDiamondBtn').addEventListener('click', window.startDiamondProduction);
    document.getElementById('hatchCowBtn').addEventListener('click', window.openHatchModal);
    document.getElementById('hatchChickenBtn').addEventListener('click', window.openHatchModal);
    document.getElementById('hatchCowConfirm').addEventListener('click', window.hatchCow);
    document.getElementById('hatchChickenConfirm').addEventListener('click', window.hatchChicken);
    
    // Crystal Conversion
    document.getElementById('convertDiamondBtn').addEventListener('click', window.convertDiamond);
    document.getElementById('convertAmount').addEventListener('input', updateAllUI);
    
    // Referral
    document.getElementById('copyReferralBtn').addEventListener('click', copyReferralLink);
    document.getElementById('claimReferralBtn').addEventListener('click', claimReferral);
    
    // Withdraw
    document.getElementById('withdrawBtn').addEventListener('click', window.withdraw);
    document.getElementById('withdrawAmount').addEventListener('input', updateAllUI);
    
    // Market
    document.getElementById('createSellOrderBtnTop').addEventListener('click', window.openSellOrderModal);
    document.getElementById('submitSellOrderBtn').addEventListener('click', window.createSellOrder);
    
    // Deposit
    document.getElementById('depositButton').addEventListener('click', window.openDepositModal);
    document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
    document.getElementById('submitDepositBtn').addEventListener('click', window.initiateDeposit);
    
    // Tasks
    document.getElementById('addTaskBtn').addEventListener('click', window.openAddTaskModal);
    document.getElementById('submitTaskBtn').addEventListener('click', window.createTask);
    document.getElementById('taskTarget').addEventListener('input', calculateTaskPrice);
    
    // Sell Order Presets
    document.querySelectorAll('[data-sell-percent]').forEach(btn => {
        btn.addEventListener('click', function() {
            const percent = parseInt(this.dataset.sellPercent) / 100;
            const resource = document.querySelector('input[name="sellResource"]:checked')?.value || 'milk';
            const balance = resource === 'milk' ? App.user.milk : App.user.eggs;
            const amount = Math.floor(balance * percent);
            document.getElementById('sellQuantity').value = Math.max(100, amount);
            updateSellDetails();
        });
    });
    
    // Deposit Presets
    document.querySelectorAll('[data-deposit]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('depositAmountInput').value = this.dataset.deposit;
        });
    });
    
    // Sell Resource Radio
    document.querySelectorAll('input[name="sellResource"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateAllUI();
            updateSellDetails();
        });
    });
    
    // Help Modal
    document.getElementById('helpButton').addEventListener('click', function() {
        document.getElementById('helpModal').classList.add('active');
    });
    
    document.getElementById('closeHelp').addEventListener('click', function() {
        document.getElementById('helpModal').classList.remove('active');
    });
    
    // Close Modals on Outside Click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // Sell Order Inputs
    document.getElementById('sellQuantity').addEventListener('input', updateSellDetails);
    document.getElementById('sellTotalPrice').addEventListener('input', updateSellDetails);
    
    // Activate Popup Input
    document.getElementById('activateAmount').addEventListener('input', updateActivateCost);
    
    // Upgrade Popup Input
    document.getElementById('upgradeAmount').addEventListener('input', updateUpgradeCost);
    
    // Buy Cows Popup Input
    document.getElementById('buyCowsAmount').addEventListener('input', updateBuyCowsCost);
}

// ============================================
// INITIALIZE APP ON DOM LOAD
// ============================================
document.addEventListener('DOMContentLoaded', initApp);
