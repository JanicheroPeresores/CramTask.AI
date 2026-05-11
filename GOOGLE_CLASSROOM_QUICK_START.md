# Google Classroom Integration - Quick Start

## What Was Added

TaskKeeper now has **Google Classroom Integration** that allows you to automatically sync assignments from Google Classroom directly to your TaskKeeper dashboard.

### New Components

1. **Google Classroom Connection Panel** - Connect/disconnect your Google Classroom account
2. **Google Classroom Assignments Display** - View all synced assignments grouped by course
3. **Automatic Syncing** - One-click sync of all your assignments
4. **Visual Organization** - Assignments color-coded by urgency

## How to Set It Up (Quick Version)

### 1. Create Google Cloud Credentials (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project called "TaskKeeper"
3. Enable Google Classroom API
4. Create OAuth 2.0 credentials (Web application type)
5. Add redirect URI: `http://localhost:5000/api/google-classroom/auth/callback`
6. Copy your **Client ID** and **Client Secret**

### 2. Configure Environment Variables (2 minutes)

In `backend/.env` add:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-classroom/auth/callback
```

### 3. Install & Run (3 minutes)

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm start
```

### 4. Connect Your Account (1 minute)

1. Go to TaskKeeper Dashboard
2. Click "Connect Google Classroom"
3. Authorize when prompted
4. Your assignments automatically sync!

## Files Added/Modified

### New Files
- `backend/utils/googleClassroom.js` - Google API integration
- `backend/models/GoogleClassroomCredentials.js` - Token storage
- `backend/models/GoogleClassroomAssignment.js` - Assignment storage
- `backend/routes/googleClassroom.js` - API endpoints
- `frontend/src/components/GoogleClassroomConnect.js` - Connection UI
- `frontend/src/components/GoogleClassroomAssignments.js` - Display UI
- Plus CSS files and documentation

### Modified Files
- `backend/package.json` - Added Google libraries
- `backend/models/db.js` - Added 2 new database tables
- `backend/server.js` - Registered new routes
- `frontend/src/pages/DashboardPage.js` - Integrated components

## Features

✅ Secure OAuth 2.0 authentication  
✅ Auto-sync assignments from Google Classroom  
✅ Group assignments by course  
✅ Show due dates and time remaining  
✅ Direct links to Google Classroom  
✅ Connect/disconnect with one click  
✅ Manual sync option  
✅ Visual indicators for overdue assignments  

## For Production

When deploying to production, update:

1. `GOOGLE_REDIRECT_URI` to your domain
2. Google Cloud OAuth credentials with production redirect URI
3. Environment variables in your hosting platform

See `GOOGLE_CLASSROOM_SETUP.md` for detailed production guide.

## Troubleshooting

**Error connecting?**
- Check Google Classroom API is enabled
- Verify Client ID and Client Secret are correct
- Ensure redirect URI matches exactly

**Assignments not showing?**
- Click "Sync Assignments" button
- Make sure you have assignments in Google Classroom
- Wait a few seconds for refresh

**Need detailed help?**
- See `GOOGLE_CLASSROOM_SETUP.md` for complete guide
- Check backend logs for error messages

## What's Next?

Once you're set up, you can:
1. Automatically sync assignments daily
2. Mark assignments as complete in TaskKeeper
3. Use the Study Coach to get help prioritizing
4. Continue adding manual assignments alongside Google Classroom

Enjoy using TaskKeeper with Google Classroom! 🎓
