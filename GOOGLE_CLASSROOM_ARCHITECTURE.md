# Google Classroom Integration - Architecture & Technical Details

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TaskKeeper Dashboard                      │
│                                                                   │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │ GoogleClassroomConnect  │  │ GoogleClassroomAssignments   │  │
│  │                         │  │                              │  │
│  │ • Connect/Disconnect    │  │ • Display assignments        │  │
│  │ • Status indicator      │  │ • Group by course           │  │
│  │ • Sync button           │  │ • Show due dates            │  │
│  │ • Error handling        │  │ • Direct links              │  │
│  └────────┬────────────────┘  └────────────┬─────────────────┘  │
│           │                                 │                    │
└───────────┼─────────────────────────────────┼────────────────────┘
            │                                 │
            │ HTTP Requests                   │ HTTP Requests
            │ (API Calls)                     │ (API Calls)
            │                                 │
            ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TaskKeeper Backend                          │
│                        (Express.js)                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        API Routes: /api/google-classroom/                │  │
│  │                                                            │  │
│  │  POST   /auth/url          → Get authorization URL       │  │
│  │  POST   /auth/callback     → Handle OAuth callback       │  │
│  │  POST   /sync              → Sync assignments            │  │
│  │  GET    /assignments       → Fetch synced assignments    │  │
│  │  GET    /status            → Check connection            │  │
│  │  POST   /disconnect        → Disconnect account          │  │
│  └────────────────┬───────────────────────────┬─────────────┘  │
│                   │                           │                  │
│  ┌────────────────▼──────────┐  ┌─────────────▼──────────────┐  │
│  │  googleClassroom.js       │  │  Database Models           │  │
│  │  (Utility Module)         │  │                            │  │
│  │                           │  │  • Credentials model       │  │
│  │ • OAuth flow management   │  │  • Assignment model        │  │
│  │ • Google API integration  │  │                            │  │
│  │ • Token handling          │  │                            │  │
│  │ • Assignment syncing      │  │                            │  │
│  └───────────────┬───────────┘  └────────────┬──────────────┘  │
│                  │                           │                  │
└──────────────────┼───────────────────────────┼──────────────────┘
                   │                           │
                   │                           │
        ┌──────────▼──────────────┐  ┌────────▼─────────────┐
        │   Google OAuth 2.0      │  │   PostgreSQL DB      │
        │                         │  │                      │
        │  • User authentication  │  │ Tables:              │
        │  • Token management     │  │ • users              │
        │  • Scopes verification  │  │ • tasks              │
        └─────────────────────────┘  │ • assignments        │
                                      │ • google_classroom_  │
        ┌────────────────────────┐   │   credentials        │
        │ Google Classroom API   │   │ • google_classroom_  │
        │                        │   │   assignments        │
        │ • List courses         │   └──────────────────────┘
        │ • Get coursework       │
        │ • Get submissions      │
        │ • Course details       │
        └────────────────────────┘
```

## Data Flow

### Initial Connection Flow

```
1. User clicks "Connect Google Classroom"
         ↓
2. Frontend calls GET /api/google-classroom/auth/url
         ↓
3. Backend returns Google OAuth authorization URL
         ↓
4. Frontend redirects user to Google's OAuth consent screen
         ↓
5. User logs in and grants permission
         ↓
6. Google redirects back with authorization code
         ↓
7. Frontend sends code to POST /api/google-classroom/auth/callback
         ↓
8. Backend exchanges code for access token
         ↓
9. Backend saves tokens to google_classroom_credentials table
         ↓
10. Backend returns success to frontend
         ↓
11. Frontend triggers automatic sync
```

### Assignment Sync Flow

```
1. User clicks "Sync Assignments" (or automatic on first connect)
         ↓
2. Frontend calls POST /api/google-classroom/sync
         ↓
3. Backend retrieves stored access token from database
         ↓
4. Backend calls Google Classroom API:
   - GET /classrooms (list all courses)
   - For each course: GET /coursework (list assignments)
         ↓
5. Backend processes assignment data:
   - Extract title, description, due date
   - Format data for database
   - Filter out non-assignment items
         ↓
6. Backend saves/updates assignments in google_classroom_assignments table
   (Uses UPSERT to handle duplicates)
         ↓
7. Backend returns count and assignment data to frontend
         ↓
8. Frontend refreshes display with new assignments
         ↓
9. User sees assignments grouped by course
```

### Display Flow

```
1. DashboardPage renders GoogleClassroomAssignments component
         ↓
2. Component calls GET /api/google-classroom/assignments on mount
         ↓
3. Backend queries google_classroom_assignments table
         ↓
4. Returns all assignments sorted by due date
         ↓
5. Frontend groups assignments by course_name
         ↓
6. For each assignment, displays:
   - Title with link to Google Classroom
   - Course name
   - Due date/time
   - Days until due (or overdue indicator)
   - Description preview
   - Assignment state
```

## Database Schema

### google_classroom_credentials Table

```sql
CREATE TABLE google_classroom_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,           -- Current access token
  refresh_token TEXT,                   -- For refreshing expired tokens
  token_expiry TIMESTAMP,                -- When token expires
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### google_classroom_assignments Table

