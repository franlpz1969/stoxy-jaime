import React, { useRef } from 'react';
import { X, Download, Upload, LogOut, User, Globe, ChevronRight, Mail } from 'lucide-react';

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onLogin: () => void;
  onLogout: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  language: string;
  setLanguage: (lang: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
  onExport,
  onImport,
  language,
  setLanguage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const t = (en: string, es: string) => language === 'es' ? es : en;

  return (
    <div className="fixed inset-0 z-[60] bg-black animate-in slide-in-from-right duration-300 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md">
        <h2 className="text-xl font-bold text-white">{t('Settings', 'Configuración')}</h2>
        <button 
          onClick={onClose} 
          className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Profile Section */}
        <section>
          <h3 className="text-zinc-500 text-xs font-bold uppercase mb-4 ml-1">{t('Account', 'Cuenta')}</h3>
          <div className="bg-[#1C1C1E] border border-zinc-800 rounded-3xl overflow-hidden">
            {user ? (
              <div className="p-4 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                       {user.name.charAt(0)}
                    </div>
                    <div>
                       <div className="font-bold text-white">{user.name}</div>
                       <div className="text-zinc-500 text-sm">{user.email}</div>
                    </div>
                 </div>
                 <button 
                   onClick={onLogout}
                   className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                 >
                   <LogOut size={20} />
                 </button>
              </div>
            ) : (
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-600">
                    <User size={32} />
                 </div>
                 <h4 className="text-white font-bold mb-2">{t('Sign in to Stoxy', 'Iniciar sesión en Stoxy')}</h4>
                 <p className="text-zinc-500 text-sm mb-6">{t('Sync your portfolio across devices.', 'Sincroniza tu portafolio en todos tus dispositivos.')}</p>
                 
                 <button 
                   onClick={onLogin}
                   className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                 >
                   <Mail size={18} />
                   {t('Continue with Google', 'Continuar con Google')}
                 </button>
              </div>
            )}
          </div>
        </section>

        {/* General Settings */}
        <section>
           <h3 className="text-zinc-500 text-xs font-bold uppercase mb-4 ml-1">{t('General', 'General')}</h3>
           <div className="bg-[#1C1C1E] border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800">
              
              {/* Language */}
              <div className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-500 flex items-center justify-center">
                       <Globe size={18} />
                    </div>
                    <span className="font-medium text-white">{t('Language', 'Idioma')}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="flex bg-black p-1 rounded-lg border border-zinc-800">
                       <button 
                         onClick={() => setLanguage('en')}
                         className={`px-3 py-1 rounded text-xs font-bold transition-all ${language === 'en' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                       >
                         EN
                       </button>
                       <button 
                         onClick={() => setLanguage('es')}
                         className={`px-3 py-1 rounded text-xs font-bold transition-all ${language === 'es' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                       >
                         ES
                       </button>
                    </div>
                 </div>
              </div>

           </div>
        </section>

        {/* Data Management */}
        <section>
           <h3 className="text-zinc-500 text-xs font-bold uppercase mb-4 ml-1">{t('Data Management', 'Gestión de Datos')}</h3>
           <div className="bg-[#1C1C1E] border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800">
              
              <button onClick={onExport} className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors group text-left">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center">
                       <Download size={18} />
                    </div>
                    <div>
                       <div className="font-medium text-white">{t('Export Data', 'Exportar Datos')}</div>
                       <div className="text-xs text-zinc-500">{t('Save portfolio as JSON', 'Guardar portafolio como JSON')}</div>
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-zinc-700 group-hover:text-white transition-colors" />
              </button>

              <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors group text-left">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                       <Upload size={18} />
                    </div>
                    <div>
                       <div className="font-medium text-white">{t('Import Data', 'Importar Datos')}</div>
                       <div className="text-xs text-zinc-500">{t('Restore portfolio from JSON', 'Restaurar desde JSON')}</div>
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-zinc-700 group-hover:text-white transition-colors" />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".json" 
                onChange={onImport}
              />

           </div>
        </section>
        
        <div className="text-center text-zinc-600 text-xs mt-8">
           StockTracker Pro v1.2.0 • {t('Made with Gemini', 'Hecho con Gemini')}
        </div>

      </div>
    </div>
  );
};

export default SettingsView;