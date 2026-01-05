import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import * as cheerio from 'cheerio';
import {
    verifyGoogleToken,
    upsertUser,
    getUserById,
    generateSessionToken,
    requireAuth,
    optionalAuth,
    migrateDataToUser
} from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== AUTH ENDPOINTS ==========

// Login with Google
app.post('/api/auth/google', async (req, res) => {
    try {
        const { idToken, migrateExisting } = req.body;

        if (!idToken) {
            return res.status(400).json({ error: 'ID token required' });
        }

        // Verify Google token
        const googleUser = await verifyGoogleToken(idToken);

        // Create or update user in database
        const user = upsertUser(googleUser);

        // Optionally migrate orphan data to this user
        if (migrateExisting) {
            const migrated = migrateDataToUser(user.id);
            console.log(`Migrated data to user ${user.email}:`, migrated);
        }

        // Generate session token
        const sessionToken = generateSessionToken(user);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                picture: user.picture,
            },
            token: sessionToken,
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({ error: 'Authentication failed', details: error.message });
    }
});

// Get current user
app.get('/api/auth/me', requireAuth, (req, res) => {
    try {
        const user = getUserById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Check if there is data to migrate
app.get('/api/auth/check-migrate', (req, res) => {
    try {
        const portfolioCount = db.prepare('SELECT COUNT(*) as count FROM portfolios WHERE user_id IS NULL').get().count;
        const noteCount = db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id IS NULL').get().count;
        res.json({ canMigrate: portfolioCount > 0 || noteCount > 0 });
    } catch (error) {
        console.error('Check migrate error:', error);
        res.json({ canMigrate: false });
    }
});

// Discard orphan data
app.post('/api/auth/clear-orphan', (req, res) => {
    try {
        db.prepare('DELETE FROM portfolios WHERE user_id IS NULL').run();
        db.prepare('DELETE FROM notes WHERE user_id IS NULL').run();
        res.json({ success: true });
    } catch (error) {
        console.error('Clear orphan error:', error);
        res.status(500).json({ error: 'Failed to clear orphan data' });
    }
});

// Logout (client-side token deletion, server just acknowledges)
app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
});

// ========== API ROUTES ==========
// Portfolios - Protected by auth
app.get('/api/portfolios', requireAuth, (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM portfolios WHERE user_id = ?');
        const rows = stmt.all(req.userId);
        const portfolios = rows.map(row => JSON.parse(row.data));
        res.json(portfolios);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolios' });
    }
});

