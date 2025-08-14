// Simple request cache utility to prevent duplicate API calls
class RequestCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  // Generate cache key from URL and params
  generateKey(url, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    return `${url}${searchParams ? '?' + searchParams : ''}`;
  }

  // Get cached data if available and not expired
  get(url, params = {}) {
    const key = this.generateKey(url, params);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    
    // Remove expired cache
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  // Set cache data with TTL
  set(url, params = {}, data, ttl = this.defaultTTL) {
    const key = this.generateKey(url, params);
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  // Check if request is already pending
  isPending(url, params = {}) {
    const key = this.generateKey(url, params);
    return this.pendingRequests.has(key);
  }

  // Add pending request promise
  setPending(url, params = {}, promise) {
    const key = this.generateKey(url, params);
    this.pendingRequests.set(key, promise);
    
    // Clean up when promise resolves/rejects
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
    
    return promise;
  }

  // Get pending request promise
  getPending(url, params = {}) {
    const key = this.generateKey(url, params);
    return this.pendingRequests.get(key);
  }

  // Clear specific cache entry
  invalidate(url, params = {}) {
    const key = this.generateKey(url, params);
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  // Get cache stats
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheEntries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        createdAt: new Date(value.createdAt).toISOString(),
        expiresAt: new Date(value.expiresAt).toISOString(),
        isExpired: Date.now() > value.expiresAt
      }))
    };
  }
}

// Create singleton instance
const requestCache = new RequestCache();

export default requestCache;

// Helper hook for using cache with API calls
export const useCachedApi = () => {
  const get = async (url, params = {}, options = {}) => {
    const { ttl, force = false } = options;
    
    // Check cache first (unless forced)
    if (!force) {
      const cached = requestCache.get(url, params);
      if (cached) {
        return cached;
      }
      
      // Check if request is already pending
      const pending = requestCache.getPending(url, params);
      if (pending) {
        return pending;
      }
    }
    
    // Make the API call
    const apiCall = async () => {
      try {
        const response = await fetch(url + '?' + new URLSearchParams(params));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Cache the result
        requestCache.set(url, params, data, ttl);
        
        return data;
      } catch (error) {
        // Don't cache errors
        throw error;
      }
    };
    
    // Set as pending and return promise
    return requestCache.setPending(url, params, apiCall());
  };
  
  const invalidate = (url, params = {}) => {
    requestCache.invalidate(url, params);
  };
  
  const clear = () => {
    requestCache.clear();
  };
  
  return { get, invalidate, clear };
};