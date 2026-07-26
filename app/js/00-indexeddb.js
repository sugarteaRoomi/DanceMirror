// IndexedDB — persistence for folder handles
const DB_NAME = 'mirror-dance-db';
const DB_VERSION = 3;
let db;

function openDB() {
    return new Promise(function(resolve, reject) {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e) {
            var d = e.target.result;
            if (d.objectStoreNames.contains('videos')) {
                d.deleteObjectStore('videos');
            }
            if (!d.objectStoreNames.contains('settings')) {
                d.createObjectStore('settings', { keyPath: 'key' });
            }
        };
        req.onsuccess = function(e) { db = e.target.result; resolve(db); };
        req.onerror = function() { reject(); };
    });
}

function dbGet(storeName, key) {
    return new Promise(function(resolve) {
        var tx = db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).get(key);
        req.onsuccess = function() { resolve(req.result); };
    });
}

function dbPut(storeName, data) {
    return new Promise(function(resolve) {
        var tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data);
        tx.oncomplete = function() { resolve(); };
    });
}
