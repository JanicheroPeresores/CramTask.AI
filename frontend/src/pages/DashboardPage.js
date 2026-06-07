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

const DashboardIcon = ({ name, size = 18 }) => {
  const icons = {
    tasks: (
      <>
        <path d="M8 6h11M8 12h11M8 18h11" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
    assistant: (
      <>
        <path d="M5 8a7 7 0 0 1 14 0v5a5 5 0 0 1-5 5h-2" />
        <path d="M9 18H6a3 3 0 0 1-3-3v-3h4v4" />
        <path d="M17 12h4v3a3 3 0 0 1-3 3h-1" />
      </>
    ),
    classroom: (
      <>
        <path d="M4 6h16v12H4z" />
        <path d="M8 10h8M8 14h5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 5v14" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    alert: (
      <>
        <path d="M12 8v5" />
        <path d="M12 17h.01" />
        <path d="M10.3 4.2 2.6 17.6A1.6 1.6 0 0 0 4 20h16a1.6 1.6 0 0 0 1.4-2.4L13.7 4.2a1.6 1.6 0 0 0-3.4 0z" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5M12 16V8M16 16v-8" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
};

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

  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(
    (assignment) => assignment.submission_status === 'submitted'
  ).length;
  const overdueAssignments = assignments.filter((assignment) => {
    return assignment.due_date ? new Date(assignment.due_date) < new Date() : false;
  }).length;

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
            <DashboardIcon name="logout" size={17} />
            {t('common.logout')}
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <aside className="dashboard-sidebar">
          <div className="sidebar-title">{t('dashboard.sidebarLabel')}</div>
          <nav className="sidebar-nav">
            <a href="#assignments">
              <span className="nav-icon"><DashboardIcon name="tasks" /></span>
              <span>{t('dashboard.navTasks')}</span>
            </a>
            <a href="#assistant">
              <span className="nav-icon"><DashboardIcon name="assistant" /></span>
              <span>{t('dashboard.navAssistant')}</span>
            </a>
            <a href="#classroom">
              <span className="nav-icon"><DashboardIcon name="classroom" /></span>
              <span>{t('dashboard.navClassroom')}</span>
            </a>
          </nav>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-primary create-btn"
            aria-label={t('dashboard.create')}
            title={t('dashboard.create')}
          >
            <span className="create-icon" aria-hidden>
              <DashboardIcon name="plus" size={16} />
            </span>
            <span className="create-label">{t('dashboard.create')}</span>
          </button>
        </aside>

        <main className="dashboard-main">
          <div className="dashboard-summary">
            <div className="summary-card summary-card-primary">
              <div className="summary-card-figure">
                <div className="summary-icon" aria-hidden>
                  <DashboardIcon name="chart" size={28} />
                </div>
                <div className="summary-progress">
                  {totalAssignments > 0 ? (
                    <div className="progress-bar" aria-hidden>
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round((completedAssignments / Math.max(1, totalAssignments)) * 100)}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="summary-card-label">{t('dashboard.assignmentsTitle')}</p>
              <h3>{totalAssignments}</h3>
              {totalAssignments === 0 ? (
                <p>{t('assignments.empty')}</p>
              ) : (
                <p>{completedAssignments} {t('common.submitted')} • {overdueAssignments} {t('dashboard.quickOverdue')}</p>
              )}
            </div>
            <div className="summary-card">
              <div className="summary-mini-icon"><DashboardIcon name="check" size={18} /></div>
              <p className="summary-card-label">Completed</p>
              <h3>{completedAssignments}</h3>
              <p>{t('common.submitted')}</p>
            </div>
            <div className="summary-card">
              <div className="summary-mini-icon summary-mini-icon--alert"><DashboardIcon name="alert" size={18} /></div>
              <p className="summary-card-label">Overdue</p>
              <h3>{overdueAssignments}</h3>
              <p>{t('dashboard.quickOverdue')}</p>
            </div>
          </div>

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

            <section id="assignments" className="dashboard-panel dashboard-panel--wide">
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

            <section id="assistant" className="dashboard-panel dashboard-panel--narrow">
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
        <button type="button" onClick={() => setShowModal(true)}>
          <DashboardIcon name="plus" size={16} />
          {t('dashboard.create')}
        </button>
      </nav>

      <button
        type="button"
        className="floating-action-button"
        onClick={() => setShowModal(true)}
        aria-label={t('dashboard.create')}
        title={t('dashboard.create')}
      >
        <DashboardIcon name="plus" size={20} />
        <span className="fab-label">{t('dashboard.create')}</span>
      </button>

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
