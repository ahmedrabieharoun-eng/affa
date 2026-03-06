// ===== RANCH MANAGEMENT FUNCTIONS =====

// ===== INITIALIZATION =====
window.App = window.App || {
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
        dailyProduction: 0,
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
    upgradeMax: 0,
    upgradeCostPerCow: 6000,
    initialized: false
};

// ===== RANCH PAGE FUNCTIONS =====

/**
 * Open ranch page
 */
function openRanchPage() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('sectionRanch').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Update ranch UI
    updateRanchOverview();
    updateCowLevelsUI();
    updateCowSupplyUI();
    updateStorageUI();
}

/**
 * Close ranch page
 */
function closeRanchPage() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('sectionFarm').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('.nav-item[data-section="sectionFarm"]').classList.add('active');
}

/**
 * Update ranch overview card
 */
function updateRanchOverview() {
    if (!window.App.ranch) return;
    
    const ranch = window.App.ranch;
    const totalCows = (ranch.cowLevels[1] || 0) + (ranch.cowLevels[2] || 0) + (ranch.cowLevels[3] || 0);
    const activeCows = (ranch.cowActive[1] || 0) + (ranch.cowActive[2] || 0) + (ranch.cowActive[3] || 0);
    const inactiveCows = totalCows - activeCows;
    
    // Calculate daily production
    const dailyProd = (ranch.cowActive[1] || 0) * window.CONFIG.COW_PRODUCTION_DAILY[1] +
                      (ranch.cowActive[2] || 0) * window.CONFIG.COW_PRODUCTION_DAILY[2] +
                      (ranch.cowActive[3] || 0) * window.CONFIG.COW_PRODUCTION_DAILY[3];
    
    ranch.dailyProduction = dailyProd;
    ranch.hourlyProduction = dailyProd / 24;
    
    const overviewCard = document.getElementById('ranchOverviewCard');
    if (!overviewCard) return;
    
    overviewCard.innerHTML = `
        <div class="overview-title">
            <i class="fas fa-chart-pie"></i> Ranch Overview
        </div>
        
        <div class="overview-stats-grid">
            <div class="overview-glass-card">
                <div class="overview-label">Total Cows</div>
                <div class="overview-value total-cows">
                    <i class="fas fa-cow"></i> ${totalCows}
                </div>
            </div>
            <div class="overview-glass-card">
                <div class="overview-label">Active Cows</div>
                <div class="overview-value active-cows">
                    <i class="fas fa-check-circle"></i> ${activeCows}
                </div>
            </div>
            <div class="overview-glass-card">
                <div class="overview-label">Inactive Cows</div>
                <div class="overview-value inactive-cows">
                    <i class="fas fa-clock"></i> ${inactiveCows}
                </div>
            </div>
        </div>
        
        <div class="overview-production-box">
            <div class="production-info">
                <span class="production-label">Daily Production</span>
                <span class="production-value">
                    ${window.formatNumber(dailyProd)} <span class="production-unit">🥛/day</span>
                </span>
            </div>
            <div class="production-timer">
                <i class="fas fa-hourglass-half"></i>
                <span id="ranchProductionTimer">00:00</span>
            </div>
        </div>
        
        <div class="overview-storage-row">
            <div class="storage-info">
                <i class="fas fa-database"></i>
                <span>Storage:</span>
                <span class="storage-value">${window.formatNumber(ranch.milkStored)} / ${window.formatNumber(ranch.storageCapacity)}</span>
            </div>
            <div class="storage-progress-mini">
                <div class="storage-progress-fill-mini" style="width: ${(ranch.milkStored / ranch.storageCapacity) * 100}%"></div>
            </div>
        </div>
    `;
}

/**
 * Update cow levels UI
 */
function updateCowLevelsUI() {
    if (!window.App.ranch) return;
    
    const ranch = window.App.ranch;
    const levelsContainer = document.getElementById('cowLevelsContainer');
    if (!levelsContainer) return;
    
    levelsContainer.innerHTML = `
        <div class="cow-levels-main-card">
            <div class="cow-levels-title">
                <i class="fas fa-chart-bar"></i> Cow Levels
            </div>
            
            ${renderLevelPanel(1, '🐮', 'Level 1 Cow', ranch)}
            ${renderLevelPanel(2, '🦬', 'Level 2 Cow', ranch)}
            ${renderLevelPanel(3, '🐃', 'Level 3 Cow', ranch)}
        </div>
    `;
    
    // Add event listeners after rendering
    setupLevelButtons();
}

