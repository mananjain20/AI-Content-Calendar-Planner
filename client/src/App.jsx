import React, { useState, useEffect } from 'react';
import CampaignForm from './components/CampaignForm';
import CalendarView from './components/CalendarView';
import ValidationCard from './components/ValidationCard';
import LoadingState from './components/LoadingState';
import {
  generateCalendarPlan,
  checkHealth,
  fetchLatestCampaign,
  fetchAllCampaigns,
  updateSavedCampaign
} from './services/api';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'overview' | 'create'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

  // Check backend health and restore persisted campaign on mount
  useEffect(() => {
    const initializeAppState = async () => {
      const health = await checkHealth();
      if (health.status === 'healthy') {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }

      // Restore latest persisted campaign from local JSON storage so data survives page refresh
      try {
        const latest = await fetchLatestCampaign();
        if (latest && latest.data) {
          setCalendarData(latest);
        }
        const all = await fetchAllCampaigns();
        setSavedCount(all.length);
      } catch (storageErr) {
        console.warn('Initial storage load note:', storageErr.message);
      }
    };

    initializeAppState();
  }, []);

  const handleGenerate = async (campaignParams) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await generateCalendarPlan(campaignParams);
      setCalendarData(result);
      setSavedCount(c => c + 1);
      setSuccessMessage(`✓ Campaign "${result.data?.campaignName || result.campaignId}" successfully generated and saved to persistent storage!`);
      setTimeout(() => setSuccessMessage(null), 6000);
      // Automatically switch to the Calendar view so the user immediately sees the generated schedule!
      setActiveTab('calendar');
    } catch (err) {
      console.error('Plan generation failed:', err);
      setError(err.message || 'Failed to generate content calendar. Please check backend logs.');
    } finally {
      setIsLoading(false);
    }
  };

  // Inline caption editing handler (updates state and recalculates validation across all rules)
  const handleUpdateCaption = (dayNumber, platform, newCaption) => {
    if (!calendarData || !calendarData.data || !Array.isArray(calendarData.data.posts)) return;

    let targetPost = null;
    const updatedPosts = calendarData.data.posts.map((p) => {
      if (p.dayNumber === dayNumber && p.platform === platform) {
        targetPost = { ...p, caption: newCaption };
        return targetPost;
      }
      return p;
    });

    if (!targetPost) return;

    // Comprehensive client-side audit re-evaluation
    const updatedAudits = (calendarData.validation?.postAudits || []).map((audit) => {
      if (audit.dayNumber === dayNumber && audit.platform === platform) {
        const charLimit = audit.characterLimit || (platform.toLowerCase().includes('twitter') ? 280 : 3000);
        const charCount = newCaption.length;
        const trimmed = newCaption.trim();

        const updatedChecks = (audit.checks || []).map((c) => {
          // Rule 1: Required Fields
          if (c.name.includes('Required Fields')) {
            const missing = [];
            if (!targetPost.platform) missing.push('Platform');
            if (trimmed.length === 0) missing.push('Caption');
            if (!targetPost.topicIdea) missing.push('Content Idea');
            if (!targetPost.scheduledDate) missing.push('Publishing Date');
            const status = missing.length === 0 ? 'PASSED' : 'FAILED';
            return {
              ...c,
              status,
              passed: status === 'PASSED',
              detail: missing.length === 0 ? 'All required fields present (platform, idea, caption, date)' : `Missing required field(s): ${missing.join(', ')}`
            };
          }

          // Rule 2: Caption & Character Limit
          if (c.name.includes('Character Limit')) {
            let status = 'PASSED';
            let detail = `${charCount} / ${charLimit} chars (Compliant)`;
            if (trimmed.length === 0) {
              status = 'FAILED';
              detail = 'Caption is completely empty. A valid platform caption is required.';
            } else if (charCount > charLimit) {
              status = 'FAILED';
              detail = `${charCount} / ${charLimit} chars (EXCEEDS LIMIT by ${charCount - charLimit} chars)`;
            } else if (charCount < (platform.toLowerCase().includes('twitter') ? 15 : 30)) {
              status = 'WARNING';
              detail = `${charCount} chars (Too brief for ${platform}; recommend more detail)`;
            }
            return { ...c, status, passed: status === 'PASSED', detail };
          }

          // Rule 3: Call-To-Action (CTA)
          if (c.name.includes('Call To Action')) {
            const ctaTriggers = ['link in bio', 'click', 'sign up', 'register', 'comment', 'share', 'reply', 'tell us', 'drop', 'save this', '?'];
            const hasCTA = Boolean((targetPost.callToAction && targetPost.callToAction.trim().length > 3) || ctaTriggers.some(t => trimmed.toLowerCase().includes(t)));
            const status = hasCTA ? 'PASSED' : 'WARNING';
            return {
              ...c,
              status,
              passed: status === 'PASSED',
              detail: hasCTA ? `CTA Defined: "${targetPost.callToAction || 'Found in caption'}"` : 'Missing or weak Call-to-Action. Every post should prompt the audience to engage, click, or save.'
            };
          }

          return c;
        });

        const failedCount = updatedChecks.filter(c => c.status === 'FAILED').length;
        const warningCount = updatedChecks.filter(c => c.status === 'WARNING').length;
        const passedCount = updatedChecks.filter(c => c.status === 'PASSED').length;

        let overallStatus = 'PASSED';
        if (failedCount > 0) overallStatus = 'FAILED';
        else if (warningCount > 0) overallStatus = 'WARNING';

        return {
          ...audit,
          characterCount: charCount,
          overallStatus,
          isCompliant: overallStatus !== 'FAILED',
          passedChecksCount: passedCount,
          warningChecksCount: warningCount,
          failedChecksCount: failedCount,
          totalChecksCount: updatedChecks.length,
          checks: updatedChecks
        };
      }
      return audit;
    });

    // Recalculate global scorecard metrics
    const durationBonus = calendarData.validation?.durationCheckPassed ? 1 : 0;
    const allPassedChecks = updatedAudits.reduce((acc, a) => acc + (a.passedChecksCount || 0), 0) + durationBonus;
    const allWarningChecks = updatedAudits.reduce((acc, a) => acc + (a.warningChecksCount || 0), 0);
    const allFailedChecks = updatedAudits.reduce((acc, a) => acc + (a.failedChecksCount || 0), 0);
    const totalChecks = allPassedChecks + allWarningChecks + allFailedChecks;
    const qualityScore = totalChecks > 0 ? Math.round(((allPassedChecks + (allWarningChecks * 0.5)) / totalChecks) * 100) : 0;

    let overallPlanStatus = 'PASSED_HIGH_QUALITY';
    if (allFailedChecks > 0) overallPlanStatus = 'NEEDS_REVIEW';
    else if (allWarningChecks > 0) overallPlanStatus = qualityScore >= 80 ? 'PASSED_HIGH_QUALITY' : 'WARNINGS_DETECTED';

    const passedPostsCount = updatedAudits.filter(a => a.overallStatus === 'PASSED').length;
    const warningPostsCount = updatedAudits.filter(a => a.overallStatus === 'WARNING').length;
    const failedPostsCount = updatedAudits.filter(a => a.overallStatus === 'FAILED').length;

    const updatedValidation = {
      ...calendarData.validation,
      totalChecks,
      passedChecks: allPassedChecks,
      warningChecks: allWarningChecks,
      failedChecks: allFailedChecks,
      qualityScore,
      status: overallPlanStatus,
      summary: {
        passedPostsCount,
        warningPostsCount,
        failedPostsCount
      },
      postAudits: updatedAudits
    };

    setCalendarData({
      ...calendarData,
      data: {
        ...calendarData.data,
        posts: updatedPosts
      },
      validation: updatedValidation
    });

    // Auto-save edited captions to persistent backend storage
    if (calendarData.campaignId || calendarData.id) {
      const activeId = calendarData.campaignId || calendarData.id;
      updateSavedCampaign(activeId, {
        posts: updatedPosts,
        validation: updatedValidation
      }).catch(persistErr => console.warn('Persistent update error:', persistErr.message));
    }
  };

  const totalPosts = calendarData?.data?.posts?.length || 0;
  const validatedPosts = calendarData?.validation?.postAudits?.filter(a => a.isCompliant)?.length || 0;
  const activePlatforms = calendarData?.data?.posts ? Array.from(new Set(calendarData.data.posts.map(p => p.platform))) : [];

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-section">
            <div className="brand-icon">📅</div>
            <div>
              <h1 className="brand-title">AI Content Calendar Planner</h1>
              <div className="brand-subtitle">Professional Productivity • Social Media Scheduler</div>
            </div>
          </div>

          {/* Primary Navigation Tabs */}
          <nav className="nav-tabs" aria-label="Main Navigation">
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              <span>🗓️ Content Calendar</span>
              {totalPosts > 0 && <span className="nav-badge">{totalPosts}</span>}
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span>📊 Dashboard Overview</span>
            </button>
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              <span>✨ Create Campaign</span>
            </button>
          </nav>

          {/* System Status Badges */}
          <div className="header-badges">
            <span className={`status-pill ${backendStatus === 'online' ? 'online' : 'offline'}`}>
              <span style={{ fontSize: '0.65rem' }}>●</span>
              Backend: {backendStatus === 'online' ? 'Connected' : 'Offline'}
            </span>

            <span className="status-pill online" title="Data is saved locally and survives restarts">
              💾 Storage: {savedCount > 0 ? `${savedCount} Saved` : 'Persistent'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main">
        {successMessage && (
          <div className="success-banner" role="status">
            <span style={{ fontSize: '1.2rem' }}>🎉</span>
            <div>{successMessage}</div>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <strong>Action Error:</strong> {error}
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Tip: Verify that `server/.env` contains a valid `GROQ_API_KEY` and the backend is running.
              </div>
            </div>
          </div>
        )}

        {isLoading && <LoadingState />}

        {!isLoading && (
          <>
            {/* TAB 1: CONTENT CALENDAR (CENTRAL FEATURE) */}
            {activeTab === 'calendar' && (
              <CalendarView
                plan={calendarData?.data}
                validation={calendarData?.validation}
                onSaveCaption={handleUpdateCaption}
                onNavigateToCreate={() => setActiveTab('create')}
              />
            )}

            {/* TAB 2: DASHBOARD OVERVIEW */}
            {activeTab === 'overview' && (
              <div>
                <div className="overview-kpis">
                  <div className="stat-box">
                    <div className="stat-label">Scheduled Posts</div>
                    <div className="stat-value">{totalPosts}</div>
                    <div className="stat-hint">Across all active campaigns</div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-label">Validated & Compliant</div>
                    <div className="stat-value" style={{ color: 'var(--success)' }}>
                      {validatedPosts} / {totalPosts}
                    </div>
                    <div className="stat-hint">Passing platform constraint tests</div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-label">Target Platforms</div>
                    <div className="stat-value">{activePlatforms.length}</div>
                    <div className="stat-hint">{activePlatforms.join(', ') || 'None active'}</div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-label">Persistent Storage</div>
                    <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--success)' }}>
                      ✓ Saved to Disk
                    </div>
                    <div className="stat-hint">Survives page refresh & restarts</div>
                  </div>
                </div>

                {calendarData ? (
                  <ValidationCard
                    validation={calendarData.validation}
                    campaignId={calendarData.campaignId}
                  />
                ) : (
                  <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                    <h4 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>No Campaign Data Available</h4>
                    <p style={{ fontSize: '0.875rem' }}>Create your first social media campaign to view detailed validation scorecards and metrics.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ width: 'auto', padding: '0.6rem 1.25rem' }}
                        onClick={() => setActiveTab('create')}
                      >
                        ✨ Create Campaign
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CAMPAIGN CREATOR */}
            {activeTab === 'create' && (
              <CampaignForm onSubmit={handleGenerate} isLoading={isLoading} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          AI Content Calendar Planner • Built with <strong>React (Vite)</strong>, <strong>Node.js (Express)</strong>, <strong>Groq Cloud AI (Qwen)</strong>, and <strong>Local Persistent Storage</strong>.
        </p>
      </footer>
    </div>
  );
}
