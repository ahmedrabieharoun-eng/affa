        function updateRanchUI() {
            if (!App.ranch) return;
            let r = App.ranch;
            let totalCows = (r.cowLevels[1] || 0) + (r.cowLevels[2] || 0) + (r.cowLevels[3] || 0) +
                (r.cowActive[1] || 0) + (r.cowActive[2] || 0) + (r.cowActive[3] || 0);
            let activeCows = (r.cowActive[1] || 0) + (r.cowActive[2] || 0) + (r.cowActive[3] || 0);
            let inactiveCows = totalCows - activeCows;

            document.getElementById('ranchTotalCows').innerHTML = totalCows;
            document.getElementById('ranchActiveCows').innerHTML = activeCows;
            document.getElementById('ranchInactiveCows').innerHTML = inactiveCows >= 0 ? inactiveCows : 0;

            let hourlyProduction = r.hourlyProduction || 0;
            document.getElementById('ranchHourlyProduction').innerHTML = Math.round(hourlyProduction);

            let cowsSold = App.global?.cows_sold || 0;
            document.getElementById('ranchCowsSold').innerHTML = cowsSold + '/1000';
            document.getElementById('ranchCowsProgress').style.width = (cowsSold / 10) + '%';

            for (let level = 1; level <= 3; level++) {
                let levelCows = (r.cowLevels[level] || 0);
                let activeCowsLevel = (r.cowActive[level] || 0);
                let inactiveCowsLevel = levelCows;

                document.getElementById(`level${level}Count`).innerHTML = (levelCows + activeCowsLevel) + ' cows';
                document.getElementById(`level${level}Active`).innerHTML = activeCowsLevel;
                document.getElementById(`level${level}Inactive`).innerHTML = inactiveCowsLevel;
            }

            let milkStored = r.milkStored || 0;
            let storageLevel = r.storageLevel || 1;
            let storageCapacity = r.storageCapacity || 2000;

            document.getElementById('milkStored').innerHTML = formatNumber(milkStored);
            document.getElementById('storageLevel').innerHTML = storageLevel + '/10';
            document.getElementById('storageCapacity').innerHTML = formatNumber(storageCapacity);
            document.getElementById('storageProgressFill').style.width = (milkStored / storageCapacity * 100) + '%';

            updateCowTimers();
        }

        function updateCowTimers() {
            if (!App.ranch || !App.ranch.cowActiveUntil) return;

            let now = Math.floor(Date.now() / 1000);

            for (let level = 1; level <= 3; level++) {
                let timerDiv = document.getElementById(`level${level}Timer`);
                let timerText = document.getElementById(`level${level}TimerText`);
                let activeCows = App.ranch.cowActive[level] || 0;

                if (activeCows > 0 && App.ranch.cowActiveUntil[level]) {
                    // Auto-detect: if value > 1e10 it's milliseconds, convert to seconds
                    let rawUntil = App.ranch.cowActiveUntil[level];
                    let untilSeconds = rawUntil > 1e10 ? Math.floor(rawUntil / 1000) : rawUntil;
                    let timeLeft = untilSeconds - now;

                    if (timeLeft > 0) {
                        let hours = Math.floor(timeLeft / 3600);
                        let minutes = Math.floor((timeLeft % 3600) / 60);
                        let seconds = Math.floor((timeLeft % 60));
                        timerText.innerHTML = `${hours}h ${minutes}m ${seconds}s`;
                        timerDiv.style.display = 'flex';
                        timerDiv.className = 'timer-bar active';
                        timerText.className = 'timer-text active';
                    } else {
                        timerText.innerHTML = 'Expired';
                        timerDiv.className = 'timer-bar';
                        timerText.className = 'timer-text expired';
                        timerDiv.style.display = 'flex';
                    }
                } else {
                    timerDiv.style.display = 'none';
                }
            }
        }

        function updateLeaderboardUI() {
            if (!App.leaderboard) return;
            let l = App.leaderboard;
            document.getElementById('leaderboardCowsSold').innerHTML = l.totalCowSales || 0;
            document.getElementById('leaderboardProgressFill').style.width = ((l.totalCowSales || 0) / 10) + '%';
            document.getElementById('leaderboardRemaining').innerHTML = `Remaining: ${l.remainingCows || 0}`;

            let user = l.currentUser || { rank: 0, points: 0, cowCount: 0, prize: 0, photoUrl: '' };
            document.getElementById('userRank').innerHTML = `#${user.rank || 0}`;
            document.getElementById('userPoints').innerHTML = user.points || 0;
            document.getElementById('userPrize').innerHTML = `<img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width:12px;height:12px;object-fit:contain"> ${user.prize || 0}`;
            document.getElementById('winnersSection').style.display = !l.isActive && l.prizesDistributed ? 'block' : 'none';
            displayLeaderboardList(l.leaderboard);
            if (user && user.photoUrl) {
                document.getElementById('profileAvatar').innerHTML = `<img src="${user.photoUrl}" style="width:100%;height:100%;object-fit:cover">`;
            }
        }

        function displayLeaderboardList(leaderboard) {
            let container = document.getElementById('leaderboardList');
            if (!leaderboard || !leaderboard.length) {
                container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary)"><i class="fas fa-trophy" style="font-size:48px;margin-bottom:15px;opacity:.5"></i><p>No players yet - Buy a cow to appear!</p></div>';
                return;
            }
            let html = '';
            leaderboard.slice(0, 50).forEach(player => {
                let rank = player.rank || 0;
                let name = player.firstName || player.username || `Farmer #${player.userId?.substring(0, 4)}`;
                let points = player.points || 0;
                let prize = player.prize || 0;
                let rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
                html += `<div class="leaderboard-card ${rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : ''}"><div class="card-content"><div class="rank-badge ${rankClass}">${rank}</div><div class="user-info"><div class="user-name-row"><span class="user-name">${name}</span>${rank <= 3 ? '<span class="user-crown"><i class="fas fa-crown"></i></span>' : ''}</div></div><div class="points-section"><div class="points-box"><i class="fas fa-cow"></i> ${points}</div>${prize > 0 ? `<div class="prize-pill"><img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width:16px;height:16px;object-fit:contain"> ${prize}</div>` : ''}</div></div></div>`;
            });
            container.innerHTML = html;
        }

        function updateLockedStates() {
            let chickenOverlay = document.getElementById('chickenLockedOverlay');
            let chickenTimer = document.getElementById('chickenUnlockTimer');
            if (App.global && !App.global.chicken_unlocked) {
                chickenOverlay.style.display = 'flex';
                chickenTimer.innerHTML = `🔓 Unlocks after ${App.global.cows_remaining || 0} more cows sold`;
            } else {
                chickenOverlay.style.display = 'none';
            }

            let diamondOverlay = document.getElementById('diamondLockedOverlay');
            let diamondTimer = document.getElementById('diamondUnlockTimer');
            if (App.global && !App.global.diamond_unlocked) {
                diamondOverlay.style.display = 'flex';
                diamondTimer.innerHTML = `🔓 Unlocks after ${App.global.chickens_remaining || 0} more chickens sold`;
            } else {
                diamondOverlay.style.display = 'none';
            }
        }

        function animateTonBalance() {
            let tonElement = document.getElementById('statusTon');
            tonElement.classList.add('increased');
            setTimeout(() => {
                tonElement.classList.remove('increased');
            }, 300);
        }

        function updateProductionTimer() {
            if (App.user && App.user.secondsUntilNext !== undefined) {
                let seconds = App.user.secondsUntilNext;
                let minutes = Math.floor(seconds / 60);
                let secs = seconds % 60;
                document.getElementById('productionTimer').innerHTML = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        }

        function updateAllUI() {
            if (!App.user || !App.global) return;

            document.getElementById('statusMilk').innerHTML = formatNumber(App.user.milk);
            document.getElementById('statusEggs').innerHTML = formatNumber(App.user.eggs);
            document.getElementById('statusDiamond').innerHTML = formatNumber(App.user.diamond);
            document.getElementById('statusTon').innerHTML = formatTON(App.user.tonBalance);
            document.getElementById('milkPerHour').innerHTML = App.user.milkPerHour || 0;
            document.getElementById('eggsPerHour').innerHTML = App.user.eggsPerHour || 0;
            document.getElementById('crystalPriceHeader').innerHTML = CONFIG.CRYSTAL_PRICE;
            updateProductionTimer();

            updateHomeCowCard();
            let cowsProgress = App.global.cows_progress || 0;
            document.getElementById('cowProgressText').innerHTML = `${App.global.cows_sold || 0}/${App.global.cows_cap}`;
            document.getElementById('cowProgressFill').style.width = cowsProgress + '%';

            let cowBadge = document.getElementById('cowBadge');
            if (App.global.cows_remaining <= 0) {
                cowBadge.innerHTML = App.currentLanguage === 'ru' ? 'ПРОДАНО' : 'SOLD OUT';
                cowBadge.className = 'machine-badge badge-soldout';
            } else {
                cowBadge.innerHTML = `${App.global.cows_remaining} ` + (App.currentLanguage === 'ru' ? 'ОСТАЛОСЬ' : 'LEFT');
                cowBadge.className = 'machine-badge badge-available';
            }

            document.getElementById('chickensOwned').innerHTML = App.user.chickens_owned || 0;
            document.getElementById('chickenProgressText').innerHTML = `${App.global.chickens_sold || 0}/${App.global.chickens_cap}`;
            document.getElementById('chickenProgressFill').style.width = (App.global.chickens_progress || 0) + '%';

            let chickenBadge = document.getElementById('chickenBadge');
            if (App.global.chicken_unlocked) {
                chickenBadge.innerHTML = `${App.global.chickens_remaining} ` + (App.currentLanguage === 'ru' ? 'ОСТАЛОСЬ' : 'LEFT');
                chickenBadge.className = 'machine-badge badge-available';
            } else {
                chickenBadge.innerHTML = App.currentLanguage === 'ru' ? 'ЗАБЛОК' : 'LOCKED';
                chickenBadge.className = 'machine-badge badge-locked';
            }

            document.getElementById('diamondEnginesOwned').innerHTML = App.user.diamond_engines_owned || 0;
            let diamondBadge = document.getElementById('diamondBadge');
            if (App.global.diamond_unlocked) {
                diamondBadge.innerHTML = App.currentLanguage === 'ru' ? 'ДОСТУПНО' : 'AVAILABLE';
                diamondBadge.className = 'machine-badge badge-available';
            } else {
                diamondBadge.innerHTML = App.currentLanguage === 'ru' ? 'ЗАБЛОК' : 'LOCKED';
                diamondBadge.className = 'machine-badge badge-locked';
            }

            document.getElementById('diamondBalanceMain').innerHTML = formatNumber(App.user.diamond || 0);
            document.getElementById('crystalPriceMain').innerHTML = CONFIG.CRYSTAL_PRICE;
            document.getElementById('milkForDiamond').innerHTML = formatNumber(App.user.milk || 0);
            document.getElementById('eggsForDiamond').innerHTML = formatNumber(App.user.eggs || 0);

            let convertAmount = document.getElementById('convertAmount').value || 0;
            document.getElementById('tonReceiveMain').innerHTML = formatTON(convertAmount * CONFIG.CRYSTAL_PRICE);

            document.getElementById('profileMilk').innerHTML = formatNumber(App.user.milk || 0);
            document.getElementById('profileEggs').innerHTML = formatNumber(App.user.eggs || 0);
            document.getElementById('profileDiamond').innerHTML = formatNumber(App.user.diamond || 0);
            document.getElementById('profileTon').innerHTML = formatTON(App.user.tonBalance || 0);
            document.getElementById('profileMilkRate').innerHTML = App.user.milkPerHour || 0;
            document.getElementById('profileEggsRate').innerHTML = App.user.eggsPerHour || 0;
            document.getElementById('profileDiamondPrice').innerHTML = CONFIG.CRYSTAL_PRICE;
            document.getElementById('totalMachines').innerHTML = (App.user.cows_owned || 0) + (App.user.chickens_owned || 0) + (App.user.diamond_engines_owned || 0);
            document.getElementById('totalProduction').innerHTML = (App.user.milkPerHour + App.user.eggsPerHour) + '/h';

            if (App.user.referralCode) {
                document.getElementById('referralLink').value = `https://t.me/${CONFIG.BOT_USERNAME.replace('@', '')}?startapp=ref_${App.userId}`;
            }
            document.getElementById('totalReferrals').innerHTML = App.referral?.totalReferrals || 0;

            let claimBtn = document.getElementById('claimReferralBtn');
            if (App.user.referralEarnings > 0) {
                claimBtn.disabled = false;
                claimBtn.innerHTML = `<i class="fas fa-hand-holding-usd"></i> ${App.currentLanguage === 'ru' ? 'Забрать ' : 'Claim '}${formatTON(App.user.referralEarnings)} TON`;
            } else {
                claimBtn.disabled = true;
                claimBtn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> ' + (App.currentLanguage === 'ru' ? 'Нет дохода' : 'No Earnings');
            }

            let balanceHint = document.getElementById('sellBalanceHint');
            if (balanceHint) {
                let resource = document.querySelector('input[name="sellResource"]:checked')?.value || 'milk';
                balanceHint.innerHTML = (App.currentLanguage === 'ru' ? 'Доступно: ' : 'Available: ') + `${formatNumber(resource === 'milk' ? App.user.milk : App.user.eggs)} ${resource === 'milk' ? 'Milk' : 'Eggs'}`;
            }

            document.getElementById('hatchCowBalance').innerHTML = (App.currentLanguage === 'ru' ? 'Ваше молоко: ' : 'Your milk: ') + formatNumber(App.user.milk || 0);
            document.getElementById('hatchChickenBalance').innerHTML = (App.currentLanguage === 'ru' ? 'Ваши яйца: ' : 'Your eggs: ') + formatNumber(App.user.eggs || 0);

            let withdrawAmount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
            let fee = withdrawAmount * 0.05;
            let net = withdrawAmount - fee;
            document.getElementById('withdrawFee').innerHTML = `${formatTON(fee)} TON`;
            document.getElementById('withdrawNet').innerHTML = `${formatTON(net)} TON`;
            document.getElementById('taskUserBalance').innerHTML = formatTON(App.user.tonBalance || 0);
        }

        function updateReferralUI() {
            if (App.referral) {
                document.getElementById('totalReferrals').innerHTML = App.referral.totalReferrals || 0;
                App.referralsPage = 1;
                App.earningsPage = 1;
                displayReferrals(1);
                displayEarnings(1);
            }
        }

        function displayReferrals(page = 1, append = false) {
            let container = document.getElementById('recentReferralsList');
            let loadMoreBtn = document.getElementById('loadMoreReferralsBtn');
            if (App.referral.recentReferrals && App.referral.recentReferrals.length) {
                let limit = 10;
                let start = (page - 1) * limit;
                let end = start + limit;
                let referrals = App.referral.recentReferrals.slice(start, end);
                let html = '';
                referrals.forEach(ref => {
                    let date = ref.joinedAt ? new Date(ref.joinedAt).toLocaleDateString('en-GB') : 'Recently';
                    let name = ref.firstName || ref.username || `User ${ref.userId?.substring(0, 6)}`;
                    let avatar = ref.photoUrl ? `<img src="${ref.photoUrl}" style="width:100%;height:100%;object-fit:cover">` : name.charAt(0).toUpperCase();
                    html += `<div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid rgba(255,255,255,.05)"><div style="width:36px;height:36px;background:linear-gradient(145deg,var(--primary-pink),var(--crystal-blue));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;overflow:hidden;color:#fff;font-weight:600">${avatar}</div><div style="flex:1"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:600;font-size:12px">${name}</div><div style="font-weight:700;color:var(--neon-green);font-size:11px">+${formatTON(ref.totalEarnedFromThisUser || 0)} TON</div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px"><div style="font-size:9px;color:var(--text-muted)">${date}</div></div></div></div>`;
                });
                if (append) {
                    container.innerHTML += html;
                } else {
                    container.innerHTML = html;
                }
                let hasMore = App.referral.recentReferrals.length > end;
                App.hasMoreReferrals = hasMore;
                loadMoreBtn.style.display = hasMore ? 'block' : 'none';
            } else {
                container.innerHTML = `<div style="text-align:center;padding:18px;color:var(--text-secondary)">${App.currentLanguage === 'ru' ? 'Нет рефералов' : 'No referrals yet'}</div>`;
                loadMoreBtn.style.display = 'none';
            }
        }

        function displayEarnings(page = 1, append = false) {
            let container = document.getElementById('earningsHistoryList');
            let loadMoreBtn = document.getElementById('loadMoreEarningsBtn');
            if (App.referral.recentEarnings && App.referral.recentEarnings.length) {
                let limit = 10;
                let start = (page - 1) * limit;
                let end = start + limit;
                let earnings = App.referral.recentEarnings.slice(start, end);
                let html = '';
                earnings.forEach(earn => {
                    let date = new Date(earn.timestamp).toLocaleDateString('en-GB');
                    let name = earn.firstName || earn.username || `User ${earn.userId?.substring(0, 6)}`;
                    let type = earn.type === 'cow_purchase' ? '🐮 Cow' : earn.type === 'chicken_purchase' ? '🐔 Chicken' : earn.type === 'diamond_engine_purchase' ? '💎 Crystal Engine' : earn.type || 'purchase';
                    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid rgba(255,255,255,.05)"><div><div style="font-size:11px;font-weight:600">${name}</div><div style="font-size:9px;color:var(--text-muted)">${type}</div></div><div style="text-align:right"><div style="font-size:11px;font-weight:700;color:var(--neon-green)">+${formatTON(earn.amount)} TON</div><div style="font-size:8px;color:var(--text-muted)">${date}</div></div></div>`;
                });
                if (append) {
                    container.innerHTML += html;
                } else {
                    container.innerHTML = html;
                }
                let hasMore = App.referral.recentEarnings.length > end;
                App.hasMoreEarnings = hasMore;
                loadMoreBtn.style.display = hasMore ? 'block' : 'none';
            } else {
                container.innerHTML = `<div style="text-align:center;padding:18px;color:var(--text-secondary)">${App.currentLanguage === 'ru' ? 'Нет доходов' : 'No earnings yet'}</div>`;
                loadMoreBtn.style.display = 'none';
            }
        }

        function updateTasksUI() {
            if (!App.tasks) return;
            let grid = document.getElementById('tasksGrid');
            let category = App.currentTaskTab;
            let tasks = App.tasks[category] || [];
            if (!tasks.length) {
                grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary)"><i class="fas fa-clipboard-list" style="font-size:48px;margin-bottom:15px;opacity:.5"></i><p data-i18n="tasks.noTasks">No tasks available</p></div>';
                return;
            }
            let html = '';
            tasks.forEach(task => {
                let completed = task.completedBy && task.completedBy.includes(App.userId);
                let emoji = task.type === 'channel' ? '📢' : '🤖';
                let typeName = task.type === 'channel' ? (App.currentLanguage === 'ru' ? 'Канал' : 'Channel') : (App.currentLanguage === 'ru' ? 'Бот' : 'Bot');
                let partnerClass = task.id.startsWith('partner_') ? 'partner-task' : '';
                let joined = sessionStorage.getItem(`task_${task.id}_joined`) === 'true';
                html += `<div class="task-card ${partnerClass}" style="padding:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="width:24px;height:24px;background:rgba(255,92,168,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px">${emoji}</div><div style="font-size:11px;font-weight:600;color:var(--text-secondary)">${task.name || typeName}</div></div><div style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:4px"><img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width:14px;height:14px;object-fit:contain"><span style="font-size:11px;font-weight:600;color:var(--neon-green)">${formatTON(task.reward || CONFIG.TASK_REWARD)}</span></div>${completed ? `<span style="font-size:10px;color:var(--text-muted)"><i class="fas fa-check-circle" style="color:var(--neon-green)"></i> ${App.currentLanguage === 'ru' ? 'Выполнено' : 'Done'}</span>` : `<button class="task-btn" id="taskBtn_${task.id}" style="padding:4px 12px;border-radius:20px;font-size:10px;font-weight:600;background:${joined ? 'linear-gradient(145deg,var(--neon-green),#00b35e)' : 'linear-gradient(145deg,var(--crystal-blue),#0099cc)'};color:#fff;border:none;cursor:pointer" onclick="handleTaskButton('${task.id}','${task.link}','${task.type}',${joined})">${joined ? (App.currentLanguage === 'ru' ? 'Проверить' : 'Verify') : (App.currentLanguage === 'ru' ? 'Присоединиться' : 'Join')}</button>`}</div></div>`;
            });
            grid.innerHTML = html;
        }

        window.handleTaskButton = function(taskId, link, type, joined) {
            if (!joined) {
                sessionStorage.setItem(`task_${taskId}_joined`, 'true');
                window.open(link, '_blank');
                setTimeout(() => {
                    let btn = document.getElementById(`taskBtn_${taskId}`);
                    if (btn) {
                        btn.innerHTML = App.currentLanguage === 'ru' ? 'Проверить' : 'Verify';
                        btn.style.background = 'linear-gradient(145deg, var(--neon-green), #00b35e)';
                        btn.setAttribute('onclick', `verifyTask('${taskId}','${type}')`);
                    }
                }, 2000);
            } else {
                verifyTask(taskId, type);
            }
        };

        window.verifyTask = async function(taskId, type) {
            try {
                let task = App.tasks[App.currentTaskTab].find(t => t.id === taskId);
                if (!task) {
                    showNotification('Task not found', 'error');
                    return;
                }
                let modal = document.getElementById('taskVerifyModal');
                document.getElementById('verifyEmoji').innerHTML = task.type === 'channel' ? '📢' : '🤖';
                document.getElementById('verifyTitle').innerHTML = task.type === 'channel' ? (App.currentLanguage === 'ru' ? 'Присоединиться к каналу' : 'Join Channel') : (App.currentLanguage === 'ru' ? 'Запустить бота' : 'Start Bot');
                document.getElementById('verifyLink').innerHTML = task.link;
                document.getElementById('verifyReward').innerHTML = formatTON(task.reward || CONFIG.TASK_REWARD) + ' TON';
                document.getElementById('verifyJoinLink').href = task.link;
                document.getElementById('verifyStatus').style.display = 'none';
                document.getElementById('verifyCheckBtn').onclick = async function() {
                    await performTaskVerification(task);
                };
                modal.classList.add('active');
            } catch (e) {
                console.error('Task verification error:', e);
                showNotification('Verification failed', 'error');
            }
        };

        async function performTaskVerification(task) {
            let verifyBtn = document.getElementById('verifyCheckBtn');
            if (!validateAndCooldown('verifyCheckBtn', verifyBtn)) return;
            try {
                let statusDiv = document.getElementById('verifyStatus');
                statusDiv.style.display = 'block';
                statusDiv.innerHTML = `<div style="text-align:center"><i class="fas fa-spinner fa-spin"></i> ${App.currentLanguage === 'ru' ? 'Проверка...' : 'Verifying...'}</div>`;
                let result = await callAPI('verifyTask', { taskId: task.id, taskType: task.type });
                if (result) {
                    statusDiv.innerHTML = `<div style="color:var(--neon-green);text-align:center">✅ ${App.currentLanguage === 'ru' ? 'Задание выполнено! Награда добавлена.' : 'Task completed! Reward added.'}</div>`;
                    showNotification(App.currentLanguage === 'ru' ? `✅ Задание выполнено! +${formatTON(task.reward || CONFIG.TASK_REWARD)} TON` : `✅ Task completed! +${formatTON(task.reward || CONFIG.TASK_REWARD)} TON`, 'success');
                    sessionStorage.removeItem(`task_${task.id}_joined`);
                    setTimeout(() => {
                        closeAllModals();
                        loadGameState();
                    }, 2000);
                }
            } catch (e) {
                console.error('Task verification error:', e);
                let statusDiv = document.getElementById('verifyStatus');
                statusDiv.style.display = 'block';
                if (e.message.includes('Not a member') || e.message.includes('NOT_MEMBER')) {
                    statusDiv.innerHTML = `<div style="color:var(--danger-red);text-align:center">❌ ${App.currentLanguage === 'ru' ? 'Не участник канала' : 'Not a member of the channel'}</div>`;
                    sessionStorage.removeItem(`task_${task.id}_joined`);
                } else if (e.message.includes('already completed') || e.message.includes('TASK_ALREADY_COMPLETED')) {
                    statusDiv.innerHTML = `<div style="color:var(--warning);text-align:center">⚠️ ${App.currentLanguage === 'ru' ? 'Задание уже выполнено' : 'Task already completed'}</div>`;
                } else {
                    statusDiv.innerHTML = `<div style="color:var(--danger-red);text-align:center">❌ ${e.message || (App.currentLanguage === 'ru' ? 'Ошибка проверки' : 'Verification error')}</div>`;
                }
            }
        }

        // ==================== MARKET FUNCTIONS ====================
        async function updateMarketUI(page = 1, reset = true) {
            if (!App.currentMarketResource) return;
            try {
                let data = await callAPI('getMarketOrders', { resource: App.currentMarketResource, type: 'sell', page: page, limit: 10 });
                let orderCount = data.orders?.length || 0;
                let milkQty = 0;
                let eggsQty = 0;
                if (App.currentMarketResource === 'milk') {
                    milkQty = data.orders?.reduce((sum, o) => sum + o.remaining, 0) || 0;
                } else {
                    eggsQty = data.orders?.reduce((sum, o) => sum + o.remaining, 0) || 0;
                }
                document.getElementById('marketTotalOrders').innerHTML = orderCount;
                document.getElementById('marketMilkQty').innerHTML = formatNumber(milkQty);
                document.getElementById('marketEggsQty').innerHTML = formatNumber(eggsQty);
                document.getElementById('marketBestPrice').innerHTML = formatFullPrecision(App.market?.[App.currentMarketResource]?.bestSellPrice || 0.0001);

                let grid = document.getElementById('sellOrdersGrid');
                let loadMoreBtn = document.getElementById('loadMoreSellBtn');

                if (data.orders && data.orders.length) {
                    let html = '';
                    if (reset) {
                        grid.innerHTML = '';
                        App.currentMarketPage = 1;
                        App.hasMoreOrders = data.hasMore;
                    }
                    data.orders.forEach(order => {
                        let pricePerUnit = order.pricePerUnit;
                        let totalPrice = order.remaining * pricePerUnit;
                        let emoji = App.currentMarketResource === 'milk' ? '🥛' : '🥚';
                        let resourceUpper = App.currentMarketResource === 'milk' ? 'MILK' : 'EGG';
                        html += `<div class="market-card" onclick="showPurchaseConfirm('${order.id}','${order.resource}',${order.remaining},${pricePerUnit})"><div class="card-inner"><div class="card-title ${order.type}">${resourceUpper}</div><div class="amount-box"><span class="egg-icon">${emoji}</span><span>${formatNumber(order.remaining)}</span></div><div class="price-label">PRICE</div><div class="price-box"><img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width:18px;height:18px;display:inline-block;vertical-align:middle;filter:drop-shadow(0 0 2px rgba(255,255,255,.5))"><span>${formatFullPrecision(totalPrice)}</span></div><div class="unit-price">${formatFullPrecision(pricePerUnit)} TON/${resourceUpper.toLowerCase()}</div><button class="buy-btn">${App.currentLanguage === 'ru' ? 'Купить' : 'Buy'}</button></div></div>`;
                    });
                    if (reset) {
                        grid.innerHTML = html;
                    } else {
                        grid.innerHTML += html;
                    }
                    loadMoreBtn.style.display = data.hasMore ? 'block' : 'none';
                } else {
                    grid.innerHTML = `<div style="grid-column:span 2;text-align:center;padding:25px;color:var(--text-secondary)"><i class="fas fa-inbox" style="font-size:32px;margin-bottom:10px;opacity:.5"></i><p>${App.currentLanguage === 'ru' ? 'Нет активных заказов на продажу' : 'No active sell orders'}</p></div>`;
                    loadMoreBtn.style.display = 'none';
                }
                loadMyOrders();
            } catch (e) {
                console.error('Market UI update error:', e);
            }
        }

        function updateSellDetails() {
            let quantity = parseInt(document.getElementById('sellQuantity').value) || 0;
            let totalPrice = parseFloat(document.getElementById('sellTotalPrice').value) || 0;
            if (quantity > 0 && totalPrice > 0) {
                document.getElementById('sellPerUnitHint').innerHTML = `≈ ${formatFullPrecision(totalPrice / quantity)} TON per unit`;
            } else {
                document.getElementById('sellPerUnitHint').innerHTML = '≈ 0 TON per unit';
            }
            let fee = totalPrice * 0.1;
            let youGet = totalPrice - fee;
            document.getElementById('sellTotalTon').innerHTML = `Total: ${formatFullPrecision(totalPrice)} TON (You get: ${formatFullPrecision(youGet)} TON after 10% fee)`;
            document.getElementById('sellFeeDisplay').innerHTML = `⚠️ 10% market fee (${formatFullPrecision(fee)} TON) will be deducted when sold`;
            let resource = document.querySelector('input[name="sellResource"]:checked')?.value || 'milk';
            let balance = resource === 'milk' ? App.user?.milk : App.user?.eggs;
            document.getElementById('sellBalanceHint').innerHTML = `Available: ${formatNumber(balance || 0)} ${resource === 'milk' ? 'Milk' : 'Eggs'}`;
        }

        window.createSellOrder = async function() {
            let button = document.getElementById('submitSellOrderBtn');
            if (!validateAndCooldown('submitSellOrderBtn', button)) return;
            let resource = document.querySelector('input[name="sellResource"]:checked')?.value;
            let quantity = parseInt(document.getElementById('sellQuantity').value);
            let totalPrice = parseFloat(document.getElementById('sellTotalPrice').value);
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
            let pricePerUnit = totalPrice / quantity;
            let activeCount = await checkActiveOrdersCount();
            if (activeCount >= CONFIG.MAX_ACTIVE_ORDERS) {
                let msg = App.currentLanguage === 'ru' ? `⚠️ У вас может быть только ${CONFIG.MAX_ACTIVE_ORDERS} активных заказов. Пожалуйста, сначала отмените заказ.` : `⚠️ You can only have ${CONFIG.MAX_ACTIVE_ORDERS} active orders. Please cancel an order first.`;
                showNotification(msg, 'warning');
                return;
            }
            try {
                let result = await callAPI('createSellOrder', { resource: resource, quantity: quantity, pricePerUnit: pricePerUnit });
                showNotification(App.currentLanguage === 'ru' ? '✅ Ордер на продажу создан' : '✅ Sell order created', 'success');
                closeAllModals();
                loadGameState();
            } catch (e) {
                console.error('Create sell order error:', e);
            }
        };

        window.showPurchaseConfirm = function(orderId, resource, maxQuantity, pricePerUnit) {
            App.pendingOrder = { id: orderId, resource: resource, maxQuantity: maxQuantity, pricePerUnit: pricePerUnit, type: 'buy' };
            let modal = document.getElementById('confirmPurchaseModal');
            let details = document.getElementById('confirmDetails');
            let emoji = document.getElementById('confirmEmoji');
            let title = document.getElementById('confirmResource');
            emoji.innerHTML = resource === 'milk' ? '🥛' : '🥚';
            title.innerHTML = resource === 'milk' ? (App.currentLanguage === 'ru' ? 'Пакет молока' : 'Milk Package') : (App.currentLanguage === 'ru' ? 'Пакет яиц' : 'Eggs Package');
            let total = maxQuantity * pricePerUnit;
            details.innerHTML = `<div class="confirm-row"><span class="confirm-label">${App.currentLanguage === 'ru' ? 'Количество:' : 'Quantity:'}</span><span class="confirm-value">${formatNumber(maxQuantity)}</span></div><div class="confirm-row"><span class="confirm-label">${App.currentLanguage === 'ru' ? 'Цена за ед:' : 'Price per unit:'}</span><span class="confirm-value">${formatFullPrecision(pricePerUnit)} TON</span></div><div class="confirm-row"><span class="confirm-label">${App.currentLanguage === 'ru' ? 'Итого:' : 'Total:'}</span><span class="confirm-total"><img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width:14px;height:14px;object-fit:contain"> ${formatFullPrecision(total)}</span></div>`;
            document.getElementById('confirmExecuteBtn').onclick = function() {
                executeOrder();
            };
            modal.classList.add('active');
        };

        window.executeOrder = async function() {
            let button = document.getElementById('confirmExecuteBtn');
            if (!validateAndCooldown('confirmExecuteBtn', button)) return;
            if (!App.pendingOrder) return;
            try {
                let result = await callAPI('executeOrder', { orderId: App.pendingOrder.id, quantity: App.pendingOrder.maxQuantity });
                let emoji = result.resource === 'milk' ? '🥛' : '🥚';
                let resourceUpper = result.resource === 'milk' ? 'MILK' : 'EGG';
                showNotification(`🎉 Order filled! ${App.pendingOrder.maxQuantity} ${emoji} ${resourceUpper} for ${formatFullPrecision(result.totalCost)} TON`, 'success');
                loadGameState();
                closeAllModals();
            } catch (e) {
                console.error('Execute order error:', e);
            }
        };

        window.cancelOrder = async function(orderId) {
            if (!validateAndCooldown('cancelOrder_' + orderId)) return;
            if (!confirm(App.currentLanguage === 'ru' ? 'Отменить этот заказ?' : 'Cancel this order?')) return;
            try {
                await callAPI('cancelOrder', { orderId: orderId });
                showNotification(App.currentLanguage === 'ru' ? '✅ Заказ отменен' : '✅ Order cancelled', 'success');
                loadGameState();
            } catch (e) {
                console.error('Cancel order error:', e);
            }
        };

        async function checkActiveOrdersCount() {
            try {
                let orders = await callAPI('getMyOrders');
                return orders.active ? orders.active.length : 0;
            } catch (e) {
                console.error('Error checking active orders:', e);
                return 0;
            }
        }

        async function loadMyOrders() {
            try {
                let orders = await callAPI('getMyOrders');
                let activeContainer = document.getElementById('myActiveOrders');
                if (orders.active && orders.active.length) {
                    let html = '';
                    orders.active.forEach(order => {
                        let emoji = order.resource === 'milk' ? '🥛' : '🥚';
                        let pricePerUnit = order.pricePerUnit;
                        let totalPrice = order.remaining * pricePerUnit;
                        html += `<div class="market-card"><div class="card-inner"><div class="card-title ${order.type}">${order.resource === 'milk' ? 'MILK' : 'EGG'}</div><div class="amount-box"><span class="egg-icon">${emoji}</span><span>${formatNumber(order.remaining)}/${formatNumber(order.quantity)}</span></div><div class="price-label">PRICE</div><div class="price-box"><img src="https://i.ibb.co/WNfvBK9h/toncoin-1.webp" style="width:18px;height:18px;display:inline-block;vertical-align:middle;filter:drop-shadow(0 0 2px rgba(255,255,255,.5))"><span>${formatFullPrecision(totalPrice)}</span></div><div class="unit-price">${formatFullPrecision(pricePerUnit)} TON/${order.resource === 'milk' ? 'milk' : 'egg'}</div><button class="btn btn-secondary" style="padding:8px;font-size:12px;margin-top:8px" onclick="cancelOrder('${order.id}')">${App.currentLanguage === 'ru' ? 'Отменить' : 'Cancel'}</button></div></div>`;
                    });
                    activeContainer.innerHTML = html;
                } else {
                    activeContainer.innerHTML = `<div style="grid-column:span 2;text-align:center;padding:25px;color:var(--text-secondary)"><p>${App.currentLanguage === 'ru' ? 'Нет активных заказов' : 'No active orders'}</p></div>`;
                }
                let filledContainer = document.getElementById('myFilledOrders');
                if (orders.filled && orders.filled.length) {
                    let html = '';
                    orders.filled.slice(0, 5).forEach(order => {
                        let date = new Date(order.createdAt).toLocaleDateString('en-GB');
                        html += `<div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid rgba(255,255,255,.05)"><div><span style="font-weight:600;font-size:11px">${order.type === 'sell' ? (App.currentLanguage === 'ru' ? 'Продажа' : 'Sell') : (App.currentLanguage === 'ru' ? 'Покупка' : 'Buy')} ${order.resource === 'milk' ? (App.currentLanguage === 'ru' ? 'Молоко' : 'Milk') : (App.currentLanguage === 'ru' ? 'Яйца' : 'Eggs')}</span><span style="font-size:9px;color:var(--text-muted);margin-left:4px">${date}</span></div><div><span style="color:var(--neon-green);font-size:11px">${formatNumber(order.quantity)}</span><span style="margin-left:4px;font-size:10px">@ ${formatFullPrecision(order.pricePerUnit)}</span></div></div>`;
                    });
                    filledContainer.innerHTML = html;
                } else {
                    filledContainer.innerHTML = `<div style="text-align:center;padding:18px;color:var(--text-secondary)">${App.currentLanguage === 'ru' ? 'Нет истории заказов' : 'No order history'}</div>`;
                }
            } catch (e) {
                console.error('Load my orders error:', e);
            }
        }

        // ==================== COW ACTIONS ====================
        window.buyCow = async function() {
            let button = document.getElementById('buyCowBtn');
            if (!button) button = document.getElementById('ranchBuyCowBtn');
            if (!validateAndCooldown('buyCowBtn', button)) return;
            if (App.global?.cows_remaining <= 0) {
                showNotification('No cows left to buy', 'warning');
                return;
            }
            if (App.user?.tonBalance < 1) {
                showNotification('Insufficient TON balance', 'error');
                return;
            }
            try {
                let result = await callAPI('buyCow', { quantity: 1 });
                await loadGameState();
                animateTonBalance();
                showNotification('✅ Cow purchased!', 'success');
            } catch (e) {
                console.error('Buy cow error:', e);
            }
        };

        window.buyRanchCow = async function() {
            await window.buyCow();
        };

        // ==================== ACTIVATION FUNCTIONS ====================
        window.openActivateModal = function(level) {
            App.currentActivateLevel = level;
            let modal = document.getElementById('activateCowModal');
            let levelData = CONFIG.COW_LEVELS[level];
            let availableCows = App.ranch.cowLevels[level] || 0;

            modal.innerHTML = `
                <div class="modal-content">
                    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
                        <h3>${App.currentLanguage === 'ru' ? 'Активировать уровень' : 'Activate Level'} ${level} ${App.currentLanguage === 'ru' ? 'коров' : 'Cows'}</h3>
                        <i class="fas fa-times" style="cursor:pointer" onclick="closeModal('activateCowModal')"></i>
                    </div>
                    <div style="text-align:center;margin-bottom:16px">
                        <div style="font-size:48px">${level === 1 ? '🐮' : level === 2 ? '🦬' : '🐃'}</div>
                        <div>${App.currentLanguage === 'ru' ? 'Стоимость' : 'Cost'}: ${levelData.activationCost} 🥛 ${App.currentLanguage === 'ru' ? 'за корову' : 'per cow'}</div>
                        <div>${App.currentLanguage === 'ru' ? 'Длительность' : 'Duration'}: 24 ${App.currentLanguage === 'ru' ? 'часа' : 'hours'}</div>
                    </div>
                    <div class="form-group" style="margin-bottom:16px">
                        <label>${App.currentLanguage === 'ru' ? 'Доступно' : 'Available'}: ${availableCows} ${App.currentLanguage === 'ru' ? 'коров' : 'cows'}</label>
                        <input type="number" id="activateAmount" class="form-input" value="1" min="1" max="${availableCows}" style="width:100%;padding:10px;margin-top:8px;background:rgba(0,0,0,.3);border:1px solid var(--glass-border);border-radius:14px;color:#fff">
                    </div>
                    <div style="background:rgba(0,0,0,.3);padding:12px;border-radius:14px;margin-bottom:16px">
                        <div style="display:flex;justify-content:space-between">
                            <span>${App.currentLanguage === 'ru' ? 'Общая стоимость' : 'Total Cost'}:</span>
                            <span style="color:var(--neon-green)" id="activateTotalCost">${levelData.activationCost} 🥛</span>
                        </div>
                    </div>
                    <button class="btn" style="width:100%;background:linear-gradient(145deg,var(--neon-green),#00b35e);color:#fff;padding:12px;border-radius:14px;border:none" onclick="executeActivateCows()">${App.currentLanguage === 'ru' ? 'Активировать' : 'Activate'}</button>
                </div>
            `;

            document.getElementById('activateAmount').addEventListener('input', function() {
                let amount = parseInt(this.value) || 1;
                let total = amount * levelData.activationCost;
                document.getElementById('activateTotalCost').innerHTML = total + ' 🥛';
            });

            modal.classList.add('active');
        };

        window.executeActivateCows = async function() {
            let amount = parseInt(document.getElementById('activateAmount').value);
            if (amount <= 0) return;

            try {
                await callAPI('activateCows', { level: App.currentActivateLevel, amount: amount });
                await loadGameState();
                closeModal('activateCowModal');
                showNotification(App.currentLanguage === 'ru' ? `✅ Активировано ${amount} коров(а) уровня ${App.currentActivateLevel}!` : `✅ Activated ${amount} level ${App.currentActivateLevel} cows!`, 'success');
            } catch (e) {
                console.error('Activation error:', e);
            }
        };

        window.openUpgradeModal = function(fromLevel) {
            if (fromLevel >= 3) {
                showNotification(App.currentLanguage === 'ru' ? 'Максимальный уровень достигнут' : 'Maximum level reached', 'info');
                return;
            }

            App.currentUpgradeFromLevel = fromLevel;
            let modal = document.getElementById('upgradeCowModal');
            let levelData = CONFIG.COW_LEVELS[fromLevel];
            let availableCows = App.ranch.cowLevels[fromLevel] || 0;

            modal.innerHTML = `
                <div class="modal-content">
                    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
                        <h3>${App.currentLanguage === 'ru' ? 'Улучшить до уровня' : 'Upgrade to Level'} ${fromLevel + 1}</h3>
                        <i class="fas fa-times" style="cursor:pointer" onclick="closeModal('upgradeCowModal')"></i>
                    </div>
                    <div style="text-align:center;margin-bottom:16px">
                        <div style="font-size:48px">${fromLevel === 1 ? '🐮 → 🦬' : '🦬 → 🐃'}</div>
                        <div>${App.currentLanguage === 'ru' ? 'Стоимость' : 'Cost'}: ${levelData.upgradeCost} 🥛 ${App.currentLanguage === 'ru' ? 'за корову' : 'per cow'}</div>
                    </div>
                    <div class="form-group" style="margin-bottom:16px">
                        <label>${App.currentLanguage === 'ru' ? 'Доступно' : 'Available'}: ${availableCows} ${App.currentLanguage === 'ru' ? 'коров' : 'cows'}</label>
                        <input type="number" id="upgradeAmount" class="form-input" value="1" min="1" max="${availableCows}" style="width:100%;padding:10px;margin-top:8px;background:rgba(0,0,0,.3);border:1px solid var(--glass-border);border-radius:14px;color:#fff">
                    </div>
                    <div style="background:rgba(0,0,0,.3);padding:12px;border-radius:14px;margin-bottom:16px">
                        <div style="display:flex;justify-content:space-between">
                            <span>${App.currentLanguage === 'ru' ? 'Общая стоимость' : 'Total Cost'}:</span>
                            <span style="color:var(--neon-green)" id="upgradeTotalCost">${levelData.upgradeCost} 🥛</span>
                        </div>
                    </div>
                    <button class="btn" style="width:100%;background:linear-gradient(145deg,var(--crystal-blue),#0099cc);color:#fff;padding:12px;border-radius:14px;border:none" onclick="executeUpgradeCows()">${App.currentLanguage === 'ru' ? 'Улучшить' : 'Upgrade'}</button>
                </div>
            `;

            document.getElementById('upgradeAmount').addEventListener('input', function() {
                let amount = parseInt(this.value) || 1;
                let total = amount * levelData.upgradeCost;
                document.getElementById('upgradeTotalCost').innerHTML = total + ' 🥛';
            });

            modal.classList.add('active');
        };

        window.executeUpgradeCows = async function() {
            let amount = parseInt(document.getElementById('upgradeAmount').value);
            if (amount <= 0) return;

            try {
                await callAPI('upgradeCowLevel', { fromLevel: App.currentUpgradeFromLevel, amount: amount });
                await loadGameState();
                closeModal('upgradeCowModal');
                showNotification(App.currentLanguage === 'ru' ? `✅ Улучшено ${amount} коров(а) до уровня ${App.currentUpgradeFromLevel + 1}!` : `✅ Upgraded ${amount} cows to level ${App.currentUpgradeFromLevel + 1}!`, 'success');
            } catch (e) {
                console.error('Upgrade error:', e);
            }
        };

        // ==================== STORAGE FUNCTIONS ====================
        window.claimMilk = async function() {
            let button = document.getElementById('claimMilkBtn');
            if (!validateAndCooldown('claimMilkBtn', button)) return;
            if (App.ranch.milkStored <= 0) {
                showNotification(App.currentLanguage === 'ru' ? 'Нет молока для получения' : 'No milk to claim', 'info');
                return;
            }
            try {
                let result = await callAPI('claimMilk');
                let claimed = (result && (result.claimedMilk ?? result.milkClaimed)) ?? App.ranch.milkStored;
                await loadGameState();
                showNotification(App.currentLanguage === 'ru' ? `✅ Забрано ${formatNumber(claimed)} 🥛 из хранилища!` : `✅ Claimed ${formatNumber(claimed)} 🥛 from storage!`, 'success');
            } catch (e) {
                console.error('Claim milk error:', e);
            }
        };

        window.upgradeStorage = function() {
            let currentLevel = App.ranch.storageLevel || 1;
            if (currentLevel >= 10) {
                showNotification(App.currentLanguage === 'ru' ? 'Максимальный уровень достигнут' : 'Maximum level reached', 'info');
                return;
            }

            let nextLevel = currentLevel + 1;
            let nextLevelData = CONFIG.STORAGE_LEVELS[nextLevel];
            let currentCapacity = App.ranch.storageCapacity || 2000;
            let modal = document.getElementById('storageUpgradeModal');

            modal.innerHTML = `
                <div class="modal-content">
                    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
                        <h3>${App.currentLanguage === 'ru' ? 'Улучшить хранилище' : 'Upgrade Storage'}</h3>
                        <i class="fas fa-times" style="cursor:pointer" onclick="closeModal('storageUpgradeModal')"></i>
                    </div>
                    
                    <div class="upgrade-preview">
                        <div class="upgrade-preview-row">
                            <span>${App.currentLanguage === 'ru' ? 'Текущий уровень' : 'Current Level'}:</span>
                            <span>${currentLevel} → ${nextLevel}</span>
                        </div>
                        <div class="upgrade-preview-row">
                            <span>${App.currentLanguage === 'ru' ? 'Текущая вместимость' : 'Current Capacity'}:</span>
                            <span>${formatNumber(currentCapacity)} → ${formatNumber(nextLevelData.capacity)} 🥛</span>
                        </div>
                        <div class="upgrade-preview-row">
                            <span>${App.currentLanguage === 'ru' ? 'Стоимость улучшения' : 'Upgrade Cost'}:</span>
                            <span>${formatNumber(nextLevelData.cost)} 🥛</span>
                        </div>
                    </div>
                    
                    <div style="background:rgba(0,0,0,.3);padding:12px;border-radius:14px;margin-bottom:16px">
                        <div style="display:flex;justify-content:space-between">
                            <span>${App.currentLanguage === 'ru' ? 'Ваш баланс молока' : 'Your Milk Balance'}:</span>
                            <span style="color:${(App.user?.milk || 0) >= nextLevelData.cost ? 'var(--neon-green)' : 'var(--danger-red)'}">
                                ${formatNumber(App.user?.milk || 0)} 🥛
                            </span>
                        </div>
                    </div>
                    
                    <button class="btn" style="width:100%;background:linear-gradient(145deg,var(--crystal-blue),#0099cc);color:#fff;padding:12px;border-radius:14px;border:none" 
                            onclick="executeStorageUpgrade(${nextLevel})" 
                            ${(App.user?.milk || 0) < nextLevelData.cost ? 'disabled style="opacity:0.5"' : ''}>
                        ${App.currentLanguage === 'ru' ? 'Подтвердить улучшение' : 'Confirm Upgrade'}
                    </button>
                </div>
            `;
            modal.classList.add('active');
        };

        window.executeStorageUpgrade = async function(targetLevel) {
            try {
                let result = await callAPI('upgradeMilkStorage');
                await loadGameState();
                closeModal('storageUpgradeModal');
                showNotification(App.currentLanguage === 'ru' ? `✅ Хранилище улучшено до уровня ${result.newLevel}!` : `✅ Storage upgraded to level ${result.newLevel}!`, 'success');
            } catch (e) {
                console.error('Storage upgrade error:', e);
            }
        };

        // ==================== REFERRAL FUNCTIONS ====================
        window.copyReferralLink = function() {
            document.getElementById('referralLink').select();
            navigator.clipboard.writeText(document.getElementById('referralLink').value);
            showNotification(App.currentLanguage === 'ru' ? '✅ Ссылка скопирована!' : '✅ Link copied!', 'success');
        };

        window.claimReferral = async function() {
            let button = document.getElementById('claimReferralBtn');
            if (!validateAndCooldown('claimReferralBtn', button)) return;
            try {
                let result = await callAPI('claimReferralEarnings');
                await loadGameState();
                animateTonBalance();
                showNotification(App.currentLanguage === 'ru' ? `✅ Забрано ${result.claimedAmount} TON!` : `✅ Claimed ${result.claimedAmount} TON!`, 'success');
            } catch (e) {
                console.error('Claim referral error:', e);
            }
        };

        // ==================== WITHDRAW FUNCTIONS ====================
        window.withdraw = async function() {
            let button = document.getElementById('withdrawBtn');
            if (!validateAndCooldown('withdrawBtn', button)) return;
            let amount = parseFloat(document.getElementById('withdrawAmount').value);
            let address = document.getElementById('withdrawAddress').value.trim();
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
                let result = await callAPI('withdraw', { amount: amount, address: address });
                await loadGameState();
                document.getElementById('withdrawAmount').value = '';
                document.getElementById('withdrawAddress').value = '';
                showNotification(App.currentLanguage === 'ru' ? `✅ Запрос на вывод: ${result.netAmount} TON` : `✅ Withdrawal requested: ${result.netAmount} TON`, 'success');
                closeAllModals();
            } catch (e) {
                console.error('Withdraw error:', e);
            }
        };

        // ==================== CRYSTAL FUNCTIONS ====================
        window.convertDiamond = async function() {
            let button = document.getElementById('convertDiamondBtn');
            if (!validateAndCooldown('convertDiamondBtn', button)) return;
            let amount = parseInt(document.getElementById('convertAmount').value);
            if (!amount || amount <= 0) {
                alert(App.currentLanguage === 'ru' ? 'Введите корректную сумму' : 'Enter valid amount');
                return;
            }
            if (amount > App.user.diamond) {
                alert(App.currentLanguage === 'ru' ? 'Недостаточно кристаллов' : 'Insufficient crystals');
                return;
            }
            try {
                let result = await callAPI('convertDiamond', { amount: amount });
                await loadGameState();
                document.getElementById('convertAmount').value = '';
                animateTonBalance();
                showNotification(App.currentLanguage === 'ru' ? `✅ Конвертировано ${amount} 💎 в ${result.tonReceived} TON` : `✅ Converted ${amount} 💎 to ${result.tonReceived} TON`, 'success');
            } catch (e) {
                console.error('Convert crystal error:', e);
            }
        };

        // ==================== NAVIGATION ====================
        window.openRanchFromCow = function() {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById('sectionRanch').classList.add('active');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            updateRanchUI();
        };

        // ==================== HATCH FUNCTIONS ====================
        window.hatchCow = async function() {
            let amount = parseInt(document.getElementById('hatchCowAmount').value) || 1;
            if (amount <= 0) return;
            try {
                await callAPI('hatchCow', { quantity: amount });
                await loadGameState();
                closeAllModals();
                showNotification(App.currentLanguage === 'ru' ? `✅ Выведено ${amount} коров(а)!` : `✅ Hatched ${amount} cow(s)!`, 'success');
            } catch (e) {
                console.error('Hatch cow error:', e);
            }
        };

        window.hatchChicken = async function() {
            let amount = parseInt(document.getElementById('hatchChickenAmount').value) || 1;
            if (amount <= 0) return;
            try {
                await callAPI('hatchChicken', { quantity: amount });
                await loadGameState();
                closeAllModals();
                showNotification(App.currentLanguage === 'ru' ? `✅ Выведено ${amount} куриц(а)!` : `✅ Hatched ${amount} chicken(s)!`, 'success');
            } catch (e) {
                console.error('Hatch chicken error:', e);
            }
        };

        // ==================== TASK FUNCTIONS ====================
        function calculateTaskPrice() {
            let target = parseInt(document.getElementById('taskTarget').value) || 100;
            let reward = CONFIG.TASK_REWARD;
            let total = target * reward * 2;
            document.getElementById('taskTotalCost').innerHTML = `Total Cost: ${formatTON(total)} TON`;
            let balance = App.user?.tonBalance || 0;
            let submitBtn = document.getElementById('submitTaskBtn');
            submitBtn.disabled = balance < total;
            submitBtn.style.opacity = submitBtn.disabled ? '0.5' : '1';
            document.getElementById('taskTotalCost').style.color = submitBtn.disabled ? 'var(--danger-red)' : 'var(--crystal-blue)';
        }

        window.openAddTaskModal = function() {
            document.getElementById('addTaskModal').classList.add('active');
            calculateTaskPrice();
        };

        window.createTask = async function() {
            let button = document.getElementById('submitTaskBtn');
            if (!validateAndCooldown('submitTaskBtn', button)) return;
            let type = document.querySelector('input[name="taskType"]:checked')?.value;
            let link = document.getElementById('taskLink').value.trim();
            let target = parseInt(document.getElementById('taskTarget').value);
            if (!type || !link || !target || target < 100) {
                alert(App.currentLanguage === 'ru' ? 'Заполните все поля корректно (минимум 100 пользователей)' : 'Fill all fields correctly (minimum 100 users)');
                return;
            }
            let total = target * CONFIG.TASK_REWARD * 2;
            if (total > (App.user?.tonBalance || 0)) {
                alert(App.currentLanguage === 'ru' ? 'Недостаточно средств' : 'Insufficient balance');
                return;
            }
            try {
                let result = await callAPI('createTask', { type: type, link: link, targetUsers: target, reward: CONFIG.TASK_REWARD });
                showNotification(App.currentLanguage === 'ru' ? `✅ Задание создано! Стоимость: ${formatTON(total)} TON` : `✅ Task created! Cost: ${formatTON(total)} TON`, 'success');
                closeAllModals();
                loadGameState();
            } catch (e) {
                console.error('Create task error:', e);
                showNotification(e.message, 'error');
            }
        };

        // ==================== DEPOSIT FUNCTIONS ====================
        window.openDepositModal = function() {
            document.getElementById('depositModal').classList.add('active');
        };

        window.initiateDeposit = async function() {
            if (!App.wallet) {
                alert(App.currentLanguage === 'ru' ? 'Сначала подключите кошелек' : 'Connect wallet first');
                return;
            }
            let amount = parseFloat(document.getElementById('depositAmountInput').value);
            if (!amount || amount < 0.1) {
                alert(App.currentLanguage === 'ru' ? 'Минимальный депозит: 0.1 TON' : 'Minimum deposit: 0.1 TON');
                return;
            }
            try {
                let comment = String(App.userId);
                let nanoAmount = String(Math.floor(amount * 1e9));
                if (!window.TonWeb) throw new Error('TonWeb library not loaded');
                let TonWeb = window.TonWeb;
                let tonweb = new TonWeb();
                let cell = new TonWeb.boc.Cell();
                cell.bits.writeUint(0, 32);
                cell.bits.writeString(comment);
                let boc = await cell.toBoc(false);
                let payload = TonWeb.utils.bytesToBase64(boc);
                let transaction = {
                    validUntil: Math.floor(Date.now() / 1000) + 600,
                    messages: [{
                        address: CONFIG.DEPOSIT_WALLET,
                        amount: nanoAmount,
                        payload: payload
                    }]
                };
                let result = await App.tonConnectUI.sendTransaction(transaction);
                showNotification(App.currentLanguage === 'ru' ? '✅ Транзакция отправлена! Подождите около 1 минуты для зачисления' : '✅ Transaction sent! Wait about 1 minute for balance to be added', 'success');
                await handleDepositSuccess(result, amount, comment);
            } catch (e) {
                console.error('Deposit error:', e);
                let statusDiv = document.getElementById('depositStatus');
                let msg = App.currentLanguage === 'ru' ? 'Транзакция не удалась' : 'Transaction failed';
                if (e.message?.includes('rejected')) {
                    msg = App.currentLanguage === 'ru' ? 'Транзакция отклонена в кошельке' : 'Transaction rejected in wallet';
                } else if (e.message?.includes('insufficient')) {
                    msg = App.currentLanguage === 'ru' ? 'Недостаточно средств' : 'Insufficient balance';
                }
                statusDiv.classList.add('visible');
                statusDiv.querySelector('.status-icon').innerHTML = '❌';
                statusDiv.querySelector('.status-message').innerHTML = msg;
                document.getElementById('depositStatusDetail').innerHTML = e.message || (App.currentLanguage === 'ru' ? 'Пожалуйста, попробуйте снова' : 'Please try again');
            }
        };

        async function handleDepositSuccess(result, amount, comment) {
            try {
                let data = await callAPI('deposit', { amount: amount, txHash: result.boc, comment: comment });
                App.currentDepositId = data.depositId;
                App.currentTxHash = result.boc;
                let statusDiv = document.getElementById('depositStatus');
                statusDiv.classList.add('visible');
                statusDiv.querySelector('.status-icon').innerHTML = '⏳';
                statusDiv.querySelector('.status-message').innerHTML = App.currentLanguage === 'ru' ? 'Транзакция отправлена!' : 'Transaction sent!';
                document.getElementById('depositStatusDetail').innerHTML = App.currentLanguage === 'ru' ? 'Ожидание подтверждения (≈1 мин)...' : 'Waiting for confirmation (≈1 min)...';
                startDepositVerification(data.depositId, result.boc);
            } catch (e) {
                console.error('Deposit API error:', e);
                let statusDiv = document.getElementById('depositStatus');
                statusDiv.classList.add('visible');
                statusDiv.querySelector('.status-icon').innerHTML = '❌';
                statusDiv.querySelector('.status-message').innerHTML = App.currentLanguage === 'ru' ? 'Не удалось обработать депозит' : 'Failed to process deposit';
                document.getElementById('depositStatusDetail').innerHTML = e.message;
            }
        }

        function startDepositVerification(depositId, txHash) {
            if (App.depositCheckInterval) clearInterval(App.depositCheckInterval);
            if (!depositId || !txHash) return;
            let attempts = 0;
            let maxAttempts = 18;
            App.depositCheckInterval = setInterval(async () => {
                attempts++;
                try {
                    let result = await callAPI('verifyDeposit', { depositId: depositId, txHash: txHash });
                    if (result.status === 'completed') {
                        clearInterval(App.depositCheckInterval);
                        let statusDiv = document.getElementById('depositStatus');
                        statusDiv.querySelector('.status-icon').innerHTML = '✅';
                        statusDiv.querySelector('.status-message').innerHTML = App.currentLanguage === 'ru' ? 'Депозит подтвержден!' : 'Deposit confirmed!';
                        document.getElementById('depositStatusDetail').innerHTML = App.currentLanguage === 'ru' ? `${result.amount} TON добавлено на баланс` : `${result.amount} TON added to your balance`;
                        showNotification(App.currentLanguage === 'ru' ? `💰 Депозит подтвержден! ${result.amount} TON добавлено` : `💰 Deposit confirmed! ${result.amount} TON added`, 'success');
                        loadGameState();
                        animateTonBalance();
                        setTimeout(() => {
                            statusDiv.classList.remove('visible');
                            closeAllModals();
                        }, 3000);
                    }
                } catch (e) {
                    console.error('Verification error:', e);
                    if (attempts >= maxAttempts) {
                        clearInterval(App.depositCheckInterval);
                    }
                }
            }, 10000);
        }

        // ==================== SETUP FUNCTIONS ====================
        function setupIntervals() {
            if (App.timerInterval) clearInterval(App.timerInterval);
            App.timerInterval = setInterval(() => {
                if (App.user && App.user.secondsUntilNext > 0) {
                    App.user.secondsUntilNext--;
                    updateProductionTimer();
                } else {
                    loadGameState();
                }
                updateCowTimers();
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
                    let section = item.dataset.section;
                    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                    document.getElementById(section).classList.add('active');
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    item.classList.add('active');
                    if (section === 'sectionTasks') updateTasksUI();
                    if (section === 'sectionLeaderboard') loadGameState();
                });
            });

            // Leaderboard button
            document.getElementById('leaderboardButton').addEventListener('click', function() {
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                document.getElementById('sectionLeaderboard').classList.add('active');
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                loadGameState();
            });

            // Help button
            document.getElementById('helpButton').addEventListener('click', function() {
                document.getElementById('helpModal').classList.add('active');
            });
            document.getElementById('closeHelp').addEventListener('click', function() {
                document.getElementById('helpModal').classList.remove('active');
            });

            // Language switcher
            document.querySelectorAll('.lang-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    let lang = this.dataset.lang;
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
                    let view = this.dataset.marketTab;
                    document.getElementById('marketBuyView').style.display = view === 'buy' ? 'block' : 'none';
                    document.getElementById('marketMyOrdersView').style.display = view === 'orders' ? 'block' : 'none';
                    if (view === 'orders') loadMyOrders();
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

            // Task type change
            document.querySelectorAll('input[name="taskType"]').forEach(radio => {
                radio.addEventListener('change', function() {
                    document.getElementById('channelNote').style.display = this.value === 'channel' ? 'block' : 'none';
                });
            });

            // Refresh market
            document.getElementById('refreshMarketBtn').addEventListener('click', function() {
                App.currentMarketPage = 1;
                updateMarketUI(1, true);
                this.querySelector('i').style.animation = 'spin-slow 0.5s infinite linear';
                setTimeout(() => {
                    this.querySelector('i').style.animation = 'spin-slow 2s infinite linear';
                }, 500);
            });

            // Refresh tasks
            document.getElementById('refreshTasksBtn').addEventListener('click', function() {
                loadGameState();
                this.querySelector('i').style.animation = 'spin-slow 0.5s infinite linear';
                setTimeout(() => {
                    this.querySelector('i').style.animation = 'spin-slow 2s infinite linear';
                }, 500);
            });

            // Load more
            document.getElementById('loadMoreSellBtn').addEventListener('click', function() {
                App.currentMarketPage++;
                updateMarketUI(App.currentMarketPage, false);
            });
            document.getElementById('loadMoreReferralsBtn').addEventListener('click', function() {
                App.referralsPage++;
                displayReferrals(App.referralsPage, true);
            });
            document.getElementById('loadMoreEarningsBtn').addEventListener('click', function() {
                App.earningsPage++;
                displayEarnings(App.earningsPage, true);
            });

            // Buy buttons
            document.getElementById('ranchBuyCowBtn').addEventListener('click', window.buyRanchCow);
            document.getElementById('cowCard').addEventListener('click', function(e) {
                if (e.target.tagName !== 'BUTTON') {
                    window.openRanchFromCow();
                }
            });

            // Convert
            document.getElementById('convertDiamondBtn').addEventListener('click', window.convertDiamond);
            document.getElementById('convertAmount').addEventListener('input', updateAllUI);

            // Referral
            document.getElementById('copyReferralBtn').addEventListener('click', window.copyReferralLink);
            document.getElementById('claimReferralBtn').addEventListener('click', window.claimReferral);

            // Withdraw
            document.getElementById('withdrawBtn').addEventListener('click', window.withdraw);
            document.getElementById('withdrawAmount').addEventListener('input', updateAllUI);

            // Sell order
            document.getElementById('createSellOrderBtnTop').addEventListener('click', function() {
                document.getElementById('sellOrderModal').classList.add('active');
                updateSellDetails();
            });
            document.getElementById('submitSellOrderBtn').addEventListener('click', window.createSellOrder);
            document.getElementById('sellQuantity').addEventListener('input', updateSellDetails);
            document.getElementById('sellTotalPrice').addEventListener('input', updateSellDetails);

            // Deposit
            document.getElementById('depositButton').addEventListener('click', window.openDepositModal);
            document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
            document.getElementById('submitDepositBtn').addEventListener('click', window.initiateDeposit);

            // Add task
            document.getElementById('addTaskBtn').addEventListener('click', window.openAddTaskModal);
            document.getElementById('submitTaskBtn').addEventListener('click', window.createTask);
            document.getElementById('taskTarget').addEventListener('input', calculateTaskPrice);

            // Preset buttons
            document.querySelectorAll('[data-deposit]').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.getElementById('depositAmountInput').value = this.dataset.deposit;
                });
            });

            document.querySelectorAll('[data-sell-percent]').forEach(btn => {
                btn.addEventListener('click', function() {
                    let percent = parseInt(this.dataset.sellPercent) / 100;
                    let resource = document.querySelector('input[name="sellResource"]:checked')?.value || 'milk';
                    let balance = resource === 'milk' ? App.user.milk : App.user.eggs;
                    let amount = Math.floor(balance * percent);
                    document.getElementById('sellQuantity').value = Math.max(100, amount);
                    updateSellDetails();
                });
            });

            // Resource radio change
            document.querySelectorAll('input[name="sellResource"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    updateAllUI();
                    updateSellDetails();
                });
            });

            // Close modals on overlay click
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.addEventListener('click', function(e) {
                    if (e.target === this) {
                        this.classList.remove('active');
                    }
                });
            });

            // Storage upgrade
            document.getElementById('upgradeStorageBtn').addEventListener('click', window.upgradeStorage);

            // Claim milk
            document.getElementById('claimMilkBtn').addEventListener('click', window.claimMilk);
        }

        function refreshMarket() {
            App.currentMarketPage = 1;
            updateMarketUI(1, true);
            document.getElementById('refreshMarketBtn').querySelector('i').style.animation = 'spin-slow 0.5s infinite linear';
            setTimeout(() => {
                document.getElementById('refreshMarketBtn').querySelector('i').style.animation = 'spin-slow 2s infinite linear';
            }, 500);
        }

        // Start the app
        document.addEventListener('DOMContentLoaded', initApp);
