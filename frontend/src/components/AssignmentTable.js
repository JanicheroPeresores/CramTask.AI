import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import './TaskTable.css';

function AssignmentTable({ assignments, onDelete, onToggleComplete, updatingAssignmentIds = [] }) {
  const { language, t } = useLanguage();
  const locale = language === 'tl' ? 'fil-PH' : 'en-US';

  const formatDate = (dateString) => {
    if (!dateString) return t('common.noDueDate');
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMonth = (date) =>
    date.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });

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

  const buildMonthDays = (monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    const monthIndex = month - 1;
    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let index = 0; index < firstDay.getDay(); index += 1) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, monthIndex, day));
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'submitted':
        return 'status-submitted';
      case 'not_submitted':
      default:
        return 'status-pending';
    }
  };

  const getStatusDisplayText = (status) => {
    switch (status) {
      case 'not_submitted':
        return t('common.notSubmitted');
      case 'submitted':
        return t('common.submitted');
      default:
        return status;
    }
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

  const renderAssignmentItem = (assignment, compact = false) => {
    const statusText = getStatusDisplayText(assignment.submission_status);
    const statusClass = getStatusBadgeClass(assignment.submission_status);
    const priorityText = getPriorityDisplayText(assignment.priority);
    const priorityClass = getPriorityBadgeClass(assignment.priority);
    const isSubmitted = assignment.submission_status === 'submitted';

    return (
      <article
        key={assignment.id}
        className={`calendar-assignment ${isSubmitted ? 'is-submitted' : ''}${compact ? ' is-compact' : ''}`}
      >
        <div className="calendar-assignment-main">
          <h3 className="assignment-card-title">{assignment.assignment_title}</h3>
          <p className="assignment-card-course">{assignment.course}</p>
          {!compact && (
            <div className="assignment-card-meta">
              <span className="meta-label">{t('assignments.dueDate')}</span>
              <span>{formatDate(assignment.due_date)}</span>
            </div>
          )}
          <div className="assignment-status-bar">
            <div className={`status-indicator ${statusClass}`}>
              <span className="status-label">{statusText}</span>
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
            title={isSubmitted ? t('common.notSubmitted') : t('common.submitted')}
          >
            {isSubmitted ? 'Undo' : 'Done'}
          </button>
          <button
            type="button"
            className="btn-delete"
            onClick={() => onDelete(assignment.id)}
            title={t('assignments.deleteTitle')}
          >
            Delete
          </button>
        </div>
      </article>
    );
  };

  const datedAssignments = assignments
    .filter((assignment) => getDateKey(assignment.due_date) !== 'no-date')
    .slice()
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const noDateAssignments = assignments.filter((assignment) => getDateKey(assignment.due_date) === 'no-date');
  const assignmentsByDate = datedAssignments.reduce((groups, assignment) => {
    const dateKey = getDateKey(assignment.due_date);
    return {
      ...groups,
      [dateKey]: [...(groups[dateKey] || []), assignment],
    };
  }, {});
  const monthKeys = [...new Set(datedAssignments.map((assignment) => getMonthKey(assignment.due_date)))];
  const todayKey = getDateKey(new Date());
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Date(2026, 5, 14 + index).toLocaleDateString(locale, { weekday: 'short' })
  );

  return (
    <div className="table-wrapper">
      {assignments.length === 0 ? (
        <div className="empty-state">
          <p>{t('assignments.empty')}</p>
        </div>
      ) : (
        <div className="assignment-calendar-board">
          {monthKeys.map((monthKey) => {
            const days = buildMonthDays(monthKey);
            const [year, month] = monthKey.split('-').map(Number);

            return (
              <section className="assignment-month" key={monthKey}>
                <div className="assignment-month-head">
                  <h3>{formatMonth(new Date(year, month - 1, 1))}</h3>
                  <span>{datedAssignments.filter((assignment) => getMonthKey(assignment.due_date) === monthKey).length}</span>
                </div>
                <div className="calendar-weekdays" aria-hidden>
                  {weekdayLabels.map((weekday) => (
                    <span key={weekday}>{weekday}</span>
                  ))}
                </div>
                <div className="calendar-grid">
                  {days.map((day, index) => {
                    const dateKey = day ? getDateKey(day) : `empty-${monthKey}-${index}`;
                    const dayAssignments = day ? assignmentsByDate[dateKey] || [] : [];

                    return (
                      <div
                        className={`calendar-day${day ? '' : ' is-empty'}${dateKey === todayKey ? ' is-today' : ''}${dayAssignments.length ? ' has-assignments' : ''}`}
                        key={dateKey}
                      >
                        {day && (
                          <>
                            <div className="calendar-day-number">{day.getDate()}</div>
                            <div className="calendar-day-list">
                              {dayAssignments.map((assignment) => renderAssignmentItem(assignment, true))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

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
        </div>
      )}
    </div>
  );
}

export default AssignmentTable;
