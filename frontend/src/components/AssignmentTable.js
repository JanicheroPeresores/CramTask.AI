import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import './TaskTable.css';

function AssignmentTable({ assignments, onDelete, onToggleComplete, updatingAssignmentIds = [] }) {
  const { language, t } = useLanguage();

  const formatDate = (dateString) => {
    if (!dateString) return t('common.noDueDate');
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'tl' ? 'fil-PH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  return (
    <div className="table-wrapper">
      {assignments.length === 0 ? (
        <div className="empty-state">
          <p>{t('assignments.empty')}</p>
        </div>
      ) : (
        <div className="assignments-board">
          {assignments.map((assignment) => {
            const statusText = getStatusDisplayText(assignment.submission_status);
            const statusClass = getStatusBadgeClass(assignment.submission_status);
            const priorityText = getPriorityDisplayText(assignment.priority);
            const priorityClass = getPriorityBadgeClass(assignment.priority);

            return (
              <article key={assignment.id} className="assignment-card">
                <div className="assignment-card-top">
                  <span className={`assignment-chip ${priorityClass}`}>{priorityText}</span>
                  <span className={`assignment-chip ${statusClass}`}>{statusText}</span>
                </div>

                <h3 className="assignment-card-title">{assignment.assignment_title}</h3>
                <p className="assignment-card-course">{assignment.course}</p>
                {assignment.subject && <p className="assignment-card-subject">{assignment.subject}</p>}

                <div className="assignment-card-meta">
                  <div>
                    <span className="meta-label">{t('assignments.dueDate')}</span>
                    <span>{formatDate(assignment.due_date)}</span>
                  </div>
                  <div>
                    <span className="meta-label">{t('assignments.subject')}</span>
                    <span>{assignment.subject || '-'}</span>
                  </div>
                </div>

                <div className="assignment-card-actions">
                  <button
                    type="button"
                    className="btn-complete"
                    onClick={() => onToggleComplete(assignment)}
                    disabled={updatingAssignmentIds.includes(assignment.id)}
                  >
                    {assignment.submission_status === 'submitted'
                      ? t('common.notSubmitted')
                      : t('common.submitted')}
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
          })}
        </div>
      )}
    </div>
  );
}

export default AssignmentTable;
