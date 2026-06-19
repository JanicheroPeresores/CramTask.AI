import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AssignmentTable from '../components/AssignmentTable';
import AssignmentProgressWidget from '../components/AssignmentProgressWidget';
import CreateAssignmentModal from '../components/CreateAssignmentModal';
import GoogleClassroomConnect from '../components/GoogleClassroomConnect';
import GoogleClassroomAssignments from '../components/GoogleClassroomAssignments';
import LanguageSwitch from '../components/LanguageSwitch';
import ThemeToggle from '../components/ThemeToggle';
import { useLanguage } from '../i18n/LanguageContext';
import { sendDashboardAssistantMessage } from '../utils/dashboardAssistant';
import './DashboardPage.css';

const getIntroStorageKey = (user) => `cramtask-intro-seen-${user?.id || user?.email || user?.username || 'guest'}`;

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
    calendar: (
      <>
        <path d="M7 3v4M17 3v4" />
        <path d="M4 8h16" />
        <path d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
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
    minus: <path d="M5 12h14" />,
    send: (
      <>
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4 20-7z" />
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
  const [assistantPanelWidth, setAssistantPanelWidth] = useState(420);
  const [assistantPanelHeight, setAssistantPanelHeight] = useState(560);
  const [googleClassroomRefresh, setGoogleClassroomRefresh] = useState(0);
  const [googleClassroomAssignments, setGoogleClassroomAssignments] = useState([]);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(getIntroStorageKey(user)) !== 'true';
  });
  const navigate = useNavigate();
  const assistantScrollRef = useRef(null);
  const token = localStorage.getItem('token');
  const quickPrompts = [
    t('dashboard.quickFirst'),
    t('dashboard.quickOverdue'),
    t('dashboard.quickPlan'),
  ];

  const getAssignmentContext = () =>
    [
      ...assignments.map((assignment) => ({
        ...assignment,
        source: 'Dashboard',
      })),
      ...googleClassroomAssignments.map((assignment) => ({
        ...assignment,
        title: assignment.title,
        course: assignment.course_name,
        dueDate: assignment.due_date,
        dueTime: assignment.due_time,
        status: assignment.state,
        source: 'Google Classroom',
        classroomId: assignment.google_classroom_id,
        link: assignment.alternate_link,
      })),
    ]
      .slice()
      .sort((a, b) => new Date(a.dueDate || a.due_date || '9999-12-31') - new Date(b.dueDate || b.due_date || '9999-12-31'))
      .slice(0, 50)
      .map((assignment) => ({
        title: assignment.title || assignment.assignment_title,
        course: assignment.course,
        subject: assignment.subject,
        dueDate: assignment.dueDate || assignment.due_date,
        dueTime: assignment.dueTime || assignment.due_time,
        priority: assignment.priority,
        status: assignment.status || assignment.submission_status,
        source: assignment.source,
        classroomId: assignment.classroomId,
        link: assignment.link,
        description: assignment.description,
      }));

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

  // Silent refresh — doesn't show loading spinner, just updates data
  const refreshAssignments = async () => {
    try {
      const response = await axios.get('/api/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(response.data.assignments || []);
      setGoogleClassroomRefresh((prev) => prev + 1);
    } catch (err) {
      setError(t('errors.fetchAssignments'));
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

  const getAssignmentStatus = (assignment) =>
    String(assignment.submission_status || assignment.state || assignment.status || '')
      .trim()
      .toUpperCase();

  const isAssignmentCompleted = (assignment) => {
    const status = getAssignmentStatus(assignment);
    return (
      status === 'SUBMITTED' ||
      status === 'TURNED_IN' ||
      status === 'RETURNED' ||
      status === 'COMPLETED'
    );
  };

  const combinedAssignments = [...assignments, ...googleClassroomAssignments];
  const totalAssignments = combinedAssignments.length;
  const completedAssignments = combinedAssignments.filter(isAssignmentCompleted).length;
  const overdueAssignments = combinedAssignments.filter(
    (assignment) =>
      !isAssignmentCompleted(assignment) &&
      assignment.due_date &&
      new Date(assignment.due_date) < new Date()
  ).length;

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const handleAssistantResizeStart = (event) => {
    event.preventDefault();
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture?.(pointerId);

    const handlePointerMove = (moveEvent) => {
      const isMobile = window.innerWidth < 980;

      if (isMobile) {
        const bottomOffset = 72;
        const nextHeight = window.innerHeight - moveEvent.clientY - bottomOffset;
        setAssistantPanelHeight(Math.min(Math.max(nextHeight, 360), window.innerHeight * 0.82));
        return;
      }

      const rightOffset = 18;
      const maxWidth = Math.min(620, window.innerWidth - 290);
      const nextWidth = window.innerWidth - moveEvent.clientX - rightOffset;
      setAssistantPanelWidth(Math.min(Math.max(nextWidth, 340), maxWidth));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const dismissIntro = () => {
    sessionStorage.setItem(getIntroStorageKey(user), 'true');
    setShowIntro(false);
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
        assignments: getAssignmentContext(),
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
              <button type="button" className="intro-primary" onClick={dismissIntro}>
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
              onClick={dismissIntro}
              aria-label={t('dashboard.closeIntro')}
              title={t('dashboard.closeIntro')}
            >
              x
            </button>
          </div>
        </div>
      )}

      <header className="dashboard-header">
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
          <ThemeToggle />
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
            <a href="#calendar">
              <span className="nav-icon"><DashboardIcon name="calendar" /></span>
              <span>{t('dashboard.navCalendar')}</span>
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
                <p>{completedAssignments} {t('common.submitted')} - {overdueAssignments} {t('dashboard.quickOverdue')}</p>
              )}
            </div>
          </div>

          <div className="dashboard-grid">
            <section id="classroom" className="dashboard-panel dashboard-panel--wide dashboard-panel--classroom">
              <div className="panel-head">
                <div>
                  <p className="panel-eyebrow">{t('dashboard.classroomEyebrow')}</p>
                  <h2>{t('dashboard.classroomTitle')}</h2>
                </div>
              </div>
              <div className="classroom-stack">
                <GoogleClassroomConnect
                  onSync={(syncedAssignments) => {
                    setGoogleClassroomAssignments(syncedAssignments);
                    setGoogleClassroomRefresh((prev) => prev + 1);
                  }}
                />
                <GoogleClassroomAssignments
                  key={googleClassroomRefresh}
                  onAssignmentsChange={setGoogleClassroomAssignments}
                />
              </div>
            </section>

            <section id="assignments" className="dashboard-panel dashboard-panel--wide">
              <span id="calendar" className="panel-scroll-anchor" aria-hidden="true" />
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
                  <AssignmentProgressWidget
                    assignments={combinedAssignments}
                    onRefresh={refreshAssignments}
                  />
                </>
              )}
            </section>

          </div>
        </main>
      </div>

      <aside
        id="assistant"
        className={`assistant-dock ${chatOpen ? 'is-open' : 'is-minimized'}`}
        style={{
          '--assistant-panel-width': `${assistantPanelWidth}px`,
          '--assistant-panel-height': `${assistantPanelHeight}px`,
        }}
      >
        {chatOpen ? (
          <>
            <button
              type="button"
              className="assistant-resize-handle"
              onPointerDown={handleAssistantResizeStart}
              aria-label="Resize AI chat"
              title="Resize AI chat"
            />
            <div className="assistant-dock-head">
              <div>
                <p className="panel-eyebrow">{t('dashboard.assistantEyebrow')}</p>
                <h2>{t('dashboard.assistantTitle')}</h2>
              </div>
              <button
                type="button"
                className="assistant-minimize-btn"
                onClick={() => setChatOpen(false)}
                title={t('dashboard.closeIntro')}
                aria-label={t('dashboard.closeIntro')}
              >
                <DashboardIcon name="minus" size={17} />
              </button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="assistant-card">
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
                  rows="3"
                />
                <button
                  type="button"
                  className="assistant-send-btn"
                  onClick={() => handleAssistantSend()}
                  disabled={assistantLoading}
                >
                  <DashboardIcon name="send" size={16} />
                  {assistantLoading ? t('dashboard.sending') : t('dashboard.send')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="chat-toggle-button"
            onClick={() => setChatOpen(true)}
            title={t('dashboard.openChat')}
            aria-label={t('dashboard.openChat')}
          >
            <DashboardIcon name="assistant" size={19} />
            AI
          </button>
        )}
      </aside>

      <nav className="dashboard-bottom-nav">
        <a href="#calendar">{t('dashboard.navCalendar')}</a>
        <a href="#assignments">{t('dashboard.navTasks')}</a>
        <button type="button" onClick={() => setShowModal(true)}>
          <DashboardIcon name="plus" size={16} />
          {t('dashboard.create')}
        </button>
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
