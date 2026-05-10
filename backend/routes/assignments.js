const express = require('express');
const authMiddleware = require('../middleware/auth');
const Assignment = require('../models/Assignment');
const User = require('../models/User');

const router = express.Router();

// Create assignment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { course, assignmentTitle, dueDate, subject, priority, submissionStatus, description } = req.body;
    const userId = req.userId;

    if (!course || !assignmentTitle) {
      return res.status(400).json({ message: 'Course and assignment title are required' });
    }

    const assignment = await Assignment.create(
      userId,
      course,
      assignmentTitle,
      dueDate,
      subject,
      priority,
      submissionStatus,
      description
    );

    res.json({ message: 'Assignment created successfully', assignment });
  } catch (err) {
    console.error('Create assignment error:', err);
    res.status(500).json({ message: 'Error creating assignment' });
  }
});

// Get all assignments for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const assignments = await Assignment.getByUserId(userId);
    res.json({ assignments });
  } catch (err) {
    console.error('Get assignments error:', err);
    res.status(500).json({ message: 'Error fetching assignments' });
  }
});

// Get assignments by status
router.get('/status/:status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const status = req.params.status;
    const assignments = await Assignment.getByStatus(userId, status);
    res.json({ assignments });
  } catch (err) {
    console.error('Get assignments by status error:', err);
    res.status(500).json({ message: 'Error fetching assignments' });
  }
});

// Get single assignment
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const assignment = await Assignment.getById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json({ assignment });
  } catch (err) {
    console.error('Get assignment error:', err);
    res.status(500).json({ message: 'Error fetching assignment' });
  }
});

// Update assignment
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { course, assignmentTitle, dueDate, subject, priority, submissionStatus, description } = req.body;
    const assignmentId = req.params.id;

    if (!course || !assignmentTitle) {
      return res.status(400).json({ message: 'Course and assignment title are required' });
    }

    await Assignment.update(
      assignmentId,
      course,
      assignmentTitle,
      dueDate,
      subject,
      priority,
      submissionStatus,
      description
    );

    res.json({ message: 'Assignment updated successfully' });
  } catch (err) {
    console.error('Update assignment error:', err);
    res.status(500).json({ message: 'Error updating assignment' });
  }
});

// Delete assignment
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const assignmentId = req.params.id;
    await Assignment.delete(assignmentId);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (err) {
    console.error('Delete assignment error:', err);
    res.status(500).json({ message: 'Error deleting assignment' });
  }
});

module.exports = router;
