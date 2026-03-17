import React, { useState, useEffect } from 'react';
import { TeamMember, Meeting, Task, User } from './types';
import { MemberCard } from './components/MemberCard';
import { TimelineSlider } from './components/TimelineSlider';
import { AddMemberModal } from './components/AddMemberModal';
import { OnboardingTour } from './components/OnboardingTour';
import { Dashboard } from './components/Dashboard';
import { MeetingEditor } from './components/MeetingEditor';
import { SettingsModal } from './components/SettingsModal';
import { OverlapFinderModal } from './components/OverlapFinderModal';
import { MemberProfileModal } from './components/MemberProfileModal';
import { Login } from './components/Login';
import { TeamGlobe } from './components/TeamGlobe';
import { CommandPalette } from './components/CommandPalette';
import { Plus, Globe, Users, Sun, Moon, Filter, LayoutGrid, BarChart3, FileText, Settings, Sparkles, Layers, Search, Loader2, LogOut, UserCircle, Trash2, Zap } from 'lucide-react';
import { initDB, getMembers, getMeetings, addMember, updateMemberInDB, addTask, updateTaskInDB, deleteTaskFromDB, saveMeetingInDB, deleteMemberFromDB, deleteMeetingFromDB } from './services/db';

type FilterType = 'all' | 'working' | 'off';
type ViewMode = 'grid' | 'dashboard' | 'meetings';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // App State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [referenceTime, setReferenceTime] = useState<Date>(new Date());
  const [isLiveMode, setIsLiveMode] = useState(true); // Default to live mode

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Feature State
  const [groupByRole, setGroupByRole] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOverlapOpen, setIsOverlapOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Profile State
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<TeamMember | null>(null);

  // Meeting State
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | undefined>(undefined);
  const [meetingSearchQuery, setMeetingSearchQuery] = useState('');
  
  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
      // Simple session persistence check
      const savedUser = localStorage.getItem('zappymeet_user');
      if (savedUser) {
          try {
              setCurrentUser(JSON.parse(savedUser));
          } catch(e) { localStorage.removeItem('zappymeet_user'); }
      }
      setAuthChecking(false);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsCommandPaletteOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real-time Clock Effect
  useEffect(() => {
    let interval: number;
    if (isLiveMode) {
        // Update immediately
        setReferenceTime(new Date());
        // Then every second
        interval = window.setInterval(() => {
            setReferenceTime(new Date());
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLiveMode]);

  // Handle manual time change overrides live mode
  const handleTimeChange = (date: Date) => {
      setIsLiveMode(false);
      setReferenceTime(date);
  };

  const handleResetTime = () => {
      setIsLiveMode(true);
      setReferenceTime(new Date());
  };

  // Database Init Effect - Only run if authenticated
  useEffect(() => {
    if (!currentUser) return;

    const initialize = async () => {
        setIsLoading(true);
        try {
            await initDB();
            const [loadedMembers, loadedMeetings] = await Promise.all([
                getMembers(),
                getMeetings()
            ]);
            setMembers(loadedMembers);
            setMeetings(loadedMeetings);
        } catch (e) {
            console.error("Failed to load data", e);
            setDbError("Failed to connect to Neon database. Please check configuration.");
        } finally {
            setIsLoading(false);
        }
    };
    initialize();
  }, [currentUser]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (currentUser) {
        const hasSeenOnboarding = localStorage.getItem('zappymeet_has_seen_onboarding');
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
        }
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
      setCurrentUser(user);
      localStorage.setItem('zappymeet_user', JSON.stringify(user));
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('zappymeet_user');
      setMembers([]);
      setMeetings([]);
  };

  const handleAddMember = async (member: TeamMember) => {
    try {
        setMembers(prev => [...prev, member]);
        await addMember(member);
    } catch (e) { console.error("Failed to add member", e); }
  };

  const handleUpdateMember = async (id: string, updates: Partial<TeamMember>) => {
    try {
        // Optimistic Update
        setMembers(prev => prev.map(m => {
            if (m.id === id) {
                const updated = { ...m, ...updates };
                // If this member is currently open in profile modal, update that too
                if (selectedMemberProfile?.id === id) {
                    setSelectedMemberProfile(updated);
                }
                return updated;
            }
            return m;
        }));

        if (updates.tasks) {
             const member = members.find(m => m.id === id);
             if (member && updates.tasks) {
                 const oldTasks = member.tasks || [];
                 const newTasks = updates.tasks;
                 const added = newTasks.filter(nt => !oldTasks.find(ot => ot.id === nt.id));
                 for (const task of added) await addTask(id, task);
                 const removed = oldTasks.filter(ot => !newTasks.find(nt => nt.id === ot.id));
                 for (const task of removed) await deleteTaskFromDB(task.id);
                 const updated = newTasks.filter(nt => {
                    const old = oldTasks.find(ot => ot.id === nt.id);
                    return old && (old.text !== nt.text || old.completed !== nt.completed || old.dueDate !== nt.dueDate);
                 });
                 for (const task of updated) await updateTaskInDB(task.id, task);
             }
        }

        const { tasks, ...scalarUpdates } = updates;
        if (Object.keys(scalarUpdates).length > 0) {
             await updateMemberInDB(id, scalarUpdates);
        }
    } catch (e) { console.error("Failed to update member", e); }
  };

  const handleDeleteMember = async (id: string) => {
    try {
        await deleteMemberFromDB(id);
        setMembers(prev => prev.filter(m => m.id !== id));
        if (selectedMemberProfile?.id === id) setSelectedMemberProfile(null);
    } catch (e) {
        console.error("Failed to delete member", e);
        alert("Failed to delete member. Please try again.");
    }
  };

  const handleDeleteMeeting = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Replaced confirm() with a direct action as confirm() is blocked in iframes
    try {
        await deleteMeetingFromDB(id);
        setMeetings(prev => prev.filter(m => m.id !== id));
    } catch (err) {
        console.error("Failed to delete meeting", err);
        alert("Failed to delete meeting");
    }
  };

  // Filter Logic
  const isMemberWorking = (member: TeamMember, refTime: Date) => {
    if (member.statusOverride === 'online') return true;
    if (member.statusOverride === 'offline') return false;
    const utcTimestamp = refTime.getTime();
    const localDateString = new Date(utcTimestamp).toLocaleString("en-US", { timeZone: member.timezone });
    const localDate = new Date(localDateString);
    const hours = localDate.getHours();
    if (member.workStartHour < member.workEndHour) {
        return hours >= member.workStartHour && hours < member.workEndHour;
    } else {
        return hours >= member.workStartHour || hours < member.workEndHour;
    }
  };

  const filteredMembers = members.filter(member => {
    if (filter === 'all') return true;
    const working = isMemberWorking(member, referenceTime);
    return filter === 'working' ? working : !working;
  });
  
  const groupedMembers = filteredMembers.reduce((acc, member) => {
      const key = member.role || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(member);
      return acc;
  }, {} as Record<string, TeamMember[]>);

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(meetingSearchQuery.toLowerCase()) ||
    (m.contentHtml || '').toLowerCase().includes(meetingSearchQuery.toLowerCase())
  );

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>;

  if (!currentUser) {
      return <Login onLogin={handleLogin} />;
  }

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
              <p>Loading your workspace...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans selection:bg-blue-500/30 transition-colors duration-300">
      <CommandPalette 
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          members={members}
          onSelectMember={setSelectedMemberProfile}
      />
      
      <OnboardingTour 
        isOpen={showOnboarding} 
        onComplete={() => { localStorage.setItem('zappymeet_has_seen_onboarding', 'true'); setShowOnboarding(false); setTimeout(() => setIsModalOpen(true), 300); }}
        onSkip={() => { localStorage.setItem('zappymeet_has_seen_onboarding', 'true'); setShowOnboarding(false); }}
      />
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        members={members}
        meetings={meetings}
        onImport={() => alert("Import disabled in live version")}
      />
      
      <OverlapFinderModal
        isOpen={isOverlapOpen}
        onClose={() => setIsOverlapOpen(false)}
        members={members}
        onSelectTime={handleTimeChange}
      />

      {selectedMemberProfile && (
          <MemberProfileModal 
            isOpen={!!selectedMemberProfile}
            onClose={() => setSelectedMemberProfile(null)}
            member={selectedMemberProfile}
            onUpdate={handleUpdateMember}
            onDelete={handleDeleteMember}
          />
      )}

      {/* Header - Changed from fixed to static/relative flow as requested "not sticky" */}
      <header className="w-full z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-600 p-2 rounded-lg shadow-sm">
               <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Aureus Tasking
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                <span className="font-bold">⌘K</span> to search
            </div>

             <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400">
                <Users className="w-3 h-3" />
                <span>{members.length}</span>
             </div>

             <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
             >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold border border-amber-200 dark:border-slate-700">
                    <UserCircle className="w-5 h-5" />
                </div>
                <button
                    onClick={handleLogout}
                    className="text-sm text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Log Out"
                >
                    <LogOut className="w-5 h-5" />
                </button>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-8 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {viewMode !== 'meetings' && (
            <div className="mb-8 flex items-end gap-4">
                <div className="flex-1">
                    <TimelineSlider 
                        currentDate={referenceTime} 
                        onChange={handleTimeChange}
                        onReset={handleResetTime}
                        isLive={isLiveMode}
                        members={members}
                    />
                </div>
                <button 
                    onClick={() => setIsOverlapOpen(true)}
                    className="h-[120px] hidden sm:flex flex-col items-center justify-center px-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-xl transition-colors text-amber-700 dark:text-amber-500 shadow-sm"
                >
                    <Sparkles className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Best Time</span>
                </button>
            </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
                 <div className="flex p-1 bg-slate-200 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-800 shadow-inner">
                    <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                        <LayoutGrid className="w-4 h-4" /> Team
                    </button>
                    <button onClick={() => setViewMode('dashboard')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'dashboard' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                        <BarChart3 className="w-4 h-4" /> Stats
                    </button>
                    <button onClick={() => setViewMode('meetings')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'meetings' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                        <FileText className="w-4 h-4" /> Meetings
                    </button>
                </div>
            </div>
            
            {viewMode === 'grid' && (
                <div className="flex items-center gap-2">
                    <button id="add-member-trigger" onClick={() => setIsModalOpen(true)} className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg shadow-amber-500/20 transition-colors">
                        <Plus className="w-4 h-4" /> Add Member
                    </button>
                     <button onClick={() => setGroupByRole(!groupByRole)} className={`p-2 rounded-lg border transition-colors ${groupByRole ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'}`}>
                         <Layers className="w-4 h-4" />
                     </button>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>All</button>
                        <button onClick={() => setFilter('working')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${filter === 'working' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>Working</button>
                    </div>
                </div>
            )}
        </div>

        {viewMode === 'dashboard' ? (
            <>
                <TeamGlobe members={members} />
                <Dashboard members={members} />
            </>
        ) : viewMode === 'meetings' ? (
            currentMeeting || (meetings.length === 0 && !currentMeeting) ? ( 
                 <MeetingEditor 
                    members={members}
                    initialData={currentMeeting}
                    onSave={async (m) => {
                         await saveMeetingInDB(m);
                         const exists = meetings.find(x => x.id === m.id);
                         if (exists) setMeetings(prev => prev.map(x => x.id === m.id ? m : x));
                         else setMeetings(prev => [m, ...prev]);
                         setCurrentMeeting(undefined);
                    }}
                    onSyncTasks={async (updates: { memberId: string, tasks: string[] }[]) => {
                         const updatedMembers = [...members];
                         for (const update of updates) {
                            const mIdx = updatedMembers.findIndex(m => m.id === update.memberId);
                            if (mIdx !== -1) {
                                const m = updatedMembers[mIdx];
                                const currentTaskTexts = new Set((m.tasks || []).map(t => t.text.trim().toLowerCase()));
                                
                                const newTasks = [];
                                for (const taskText of update.tasks) {
                                    // Split potentially multi-line text blocks into separate lines if they look like separate items
                                    // But keep paragraphs intact if they are just long text. 
                                    // For simplicity, we treat the extracted block as one task, unless it contains distinct newlines.
                                    // We'll split by newline to be safe, as the extraction logic adds newlines for <br>.
                                    const lines = taskText.split('\n').filter(l => l.trim().length > 0);
                                    
                                    for(const line of lines) {
                                        const normalized = line.trim().toLowerCase();
                                        if (!currentTaskTexts.has(normalized)) {
                                            newTasks.push({ 
                                                id: Date.now() + Math.random().toString(), 
                                                text: line.trim(), 
                                                completed: false 
                                            });
                                            currentTaskTexts.add(normalized);
                                        }
                                    }
                                }

                                if (newTasks.length > 0) {
                                    for(const t of newTasks) await addTask(m.id, t);
                                    updatedMembers[mIdx] = { ...m, tasks: [...(m.tasks||[]), ...newTasks] };
                                }
                            }
                         }
                         setMembers(updatedMembers);
                    }}
                    onBack={() => setCurrentMeeting(undefined)}
                 />
            ) : (
                <div className="space-y-6 animate-in fade-in">
                    <div className="relative max-w-md mx-auto md:mx-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={meetingSearchQuery} onChange={(e) => setMeetingSearchQuery(e.target.value)} placeholder="Search meetings..." className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <button onClick={() => setCurrentMeeting({ id: '', title: '', date: '', contentHtml: '' })} className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-slate-900/50 transition-all group h-full min-h-[200px]">
                            <div className="bg-amber-100 dark:bg-slate-800 p-4 rounded-full text-amber-600 dark:text-amber-400 mb-4 group-hover:scale-110 transition-transform"><Plus className="w-6 h-6" /></div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200">New Meeting Note</h3>
                        </button>
                        {filteredMeetings.map(meeting => (
                            <div key={meeting.id} onClick={() => setCurrentMeeting(meeting)} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition-all cursor-pointer group relative">
                                <button 
                                    onClick={(e) => handleDeleteMeeting(e, meeting.id)}
                                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                                    title="Delete Meeting"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"><FileText className="w-6 h-6" /></div>
                                    <span className="text-xs text-slate-400 font-mono">{new Date(meeting.date).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-amber-600">{meeting.title}</h3>
                                <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 opacity-70">{meeting.contentHtml.replace(/<[^>]+>/g, '')}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        ) : (
            <div className={groupByRole ? "space-y-8" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start"}>
                {groupByRole ? Object.entries(groupedMembers).map(([role, groupMembers]) => (
                    <div key={role} className="animate-in fade-in">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 pl-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span> {role}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                            { (groupMembers as TeamMember[]).map((member) => (
                                <MemberCard 
                                    key={member.id} 
                                    member={member} 
                                    referenceTime={referenceTime}
                                    onUpdate={(updates) => handleUpdateMember(member.id, updates)}
                                    onViewProfile={() => setSelectedMemberProfile(member)}
                                    onDelete={() => handleDeleteMember(member.id)}
                                />
                            ))}
                        </div>
                    </div>
                )) : filteredMembers.map((member) => (
                    <MemberCard 
                        key={member.id} 
                        member={member} 
                        referenceTime={referenceTime}
                        onUpdate={(updates) => handleUpdateMember(member.id, updates)}
                        onViewProfile={() => setSelectedMemberProfile(member)}
                        onDelete={() => handleDeleteMember(member.id)}
                    />
                ))}
            </div>
        )}
      </main>
      
      <AddMemberModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdd={handleAddMember} />
    </div>
  );
};

export default App;