```sql
CREATE TABLE google_classroom_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_classroom_id TEXT NOT NULL,    -- ID from Google Classroom
  course_id TEXT NOT NULL,              -- Course ID from Google
  course_name TEXT NOT NULL,            -- Course name for display
  title TEXT NOT NULL,                  -- Assignment title
  description TEXT,                     -- Assignment description
  due_date TIMESTAMP,                   -- When it's due
  due_time TEXT,                        -- Time (e.g., "23:59")
  state TEXT,                           -- DRAFT, PUBLISHED, etc.
  alternate_link TEXT,                  -- Link to view in Google Classroom
  last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, google_classroom_id)  -- Prevent duplicates
);
```

## API Endpoints

### 1. Get Authorization URL
```
GET /api/google-classroom/auth/url
Response:
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 2. OAuth Callback
```
POST /api/google-classroom/auth/callback
Headers: Authorization: Bearer {jwt_token}
Body: { "code": "authorization_code" }
Response:
{
  "message": "Google Classroom connected successfully",
  "credentials": {
    "id": 1,
    "connectedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Sync Assignments
```
POST /api/google-classroom/sync
Headers: Authorization: Bearer {jwt_token}
Response:
{
  "message": "Assignments synced successfully",
  "count": 15,
  "assignments": [...]
}
```

### 4. Get Assignments
```
GET /api/google-classroom/assignments
Headers: Authorization: Bearer {jwt_token}
Response:
{
  "assignments": [
    {
      "id": 1,
      "user_id": 1,
      "google_classroom_id": "abc123",
      "course_name": "Computer Science 101",
      "title": "Final Project",
      "due_date": "2024-12-20T23:59:00Z",
      "description": "...",
      ...
    }
  ]
}
```

### 5. Connection Status
```
GET /api/google-classroom/status
Headers: Authorization: Bearer {jwt_token}
Response (Connected):
{
  "connected": true,
  "connectedAt": "2024-01-15T10:30:00Z",
  "lastUpdated": "2024-01-15T15:45:00Z"
}
Response (Not Connected):
{
  "connected": false
}
```

### 6. Disconnect
```
POST /api/google-classroom/disconnect
Headers: Authorization: Bearer {jwt_token}
Response:
{
  "message": "Google Classroom disconnected successfully"
}
```

## Security Considerations

### Authentication & Authorization
- Uses OAuth 2.0 for secure user authentication
- JWT tokens verify user identity for all requests
- Only authenticated users can connect Google Classroom

### Scope Limitations
- Requested scopes are read-only:
  - `classroom.courses.readonly` - List courses only
  - `classroom.coursework.me.readonly` - View assignments only
- No permissions to create, modify, or delete assignments

### Token Management
- Access tokens stored securely in database
- Refresh tokens for token renewal (when expired)
- Tokens never exposed to frontend
- Tokens only sent to Google API from backend

### Data Privacy
- Only course and assignment data synced
- No personal student data collected
- User can disconnect at any time
- Deletion cascades: user deletion removes all related data

## Sync Strategy

### One-Way Sync (Read-Only)
- Assignments synced FROM Google Classroom TO TaskKeeper
- TaskKeeper doesn't modify Google Classroom
- Updates pull latest data from Google each sync

### UPSERT Pattern
- On sync, uses INSERT ... ON CONFLICT ... DO UPDATE
- Prevents duplicate entries
- Updates existing assignments with latest data
- Maintains referential integrity

### Time Handling
- Due dates stored as TIMESTAMP
- Due times stored separately as TEXT (e.g., "23:59")
- Frontend calculates "days until due" dynamically
- Automatic overdue detection

## Performance Considerations

### Database Queries
- Assignments sorted by due_date in query
- Indexed user_id for fast lookups
- Unique constraint prevents duplicate syncs

### API Calls
- Minimal API calls (list courses once, then coursework for each)
- Pagination handled by Google API (50 assignments per page)
- Caching handled via database storage

### Frontend Rendering
- Grouped by course to reduce DOM elements
- Lazy loading of descriptions
- Key-based component refresh for manual sync

## Error Handling

### Network Errors
- User-friendly error messages
- Retry capability
- Graceful degradation

### API Errors
- Google API errors caught and logged
- Specific error messages returned to frontend
- Detailed backend logging for debugging

### Database Errors
- Transaction rollback on failure
- Foreign key constraints prevent orphaned data
- Unique constraints prevent duplicates

## Future Enhancements

### Potential Features
1. **Two-way Sync** - Update grades/status in both systems
2. **Automatic Scheduling** - Daily/weekly auto-sync
3. **Notifications** - Push notifications for new assignments
4. **Calendar Integration** - View in calendar view
5. **Other LMS** - Blackboard, Canvas, Moodle support
6. **Submission Tracking** - See submission status
7. **Grade Pulling** - Import grades from Google Classroom

### Technical Improvements
1. Token refresh middleware (auto-refresh before expiry)
2. Batch sync optimization
3. Assignment change detection (only update if changed)
4. WebSocket updates for real-time sync
5. Background job queue for async syncing
