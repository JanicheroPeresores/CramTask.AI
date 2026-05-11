# Google Classroom Integration Guide for TaskKeeper

This guide will help you set up Google Classroom integration with TaskKeeper, allowing you to automatically sync assignments from Google Classroom to your TaskKeeper dashboard.

## Overview

TaskKeeper now supports integration with Google Classroom. This feature allows you to:
- Authenticate your Google account securely using OAuth 2.0
- Automatically sync assignments from all your Google Classroom courses
- View Google Classroom assignments alongside your manually created assignments
- See assignment details, due dates, and links directly in TaskKeeper

## Prerequisites

- A Google Cloud Project (you can create one for free)
- Google Classroom access with at least one class
- TaskKeeper backend server running

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter a project name (e.g., "TaskKeeper")
5. Click "CREATE"
6. Wait for the project to be created (this may take a few minutes)

## Step 2: Enable Google Classroom API

1. In the Google Cloud Console, make sure your new project is selected
2. Go to **APIs & Services** > **Library**
3. Search for "Google Classroom API"
4. Click on "Google Classroom API"
5. Click the "ENABLE" button
6. You should see a green checkmark indicating the API is enabled

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click "CREATE CREDENTIALS" button
3. Select "OAuth client ID" from the dropdown
4. If prompted to create an OAuth consent screen first:
   - Click "CONFIGURE CONSENT SCREEN"
   - Select "External" user type
   - Click "CREATE"
   - Fill in the required fields:
     - **App name**: TaskKeeper
     - **User support email**: Your email address
     - **Developer contact email**: Your email address
   - Click "SAVE AND CONTINUE"
   - Skip optional scopes for now
   - Click "SAVE AND CONTINUE"
   - Click "BACK TO DASHBOARD"

5. Go back to **APIs & Services** > **Credentials**
6. Click "CREATE CREDENTIALS" again
7. Select "OAuth client ID"
8. Choose "Web application" as the application type
9. Give it a name (e.g., "TaskKeeper Web Client")
10. Under "Authorized redirect URIs", add:
    - `http://localhost:5000/api/google-classroom/auth/callback` (for development)
    - `https://yourdomain.com/api/google-classroom/auth/callback` (for production - replace with your actual domain)
11. Click "CREATE"
12. A dialog will show your credentials. Click "DOWNLOAD JSON" to download them or copy:
    - **Client ID**
    - **Client Secret**

## Step 4: Set Up Environment Variables

### Backend Configuration

1. Open or create a `.env` file in the `backend/` directory
2. Add the following environment variables:

```bash
# Google Classroom Integration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-classroom/auth/callback
```

Replace the values with the Client ID and Client Secret you obtained in Step 3.

For production:
```bash
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google-classroom/auth/callback
```

### Frontend Configuration

The frontend will automatically use the backend APIs. No additional configuration is needed.

## Step 5: Install Dependencies

Make sure all dependencies are installed:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

The following packages have been added for Google Classroom integration:
- `google-auth-library` - For OAuth authentication
- `googleapis` - For accessing Google APIs

## Step 6: Database Schema Update

The database schema has been automatically updated with two new tables:

1. **google_classroom_credentials** - Stores encrypted user tokens
2. **google_classroom_assignments** - Stores synced assignments from Google Classroom

These tables are created automatically when the backend starts.

## Step 7: Start the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. In another terminal, start the frontend:
```bash
cd frontend
npm start
```

3. Navigate to your TaskKeeper dashboard

## Step 8: Connect Google Classroom

1. On the TaskKeeper Dashboard, look for the "Google Classroom Integration" section
2. Click "Connect Google Classroom"
3. You'll be redirected to Google's login page
4. Sign in with your Google account
5. Grant permission to TaskKeeper to access your Google Classroom courses
6. You'll be automatically redirected back to TaskKeeper
7. Your assignments will be automatically synced!

## Syncing Assignments

### Automatic Sync
Assignments are automatically synced when you first connect your Google Classroom account.

### Manual Sync
To manually sync your latest assignments:
1. Look for the "Sync Assignments" button in the Google Classroom Integration section
2. Click it to fetch the latest assignments from Google Classroom

## Features

### What Gets Synced
- Course name and ID
- Assignment title
- Assignment description
- Due date and time
- Assignment status
- Link to the assignment in Google Classroom

### Viewing Assignments
1. Google Classroom assignments appear in a dedicated section on your dashboard
2. Assignments are grouped by course
3. Each assignment shows:
   - Assignment title
   - Course name
   - Due date and time
   - Time until due (or how many days overdue)
   - A direct link to open the assignment in Google Classroom

### Filtering and Sorting
- Assignments are automatically sorted by due date
- Group by course for easy navigation
- Visual indicators show:
  - 🔴 Overdue assignments (red)
  - 🟡 Urgent assignments due within 3 days (yellow)
  - 🟢 Other assignments (green)

## Disconnecting Google Classroom

To disconnect your Google Classroom account:
1. Click the "Disconnect" button in the Google Classroom Integration section
2. Your Google Classroom assignments will be kept in the database but won't be updated
3. To remove all Google Classroom assignments, contact your administrator

## Troubleshooting

### "Error connecting to Google Classroom"
- Verify that your Google Cloud Project has Google Classroom API enabled
- Check that your OAuth credentials are correct
- Ensure the redirect URI matches exactly

### "Error syncing assignments"
- Make sure you're connected to the internet
- Check that Google Classroom API is enabled in your Google Cloud Console
- Verify you have at least one assignment in Google Classroom

### Assignments not appearing after sync
- Wait a few seconds for the page to refresh
- Click "Sync Assignments" again
- Check that you're viewing the correct course

### "Invalid redirect URI"
- Make sure the `GOOGLE_REDIRECT_URI` in your `.env` file matches exactly what you configured in Google Cloud Console
- For production, use your actual domain name, not localhost

## Production Deployment

When deploying to production:

1. Update the `GOOGLE_REDIRECT_URI` in your `.env` file to use your production domain
2. Update the OAuth consent screen in Google Cloud Console if needed
3. Add your production redirect URI in the OAuth credentials:
   - `https://yourdomain.com/api/google-classroom/auth/callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your production environment

## Security Considerations

- All tokens are encrypted and stored securely in the database
- Tokens are never exposed to the frontend
- OAuth 2.0 is used for secure authentication
- Only read-only access is requested (no destructive permissions)

## API Reference

### Endpoints

#### Get Authorization URL
```
GET /api/google-classroom/auth/url
```
Returns the URL to redirect users to for Google authentication.

#### OAuth Callback
```
POST /api/google-classroom/auth/callback
Body: { code: string }
```
Exchanges the authorization code for tokens. Requires authentication.

#### Sync Assignments
```
POST /api/google-classroom/sync
```
Syncs all assignments from Google Classroom. Requires authentication.

#### Get Synced Assignments
```
GET /api/google-classroom/assignments
```
Retrieves all synced Google Classroom assignments. Requires authentication.

#### Get Connection Status
```
GET /api/google-classroom/status
```
Returns whether the user is connected to Google Classroom.

#### Disconnect
```
POST /api/google-classroom/disconnect
```
Disconnects the Google Classroom account. Requires authentication.

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review your Google Cloud Console settings
3. Check the backend server logs for error messages
4. Make sure all environment variables are correctly set

## Future Enhancements

Planned features for future versions:
- Two-way sync (update submission status in Google Classroom)
- Automatic daily sync
- Assignment notifications
- Integration with other LMS platforms (Canvas, Blackboard, etc.)
