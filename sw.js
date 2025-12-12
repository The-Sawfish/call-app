importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging-compat.js");

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

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(
    payload.notification?.title || "Incoming Call",
    {
      body: payload.notification?.body || "Tap to answer",
      icon: "/call-app/icons/icon-192.png",
      data: { url: "/call-app/index.html" }
    }
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url));
});
