
import React, { useState } from 'react';
import { X, MapPin, Clock, Briefcase, Mail, Github, Linkedin, Edit2, Save, Plus, Tag, Trash2 } from 'lucide-react';
import { TeamMember } from '../types';
import * as d3 from 'd3';

interface MemberProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    member: TeamMember;
    onUpdate: (id: string, updates: Partial<TeamMember>) => void;
    onDelete: (id: string) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({ isOpen, onClose, member, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    
    // Edit State
    const [bio, setBio] = useState(member.bio || '');
    const [skills, setSkills] = useState<string[]>(member.skills || []);
    const [newSkill, setNewSkill] = useState('');
    const [email, setEmail] = useState(member.email || '');
    const [github, setGithub] = useState(member.githubHandle || '');
    const [linkedin, setLinkedin] = useState(member.linkedinHandle || '');

    if (!isOpen) return null;

    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    const handleSave = () => {
        onUpdate(member.id, {
            bio,
            skills,
            email,
            githubHandle: github,
            linkedinHandle: linkedin
        });
        setIsEditing(false);
    };
    
    const handleDelete = () => {
        setShowConfirmDelete(true);
    };

    const confirmDelete = () => {
        onDelete(member.id);
        onClose();
    };

    const cancelDelete = () => {
        setShowConfirmDelete(false);
    };

    const handleAddSkill = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSkill.trim() && !skills.includes(newSkill.trim())) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill('');
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    // Calculate local time
    let localTime = "";
    try {
        localTime = new Date().toLocaleString("en-US", { timeZone: member.timezone, hour: 'numeric', minute: '2-digit' });
    } catch (e) { localTime = "Unknown"; }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                
                {/* Cover & Header */}
                <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600 shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-8 pb-8 flex-1 overflow-y-auto">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <img 
                            src={member.avatarUrl} 
                            alt={member.name}
                            className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-900 shadow-lg object-cover bg-white" 
                        />
                        {!isEditing ? (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="mb-2 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
                            >
                                <Edit2 className="w-4 h-4" /> Edit Profile
                            </button>
                        ) : (
                            <div className="flex gap-2 mb-2">
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-medium shadow-lg shadow-blue-500/25"
                                >
                                    <Save className="w-4 h-4" /> Save Changes
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Left Col: Info */}
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{member.name}</h1>
                                <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-1">
                                    <Briefcase className="w-4 h-4" /> {member.role}
                                </p>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-medium">{member.location}</div>
                                        <div className="text-xs text-slate-400">{member.timezone}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-medium">{localTime}</div>
                                        <div className="text-xs text-slate-400">Local Time</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Connect</h3>
                                
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <input 
                                            type="text" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                                            className="w-full text-sm p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                        />
                                        <input 
                                            type="text" placeholder="GitHub Username" value={github} onChange={e => setGithub(e.target.value)}
                                            className="w-full text-sm p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                        />
                                        <input 
                                            type="text" placeholder="LinkedIn Username" value={linkedin} onChange={e => setLinkedin(e.target.value)}
                                            className="w-full text-sm p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {member.email && (
                                            <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
                                                <Mail className="w-4 h-4" /> {member.email}
                                            </a>
                                        )}
                                        {member.githubHandle && (
                                            <a href={`https://github.com/${member.githubHandle}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
                                                <Github className="w-4 h-4" /> {member.githubHandle}
                                            </a>
                                        )}
                                        {member.linkedinHandle && (
                                            <a href={`https://linkedin.com/in/${member.linkedinHandle}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
                                                <Linkedin className="w-4 h-4" /> {member.linkedinHandle}
                                            </a>
                                        )}
                                        {!member.email && !member.githubHandle && !member.linkedinHandle && (
                                            <p className="text-sm text-slate-400 italic">No contact info added.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            
                        </div>

                        {/* Right Col: Bio & Skills */}
                        <div className="md:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">About</h3>
                                {isEditing ? (
                                    <textarea 
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Write a short bio..."
                                        className="w-full h-32 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                ) : (
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {member.bio || "No biography yet."}
                                    </p>
                                )}
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-blue-500" /> Skills
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {(isEditing ? skills : member.skills || []).map(skill => (
                                        <span key={skill} className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium border border-blue-100 dark:border-blue-800 flex items-center gap-1">
                                            {skill}
                                            {isEditing && (
                                                <button onClick={() => removeSkill(skill)} className="hover:text-red-500">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                    {isEditing && (
                                        <form onSubmit={handleAddSkill} className="flex items-center">
                                            <input 
                                                type="text" 
                                                value={newSkill}
                                                onChange={(e) => setNewSkill(e.target.value)}
                                                placeholder="Add skill..."
                                                className="px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm w-32 focus:w-48 transition-all outline-none"
                                            />
                                            <button type="submit" className="ml-1 p-1 text-blue-500 hover:bg-blue-50 rounded-full">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </form>
                                    )}
                                    {(!member.skills || member.skills.length === 0) && !isEditing && (
                                        <span className="text-slate-400 italic text-sm">No skills listed.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Always visible delete button in footer */}
                <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    {showConfirmDelete ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 dark:text-slate-300 mr-2">Are you sure?</span>
                            <button 
                                onClick={cancelDelete}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Member
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
