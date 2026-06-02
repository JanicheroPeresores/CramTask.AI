import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AssignmentTable from '../components/AssignmentTable';
import AssignmentProgressWidget from '../components/AssignmentProgressWidget';
import CreateAssignmentModal from '../components/CreateAssignmentModal';
import GoogleClassroomConnect from '../components/GoogleClassroomConnect';
import GoogleClassroomAssignments from '../components/GoogleClassroomAssignments';
import LanguageSwitch from '../components/LanguageSwitch';
import { useLanguage } from '../i18n/LanguageContext';
import { sendDashboardAssistantMessage } from '../utils/dashboardAssistant';
import './DashboardPage.css';

function DashboardPage({ user, onLogout }) {
  const { language, t } = useLanguage();
  const [assignments, setAssignments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingAssignmentIds, setUpdatingAssignmentIds] = useState([]);
  const [assistantMessages, setAssistantMessages] = useState(() => [
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content: t('dashboard.welcomeMessage'),
    },
  ]);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [googleClassroomRefresh, setGoogleClassroomRefresh] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const navigate = useNavigate();
  const assistantScrollRef = useRef(null);
  const token = localStorage.getItem('token');
  const quickPrompts = [
    t('dashboard.quickFirst'),
    t('dashboard.quickOverdue'),
    t('dashboard.quickPlan'),
  ];

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(response.data.assignments || []);
    } catch (err) {
      setError(t('errors.fetchAssignments'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    setAssistantMessages((currentMessages) => {
      if (currentMessages.length === 1 && currentMessages[0].id === 'assistant-welcome') {
        return [
          {
            id: 'assistant-welcome',
            role: 'assistant',
            content: t('dashboard.welcomeMessage'),
          },
        ];
      }
      return currentMessages;
    });
  }, [language, t]);

  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.pageYOffset || document.documentElement.scrollTop;

      if (currentY < 80 || currentY < lastScrollY.current) {
        setShowHeader(true);
      } else {
        setShowHeader(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (assistantScrollRef.current) {
      assistantScrollRef.current.scrollTop = assistantScrollRef.current.scrollHeight;
    }
  }, [assistantMessages]);

  const handleCreateAssignment = async (assignmentData) => {
    try {
      const response = await axios.post('/api/assignments', assignmentData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments((current) => [...current, response.data.assignment]);
      setShowModal(false);
    } catch (err) {
      setError(t('errors.createAssignment'));
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      await axios.delete(`/api/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments((current) =>
        current.filter((assignment) => assignment.id !== assignmentId)
      );
    } catch (err) {
      setError(t('errors.deleteAssignment'));
    }
  };

  const handleToggleAssignmentCompletion = async (assignment) => {
    if (updatingAssignmentIds.includes(assignment.id)) {
      return;
    }

    const currentStatus = assignment.submission_status;
    const nextStatus = currentStatus === 'submitted' ? 'not_submitted' : 'submitted';

    setError('');
    setUpdatingAssignmentIds((current) => [...current, assignment.id]);
    setAssignments((current) =>
      current.map((item) =>
        item.id === assignment.id ? { ...item, submission_status: nextStatus } : item
      )
    );

    try {
      await axios.put(
        `/api/assignments/${assignment.id}`,
        {
          course: assignment.course,
          assignmentTitle: assignment.assignment_title,
          dueDate: assignment.due_date,
          subject: assignment.subject,
          priority: assignment.priority,
          submissionStatus: nextStatus,
          description: assignment.description,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      setAssignments((current) =>
        current.map((item) =>
          item.id === assignment.id && item.submission_status === nextStatus
            ? { ...item, submission_status: currentStatus }
            : item
        )
      );
      setError(t('errors.updateAssignment'));
    } finally {
      setUpdatingAssignmentIds((current) =>
        current.filter((assignmentId) => assignmentId !== assignment.id)
      );
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const handleAssistantSend = async (overrideMessage) => {
    const nextMessage = (overrideMessage ?? assistantInput).trim();

    if (!nextMessage || assistantLoading) {
      return;
    }

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: nextMessage,
    };

    const conversation = [...assistantMessages, userMessage];

    setAssistantMessages(conversation);
    setAssistantInput('');
    setAssistantLoading(true);

    try {
      const result = await sendDashboardAssistantMessage({
        messages: conversation,
        userName: user?.username || t('common.student'),
        language,
      });

      setAssistantMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: result.content,
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {showIntro && (
        <div className="dashboard-intro-overlay" role="dialog" aria-modal="true">
          <div className="dashboard-intro">
            <div className="dashboard-intro-top">
              <div className="dashboard-intro-badge">{t('dashboard.introBadge')}</div>
              <h1 className="dashboard-intro-title">{t('dashboard.introTitle')}</h1>
              <p className="dashboard-intro-subtitle">{t('dashboard.introSubtitle')}</p>
            </div>

            <div className="dashboard-intro-actions">
              <button type="button" className="intro-primary" onClick={() => setShowIntro(false)}>
                {t('dashboard.enterDashboard')}
              </button>
            </div>

            <div className="dashboard-intro-hints">
              <div className="intro-hint-card">
                <div className="intro-hint-title">{t('dashboard.step1Title')}</div>
                <div className="intro-hint-text">{t('dashboard.step1Text')}</div>
              </div>
              <div className="intro-hint-card">
                <div className="intro-hint-title">{t('dashboard.step2Title')}</div>
                <div className="intro-hint-text">{t('dashboard.step2Text')}</div>
              </div>
              <div className="intro-hint-card">
                <div className="intro-hint-title">{t('dashboard.step3Title')}</div>
                <div className="intro-hint-text">{t('dashboard.step3Text')}</div>
              </div>
            </div>

            <button
              type="button"
              className="intro-close-x"
              onClick={() => setShowIntro(false)}
              aria-label={t('dashboard.closeIntro')}
              title={t('dashboard.closeIntro')}
            >
              x
            </button>
          </div>
        </div>
      )}

      <header className={`dashboard-header ${showHeader ? 'visible' : 'hidden'}`}>
        <div className="dashboard-brand">
          <div className="brand-mark">CT</div>
          <div className="brand-copy">
            <p className="brand-eyebrow">CramTask.AI</p>
            <h1 className="dashboard-header-title">
              {t('dashboard.welcome', { name: user?.username || t('common.student') })}
            </h1>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <LanguageSwitch className="dashboard-language-switch" />
          <button onClick={handleLogout} className="btn-secondary logout-btn">
            {t('common.logout')}
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <aside className="dashboard-sidebar">
          <div className="sidebar-title">{t('dashboard.sidebarLabel')}</div>
          <nav className="sidebar-nav">
            <a href="#assignments">{t('dashboard.navTasks')}</a>
            <a href="#assistant">{t('dashboard.navAssistant')}</a>
            <a href="#classroom">{t('dashboard.navClassroom')}</a>
          </nav>
          <button type="button" onClick={() => setShowModal(true)} className="btn-primary create-btn">
            {t('dashboard.create')}
          </button>
        </aside>

        <main className="dashboard-main">
          <div className="dashboard-grid">
            <section id="classroom" className="dashboard-panel dashboard-panel--wide">
              <div className="panel-head">
                <div>
                  <p className="panel-eyebrow">{t('dashboard.classroomEyebrow')}</p>
                  <h2>{t('dashboard.classroomTitle')}</h2>
                </div>
              </div>
              <GoogleClassroomConnect onSync={() => setGoogleClassroomRefresh((prev) => prev + 1)} />
            </section>

            <section className="dashboard-panel dashboard-panel--wide">
              <div className="panel-head">
                <div>
                  <p className="panel-eyebrow">{t('dashboard.assignmentsEyebrow')}</p>
                  <h2>{t('dashboard.assignmentsTitle')}</h2>
                </div>
              </div>
              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                </div>
              ) : (
                <>
                  <AssignmentTable
                    assignments={assignments}
                    onDelete={handleDeleteAssignment}
                    onToggleComplete={handleToggleAssignmentCompletion}
                    updatingAssignmentIds={updatingAssignmentIds}
                  />
                  <AssignmentProgressWidget assignments={assignments} />
                </>
              )}
            </section>

            <section className="dashboard-panel dashboard-panel--narrow">
              <div className="panel-head panel-head--compact">
                <div>
                  <p className="panel-eyebrow">{t('dashboard.assistantEyebrow')}</p>
                  <h2>{t('dashboard.assistantTitle')}</h2>
                </div>
                <button type="button" className="btn-primary mobile-action" onClick={() => setShowModal(true)}>
                  {t('dashboard.create')}
                </button>
              </div>
              {error && <div className="alert alert-error">{error}</div>}
              {chatOpen ? (
                <aside className="assistant-card">
                  <div className="assistant-messages" ref={assistantScrollRef}>
                    {assistantMessages.map((message) => (
                      <div key={message.id} className={`assistant-message ${message.role}`}>
                        <div className="assistant-message-role">
                          {message.role === 'user' ? t('dashboard.you') : t('dashboard.coach')}
                        </div>
                        <p>{message.content}</p>
                      </div>
                    ))}
                    {assistantLoading && (
                      <div className="assistant-message assistant">
                        <div className="assistant-message-role">{t('dashboard.coach')}</div>
                        <p>{t('dashboard.thinking')}</p>
                      </div>
                    )}
                  </div>

                  <div className="assistant-quick-prompts">
                    {quickPrompts.map((prompt) => (
                      <button key={prompt} type="button" onClick={() => handleAssistantSend(prompt)}>
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <div className="assistant-input-box">
                    <textarea
                      value={assistantInput}
                      onChange={(e) => setAssistantInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAssistantSend();
                        }
                      }}
                      placeholder={t('dashboard.assistantPlaceholder')}
                      rows="4"
                    />
                    <button
                      type="button"
                      className="assistant-send-btn"
                      onClick={() => handleAssistantSend()}
                      disabled={assistantLoading}
                    >
                      {assistantLoading ? t('dashboard.sending') : t('dashboard.send')}
                    </button>
                  </div>
                </aside>
              ) : (
                <div className="chat-toggle-button-container">
                  <button
                    type="button"
                    className="chat-toggle-button"
                    onClick={() => setChatOpen(true)}
                    title={t('dashboard.openChat')}
                    aria-label={t('dashboard.openChat')}
                  >
                    AI
                  </button>
                </div>
              )}
            </section>

            <section className="dashboard-panel dashboard-panel--wide">
              <GoogleClassroomAssignments key={googleClassroomRefresh} />
            </section>
          </div>
        </main>
      </div>

      <nav className="dashboard-bottom-nav">
        <a href="#assignments">{t('dashboard.navTasks')}</a>
        <a href="#assistant">{t('dashboard.navAssistant')}</a>
        <button type="button" onClick={() => setShowModal(true)}>{t('dashboard.create')}</button>
      </nav>

      {showModal && (
        <CreateAssignmentModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreateAssignment}
        />
      )}
    </div>
  );
}

export default DashboardPage;
