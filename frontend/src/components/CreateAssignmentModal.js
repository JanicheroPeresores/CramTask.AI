import React, { useState } from 'react';
import './CreateTaskModal.css';
import { calculatePriorityWithGemini } from '../utils/geminiPriority';
import { useLanguage } from '../i18n/LanguageContext';

function CreateAssignmentModal({ onClose, onCreate }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    course: '',
    assignmentTitle: '',
    dueDate: '',
    subject: '',
    priority: null,
    submissionStatus: 'not_submitted',
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [calculatedPriority, setCalculatedPriority] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.course.trim() || !formData.assignmentTitle.trim()) {
      setError(t('errors.requiredAssignment'));
      return;
    }

    setLoading(true);

    try {
      const priority = await calculatePriorityWithGemini(formData);
      setCalculatedPriority(priority);

      await onCreate({
        ...formData,
        priority,
      });

      setFormData({
        course: '',
        assignmentTitle: '',
        dueDate: '',
        subject: '',
        priority: null,
        submissionStatus: 'not_submitted',
        description: '',
      });
      setCalculatedPriority(null);
    } catch (err) {
      setError(t('errors.createAssignment'));
    } finally {
      setLoading(false);
    }
  };

  const priorityLabel = (priority) => {
    if (priority === 'high') return t('common.high');
    if (priority === 'low') return t('common.low');
    return t('common.medium');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('assignments.createTitle')}</h2>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="course">{t('assignments.courseLabel')}</label>
              <input
                type="text"
                id="course"
                name="course"
                value={formData.course}
                onChange={handleChange}
                placeholder={t('assignments.coursePlaceholder')}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="assignmentTitle">{t('assignments.titleLabel')}</label>
              <input
                type="text"
                id="assignmentTitle"
                name="assignmentTitle"
                value={formData.assignmentTitle}
                onChange={handleChange}
                placeholder={t('assignments.titlePlaceholder')}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="subject">{t('assignments.subjectLabel')}</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder={t('assignments.subjectPlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dueDate">{t('assignments.dueDate')}</label>
              <input
                type="datetime-local"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>

            {calculatedPriority && (
              <div className="form-group">
                <label>{t('assignments.autoPriority')}</label>
                <div className={`priority-preview priority-preview-${calculatedPriority}`}>
                  {priorityLabel(calculatedPriority)}
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="submissionStatus">{t('assignments.status')}</label>
              <select
                id="submissionStatus"
                name="submissionStatus"
                value={formData.submissionStatus}
                onChange={handleChange}
              >
                <option value="not_submitted">{t('common.notSubmitted')}</option>
                <option value="submitted">{t('common.submitted')}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">{t('assignments.description')}</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t('assignments.descriptionPlaceholder')}
                rows="4"
              ></textarea>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary">
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? t('assignments.creating') : t('assignments.createAssignment')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateAssignmentModal;
