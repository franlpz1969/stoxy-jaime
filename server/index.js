import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import * as cheerio from 'cheerio';

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

// Google Finance Scraper
app.get('/api/google-finance/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;

        // Basic fallback heuristic for ticker format if needed
        let queryTicker = ticker;
        if (!queryTicker.includes(':')) {
            queryTicker = `${ticker}:NASDAQ`;
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
            let clean = text.replace(/USD|EUR|\$|€/g, '').trim();

            let multiplier = 1;
            if (clean.includes(' B')) { multiplier = 1e9; clean = clean.replace(' B', ''); }
            else if (clean.includes(' M')) { multiplier = 1e6; clean = clean.replace(' M', ''); }
            else if (clean.includes(' k')) { multiplier = 1e3; clean = clean.replace(' k', ''); }
            else if (clean.includes(' T')) { multiplier = 1e12; clean = clean.replace(' T', ''); }

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
        // Label class: .m68ZCc
        // Value class: .P63o9b

        $('.gyY43').each((i, el) => {
            const labelEl = $(el).find('.m68ZCc');
            const valueEl = $(el).find('.P63o9b');

            if (labelEl.length && valueEl.length) {
                const labelText = labelEl.text().trim();
                const valueText = valueEl.text().trim();

                // Check exact match or case-insensitive
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
        // Handles nested structures like: Row > Span > [Label, Tooltip] + ValueDiv
        $('div').each((i, el) => {
            const text = $(el).text().trim();
            const key = labels[text] || labels[text.toUpperCase()];

            if (key && !data[key]) {
                let val = null;

                // Path 1: Value is next sibling (Simple case)
                // e.g. <div>Label</div><div>Value</div>
                const nextEl = $(el).next();
                if (nextEl.length && !nextEl.attr('role')) { // Avoid tooltips with role="tooltip"
                    val = nextEl.text().trim();
                }

                // Path 2: Value is sibling of parent (Google Finance with Tooltips)
                // e.g. <span><div>Label</div><div role="tooltip">...</div></span><div class="P6K39c">Value</div>
                if (!val || val.length > 50) { // If val is too long, it's probably a description
                    const parentNext = $(el).parent().next();
                    if (parentNext.length) {
                        val = parentNext.text().trim();
                    }
                }

                // Path 3: Explicit class search in Row
                if (!val) {
                    const row = $(el).closest('div[class*="gy"]'); // gyY43 or gyFHrc
                    if (row.length) {
                        val = row.find('.P63o9b, .P6K39c').first().text().trim();
                    }
                }

                if (val) {
                    // Validations
                    if (val.includes('Margen entre') || val.includes('Método de')) return; // Skip descriptions

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

        res.json(data);
    } catch (error) {
        console.error('Google Finance Scraping Error:', error);
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
