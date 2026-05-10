import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewAnswerWithGemini } from '../utils/studyCoach';
import './StudyCoachPage.css';

const DEFAULT_CHOICES = ['', '', '', ''];

function StudyCoachPage({ user, onLogout }) {
  const [question, setQuestion] = useState('');
  const [questionType, setQuestionType] = useState('free-response');
  const [choices, setChoices] = useState(DEFAULT_CHOICES);
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (questionType === 'multiple-choice') {
      setCorrectAnswer(choices[correctChoiceIndex] || '');
    }
  }, [choices, correctChoiceIndex, questionType]);

  const canReview = useMemo(() => {
    if (!question.trim()) {
      return false;
    }

    if (questionType === 'multiple-choice') {
      return choices.every((choice) => choice.trim()) && Boolean(choices[correctChoiceIndex].trim()) && userAnswer.trim();
    }

    return userAnswer.trim() && correctAnswer.trim();
  }, [choices, correctChoiceIndex, correctAnswer, question, questionType, userAnswer]);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');

  const handleChoiceChange = (index, value) => {
    setChoices((currentChoices) => currentChoices.map((choice, choiceIndex) => (choiceIndex === index ? value : choice)));
  };

  const handleReview = async () => {
    if (!canReview) {
      setFeedback({
        summary: 'Missing information.',
        hint: 'Add the question, the student answer, and the expected answer first.',
      });
      return;
    }

    const expectedAnswer = questionType === 'multiple-choice' ? (choices[correctChoiceIndex] || '') : correctAnswer;
    const isCorrect = normalize(userAnswer) === normalize(expectedAnswer);

    setLoading(true);
    setFeedback(null);

    try {
      const result = await reviewAnswerWithGemini({
        question,
        userAnswer,
        correctAnswer: expectedAnswer,
        isCorrect,
        questionType,
        mode: 'review',
      });
      setFeedback({
        ...result,
        isCorrect,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHint = async () => {
    if (!question.trim()) {
      setFeedback({
        summary: 'Missing information.',
        hint: 'Add the question first so the coach can generate a useful hint.',
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const result = await reviewAnswerWithGemini({
        question,
        userAnswer,
        correctAnswer: questionType === 'multiple-choice' ? (choices[correctChoiceIndex] || '') : correctAnswer,
        isCorrect: false,
        questionType,
        mode: 'hint',
      });
      setFeedback({
        ...result,
        isCorrect: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setQuestionType('multiple-choice');
    setQuestion('Which process turns liquid water into vapor?');
    setChoices(['Evaporation', 'Condensation', 'Precipitation', 'Transpiration']);
    setCorrectChoiceIndex(0);
    setUserAnswer('Evaporation');
    setCorrectAnswer('Evaporation');
    setFeedback(null);
  };

  const clearAll = () => {
    setQuestion('');
    setQuestionType('free-response');
    setChoices(DEFAULT_CHOICES);
    setCorrectChoiceIndex(0);
    setUserAnswer('');
    setCorrectAnswer('');
    setFeedback(null);
  };

  return (
    <div className="coach-page">
      <header className="coach-header">
        <div>
          <p className="coach-eyebrow">AI study coach</p>
          <h1>Check an answer, then get a hint</h1>
          <p className="coach-subtitle">
            The app confirms whether the answer is right or wrong, then Gemini gives a short explanation or a nudge in the right direction.
          </p>
        </div>
        <div className="coach-header-actions">
          <button className="coach-secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
          <button className="coach-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="coach-grid">
        <section className="coach-card coach-form-card">
          <div className="coach-card-header">
            <h2>Practice prompt</h2>
            <span>Student: {user?.username || 'Student'}</span>
          </div>

          <div className="coach-field-row coach-type-row">
            <div className="coach-field">
              <label htmlFor="questionType">Question type</label>
              <select id="questionType" value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                <option value="free-response">Free response</option>
                <option value="multiple-choice">Multiple choice</option>
              </select>
            </div>
            <div className="coach-field coach-inline-note">
              <label>Smart mode</label>
              <div className="coach-chip">Hints first, answer check second</div>
            </div>
          </div>

          <div className="coach-field">
            <label htmlFor="question">Question</label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Paste or type the question here"
              rows="5"
            />
          </div>

          {questionType === 'multiple-choice' ? (
            <div className="coach-choice-panel">
              <div className="coach-choice-panel-header">
                <h3>Answer choices</h3>
                <span>Select the correct option and let the app check the student answer</span>
              </div>
              <div className="coach-choice-grid">
                {choices.map((choice, index) => (
                  <label key={index} className={`coach-choice ${correctChoiceIndex === index ? 'selected' : ''}`}>
                    <div className="coach-choice-topline">
                      <input
                        type="radio"
                        name="correctChoice"
                        checked={correctChoiceIndex === index}
                        onChange={() => setCorrectChoiceIndex(index)}
                      />
                      <span>Correct option</span>
                    </div>
                    <textarea
                      value={choice}
                      onChange={(e) => handleChoiceChange(index, e.target.value)}
                      placeholder={`Choice ${index + 1}`}
                      rows="2"
                    />
                  </label>
                ))}
              </div>
              <div className="coach-field">
                <label htmlFor="userAnswer">Student selected answer</label>
                <input
                  id="userAnswer"
                  className="coach-input"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type the option the student picked"
                />
              </div>
            </div>
          ) : (
            <div className="coach-field-row">
              <div className="coach-field">
                <label htmlFor="userAnswer">Your answer</label>
                <textarea
                  id="userAnswer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type the answer you want to check"
                  rows="4"
                />
              </div>

              <div className="coach-field">
                <label htmlFor="correctAnswer">Expected answer</label>
                <textarea
                  id="correctAnswer"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="Type the expected answer here"
                  rows="4"
                />
              </div>
            </div>
          )}

          {questionType === 'free-response' && (
            <div className="coach-helper-row">
              <span className="coach-helper-label">Tip</span>
              <span className="coach-helper-text">Free response mode compares the student answer against the expected answer before Gemini writes the hint or explanation.</span>
            </div>
          )}

          <div className="coach-actions">
            <button className="coach-primary" onClick={handleReview} disabled={loading}>
              {loading ? 'Reviewing...' : 'Review Answer'}
            </button>
            <button className="coach-secondary" onClick={handleHint} type="button" disabled={loading}>
              Get Hint
            </button>
            <button className="coach-tertiary" onClick={loadSample} type="button">
              Load sample
            </button>
            <button className="coach-tertiary" onClick={clearAll} type="button">
              Clear
            </button>
          </div>
        </section>

        <aside className="coach-card coach-result-card">
          <div className="coach-card-header">
            <h2>Coach feedback</h2>
            <span>{feedback ? (feedback.isCorrect === true ? 'Correct' : feedback.isCorrect === false ? 'Needs work' : 'Hint mode') : 'Waiting for review'}</span>
          </div>

          {feedback ? (
            <div className="coach-feedback">
              <div className={`coach-status ${feedback.isCorrect === true ? 'correct' : feedback.isCorrect === false ? 'incorrect' : 'hint'}`}>
                {feedback.summary}
              </div>
              <p>{feedback.hint}</p>
              <div className="coach-note">
                {feedback.isCorrect === true
                  ? 'Ask for a hint on the next problem or try a harder variant.'
                  : feedback.isCorrect === false
                    ? 'Try again after reading the hint. The correct answer stays visible for comparison.'
                    : 'This hint is designed to move you toward the answer without giving it away.'}
              </div>
            </div>
          ) : (
            <div className="coach-empty">
              <h3>What happens here</h3>
              <ul>
                <li>The app can check free-response answers or multiple-choice answers.</li>
                <li>Gemini can give a hint before you submit or explain the result after review.</li>
                <li>You can keep using the page as a practice workspace instead of an answer bot.</li>
              </ul>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default StudyCoachPage;
