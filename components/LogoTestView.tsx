import React from 'react';
import { getCompanyLogo } from '../services/geminiService';

const LogoTestView: React.FC = () => {
    const testStocks = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'GOOG', name: 'Google' },
        { symbol: 'JNJ', name: 'Johnson & Johnson' },
        { symbol: 'MSFT', name: 'Microsoft' },
        { symbol: 'AMZN', name: 'Amazon' },
        { symbol: 'TSLA', name: 'Tesla' }
    ];

    return (
        <div className="p-8 bg-white dark:bg-black min-h-screen">
            <h1 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">Logo Test Page</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {testStocks.map(stock => (
                    <div key={stock.symbol} className="p-6 border border-gray-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center gap-4 bg-gray-50 dark:bg-zinc-900/50">
                        <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 dark:border-zinc-800 flex items-center justify-center p-3 shadow-sm">
                            <img
                                src={getCompanyLogo(stock.symbol)}
                                alt={stock.symbol}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    console.error(`Failed to load logo for ${stock.symbol}`);
                                    e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${stock.symbol.toLowerCase()}.com&sz=128`;
                                }}
                            />
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-gray-900 dark:text-white text-xl">{stock.symbol}</div>
                            <div className="text-gray-500 text-sm">{stock.name}</div>
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 break-all max-w-full text-center">
                            {getCompanyLogo(stock.symbol)}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800">
                <h2 className="font-bold text-blue-800 dark:text-blue-400 mb-2">Debug Info:</h2>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                    Esta página usa la función <code>getCompanyLogo()</code> de <code>geminiService.ts</code>.
                    Si ves logos negros/blancos es que está devolviendo la URL de GitHub.
                    Si ves logos en color, es Logo.dev o Clearbit.
                </p>
            </div>
        </div>
    );
};

export default LogoTestView;
