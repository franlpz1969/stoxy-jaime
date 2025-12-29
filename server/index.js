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

// Yahoo Finance Statistics Scraper
app.get('/api/yahoo-stats/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const url = `https://finance.yahoo.com/quote/${symbol}/key-statistics/`;

        // Use more realistic browser headers to avoid detection
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            }
        });

        if (!response.ok) {
            console.error(`Yahoo Finance responded with ${response.status} for ${symbol}`);
            // Return empty stats instead of error to allow app to continue with mock data
            return res.json({});
        }

        const html = await response.text();
        const stats = {};

        // Try to extract data from JSON embedded in the page (more reliable)
        const jsonMatch = html.match(/root\.App\.main\s*=\s*({.+?});/);
        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[1]);
                const quoteData = data?.context?.dispatcher?.stores?.QuoteSummaryStore;

                if (quoteData) {
                    const summary = quoteData.defaultKeyStatistics || {};
                    const financial = quoteData.financialData || {};
                    const price = quoteData.summaryDetail || {};

                    stats.marketCap = summary.marketCap?.fmt || summary.marketCap?.raw;
                    stats.enterpriseValue = summary.enterpriseValue?.fmt || summary.enterpriseValue?.raw;
                    stats.trailingPE = summary.trailingEps?.fmt || summary.trailingEps?.raw;
                    stats.forwardPE = summary.forwardPE?.fmt || summary.forwardPE?.raw;
                    stats.pegRatio = summary.pegRatio?.fmt || summary.pegRatio?.raw;
                    stats.priceToSales = summary.priceToSalesTrailing12Months?.fmt || summary.priceToSalesTrailing12Months?.raw;
                    stats.priceToBook = summary.priceToBook?.fmt || summary.priceToBook?.raw;
                    stats.enterpriseValueToRevenue = summary.enterpriseToRevenue?.fmt || summary.enterpriseToRevenue?.raw;
                    stats.enterpriseValueToEbitda = summary.enterpriseToEbitda?.fmt || summary.enterpriseToEbitda?.raw;
                }
            } catch (parseError) {
                console.error('Failed to parse Yahoo Finance JSON:', parseError);
            }
        }

        // Filter out null/undefined values
        Object.keys(stats).forEach(key => {
            if (!stats[key]) delete stats[key];
        });

        console.log(`Fetched stats for ${symbol}:`, Object.keys(stats).length > 0 ? stats : 'No data');
        res.json(stats);
    } catch (error) {
        console.error('Scraper error:', error.message);
        // Return empty object instead of error to allow app to use mock data
        res.json({});
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
