import React from 'react';
import { TrendingUp, Shield, Zap, Globe, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import LoginButton from './LoginButton';

interface LandingViewProps {
    language: string;
    theme: 'dark' | 'light';
}

const LandingView: React.FC<LandingViewProps> = ({ language, theme }) => {
    const t = (en: string, es: string) => language === 'es' ? es : en;

    return (
        <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
            {/* Background elements for that premium feel */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse delay-700" />

            <div className="max-w-2xl w-full relative z-10 text-center space-y-12">
                {/* Hero Logo & Name */}
                <div className="space-y-4 animate-in fade-in slide-in-from-top-10 duration-700">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-500/20 rounded-3xl mb-4 border border-blue-500/30 shadow-xl shadow-blue-500/10">
                        <TrendingUp size={48} className="text-blue-500" />
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                        StockTracker <span className="text-blue-500">Pro</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-zinc-400 font-medium leading-relaxed max-w-lg mx-auto">
                        {t(
                            "Master your investments with professional-grade tools, real-time data, and effortless portfolio management.",
                            "Domina tus inversiones con herramientas profesionales, datos en tiempo real y una gestión de cartera sin esfuerzo."
                        )}
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
                    <div className="group p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-3xl text-left hover:border-blue-500/50 transition-all duration-300">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                            <BarChart3 size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-500 transition-colors">
                            {t("Real-time Analytics", "Análisis en tiempo real")}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-500">
                            {t("Live market data feeds and interactive charts.", "Datos de mercado en vivo y gráficos interactivos.")}
                        </p>
                    </div>

                    <div className="group p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-3xl text-left hover:border-purple-500/50 transition-all duration-300">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                            <Shield size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-500 transition-colors">
                            {t("Secure Data", "Datos seguros")}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-500">
                            {t("Automatic backup and sync across devices.", "Respaldo automático y sincronización entre dispositivos.")}
                        </p>
                    </div>

                    <div className="group p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-3xl text-left hover:border-emerald-500/50 transition-all duration-300">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
                            <PieChartIcon size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-500 transition-colors">
                            {t("Wealth Insights", "Visión Patrimonial")}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-500">
                            {t("Detailed breakdowns of your asset allocation.", "Desgloses detallados de la asignación de activos.")}
                        </p>
                    </div>

                    <div className="group p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-3xl text-left hover:border-orange-500/50 transition-all duration-300">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform">
                            <Zap size={20} />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-orange-500 transition-colors">
                            {t("Smart Signals", "Señales inteligentes")}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-500">
                            {t("Stay informed with AI-driven market analysis.", "Mantente informado con análisis de mercado por IA.")}
                        </p>
                    </div>
                </div>

                {/* Login Section */}
                <div className="space-y-6 pt-10 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
                    <div className="flex flex-col items-center gap-4">
                        <LoginButton className="shadow-2xl shadow-blue-500/20 scale-110" />
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600 bg-gray-100 dark:bg-zinc-900 px-4 py-1.5 rounded-full border border-gray-200 dark:border-zinc-800">
                            {t("Ready to start your journey?", "¿Listo para comenzar tu viaje?")}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-20 text-center opacity-50 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                        V1.2.0 • Premium Financial Ecosystem
                    </p>
                    <div className="flex items-center justify-center gap-4 text-gray-400 dark:text-zinc-600">
                        <Globe size={14} />
                        <div className="h-4 w-[1px] bg-gray-300 dark:bg-zinc-800" />
                        <p className="text-[10px] font-bold">Encrypted & Decentralized Backbone</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingView;
