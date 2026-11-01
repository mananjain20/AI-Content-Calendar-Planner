import React, { useEffect, useState } from 'react';

const STEPS = [
  { id: 1, label: 'Formulating structured prompt & platform rules...' },
  { id: 2, label: 'Calling Groq AI (Qwen) for platform-specific captions...' },
  { id: 3, label: 'Running output validation (character limits, hashtags, CTAs)...' },
  { id: 4, label: 'Saving campaign blueprint & audit logs to storage...' }
];

export default function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loading-box">
      <div className="spinner"></div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>
        Generating Your AI Content Calendar
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        Please wait while Groq AI generates, validates, and schedules your content.
      </p>

      <div className="loading-steps">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStep;
          const isActive = idx === currentStep;

          return (
            <div
              key={step.id}
              className={`loading-step-item ${isActive ? 'active' : ''}`}
            >
              <span className={`step-indicator ${isDone ? 'done' : ''}`}>
                {isDone ? '✓' : idx + 1}
              </span>
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

