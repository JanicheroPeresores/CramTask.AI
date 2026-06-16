import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import './AssignmentProgressWidget.css';

const RING_RADIUS = 43;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const POSITION_STORAGE_KEY = 'assignment-progress-position';
const COLLAPSE_STORAGE_KEY = 'assignment-progress-collapsed';

const getDefaultPosition = () => {
  if (typeof window === 'undefined') return { x: 24, y: 110 };
  return {
    x: Math.max(12, window.innerWidth - 390),
    y: 110,
  };
};

const clampPosition = (position) => {
  if (typeof window === 'undefined') return position;
  const maxX = Math.max(12, window.innerWidth - 340);
  const maxY = Math.max(12, window.innerHeight - 260);

  return {
    x: Math.min(Math.max(12, position.x), maxX),
    y: Math.min(Math.max(12, position.y), maxY),
  };
};

const readStoredPosition = () => {
  if (typeof window === 'undefined') return getDefaultPosition();

  try {
    const savedPosition = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY));
    if (Number.isFinite(savedPosition?.x) && Number.isFinite(savedPosition?.y)) {
      return clampPosition(savedPosition);
    }
  } catch (err) {
    localStorage.removeItem(POSITION_STORAGE_KEY);
  }

  return getDefaultPosition();
};

const readStoredCollapsed = () => {
  if (typeof window === 'undefined') return false;

  return localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true';
};

function AssignmentProgressWidget({ assignments }) {
  const { language, t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [position, setPosition] = useState(readStoredPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readStoredCollapsed);

  useEffect(() => {
    const clockInterval = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  useEffect(() => {
    const handleResize = () => setPosition((current) => clampPosition(current));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const total = assignments.length;
  const completed = assignments.filter(
    (assignment) => assignment.submission_status === 'submitted'
  ).length;
  const remaining = total - completed;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  const progressOffset = RING_CIRCUMFERENCE * (1 - percentage / 100);
  const progressTone = percentage >= 80 ? 'high' : percentage >= 40 ? 'medium' : 'low';
  const statusKey =
    percentage === 100 && total > 0
      ? 'allCompleted'
      : percentage >= 70
      ? 'almostDone'
      : 'keepGoing';

  const handlePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = position;

    setIsDragging(true);

    const handlePointerMove = (moveEvent) => {
      setPosition(
        clampPosition({
          x: startPosition.x + moveEvent.clientX - startX,
          y: startPosition.y + moveEvent.clientY - startY,
        })
      );
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  return (
    <section
      className={`assignment-progress-widget progress-${progressTone}${isDragging ? ' is-dragging' : ''}${isCollapsed ? ' is-collapsed' : ''}`}
      aria-label={t('progress.title')}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={handlePointerDown}
    >
      <button
        type="button"
        className="progress-toggle-button"
        aria-label={t(isCollapsed ? 'progress.restore' : 'progress.minimize')}
        title={t(isCollapsed ? 'progress.restore' : 'progress.minimize')}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setIsCollapsed((current) => !current);
        }}
      >
        {isCollapsed ? '+' : '−'}
      </button>

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
          <strong>{completed}/{total}</strong> {t('progress.tasksCompleted')}
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
        <p className="progress-motivation">{t(`progress.${statusKey}`)}</p>
      </div>
    </section>
  );
}

export default AssignmentProgressWidget;