/**
 * Render a level panel
 * @param {number} level - Level number
 * @param {string} emoji - Level emoji
 * @param {string} name - Level name
 * @param {object} ranch - Ranch data
 * @returns {string} HTML string
 */
function renderLevelPanel(level, emoji, name, ranch) {
    const available = ranch.cowLevels[level] || 0;
    const active = ranch.cowActive[level] || 0;
    const dailyProd = window.CONFIG.COW_PRODUCTION_DAILY[level] || 0;
    
    let badgeClass = 'level-badge';
    let badgeText = 'Locked';
    
    if (available > 0) {
        badgeText = active > 0 ? 'Active' : 'Available';
        badgeClass += active > 0 ? '' : ' available';
    } else {
        badgeClass += ' locked';
    }
    
    const showInactiveBadge = available > 0 && active === 0;
    const canUpgrade = level < 3 && available > 0;
    const canActivate = available > 0 && active === 0;
    
    return `
        <div class="cow-level-panel level-${level}" id="level${level}Panel">
            ${showInactiveBadge ? '<div class="inactive-badge">INACTIVE</div>' : ''}
            
            <div class="level-panel-header">
                <div class="level-title">
                    <span class="level-emoji">${emoji}</span>
                    <span class="level-name">${name}</span>
                </div>
                <span class="${badgeClass}">${badgeText}</span>
            </div>
            
            <div class="level-stats-grid">
                <div class="level-stat-card">
                    <div class="level-stat-label">Available</div>
                    <div class="level-stat-value">${available}</div>
                </div>
                <div class="level-stat-card">
                    <div class="level-stat-label">Active</div>
                    <div class="level-stat-value active">${active}</div>
                </div>
                <div class="level-stat-card">
                    <div class="level-stat-label">Production</div>
                    <div class="level-stat-value production">${dailyProd} <span class="stat-unit">/day</span></div>
                </div>
            </div>
            
            <div class="level-actions">
                ${level < 3 ? `
                    <button class="level-action-btn upgrade" id="upgradeLevel${level}Btn" 
                            onclick="openUpgradePopup(${level})" ${!canUpgrade ? 'disabled' : ''}>
                        <i class="fas fa-arrow-up"></i> Upgrade
                    </button>
                ` : ''}
                <button class="level-action-btn activate" id="activateLevel${level}Btn" 
                        onclick="openActivatePopup(${level}, ${window.CONFIG.COW_ACTIVATION_COST[level]})" 
                        ${!canActivate ? 'disabled' : ''}>
                    <i class="fas fa-play"></i> Activate
                </button>
            </div>
            
            <div class="active-timer" id="level${level}Timer" style="${ranch.cowActiveUntil[level] ? 'display: flex;' : 'display: none;'}">
                <i class="fas fa-clock"></i> Active for: 
                <span id="level${level}TimeRemaining">${getTimeRemaining(ranch.cowActiveUntil[level])}</span>
            </div>
        </div>
    `;
}

/**
 * Get time remaining for active cows
 * @param {number} timestamp - Expiry timestamp
 * @returns {string} Time remaining string
 */
