                async function initApp() {
            console.log('Crystal Ranch · Initializing...');
            setLoadingProgress(5, 'Securing connection...');
            await fetchCsrfToken();
            // Refresh CSRF token periodically (every 55s, token valid for ~2 min windows)
            setInterval(fetchCsrfToken, CONFIG.CSRF_REFRESH_INTERVAL || 55000);
            setLoadingProgress(10, 'Setting language...');
            setLanguage(localStorage.getItem('crystal_ranch_lang') || 'en');

            setLoadingProgress(25, 'Connecting to Telegram...');
            await setupTelegram();

            setLoadingProgress(45, 'Initializing account...');
            await initializeUser();

            setTimeout(() => initTONConnect(), 1000);

            // Keep retrying until data loads successfully
            let loaded = false;
            let attempt = 0;
            while (!loaded) {
                attempt++;
                setLoadingProgress(65, attempt === 1 ? 'Loading farm data...' : `Retrying... (${attempt})`);
                loaded = await loadGameState();
                if (!loaded) {
                    setLoadingProgress(60, '⚠️ Connection error, retrying...');
                    await new Promise(r => setTimeout(r, 2000)); // wait 2s then retry
                }
            }

            setLoadingProgress(95, 'Almost ready...');
            setupIntervals();
            setupEventListeners();
            setLoadingProgress(100, '✅ Ready!');
            setTimeout(() => hideLoadingScreen(), 500);
            console.log('Crystal Ranch · Ready');
        }

        async function setupTelegram() {
            return new Promise(resolve => {
                if (window.Telegram && window.Telegram.WebApp) {
                    App.telegram = window.Telegram.WebApp;
                    App.telegram.ready();
                    App.telegram.expand();
                    if (App.telegram.initDataUnsafe && App.telegram.initDataUnsafe.user) {
                        let user = App.telegram.initDataUnsafe.user;
                        App.userId = String(user.id);
                        document.getElementById('profileName').innerHTML = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Farmer';
                        document.getElementById('profileUsername').innerHTML = user.username ? `@${user.username}` : '@crystal_ranch';
                        document.getElementById('profileUserId').innerHTML = `ID: ${App.userId}`;
                        document.getElementById('depositUserIdDisplay').innerHTML = App.userId;
                        if (user.photo_url) {
                            document.getElementById('profileAvatar').innerHTML = `<img src="${user.photo_url}" style="width:100%;height:100%;object-fit:cover">`;
                        }
                    }
                    if (App.telegram.initDataUnsafe && App.telegram.initDataUnsafe.start_param) {
                        console.log('Start param:', App.telegram.initDataUnsafe.start_param);
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

        async function initializeUser() {
            try {
                let referrer = sessionStorage.getItem('referrer');
                let userInfo = App.telegram?.initDataUnsafe?.user ? {
                    first_name: App.telegram.initDataUnsafe.user.first_name,
                    last_name: App.telegram.initDataUnsafe.user.last_name,
                    username: App.telegram.initDataUnsafe.user.username,
                    photo_url: App.telegram.initDataUnsafe.user.photo_url
                } : null;
                let result = await fetch(`${CONFIG.API_URL}/api`, {
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
                            startParam: referrer,
                            userInfo: userInfo
                        }
                    })
                });
                let data = await result.json();
                console.log('Initialize user result:', data);
            } catch (e) {
                console.error('Init user error:', e);
            }
        }

        async function initTONConnect() {
            try {
                if (window.TON_CONNECT_UI) {
                    let manifestUrl = `${CONFIG.API_URL}/tonconnect-manifest.json`;
                    App.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
                        manifestUrl: manifestUrl,
                        language: App.currentLanguage === 'ru' ? 'ru' : 'en',
                        uiPreferences: {
                            theme: 'DARK'
                        }
                    });
                    App.tonConnectUI.onStatusChange(wallet => {
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
            } catch (e) {
                console.error('TON Connect init error:', e);
            }
        }

        function handleWalletConnected(wallet) {
            App.wallet = {
                address: wallet.account.address,
                chain: wallet.account.chain,
                appName: wallet.device.appName
            };
            let addressDisplay = document.getElementById('walletAddressDisplay');
            let connectBtn = document.getElementById('connectWalletBtn');
            let shortAddress = `${App.wallet.address.substring(0, 6)}...${App.wallet.address.substring(App.wallet.address.length - 4)}`;
            addressDisplay.innerHTML = `${shortAddress} · ${App.wallet.appName}`;
            connectBtn.innerHTML = '<i class="fas fa-unplug"></i> ' + (App.currentLanguage === 'ru' ? 'Отключить' : 'Disconnect');
            connectBtn.onclick = disconnectWallet;
            document.getElementById('submitDepositBtn').disabled = false;
        }

        function handleWalletDisconnected() {
            App.wallet = null;
            document.getElementById('walletAddressDisplay').innerHTML = App.currentLanguage === 'ru' ? 'Не подключен' : 'Not connected';
            document.getElementById('connectWalletBtn').innerHTML = '<i class="fas fa-plug"></i> ' + (App.currentLanguage === 'ru' ? 'Подключить' : 'Connect');
            document.getElementById('connectWalletBtn').onclick = connectWallet;
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

        // ==================== HOME COW CARD ====================
        function updateHomeCowCard() {
            if (!App.ranch) return;
            let r = App.ranch;
            let active = (r.cowActive[1] || 0) + (r.cowActive[2] || 0) + (r.cowActive[3] || 0);
            let inactive = (r.cowLevels[1] || 0) + (r.cowLevels[2] || 0) + (r.cowLevels[3] || 0);
            let total = active + inactive;
            document.getElementById('cowsOwned').innerText = total;
            document.getElementById('homeCowActive').innerText = active;
            document.getElementById('homeCowInactive').innerText = inactive;
            document.getElementById('homeCowProduction').innerText = Math.round(r.hourlyProduction || 0);
        }

        // ==================== LOAD STATE ====================
        async function loadGameState() {
            try {
                let [state, ranchState] = await Promise.all([
                    callAPI('getState'),
                    callAPI('getRanchState').catch(() => null)
                ]);
                App.user = state.user;
                App.global = state.global;
                App.constants = state.constants;
                App.referral = state.referral || { totalReferrals: 0, totalEarnings: 0, recentReferrals: [], recentEarnings: [] };
                App.market = state.market || { milk: { sellOrders: 0, buyOrders: 0, bestSellPrice: 0, bestBuyPrice: 0, totalMilk: 0, totalEggs: 0 }, eggs: { sellOrders: 0, buyOrders: 0, bestSellPrice: 0, bestBuyPrice: 0 } };
                App.tasks = state.tasks || { partner: [], community: [] };
                App.leaderboard = state.leaderboard || { isActive: true, totalCowSales: 0, cowCap: 1000, remainingCows: 1000, leaderboard: [], currentUser: { rank: 0, cowCount: 0, points: 0, prize: 0, photoUrl: '' }, prizesDistributed: false, winners: {} };
                if (state.ranch) {
                    App.ranch = state.ranch;
                } else if (ranchState) {
                    App.ranch = ranchState;
                }
                updateHomeCowCard();
                if (App.global) {
                    App.global.diamond_price = CONFIG.CRYSTAL_PRICE;
                }
                updateAllUI();
                updateRanchUI();
                updateReferralUI();
                updateTasksUI();
                updateLeaderboardUI();
                animateTonBalance();
                updateLockedStates();
                if (state.pendingDeposits && state.pendingDeposits.length > 0 && state.pendingDeposits[0].status === 'pending') {
                    startDepositVerification(state.pendingDeposits[0].depositId, state.pendingDeposits[0].txHash);
                }
                return true; // ✅ data loaded successfully
            } catch (e) {
                console.error('Load game state error:', e);
                return false; // ❌ failed
            }
        }

        // ==================== UPDATE FUNCTIONS ====================
