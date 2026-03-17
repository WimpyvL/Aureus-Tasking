
import React, { useState } from 'react';
import { TeamMember, Task } from '../types';
import * as d3 from 'd3';
import { Briefcase, MapPin, CheckCircle2, Clock, AlertTriangle, Zap, Settings, ListTodo, Check, Trash2, Plus, ChevronDown, Calendar, User as UserIcon, X, CheckCheck } from 'lucide-react';

interface MemberCardProps {
    member: TeamMember;
    referenceTime: Date;
    onUpdate: (updates: Partial<TeamMember>) => void;
    onViewProfile: () => void;
    onDelete: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, referenceTime, onUpdate, onViewProfile, onDelete }) => {
    // Task state
    const [showTasks, setShowTasks] = useState(false);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('Medium');
    const [newTaskTags, setNewTaskTags] = useState('');
    const [newTaskProject, setNewTaskProject] = useState('');
    const [newTaskTimeSpent, setNewTaskTimeSpent] = useState('');
    
    // Task Editing State
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingTaskText, setEditingTaskText] = useState('');
    const [editingTaskDate, setEditingTaskDate] = useState('');
    const [editingTaskPriority, setEditingTaskPriority] = useState<Task['priority']>('Medium');
    const [editingTaskTags, setEditingTaskTags] = useState('');
    const [editingTaskProject, setEditingTaskProject] = useState('');
    const [editingTaskTimeSpent, setEditingTaskTimeSpent] = useState('');

    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [now, setNow] = useState(Date.now());

    // Update 'now' every minute to refresh tracking display
    React.useEffect(() => {
        if (member.isTracking) {
            const interval = setInterval(() => setNow(Date.now()), 60000);
            return () => clearInterval(interval);
        }
    }, [member.isTracking]);

    // Calculate local time
    const utcTimestamp = referenceTime.getTime();
    let localDate: Date;
    try {
        const localDateString = new Date(utcTimestamp).toLocaleString("en-US", { timeZone: member.timezone });
        localDate = new Date(localDateString);
    } catch (e) {
        localDate = new Date(utcTimestamp);
    }

    const hours = localDate.getHours();
    
    // Working State Logic
    const isScheduleWorking = member.workStartHour < member.workEndHour 
        ? (hours >= member.workStartHour && hours < member.workEndHour)
        : (hours >= member.workStartHour || hours < member.workEndHour);

    const isWorking = member.statusOverride 
        ? member.statusOverride === 'online'
        : isScheduleWorking;

    const isUnhealthyTime = hours < 6 || hours >= 22;
    const isBurnoutRisk = isWorking && isUnhealthyTime;

    // Visual Styles
    const getStatusColor = () => {
        if (member.statusOverride === 'offline') return "bg-slate-300 dark:bg-slate-700";
        if (isBurnoutRisk) return "bg-red-500";
        if (isWorking) return "bg-emerald-500";
        return "bg-slate-300 dark:bg-slate-700";
    };

    const pendingTasksCount = member.tasks?.filter(t => !t.completed).length || 0;
    const completedTasksCount = member.tasks?.filter(t => t.completed).length || 0;
    const displayTasks = [...(member.tasks || [])].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.id.localeCompare(a.id);
    });

    // Handlers
    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        const newTask: Task = {
            id: Date.now().toString(),
            text: newTaskText,
            completed: false,
            dueDate: newTaskDate || undefined,
            priority: newTaskPriority,
            tags: newTaskTags.split(',').map(t => t.trim()).filter(Boolean),
            project: newTaskProject || undefined,
            timeSpent: newTaskTimeSpent ? parseInt(newTaskTimeSpent) : undefined
        };
        onUpdate({ tasks: [...(member.tasks || []), newTask] });
        setNewTaskText('');
        setNewTaskDate('');
        setNewTaskPriority('Medium');
        setNewTaskTags('');
        setNewTaskProject('');
        setNewTaskTimeSpent('');
        setIsAddingTask(false);
    };

    const handleSaveTaskEdit = () => {
        if (!editingTaskId) return;
        const updatedTasks = (member.tasks || []).map(t => 
            t.id === editingTaskId ? { 
                ...t, 
                text: editingTaskText, 
                dueDate: editingTaskDate || undefined,
                priority: editingTaskPriority,
                tags: editingTaskTags.split(',').map(t => t.trim()).filter(Boolean),
                project: editingTaskProject || undefined,
                timeSpent: editingTaskTimeSpent ? parseInt(editingTaskTimeSpent) : undefined
            } : t
        );
        onUpdate({ tasks: updatedTasks });
        setEditingTaskId(null);
    };

    const handleToggleTask = (taskId: string) => {
        const updatedTasks = (member.tasks || []).map(t => 
            t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        onUpdate({ tasks: updatedTasks });
    };

    const handleDeleteTask = (taskId: string) => {
        onUpdate({ tasks: (member.tasks || []).filter(t => t.id !== taskId) });
    };

    const toggleTaskSelection = (taskId: string) => {
        const newSelection = new Set(selectedTaskIds);
        if (newSelection.has(taskId)) {
            newSelection.delete(taskId);
        } else {
            newSelection.add(taskId);
        }
        setSelectedTaskIds(newSelection);
    };

    const handleBulkComplete = () => {
        const updatedTasks = (member.tasks || []).map(t => 
            selectedTaskIds.has(t.id) ? { ...t, completed: true } : t
        );
        onUpdate({ tasks: updatedTasks });
        setSelectedTaskIds(new Set());
    };

    const handleBulkDelete = () => {
        onUpdate({ tasks: (member.tasks || []).filter(t => !selectedTaskIds.has(t.id)) });
        setSelectedTaskIds(new Set());
    };

    const handleClearCompleted = () => {
        onUpdate({ tasks: (member.tasks || []).filter(t => !t.completed) });
    };

    const cycleStatus = () => {
        if (!member.statusOverride) onUpdate({ statusOverride: 'online' });
        else if (member.statusOverride === 'online') onUpdate({ statusOverride: 'offline' });
        else onUpdate({ statusOverride: undefined });
    };

    const isOverdue = (dateStr?: string) => {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date(new Date().setHours(0,0,0,0));
    };

    return (
        <div className={`relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group
            ${isBurnoutRisk ? 'ring-2 ring-red-500/50' : ''}
        `}>
             {/* Status Indicator Bar */}
             <div className={`h-2 w-full ${isWorking ? (isBurnoutRisk ? 'bg-red-500' : 'bg-emerald-500') : 'bg-slate-200 dark:bg-slate-800'}`}></div>

            <div className="p-6 flex flex-col gap-6">
                {/* Header: Avatar & Basic Info */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={onViewProfile}>
                        <div className="relative">
                            <img src={member.avatarUrl} alt={member.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />
                            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${getStatusColor()}`}></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">{member.name}</h3>
                            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1"><Briefcase className="w-4 h-4" /> {member.role}</p>
                        </div>
                    </div>
                    
                    {/* Time Display */}
                    <div className="text-right">
                        <div className={`text-4xl font-bold font-mono tracking-tight ${isWorking ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                            {d3.timeFormat("%H:%M")(localDate)}
                        </div>
                        <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider mt-1">
                            {member.timezone.split('/')[1]?.replace(/_/g, ' ') || 'Local Time'}
                        </div>
                    </div>
                </div>

                {/* Status & Actions Bar */}
                <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-3">
                         <button 
                            onClick={(e) => { e.stopPropagation(); cycleStatus(); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-2
                                ${!member.statusOverride ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' : 
                                member.statusOverride === 'online' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                                'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}
                        >
                             {isWorking ? (isBurnoutRisk ? <AlertTriangle className="w-4 h-4" /> : <Zap className="w-4 h-4" />) : <Clock className="w-4 h-4" />}
                             {isWorking ? (isBurnoutRisk ? 'Overwork' : 'Working') : 'Off'}
                        </button>
                        <button
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                if (member.isTracking) {
                                    // Stopping
                                    const endTime = Date.now();
                                    const duration = Math.floor((endTime - (member.trackingStartTime || endTime)) / 60000);
                                    const newLog = { startTime: member.trackingStartTime || endTime, endTime, duration };
                                    onUpdate({
                                        isTracking: false,
                                        trackingStartTime: undefined,
                                        timeLogs: [...(member.timeLogs || []), newLog]
                                    });
                                } else {
                                    // Starting
                                    onUpdate({ isTracking: true, trackingStartTime: Date.now() });
                                }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-2
                                ${member.isTracking ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}
                            `}
                        >
                            <Clock className="w-4 h-4" />
                            {member.isTracking ? 'Stop' : 'Start'}
                        </button>
                        {member.isTracking && member.trackingStartTime && (
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                {Math.floor((now - member.trackingStartTime) / 60000)}m
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onViewProfile} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="View Profile">
                            <UserIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => setShowTasks(!showTasks)} className={`p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${showTasks ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`} title="Tasks">
                            <ListTodo className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Task Section */}
            {(showTasks || pendingTasksCount > 0) && (
                <div className={`border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 transition-all duration-300 ${showTasks ? 'max-h-[600px]' : 'max-h-[50px] overflow-hidden'}`}>
                    <div 
                        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                        onClick={() => setShowTasks(!showTasks)}
                    >
                         <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                            <ListTodo className="w-5 h-5" />
                            Tasks 
                            <span className={`px-2 py-0.5 rounded-full text-xs ${pendingTasksCount > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>
                                {pendingTasksCount}
                            </span>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showTasks ? 'rotate-180' : ''}`} />
                    </div>

                     <div className="px-6 pb-6 overflow-y-auto max-h-[300px] space-y-3">
                         {isAddingTask && (
                             <form onSubmit={handleAddTask} className="mb-2 p-2 bg-white dark:bg-slate-900 rounded border border-blue-200 dark:border-blue-800 shadow-sm">
                                 <input 
                                     autoFocus
                                     className="w-full text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400 mb-2"
                                     placeholder="Task description..."
                                     value={newTaskText}
                                     onChange={e => setNewTaskText(e.target.value)}
                                 />
                                 <div className="flex flex-col gap-2">
                                     <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded p-1">
                                         <Calendar className="w-3 h-3 text-slate-400" />
                                         <input type="date" className="text-xs bg-transparent text-slate-500 outline-none dark:text-slate-300" value={newTaskDate} onChange={e => setNewTaskDate(e.target.value)} />
                                     </div>
                                     <select className="text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1" value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as Task['priority'])}>
                                         <option value="Low">Low</option>
                                         <option value="Medium">Medium</option>
                                         <option value="High">High</option>
                                     </select>
                                     <input className="text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1" placeholder="Tags (comma separated)" value={newTaskTags} onChange={e => setNewTaskTags(e.target.value)} />
                                     <input className="text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1" placeholder="Project" value={newTaskProject} onChange={e => setNewTaskProject(e.target.value)} />
                                     <input type="number" className="text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1" placeholder="Time Spent (mins)" value={newTaskTimeSpent} onChange={e => setNewTaskTimeSpent(e.target.value)} />
                                     <button type="submit" className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-500">Add</button>
                                 </div>
                             </form>
                         )}

                         {selectedTaskIds.size > 0 && (
                             <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded mb-2 text-xs">
                                 <span className="text-slate-600 dark:text-slate-400">{selectedTaskIds.size} selected</span>
                                 <button onClick={handleBulkComplete} className="px-2 py-1 bg-white dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600">Complete</button>
                                 <button onClick={handleBulkDelete} className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200">Delete</button>
                             </div>
                         )}

                         {displayTasks.map(task => (
                             <div key={task.id} className="group flex items-start gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
                                 {editingTaskId === task.id ? (
                                       <div className="flex-1 space-y-3">
                                         <input className="w-full text-base p-2 border rounded dark:bg-slate-800 dark:border-slate-700" value={editingTaskText} onChange={e => setEditingTaskText(e.target.value)} />
                                         <div className="flex flex-col gap-2">
                                             <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded p-2">
                                                 <Calendar className="w-4 h-4 text-slate-400" />
                                                 <input type="date" className="text-sm bg-transparent outline-none text-slate-700 dark:text-slate-300" value={editingTaskDate} onChange={e => setEditingTaskDate(e.target.value)} />
                                             </div>
                                             <select className="text-sm bg-transparent border border-slate-200 dark:border-slate-700 rounded p-2" value={editingTaskPriority} onChange={e => setEditingTaskPriority(e.target.value as Task['priority'])}>
                                                 <option value="Low">Low</option>
                                                 <option value="Medium">Medium</option>
                                                 <option value="High">High</option>
                                             </select>
                                             <input className="text-sm bg-transparent border border-slate-200 dark:border-slate-700 rounded p-2" placeholder="Tags (comma separated)" value={editingTaskTags} onChange={e => setEditingTaskTags(e.target.value)} />
                                             <input className="text-sm bg-transparent border border-slate-200 dark:border-slate-700 rounded p-2" placeholder="Project" value={editingTaskProject} onChange={e => setEditingTaskProject(e.target.value)} />
                                             <input type="number" className="text-sm bg-transparent border border-slate-200 dark:border-slate-700 rounded p-2" placeholder="Time Spent (mins)" value={editingTaskTimeSpent} onChange={e => setEditingTaskTimeSpent(e.target.value)} />
                                             <button onClick={handleSaveTaskEdit} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"><Check className="w-4 h-4"/></button>
                                         </div>
                                      </div>
                                 ) : (
                                     <>
                                        <input type="checkbox" checked={selectedTaskIds.has(task.id)} onChange={() => toggleTaskSelection(task.id)} className="mt-1.5 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                                        <button onClick={() => handleToggleTask(task.id)} className={`mt-1 w-6 h-6 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'}`}>
                                            {task.completed && <Check className="w-4 h-4" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-base leading-snug break-words ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{task.text}</p>
                                                {task.priority && (
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                        {task.priority}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {task.project && <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{task.project}</span>}
                                                {task.tags?.map(tag => <span key={tag} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">#{tag}</span>)}
                                                {task.timeSpent && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-4 h-4" /> {task.timeSpent}m</span>}
                                            </div>
                                            {task.dueDate && (
                                                <div className={`flex items-center gap-1.5 mt-2 text-xs ${isOverdue(task.dueDate) && !task.completed ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                                    <Calendar className="w-4 h-4" /> {new Date(task.dueDate).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => { 
                                            setEditingTaskId(task.id); 
                                            setEditingTaskText(task.text); 
                                            setEditingTaskDate(task.dueDate || ''); 
                                            setEditingTaskPriority(task.priority || 'Medium');
                                        }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Settings className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Trash2 className="w-4 h-4"/></button>
                                     </>
                                 )}
                             </div>
                         ))}

                         {!isAddingTask && (
                             <div className="pt-2 flex gap-2">
                                <button onClick={() => setIsAddingTask(true)} className="flex-1 py-1.5 flex items-center justify-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                    <Plus className="w-3 h-3" /> Add Task
                                </button>
                                {completedTasksCount > 0 && (
                                    <button onClick={handleClearCompleted} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Clear Completed">
                                        <CheckCheck className="w-3 h-3" />
                                    </button>
                                )}
                             </div>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
};
