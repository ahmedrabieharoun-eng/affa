        function checkClickCooldown(buttonId) {
            let now = Date.now();
            let lastClick = lastClickTimers[buttonId] || 0;
            let timeLeft = CLICK_COOLDOWN - (now - lastClick);
            if (timeLeft > 0) {
                return false; // silent — button is already visually disabled
            }
            return true;
        }

        async function disableButtonTemporarily(button, buttonId) {
            if (!button) return;
            button.disabled = true;
            let originalText = button.innerHTML;
            button.innerHTML = `<i class="fas fa-hourglass-half"></i> ⏳ ${Math.ceil(CLICK_COOLDOWN / 1000)}s`;
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = originalText;
            }, CLICK_COOLDOWN);
        }

        function validateAndCooldown(buttonId, button) {
            if (!checkClickCooldown(buttonId)) return false;
            disableButtonTemporarily(button, buttonId);
            lastClickTimers[buttonId] = Date.now();
            return true;
        }

        function showNotification(message, type = 'success', duration = 5000) {
            let container = document.getElementById('notificationContainer');
            let notification = document.createElement('div');
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

        function formatFullPrecision(n) {
            if (n == null) return '0';
            if (Math.abs(n) < 0.0001 && n !== 0) return n.toFixed(8).replace(/\.?0+$/, '');
            return n.toFixed(8).replace(/\.?0+$/, '');
        }

        function formatTON(amount) {
            if (amount == null || isNaN(amount)) return '0';
            if (Math.abs(amount) < 0.0001 && amount !== 0) return amount.toFixed(8).replace(/\.?0+$/, '');
            return parseFloat(amount).toFixed(4);
        }

        function formatNumber(n) {
            if (n == null) return '0';
            if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
            if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
            return n.toLocaleString();
        }

        function setLanguage(lang) {
            if (!TRANSLATIONS[lang]) return;
            App.currentLanguage = lang;
            localStorage.setItem('crystal_ranch_lang', lang);
            document.querySelectorAll('[data-i18n]').forEach(el => {
                let key = el.getAttribute('data-i18n');
                if (TRANSLATIONS[lang][key]) {
                    let text = TRANSLATIONS[lang][key];
                    if (el.tagName === 'P' || el.tagName === 'DIV') {
                        text = text.replace(/<br>/g, '<br>');
                        el.innerHTML = text;
                    } else {
                        text = text.replace(/<br>/g, ' ');
                        el.textContent = text;
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
            let lang = App.currentLanguage || 'en';
            let info = LEADERBOARD_INFO_TRANSLATIONS[lang];
            document.getElementById('infoTitle').innerHTML = info.title;
            document.getElementById('infoGrandPrize').innerHTML = info.grandPrize;
            document.getElementById('infoTotalPrize').innerHTML = info.totalPrize;
            document.getElementById('infoHowToParticipate').innerHTML = info.howToParticipate;
            document.getElementById('infoHowToDesc').innerHTML = info.howToDesc;
            document.getElementById('infoWhenEnds').innerHTML = info.whenEnds;
            document.getElementById('infoWhenDesc').innerHTML = info.whenDesc;
            document.getElementById('infoGotIt').innerHTML = info.gotIt;
            let prizeHTML = '';
            info.prizeList.forEach(item => {
                prizeHTML += `<div class="info-prize-row"><span>${item.rank}</span> <span style="color:#FFD700;">${item.prize}</span></div>`;
            });
            document.getElementById('infoPrizeList').innerHTML = prizeHTML;
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        function closeAllModals() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.remove('active');
            });
            App.pendingOrder = null;
            App.pendingTask = null;
        }

        // ==================== API CALLS ====================
        async function callAPI(action, data = {}) {
            try {
                let headers = {
                    'Content-Type': 'application/json',
                    'X-Action': action,
                    'X-CSRF-Token': CONFIG.CSRF_TOKEN
                };
                if (App.telegram && App.telegram.initData) {
                    headers.Authorization = `Telegram ${App.telegram.initData}`;
                }
                let response = await fetch(`${CONFIG.API_URL}/api`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ action: action, data: data })
                });
                let result = await response.json();
                if (!result.success) {
                    console.error(`API Error [${action}]:`, result.error);
                    showNotification(result.error || 'Transaction failed', 'error');
                    throw new Error(result.error);
                }
                return result.data;
            } catch (e) {
                console.error('API call failed:', e);
                throw e;
            }
        }

        // ==================== INITIALIZATION ====================
        function setLoadingProgress(pct, msg) {
            let bar = document.getElementById('loadingBar');
            let status = document.getElementById('loadingStatus');
            if (bar) bar.style.width = pct + '%';
            if (status) status.textContent = msg;
        }

        function hideLoadingScreen() {
            let screen = document.getElementById('loadingScreen');
            if (!screen) return;
            screen.style.transition = 'opacity 0.5s ease';
            screen.style.opacity = '0';
            setTimeout(() => screen.remove(), 500);
        }

        async function fetchCsrfToken() {
            try {
                const res = await fetch(`${CONFIG.API_URL}/csrf-token`);
                const json = await res.json();
                if (json.token) {
                    CONFIG.CSRF_TOKEN = json.token;
                    console.log('CSRF token fetched');
                }
            } catch (e) {
                console.warn('Could not fetch CSRF token:', e);
            }
        }

