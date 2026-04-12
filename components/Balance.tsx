import React, { useMemo, useState } from 'react';
import { StoreData, Adjustment, CurrencyTotal } from '../types';
import { CURRENCIES } from '../constants';
import {
    Scale, ArrowRight, History, Plus, X, Users,
    DollarSign, TrendingUp, TrendingDown, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BalanceProps {
    data: StoreData;
    addAdjustment: (adjustment: Omit<Adjustment, 'id'>) => void;
}

interface BalanceStatus {
    invested: number;
    equalShare: number;
    difference: number;
    netPosition: number; // After all adjustments
}

export const Balance: React.FC<BalanceProps> = ({ data, addAdjustment }) => {
    const { t } = useLanguage();
    const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState<string>('');

    // Adjustment form state
    const [adjustmentForm, setAdjustmentForm] = useState({
        fromParticipantId: '',
        toParticipantId: '',
        amount: '',
        currency: 'USD',
        note: '',
        date: new Date().toISOString().split('T')[0]
    });

    // 1. Calculate investment by participant by currency
    const investmentByParticipantCurrency = useMemo(() => {
        const result: Record<string, CurrencyTotal> = {};

        data.items.forEach(item => {
            if (!item.buyerId) return;

            if (!result[item.buyerId]) result[item.buyerId] = {};

            // Item cost
            const currency = item.buyCurrency || 'N/A';
            const cost = (item.buyPrice || 0) * (item.initialQuantity || 0);
            result[item.buyerId][currency] = (result[item.buyerId][currency] || 0) + cost;

            // Transport cost
            if (item.transportCost > 0) {
                const transportCurrency = item.transportCurrency || 'N/A';
                result[item.buyerId][transportCurrency] = (result[item.buyerId][transportCurrency] || 0) + item.transportCost;
            }
        });

        (data.sales || []).forEach(sale => {
            if (!sale.transportCost || sale.transportCost <= 0) return;
            const payerId = sale.transportPaidByParticipantId;
            if (!payerId) return;
            if (!result[payerId]) result[payerId] = {};
            const tc = sale.transportCurrency || 'N/A';
            result[payerId][tc] = (result[payerId][tc] || 0) + sale.transportCost;
        });

        return result;
    }, [data.items, data.sales]);

    // 2. Calculate total adjustments per participant per currency
    const adjustmentsByParticipantCurrency = useMemo(() => {
        const paid: Record<string, CurrencyTotal> = {};
        const received: Record<string, CurrencyTotal> = {};

        data.adjustments.forEach(adj => {
            // What the sender paid
            if (!paid[adj.fromParticipantId]) paid[adj.fromParticipantId] = {};
            paid[adj.fromParticipantId][adj.currency] = (paid[adj.fromParticipantId][adj.currency] || 0) + adj.amount;

            // What the receiver received
            if (!received[adj.toParticipantId]) received[adj.toParticipantId] = {};
            received[adj.toParticipantId][adj.currency] = (received[adj.toParticipantId][adj.currency] || 0) + adj.amount;
        });

        return { paid, received };
    }, [data.adjustments]);

    // 3. Get all currencies used
    const allCurrencies = useMemo(() => {
        const currencies = new Set<string>();

        Object.values(investmentByParticipantCurrency).forEach(currenciesObj => {
            Object.keys(currenciesObj).forEach(c => currencies.add(c));
        });

        data.adjustments.forEach(adj => currencies.add(adj.currency));

        return Array.from(currencies).sort();
    }, [investmentByParticipantCurrency, data.adjustments]);

    // 4. Calculate balance status per currency
    const getBalanceStatusPerCurrency = (currency: string): Record<string, BalanceStatus> => {
        const result: Record<string, BalanceStatus> = {};

        // Get participants who have invested in this currency
        const participantsWithCurrency = new Set<string>();

        Object.entries(investmentByParticipantCurrency).forEach(([participantId, currencies]) => {
            if (currencies[currency]) {
                participantsWithCurrency.add(participantId);
            }
        });

        // Also include participants who have adjustments in this currency
        data.adjustments.forEach(adj => {
            if (adj.currency === currency) {
                participantsWithCurrency.add(adj.fromParticipantId);
                participantsWithCurrency.add(adj.toParticipantId);
            }
        });

        // Include all participants if none have invested yet
        const relevantParticipants = participantsWithCurrency.size > 0
            ? Array.from(participantsWithCurrency)
            : data.participants.map(p => p.id);

        if (relevantParticipants.length === 0) return result;

        // Calculate total investment in this currency
        let totalInvestment = 0;
        relevantParticipants.forEach(pid => {
            totalInvestment += investmentByParticipantCurrency[pid]?.[currency] || 0;
        });

        // Calculate equal share
        const equalShare = totalInvestment / relevantParticipants.length;

        // Calculate status for each participant
        relevantParticipants.forEach(pid => {
            const invested = investmentByParticipantCurrency[pid]?.[currency] || 0;
            const paid = adjustmentsByParticipantCurrency.paid[pid]?.[currency] || 0;
            const received = adjustmentsByParticipantCurrency.received[pid]?.[currency] || 0;

            // Net adjustments: when you PAY in a settlement, your investment position INCREASES
            // (you're contributing your fair share). When you RECEIVE, your position DECREASES
            // (you're taking out your excess investment).
            const netAdjustments = paid - received;

            // Current position after adjustments
            const currentPosition = invested + netAdjustments;

            // How much they need to pay/receive to be balanced
            // Positive = invested more than share = should RECEIVE
            // Negative = invested less than share = should PAY
            const difference = currentPosition - equalShare;

            result[pid] = {
                invested,
                equalShare,
                difference, // Positive = needs to receive, Negative = needs to pay
                netPosition: currentPosition
            };
        });

        return result;
    };

    // 5. Calculate settlement suggestions
    const getSettlementPlan = (currency: string): { from: string; to: string; amount: number }[] => {
        const status = getBalanceStatusPerCurrency(currency);
        const settlements: { from: string; to: string; amount: number }[] = [];

        // Separate into debtors and creditors
        const debtors: { id: string; amount: number }[] = [];
        const creditors: { id: string; amount: number }[] = [];

        Object.entries(status).forEach(([pid, bal]) => {
            if (bal.difference < -0.01) {
                // Owes money (invested less than share, negative difference)
                debtors.push({ id: pid, amount: Math.abs(bal.difference) });
            } else if (bal.difference > 0.01) {
                // Is owed money (invested more than share, positive difference)
                creditors.push({ id: pid, amount: bal.difference });
            }
        });

        // Sort by amount (largest first)
        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        // Match debtors to creditors
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            const amount = Math.min(debtor.amount, creditor.amount);

            if (amount > 0.01) {
                settlements.push({
                    from: debtor.id,
                    to: creditor.id,
                    amount
                });
            }

            debtor.amount -= amount;
            creditor.amount -= amount;

            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        return settlements;
    };

    // Get participant name
    const getParticipantName = (id: string) => {
        return data.participants.find(p => p.id === id)?.name || t('unknown');
    };

    // Handle adjustment form
    const handleAdjustmentSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (adjustmentForm.fromParticipantId === adjustmentForm.toParticipantId) {
            alert(t('error_same_participant'));
            return;
        }

        addAdjustment({
            date: adjustmentForm.date,
            fromParticipantId: adjustmentForm.fromParticipantId,
            toParticipantId: adjustmentForm.toParticipantId,
            amount: parseFloat(adjustmentForm.amount),
            currency: adjustmentForm.currency,
            note: adjustmentForm.note
        });

        // Reset form
        setAdjustmentForm({
            fromParticipantId: '',
            toParticipantId: '',
            amount: '',
            currency: 'USD',
            note: '',
            date: new Date().toISOString().split('T')[0]
        });
        setShowAdjustmentForm(false);
    };

    // Quick adjustment from settlement plan
    const handleQuickAdjustment = (fromId: string, toId: string, amount: number, currency: string) => {
        setAdjustmentForm({
            fromParticipantId: fromId,
            toParticipantId: toId,
            amount: amount.toFixed(2),
            currency,
            note: ''
        });
        setSelectedCurrency(currency);
        setShowAdjustmentForm(true);
    };

    return (
        <div className="p-8 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">{t('balance_title')}</h2>
                    <p className="text-slate-500 mt-1">{t('balance_desc')}</p>
                </div>
                <button
                    onClick={() => setShowAdjustmentForm(!showAdjustmentForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    {showAdjustmentForm ? <X size={18} /> : <Plus size={18} />}
                    {showAdjustmentForm ? t('cancel') : t('record_adjustment')}
                </button>
            </div>

            {/* Adjustment Form */}
            {showAdjustmentForm && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 animate-slide-in-down">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">{t('new_adjustment')}</h3>
                    <form onSubmit={handleAdjustmentSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* From Participant */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('from_participant')}</label>
                            <select
                                required
                                value={adjustmentForm.fromParticipantId}
                                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, fromParticipantId: e.target.value }))}
                                className="w-full border rounded-lg p-2.5 bg-slate-50"
                            >
                                <option value="">{t('select_participant')}</option>
                                {data.participants.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* To Participant */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('to_participant')}</label>
                            <select
                                required
                                value={adjustmentForm.toParticipantId}
                                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, toParticipantId: e.target.value }))}
                                className="w-full border rounded-lg p-2.5 bg-slate-50"
                            >
                                <option value="">{t('select_participant')}</option>
                                {data.participants.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('amount')}</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={adjustmentForm.amount}
                                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, amount: e.target.value }))}
                                className="w-full border rounded-lg p-2.5"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Currency */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('currency')}</label>
                            <select
                                value={adjustmentForm.currency}
                                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, currency: e.target.value }))}
                                className="w-full border rounded-lg p-2.5 bg-slate-50"
                            >
                                {CURRENCIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('date')}</label>
                            <input
                                type="date"
                                value={adjustmentForm.date}
                                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full border rounded-lg p-2.5"
                            />
                        </div>

                        {/* Note */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('note')}</label>
                            <input
                                type="text"
                                value={adjustmentForm.note}
                                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, note: e.target.value }))}
                                className="w-full border rounded-lg p-2.5"
                                placeholder={t('note_placeholder')}
                            />
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                            >
                                {t('record_adjustment')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Balance Overview by Currency */}
            {allCurrencies.map(currency => {
                const status = getBalanceStatusPerCurrency(currency);
                const settlements = getSettlementPlan(currency);
                const participantIds = Object.keys(status);

                if (participantIds.length === 0) return null;

                // Calculate totals
                let totalInvested = 0;
                Object.values(status).forEach(s => totalInvested += s.invested);

                const isBalanced = settlements.length === 0;

                return (
                    <div key={currency} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        {/* Currency Header */}
                        <div className={`px-6 py-4 ${isBalanced ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-blue-50 border-b border-blue-100'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isBalanced ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <DollarSign size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{currency} {t('balance')}</h3>
                                        <p className="text-sm text-slate-500">
                                            {t('total_invested')}: <span className="font-semibold">{totalInvested.toLocaleString()} {currency}</span>
                                        </p>
                                    </div>
                                </div>
                                {isBalanced && (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                                        {t('balanced')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Participant Balance Table */}
                        <div className="p-6">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="pb-3 text-sm font-semibold text-slate-500">{t('participant_header')}</th>
                                        <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('invested')}</th>
                                        <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('adjustments')}</th>
                                        <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('current_position')}</th>
                                        <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('equal_share')}</th>
                                        <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('difference')}</th>
                                        <th className="pb-3 text-sm font-semibold text-slate-500 text-right">{t('status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {participantIds.map(pid => {
                                        const s = status[pid];
                                        // Positive difference = invested more = should receive
                                        // Negative difference = invested less = should pay
                                        const isOverInvested = s.difference > 0.01;
                                        const isUnderInvested = s.difference < -0.01;

                                        return (
                                            <tr key={pid} className="hover:bg-slate-50">
                                                <td className="py-3 text-slate-700 font-medium">{getParticipantName(pid)}</td>
                                                <td className="py-3 text-right text-slate-800">{s.invested.toLocaleString()}</td>
                                                <td className={`py-3 text-right ${s.netPosition - s.invested >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {s.netPosition - s.invested >= 0 ? '+' : ''}{(s.netPosition - s.invested).toLocaleString()}
                                                </td>
                                                <td className="py-3 text-right font-semibold text-slate-800">{s.netPosition.toLocaleString()}</td>
                                                <td className="py-3 text-right text-slate-500">{s.equalShare.toFixed(2)}</td>
                                                <td className={`py-3 text-right font-semibold ${isOverInvested ? 'text-emerald-600' : isUnderInvested ? 'text-red-600' : 'text-slate-500'}`}>
                                                    {s.difference > 0 ? '+' : ''}{s.difference.toFixed(2)}
                                                </td>
                                                <td className="py-3 text-right">
                                                    {isOverInvested && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                            <TrendingUp size={12} className="mr-1" />
                                                            {t('receives')}
                                                        </span>
                                                    )}
                                                    {isUnderInvested && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                            <TrendingDown size={12} className="mr-1" />
                                                            {t('owes')}
                                                        </span>
                                                    )}
                                                    {!isOverInvested && !isUnderInvested && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                            <Scale size={12} className="mr-1" />
                                                            {t('balanced')}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Settlement Suggestions */}
                        {!isBalanced && settlements.length > 0 && (
                            <div className="px-6 pb-6">
                                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle size={16} className="text-amber-600" />
                                        <h4 className="font-semibold text-amber-800">{t('settlement_suggestions')}</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {settlements.map((s, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-medium text-slate-700">{getParticipantName(s.from)}</span>
                                                    <ArrowRight size={14} className="text-amber-500" />
                                                    <span className="font-medium text-slate-700">{getParticipantName(s.to)}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-amber-700">{s.amount.toFixed(2)} {currency}</span>
                                                    <button
                                                        onClick={() => handleQuickAdjustment(s.from, s.to, s.amount, currency)}
                                                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                                    >
                                                        {t('apply')}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* No data message */}
            {allCurrencies.length === 0 && (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-100 text-center">
                    <Scale size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-400">{t('no_balance_data')}</p>
                </div>
            )}

            {/* Adjustment History */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                    <History size={18} className="text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-800">{t('adjustment_history')}</h3>
                </div>

                {data.adjustments.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('date')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('from_participant')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('to_participant')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('amount')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('note')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[...data.adjustments].reverse().map(adj => (
                                    <tr key={adj.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-sm text-slate-600">{adj.date}</td>
                                        <td className="px-6 py-3 text-sm">
                                            <span className="font-medium text-red-600">{getParticipantName(adj.fromParticipantId)}</span>
                                        </td>
                                        <td className="px-6 py-3 text-sm">
                                            <span className="font-medium text-emerald-600">{getParticipantName(adj.toParticipantId)}</span>
                                        </td>
                                        <td className="px-6 py-3 text-sm font-bold text-slate-800">
                                            {adj.amount.toLocaleString()} {adj.currency}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-slate-500">{adj.note || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-400">
                        {t('no_adjustments')}
                    </div>
                )}
            </div>
        </div>
    );
};