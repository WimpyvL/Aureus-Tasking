import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Moon, Sun, LogOut, Plus, Users, LayoutGrid, FileText } from 'lucide-react';
import { TeamMember } from '../types';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    members: TeamMember[];
    onSelectMember: (member: TeamMember) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, members, onSelectMember }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter Items
    const memberItems = members.filter(m => m.name.toLowerCase().includes(query.toLowerCase())).map(m => ({
        type: 'member',
        id: m.id,
        label: m.name,
        subLabel: m.role,
        icon: <img src={m.avatarUrl} className="w-5 h-5 rounded-full" alt="" />,
        action: () => onSelectMember(m)
    }));

    const commandItems = [
        { type: 'command', id: 'add-member', label: 'Add New Member', icon: <Plus className="w-4 h-4" />, action: () => document.getElementById('add-member-trigger')?.click() },
        { type: 'command', id: 'toggle-theme', label: 'Toggle Theme', icon: <Sun className="w-4 h-4" />, action: () => document.documentElement.classList.toggle('dark') },
    ].filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

    const allItems = [...memberItems, ...commandItems];

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % allItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = allItems[selectedIndex];
            if (item) {
                item.action();
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/40 dark:bg-black/80 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={onClose}>
            <div 
                className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command or search..."
                        className="flex-1 bg-transparent text-lg outline-none text-slate-900 dark:text-white placeholder-slate-400"
                    />
                    <div className="flex gap-1">
                        <kbd className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">ESC</kbd>
                    </div>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {allItems.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">No results found.</div>
                    ) : (
                        <div className="space-y-1">
                            {memberItems.length > 0 && <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase">Members</div>}
                            {memberItems.map((item, idx) => (
                                <button
                                    key={item.id}
                                    onClick={() => { item.action(); onClose(); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${idx === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    {item.icon}
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{item.label}</div>
                                        <div className={`text-xs ${idx === selectedIndex ? 'text-blue-200' : 'text-slate-400'}`}>{item.subLabel}</div>
                                    </div>
                                    {idx === selectedIndex && <span className="text-xs opacity-70">Jump to</span>}
                                </button>
                            ))}
                            
                            {commandItems.length > 0 && <div className="px-2 py-1 mt-2 text-xs font-semibold text-slate-500 uppercase">Commands</div>}
                            {commandItems.map((item, idx) => {
                                const realIdx = idx + memberItems.length;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => { item.action(); onClose(); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${realIdx === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
                                        onMouseEnter={() => setSelectedIndex(realIdx)}
                                    >
                                        <div className={`w-5 h-5 flex items-center justify-center rounded ${realIdx === selectedIndex ? 'text-white' : 'text-slate-500'}`}>{item.icon}</div>
                                        <div className="flex-1 text-sm font-medium">{item.label}</div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                    <div>
                        <span className="font-semibold">ProTip:</span> Use arrow keys to navigate
                    </div>
                    <div>Zappy Meet</div>
                </div>
            </div>
        </div>
    );
};