
import React, { useState } from 'react';
import { X, Loader2, Sparkles, UserPlus, Clock } from 'lucide-react';
import { resolveLocationToTimezone } from '../services/geminiService';
import { TeamMember } from '../types';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (member: TeamMember) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [workStart, setWorkStart] = useState(9);
    const [workEnd, setWorkEnd] = useState(17);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const locationData = await resolveLocationToTimezone(locationQuery);
            
            const newMember: TeamMember = {
                id: Date.now().toString(),
                name,
                role,
                location: `${locationData.city}, ${locationData.country}`,
                timezone: locationData.timezone,
                avatarUrl: `https://picsum.photos/seed/${Date.now()}/200/200`,
                workStartHour: Number(workStart),
                workEndHour: Number(workEnd),
                lat: locationData.lat,
                lng: locationData.lng,
                tasks: []
            };

            onAdd(newMember);
            onClose();
            // Reset form
            setName('');
            setRole('');
            setLocationQuery('');
            setWorkStart(9);
            setWorkEnd(17);
        } catch (err: any) {
            setError(err.message || "Failed to resolve location");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-500" />
                        Add Team Member
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                        <input 
                            type="text" 
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                            placeholder="e.g. Jane Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Role</label>
                        <input 
                            type="text" 
                            required
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                            placeholder="e.g. Senior Engineer"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 flex justify-between">
                            Location
                            <span className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Auto-detect</span>
                        </label>
                        <input 
                            type="text" 
                            required
                            value={locationQuery}
                            onChange={(e) => setLocationQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                            placeholder="e.g. Berlin, Germany"
                        />
                        <p className="text-xs text-slate-500 mt-1">We'll use Gemini to automatically find the timezone.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3"/> Start Hour (0-23)
                            </label>
                            <input 
                                type="number" 
                                min="0" 
                                max="23"
                                required
                                value={workStart}
                                onChange={(e) => setWorkStart(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-center font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3"/> End Hour (0-23)
                            </label>
                            <input 
                                type="number" 
                                min="0" 
                                max="23"
                                required
                                value={workEnd}
                                onChange={(e) => setWorkEnd(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-center font-mono"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Detecting & Adding...
                                </>
                            ) : (
                                'Add Member'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
