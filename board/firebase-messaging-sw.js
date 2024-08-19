importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBeIPr1H_de7eIZUagNAUvPbw-rYRteP9U",
    authDomain: "submit-33eb1.firebaseapp.com",
    projectId: "submit-33eb1",
    storageBucket: "submit-33eb1.appspot.com",
    messagingSenderId: "123176179541",
    appId: "1:123176179541:web:c40f2392c8b95fb93601dc"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

self.addEventListener('push', function (event) {
    console.log('Push event received:', event);
});

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // 알림 표시 로직
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/firebase-logo.png'  // 적절한 아이콘 경로로 변경하세요
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification click Received.');

    event.notification.close();

    // 알림 클릭 시 특정 URL로 이동
    event.waitUntil(
        clients.openWindow('https://your-site-url.com')  // 원하는 URL로 변경하세요
    );
});