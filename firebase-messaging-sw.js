
// Scripts for firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyD1hbtdhHeBn5_pIFup1syY5THih5_f_I8",
  authDomain: "khdmty-2.firebaseapp.com",
  databaseURL: "https://khdmty-2-default-rtdb.firebaseio.com",
  projectId: "khdmty-2",
  storageBucket: "khdmty-2.firebasestorage.app",
  messagingSenderId: "1034529182566",
  appId: "1:1034529182566:web:82b817cfc41416190c6ea7"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Ensure you have an icon
    badge: '/badge.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
