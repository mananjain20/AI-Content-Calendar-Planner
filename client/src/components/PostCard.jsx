import React from 'react';

const getPlatformClass = (platform) => {
  if (!platform) return 'general';
  const lower = platform.toLowerCase();
  if (lower.includes('twit') || lower.includes('x')) return 'twitter';
  if (lower.includes('link')) return 'linkedin';
  if (lower.includes('insta')) return 'instagram';
  return 'general';
};

export default function PostCard({ post, audit, onInspect }) {
  const platformClass = getPlatformClass(post?.platform);
  const charCount = post?.caption ? post.caption.length : 0;
  const charLimit = audit?.characterLimit || (platformClass === 'twitter' ? 280 : 3000);
  const isCharValid = charCount <= charLimit;

  // Determine 3-tier validation status
  const status = audit?.overallStatus || (audit?.isCompliant !== false && isCharValid ? 'PASSED' : 'FAILED');

  const statusConfig = {
    PASSED: { label: '✓ Passed', className: 'passed', color: '#166534', bg: '#dcfce7' },
    WARNING: { label: '⚠️ Warning', className: 'warning', color: '#92400e', bg: '#fef3c7' },
    FAILED: { label: '❌ Failed', className: 'failed', color: '#991b1b', bg: '#fee2e2' }
  }[status] || { label: '• Pending', className: 'flagged', color: '#475569', bg: '#f1f5f9' };

  // Identify first failed or warning check reason for quick preview
  const primaryIssue = audit?.checks?.find(c => c.status === 'FAILED') ||
                       audit?.checks?.find(c => c.status === 'WARNING');

  return (
    <div className="post-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div className="post-card-header">
          <span className="day-badge">
            Day {post?.dayNumber} {post?.scheduledDate ? `• ${post.scheduledDate}` : ''}
          </span>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span
              className={`compliance-tag ${statusConfig.className}`}
              style={{ background: statusConfig.bg, color: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
            <span className={`platform-badge ${platformClass}`}>
              {post?.platform || 'General'}
            </span>
          </div>
        </div>

        {post?.contentPillar && (
          <span className="pillar-tag">{post.contentPillar}</span>
        )}

        <h4 className="post-topic">{post?.topicIdea || 'Untitled Post'}</h4>

        <p className="post-caption-preview">
          {post?.caption ? post.caption : <em style={{ color: 'var(--danger)' }}>(Empty caption — required field missing)</em>}
        </p>

        {/* Explain why the post received a warning or failed */}
        {primaryIssue && (
          <div style={{
            margin: '0.65rem 0',
            padding: '0.4rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.74rem',
            background: primaryIssue.status === 'FAILED' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${primaryIssue.status === 'FAILED' ? '#fecaca' : '#fde68a'}`,
            color: primaryIssue.status === 'FAILED' ? '#991b1b' : '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <span>{primaryIssue.status === 'FAILED' ? '❌' : '⚠️'}</span>
            <span style={{ fontWeight: 600 }}>{primaryIssue.name}: </span>
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{primaryIssue.detail}</span>
          </div>
        )}
      </div>

      <div className="post-card-footer">
        <div className="char-counter">
          <span className={isCharValid && charCount > 0 ? 'valid' : 'invalid'}>
            {charCount} / {charLimit} chars
          </span>
        </div>

        <button
          type="button"
          className="btn-inspect"
          onClick={() => onInspect(post, audit)}
        >
          Inspect & Edit ✏️
        </button>
      </div>
    </div>
  );
}