app.post('/api/portfolios', requireAuth, (req, res) => {
    try {
        const portfolios = req.body;
        if (!Array.isArray(portfolios)) {
            return res.status(400).json({ error: 'Expected array of portfolios' });
        }

        const userId = req.userId || null;
        const insert = db.prepare('INSERT OR REPLACE INTO portfolios (id, user_id, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

        // Build delete query based on auth status
        let deleteQuery;
        if (userId) {
            deleteQuery = portfolios.length > 0
                ? `DELETE FROM portfolios WHERE user_id = ? AND id NOT IN (${portfolios.map(() => '?').join(',')})`
                : 'DELETE FROM portfolios WHERE user_id = ?';
        } else {
            deleteQuery = portfolios.length > 0
                ? `DELETE FROM portfolios WHERE user_id IS NULL AND id NOT IN (${portfolios.map(() => '?').join(',')})`
                : 'DELETE FROM portfolios WHERE user_id IS NULL';
        }

        const transaction = db.transaction((items) => {
            // Remove deleted portfolios
            if (userId) {
                if (items.length > 0) {
                    db.prepare(deleteQuery).run(userId, ...items.map(p => p.id));
                } else {
                    db.prepare(deleteQuery).run(userId);
                }
            } else {
                if (items.length > 0) {
                    db.prepare(deleteQuery).run(...items.map(p => p.id));
                } else {
                    db.prepare(deleteQuery).run();
                }
            }

            // Upsert current ones
            for (const p of items) {
                insert.run(p.id, userId, JSON.stringify(p));
            }
        });

        transaction(portfolios);
        res.json({ success: true });
    } catch (error) {
        console.error('Database save error:', error);
        res.status(500).json({ error: 'Failed to save portfolios' });
    }
});

// Notes API - Protected by auth
app.get('/api/notes/:symbol', requireAuth, (req, res) => {
    try {
        const { symbol } = req.params;
        const notes = db.prepare('SELECT * FROM notes WHERE symbol = ? AND user_id = ? ORDER BY date DESC').all(symbol, req.userId);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

app.post('/api/notes', requireAuth, (req, res) => {
    try {
        const { id, symbol, title, content, date } = req.body;
        const userId = req.userId || null;
        const stmt = db.prepare('INSERT OR REPLACE INTO notes (id, user_id, symbol, title, content, date) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run(id, userId, symbol, title, content, date);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving note:', error);
        res.status(500).json({ error: 'Failed to save note' });
    }
});

app.delete('/api/notes/:id', requireAuth, (req, res) => {
    try {
        const { id } = req.params;

        if (req.userId) {
            db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, req.userId);
        } else {
            db.prepare('DELETE FROM notes WHERE id = ? AND user_id IS NULL').run(id);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Stock History with Caching
app.get('/api/stock-history/:symbol/:range', async (req, res) => {
    try {
        const { symbol, range } = req.params;

        // 1. Check Cache
        const cached = db.prepare('SELECT data, updated_at FROM stock_history WHERE symbol = ? AND range = ?').get(symbol, range);
        if (cached) {
            const now = Date.now();
            const updatedAt = new Date(cached.updated_at).getTime();
            // Cache duration: 15 mins for intraday (1D, 5D), 24 hours for others
            const maxAge = (range === '1D' || range === '5D') ? 1000 * 60 * 15 : 1000 * 60 * 60 * 24;

            if (now - updatedAt < maxAge) {
                // If the data is empty or invalid JSON, we might want to refetch, but let's assume valid
                try {
                    const data = JSON.parse(cached.data);
                    if (data && data.length > 0) {
                        return res.json(data);
                    }
                } catch (e) { /* ignore parse error and refetch */ }
            }
        }

        // 2. Fetch from Yahoo Finance
        let r = '1y', i = '1d';
        switch (range) {
            case '1D': r = '1d'; i = '5m'; break;
            case '5D': r = '5d'; i = '15m'; break;
            case '1M': r = '1mo'; i = '1d'; break;
            case '6M': r = '6mo'; i = '1d'; break;
            case '1Y': r = '1y'; i = '1d'; break;
            case '5Y': r = '5y'; i = '1wk'; break;
            case 'MAX': r = 'max'; i = '1mo'; break;
            default: r = '1y'; i = '1d';
        }

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${r}&interval=${i}`;
        console.log(`Fetching live history for ${symbol} (${range}) from Yahoo...`);

        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) {
            throw new Error(`Yahoo API error: ${response.status}`);
        }

        const json = await response.json();
        const result = json.chart?.result?.[0];

        if (!result) {
            return res.json([]);
        }

        const t = result.timestamp || [];
        const c = result.indicators?.quote?.[0]?.close || [];

        // Process data
        const historyData = t.map((time, idx) => ({
            timestamp: time * 1000,
            price: c[idx]
        })).filter(d => d.price !== null && d.price !== undefined);

        // 3. Save to Cache
        if (historyData.length > 0) {
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO stock_history (symbol, range, data, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `);
            stmt.run(symbol, range, JSON.stringify(historyData));
        }

        res.json(historyData);

    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Yahoo Finance Session Management
let yahooSession = { crumb: null, cookie: null };

async function refreshYahooSession() {
    try {
        console.log('Refreshing Yahoo Session...');
        // 1. Get Cookie
        const cookieReq = await fetch('https://fc.yahoo.com', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const setCookie = cookieReq.headers.get('set-cookie');

        if (!setCookie) throw new Error('No cookie returned from fc.yahoo.com');
        const cookie = setCookie.split(';')[0]; // Extract first part

        // 2. Get Crumb
        const crumbReq = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': cookie
            }
        });

        if (!crumbReq.ok) throw new Error(`Failed to get crumb: ${crumbReq.status}`);
        const crumb = await crumbReq.text();

        yahooSession = { crumb, cookie };
        console.log('Yahoo Session Refreshed. Crumb:', crumb);
        return true;
    } catch (error) {
        console.error('Yahoo Session Error:', error);
        return false;
    }
}

// Yahoo Finance Quote Summary Proxy
app.get('/api/quote-summary/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;

        // --- 1. Daily Data Handling (Price, Summary, etc.) ---
        let mainData = null;
        let mainDataCached = false;

        const cachedDaily = db.prepare('SELECT data, updated_at FROM stock_quotes WHERE symbol = ?').get(symbol);

        // Check if daily cache is from today
        const isDailyFresh = cachedDaily && new Date(cachedDaily.updated_at).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

        if (isDailyFresh && cachedDaily.data) {
            console.log(`Serving cached quote summary for ${symbol}`);
            mainData = JSON.parse(cachedDaily.data);
            mainDataCached = true;
        } else {
            // Fetch fresh daily data
            if (!yahooSession.crumb) await refreshYahooSession();

            // Exclude incomeStatementHistory from daily fetch to save daily bandwidth.
            // We only need: price, summaryDetail, summaryProfile, defaultKeyStatistics, financialData, recommendationTrend, earningsEstimate, revenueEstimate, earningsHistory, earningsTrend
            const dailyModules = 'price,summaryDetail,summaryProfile,defaultKeyStatistics,financialData,recommendationTrend,earningsEstimate,revenueEstimate,earningsHistory,earningsTrend';

            let url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${dailyModules}&crumb=${yahooSession.crumb}`;
            let fetchOptions = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Cookie': yahooSession.cookie
                }
            };

            let response = await fetch(url, fetchOptions);

            if (response.status === 401) {
                console.log('Got 401 from Yahoo, retrying with new session...');
                await refreshYahooSession();
                url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${dailyModules}&crumb=${yahooSession.crumb}`;
                fetchOptions.headers.Cookie = yahooSession.cookie;
                response = await fetch(url, fetchOptions);
            }

            if (!response.ok) {
                console.error(`Yahoo API error for daily data: ${response.status}`);
                // Fallback to stale cache if available
                if (cachedDaily) {
                    console.log(`Serving STALE cached quote summary for ${symbol}`);
                    mainData = JSON.parse(cachedDaily.data);
                } else {
                    return res.status(response.status).json({});
                }
            } else {
                mainData = await response.json();

                // Cache Daily Data (without income statement for now)
                if (mainData.quoteSummary?.result) {
                    try {
                        db.prepare(`
                            INSERT INTO stock_quotes (symbol, data, updated_at) 
                            VALUES (?, ?, datetime('now')) 
                            ON CONFLICT(symbol) DO UPDATE SET 
                                data = excluded.data, 
                                updated_at = datetime('now')
                        `).run(symbol, JSON.stringify(mainData));
                        console.log(`Cached daily quote summary for ${symbol}`);
                    } catch (dbError) {
                        console.error('Failed to cache quote summary:', dbError);
                    }
                }
            }
        }

        // --- 2. Income Statement Handling (Long-term Cache) ---
        let incomeData = null;
        const cachedIncome = db.prepare('SELECT data, updated_at FROM income_statements WHERE symbol = ?').get(symbol);

        // Cache is valid for 7 days
        const incomeAgeDays = cachedIncome ? (new Date() - new Date(cachedIncome.updated_at)) / (1000 * 60 * 60 * 24) : 999;

        if (incomeAgeDays < 7 && cachedIncome?.data) {
            console.log(`Serving cached income statement for ${symbol} (Age: ${incomeAgeDays.toFixed(1)} days)`);
            incomeData = JSON.parse(cachedIncome.data);
        } else {
            // Fetch fresh income data
            if (!yahooSession.crumb) await refreshYahooSession();

            console.log(`Fetching fresh income statement for ${symbol}...`);
            const incomeModules = 'incomeStatementHistory';
            let url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${incomeModules}&crumb=${yahooSession.crumb}`;
            let fetchOptions = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Cookie': yahooSession.cookie
                }
            };

            let response = await fetch(url, fetchOptions);

            if (response.status === 401) {
                await refreshYahooSession();
                url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${incomeModules}&crumb=${yahooSession.crumb}`;
                fetchOptions.headers.Cookie = yahooSession.cookie;
                response = await fetch(url, fetchOptions);
            }

            if (response.ok) {
                const json = await response.json();
                if (json.quoteSummary?.result) {
                    incomeData = json;
                    // Cache Income
                    try {
                        db.prepare(`
                            INSERT INTO income_statements (symbol, data, updated_at) 
                            VALUES (?, ?, datetime('now')) 
                            ON CONFLICT(symbol) DO UPDATE SET data = excluded.data, updated_at = datetime('now')
                        `).run(symbol, JSON.stringify(json));
                        console.log(`Cached income statement for ${symbol}`);
                    } catch (e) { console.error("Failed to cache income statement", e); }
                }
            } else {
                console.error(`Failed to fetch income statement: ${response.status}`);
                // Fallback to old cache if exists
                if (cachedIncome) incomeData = JSON.parse(cachedIncome.data);
            }
        }

        // --- 3. Merge and Return ---
        // If mainData failed completely (no fresh, no stale), we returned earlier.
        if (mainData && mainData.quoteSummary && mainData.quoteSummary.result) {
            // Merge income statement into the main result if available
            if (incomeData && incomeData.quoteSummary && incomeData.quoteSummary.result) {
                const mainResult = mainData.quoteSummary.result[0];
                const incomeResult = incomeData.quoteSummary.result[0];

                // Merge properties from incomeResult to mainResult
                Object.assign(mainResult, incomeResult);
            }
            res.json(mainData);
        } else {
            // Should be rare if fallback logic works
            res.status(500).json({ error: "No data available" });
        }
    } catch (error) {
        console.error('Quote summary proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch quote summary' });
    }
});

// Financial Modeling Prep - Product Segment Revenue (for detailed Sankey charts)
// Get free API key from: https://site.financialmodelingprep.com/developer/docs
const FMP_API_KEY = process.env.FMP_API_KEY || '';

app.get('/api/product-segments/:symbol', async (req, res) => {
    const { symbol } = req.params;

    if (!FMP_API_KEY) {
        return res.status(503).json({ error: 'FMP API key not configured', segments: [] });
    }

    try {
        // Check cache first (7 days for segment data)
        const cached = db.prepare(`
            SELECT data, updated_at FROM income_statements 
            WHERE symbol = ? AND updated_at > datetime('now', '-7 days')
        `).get(`${symbol}_segments`);

        if (cached) {
            console.log(`Serving cached product segments for ${symbol}`);
            return res.json(JSON.parse(cached.data));
        }

        // Fetch from FMP
        const url = `https://financialmodelingprep.com/api/v4/revenue-product-segmentation?symbol=${symbol}&structure=flat&period=annual&apikey=${FMP_API_KEY}`;
        console.log(`Fetching product segments for ${symbol} from FMP...`);

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`FMP API error: ${response.status}`);
            return res.json({ segments: [] });
        }

        const data = await response.json();

        // Cache the result
        db.prepare(`
            INSERT INTO income_statements (symbol, data, updated_at) 
            VALUES (?, ?, datetime('now')) 
            ON CONFLICT(symbol) DO UPDATE SET data = excluded.data, updated_at = datetime('now')
        `).run(`${symbol}_segments`, JSON.stringify(data));

        res.json(data);
    } catch (error) {
        console.error('FMP product segments error:', error);
        res.json({ segments: [] });
    }
});

