import React, { useState } from 'react';
import { Globe, Lock, Mail, Loader2, ArrowRight, ShieldCheck, KeyRound, HelpCircle } from 'lucide-react';
import { loginUser, registerUser, getSecurityQuestion, resetPassword } from '../services/db';
import { User } from '../types';

interface LoginProps {
    onLogin: (user: User) => void;
}

type AuthMode = 'login' | 'register' | 'forgot-email' | 'forgot-verify';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    
    // Security Question State
    const [securityQuestion, setSecurityQuestion] = useState('What was your first pet\'s name?');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [fetchedQuestion, setFetchedQuestion] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const resetState = () => {
        setError(null);
        setSuccessMsg(null);
        setPassword('');
        setNewPassword('');
        setSecurityAnswer('');
    };

    const handleSwitchMode = (newMode: AuthMode) => {
        setMode(newMode);
        resetState();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (mode === 'register') {
                const user = await registerUser(email, password, securityQuestion, securityAnswer);
                onLogin(user);
            } else if (mode === 'login') {
                const user = await loginUser(email, password);
                onLogin(user);
            } else if (mode === 'forgot-email') {
                const question = await getSecurityQuestion(email);
                setFetchedQuestion(question);
                handleSwitchMode('forgot-verify');
            } else if (mode === 'forgot-verify') {
                await resetPassword(email, securityAnswer, newPassword);
                setSuccessMsg('Password reset successfully! Please sign in.');
                setTimeout(() => handleSwitchMode('login'), 2000);
            }
        } catch (err: any) {
            setError(err.message || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    const securityQuestions = [
        "What was your first pet's name?",
        "What city were you born in?",
        "What is your mother's maiden name?",
        "What was the name of your first school?",
        "What is your favorite book?"
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/30 mb-4">
                            {mode === 'login' || mode === 'register' ? (
                                <Globe className="w-8 h-8 text-white" />
                            ) : (
                                <KeyRound className="w-8 h-8 text-white" />
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {mode === 'register' ? 'Join Zappy Meet' : 
                             mode === 'login' ? 'Welcome Back' : 
                             mode === 'forgot-email' ? 'Reset Password' : 'Verify Identity'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-center mt-2 text-sm">
                            {mode === 'register' ? 'Create your workspace and setup recovery options.' : 
                             mode === 'login' ? 'Sign in to manage your distributed team.' : 
                             mode === 'forgot-email' ? 'Enter your email to retrieve your security question.' :
                             'Answer your security question to reset password.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* EMAIL FIELD - Visible in all modes except verify */}
                        {(mode !== 'forgot-verify') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input 
                                        type="email" 
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="you@company.com"
                                    />
                                </div>
                            </div>
                        )}

                        {/* PASSWORD FIELD - Login & Register */}
                        {(mode === 'login' || mode === 'register') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input 
                                        type="password" 
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        {/* SECURITY QUESTION SETUP - Register Only */}
                        {mode === 'register' && (
                            <div className="pt-2 space-y-4 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-blue-500"/> Security Question
                                    </label>
                                    <div className="relative">
                                        <select 
                                            value={securityQuestion}
                                            onChange={(e) => setSecurityQuestion(e.target.value)}
                                            className="w-full pl-3 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none text-sm"
                                        >
                                            {securityQuestions.map(q => <option key={q} value={q}>{q}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Answer</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={securityAnswer}
                                        onChange={(e) => setSecurityAnswer(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="e.g. Fluffy"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Used to recover your account if you forget your password.</p>
                                </div>
                            </div>
                        )}

                        {/* RESET FLOW - Security Question Check */}
                        {mode === 'forgot-verify' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Security Question</p>
                                    <p className="text-sm text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4"/> {fetchedQuestion}
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Your Answer</label>
                                    <input 
                                        type="text" 
                                        required
                                        autoFocus
                                        value={securityAnswer}
                                        onChange={(e) => setSecurityAnswer(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Type your answer..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input 
                                            type="password" 
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="New secure password"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm text-center animate-in fade-in slide-in-from-top-1">
                                {successMsg}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading || !!successMsg}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    {mode === 'register' ? 'Create Account' : 
                                     mode === 'login' ? 'Sign In' :
                                     mode === 'forgot-email' ? 'Find Account' : 'Reset Password'}
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                    
                    <div className="mt-6 flex flex-col items-center gap-3 text-sm">
                        {mode === 'login' && (
                            <>
                                <button 
                                    onClick={() => handleSwitchMode('forgot-email')}
                                    className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    Forgot password?
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setEmail('dev@aureus.tasking');
                                        setPassword('password123');
                                    }}
                                    className="text-amber-600 dark:text-amber-400 hover:underline text-xs font-medium"
                                >
                                    Fill with Dev User
                                </button>
                                <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>
                                <button 
                                    onClick={() => handleSwitchMode('register')}
                                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                >
                                    Create new account
                                </button>
                            </>
                        )}
                        
                        {(mode === 'register' || mode === 'forgot-email' || mode === 'forgot-verify') && (
                            <button 
                                onClick={() => handleSwitchMode('login')}
                                className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                            >
                                Back to Login
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};