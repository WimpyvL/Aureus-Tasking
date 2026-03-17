import React from 'react';
import { X, Download, Upload, Save } from 'lucide-react';
import { TeamMember, Meeting } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: TeamMember[];
    meetings: Meeting[];
    onImport: (data: { members: TeamMember[], meetings: Meeting[] }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, members, meetings, onImport }) => {
    if (!isOpen) return null;

    const handleExport = () => {
        const data = {
            members,
            meetings,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zappymeet-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.members && Array.isArray(data.members)) {
                    onImport({
                        members: data.members,
                        meetings: data.meetings || []
                    });
                    alert('Data imported successfully!');
                    onClose();
                } else {
                    alert('Invalid backup file format.');
                }
            } catch (err) {
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        Data Settings
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white">Export Data</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Save your team configuration, tasks, and meeting notes to a JSON file.</p>
                        <button 
                            onClick={handleExport}
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-lg transition-colors text-sm font-medium border border-slate-200 dark:border-slate-700"
                        >
                            <Download className="w-4 h-4" />
                            Export Backup
                        </button>
                    </div>

                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white">Import Data</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Restore from a previously exported backup file. This will overwrite current data.</p>
                        <label className="w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 py-2.5 rounded-lg transition-colors text-sm font-medium border border-dashed border-blue-200 dark:border-blue-800 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            Select Backup File
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};