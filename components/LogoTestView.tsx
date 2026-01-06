import React from 'react';

const LogoTestView: React.FC = () => {
    const testStocks = [
        { symbol: 'AAPL', name: 'Apple Inc.', tvName: 'apple', domain: 'apple.com' },
        { symbol: 'GOOG', name: 'Google', tvName: 'google', domain: 'google.com' },
        { symbol: 'JNJ', name: 'Johnson & Johnson', tvName: 'johnson-and-johnson', domain: 'jnj.com' },
        { symbol: 'MSFT', name: 'Microsoft', tvName: 'microsoft', domain: 'microsoft.com' }
    ];

    const sources = [
        { name: 'TradingView (SVG)', getUrl: (s: any) => `https://s3-symbol-logo.tradingview.com/${s.tvName}--big.svg` },
        { name: 'GitHub (PNG)', getUrl: (s: any) => `https://raw.githubusercontent.com/nvstly/icons/main/stocks/${s.symbol}.png` },
        { name: 'Logo.dev (PNG)', getUrl: (s: any) => `https://img.logo.dev/${s.domain}?format=png&size=200` },
        { name: 'Google (Favicon)', getUrl: (s: any) => `https://www.google.com/s2/favicons?domain=${s.domain}&sz=128` }
    ];

    return (
        <div className="p-4 md:p-8 bg-white dark:bg-[#09090b] min-h-screen">
            <h1 className="text-3xl font-black mb-2 text-gray-900 dark:text-white tracking-tight">Logo Source Comparison</h1>
            <p className="text-zinc-500 mb-10">Testing AAPL, GOOG, JNJ, MSFT side-by-side from different providers.</p>

            <div className="space-y-16">
                {testStocks.map(stock => (
                    <div key={stock.symbol} className="border-b border-zinc-100 dark:border-zinc-800 pb-12 last:border-0">
                        <div className="flex items-baseline gap-4 mb-8">
                            <h2 className="text-4xl font-black text-blue-600 dark:text-blue-500 tracking-tighter">{stock.symbol}</h2>
                            <span className="text-zinc-400 font-bold uppercase tracking-widest text-xs">{stock.name}</span>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {sources.map(source => (
                                <div key={source.name} className="flex flex-col items-center gap-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 text-center">{source.name}</div>
                                    <div className="w-full aspect-square rounded-[2rem] bg-gray-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center p-6 shadow-sm hover:shadow-xl transition-all duration-300 group">
                                        <img
                                            src={source.getUrl(stock)}
                                            alt={`${stock.symbol} ${source.name}`}
                                            className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => {
                                                e.currentTarget.style.opacity = '0.2';
                                            }}
                                        />
                                    </div>
                                    <div className="w-full text-[8px] font-mono text-zinc-500 truncate opacity-30 hover:opacity-100 transition-opacity px-2 text-center">
                                        {source.getUrl(stock)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-20 p-10 bg-zinc-900 text-white rounded-[3rem] border border-zinc-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                <h2 className="font-black text-2xl mb-4 relative z-10 text-blue-400 text-center">Reference Guide</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-zinc-400 text-sm relative z-10 leading-relaxed max-w-4xl mx-auto">
                    <div>
                        <p className="mb-2"><span className="text-white font-bold">1. TradingView:</span> High-res SVGs. Professional quality, very reliable.</p>
                        <p><span className="text-white font-bold">2. GitHub:</span> Community PNGs. Simple, but sometimes lower quality.</p>
                    </div>
                    <div>
                        <p className="mb-2"><span className="text-white font-bold">3. Logo.dev:</span> Pro PNG source. May fail without auth token.</p>
                        <p><span className="text-white font-bold">4. Google:</span> Classic 128px favicon. Always works, but small.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogoTestView;
