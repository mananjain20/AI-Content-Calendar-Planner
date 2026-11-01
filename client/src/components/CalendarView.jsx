import React, { useState } from 'react';
import PostCard from './PostCard';
import PostModal from './PostModal';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({
  plan,
  validation,
  onSaveCaption,
  onNavigateToCreate
}) {
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'list'
  const [activePlatformFilter, setActivePlatformFilter] = useState('ALL');
  const [inspectingPost, setInspectingPost] = useState(null);
  const [inspectingAudit, setInspectingAudit] = useState(null);

  // If no plan is generated yet, show an inviting empty state
  if (!plan || !Array.isArray(plan.posts) || plan.posts.length === 0) {
    return (
      <div className="card calendar-empty-state">
        <div className="empty-icon">🗓️</div>
        <h3 className="empty-title">Your Content Calendar is Empty</h3>
        <p className="empty-desc">
          No social media posts have been planned yet. Launch your first campaign blueprint to
          automatically generate, validate, and schedule posts across Twitter/X, LinkedIn, and Instagram.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '0.75rem 1.75rem' }}
            onClick={onNavigateToCreate}
          >
            ✨ Create Your First Campaign
          </button>
        </div>
      </div>
    );
  }

  const posts = plan.posts;
  const postAudits = validation?.postAudits || [];

  // Available platforms in the generated plan
  const platformsInPlan = Array.from(new Set(posts.map(p => p.platform)));

  // Filter posts based on active platform filter
  const filteredPosts = activePlatformFilter === 'ALL'
    ? posts
    : posts.filter(p => p.platform.toLowerCase() === activePlatformFilter.toLowerCase());

  const handleInspect = (post, audit) => {
    setInspectingPost(post);
    setInspectingAudit(audit);
  };

  const handleCloseModal = () => {
    setInspectingPost(null);
    setInspectingAudit(null);
  };

  const handleSaveAndClose = (dayNumber, platform, newCaption) => {
    if (onSaveCaption) {
      onSaveCaption(dayNumber, platform, newCaption);
    }
    // Update local modal state so changes are reflected immediately
    if (inspectingPost && inspectingPost.dayNumber === dayNumber) {
      setInspectingPost({ ...inspectingPost, caption: newCaption });
    }
  };

  // Helper to map posts by scheduled date string (or day number fallback)
  const postsByDate = {};
  filteredPosts.forEach((post) => {
    const key = post.scheduledDate || `Day-${post.dayNumber}`;
    if (!postsByDate[key]) postsByDate[key] = [];
    postsByDate[key].push(post);
  });

  // Calculate unique scheduled dates in sorted order
  const scheduledDates = Array.from(new Set(posts.map(p => p.scheduledDate || `Day ${p.dayNumber}`))).sort();

  return (
    <div>
      {/* Campaign Strategy Card */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#f8fafc', borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Social Campaign
            </span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
              🗓️ {plan.campaignName || 'Content Calendar Plan'}
            </h3>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={onNavigateToCreate}
          >
            + New Campaign
          </button>
        </div>

        {plan.campaignStrategy && (
          <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.5, marginTop: '0.75rem' }}>
            <strong>Strategic Focus:</strong> {plan.campaignStrategy}
          </p>
        )}
        {plan.targetAudienceSummary && (
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            <strong>Target Persona:</strong> {plan.targetAudienceSummary}
          </p>
        )}
      </div>

      {/* Calendar Toolbar */}
      <div className="calendar-toolbar">
        {/* Platform Filters */}
        <div className="filter-pills">
          <button
            type="button"
            className={`filter-pill ${activePlatformFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActivePlatformFilter('ALL')}
          >
            All Platforms ({posts.length})
          </button>
          {platformsInPlan.map((plat) => {
            const count = posts.filter(p => p.platform === plat).length;
            return (
              <button
                key={plat}
                type="button"
                className={`filter-pill ${activePlatformFilter.toLowerCase() === plat.toLowerCase() ? 'active' : ''}`}
                onClick={() => setActivePlatformFilter(plat)}
              >
                {plat} ({count})
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle */}
        <div className="view-toggle">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            📅 Monthly Grid
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            📆 Weekly View
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            ☰ List View
          </button>
        </div>
      </div>

      {/* VIEW 1: MONTHLY CALENDAR GRID */}
      {viewMode === 'month' && (
        <div className="card" style={{ padding: '1rem' }}>
          <div className="month-grid-header">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="month-day-name">{d}</div>
            ))}
          </div>

          <div className="month-grid-body">
            {scheduledDates.map((dateStr, idx) => {
              const dayPosts = postsByDate[dateStr] || [];
              const dateObj = new Date(dateStr);
              const isValidDate = !isNaN(dateObj.getTime());
              const dayNum = isValidDate ? dateObj.getDate() : idx + 1;
              const monthName = isValidDate ? dateObj.toLocaleString('default', { month: 'short' }) : 'Day';

              return (
                <div key={dateStr} className={`month-cell ${dayPosts.length > 0 ? 'has-posts' : ''}`}>
                  <div className="month-cell-header">
                    <span className="month-cell-date">{monthName} {dayNum}</span>
                    {dayPosts.length > 0 && (
                      <span className="month-cell-count">{dayPosts.length} post{dayPosts.length > 1 ? 's' : ''}</span>
                    )}
                  </div>

                  <div className="month-cell-content">
                    {dayPosts.map((post, pIdx) => {
                      const originalIndex = posts.indexOf(post);
                      const audit = postAudits[originalIndex];
                      const platClass = post.platform.toLowerCase().includes('twitter')
                        ? 'twitter'
                        : post.platform.toLowerCase().includes('link')
                        ? 'linkedin'
                        : 'instagram';

                      return (
                        <div
                          key={`${post.dayNumber}-${pIdx}`}
                          className={`month-post-pill ${platClass}`}
                          onClick={() => handleInspect(post, audit)}
                          title={`${post.platform}: ${post.topicIdea}`}
                        >
                          <span className="pill-platform-dot"></span>
                          <span className="pill-title">{post.platform}: {post.topicIdea || post.caption.slice(0, 30)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: WEEKLY SCHEDULE VIEW */}
      {viewMode === 'week' && (
        <div className="weekly-container">
          {scheduledDates.map((dateStr, idx) => {
            const dayPosts = postsByDate[dateStr] || [];
            const dateObj = new Date(dateStr);
            const isValidDate = !isNaN(dateObj.getTime());
            const dayOfWeek = isValidDate ? DAYS_OF_WEEK[dateObj.getDay()] : `Day ${idx + 1}`;
            const formattedDate = isValidDate ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : dateStr;

            return (
              <div key={dateStr} className="week-day-column">
                <div className="week-column-header">
                  <span className="week-day-title">{dayOfWeek}</span>
                  <span className="week-date-subtitle">{formattedDate}</span>
                </div>

                <div className="week-column-posts">
                  {dayPosts.length === 0 ? (
                    <div className="week-empty-slot">No posts scheduled</div>
                  ) : (
                    dayPosts.map((post, pIdx) => {
                      const originalIndex = posts.indexOf(post);
                      const audit = postAudits[originalIndex];
                      const platClass = post.platform.toLowerCase().includes('twitter')
                        ? 'twitter'
                        : post.platform.toLowerCase().includes('link')
                        ? 'linkedin'
                        : 'instagram';

                      return (
                        <div
                          key={`${post.dayNumber}-${pIdx}`}
                          className={`week-post-card ${platClass}`}
                          onClick={() => handleInspect(post, audit)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <span className={`platform-badge ${platClass}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                              {post.platform}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: audit?.isCompliant ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                              {audit?.isCompliant ? '✓ OK' : '⚠️'}
                            </span>
                          </div>

                          <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                            {post.topicIdea || 'Untitled Post'}
                          </h5>

                          <p style={{ fontSize: '0.775rem', color: '#475569', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {post.caption}
                          </p>

                          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              {post.caption ? post.caption.length : 0} chars
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>
                              Edit ✏️
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: DETAILED LIST VIEW */}
      {viewMode === 'list' && (
        <div className="calendar-grid">
          {filteredPosts.map((post, index) => {
            const originalIndex = posts.indexOf(post);
            const audit = postAudits[originalIndex] || null;

            return (
              <PostCard
                key={`${post.dayNumber}-${post.platform}-${index}`}
                post={post}
                audit={audit}
                onInspect={handleInspect}
              />
            );
          })}
        </div>
      )}

      {/* Detail & Edit Modal */}
      {inspectingPost && (
        <PostModal
          post={inspectingPost}
          audit={inspectingAudit}
          onClose={handleCloseModal}
          onSaveCaption={handleSaveAndClose}
        />
      )}
    </div>
  );
}
