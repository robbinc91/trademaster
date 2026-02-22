import React, { useState } from 'react';
import { StoreData } from '../types';
import { analyzeStoreData } from '../services/geminiService';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AIAnalystProps {
  data: StoreData;
}

export const AIAnalyst: React.FC<AIAnalystProps> = ({ data }) => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');
    
    try {
        const result = await analyzeStoreData(data, query, language);
        setResponse(result);
    } catch (err) {
        setResponse(t('error_ai'));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3">
            <Sparkles className="text-purple-600" /> {t('ai_title')}
        </h2>
        <p className="text-slate-500 mt-2">
            {t('ai_desc')} 
            <br/>{t('powered_by')}
        </p>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
            {!response && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 max-w-md text-center">
                        <p className="text-sm">{t('try_asking')}</p>
                        <ul className="text-xs mt-2 space-y-2 text-slate-600">
                            <li className="bg-slate-50 p-2 rounded cursor-pointer hover:bg-slate-100" onClick={() => setQuery(t('prompt_invested'))}>"{t('prompt_invested')}"</li>
                            <li className="bg-slate-50 p-2 rounded cursor-pointer hover:bg-slate-100" onClick={() => setQuery(t('prompt_profitable'))}>"{t('prompt_profitable')}"</li>
                            <li className="bg-slate-50 p-2 rounded cursor-pointer hover:bg-slate-100" onClick={() => setQuery(t('prompt_transport'))}>"{t('prompt_transport')}"</li>
                        </ul>
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin text-purple-600" size={40} />
                </div>
            )}

            {response && (
                <div className="prose prose-slate max-w-none p-4">
                    <div className="flex gap-4">
                        <div className="min-w-[32px] h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white">
                            <Sparkles size={16} />
                        </div>
                        <div className="bg-white p-6 rounded-2xl rounded-tl-none shadow-sm border border-slate-200">
                            {/* Simple markdown rendering for line breaks and lists */}
                            {response.split('\n').map((line, i) => (
                                <p key={i} className="mb-2 last:mb-0">{line}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
            <form onSubmit={handleAsk} className="flex gap-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('ask_placeholder')}
                    className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
                <button 
                    type="submit" 
                    disabled={loading || !query.trim()}
                    className="bg-purple-600 text-white px-6 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};