// ==================== RANCH FUNCTIONS ====================

// Open Ranch Page
window.openRanch = function() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('sectionRanch').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (window.App && window.App.ranch) {
        window.updateRanchUI();
    }
};

// Close Ranch Page
window.closeRanch = function() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('sectionFarm').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('.nav-item[data-section="sectionFarm"]').classList.add('active');
};

// Open Activate Popup
window.openActivatePopup = function(level, costPerCow) {
    if (!window.App) return;
    
    window.App.activateLevel = level;
    window.App.activateCostPerCow = costPerCow;
    
    const levelNames = { 1: 'Level 1 Cow', 2: 'Level 2 Cow', 3: 'Level 3 Cow' };
    const availableCows = window.App.ranch.cowLevels[level] || 0;
    
    const popupLevel = document.getElementById('activatePopupLevel');
    const popupAvailable = document.getElementById('activatePopupAvailable');
    const activateAmount = document.getElementById('activateAmount');
    
    if (popupLevel) popupLevel.innerHTML = levelNames[level];
    if (popupAvailable) popupAvailable.innerHTML = `Available: ${availableCows} cows`;
    
    if (activateAmount) {
        activateAmount.value = 1;
        activateAmount.max = availableCows;
    }
    
    updateActivateCost();
    
    const popup = document.getElementById('activatePopup');
    if (popup) popup.classList.add('active');
};

// Close Activate Popup
window.closeActivatePopup = function() {
    const popup = document.getElementById('activatePopup');
    if (popup) popup.classList.remove('active');
};

// Set Activate Amount
window.setActivateAmount = function(value) {
    if (!window.App) return;
    
    const available = window.App.ranch.cowLevels[window.App.activateLevel] || 0;
    const activateAmount = document.getElementById('activateAmount');
    
    if (activateAmount) {
        if (value === 'all') {
            activateAmount.value = available;
        } else {
            activateAmount.value = Math.min(value, available);
        }
    }
    
    updateActivateCost();
};

// Update Activate Cost
function updateActivateCost() {
    if (!window.App) return;
    
    const activateAmount = document.getElementById('activateAmount');
    const activateCostAmount = document.getElementById('activateCostAmount');
    const activateConfirmBtn = document.getElementById('activateConfirmBtn');
    
    if (!activateAmount || !activateCostAmount || !activateConfirmBtn) return;
    
    const amount = parseInt(activateAmount.value) || 1;
    const available = window.App.ranch.cowLevels[window.App.activateLevel] || 0;
    
    if (amount > available) {
        activateAmount.value = available;
    }
    
    const cost = amount * window.App.activateCostPerCow;
    activateCostAmount.innerHTML = window.formatNumber ? window.formatNumber(cost) : cost;
    
    if (cost > (window.App.ranch.milkStored || 0)) {
        activateConfirmBtn.disabled = true;
        activateConfirmBtn.style.opacity = '0.5';
    } else {
        activateConfirmBtn.disabled = false;
        activateConfirmBtn.style.opacity = '1';
    }
}

// Confirm Activation
window.confirmActivation = async function() {
    if (!window.App) return;
    
    const activateAmount = document.getElementById('activateAmount');
    if (!activateAmount) return;
    
    const amount = parseInt(activateAmount.value) || 1;
    const level = window.App.activateLevel;
    
    const buttonId = 'activateConfirmBtn';
    const button = document.getElementById('activateConfirmBtn');
    
    if (window.validateAndCooldown && !window.validateAndCooldown(buttonId, button)) {
        return;
    }
    
    try {
        const result = await window.callAPI('activateCows', { level, amount });
        
        if (window.loadGameState) {
            await window.loadGameState();
        }
        
        if (window.showNotification) {
            window.showNotification(
                `✅ Activated ${amount} Level ${level} cow(s)`,
                'success'
            );
        }
        
        window.closeActivatePopup();
        
    } catch (error) {
        console.error('Activation error:', error);
        if (window.showNotification) {
            window.showNotification(error.message, 'error');
        }
    }
};

// Upgrade Cow Level
window.upgradeCowLevel = async function(fromLevel) {
    if (!window.App) return;
    
    const buttonId = `upgradeLevel${fromLevel}Btn`;
    const button = document.getElementById(buttonId);
    
    if (window.validateAndCooldown && !window.validateAndCooldown(buttonId, button)) {
        return;
    }
    
    try {
        const result = await window.callAPI('upgradeCowLevel', { fromLevel, amount: 1 });
        
        if (window.loadGameState) {
            await window.loadGameState();
        }
        
        if (window.showNotification) {
            window.showNotification(
                `✅ Upgraded 1 Level ${fromLevel} cow to Level ${fromLevel + 1}`,
                'success'
            );
        }
        
    } catch (error) {
        console.error('Upgrade error:', error);
        if (window.showNotification) {
            window.showNotification(error.message, 'error');
        }
    }
};

// Claim Milk
window.claimMilk = async function() {
    if (!window.App) return;
    
    const buttonId = 'claimMilkBtn';
    const button = document.getElementById('claimMilkBtn');
    
    if (window.validateAndCooldown && !window.validateAndCooldown(buttonId, button)) {
        return;
    }
    
    try {
        const result = await window.callAPI('claimMilk');
        
        if (window.loadGameState) {
            await window.loadGameState();
        }
        
        if (window.showNotification) {
            window.showNotification(
                `✅ Claimed ${window.formatNumber ? window.formatNumber(result.claimed) : result.claimed} 🥛`,
                'success'
            );
        }
        
    } catch (error) {
        console.error('Claim error:', error);
        if (window.showNotification) {
            window.showNotification(error.message, 'error');
        }
    }
};

// Upgrade Storage
window.upgradeStorage = async function() {
    if (!window.App) return;
    
    const buttonId = 'upgradeStorageBtn';
    const button = document.getElementById('upgradeStorageBtn');
    
    if (window.validateAndCooldown && !window.validateAndCooldown(buttonId, button)) {
        return;
    }
    
    try {
        const result = await window.callAPI('upgradeMilkStorage');
        
        if (window.loadGameState) {
            await window.loadGameState();
        }
        
        if (window.showNotification) {
            window.showNotification(
                `✅ Storage upgraded to Level ${result.newLevel}`,
                'success'
            );
        }
        
    } catch (error) {
        console.error('Upgrade storage error:', error);
        if (window.showNotification) {
            window.showNotification(error.message, 'error');
        }
    }
};

