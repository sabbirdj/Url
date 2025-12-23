import { Link, ClickEvent, CreateLinkDTO, AnalyticsSummary, DeviceType } from '../types';
import { checkRateLimit } from './rateLimiter';

// --- MOCK DATA SEEDING ---
const MOCK_LINKS: Link[] = [
  {
    id: '1',
    originalUrl: 'https://react.dev/reference/react',
    alias: 'react-docs',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    active: true,
    userId: 'user_1'
  },
  {
    id: '2',
    originalUrl: 'https://tailwindcss.com/docs',
    alias: 'tailwind-cheat',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    active: true,
    userId: 'user_1'
  }
];

// --- STORAGE KEYS ---
const KEY_LINKS = 'linkly_links';
const KEY_CLICKS = 'linkly_clicks';

// --- HELPER: SIMULATED REDIS CACHE (In-Memory Map) ---
// In a real app, this ensures O(1) lookup speed for redirection
const linkCache = new Map<string, Link>();

const loadFromStorage = <T,>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
};

const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialize Cache
const init = () => {
  const links = loadFromStorage<Link[]>(KEY_LINKS, MOCK_LINKS);
  links.forEach(l => linkCache.set(l.alias, l));
  if (!localStorage.getItem(KEY_LINKS)) {
    saveToStorage(KEY_LINKS, MOCK_LINKS);
  }
};
init(); // Run on module load

// --- CORE SERVICES ---

export const LinkService = {
  getAll: (): Link[] => {
    return loadFromStorage<Link[]>(KEY_LINKS, MOCK_LINKS).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  create: (data: CreateLinkDTO): Link => {
    // 1. Validation
    if (!data.originalUrl) throw new Error("URL is required");
    
    // 2. Generate Alias if missing (nanoid style)
    const alias = data.alias || Math.random().toString(36).substring(2, 8);
    
    // 3. Check collision (Simulating DB Unique Constraint)
    const links = LinkService.getAll();
    if (links.some(l => l.alias === alias)) {
      throw new Error("Alias already in use");
    }

    const newLink: Link = {
      id: Math.random().toString(36).substring(2, 10),
      originalUrl: data.originalUrl,
      alias,
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
      active: true,
      userId: 'user_1'
    };

    // 4. Write to "DB" (LocalStorage)
    links.unshift(newLink);
    saveToStorage(KEY_LINKS, links);

    // 5. Write to "Redis" (Cache)
    linkCache.set(alias, newLink);

    return newLink;
  },

  delete: (id: string) => {
    const links = LinkService.getAll().filter(l => l.id !== id);
    saveToStorage(KEY_LINKS, links);
    // Rebuild cache
    linkCache.clear();
    links.forEach(l => linkCache.set(l.alias, l));
  },

  // The "High Performance" Lookup Method
  resolveAlias: (alias: string): Link | null => {
    // 1. Check Rate Limit (Simulating Middleware)
    const clientIp = '127.0.0.1'; // In real app: req.ip
    if (!checkRateLimit(clientIp)) {
      console.warn("Rate limit exceeded for IP:", clientIp);
      // In a real backend, we would throw a 429 error here
    }

    // 2. Cache Lookup (O(1))
    const link = linkCache.get(alias);
    
    if (!link) return null;
    if (!link.active) return null;
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return null;

    return link;
  }
};

export const AnalyticsService = {
  trackClick: (alias: string, mockData?: Partial<ClickEvent>) => {
    const link = linkCache.get(alias);
    if (!link) return;

    const clicks = loadFromStorage<ClickEvent[]>(KEY_CLICKS, []);
    
    const newClick: ClickEvent = {
      id: Math.random().toString(36).substring(2, 10),
      linkId: link.id,
      timestamp: new Date().toISOString(),
      // Mocking request headers extraction
      country: mockData?.country || ['USA', 'UK', 'DE', 'FR', 'JP', 'BR'][Math.floor(Math.random() * 6)],
      city: 'Unknown',
      device: mockData?.device || [DeviceType.DESKTOP, DeviceType.MOBILE, DeviceType.TABLET][Math.floor(Math.random() * 3)],
      referrer: mockData?.referrer || ['google.com', 'twitter.com', 'direct', 'linkedin.com'][Math.floor(Math.random() * 4)],
      userAgent: 'Mozilla/5.0...'
    };

    clicks.push(newClick);
    saveToStorage(KEY_CLICKS, clicks);
  },

  getStatsForLink: (linkId: string): AnalyticsSummary => {
    const allClicks = loadFromStorage<ClickEvent[]>(KEY_CLICKS, []);
    const relevantClicks = allClicks.filter(c => c.linkId === linkId);

    // Aggregation Logic (Usually done via SQL GROUP BY)
    
    // 1. By Date (Last 7 days)
    const clicksByDateMap = new Map<string, number>();
    relevantClicks.forEach(c => {
      const date = c.timestamp.split('T')[0];
      clicksByDateMap.set(date, (clicksByDateMap.get(date) || 0) + 1);
    });
    const clicksByDate = Array.from(clicksByDateMap.entries())
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 2. By Device
    const deviceMap = new Map<string, number>();
    relevantClicks.forEach(c => deviceMap.set(c.device, (deviceMap.get(c.device) || 0) + 1));
    const clicksByDevice = Array.from(deviceMap.entries()).map(([name, value]) => ({ name, value }));

    // 3. By Country
    const countryMap = new Map<string, number>();
    relevantClicks.forEach(c => countryMap.set(c.country, (countryMap.get(c.country) || 0) + 1));
    const clicksByCountry = Array.from(countryMap.entries()).map(([country, clicks]) => ({ country, clicks }));

    // 4. By Referrer
    const refMap = new Map<string, number>();
    relevantClicks.forEach(c => refMap.set(c.referrer, (refMap.get(c.referrer) || 0) + 1));
    const clicksByReferrer = Array.from(refMap.entries()).map(([referrer, clicks]) => ({ referrer, clicks }));

    return {
      totalClicks: relevantClicks.length,
      clicksByDate,
      clicksByDevice,
      clicksByCountry,
      clicksByReferrer
    };
  }
};
