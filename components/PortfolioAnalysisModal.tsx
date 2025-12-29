import React, { useMemo } from 'react';
import { X, Sparkles, AlertCircle, FileText, PieChart, Layers, Globe, ShieldAlert, TrendingUp, Target, Zap, BookOpen, CheckCircle2, AlertTriangle, Lightbulb, Flame, ChevronRight, Info } from 'lucide-react';

interface PortfolioAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisText: string;
  isAnalyzing: boolean;
}

const PortfolioAnalysisModal: React.FC<PortfolioAnalysisModalProps> = ({
  isOpen,
  onClose,
  analysisText,
  isAnalyzing
}) => {
  if (!isOpen) return null;

  // Complex Parser for fluid UI components
  const sections = useMemo(() => {
    if (!analysisText) return [];
    
    // Improved splitting to be more resilient to model formatting variations
    const splitRegex = /(?=## 3\.\d)/g;
    const parts = analysisText.split(splitRegex);
    
    return parts.map(part => {
      const lines = part.split('\n');
      const firstLine = lines[0];
      const title = firstLine.replace(/#+|3\.\d+\s*/g, '').trim();
      const rawContent = lines.slice(1).join('\n').trim();
      const id = firstLine.match(/3\.\d+/)?.[0] || '0';

      return { id, title, rawContent };
    }).filter(s => s.rawContent.length > 0 || s.title.length > 0);
  }, [analysisText]);

  // Sub-renderer for Institutional Minimalist Tables
  const renderTable = (content: string) => {
    const lines = content.split('\n').filter(l => l.includes('|'));
    if (lines.length < 2) return null;

    const dataLines = lines.filter(l => !l.match(/^[|:\-\s]+$/));
    const headers = dataLines[0].split('|').map(h => h.trim()).filter(Boolean);
    const rows = dataLines.slice(1).map(row => row.split('|').map(c => c.trim()).filter(Boolean));

    return (
      <div className="my-8 overflow-hidden group/table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-800/40">
                {headers.map((h, i) => (
                  <th key={i} className="py-3 px-1 font-black text-zinc-500 uppercase text-[9px] tracking-[0.3em] group-hover/table:text-zinc-300 transition-colors">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/30">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-blue-500/[0.03] transition-colors group/row">
                  {row.map((cell, j) => (
                    <td key={j} className={`py-4 px-1 text-zinc-300 font-medium ${j > 0 ? 'font-mono text-xs text-blue-400/90' : 'text-sm'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Improved SWOT Renderer with robust parsing and empty states
  const renderSwot = (content: string) => {
    const swotTypes = [
        { label: 'Fortalezas', icon: <CheckCircle2 size={18} />, color: 'text-emerald-400', accent: 'bg-emerald-500/20' },
        { label: 'Debilidades', icon: <AlertTriangle size={18} />, color: 'text-rose-400', accent: 'bg-rose-500/20' },
        { label: 'Oportunidades', icon: <Lightbulb size={18} />, color: 'text-blue-400', accent: 'bg-blue-500/20' },
        { label: 'Amenazas', icon: <Flame size={18} />, color: 'text-orange-400', accent: 'bg-orange-500/20' }
    ];

    return (
      <div className="space-y-10 my-8">
        {swotTypes.map((type) => {
            // More robust line-by-line searching for headers
            const lines = content.split('\n');
            let foundIndex = -1;
            for(let i=0; i<lines.length; i++) {
                if (lines[i].toLowerCase().includes(type.label.toLowerCase())) {
                    foundIndex = i;
                    break;
                }
            }

            let listItems: string[] = [];
            if (foundIndex !== -1) {
                // Collect lines until next header or end
                for(let j=foundIndex+1; j<lines.length; j++) {
                    const line = lines[j].trim();
                    if (line.startsWith('**') || (line.includes(':') && line.length < 20)) break; // Stop at next section
                    if (line) listItems.push(line.replace(/^[*-]\s*/, ''));
                }
            }

            return (
              <div key={type.label} className="relative pl-10 animate-in fade-in slide-in-from-left-4 duration-700">
                {/* Vertical Visual Connector */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${type.accent} rounded-full opacity-40`}></div>
                
                <div className={`flex items-center gap-3 mb-4 ${type.color}`}>
                  <div className={`p-1.5 rounded-lg ${type.accent} bg-opacity-10 border border-current border-opacity-20`}>
                    {type.icon}
                  </div>
                  <span className="font-black text-[11px] uppercase tracking-[0.3em]">{type.label}</span>
                </div>
                
                {listItems.length > 0 ? (
                  <ul className="space-y-4">
                    {listItems.map((item, i) => (
                      <li key={i} className="text-zinc-300 text-[13px] leading-relaxed flex gap-4 group">
                        <ChevronRight size={14} className="mt-1 text-zinc-700 group-hover:text-blue-400 transition-colors shrink-0" />
                        <span className="group-hover:text-white transition-colors">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-3 text-zinc-600 italic text-xs py-2">
                     <Info size={14} />
                     <span>No se han detectado factores críticos en esta categoría.</span>
                  </div>
                )}
              </div>
            );
        })}
      </div>
    );
  };

  const getIconForSection = (id: string) => {
    if (id.includes('3.1')) return <FileText size={22} />;
    if (id.includes('3.2')) return <PieChart size={22} />;
    if (id.includes('3.3')) return <Layers size={22} />;
    if (id.includes('3.4')) return <Globe size={22} />;
    if (id.includes('3.5')) return <ShieldAlert size={22} />;
    if (id.includes('3.6')) return <TrendingUp size={22} />;
    if (id.includes('3.7')) return <Target size={22} />;
    if (id.includes('3.8')) return <Zap size={22} />;
    return <Sparkles size={22} />;
  };

  const renderSectionContent = (id: string, content: string) => {
    if (id.includes('3.7')) return renderSwot(content);
    
    if (content.includes('|')) {
        const table = renderTable(content);
        if (table) return table;
    }

    return (
        <div className="text-zinc-400 text-[14px] leading-loose space-y-5 font-medium pl-2">
            {content.split('\n').map((line, lidx) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                    return (
                        <div key={lidx} className="flex gap-5 items-start animate-in slide-in-from-left-2 duration-300 group">
                           <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0 shadow-[0_0_10px_rgba(37,99,235,0.4)] group-hover:scale-125 transition-transform"></div>
                           <span className="text-zinc-300 group-hover:text-white transition-colors">{trimmed.substring(1).trim()}</span>
                        </div>
                    );
                }
                if (trimmed.startsWith('###')) {
                    return (
                        <h5 key={lidx} className="text-white font-black text-[10px] uppercase tracking-[0.4em] mt-12 mb-6 flex items-center gap-4">
                            <span className="shrink-0">{trimmed.replace(/#+/, '').trim()}</span>
                            <div className="h-px bg-zinc-900 flex-1"></div>
                        </h5>
                    );
                }
                if (trimmed.length === 0) return null;
                return <p key={lidx} className="text-zinc-400 first-letter:text-xl first-letter:font-bold first-letter:text-blue-500 first-letter:mr-1">{trimmed}</p>;
            })}
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-0 bg-black animate-in fade-in duration-700">
      
      {/* Immersive Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-600/5 blur-[160px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-600/5 blur-[160px] rounded-full animate-pulse delay-1000"></div>
          {/* Scanline effect */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20"></div>
      </div>

      <div className="bg-[#050505] w-full max-w-6xl h-full flex flex-col relative z-10 shadow-[0_0_100px_rgba(0,0,0,0.8)] border-x border-zinc-900/50">
        
        {/* Narrative Institutional Header */}
        <div className="px-12 py-12 flex justify-between items-start border-b border-zinc-900/50 bg-black/40 backdrop-blur-3xl sticky top-0 z-20">
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-600/10 rounded-xl border border-blue-500/20">
                    <Sparkles size={24} className="text-blue-500 animate-pulse" />
                </div>
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.5em]">System Intelligence v3.5 • High Conviction</span>
             </div>
             <h2 className="text-5xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-zinc-500">
                Análisis Estratégico
             </h2>
             <div className="flex items-center gap-5 text-zinc-600 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">
                <span className="px-2 py-0.5 border border-zinc-800 rounded bg-zinc-900/30">ID: SEC-INT-99</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span>
                <span>Informe de Activos de Grado Institucional</span>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all shadow-2xl active:scale-90 border border-zinc-800/50 group"
          >
            <X size={26} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>

        {/* Content Body - Liquid Timeline Flow */}
        <div className="flex-1 overflow-y-auto px-12 md:px-24 py-16 custom-scrollbar scroll-smooth">
          {isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-12 animate-in fade-in zoom-in duration-1000">
               <div className="relative">
                 <div className="w-48 h-48 border border-zinc-900 rounded-full flex items-center justify-center">
                    <div className="w-40 h-40 border-b border-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 border-t border-indigo-500 rounded-full animate-spin-slow"></div>
                    </div>
                 </div>
                 <Sparkles className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={56} />
               </div>
               <div className="space-y-6">
                 <h3 className="text-white font-black text-4xl tracking-tighter">Procesando Tesis Inversora...</h3>
                 <p className="text-zinc-600 text-xl max-w-lg mx-auto leading-relaxed font-bold italic tracking-tight">
                    Correlacionando factores macroeconómicos con la estructura actual de tu patrimonio.
                 </p>
               </div>
               <div className="flex gap-5">
                  {[0, 200, 400, 600].map((delay) => (
                    <div key={delay} className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" style={{ animationDelay: `${delay}ms` }}></div>
                  ))}
               </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-24 relative">
               
               {/* Vertical Connectivity Axis (The Thesis Line) */}
               <div className="absolute left-[-50px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-500/40 via-zinc-800 to-transparent hidden md:block"></div>

               {/* Fluid Sections */}
               {sections.length > 0 ? (
                 sections.map((section, idx) => (
                   <div 
                      key={section.id} 
                      className="relative animate-in fade-in slide-in-from-bottom-16 duration-1000 fill-mode-both"
                      style={{ animationDelay: `${idx * 180}ms` }}
                   >
                      {/* Interactive Section Marker */}
                      <div className="absolute left-[-60px] top-1 w-5 h-5 rounded-full bg-black border-[3px] border-zinc-800 flex items-center justify-center hidden md:flex z-10 group cursor-default">
                         <div className="w-2 h-2 rounded-full bg-zinc-700 group-hover:bg-blue-500 group-hover:scale-150 transition-all shadow-[0_0_15px_rgba(59,130,246,0)] group-hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                      </div>

                      <div className="flex items-center gap-5 mb-10 group/title">
                         <div className="text-blue-500 p-3 bg-blue-500/5 rounded-2xl border border-blue-500/10 group-hover/title:bg-blue-500/10 transition-colors">
                            {getIconForSection(section.id)}
                         </div>
                         <h4 className="text-3xl font-black text-white tracking-tight uppercase tracking-[0.15em] group-hover/title:text-blue-400 transition-colors">{section.title}</h4>
                      </div>
                      
                      <div className="prose prose-invert max-w-none">
                        {renderSectionContent(section.id, section.rawContent)}
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="text-zinc-500 text-xl leading-relaxed whitespace-pre-wrap font-bold italic py-20 text-center border border-dashed border-zinc-800 rounded-3xl">
                    Iniciando secuencia de análisis... <br/> 
                    <span className="text-xs font-normal mt-4 block text-zinc-700">Si el informe no aparece en 10 segundos, reintente la operación.</span>
                 </div>
               )}

               {/* Footer Disclaimer - Elegant Typography */}
               <div className="pt-20 pb-32 flex flex-col items-center gap-10">
                  <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-zinc-900/40 to-black border border-zinc-800/40 flex gap-6 max-w-2xl shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShieldAlert size={80} />
                    </div>
                    <AlertCircle size={28} className="text-amber-500 shrink-0 mt-1" />
                    <div className="space-y-3">
                        <p className="text-[12px] text-zinc-400 font-bold leading-relaxed uppercase tracking-widest">
                            Cláusula de Exención Institucional
                        </p>
                        <p className="text-[11px] text-zinc-600 font-medium leading-relaxed italic">
                            Este documento es una proyección algorítmica. El rendimiento pasado no garantiza resultados futuros. La toma de decisiones financieras recae enteramente en el usuario final.
                        </p>
                    </div>
                  </div>
                  <div className="text-zinc-800 text-[11px] font-black uppercase tracking-[0.6em] animate-pulse">
                     Core v3.5 • Institutional Engine
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Floating High-End Footer Action */}
        {!isAnalyzing && (
          <div className="p-10 border-t border-zinc-900/50 bg-black/60 backdrop-blur-3xl flex justify-center sticky bottom-0 z-30">
             <button 
                onClick={onClose}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black px-20 py-5 rounded-full text-[11px] transition-all shadow-[0_20px_40px_rgba(37,99,235,0.25)] active:scale-95 flex items-center justify-center gap-5 uppercase tracking-[0.3em] hover:shadow-[0_20px_50px_rgba(37,99,235,0.4)]"
             >
                <CheckCircle2 size={20} />
                Confirmar Lectura del Informe
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioAnalysisModal;