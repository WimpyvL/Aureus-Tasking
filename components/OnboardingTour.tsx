import React, { useState } from 'react';
import { X, ArrowRight, Clock, Globe, Users, ChevronRight, Sparkles } from 'lucide-react';

interface OnboardingTourProps {
    isOpen: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const steps = [
        {
            title: "Welcome to Zappy Meet",
            description: "Say goodbye to timezone math. Let's get your distributed team perfectly synchronized.",
            icon: <Globe className="w-12 h-12 text-blue-600 dark:text-blue-400" />,
            imageColor: "bg-blue-50 dark:bg-blue-900/20"
        },
        {
            title: "Time Travel with Ease",
            description: "Use the Live Timeline Slider to see what time it is for everyone right now, or drag it to plan ahead.",
            icon: <Clock className="w-12 h-12 text-purple-600 dark:text-purple-400" />,
            imageColor: "bg-purple-50 dark:bg-purple-900/20"
        },
        {
            title: "Smart Availability",
            description: "Cards automatically update to show who is working, sleeping, or in their evening hours based on the slider time.",
            icon: <Users className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />,
            imageColor: "bg-emerald-50 dark:bg-emerald-900/20"
        },
        {
            title: "Let's Get Started",
            description: "You're ready to go. Let's add your first team member using our AI-powered location detection.",
            icon: <Sparkles className="w-12 h-12 text-amber-500 dark:text-amber-400" />,
            imageColor: "bg-amber-50 dark:bg-amber-900/20"
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                
                {/* Visual Header */}
                <div className={`h-40 ${step.imageColor} flex items-center justify-center transition-colors duration-500 relative`}>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-lg ring-4 ring-white/50 dark:ring-slate-700/50 animate-in zoom-in duration-500">
                        {step.icon}
                    </div>
                    <button 
                        onClick={onSkip}
                        className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 text-center flex-1 flex flex-col items-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 transition-all duration-300">
                        {step.title}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8 h-16 transition-all duration-300">
                        {step.description}
                    </p>

                    {/* Progress Indicators */}
                    <div className="flex gap-2 mb-8">
                        {steps.map((_, idx) => (
                            <div 
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    idx === currentStep 
                                        ? 'w-8 bg-blue-600 dark:bg-blue-500' 
                                        : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Buttons */}
                    <button 
                        onClick={handleNext}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group"
                    >
                        {currentStep === steps.length - 1 ? 'Add First Member' : 'Next'}
                        {currentStep < steps.length - 1 && (
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};