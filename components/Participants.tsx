import React, { useState } from 'react';
import { Participant } from '../types';
import { Plus, Trash2, UserCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ParticipantsProps {
  participants: Participant[];
  addParticipant: (name: string) => void;
  removeParticipant: (id: string) => void;
}

export const Participants: React.FC<ParticipantsProps> = ({ participants, addParticipant, removeParticipant }) => {
  const [newName, setNewName] = useState('');
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      addParticipant(newName.trim());
      setNewName('');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{t('participants')}</h2>
          <p className="text-slate-500 mt-1">{t('manage_partners')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('enter_participant_name')}
              className="flex-1 rounded-lg border-slate-300 border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Plus size={18} />
              {t('add_btn')}
            </button>
          </form>
        </div>

        <div className="divide-y divide-slate-100">
          {participants.length > 0 ? (
            participants.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <UserCircle size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-400">ID: {p.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeParticipant(p.id)}
                  className="text-slate-400 hover:text-red-500 p-2 transition-colors rounded-lg hover:bg-red-50"
                  title="Remove Participant"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400">
              {t('no_participants')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};