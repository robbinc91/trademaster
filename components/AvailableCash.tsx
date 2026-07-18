import React, { useMemo, useState, useEffect } from 'react';
import { MoneyRetirement, Sale, AddMoneyRetirementInput, MoneyRetirementMode } from '../types';
import { CURRENCIES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getAvailableCashByCurrency,
  getLastRetirementDate,
  countSalesAfterRetirement,
  isPartialRetirement
} from '../src/utils/cashAvailable';
import { Wallet, Plus, X, History, Banknote, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const HIDE_KEY = 'trademaster_available_cash_hidden';

interface AvailableCashProps {
  sales: Sale[];
  moneyRetirements: MoneyRetirement[];
  addMoneyRetirement: (input: AddMoneyRetirementInput) => void;
  deleteMoneyRetirement: (id: string) => void;
  compact?: boolean;
}

export const AvailableCash: React.FC<AvailableCashProps> = ({
  sales,
  moneyRetirements,
  addMoneyRetirement,
  deleteMoneyRetirement,
  compact = false
}) => {
  const { t } = useLanguage();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    mode: 'partial' as MoneyRetirementMode,
    amount: '',
    note: ''
  });

  useEffect(() => {
    try {
      localStorage.setItem(HIDE_KEY, hidden ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [hidden]);

  const availableByCurrency = useMemo(
    () => getAvailableCashByCurrency(sales, moneyRetirements),
    [sales, moneyRetirements]
  );

  const currencyRows = useMemo(() => {
    const keys = new Set([
      ...Object.keys(availableByCurrency),
      ...moneyRetirements.map(r => r.currency)
    ]);
    return Array.from(keys)
      .map(currency => ({
        currency,
        available: availableByCurrency[currency] || 0,
        lastRetirement: getLastRetirementDate(moneyRetirements, currency),
        salesCount: countSalesAfterRetirement(sales, moneyRetirements, currency)
      }))
      .filter(row => row.available > 0 || row.lastRetirement || sales.some(s => s.currency === row.currency))
      .sort((a, b) => b.available - a.available);
  }, [availableByCurrency, moneyRetirements, sales]);

  const maxPartialForCurrency = (currency: string) =>
    availableByCurrency[currency] || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isPartial = form.mode === 'partial';
    const amount = isPartial ? parseFloat(form.amount) : undefined;

    if (isPartial) {
      if (!Number.isFinite(amount) || (amount as number) <= 0) {
        alert(t('money_retirement_error_amount'));
        return;
      }
      const max = maxPartialForCurrency(form.currency);
      if ((amount as number) > max + 0.001) {
        alert(t('money_retirement_error_exceeds', {
          max: max.toLocaleString(undefined, { maximumFractionDigits: 2 }),
          currency: form.currency
        }));
        return;
      }
    }

    addMoneyRetirement({
      date: form.date,
      currency: form.currency,
      mode: form.mode,
      amount: isPartial ? amount : undefined,
      note: form.note.trim() || undefined
    });
    setForm({
      date: new Date().toISOString().split('T')[0],
      currency: form.currency,
      mode: form.mode,
      amount: '',
      note: ''
    });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('money_retirement_confirm_delete'))) {
      deleteMoneyRetirement(id);
    }
  };

  const toggleHidden = () => setHidden(h => !h);

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleHidden}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            {hidden ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            {hidden ? t('available_cash_show') : t('available_cash_hide')}
          </button>
        </div>
        {!hidden && currencyRows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {currencyRows.map(row => (
              <div
                key={row.currency}
                className="bg-emerald-50 dark:bg-emerald-950/80 p-5 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={18} className="text-emerald-700 dark:text-emerald-300" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                    {t('available_cash')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-emerald-950 dark:text-emerald-50 tabular-nums">
                  {row.available.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                  <span className="text-base font-semibold text-emerald-800 dark:text-emerald-300">{row.currency}</span>
                </p>
                {row.lastRetirement ? (
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-200/90 mt-1">
                    {t('money_retirement_since', { date: row.lastRetirement })}
                  </p>
                ) : (
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-200/90 mt-1">{t('money_retirement_all_sales')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
            <Banknote size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-50">{t('available_cash_title')}</h3>
            <p className="text-sm text-emerald-900/70 dark:text-emerald-200/90">{t('available_cash_desc')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleHidden}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            {hidden ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            {hidden ? t('available_cash_show') : t('available_cash_hide')}
          </button>
          {!hidden && (
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? t('cancel') : t('money_retirement_record')}
            </button>
          )}
        </div>
      </div>

      {!hidden && (
        <>
          {showForm && (
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, mode: 'partial' }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      form.mode === 'partial'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t('money_retirement_mode_partial')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, mode: 'full', amount: '' }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      form.mode === 'full'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t('money_retirement_mode_full')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t('money_retirement_date')}
                    </label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full border rounded-lg p-2.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('currency')}</label>
                    <select
                      value={form.currency}
                      onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full border rounded-lg p-2.5 bg-white"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {form.mode === 'partial' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t('money_retirement_amount')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={form.amount}
                        onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 bg-white"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {t('money_retirement_max_available', {
                          max: maxPartialForCurrency(form.currency).toLocaleString(undefined, {
                            maximumFractionDigits: 2
                          }),
                          currency: form.currency
                        })}
                      </p>
                    </div>
                  )}
                  <div className={form.mode === 'partial' ? '' : 'lg:col-span-2'}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('note')}</label>
                    <input
                      type="text"
                      value={form.note}
                      onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                      className="w-full border rounded-lg p-2.5 bg-white"
                      placeholder={t('money_retirement_note_placeholder')}
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                  >
                    {t('money_retirement_submit')}
                  </button>
                </div>
              </form>
              <p className="text-xs text-slate-500 mt-3">
                {form.mode === 'partial' ? t('money_retirement_hint_partial') : t('money_retirement_hint')}
              </p>
            </div>
          )}

          <div className="p-6">
            {currencyRows.length === 0 ? (
              <p className="text-center text-slate-400 py-6">{t('available_cash_empty')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currencyRows.map(row => (
                  <div
                    key={row.currency}
                    className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/70 p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{row.currency}</span>
                      <span className="text-xs text-emerald-800/70 dark:text-emerald-200/80">
                        {t('money_retirement_sales_count', { count: row.salesCount })}
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-950 dark:text-emerald-50 tabular-nums">
                      {row.available.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-200/90 mt-2 flex items-center gap-1">
                      <Calendar size={12} />
                      {row.lastRetirement
                        ? t('money_retirement_since', { date: row.lastRetirement })
                        : t('money_retirement_all_sales')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {moneyRetirements.length > 0 && (
            <div className="border-t border-slate-100">
              <div className="px-6 py-3 flex items-center gap-2 text-slate-600">
                <History size={16} />
                <span className="text-sm font-semibold">{t('money_retirement_history')}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase">{t('date')}</th>
                      <th className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase">{t('currency')}</th>
                      <th className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase">{t('money_retirement_type')}</th>
                      <th className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase">{t('amount')}</th>
                      <th className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase">{t('note')}</th>
                      <th className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...moneyRetirements]
                      .sort((a, b) => b.date.localeCompare(a.date) || b.currency.localeCompare(a.currency))
                      .map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-6 py-2.5 text-sm text-slate-700">{r.date}</td>
                          <td className="px-6 py-2.5 text-sm font-medium text-slate-800">{r.currency}</td>
                          <td className="px-6 py-2.5 text-sm">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                isPartialRetirement(r)
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isPartialRetirement(r)
                                ? t('money_retirement_mode_partial')
                                : t('money_retirement_mode_full')}
                            </span>
                          </td>
                          <td className="px-6 py-2.5 text-sm font-semibold text-slate-800 tabular-nums">
                            {isPartialRetirement(r) && r.amount != null
                              ? r.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                              : '—'}
                          </td>
                          <td className="px-6 py-2.5 text-sm text-slate-500">{r.note || '—'}</td>
                          <td className="px-6 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium"
                            >
                              {t('delete')}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