// Google News RSS (More relevant search-based results)
app.get('/api/news/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        // Search query for specific company stock news
        const url = `https://news.google.com/rss/search?q=${symbol}+stock&hl=en-US&gl=US&ceid=US:en`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch RSS');

        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        const newsItems = [];
        $('item').each((i, el) => {
            if (i > 15) return; // Limit to 15 items
            const titleFull = $(el).find('title').text();
            const link = $(el).find('link').text();
            const pubDate = $(el).find('pubDate').text();

            // Google News parsing
            // Title usually "Headline - Source"
            let title = titleFull;
            let source = $(el).find('source').text() || 'Google News';

            const splitTitle = titleFull.lastIndexOf(' - ');
            if (splitTitle !== -1) {
                source = titleFull.substring(splitTitle + 3);
                title = titleFull.substring(0, splitTitle);
            }

            // Description in Google News is often HTML snippet, we'll strip tags
            // For simplified display, we might just use the title as snippet if desc is poor
            const rawDesc = $(el).find('description').text();
            const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, '');

            newsItems.push({
                source: source,
                time: new Date(pubDate).toLocaleDateString(),
                title: title,
                snippet: cleanDesc.length > 10 ? (cleanDesc.slice(0, 150) + '...') : title, // Fallback to title if desc is empty
                url: link,
                tag: 'News'
            });
        });

        res.json(newsItems);
    } catch (error) {
        console.error('RSS News fetch error:', error);
        res.status(500).json([]);
    }
});

