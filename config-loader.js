// config-loader.js
class FirebaseConfigLoader {
    static async loadFirebaseConfig(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔧 Loading Firebase configuration... Attempt ${attempt}/${maxRetries}`);
                
                const response = await fetch('/firebase-config.json');
                if (response.ok) {
                    const config = await response.json();
                    console.log('✅ Firebase config loaded from JSON file');
                    return config;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                
            } catch (error) {
                console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    console.warn('⚠️ Falling back to default config after all retries failed');
                    return this.getDefaultConfig();
                }
                
                // انتظر قبل إعادة المحاولة
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    static getDefaultConfig() {
        return {
            apiKey: "default-public-key",
            authDomain: "default-project.firebaseapp.com",
            databaseURL: "https://default-project.firebaseio.com",
            projectId: "default-project-id",
            storageBucket: "default-project.appspot.com",
            messagingSenderId: "123456789012",
            appId: "1:123456789012:web:defaultappid",
            measurementId: "G-DEFAULT123"
        };
    }

    static async initializeFirebase() {
        try {
            const firebaseConfig = await this.loadFirebaseConfig();
            
            // تهيئة Firebase
            if (typeof firebase !== 'undefined') {
                // التحقق إذا كان Firebase مثبتاً مسبقاً
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                    console.log('✅ Firebase initialized successfully');
                } else {
                    console.log('✅ Firebase already initialized');
                }
                return firebase.database();
            }
            
            throw new Error('Firebase SDK not loaded');
            
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            throw error;
        }
    }
}

// معالجة الأخطاء المحتملة
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    console.error('File:', e.filename);
    console.error('Line:', e.lineno);
});

// معالجة الوعود المرفوضة
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});

// جعل الكلاس متاح globally
window.FirebaseConfigLoader = FirebaseConfigLoader;
