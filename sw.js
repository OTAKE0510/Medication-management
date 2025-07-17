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


// IndexedDBラッパー
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('medication-reminder-db', 1);
    request.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = function(e) { resolve(e.target.result); };
    request.onerror = function(e) { reject(e); };
  });
}

async function saveNotification(payload) {
  const db = await openDB();
  const tx = db.transaction('notifications', 'readwrite');
  tx.objectStore('notifications').add(payload);
  return tx.complete;
}

async function getAllNotifications() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notifications', 'readonly');
    const store = tx.objectStore('notifications');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

async function deleteNotification(id) {
  const db = await openDB();
  const tx = db.transaction('notifications', 'readwrite');
  tx.objectStore('notifications').delete(id);
  return tx.complete;
}

// 通知予約（IndexedDBに保存し、setTimeoutでスケジューリング）
async function scheduleNotification(payload) {
  await saveNotification(payload);
  scheduleTimeout(payload);
}

function scheduleTimeout(payload) {
  const { title, body, time, id } = payload;
  const now = Date.now();
  const delay = time - now;
  if (delay > 0) {
    setTimeout(async () => {
      self.registration.showNotification(title, { body });
      if (id) await deleteNotification(id);
    }, delay);
  }
}

// Service Worker起動時に通知予約を復元
self.addEventListener('activate', function(event) {
  self.clients.claim();
  event.waitUntil(
    (async () => {
      const notifications = await getAllNotifications();
      notifications.forEach(scheduleTimeout);
    })()
  );
});

// 通知クリック時の挙動
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