// Google Finance Scraper
app.get('/api/google-finance/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;

        // 0. Clean symbol for DB
        const dbSymbol = ticker.toUpperCase();

        // 1. Check Cache
        const cached = db.prepare('SELECT data, updated_at FROM google_finance_data WHERE symbol = ?').get(dbSymbol);
        if (cached) {
            const now = Date.now();
            const updatedAt = new Date(cached.updated_at).getTime();
            const maxAge = 1000 * 60 * 30; // 30 minutes cache

            if (now - updatedAt < maxAge) {
                try {
                    const data = JSON.parse(cached.data);
                    if (data && Object.keys(data).length > 0) {
                        console.log(`Serving cached Google Finance data for ${dbSymbol}`);
                        return res.json(data);
                    }
                } catch (e) { /* ignore and refetch */ }
            }
        }

        // Heuristic for ticker format (Yahoo suffix -> Google Exchange)
        let queryTicker = ticker;
        if (!queryTicker.includes(':')) {
            if (queryTicker.endsWith('.MC')) queryTicker = `${queryTicker.replace('.MC', '')}:BME`;
            else if (queryTicker.endsWith('.PA')) queryTicker = `${queryTicker.replace('.PA', '')}:EPA`;
            else if (queryTicker.endsWith('.DE')) queryTicker = `${queryTicker.replace('.DE', '')}:FRA`;
            else if (queryTicker.endsWith('.L')) queryTicker = `${queryTicker.replace('.L', '')}:LON`;
            else if (queryTicker.endsWith('.AM')) queryTicker = `${queryTicker.replace('.AM', '')}:AMS`;
            else if (queryTicker.endsWith('.TO')) queryTicker = `${queryTicker.replace('.TO', '')}:TSE`;
            else queryTicker = `${ticker}:NASDAQ`;
        }

        const url = `https://www.google.com/finance/quote/${queryTicker}?hl=es`;
        console.log(`Scraping Google Finance: ${url}`);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Cookie': 'CONSENT=YES+Cb.20250101-00-00; SOCS=CAESHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVzIAEaBgiAo_WmBg;'
            }
        });

        if (!response.ok) {
            throw new Error(`Google Finance error: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const data = {};

        const parseValue = (text) => {
            if (!text) return null;
            let clean = text.replace(/USD|EUR|\$|€|GBP/g, '').trim();

            let multiplier = 1;

            if (/[0-9\s](T|t)$/.test(clean)) { multiplier = 1e12; clean = clean.replace(/(T|t)$/, ''); }
            else if (/[0-9\s](B|b)$/.test(clean)) { multiplier = 1e9; clean = clean.replace(/(B|b)$/, ''); } // B = Billion (10^9)
            else if (/[0-9\s](M|m)$/.test(clean)) { multiplier = 1e6; clean = clean.replace(/(M|m)$/, ''); }
            else if (/[0-9\s](K|k)$/.test(clean)) { multiplier = 1e3; clean = clean.replace(/(K|k)$/, ''); }

            clean = clean.replace(/\./g, '').replace(',', '.').replace(/%/g, '').trim();
            const val = parseFloat(clean);
            return isNaN(val) ? text : val * multiplier;
        };

        const labels = {
            'Cierre anterior': 'previousClose',
            'CIERRE ANTERIOR': 'previousClose',
            'Intervalo diario': 'dayRange',
            'INTERVALO DIARIO': 'dayRange',
            'Intervalo anual': 'yearRange',
            'INTERVALO ANUAL': 'yearRange',
            'Cap. bursátil': 'marketCap',
            'CAP. BURSÁTIL': 'marketCap',
            'Volumen medio': 'avgVolume',
            'VOLUMEN MEDIO': 'avgVolume',
            'Relación precio-beneficio': 'peRatio',
            'RELACIÓN PRECIO-BENEFICIO': 'peRatio',
            'Rentabilidad por dividendo': 'dividendYield',
            'RENTABILIDAD POR DIVIDENDO': 'dividendYield',
            'Bolsa de valores principal': 'primaryExchange',
            'BOLSA DE VALORES PRINCIPAL': 'primaryExchange'
        };

        // Strategy 1: Metric pairs usually reside in div.gyY43 containers
        $('.gyY43').each((i, el) => {
            const labelEl = $(el).find('.m68ZCc');
            const valueEl = $(el).find('.P63o9b');

            if (labelEl.length && valueEl.length) {
                const labelText = labelEl.text().trim();
                const valueText = valueEl.text().trim();

                const key = labels[labelText] || labels[labelText.toUpperCase()];

                if (key) {
                    if (key === 'dayRange') {
                        const parts = valueText.split('-').map(p => parseValue(p));
                        data.dayLow = parts[0];
                        data.dayHigh = parts[1];
                    } else if (key === 'yearRange') {
                        const parts = valueText.split('-').map(p => parseValue(p));
                        data.fiftyTwoWeekLow = parts[0];
                        data.fiftyTwoWeekHigh = parts[1];
                    } else if (key === 'dividendYield') {
                        data[key] = parseValue(valueText) / 100;
                    } else {
                        data[key] = parseValue(valueText);
                    }
                }
            }
        });

        // Strategy 2: Text search fallback override
        $('div').each((i, el) => {
            const text = $(el).text().trim();
            const key = labels[text] || labels[text.toUpperCase()];

            if (key && !data[key]) {
                let val = null;

                const nextEl = $(el).next();
                if (nextEl.length && !nextEl.attr('role')) {
                    val = nextEl.text().trim();
                }

                if (!val || val.length > 50) {
                    const parentNext = $(el).parent().next();
                    if (parentNext.length) {
                        val = parentNext.text().trim();
                    }
                }

                if (!val) {
                    const row = $(el).closest('div[class*="gy"]');
                    if (row.length) {
                        val = row.find('.P63o9b, .P6K39c').first().text().trim();
                    }
                }

                if (val) {
                    if (val.includes('Margen entre') || val.includes('Método de')) return;

                    if (key === 'dayRange') {
                        const parts = val.split('-').map(p => parseValue(p));
                        data.dayLow = parts[0];
                        data.dayHigh = parts[1];
                    } else if (key === 'yearRange') {
                        const parts = val.split('-').map(p => parseValue(p));
                        data.fiftyTwoWeekLow = parts[0];
                        data.fiftyTwoWeekHigh = parts[1];
                    } else if (key === 'dividendYield') {
                        data[key] = parseValue(val) / 100;
                    } else {
                        data[key] = parseValue(val);
                    }
                }
            }
        });

        // Also try to scrape the price if available
        const currentPriceText = $('.YMlKec.fxKbKc').first().text();
        if (currentPriceText) {
            data.currentPrice = parseValue(currentPriceText);
        }

        // Cache the result if we got valid data
        if (Object.keys(data).length > 2) { // Ensure we scraped something useful
            try {
                db.prepare(`
                    INSERT INTO google_finance_data (symbol, data, updated_at) 
                    VALUES (?, ?, datetime('now')) 
                    ON CONFLICT(symbol) DO UPDATE SET 
                        data = excluded.data, 
                        updated_at = datetime('now')
                `).run(dbSymbol, JSON.stringify(data));
                console.log(`Cached Google Finance data for ${dbSymbol}`);
            } catch (dbError) {
                console.error('Failed to cache Google Finance data:', dbError);
            }
        }

        res.json(data);
    } catch (error) {
        console.error('Google Finance Scraping Error:', error);

        // Try serving stale cache if live fetch fails
        try {
            const dbSymbol = ticker.toUpperCase();
            const cached = db.prepare('SELECT data FROM google_finance_data WHERE symbol = ?').get(dbSymbol);
            if (cached) {
                console.log(`Serving STALE cache for ${dbSymbol} after fetch failure`);
                return res.json(JSON.parse(cached.data));
            }
        } catch (e) { }

        res.status(500).json({});
    }


});
// Serve Static Files (Production/Docker)
if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
