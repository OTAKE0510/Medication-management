// sw.js: Service Worker for medication reminders
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  self.clients.claim();
});

// 通知予約メッセージ受信
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'scheduleNotification') {
    scheduleNotification(event.data.payload);
  }
});

// 通知予約（setTimeoutで簡易実装。実運用はAlarms APIやIndexedDB推奨）
function scheduleNotification(payload) {
  const { title, body, time } = payload;
  const now = Date.now();
  const delay = time - now;
  if (delay > 0) {
    setTimeout(() => {
      self.registration.showNotification(title, { body });
    }, delay);
  }
}

// 通知クリック時の挙動
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
