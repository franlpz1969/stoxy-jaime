import React from 'react';
import { getCompanyLogo } from '../services/geminiService';

const LogoTestView: React.FC = () => {
    const testStocks = [
        { symbol: 'AAPL', name: 'Apple Inc.', tvName: 'apple' },
        { symbol: 'GOOG', name: 'Google', tvName: 'google' },
        { symbol: 'JNJ', name: 'Johnson & Johnson', tvName: 'johnson-and-johnson' },
        { symbol: 'MSFT', name: 'Microsoft', tvName: 'microsoft' }
    ];

    // Internal logic for testing ONLY - does not affect the rest of the app
    const getTestLogo = (stock: any) => {
        return `https://s3-symbol-logo.tradingview.com/${stock.tvName}--big.svg`;
    };

    return (
        <div className="p-8 bg-white dark:bg-black min-h-screen">
            <h1 className="text-3xl font-black mb-2 text-gray-900 dark:text-white">Laboratory: Logo Verification</h1>
            <p className="text-gray-500 mb-10">Testing AAPL, GOOG, JNJ, MSFT internally without touching the main app.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {testStocks.map(stock => (
                    <div key={stock.symbol} className="p-10 border border-gray-200 dark:border-zinc-800 rounded-[2.5rem] flex flex-col items-center gap-6 bg-white dark:bg-[#09090b] shadow-xl">
                        <div className="flex gap-4 items-center">
                            <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{stock.symbol}</span>
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest">High Def</span>
                        </div>

                        <div className="w-40 h-40 rounded-[2.5rem] bg-gray-50 dark:bg-zinc-800/10 border border-gray-100 dark:border-zinc-800 flex items-center justify-center p-6 shadow-inner group hover:scale-105 transition-transform duration-500">
                            <img
                                src={getTestLogo(stock)}
                                alt={stock.symbol}
                                className="w-full h-full object-contain drop-shadow-2xl"
                                onError={(e) => {
                                    e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${stock.symbol.toLowerCase()}.com&sz=128`;
                                }}
                            />
                        </div>

                        <div className="text-center">
                            <div className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-1">Company Name</div>
                            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-200">{stock.name}</div>
                            <div className="text-[9px] font-mono text-zinc-500 mt-6 break-all opacity-50">
                                {getTestLogo(stock)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-16 p-10 bg-blue-600 text-white rounded-[3rem] shadow-2xl shadow-blue-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <h2 className="font-black text-2xl mb-4 relative z-10">Safe Test Mode Active</h2>
                <div className="space-y-4 text-blue-100 text-sm relative z-10 leading-relaxed max-w-xl">
                    <p>
                        This laboratory uses <span className="text-white font-black underline decoration-2 underline-offset-4">Internal Local Logic</span>.
                        Changing this file will NOT affect how logos look in Markets or Portfolio until we manually approve the implementation.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LogoTestView;
