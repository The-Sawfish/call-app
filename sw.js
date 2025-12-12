// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging.js');

// Initialize Firebase in the Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyCzfjcgM1LDpdplvnZ70TZMwiCdfJBaCSI",
  authDomain: "voice-call-bef3b.firebaseapp.com",
  databaseURL: "https://voice-call-bef3b-default-rtdb.firebaseio.com",
  projectId: "voice-call-bef3b",
  storageBucket: "voice-call-bef3b.firebasestorage.app",
  messagingSenderId: "280467966695",
  appId: "1:280467966695:web:1cfdc7f7bcef6a677db042"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Incoming Call';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new call',
    icon: '/call-app/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: '/' } // Optional: click opens the PWA
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional: Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url);
    })
  );
});
