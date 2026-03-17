"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        goals: [] as string[],
        hasMedicalIssues: false,
        medicalDetails: "",
        interest: "",
    });

    const handleGoalToggle = (goal: string) => {
        setFormData(prev => ({
            ...prev,
            goals: prev.goals.includes(goal)
                ? prev.goals.filter(g => g !== goal)
                : [...prev.goals, goal]
        }));
    };

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            // Determine recommendation
            const recommendTherapy = formData.hasMedicalIssues || formData.interest === "therapy" || formData.goals.includes("Therapy/Healing");
            const plan = recommendTherapy ? "therapy" : "everyday";
            router.push(`/onboarding/recommendation?plan=${plan}`);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-background py-20 px-4">
            <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-xl border-t-4 border-primary">
                <div className="mb-8">
                    <div className="flex justify-between items-center text-sm font-bold text-text/50 uppercase tracking-widest mb-4">
                        <span>Step {step} of 3</span>
                        <span>Personalize</span>
                    </div>
                    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500 ease-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="font-serif text-3xl text-primary mb-6">What brings you to Shakti Yoga?</h2>
                        <p className="text-text/70 mb-8">Select all that apply.</p>

                        <div className="grid md:grid-cols-2 gap-4 mb-8">
                            {["Stress Relief", "Flexibility", "Weight Loss", "Therapy/Healing", "Strength", "Mental Peace"].map((goal) => (
                                <button
                                    key={goal}
                                    onClick={() => handleGoalToggle(goal)}
                                    className={`p-4 rounded border text-left transition-all ${formData.goals.includes(goal)
                                            ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                                            : "border-gray-200 hover:border-primary/50 text-text/80"
                                        }`}
                                >
                                    {goal}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="font-serif text-3xl text-primary mb-6">Do you have any medical conditions?</h2>
                        <p className="text-text/70 mb-8">This helps us ensure your safety.</p>

                        <div className="flex gap-6 mb-8">
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, hasMedicalIssues: false }))}
                                className={`flex-1 p-6 rounded border text-center transition-all ${!formData.hasMedicalIssues
                                        ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                                        : "border-gray-200 hover:border-primary/50 text-text/80"
                                    }`}
                            >
                                No, I'm fit
                            </button>
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, hasMedicalIssues: true }))}
                                className={`flex-1 p-6 rounded border text-center transition-all ${formData.hasMedicalIssues
                                        ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                                        : "border-gray-200 hover:border-primary/50 text-text/80"
                                    }`}
                            >
                                Yes, I have issues
                            </button>
                        </div>

                        {formData.hasMedicalIssues && (
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-text/70 mb-2 uppercase tracking-wider">Please specify (Optional)</label>
                                <textarea
                                    value={formData.medicalDetails}
                                    onChange={(e) => setFormData(prev => ({ ...prev, medicalDetails: e.target.value }))}
                                    className="w-full p-3 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors"
                                    rows={3}
                                    placeholder="e.g., Lower back pain, High BP..."
                                ></textarea>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="font-serif text-3xl text-primary mb-6">What are you most interested in?</h2>

                        <div className="space-y-4 mb-8">
                            {[
                                { id: "group", label: "Group Everyday Yoga", desc: "Live classes, community energy" },
                                { id: "therapy", label: "Yoga Therapy 1:1", desc: "Personalized healing, private sessions" },
                                { id: "both", label: "Not Sure / Both", desc: "Help me decide" }
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setFormData(prev => ({ ...prev, interest: option.id }))}
                                    className={`w-full p-4 rounded border text-left transition-all flex justify-between items-center ${formData.interest === option.id
                                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                                            : "border-gray-200 hover:border-primary/50 text-text/80"
                                        }`}
                                >
                                    <div>
                                        <div className="font-bold">{option.label}</div>
                                        <div className="text-sm opacity-70">{option.desc}</div>
                                    </div>
                                    {formData.interest === option.id && <span className="text-xl">✓</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-between mt-8 pt-8 border-t border-gray-100">
                    {step > 1 ? (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="text-text/60 hover:text-primary font-bold uppercase tracking-widest text-sm"
                        >
                            Back
                        </button>
                    ) : (
                        <div></div>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={step === 3 && !formData.interest}
                        className="px-8 py-3 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {step === 3 ? "See Recommendation" : "Next"}
                    </button>
                </div>
            </div>
        </main>
    );
}
