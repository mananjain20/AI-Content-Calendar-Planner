import React, { useState } from 'react';

/**
 * Returns colour class for quality score badge based on score value.
 */
const getScoreClass = (score) => {
  if (score >= 80) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
};

/**
 * Renders the per-post audit row with 3-tier status (Passed, Warning, Failed).
 */
function PostAuditRow({ audit }) {
  const [expanded, setExpanded] = useState(false);
  const status = audit.overallStatus || (audit.isCompliant ? 'PASSED' : 'FAILED');

  // Styling based on 3-tier post status
  const theme = {
    PASSED: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', badgeBg: '#dcfce7', icon: '✓', label: 'PASSED' },
    WARNING: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', badgeBg: '#fef3c7', icon: '⚠️', label: 'WARNING' },
    FAILED: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', badgeBg: '#fee2e2', icon: '❌', label: 'FAILED' }
  }[status] || { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', badgeBg: '#f1f5f9', icon: '•', label: 'UNKNOWN' };

  return (
    <div style={{
      border: `1px solid ${theme.border}`,
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      marginBottom: '0.5rem'
    }}>
      {/* Row header — click to expand */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 0.95rem',
          background: theme.bg,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '0.5rem'
        }}
        aria-expanded={expanded}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: theme.badgeBg,
            color: theme.text,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <span>{theme.icon}</span>
            <span>{theme.label}</span>
          </span>

          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Day {audit.dayNumber} — {audit.platform}
          </span>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ({audit.passedChecksCount || 0} passed, {audit.warningChecksCount || 0} warnings, {audit.failedChecksCount || 0} failed)
          </span>

          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {audit.characterCount} / {audit.characterLimit} chars
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expandable checks detail */}
      {expanded && (
        <div style={{ padding: '0.75rem 0.95rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {(audit.checks || []).map((c, idx) => {
            const checkStatus = c.status || (c.passed ? 'PASSED' : 'FAILED');
            const checkTheme = {
              PASSED: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: '✓' },
              WARNING: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' },
              FAILED: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '❌' }
            }[checkStatus] || { bg: '#f8fafc', border: '#e2e8f0', color: '#475569', icon: '•' };

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  fontSize: '0.8rem',
                  padding: '0.45rem 0.7rem',
                  borderRadius: 'var(--radius-sm)',
                  background: checkTheme.bg,
                  border: `1px solid ${checkTheme.border}`,
                  color: checkTheme.color
                }}
              >
                <span style={{ fontWeight: 700, minWidth: '1.25rem', fontSize: '0.9rem' }}>{checkTheme.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700 }}>{c.name}: </span>
                  <span style={{ lineHeight: 1.4 }}>{c.detail}</span>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '3px',
                  background: 'rgba(255,255,255,0.7)'
                }}>
                  {checkStatus}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ValidationCard({
  validation,
  campaignId
}) {
  if (!validation) return null;

  const {
    qualityScore = 0,
    totalPosts = 0,
    totalChecks = 0,
    passedChecks = 0,
    warningChecks = 0,
    failedChecks = 0,
    status = 'NEEDS_REVIEW',
    summary = {},
    postAudits = []
  } = validation;

  const scoreClass = getScoreClass(qualityScore);

  const passedPosts = summary.passedPostsCount ?? postAudits.filter(a => a.overallStatus === 'PASSED').length;
  const warningPosts = summary.warningPostsCount ?? postAudits.filter(a => a.overallStatus === 'WARNING').length;
  const failedPosts = summary.failedPostsCount ?? postAudits.filter(a => a.overallStatus === 'FAILED').length;

  return (
    <div className="validation-card">
      <div className="validation-header">
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Content Validation & Quality Engine (Phase 4)
          </span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
            Campaign ID: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{campaignId}</span>
          </h3>
        </div>

        <div className={`quality-badge ${scoreClass}`}>
          <span>🛡️</span>
          <span>Quality Score: {qualityScore}% ({status.replace(/_/g, ' ')})</span>
        </div>
      </div>

      {/* 5-Metric Validation Summary Grid */}
      <div className="validation-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <div className="stat-box">
          <div className="stat-label">Total Posts</div>
          <div className="stat-value">{totalPosts}</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Passed Posts</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            ✓ {passedPosts}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Warnings</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            ⚠️ {warningPosts}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Failed Posts</div>
          <div className="stat-value" style={{ color: failedPosts > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            ❌ {failedPosts}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Rules Evaluated</div>
          <div className="stat-value">{totalChecks}</div>
        </div>
      </div>

      {/* Per-post audit breakdown — expandable rows */}
      {Array.isArray(postAudits) && postAudits.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Per-Post Compliance Breakdown ({postAudits.length} posts evaluated)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Click any row to view individual rule results
            </span>
          </div>

          {postAudits.map((audit, idx) => (
            <PostAuditRow key={`${audit.dayNumber}-${audit.platform}-${idx}`} audit={audit} />
          ))}
        </div>
      )}
    </div>
  );
}
