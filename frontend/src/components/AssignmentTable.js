import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import './TaskTable.css';

const getDateKey = (dateInput) => {
  if (!dateInput) return 'no-date';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'no-date';
  return date.toISOString().slice(0, 10);
};

const getMonthKey = (dateString) => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

function AssignmentTable({ assignments, onDelete, onToggleComplete, updatingAssignmentIds = [] }) {
  const { language, t } = useLanguage();
  const locale = language === 'tl' ? 'fil-PH' : 'en-US';
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return t('common.noDueDate');
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDay = (dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    return date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'low':
        return 'priority-low';
      case 'medium':
      default:
        return 'priority-medium';
    }
  };

  const getPriorityDisplayText = (priority) => {
    switch (priority) {
      case 'high':
        return t('common.high');
      case 'low':
        return t('common.low');
      case 'medium':
      default:
        return t('common.medium');
    }
  };

  const getAssignmentStatus = useCallback((assignment) =>
    String(assignment.submission_status || assignment.state || assignment.status || '')
      .trim()
      .toUpperCase(),
    []
  );

  const isAssignmentCompleted = useCallback(
    (assignment) => {
      const status = getAssignmentStatus(assignment);
      return [
        'SUBMITTED',
        'TURNED_IN',
        'RETURNED',
        'COMPLETED',
      ].includes(status);
    },
    [getAssignmentStatus]
  );

  const activeAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => !isAssignmentCompleted(assignment))
        .slice()
        .sort((a, b) => new Date(a.due_date || '9999-12-31') - new Date(b.due_date || '9999-12-31')),
    [assignments, isAssignmentCompleted]
  );
  const datedAssignments = useMemo(
    () => activeAssignments.filter((assignment) => getDateKey(assignment.due_date) !== 'no-date'),
    [activeAssignments]
  );
  const noDateAssignments = useMemo(
    () => activeAssignments.filter((assignment) => getDateKey(assignment.due_date) === 'no-date'),
    [activeAssignments]
  );
  const monthKeys = useMemo(
    () => [...new Set(datedAssignments.map((assignment) => getMonthKey(assignment.due_date)))],
    [datedAssignments]
  );
  const selectedMonthAssignments = useMemo(
    () =>
      selectedMonth
        ? datedAssignments.filter((assignment) => getMonthKey(assignment.due_date) === selectedMonth)
        : [],
    [datedAssignments, selectedMonth]
  );
  const dayKeys = useMemo(
    () => [...new Set(selectedMonthAssignments.map((assignment) => getDateKey(assignment.due_date)))],
    [selectedMonthAssignments]
  );
  const selectedDayAssignments = useMemo(
    () =>
      selectedDay
        ? selectedMonthAssignments.filter((assignment) => getDateKey(assignment.due_date) === selectedDay)
        : [],
    [selectedDay, selectedMonthAssignments]
  );

  const completedAssignments = useMemo(
    () => assignments.filter(isAssignmentCompleted),
    [assignments]
  );

  useEffect(() => {
    if (!monthKeys.length) {
      setSelectedMonth('');
      return;
    }

    if (!selectedMonth || !monthKeys.includes(selectedMonth)) {
      setSelectedMonth(monthKeys[0]);
    }
  }, [monthKeys, selectedMonth]);

  useEffect(() => {
    if (!dayKeys.length) {
      setSelectedDay('');
      return;
    }

    if (!selectedDay || !dayKeys.includes(selectedDay)) {
      setSelectedDay(dayKeys[0]);
    }
  }, [dayKeys, selectedDay]);

  const renderAssignmentItem = (assignment, completed = false) => {
    const priorityText = getPriorityDisplayText(assignment.priority);
    const priorityClass = getPriorityBadgeClass(assignment.priority);
    const statusClass = completed ? 'status-submitted' : 'status-pending';
    const statusLabel = completed ? t('common.submitted') : t('common.notSubmitted');

    return (
      <article key={assignment.id} className="calendar-assignment">
        <div className="calendar-assignment-main">
          <h3 className="assignment-card-title">{assignment.assignment_title}</h3>
          <p className="assignment-card-course">{assignment.course}</p>
          <div className="assignment-card-meta">
            <span className="meta-label">{t('assignments.dueDate')}</span>
            <span>{formatDate(assignment.due_date)}</span>
          </div>
          <div className="assignment-status-bar">
            <div className={`status-indicator ${statusClass}`}>
              <span className="status-label">{statusLabel}</span>
            </div>
            <div className={`priority-badge ${priorityClass}`}>
              {priorityText}
            </div>
          </div>
        </div>

        <div className="calendar-assignment-actions">
          <button
            type="button"
            className="btn-complete"
            onClick={() => onToggleComplete(assignment)}
            disabled={updatingAssignmentIds.includes(assignment.id)}
            title={completed ? t('progress.restore') : t('common.submitted')}
          >
            {completed ? t('progress.restore') : t('common.done')}
          </button>
          <button
            type="button"
            className="btn-delete"
            onClick={() => onDelete(assignment.id)}
            title={t('assignments.deleteTitle')}
          >
            {t('assignments.deleteTitle')}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="table-wrapper">
      {activeAssignments.length === 0 && completedAssignments.length === 0 ? (
        <div className="empty-state">
          <p>{t('assignments.empty')}</p>
        </div>
      ) : (
        <div className="assignment-calendar-board">
          {monthKeys.length > 0 && (
            <section className="assignment-picker">
              <div className="assignment-picker-controls">
                <label>
                  <span>{t('assignments.month')}</span>
                  <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                    {monthKeys.map((monthKey) => (
                      <option key={monthKey} value={monthKey}>
                        {formatMonth(monthKey)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t('assignments.day')}</span>
                  <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>
                    {dayKeys.map((dayKey) => (
                      <option key={dayKey} value={dayKey}>
                        {formatDay(dayKey)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="assignment-day-strip" aria-label={t('assignments.day')}>
                {dayKeys.map((dayKey) => (
                  <button
                    key={dayKey}
                    type="button"
                    className={dayKey === selectedDay ? 'is-active' : ''}
                    onClick={() => setSelectedDay(dayKey)}
                  >
                    <strong>{new Date(`${dayKey}T00:00:00`).getDate()}</strong>
                    <span>{selectedMonthAssignments.filter((assignment) => getDateKey(assignment.due_date) === dayKey).length}</span>
                  </button>
                ))}
              </div>

              <div className="selected-day-list">
                {selectedDayAssignments.length > 0 ? (
                  selectedDayAssignments.map((assignment) => renderAssignmentItem(assignment))
                ) : (
                  <div className="empty-state empty-state--compact">
                    <p>{t('assignments.emptyDay')}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {noDateAssignments.length > 0 && (
            <section className="assignment-no-date">
              <div className="assignment-month-head">
                <h3>{t('common.noDueDate')}</h3>
                <span>{noDateAssignments.length}</span>
              </div>
              <div className="no-date-list">
                {noDateAssignments.map((assignment) => renderAssignmentItem(assignment))}
              </div>
            </section>
          )}

          {completedAssignments.length > 0 && (
            <section className="assignment-completed-section">
              <div className="assignment-month-head">
                <h3>{t('progress.completed')}</h3>
                <span>{completedAssignments.length}</span>
              </div>
              <div className="no-date-list">
                {completedAssignments.map((assignment) => renderAssignmentItem(assignment, true))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default AssignmentTable;
