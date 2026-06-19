# CramTask.AI

## Overview

CramTask.AI is an AI-powered academic task management system designed to help students organize, prioritize, and complete their school requirements efficiently. The platform integrates Artificial Intelligence and Google Classroom connectivity to automatically gather academic tasks, analyze deadlines, and recommend task priorities.

The goal of CramTask.AI is to reduce procrastination, improve productivity, and help students manage their workload through intelligent task scheduling and prioritization.

---

## Features

### User Management
- User Registration
- User Login and Authentication
- Secure Account Management

### Task Management
- Create Tasks
- Edit Tasks
- Delete Tasks
- Mark Tasks as Completed
- Track Progress

### Google Classroom Integration
- Connect Google Account
- Import Classroom Assignments
- Synchronize Deadlines
- Automatically Create Tasks from Classroom Activities

### AI-Powered Assistance
- Analyze Assignment Urgency
- Suggest Task Priorities
- Recommend Study Focus Areas
- Generate Productivity Insights

### Dashboard
- View Pending Tasks
- View Completed Tasks
- Monitor Upcoming Deadlines
- Track Academic Progress

---

## Problem Statement

Students often struggle with managing multiple assignments, projects, quizzes, and deadlines simultaneously. Existing task management applications require users to manually prioritize tasks, which can lead to missed deadlines and poor time management.

CramTask.AI addresses this issue by combining AI-powered task prioritization with Google Classroom integration, allowing students to automatically import assignments and receive intelligent recommendations on what to focus on first.

---

## Objectives

### General Objective
To develop an AI-powered task management platform that helps students organize academic workloads effectively.

### Specific Objectives
- Automate task collection through Google Classroom.
- Assist students in prioritizing tasks using AI.
- Improve productivity and deadline management.
- Provide a centralized academic task dashboard.
- Reduce missed submissions and procrastination.

---

## Technologies Used

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js

### Database
- Firebase Firestore

### Authentication
- Firebase Authentication
- Google OAuth

### AI Services
- AI API Integration

### External Integration
- Google Classroom API

### Deployment
- GitHub
- Vercel

---

# System Architecture

```text
+----------------+
|     Student    |
+----------------+
         |
         v
+----------------+
|   CramTask.AI  |
|    Frontend    |
+----------------+
         |
         v
+----------------+
|    Backend     |
|    Node.js     |
+----------------+
      |      |
      |      |
      v      v
+---------+ +------------------+
|Firebase | | Google Classroom |
|Database | |       API        |
+---------+ +------------------+
      |               |
      |               |
      +-------+-------+
              |
              v
      +----------------+
      | AI Processing  |
      | Recommendation |
      +----------------+
              |
              v
      +----------------+
      | Priority Score |
      | & Suggestions  |
      +----------------+
              |
              v
      +----------------+
      | Student Dashboard |
      +----------------+
```

---

# System Flowchart

```text
START
  |
  v
User Login/Register
  |
  v
Connect Google Account?
  |
  +------No------+
  |              |
  |         Manual Task Entry
  |              |
  +--------------+
  |
 Yes
  |
  v
Connect Google Classroom
  |
  v
Retrieve Assignments
  |
  v
Store Tasks in Firebase
  |
  v
AI Analyzes:
- Deadline
- Subject
- Workload
- Urgency
  |
  v
Generate Priority Score
  |
  v
Display Recommendations
  |
  v
Student Completes Tasks
  |
  v
Update Progress
  |
  v
END
```

---

## AI Workflow

### Input
- Assignment Title
- Subject
- Due Date
- Assignment Description

### AI Processing
- Calculate remaining time before deadline
- Analyze assignment complexity
- Determine urgency level
- Assign priority ranking

### Output
- High Priority
- Medium Priority
- Low Priority
- Recommended Task Order

---

## Google Classroom Workflow

1. User authenticates using Google.
2. User grants Classroom access.
3. System retrieves active classes.
4. Assignments are imported automatically.
5. Deadlines are synchronized.
6. Tasks are stored in Firebase.
7. AI analyzes imported tasks.
8. Prioritized tasks appear on the dashboard.

---

## Scope

### Included
- User Authentication
- Task Management
- AI Prioritization
- Google Classroom Integration
- Dashboard Analytics

### Not Included
- Video Conferencing
- Messaging System
- Learning Management System
- Online Examination System

---

## Future Enhancements

- Mobile Application
- Calendar Integration
- Push Notifications
- AI Study Planner
- Performance Analytics
- Collaborative Group Tasks
- Multi-platform Integration (Canvas, Moodle, Blackboard)

---

## Researchers / Developers

**Janichero Peresores**
**Kient Gascon**

Mapúa Malayan Colleges Mindanao

Bachelor of Science in Information Systems

---

## License

This project is intended for academic and educational purposes.