// Update Ranch UI
window.updateRanchUI = function() {
    if (!window.App || !window.App.ranch) return;
    
    const ranch = window.App.ranch;
    
    // Overview stats
    const totalCows = (ranch.cowLevels[1] || 0) + (ranch.cowLevels[2] || 0) + (ranch.cowLevels[3] || 0);
    const activeCows = (ranch.cowActive[1] || 0) + (ranch.cowActive[2] || 0) + (ranch.cowActive[3] || 0);
    const inactiveCows = totalCows - activeCows;
    
    const totalCowsOverview = document.getElementById('totalCowsOverview');
    const activeCowsOverview = document.getElementById('activeCowsOverview');
    const inactiveCowsOverview = document.getElementById('inactiveCowsOverview');
    const hourlyProductionOverview = document.getElementById('hourlyProductionOverview');
    const storageOverview = document.getElementById('storageOverview');
    
    if (totalCowsOverview) totalCowsOverview.innerHTML = totalCows;
    if (activeCowsOverview) activeCowsOverview.innerHTML = activeCows;
    if (inactiveCowsOverview) inactiveCowsOverview.innerHTML = inactiveCows;
    if (hourlyProductionOverview) hourlyProductionOverview.innerHTML = Math.round(ranch.hourlyProduction * 10) / 10;
    if (storageOverview) storageOverview.innerHTML = `${window.formatNumber ? window.formatNumber(ranch.milkStored) : ranch.milkStored}/${window.formatNumber ? window.formatNumber(ranch.storageCapacity) : ranch.storageCapacity}`;
    
    // Cow progress
    const cowsSold = window.App.global?.cows_sold || 0;
    const cowsCap = 1000;
    const progressPercent = (cowsSold / cowsCap) * 100;
    
    const cowProgressTextRanch = document.getElementById('cowProgressTextRanch');
    const cowProgressFillRanch = document.getElementById('cowProgressFillRanch');
    const cowsRemainingRanch = document.getElementById('cowsRemainingRanch');
    
    if (cowProgressTextRanch) cowProgressTextRanch.innerHTML = `${cowsSold}/${cowsCap}`;
    if (cowProgressFillRanch) cowProgressFillRanch.style.width = `${progressPercent}%`;
    if (cowsRemainingRanch) cowsRemainingRanch.innerHTML = cowsCap - cowsSold;
    
    // Level 1
    const level1Available = document.getElementById('level1Available');
    const level1Active = document.getElementById('level1Active');
    const level1Badge = document.getElementById('level1Badge');
    
    if (level1Available) level1Available.innerHTML = ranch.cowLevels[1] || 0;
    if (level1Active) level1Active.innerHTML = ranch.cowActive[1] || 0;
    
    if (level1Badge) {
        if (ranch.cowActive[1] > 0) {
            level1Badge.innerHTML = 'Active';
            level1Badge.style.background = 'rgba(0, 242, 122, 0.15)';
            level1Badge.style.color = 'var(--neon-green)';
            level1Badge.style.borderColor = 'var(--neon-green)';
        } else {
            level1Badge.innerHTML = 'Available';
            level1Badge.style.background = 'rgba(255, 255, 255, 0.1)';
            level1Badge.style.color = 'var(--text-secondary)';
            level1Badge.style.borderColor = 'transparent';
        }
    }
    
    // Level 1 Timer
    const level1Timer = document.getElementById('level1Timer');
    const level1TimeRemaining = document.getElementById('level1TimeRemaining');
    
    if (ranch.cowActiveUntil && ranch.cowActiveUntil[1]) {
        const remaining = ranch.cowActiveUntil[1] - Date.now();
        if (remaining > 0 && level1Timer && level1TimeRemaining) {
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            level1Timer.style.display = 'block';
            level1TimeRemaining.innerHTML = `${hours}h ${minutes}m`;
        } else if (level1Timer) {
            level1Timer.style.display = 'none';
        }
    } else if (level1Timer) {
        level1Timer.style.display = 'none';
    }
    
    // Level 2
    const level2Available = document.getElementById('level2Available');
    const level2Active = document.getElementById('level2Active');
    const level2Badge = document.getElementById('level2Badge');
    const upgradeLevel2Btn = document.getElementById('upgradeLevel2Btn');
    const activateLevel2Btn = document.getElementById('activateLevel2Btn');
    
    if (level2Available) level2Available.innerHTML = ranch.cowLevels[2] || 0;
    if (level2Active) level2Active.innerHTML = ranch.cowActive[2] || 0;
    
    const level2Unlocked = (ranch.cowLevels[2] || 0) > 0;
    if (level2Badge) {
        if (level2Unlocked) {
            level2Badge.innerHTML = ranch.cowActive[2] > 0 ? 'Active' : 'Available';
            level2Badge.style.background = ranch.cowActive[2] > 0 ? 'rgba(0, 242, 122, 0.15)' : 'rgba(255, 255, 255, 0.1)';
            level2Badge.style.color = ranch.cowActive[2] > 0 ? 'var(--neon-green)' : 'var(--text-secondary)';
        } else {
            level2Badge.innerHTML = 'Locked';
            level2Badge.style.background = 'rgba(255, 255, 255, 0.05)';
            level2Badge.style.color = 'var(--text-muted)';
        }
    }
    
    if (upgradeLevel2Btn) upgradeLevel2Btn.disabled = !level2Unlocked;
    if (activateLevel2Btn) activateLevel2Btn.disabled = !level2Unlocked;
    
    // Level 2 Timer
    const level2Timer = document.getElementById('level2Timer');
    const level2TimeRemaining = document.getElementById('level2TimeRemaining');
    
    if (ranch.cowActiveUntil && ranch.cowActiveUntil[2]) {
        const remaining = ranch.cowActiveUntil[2] - Date.now();
        if (remaining > 0 && level2Timer && level2TimeRemaining) {
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            level2Timer.style.display = 'block';
            level2TimeRemaining.innerHTML = `${hours}h ${minutes}m`;
        } else if (level2Timer) {
            level2Timer.style.display = 'none';
        }
    } else if (level2Timer) {
        level2Timer.style.display = 'none';
    }
    
    // Level 3
    const level3Available = document.getElementById('level3Available');
    const level3Active = document.getElementById('level3Active');
    const level3Badge = document.getElementById('level3Badge');
    const activateLevel3Btn = document.getElementById('activateLevel3Btn');
    
    if (level3Available) level3Available.innerHTML = ranch.cowLevels[3] || 0;
    if (level3Active) level3Active.innerHTML = ranch.cowActive[3] || 0;
    
    const level3Unlocked = (ranch.cowLevels[3] || 0) > 0;
    if (level3Badge) {
        if (level3Unlocked) {
            level3Badge.innerHTML = ranch.cowActive[3] > 0 ? 'Active' : 'Available';
            level3Badge.style.background = ranch.cowActive[3] > 0 ? 'rgba(0, 242, 122, 0.15)' : 'rgba(255, 255, 255, 0.1)';
            level3Badge.style.color = ranch.cowActive[3] > 0 ? 'var(--neon-green)' : 'var(--text-secondary)';
        } else {
            level3Badge.innerHTML = 'Locked';
            level3Badge.style.background = 'rgba(255, 255, 255, 0.05)';
            level3Badge.style.color = 'var(--text-muted)';
        }
    }
    
    if (activateLevel3Btn) activateLevel3Btn.disabled = !level3Unlocked;
    
    // Level 3 Timer
    const level3Timer = document.getElementById('level3Timer');
    const level3TimeRemaining = document.getElementById('level3TimeRemaining');
    
    if (ranch.cowActiveUntil && ranch.cowActiveUntil[3]) {
        const remaining = ranch.cowActiveUntil[3] - Date.now();
        if (remaining > 0 && level3Timer && level3TimeRemaining) {
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            level3Timer.style.display = 'block';
            level3TimeRemaining.innerHTML = `${hours}h ${minutes}m`;
        } else if (level3Timer) {
            level3Timer.style.display = 'none';
        }
    } else if (level3Timer) {
        level3Timer.style.display = 'none';
    }
    
    // Inactive badges
    const level1InactiveBadge = document.getElementById('level1InactiveBadge');
    const level2InactiveBadge = document.getElementById('level2InactiveBadge');
    const level3InactiveBadge = document.getElementById('level3InactiveBadge');
    
    if (level1InactiveBadge) {
        level1InactiveBadge.style.display = 
            (ranch.cowLevels[1] || 0) > 0 && (ranch.cowActive[1] || 0) === 0 ? 'block' : 'none';
    }
    
    if (level2InactiveBadge) {
        level2InactiveBadge.style.display = 
            (ranch.cowLevels[2] || 0) > 0 && (ranch.cowActive[2] || 0) === 0 ? 'block' : 'none';
    }
    
    if (level3InactiveBadge) {
        level3InactiveBadge.style.display = 
            (ranch.cowLevels[3] || 0) > 0 && (ranch.cowActive[3] || 0) === 0 ? 'block' : 'none';
    }
    
    // Storage
    const storageLevel = document.getElementById('storageLevel');
    const storageCapacity = document.getElementById('storageCapacity');
    const milkStored = document.getElementById('milkStored');
    const milkCapacity = document.getElementById('milkCapacity');
    const storageProgressFill = document.getElementById('storageProgressFill');
    const storageFullBadge = document.getElementById('storageFullBadge');
    
    if (storageLevel) storageLevel.innerHTML = ranch.storageLevel;
    if (storageCapacity) storageCapacity.innerHTML = window.formatNumber ? window.formatNumber(ranch.storageCapacity) : ranch.storageCapacity;
    if (milkStored) milkStored.innerHTML = window.formatNumber ? window.formatNumber(ranch.milkStored) : ranch.milkStored;
    if (milkCapacity) milkCapacity.innerHTML = window.formatNumber ? window.formatNumber(ranch.storageCapacity) : ranch.storageCapacity;
    
    const storagePercent = (ranch.milkStored / ranch.storageCapacity) * 100;
    if (storageProgressFill) storageProgressFill.style.width = `${storagePercent}%`;
    
    if (storageFullBadge) {
        storageFullBadge.style.display = ranch.storageFull ? 'block' : 'none';
    }
};

// Initialize event listeners for ranch
document.addEventListener('DOMContentLoaded', function() {
    const openRanchBtn = document.getElementById('openRanchBtn');
    const backFromRanchBtn = document.getElementById('backFromRanchBtn');
    const buyCowRanchBtn = document.getElementById('buyCowRanchBtn');
    const activateAmount = document.getElementById('activateAmount');
    
    if (openRanchBtn) openRanchBtn.addEventListener('click', window.openRanch);
    if (backFromRanchBtn) backFromRanchBtn.addEventListener('click', window.closeRanch);
    if (buyCowRanchBtn) buyCowRanchBtn.addEventListener('click', window.buyCowRanch || window.buyCow);
    if (activateAmount) activateAmount.addEventListener('input', updateActivateCost);
});
