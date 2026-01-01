import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/portfolios', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM portfolios');
        const rows = stmt.all();
        // Return array of parsed data
        const portfolios = rows.map(row => JSON.parse(row.data));
        res.json(portfolios);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolios' });
    }
});

app.post('/api/portfolios', (req, res) => {
    try {
        const portfolios = req.body;
        if (!Array.isArray(portfolios)) {
            return res.status(400).json({ error: 'Expected array of portfolios' });
        }

        const insert = db.prepare('INSERT OR REPLACE INTO portfolios (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
        const deleteOld = db.prepare('DELETE FROM portfolios WHERE id NOT IN (' + portfolios.map(() => '?').join(',') + ')');

        const transaction = db.transaction((items) => {
            // Remove deleted portfolios
            if (items.length > 0) {
                deleteOld.run(...items.map(p => p.id));
            } else {
                db.prepare('DELETE FROM portfolios').run();
            }

            // Upsert current ones
            for (const p of items) {
                insert.run(p.id, JSON.stringify(p));
            }
        });

        transaction(portfolios);
        res.json({ success: true });
    } catch (error) {
        console.error('Database save error:', error);
        res.status(500).json({ error: 'Failed to save portfolios' });
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

        // 1. Check Cache
        const cached = db.prepare('SELECT data, updated_at FROM stock_quotes WHERE symbol = ?').get(symbol);
        if (cached) {
            const cacheDate = new Date(cached.updated_at).toISOString().split('T')[0];
            const today = new Date().toISOString().split('T')[0];

            if (cacheDate === today) {
                console.log(`Serving cached quote summary for ${symbol}`);
                return res.json(JSON.parse(cached.data));
            }
        }

        // 2. Fetch Fresh Data
        if (!yahooSession.crumb) {
            await refreshYahooSession();
        }

        const modules = 'price,summaryDetail,summaryProfile,defaultKeyStatistics,financialData,recommendationTrend';
        let url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}&crumb=${yahooSession.crumb}`;

        const fetchOptions = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': yahooSession.cookie
            }
        };

        let response = await fetch(url, fetchOptions);

        if (response.status === 401) {
            console.log('Got 401 from Yahoo, retrying with new session...');
            await refreshYahooSession();
            url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}&crumb=${yahooSession.crumb}`;
            fetchOptions.headers.Cookie = yahooSession.cookie;
            response = await fetch(url, fetchOptions);
        }

        if (!response.ok) {
            console.error(`Yahoo API error: ${response.status}`);
            return res.status(response.status).json({});
        }

        const data = await response.json();

        // 3. Cache Data
        if (data.quoteSummary?.result) {
            try {
                db.prepare(`
                    INSERT INTO stock_quotes (symbol, data, updated_at) 
                    VALUES (?, ?, datetime('now')) 
                    ON CONFLICT(symbol) DO UPDATE SET 
                        data = excluded.data, 
                        updated_at = datetime('now')
                `).run(symbol, JSON.stringify(data));
                console.log(`Cached quote summary for ${symbol}`);
            } catch (dbError) {
                console.error('Failed to cache quote summary:', dbError);
            }
        }

        res.json(data);
    } catch (error) {
        console.error('Quote summary proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch quote summary' });
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
