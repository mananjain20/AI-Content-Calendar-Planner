import React, { useState } from 'react';

const PRESETS = [
  {
    name: '🚀 AI Developer Tool Launch',
    goal: 'Announce and drive early beta signups for an AI-powered code snippet manager',
    audience: 'Computer Science students, junior developers, and tech enthusiasts',
    platforms: ['Twitter/X', 'LinkedIn', 'Instagram'],
    duration: 7,
    tone: 'Energetic, developer-focused, and educational'
  },
  {
    name: '🎓 Annual College Tech Fest',
    goal: 'Build hype, announce guest speakers, and boost ticket registrations for HackFest 2026',
    audience: 'Engineering students, campus clubs, and aspiring developers',
    platforms: ['Instagram', 'LinkedIn'],
    duration: 7,
    tone: 'Vibrant, community-driven, and high-energy'
  },
  {
    name: '💼 Campus Placement Bootcamp',
    goal: 'Promote a free 5-day DSA and System Design interview prep masterclass',
    audience: 'Pre-final and final year B.Tech engineering students aiming for FAANG/tech jobs',
    platforms: ['LinkedIn', 'Twitter/X'],
    duration: 7,
    tone: 'Actionable, motivating, and authoritative'
  }
];

export default function CampaignForm({ onSubmit, isLoading }) {
  const today = new Date().toISOString().split('T')[0];

  const [campaignGoal, setCampaignGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['Twitter/X', 'LinkedIn', 'Instagram']);
  const [startDate, setStartDate] = useState(today);
  const [durationDays, setDurationDays] = useState(7);
  const [postsPerDay, setPostsPerDay] = useState(1);
  const [tone, setTone] = useState('Professional yet engaging');
  const [formError, setFormError] = useState('');

  const handlePresetSelect = (preset) => {
    setCampaignGoal(preset.goal);
    setTargetAudience(preset.audience);
    setSelectedPlatforms(preset.platforms);
    setDurationDays(preset.duration);
    setTone(preset.tone);
    setFormError('');
  };

  const handlePlatformToggle = (platform) => {
    if (selectedPlatforms.includes(platform)) {
      if (selectedPlatforms.length === 1) {
        setFormError('Please keep at least one platform selected.');
        return;
      }
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return; // Guard against accidental duplicate submission
    if (!campaignGoal.trim()) {
      setFormError('Please enter a campaign goal.');
      return;
    }
    if (!targetAudience.trim()) {
      setFormError('Please specify the target audience.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setFormError('Please select at least one target platform.');
      return;
    }

    setFormError('');
    onSubmit({
      campaignGoal: campaignGoal.trim(),
      targetAudience: targetAudience.trim(),
      platforms: selectedPlatforms,
      startDate,
      durationDays: Number(durationDays),
      postsPerDay: Number(postsPerDay),
      tone
    });
  };

  return (
    <div className="card">
      <div className="presets-container">
        <span className="presets-label">⚡ Quick Demo Presets:</span>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="preset-btn"
            onClick={() => handlePresetSelect(p)}
            disabled={isLoading}
          >
            {p.name}
          </button>
        ))}
      </div>

      <h2 className="card-title">✨ Campaign Blueprint & Scheduler</h2>

      {formError && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="goal">
            Campaign Objective / Goal *
          </label>
          <textarea
            id="goal"
            className="form-textarea"
            placeholder="e.g. Launching a new productivity app for university students to organize semester tasks..."
            value={campaignGoal}
            onChange={(e) => setCampaignGoal(e.target.value)}
            disabled={isLoading}
            required
          />
          <div className="form-helper">Define what you want this social media campaign to achieve.</div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="audience">
            Target Audience *
          </label>
          <input
            id="audience"
            type="text"
            className="form-input"
            placeholder="e.g. Undergraduate engineering students, tech hobbyists, and early adopters"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Target Social Platforms *</label>
          <div className="platform-chips">
            {['Twitter/X', 'LinkedIn', 'Instagram'].map((plat) => {
              const isSelected = selectedPlatforms.includes(plat);
              return (
                <label key={plat} className={`platform-chip ${isSelected ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handlePlatformToggle(plat)}
                    disabled={isLoading}
                  />
                  <span>{plat}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="startDate">Campaign Start Date</label>
            <input
              id="startDate"
              type="date"
              className="form-input"
              value={startDate}
              min={today}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="duration">Campaign Duration</label>
            <select
              id="duration"
              className="form-select"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              disabled={isLoading}
            >
              <option value={7}>7 Days (1 Week Sprint)</option>
              <option value={14}>14 Days (2 Weeks Campaign)</option>
              <option value={21}>21 Days (3 Weeks Blast)</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="postsPerDay">Posting Frequency</label>
            <select
              id="postsPerDay"
              className="form-select"
              value={postsPerDay}
              onChange={(e) => setPostsPerDay(Number(e.target.value))}
              disabled={isLoading}
            >
              <option value={1}>1 Post / Day (Steady Pace)</option>
              <option value={2}>2 Posts / Day (High Engagement)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tone">Brand Tone of Voice</label>
            <select
              id="tone"
              className="form-select"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={isLoading}
            >
              <option value="Professional yet engaging">Professional & Insightful</option>
              <option value="Energetic, developer-focused, and educational">Developer-Focused & Witty</option>
              <option value="Casual, conversational, and relatable">Casual & Relatable</option>
              <option value="Inspirational and authoritative">Inspirational & Authoritative</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <span>Generating & Scheduling Calendar...</span>
            </>
          ) : (
            <>
              <span>✨ Generate & Schedule Content Calendar</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
