// components/ExchangeRates.tsx
import React, { useState, useEffect } from 'react';
import { ConversionRates } from '../types';
import { RefreshCw, Save, CheckCircle } from 'lucide-react';

interface ExchangeRatesProps {
  rates: ConversionRates;
  onUpdate: (rates: ConversionRates) => void;
}

export const ExchangeRates: React.FC<ExchangeRatesProps> = ({ rates, onUpdate }) => {
  // Safe initialization
  const [localRates, setLocalRates] = useState<ConversionRates>({
    USD: rates?.USD || 320,
    EUR: rates?.EUR || 330
  });

  const [saved, setSaved] = useState(false);

  // Sync state if props change (e.g. on load)
  useEffect(() => {
    if (rates) {
        setLocalRates(prev => ({
            ...prev,
            USD: rates.USD || prev.USD,
            EUR: rates.EUR || prev.EUR
        }));
    }
  }, [rates]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Allow empty string while typing, convert to number on blur/save if needed
    setLocalRates(prev => ({ 
        ...prev, 
        [name]: parseFloat(value) 
    }));
    setSaved(false);
  };

  const handleSave = () => {
    // Ensure we don't save NaNs
    const cleanRates = {
        USD: localRates.USD || 0,
        EUR: localRates.EUR || 0
    };
    onUpdate(cleanRates);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3">
            <RefreshCw className="text-blue-600" /> Exchange Rates
        </h2>
        <p className="text-slate-500 mt-2">Manage conversion rates against Cuban Peso (CUP).</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="space-y-6">
            
            {/* USD Input */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-500">1 USD</span>
                    <span className="text-slate-400">=</span>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        name="USD"
                        value={localRates.USD ?? ''} // Use ?? '' to prevent uncontrolled error
                        onChange={handleChange}
                        className="text-right text-xl font-bold text-slate-800 bg-white border border-slate-300 rounded-lg p-2 w-32 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                    />
                    <span className="font-semibold text-slate-600">CUP</span>
                </div>
            </div>

            {/* EUR Input */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-500">1 EUR</span>
                    <span className="text-slate-400">=</span>
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        name="EUR"
                        value={localRates.EUR ?? ''}
                        onChange={handleChange}
                        className="text-right text-xl font-bold text-slate-800 bg-white border border-slate-300 rounded-lg p-2 w-32 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                    />
                    <span className="font-semibold text-slate-600">CUP</span>
                </div>
            </div>

            <button 
                onClick={handleSave}
                className={`w-full mt-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                    saved 
                    ? 'bg-emerald-500 text-white shadow-emerald-200' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                }`}
            >
                {saved ? <><CheckCircle size={20}/> Rates Updated</> : <><Save size={20}/> Update Rates</>}
            </button>
        </div>
      </div>
    </div>
  );
};