function getTimeRemaining(timestamp) {
    if (!timestamp) return '0h 0m';
    const remaining = timestamp - Date.now();
    if (remaining <= 0) return '0h 0m';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

/**
 * Setup level buttons event listeners
 */
function setupLevelButtons() {
    // Additional event listeners if needed
}

/**
 * Update cow supply UI
 */
function updateCowSupplyUI() {
    const cowsSold = window.App.global?.cows_sold || 0;
    const cowsCap = 1000;
    const progressPercent = (cowsSold / cowsCap) * 100;
    const remaining = cowsCap - cowsSold;
    
    const supplyCard = document.getElementById('cowSupplyCard');
    if (!supplyCard) return;
    
    supplyCard.innerHTML = `
        <div class="supply-title">
            <i class="fas fa-chart-line"></i> Cow Supply Progress
        </div>
        <div class="supply-progress-container">
            <div class="supply-progress-header">
                <span>Progress</span>
                <span>${cowsSold} / ${cowsCap}</span>
            </div>
            <div class="supply-progress-bar">
                <div class="supply-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="supply-remaining">
                <span>${remaining}</span> cows remaining
            </div>
        </div>
    `;
}

/**
 * Update storage UI
 */
function updateStorageUI() {
    if (!window.App.ranch) return;
    
    const ranch = window.App.ranch;
    const storageCard = document.getElementById('storageCard');
    if (!storageCard) return;
    
    const storagePercent = (ranch.milkStored / ranch.storageCapacity) * 100;
    
    storageCard.innerHTML = `
        <div class="storage-background">
            <img src="https://i.ibb.co/BKHhxhh3/Chat-GPT-Image-4-2026-05-41-33.png" alt="Milk Storage">
        </div>
        <div class="storage-content">
            <div class="storage-header">
                <div class="storage-title">
                    <i class="fas fa-database"></i> Milk Storage
                </div>
                ${ranch.storageFull ? '<div class="storage-full-badge">FULL</div>' : ''}
            </div>
            
            <div class="storage-stats-grid">
                <div class="storage-stat-item">
                    <div class="storage-stat-label">Level</div>
                    <div class="storage-stat-value">${ranch.storageLevel}</div>
                </div>
                <div class="storage-stat-item">
                    <div class="storage-stat-label">Capacity</div>
                    <div class="storage-stat-value">${window.formatNumber(ranch.storageCapacity)}</div>
                </div>
            </div>
            
            <div class="storage-progress-container">
                <div class="storage-progress-header">
                    <span>Stored:</span>
                    <span>${window.formatNumber(ranch.milkStored)} / ${window.formatNumber(ranch.storageCapacity)}</span>
                </div>
                <div class="storage-progress-bar">
                    <div class="storage-progress-fill" style="width: ${storagePercent}%"></div>
                </div>
            </div>
            
            <div class="storage-actions">
                <button class="storage-action-btn claim" onclick="claimMilk()">
                    <i class="fas fa-hand-holding-heart"></i> Claim
                </button>
                <button class="storage-action-btn upgrade" onclick="upgradeStorage()">
                    <i class="fas fa-arrow-up"></i> Upgrade
                </button>
            </div>
        </div>
    `;
}

// ===== ACTIVATE POPUP FUNCTIONS =====

/**
 * Open activate popup
 * @param {number} level - Cow level
 * @param {number} costPerCow - Cost per cow
 */
function openActivatePopup(level, costPerCow) {
    window.App.activateLevel = level;
    window.App.activateCostPerCow = costPerCow;
    
    const levelNames = {
        1: 'Level 1 Cow',
        2: 'Level 2 Cow',
        3: 'Level 3 Cow'
    };
    
    const availableCows = window.App.ranch.cowLevels[level] || 0;
    window.App.activateMax = availableCows;
    
    document.getElementById('activatePopupLevel').innerHTML = levelNames[level];
    document.getElementById('activatePopupAvailable').innerHTML = `Available: ${availableCows} cows`;
    document.getElementById('activateAmount').value = 1;
    document.getElementById('activateAmount').max = availableCows;
    
    updateActivateCost();
    document.getElementById('activatePopup').classList.add('active');
}

/**
 * Close activate popup
 */
function closeActivatePopup() {
    document.getElementById('activatePopup').classList.remove('active');
}

/**
 * Set activate amount
 * @param {number|string} value - Amount or 'all'
 */
function setActivateAmount(value) {
    const available = window.App.activateMax;
    if (value === 'all') {
        document.getElementById('activateAmount').value = available;
    } else {
        document.getElementById('activateAmount').value = Math.min(value, available);
    }
    updateActivateCost();
}

/**
 * Update activate cost
 */
function updateActivateCost() {
    const amount = parseInt(document.getElementById('activateAmount').value) || 1;
    const available = window.App.activateMax;
    
    if (amount > available) {
        document.getElementById('activateAmount').value = available;
    }
    
    const cost = amount * window.App.activateCostPerCow;
    document.getElementById('activateCostAmount').innerHTML = window.formatNumber(cost);
    
    const confirmBtn = document.getElementById('activateConfirmBtn');
    if (cost > window.App.ranch.milkStored) {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
    } else {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
    }
}

/**
 * Confirm activation
 */
async function confirmActivation() {
    const amount = parseInt(document.getElementById('activateAmount').value) || 1;
    const level = window.App.activateLevel;
    const buttonId = 'activateConfirmBtn';
    const button = document.getElementById('activateConfirmBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        const result = await window.callAPI('activateCows', { level, amount });
        await window.loadGameState();
        window.showNotification(`✅ Activated ${amount} Level ${level} cow(s)`, 'success');
        closeActivatePopup();
    } catch (error) {
        console.error('Activation error:', error);
        window.showNotification(error.message, 'error');
    }
}

// ===== UPGRADE POPUP FUNCTIONS =====

/**
 * Open upgrade popup
 * @param {number} fromLevel - Level to upgrade from
 */
function openUpgradePopup(fromLevel) {
    window.App.upgradeFromLevel = fromLevel;
    const toLevel = fromLevel + 1;
    
    const levelNames = {
        1: 'Level 1 → Level 2',
        2: 'Level 2 → Level 3'
    };
    
    const availableCows = window.App.ranch.cowLevels[fromLevel] || 0;
    window.App.upgradeMax = availableCows;
    window.App.upgradeCostPerCow = window.CONFIG.COW_UPGRADE_COST[fromLevel] || 0;
    
    document.getElementById('upgradePopupLevel').innerHTML = levelNames[fromLevel];
    document.getElementById('upgradePopupAvailable').innerHTML = `Available: ${availableCows} cows`;
    document.getElementById('upgradeAmount').value = 1;
    document.getElementById('upgradeAmount').max = availableCows;
    
    updateUpgradeCost();
    document.getElementById('upgradePopup').classList.add('active');
}

/**
 * Close upgrade popup
 */
function closeUpgradePopup() {
    document.getElementById('upgradePopup').classList.remove('active');
}

/**
 * Set upgrade amount
 * @param {number|string} value - Amount or 'all'
 */
function setUpgradeAmount(value) {
    const available = window.App.upgradeMax;
    if (value === 'all') {
        document.getElementById('upgradeAmount').value = available;
    } else {
        document.getElementById('upgradeAmount').value = Math.min(value, available);
    }
    updateUpgradeCost();
}

/**
 * Update upgrade cost
 */
function updateUpgradeCost() {
    const amount = parseInt(document.getElementById('upgradeAmount').value) || 1;
    const available = window.App.upgradeMax;
    
    if (amount > available) {
        document.getElementById('upgradeAmount').value = available;
    }
    
    const cost = amount * window.App.upgradeCostPerCow;
    document.getElementById('upgradeCostAmount').innerHTML = window.formatNumber(cost);
    
    const confirmBtn = document.getElementById('upgradeConfirmBtn');
    if (cost > window.App.ranch.milkStored) {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
    } else {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
    }
}

/**
 * Confirm upgrade
 */
async function confirmUpgrade() {
    const amount = parseInt(document.getElementById('upgradeAmount').value) || 1;
    const fromLevel = window.App.upgradeFromLevel;
    const buttonId = 'upgradeConfirmBtn';
    const button = document.getElementById('upgradeConfirmBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        const result = await window.callAPI('upgradeCowLevel', { fromLevel, amount });
        await window.loadGameState();
        window.showNotification(`✅ Upgraded ${amount} Level ${fromLevel} cow(s) to Level ${fromLevel + 1}`, 'success');
        closeUpgradePopup();
    } catch (error) {
        console.error('Upgrade error:', error);
        window.showNotification(error.message, 'error');
    }
}

// ===== BUY COWS POPUP FUNCTIONS =====

/**
 * Open buy cows popup
 */
function openBuyCowsPopup() {
    const availableCows = window.App.global?.cows_remaining || 1000;
    
    document.getElementById('buyCowsAvailable').innerHTML = `Available: ${availableCows} cows`;
    document.getElementById('buyAmount').value = 1;
    document.getElementById('buyAmount').max = availableCows;
    
    updateBuyCost();
    document.getElementById('buyCowsPopup').classList.add('active');
}

/**
 * Close buy cows popup
 */
function closeBuyCowsPopup() {
    document.getElementById('buyCowsPopup').classList.remove('active');
}

/**
 * Set buy amount
 * @param {number|string} value - Amount or 'max'
 */
function setBuyAmount(value) {
    const available = window.App.global?.cows_remaining || 1000;
    if (value === 'max') {
        document.getElementById('buyAmount').value = available;
    } else {
        document.getElementById('buyAmount').value = Math.min(value, available);
    }
    updateBuyCost();
}

/**
 * Update buy cost
 */
function updateBuyCost() {
    const amount = parseInt(document.getElementById('buyAmount').value) || 1;
    const available = window.App.global?.cows_remaining || 1000;
    
    if (amount > available) {
        document.getElementById('buyAmount').value = available;
    }
    
    const cost = amount * 1; // 1 TON per cow
    document.getElementById('buyCostAmount').innerHTML = window.formatTON(cost);
    
    const confirmBtn = document.getElementById('buyCowsConfirmBtn');
    const userBalance = window.App.user?.tonBalance || 0;
    
    if (cost > userBalance || amount > available) {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
    } else {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
    }
}

/**
 * Confirm buy cows
 */
async function confirmBuyCows() {
    const amount = parseInt(document.getElementById('buyAmount').value) || 1;
    const buttonId = 'buyCowsConfirmBtn';
    const button = document.getElementById('buyCowsConfirmBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        const result = await window.callAPI('buyCow', { quantity: amount });
        await window.loadGameState();
        window.animateTonBalance();
        window.showNotification(
            window.App.currentLanguage === 'ru' 
                ? `✅ Куплено ${result.quantity_bought} коров(а) за ${result.quantity_bought} TON`
                : `✅ Bought ${result.quantity_bought} Cow(s) for ${result.quantity_bought} TON`,
            'success'
        );
        closeBuyCowsPopup();
    } catch (error) {
        console.error('Buy cows error:', error);
        window.showNotification(error.message, 'error');
    }
}

// ===== STORAGE FUNCTIONS =====

/**
 * Claim milk from storage
 */
async function claimMilk() {
    const buttonId = 'claimMilkBtn';
    const button = document.getElementById('claimMilkBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        const result = await window.callAPI('claimMilk');
        await window.loadGameState();
        window.showNotification(`✅ Claimed ${window.formatNumber(result.claimed)} 🥛`, 'success');
    } catch (error) {
        console.error('Claim error:', error);
        window.showNotification(error.message, 'error');
    }
}

/**
 * Upgrade milk storage
 */
async function upgradeStorage() {
    const buttonId = 'upgradeStorageBtn';
    const button = document.getElementById('upgradeStorageBtn');
    
    if (!window.validateAndCooldown(buttonId, button)) return;
    
    try {
        const result = await window.callAPI('upgradeMilkStorage');
        await window.loadGameState();
        window.showNotification(`✅ Storage upgraded to Level ${result.newLevel}`, 'success');
    } catch (error) {
        console.error('Upgrade storage error:', error);
        window.showNotification(error.message, 'error');
    }
}

// ===== EXPORT FUNCTIONS TO WINDOW =====
window.openRanchPage = openRanchPage;
window.closeRanchPage = closeRanchPage;
window.updateRanchOverview = updateRanchOverview;
window.updateCowLevelsUI = updateCowLevelsUI;
window.updateCowSupplyUI = updateCowSupplyUI;
window.updateStorageUI = updateStorageUI;

window.openActivatePopup = openActivatePopup;
window.closeActivatePopup = closeActivatePopup;
window.setActivateAmount = setActivateAmount;
window.updateActivateCost = updateActivateCost;
window.confirmActivation = confirmActivation;

window.openUpgradePopup = openUpgradePopup;
window.closeUpgradePopup = closeUpgradePopup;
window.setUpgradeAmount = setUpgradeAmount;
window.updateUpgradeCost = updateUpgradeCost;
window.confirmUpgrade = confirmUpgrade;

window.openBuyCowsPopup = openBuyCowsPopup;
window.closeBuyCowsPopup = closeBuyCowsPopup;
window.setBuyAmount = setBuyAmount;
window.updateBuyCost = updateBuyCost;
window.confirmBuyCows = confirmBuyCows;

window.claimMilk = claimMilk;
window.upgradeStorage = upgradeStorage;
