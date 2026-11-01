import React, { useState, useEffect } from 'react';

export default function PostModal({ post, audit, onClose, onSaveCaption }) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');

  useEffect(() => {
    if (post) {
      setCaptionDraft(post.caption || '');
      setIsEditing(false);
    }
  }, [post]);

  if (!post) return null;

  const charLimit = audit?.characterLimit || (post.platform?.toLowerCase().includes('twitter') ? 280 : 3000);
  const currentLength = captionDraft.length;
  const isCharValid = currentLength <= charLimit;

  const handleCopy = () => {
    const textToCopy = `${post.caption}\n\n${Array.isArray(post.hashtags) ? post.hashtags.join(' ') : (post.hashtags || '')}`.trim();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onSaveCaption) {
      onSaveCaption(post.dayNumber, post.platform, captionDraft);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setCaptionDraft(post.caption || '');
    setIsEditing(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Day {post.dayNumber} {post.scheduledDate ? `• ${post.scheduledDate}` : ''}
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {post.platform}: {post.topicIdea || 'Untitled Post'}
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span className="modal-section-title" style={{ marginBottom: 0 }}>
              Final Platform Caption
            </span>
            {!isEditing ? (
              <button
                type="button"
                className="btn-edit-toggle"
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit Caption
              </button>
            ) : (
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: isCharValid ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                {currentLength} / {charLimit} chars
              </span>
            )}
          </div>

          {!isEditing ? (
            <div className="modal-caption-box">
              {post.caption || <em style={{ color: 'var(--danger)' }}>(Caption is empty)</em>}
            </div>
          ) : (
            <div>
              <textarea
                className="modal-edit-textarea"
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                rows={6}
                autoFocus
                placeholder="Enter caption text..."
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-save"
                  onClick={handleSaveEdit}
                >
                  ✓ Save Changes
                </button>
              </div>
            </div>
          )}
        </div>

        {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
          <div className="modal-section">
            <div className="modal-section-title">Recommended Hashtags ({post.hashtags.length})</div>
            <div className="hashtags-list">
              {post.hashtags.map((tag, i) => (
                <span key={i} className="hashtag-pill">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {post.callToAction && (
          <div className="modal-section">
            <div className="modal-section-title">Call To Action (CTA)</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', background: '#f8fafc', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              👉 {post.callToAction}
            </div>
          </div>
        )}

        {post.visualConcept && (
          <div className="modal-section">
            <div className="modal-section-title">Creative Asset Direction / Visual Prompt</div>
            <div style={{ fontSize: '0.875rem', color: '#475569', background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              🎨 {post.visualConcept}
            </div>
          </div>
        )}

        {/* Automated Validation Results */}
        {audit?.checks && (
          <div className="modal-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span className="modal-section-title" style={{ marginBottom: 0 }}>
                Automated Validation Checks ({audit.checks.length} rules evaluated)
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.45rem',
                borderRadius: '9999px',
                background: audit.overallStatus === 'FAILED' ? '#fee2e2' : (audit.overallStatus === 'WARNING' ? '#fef3c7' : '#dcfce7'),
                color: audit.overallStatus === 'FAILED' ? '#991b1b' : (audit.overallStatus === 'WARNING' ? '#92400e' : '#166534')
              }}>
                Overall: {audit.overallStatus || (audit.isCompliant ? 'PASSED' : 'FAILED')}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {audit.checks.map((c, idx) => {
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
                      fontSize: '0.78rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${checkTheme.border}`,
                      background: checkTheme.bg,
                      color: checkTheme.color,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ fontWeight: 700, minWidth: '1.2rem' }}>{checkTheme.icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700 }}>{c.name}: </span>
                      <span>{c.detail}</span>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.35rem',
                      borderRadius: '3px',
                      background: 'rgba(255,255,255,0.7)',
                      textTransform: 'uppercase'
                    }}>
                      {checkStatus}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className={`btn-copy ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            disabled={isEditing}
          >
            <span>{copied ? '✓ Copied to Clipboard!' : '📋 Copy Caption & Hashtags'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
