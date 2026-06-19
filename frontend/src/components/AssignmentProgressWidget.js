import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import './AssignmentProgressWidget.css';

const RING_RADIUS = 43;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const POSITION_STORAGE_KEY = 'assignment-progress-position';
const SIZE_STORAGE_KEY = 'assignment-progress-size';
const COLLAPSE_STORAGE_KEY = 'assignment-progress-collapsed';

const getDefaultPosition = () => {
  if (typeof window === 'undefined') return { x: 24, y: 110 };
  return {
    x: Math.max(12, window.innerWidth - 390),
    y: 110,
  };
};

const readStoredPosition = () => {
  if (typeof window === 'undefined') return getDefaultPosition();

  try {
    const savedPosition = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY));
    if (Number.isFinite(savedPosition?.x) && Number.isFinite(savedPosition?.y)) {
      return savedPosition;
    }
  } catch (err) {
    localStorage.removeItem(POSITION_STORAGE_KEY);
  }

  return getDefaultPosition();
};

const readStoredSize = () => {
  if (typeof window === 'undefined') return { width: 340, height: 172 };

  try {
    const savedSize = JSON.parse(localStorage.getItem(SIZE_STORAGE_KEY));
    if (Number.isFinite(savedSize?.width) && Number.isFinite(savedSize?.height)) {
      return savedSize;
    }
  } catch (err) {
    localStorage.removeItem(SIZE_STORAGE_KEY);
  }

  return { width: 340, height: 172 };
};

const readStoredCollapsed = () => {
  if (typeof window === 'undefined') return false;

  return localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true';
};

function AssignmentProgressWidget({ assignments, onRefresh }) {
  const { language, t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [position, setPosition] = useState(readStoredPosition);
  const [size, setSize] = useState(readStoredSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readStoredCollapsed);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const clockInterval = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size));
  }, [size]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'tl' ? 'fil-PH' : 'en-US', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [language]
  );
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'tl' ? 'fil-PH' : 'en-US', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h12',
        timeZoneName: 'short',
      }),
    [language]
  );

  // Count only active (unsubmitted) assignments — matches exactly what the calendar shows
  const activeAssignments = assignments.filter(
    (assignment) => assignment.submission_status !== 'submitted'
  );
  const total = activeAssignments.length;
  const completed = 0;
  const remaining = total;
  const percentage = total === 0 ? 100 : 0;
  const progressOffset = RING_CIRCUMFERENCE * (1 - percentage / 100);
  const progressTone = percentage >= 80 ? 'high' : percentage >= 40 ? 'medium' : 'low';
  const statusKey =
    total === 0 && assignments.length > 0
      ? 'allCompleted'
      : total === 0
      ? 'keepGoing'
      : 'keepGoing';

  const handlePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = position;

    setIsDragging(true);

    const handlePointerMove = (moveEvent) => {
      setPosition({
        x: startPosition.x + moveEvent.clientX - startX,
        y: startPosition.y + moveEvent.clientY - startY,
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const handleResizePointerDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const startSize = size;

    setIsResizing(true);

    const handlePointerMove = (moveEvent) => {
      setSize({
        width: Math.max(220, startSize.width + moveEvent.clientX - startX),
        height: Math.max(120, startSize.height + moveEvent.clientY - startY),
      });
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const handleRefresh = async (event) => {
    event.stopPropagation();
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section
      className={`assignment-progress-widget progress-${progressTone}${isDragging ? ' is-dragging' : ''}${isResizing ? ' is-resizing' : ''}${isCollapsed ? ' is-collapsed' : ''}`}
      aria-label={t('progress.title')}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        '--progress-widget-width': `${size.width}px`,
        '--progress-widget-height': `${size.height}px`,
      }}
      onPointerDown={handlePointerDown}
    >
      {!isCollapsed && (
        <div className="progress-top-actions">
          <button
            type="button"
            className={`progress-refresh-button${isRefreshing ? ' is-spinning' : ''}`}
            aria-label="Refresh assignments"
            title="Refresh assignments"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button
            type="button"
            className="progress-toggle-button"
            aria-label={t('progress.minimize')}
            title={t('progress.minimize')}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setIsCollapsed((current) => !current);
            }}
          >
            −
          </button>
        </div>
      )}

      {isCollapsed && (
        <button
          type="button"
          className="progress-toggle-button"
          aria-label={t('progress.restore')}
          title={t('progress.restore')}
          style={{ position: 'absolute', top: '10px', right: '10px' }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setIsCollapsed((current) => !current);
          }}
        >
          +
        </button>
      )}

      <div className="progress-ring-panel">
        <svg
          className="progress-ring"
          width="106"
          height="106"
          viewBox="0 0 106 106"
          role="img"
          aria-label={t('progress.percentageLabel', { percentage })}
        >
          <circle className="progress-ring-track" cx="53" cy="53" r={RING_RADIUS} />
          <circle
            className="progress-ring-value"
            cx="53"
            cy="53"
            r={RING_RADIUS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={progressOffset}
          />
        </svg>
        <div className="progress-ring-center">
          <strong>{percentage}%</strong>
          <span>{t('progress.done')}</span>
        </div>
      </div>

      <div className="progress-summary">
        <p className="progress-eyebrow">{t('progress.title')}</p>
        <time className="progress-date" dateTime={currentTime.toISOString()}>
          {dateFormatter.format(currentTime)}
        </time>
        <time className="progress-time" dateTime={currentTime.toISOString()}>
          {timeFormatter.format(currentTime)}
        </time>
        <p className="progress-count">
          <strong>{remaining}</strong> {t('progress.remaining').toLowerCase()} — {completed} {t('progress.completed').toLowerCase()}
        </p>
        <div className="progress-stats" aria-label={t('progress.statsLabel')}>
          <span>
            <strong>{total}</strong>
            {t('progress.total')}
          </span>
          <span>
            <strong>{completed}</strong>
            {t('progress.completed')}
          </span>
          <span>
            <strong>{remaining}</strong>
            {t('progress.remaining')}
          </span>
        </div>
        <p className="progress-motivation">
          {total === 0 && assignments.length > 0
            ? 'All done! 🎉'
            : total === 0
            ? 'No assignments yet.'
            : `${remaining} task${remaining !== 1 ? 's' : ''} remaining`
          }
        </p>
      </div>

      {!isCollapsed && (
        <button
          type="button"
          className="progress-resize-handle"
          aria-label={t('progress.resize')}
          title={t('progress.resize')}
          onPointerDown={handleResizePointerDown}
        />
      )}
    </section>
  );
}

export default AssignmentProgressWidget;
