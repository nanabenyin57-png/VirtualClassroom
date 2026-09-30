// --- SHARED API CONFIGURATION ---
//
// Every page loads this file BEFORE its own script, so API_BASE is defined
// by the time the page logic runs.
//
// Why this exists: the API host used to be hardcoded as http://127.0.0.1:5000
// in 20 places. That only ever works when the browser and the Node backend are
// on the same machine, so the moment the backend is hosted (Render, Railway,
// a VPS) or the database is reached remotely, every page breaks.
//
// How to point the site at a deployed backend:
//   1. Set window.API_BASE before this script, or edit the production default
//      in the line below.
//   2. Local development needs no change — the fallback already points at
//      the local backend.

(function () {
    // EDIT THIS for production, e.g. 'https://virtualclassroom-api.onrender.com'
    const PRODUCTION_API_BASE = 'http://127.0.0.1:5000';

    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '' || host === '::1';

    window.API_BASE = window.API_BASE || (isLocal ? 'http://127.0.0.1:5000' : PRODUCTION_API_BASE);
})();

// Build a full API URL from a path: apiUrl('/api/login')
window.apiUrl = function apiUrl(path) {
    return window.API_BASE + path;
};

// Turn a stored profile image path into something the browser can load.
// The database stores '/uploads/xyz.jpeg'; older rows may hold a full
// http://127.0.0.1:5000/... URL from before that was fixed — strip the
// origin off either form so the current API host is always used.
window.mediaUrl = function mediaUrl(stored) {
    if (!stored) return 'images/default-avatar.jpg';
    const match = String(stored).match(/\/uploads\/.+$/);
    return match ? window.API_BASE + match[0] : stored;
};
