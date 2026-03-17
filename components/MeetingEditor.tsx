import React, { useState, useRef, useEffect } from 'react';
import { TeamMember, Meeting, Task } from '../types';
import { summarizeMeeting } from '../services/geminiService';
import { 
    Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, 
    Save, Wand2, CheckCircle2, Users, Calendar, Type, Quote, ChevronLeft, Sparkles, Loader2
} from 'lucide-react';

interface MeetingEditorProps {
    members: TeamMember[];
    onSave: (meeting: Meeting) => void;
    onSyncTasks: (tasksToSync: { memberId: string, tasks: string[] }[]) => Promise<void> | void;
    initialData?: Meeting;
    onBack: () => void;
}

export const MeetingEditor: React.FC<MeetingEditorProps> = ({ members, onSave, onSyncTasks, initialData, onBack }) => {
    const [title, setTitle] = useState(initialData?.title || 'Weekly Sync');
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    
    // Mention System State
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const [mentionQuery, setMentionQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    
    // AI State
    const [isSummarizing, setIsSummarizing] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);
    const savedSelection = useRef<Range | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Initialize content once on mount or when ID changes
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = initialData?.contentHtml || '<p><br></p>';
        }
    }, [initialData?.id]);

    // Filter members based on query
    const filteredMembers = members.filter(m => 
        m.name.toLowerCase().includes(mentionQuery.toLowerCase())
    );

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [mentionQuery]);

    // Auto-scroll the list to keep selected item in view
    useEffect(() => {
        if (showMentionList && listRef.current) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                const listRect = listRef.current.getBoundingClientRect();
                const elRect = selectedElement.getBoundingClientRect();
                
                if (elRect.bottom > listRect.bottom) {
                    selectedElement.scrollIntoView({ block: 'nearest' });
                } else if (elRect.top < listRect.top) {
                    selectedElement.scrollIntoView({ block: 'nearest' });
                }
            }
        }
    }, [selectedIndex, showMentionList]);

    // Execute standard editing commands
    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    // Save cursor position before losing focus
    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            // Only save if we are actually inside the editor
            if (editorRef.current && editorRef.current.contains(selection.anchorNode)) {
                savedSelection.current = selection.getRangeAt(0);
            }
        }
    };

    const restoreSelection = () => {
        const selection = window.getSelection();
        if (selection && savedSelection.current) {
            selection.removeAllRanges();
            selection.addRange(savedSelection.current);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showMentionList) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredMembers.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (filteredMembers[selectedIndex]) {
                    insertMember(filteredMembers[selectedIndex]);
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowMentionList(false);
                return;
            }
        }

        if (e.key === '@') {
            // We use setTimeout to allow the @ character to be inserted into the DOM first
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    setMentionPosition({ 
                        top: rect.bottom + 5, 
                        left: rect.left 
                    });
                    setShowMentionList(true);
                    setMentionQuery('');
                }
            }, 0);
        }

        if (showMentionList) {
            if (e.key === 'Backspace') {
                if (mentionQuery === '') {
                     setShowMentionList(false);
                } else {
                    setMentionQuery(prev => prev.slice(0, -1));
                }
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                setMentionQuery(prev => prev + e.key);
            }
        }
    };

    const insertMember = (member: TeamMember) => {
        // Ensure we have focus in the editor
        editorRef.current?.focus();
        
        // If we lost selection (e.g. due to blur), try to restore or get current
        let selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            restoreSelection();
            selection = window.getSelection();
        }
        
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        
        // Logic: Find the '@' that started this sequence and replace everything up to the cursor
        // This is more robust than calculating offsets based on query length
        if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
             const text = textNode.textContent;
             const caretPos = range.startOffset;
             
             // Search backwards from caret for the last '@'
             const atIndex = text.lastIndexOf('@', caretPos - 1);
             
             if (atIndex !== -1) {
                 // Delete from '@' to caret
                 range.setStart(textNode, atIndex);
                 range.setEnd(textNode, caretPos);
                 range.deleteContents();

                 // Create the mention pill
                 const span = document.createElement('span');
                 span.contentEditable = 'false';
                 span.className = 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-medium text-sm mx-1 select-none align-middle border border-blue-200 dark:border-blue-800';
                 span.dataset.memberId = member.id;
                 span.innerText = `@${member.name}`;
                 
                 // Create a spacer after
                 const space = document.createTextNode('\u00A0');

                 range.insertNode(space);
                 range.insertNode(span);
                 
                 // Move cursor after space
                 range.setStartAfter(space);
                 range.setEndAfter(space);
                 selection.removeAllRanges();
                 selection.addRange(range);
             }
        }

        setShowMentionList(false);
        setMentionQuery('');
    };

    const extractTasks = async () => {
        if (!editorRef.current) return;
        setIsSyncing(true);

        const updates: Map<string, string[]> = new Map();
        
        // Recursive function to traverse the DOM
        let currentMemberId: string | null = null;
        let bufferText = "";

        const flushBuffer = () => {
            if (currentMemberId && bufferText.trim().length > 0) {
                 // Split by newlines (added by block elements or BRs) to ensure distinct tasks are preserved
                 // but preserve paragraphs if they are part of one thought? 
                 // For now, let's treat essentially new blocks as potentially new tasks, 
                 // but we also want to allow "paragraphs to the tasks".
                 // So we will just push the whole buffer as one entry. 
                 // The backend handler in App.tsx will handle splitting if needed or just storing.
                 // Actually, the user asked for "paragraphs to the tasks", implying one task can have paragraphs.
                 const cleanText = bufferText.trim().replace(/^[-*•]\s*/, ''); 
                 if (cleanText) {
                     const existing = updates.get(currentMemberId) || [];
                     existing.push(cleanText);
                     updates.set(currentMemberId, existing);
                 }
            }
            bufferText = "";
        };

        const traverse = (node: Node) => {
            // 1. Element Node
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                
                // Is this a mention pill?
                if (el.dataset.memberId) {
                    flushBuffer(); // Finish previous task before starting new context
                    currentMemberId = el.dataset.memberId;
                    return; // Don't traverse inside the pill
                }

                if (el.tagName === 'BR') {
                    bufferText += "\n";
                    return;
                }

                // Is this a block element that usually signifies a new line/task start?
                const isBlock = ['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE'].includes(el.tagName);
                
                if (isBlock) {
                    // We only flush if we actually have content to flush. 
                    // AND if we want to treat blocks as separators. 
                    // If we want to support multi-paragraph tasks, we shouldn't flush on EVERY block opening if context is same.
                    // However, typically a new paragraph implies a new item in a list context. 
                    // But the user asked for "paragraphs to the tasks".
                    // Let's add a newline to buffer instead of flushing, so multiple paragraphs can be one task string?
                    // No, usually tasks are discrete items.
                    // If the user said "paragraphs to the tasks", they likely mean they want the full text content, 
                    // even if it spans lines.
                    // Let's add a newline separator in the buffer rather than flushing.
                    // We will only flush when we hit a NEW mention or explicitly end context (which we don't really do).
                    // Actually, to keep it simple and robust: we flush on block end to separate items. 
                    // If they want one large task, they usually paste it in one block or use shift-enter.
                    // But "large text pieces" suggests we should accumulate.
                    // Let's compromise: Add newline on block start.
                    if (bufferText.length > 0) bufferText += "\n";
                }

                // Traverse children
                el.childNodes.forEach(child => traverse(child));
                
                if (isBlock) {
                    // On block end, we might want to ensure spacing.
                    if (bufferText.length > 0 && !bufferText.endsWith('\n')) bufferText += "\n";
                }
            } 
            // 2. Text Node
            else if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (text && text.length > 0) {
                     // If we have a member context, append this text
                     if (currentMemberId) {
                         // Normalize spaces slightly but keep structure
                         bufferText += text;
                     }
                }
            }
        };

        // Start traversal
        editorRef.current.childNodes.forEach(node => traverse(node));
        flushBuffer(); // Final flush

        // Convert Map to Array for callback
        const payload: { memberId: string, tasks: string[] }[] = [];
        updates.forEach((tasks, memberId) => {
            payload.push({ memberId, tasks });
        });

        if (payload.length > 0) {
            // Await the sync!
            await onSyncTasks(payload);
            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 3000);
        } else {
            alert("No tagged tasks found. Tag a member with '@' and write tasks next to or below their name.");
        }
        setIsSyncing(false);
    };

    const handleAISummarize = async () => {
        if (!editorRef.current) return;
        setIsSummarizing(true);
        
        try {
            const content = editorRef.current.innerText; // Use Text to save tokens
            const result = await summarizeMeeting(content);
            
            // Create HTML block for summary
            const summaryHtml = `
                <div class="my-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
                    <h3 class="text-purple-700 dark:text-purple-300 font-bold text-sm uppercase mb-2 flex items-center gap-2">
                        ✨ AI Summary
                    </h3>
                    <p class="text-slate-700 dark:text-slate-300 text-sm mb-3 italic">${result.summary}</p>
                    <h4 class="text-xs font-bold text-slate-500 uppercase mb-1">Suggested Action Items:</h4>
                    <ul class="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
                        ${result.actionItems.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                <p><br/></p>
            `;
            
            // Append to editor
            editorRef.current.innerHTML += summaryHtml;
            
            // Scroll to bottom
            editorRef.current.scrollTop = editorRef.current.scrollHeight;
        } catch (e) {
            alert("Failed to summarize. Please try again.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleSave = () => {
        if (!editorRef.current) return;
        onSave({
            id: initialData?.id || Date.now().toString(),
            title,
            date: new Date(date).toISOString(),
            contentHtml: editorRef.current.innerHTML
        });
        onBack();
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            
            {/* Header / Toolbar */}
            <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                <div className="flex justify-between items-center mb-4 gap-4">
                    <div className="flex items-center gap-2 flex-1">
                         <button 
                            onClick={onBack}
                            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                            title="Back to Meetings"
                         >
                             <ChevronLeft className="w-5 h-5" />
                         </button>
                         <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="flex-1 bg-transparent text-xl font-bold text-slate-900 dark:text-white outline-none placeholder-slate-400 min-w-0"
                            placeholder="Meeting Title..."
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                             <input 
                                type="date" 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                             />
                        </div>

                        <button 
                            onClick={handleAISummarize}
                            disabled={isSummarizing}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-all"
                            title="Summarize & Extract Tasks using Gemini AI"
                        >
                            {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            <span className="hidden sm:inline">AI Assist</span>
                        </button>

                        <button 
                            onClick={extractTasks}
                            disabled={isSyncing || syncSuccess}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                ${syncSuccess 
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50'
                                }`}
                        >
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : syncSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
                            {syncSuccess ? 'Tasks Synced!' : 'Sync Tasks'}
                        </button>
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium shadow-md shadow-blue-500/20"
                        >
                            <Save className="w-4 h-4" /> Save
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <ToolbarBtn icon={<Bold className="w-4 h-4"/>} onClick={() => execCmd('bold')} tooltip="Bold" />
                    <ToolbarBtn icon={<Italic className="w-4 h-4"/>} onClick={() => execCmd('italic')} tooltip="Italic" />
                    <ToolbarBtn icon={<Underline className="w-4 h-4"/>} onClick={() => execCmd('underline')} tooltip="Underline" />
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 self-center"></div>
                    <ToolbarBtn icon={<Heading1 className="w-4 h-4"/>} onClick={() => execCmd('formatBlock', 'H1')} tooltip="Heading 1" />
                    <ToolbarBtn icon={<Heading2 className="w-4 h-4"/>} onClick={() => execCmd('formatBlock', 'H2')} tooltip="Heading 2" />
                    <ToolbarBtn icon={<Type className="w-4 h-4"/>} onClick={() => execCmd('formatBlock', 'P')} tooltip="Paragraph" />
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 self-center"></div>
                    <ToolbarBtn icon={<List className="w-4 h-4"/>} onClick={() => execCmd('insertUnorderedList')} tooltip="Bullet List" />
                    <ToolbarBtn icon={<ListOrdered className="w-4 h-4"/>} onClick={() => execCmd('insertOrderedList')} tooltip="Numbered List" />
                    <ToolbarBtn icon={<Quote className="w-4 h-4"/>} onClick={() => execCmd('formatBlock', 'BLOCKQUOTE')} tooltip="Quote" />
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-8 cursor-text" onClick={() => editorRef.current?.focus()}>
                <div 
                    ref={editorRef}
                    contentEditable
                    onKeyDown={handleKeyDown}
                    onBlur={saveSelection}
                    className="editor-content max-w-3xl mx-auto min-h-[800px] bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-lg p-12 outline-none focus:ring-2 focus:ring-blue-500/20 transition-shadow text-slate-900 dark:text-slate-200"
                />
            </div>

            {/* Mention Popup */}
            {showMentionList && (
                <div 
                    className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl w-64 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: mentionPosition.top, left: mentionPosition.left }}
                >
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Mention Member
                    </div>
                    <div ref={listRef} className="max-h-48 overflow-y-auto scroll-smooth">
                        {filteredMembers.length > 0 ? (
                            filteredMembers.map((member, index) => (
                                <button
                                    key={member.id}
                                    onClick={() => insertMember(member)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full px-4 py-2 flex items-center gap-3 transition-colors text-left
                                        ${index === selectedIndex 
                                            ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 pl-3' 
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-transparent'}`}
                                >
                                    <img src={member.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                                    <div>
                                        <div className={`text-sm font-medium ${index === selectedIndex ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>{member.name}</div>
                                        <div className="text-xs text-slate-500">{member.role}</div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">No members found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ToolbarBtn: React.FC<{ icon: React.ReactNode, onClick: () => void, tooltip: string }> = ({ icon, onClick, tooltip }) => (
    <button 
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        title={tooltip}
        className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
    >
        {icon}
    </button>
);