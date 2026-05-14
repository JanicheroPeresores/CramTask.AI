import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AssignmentTable from '../components/AssignmentTable';
import CreateAssignmentModal from '../components/CreateAssignmentModal';
import GoogleClassroomConnect from '../components/GoogleClassroomConnect';
import GoogleClassroomAssignments from '../components/GoogleClassroomAssignments';
import { sendDashboardAssistantMessage } from '../utils/dashboardAssistant';
import './DashboardPage.css';


const INITIAL_ASSISTANT_MESSAGES = [
  {
    id: 'assistant-welcome',
    role: 'assistant',
    content: 'Ask me what to work on first, how to handle an overdue assignment, or how to plan a study session.',
  },
];

const QUICK_PROMPTS = [
  'What should I do first today?',
  'How do I catch up on overdue work?',
  'Make me a short study plan for tonight.',
];

function DashboardPage({ user, onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assistantMessages, setAssistantMessages] = useState(INITIAL_ASSISTANT_MESSAGES);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [googleClassroomRefresh, setGoogleClassroomRefresh] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const navigate = useNavigate();
  const assistantScrollRef = useRef(null);
  const token = localStorage.getItem('token');

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/assignments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(response.data.assignments || []);
    } catch (err) {
      setError('Error fetching assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setAssignments([...assignments, response.data.assignment]);
      setShowModal(false);
    } catch (err) {
      setError('Error creating assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      await axios.delete(`/api/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(assignments.filter((assignment) => assignment.id !== assignmentId));
    } catch (err) {
      setError('Error deleting assignment');
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
        userName: user?.username || 'Student',
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
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Welcome, {user?.username || 'Student'}</h1>
          </div>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-sidebar">
          <div className="sidebar-label">MANAGE ASSIGNMENTS</div>
          <button onClick={() => setShowModal(true)} className="btn-primary create-btn">
            CREATE
          </button>
        </div>

        {showIntro && (
          <div className="dashboard-intro-overlay" role="dialog" aria-modal="true">
            <div className="dashboard-intro">
              <div className="dashboard-intro-top">
                <div className="dashboard-intro-badge">WELCOME</div>
                <h1 className="dashboard-intro-title">Your next study session starts here.</h1>
                <p className="dashboard-intro-subtitle">
                  Brutal. Simple. Helpful. Pick a priority, then let the Assignment Coach guide you.
                </p>
              </div>

              <div className="dashboard-intro-actions">
                <button
                  type="button"
                  className="intro-primary"
                  onClick={() => setShowIntro(false)}
                >
                  Enter Dashboard
                </button>
              </div>

              <div className="dashboard-intro-hints">
                <div className="intro-hint-card">
                  <div className="intro-hint-title">Step 1</div>
                  <div className="intro-hint-text">Sync Google Classroom (if you use it).</div>
                </div>
                <div className="intro-hint-card">
                  <div className="intro-hint-title">Step 2</div>
                  <div className="intro-hint-text">Create an assignment when needed.</div>
                </div>
                <div className="intro-hint-card">
                  <div className="intro-hint-title">Step 3</div>
                  <div className="intro-hint-text">Ask the coach what to do first.</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="intro-close-x"
              onClick={() => setShowIntro(false)}
              aria-label="Close intro"
              title="Close"
            >
              ×
            </button>
          </div>
        )}

        <div className="dashboard-main">
          <div className="dashboard-main-layout">
            <div className="assignments-section">
              {error && <div className="alert alert-error">{error}</div>}

              <GoogleClassroomConnect 
                onSync={() => setGoogleClassroomRefresh(prev => prev + 1)}
              />

              <GoogleClassroomAssignments 
                key={googleClassroomRefresh}
              />

              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                </div>
              ) : (
                <AssignmentTable assignments={assignments} onDelete={handleDeleteAssignment} />
              )}
            </div>

            {chatOpen && <aside className="assistant-card">
              <div className="assistant-card-header">
                <div>
                  <p className="assistant-eyebrow">AI chat box</p>
                  <h2>Assignment Coach</h2>
                </div>
                <button
                  className="assistant-close-btn"
                  onClick={() => setChatOpen(false)}
                  title="Minimize Chat"
                >
                  −
                </button>
              </div>

              <div className="assistant-messages" ref={assistantScrollRef}>
                {assistantMessages.map((message) => (
                  <div key={message.id} className={`assistant-message ${message.role}`}>
                    <div className="assistant-message-role">{message.role === 'user' ? 'You' : 'Coach'}</div>
                    <p>{message.content}</p>
                  </div>
                ))}
                {assistantLoading && (
                  <div className="assistant-message assistant">
                    <div className="assistant-message-role">Coach</div>
                    <p>Thinking through the next step...</p>
                  </div>
                )}
              </div>

              <div className="assistant-quick-prompts">
                {QUICK_PROMPTS.map((prompt) => (
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
                  placeholder="Ask the AI about priorities, deadlines, or study planning..."
                  rows="4"
                />
                <button
                  type="button"
                  className="assistant-send-btn"
                  onClick={() => handleAssistantSend()}
                  disabled={assistantLoading}
                >
                  {assistantLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </aside>}

          </div>
        </div>
      </div>

      <div className="logout-float">
        <button type="button" className="logout-float-btn" onClick={handleLogout} title="Logout">
          ⎋ Logout
        </button>
      </div>

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
