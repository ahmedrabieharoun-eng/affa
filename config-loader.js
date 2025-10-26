// config-loader.js
class FirebaseConfigLoader {
    static async loadFirebaseConfig() {
        try {
            console.log('🔧 Loading Firebase configuration...');
            
            // المحاولة الأولى: جلب الإعدادات من ملف JSON
            const response = await fetch('/firebase-config.json');
            if (response.ok) {
                const config = await response.json();
                console.log('✅ Firebase config loaded from JSON file');
                return config;
            }
            throw new Error('JSON config file not found');
            
        } catch (error) {
            console.warn('⚠️ Falling back to default config:', error.message);
            
            // الإعدادات الافتراضية الآمنة
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
    }

    static async initializeFirebase() {
        try {
            const firebaseConfig = await this.loadFirebaseConfig();
            
            // تهيئة Firebase
            if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
                console.log('✅ Firebase initialized successfully');
                return firebase.database();
            } else if (firebase.apps.length > 0) {
                return firebase.database();
            }
            
            throw new Error('Firebase SDK not loaded');
            
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            throw error;
        }
    }
}

// جعل الكلاس متاح globally
window.FirebaseConfigLoader = FirebaseConfigLoader;