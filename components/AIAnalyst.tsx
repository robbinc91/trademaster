import React, { useState } from 'react';
import { StoreData } from '../types';
import { analyzeStoreData } from '../services/geminiService';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AIAnalystProps {
  data: StoreData;
}

const PROMPT_KEYS = [
  'prompt_invested',
  'prompt_profitable',
  'prompt_transport',
  'prompt_low_stock',
  'prompt_margin',
  'prompt_partner_compare',
  'prompt_self_take',
  'prompt_cashflow',
  'prompt_rates',
] as const;

export const AIAnalyst: React.FC<AIAnalystProps> = ({ data }) => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const runAnalysis = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setLoading(true);
    setResponse('');
    try {
      const result = await analyzeStoreData(data, q, language);
      if (result === 'MISSING_API_KEY') {
        setResponse(t('ai_error_missing_key'));
      } else if (result.startsWith('API_ERROR:')) {
        console.error(result.slice('API_ERROR:'.length));
        setResponse(t('ai_error_failed'));
      } else {
        setResponse(result);
      }
    } catch {
      setResponse(t('error_ai'));
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setQuery(query.trim());
    await runAnalysis(query.trim());
  };

  const runPreset = async (key: (typeof PROMPT_KEYS)[number]) => {
    const text = t(key);
    setQuery(text);
    await runAnalysis(text);
  };

  return (
    <div className="p-8 h-full flex flex-col max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3">
          <Sparkles className="text-purple-600" /> {t('ai_title')}
        </h2>
        <p className="text-slate-500 mt-2">
          {t('ai_desc')}
          <br />
          {t('powered_by')}
        </p>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
          {!response && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 max-w-2xl w-full text-center">
                <p className="text-sm text-slate-600">
                  {t('try_asking')}
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {PROMPT_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => runPreset(key)}
                      className="text-left text-xs sm:text-sm bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 hover:bg-slate-100 hover:border-purple-200 transition-colors"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <Loader2 className="animate-spin text-purple-600" size={40} />
            </div>
          )}

          {response && (
            <div className="prose prose-slate dark:prose-invert max-w-none p-4">
              <div className="flex gap-4">
                <div className="min-w-[32px] h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="bg-white p-6 rounded-2xl rounded-tl-none shadow-sm border border-slate-200">
                  {response.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0 text-slate-800">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleAsk} className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ask_placeholder')}
              className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white text-slate-900"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-purple-600 text-white px-6 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center shrink-0"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
