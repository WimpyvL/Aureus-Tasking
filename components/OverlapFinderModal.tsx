import React from 'react';
import { X, Star, Clock, ArrowRight } from 'lucide-react';
import { TeamMember } from '../types';

interface OverlapFinderModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: TeamMember[];
    onSelectTime: (date: Date) => void;
}

export const OverlapFinderModal: React.FC<OverlapFinderModalProps> = ({ isOpen, onClose, members, onSelectTime }) => {
    if (!isOpen) return null;

    // Logic to find best slots
    const findBestSlots = () => {
        const scores: { hour: number, count: number, isUnhealthy: boolean }[] = [];

        // Check every hour 0-23
        for (let i = 0; i < 24; i++) {
            let workingCount = 0;
            let unhealthyCount = 0;

            members.forEach(m => {
                // Check status at UTC hour 'i'
                const dateAtHour = new Date();
                dateAtHour.setUTCHours(i, 0, 0, 0);
                
                const localDateStr = dateAtHour.toLocaleString("en-US", { timeZone: m.timezone });
                const localDate = new Date(localDateStr);
                const localHour = localDate.getHours();

                // Check if working
                let isWorking = false;
                if (m.workStartHour < m.workEndHour) {
                    isWorking = localHour >= m.workStartHour && localHour < m.workEndHour;
                } else {
                    isWorking = localHour >= m.workStartHour || localHour < m.workEndHour;
                }

                // Check if unhealthy (late night)
                const isUnhealthy = localHour < 6 || localHour >= 22;

                if (isWorking) workingCount++;
                if (isUnhealthy && isWorking) unhealthyCount++;
            });

            scores.push({ hour: i, count: workingCount, isUnhealthy: unhealthyCount > 0 });
        }

        // Sort by count desc, then by isUnhealthy asc
        return scores.sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return (a.isUnhealthy ? 1 : 0) - (b.isUnhealthy ? 1 : 0);
        }).slice(0, 3); // Top 3
    };

    const bestSlots = findBestSlots();

    const handleApply = (utcHour: number) => {
        const now = new Date();
        now.setUTCHours(utcHour, 0, 0, 0);
        onSelectTime(now);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" />
                        Best Meeting Times
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Based on everyone's working hours, here are the best times to meet (UTC).
                    </p>

                    <div className="space-y-3">
                        {bestSlots.map((slot, idx) => (
                            <button 
                                key={slot.hour} 
                                onClick={() => handleApply(slot.hour)}
                                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {slot.hour}:00 UTC
                                            {slot.isUnhealthy && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">Late for some</span>}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {slot.count} / {members.length} members available
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};