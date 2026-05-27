import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import './AssignmentProgressWidget.css';

const RING_RADIUS = 43;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function AssignmentProgressWidget({ assignments }) {
  const { t } = useLanguage();
  const [manilaNow, setManilaNow] = useState(() => new Date());

  useEffect(() => {
    const clockInterval = window.setInterval(() => setManilaNow(new Date()), 1000);
    return () => window.clearInterval(clockInterval);
  }, []);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('fil-PH', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('fil-PH', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h12',
        timeZoneName: 'short',
      }),
    []
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

  return (
    <section
      className={`assignment-progress-widget progress-${progressTone}`}
      aria-label={t('progress.title')}
    >
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
        <time className="progress-date" dateTime={manilaNow.toISOString()}>
          {dateFormatter.format(manilaNow)}
        </time>
        <time className="progress-time" dateTime={manilaNow.toISOString()}>
          {timeFormatter.format(manilaNow)}
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
