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
        <table>
          <thead>
            <tr>
              <th>{t('assignments.course')}</th>
              <th>{t('assignments.assignment')}</th>
              <th>{t('assignments.subject')}</th>
              <th>{t('assignments.dueDate')}</th>
              <th>{t('assignments.priority')}</th>
              <th>{t('assignments.status')}</th>
              <th>{t('assignments.action')}</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td data-label={t('assignments.course')}>{assignment.course}</td>
                <td data-label={t('assignments.assignment')}>{assignment.assignment_title}</td>
                <td data-label={t('assignments.subject')}>{assignment.subject || '-'}</td>
                <td data-label={t('assignments.dueDate')}>{formatDate(assignment.due_date)}</td>
                <td data-label={t('assignments.priority')}>
                  <span className={`badge ${getPriorityBadgeClass(assignment.priority)}`}>
                    {getPriorityDisplayText(assignment.priority)}
                  </span>
                </td>
                <td data-label={t('assignments.status')}>
                  <div className="assignment-status-control">
                    <label className="completion-toggle">
                      <input
                        type="checkbox"
                        checked={assignment.submission_status === 'submitted'}
                        disabled={updatingAssignmentIds.includes(assignment.id)}
                        onChange={() => onToggleComplete(assignment)}
                        aria-label={t('assignments.toggleComplete', {
                          title: assignment.assignment_title,
                        })}
                      />
                      <span className="completion-checkmark"></span>
                    </label>
                    <span className={`badge ${getStatusBadgeClass(assignment.submission_status)}`}>
                      {getStatusDisplayText(assignment.submission_status)}
                    </span>
                  </div>
                </td>
                <td>
                  <button
                    onClick={() => onDelete(assignment.id)}
                    className="btn-delete"
                    title={t('assignments.deleteTitle')}
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AssignmentTable;
