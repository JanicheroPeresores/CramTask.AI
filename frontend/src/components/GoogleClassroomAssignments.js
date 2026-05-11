import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './GoogleClassroomAssignments.css';

function GoogleClassroomAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/google-classroom/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(response.data.assignments || []);
      setError('');
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Error loading Google Classroom assignments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diff = due - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return <div className="loading">Loading Google Classroom assignments...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="no-assignments">
        <p>No assignments from Google Classroom yet.</p>
        <p className="hint">Use the "Sync Assignments" button to fetch your assignments.</p>
      </div>
    );
  }

  // Group assignments by course
  const groupedByClass = {};
  assignments.forEach((assignment) => {
    if (!groupedByClass[assignment.course_name]) {
      groupedByClass[assignment.course_name] = [];
    }
    groupedByClass[assignment.course_name].push(assignment);
  });

  return (
    <div className="google-classroom-assignments">
      <h3>Google Classroom Assignments</h3>

      {Object.entries(groupedByClass).map(([courseName, courseAssignments]) => (
        <div key={courseName} className="course-section">
          <h4 className="course-name">{courseName}</h4>

          <div className="assignments-list">
            {courseAssignments.map((assignment) => {
              const daysUntilDue = getDaysUntilDue(assignment.due_date);
              const overdue = isOverdue(assignment.due_date);

              return (
                <div
                  key={assignment.id}
                  className={`assignment-card ${overdue ? 'overdue' : ''}`}
                >
                  <div className="assignment-header">
                    <div className="assignment-title">{assignment.title}</div>
                    {assignment.alternate_link && (
                      <a
                        href={assignment.alternate_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-button"
                        title="View in Google Classroom"
                      >
                        Open
                      </a>
                    )}
                  </div>

                  {assignment.description && (
                    <p className="assignment-description">
                      {assignment.description.substring(0, 100)}
                      {assignment.description.length > 100 ? '...' : ''}
                    </p>
                  )}

                  <div className="assignment-meta">
                    <span className="due-date">
                      📅 {formatDate(assignment.due_date)}
                      {assignment.due_time && <span> at {assignment.due_time}</span>}
                    </span>

                    {daysUntilDue !== null && (
                      <span
                        className={`days-until ${
                          daysUntilDue < 0
                            ? 'overdue'
                            : daysUntilDue < 3
                            ? 'urgent'
                            : 'normal'
                        }`}
                      >
                        {daysUntilDue < 0
                          ? `${Math.abs(daysUntilDue)} days overdue`
                          : daysUntilDue === 0
                          ? 'Due today'
                          : `${daysUntilDue} days left`}
                      </span>
                    )}

                    <span className="state">{assignment.state}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default GoogleClassroomAssignments;
