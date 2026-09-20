const fs = require('fs');
const path = require('path');

class CacheService {
  constructor(cacheDir = (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) ? path.join('/tmp', 'cache') : path.join(__dirname, '..', '..', 'cache')) {
    this.cacheDir = cacheDir;
    this.memoryCache = new Map();
    this.defaultTTL = 10 * 60 * 1000; // 10 minutes default
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (e) {
      console.warn('Could not initialize disk cache directory:', e.message);
    }
  }

  _getDiskPath(key) {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  get(key) {
    const now = Date.now();

    // Check memory first
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key);
      if (item.expiresAt > now) {
        return item.value;
      }
      this.memoryCache.delete(key);
    }

    // Check disk
    try {
      const filePath = this._getDiskPath(key);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const item = JSON.parse(raw);
        if (item.expiresAt > now) {
          // Promote to memory
          this.memoryCache.set(key, item);
          return item.value;
        } else {
          fs.unlinkSync(filePath);
        }
      }
    } catch (e) {
      // ignore disk read errors
    }

    return null;
  }

  set(key, value, ttlSeconds = 600) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const item = { value, expiresAt };

    this.memoryCache.set(key, item);

    try {
      const filePath = this._getDiskPath(key);
      fs.writeFileSync(filePath, JSON.stringify(item), 'utf8');
    } catch (e) {
      // ignore disk write errors
    }
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.memoryCache.delete(key);
    try {
      const filePath = this._getDiskPath(key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
  }
}

module.exports = new CacheService();
