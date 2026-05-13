const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const classroom = google.classroom('v1');

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
];

// Initialize OAuth2 client
const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  if (!redirectUri) {
    throw new Error('Missing GOOGLE_REDIRECT_URI (required for Google OAuth redirect_uri parameter)');
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

// Generate authorization URL
// Generate authorization URL
const getAuthorizationUrl = (state) => {
  const oauth2Client = getOAuth2Client();

  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) {
    // Extra safeguard: guarantees we never generate an auth URL missing redirect_uri
    throw new Error('Missing GOOGLE_REDIRECT_URI (required for OAuth URL redirect_uri parameter)');
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: SCOPES,
    redirect_uri: redirectUri,
    ...(state ? { state } : {}),
  });

  return url;
};

const getAuthenticatedClient = (credentials) => {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: credentials.accessToken || credentials.access_token,
    refresh_token: credentials.refreshToken || credentials.refresh_token,
    expiry_date: credentials.expiryDate || credentials.token_expiry?.getTime?.() || credentials.token_expiry,
  });
  return oauth2Client;
};

// Exchange authorization code for tokens
const getAccessToken = async (code) => {
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (err) {
    console.error('Error getting access token:', err);
    throw err;
  }
};

// Get user's Google Classroom courses
const getCourses = async (authClient) => {
  try {
    const response = await classroom.courses.list({
      auth: authClient,
      pageSize: 10,
    });

    return response.data.courses || [];
  } catch (err) {
    console.error('Error fetching courses:', err);
    throw err;
  }
};

// Get coursework (assignments) from a specific course
const getCoursework = async (authClient, courseId) => {
  try {
    const response = await classroom.courses.courseWork.list({
      auth: authClient,
      courseId: courseId,
      pageSize: 50,
    });

    return response.data.courseWork || [];
  } catch (err) {
    console.error(`Error fetching coursework for course ${courseId}:`, err);
    throw err;
  }
};

// Get all submissions for a coursework item
const getSubmissions = async (authClient, courseId, courseWorkId) => {
  try {
    const response = await classroom.courses.courseWork.studentSubmissions.list({
      auth: authClient,
      courseId: courseId,
      courseWorkId: courseWorkId,
      pageSize: 50,
    });

    return response.data.studentSubmissions || [];
  } catch (err) {
    console.error(
      `Error fetching submissions for coursework ${courseWorkId}:`,
      err
    );
    throw err;
  }
};

// Sync all Google Classroom assignments for a user
const syncAllAssignments = async (credentials, userId) => {
  try {
    const authClient = getAuthenticatedClient(credentials);
    const courses = await getCourses(authClient);
    const allAssignments = [];

    for (const course of courses) {
      const coursework = await getCoursework(authClient, course.id);

      for (const work of coursework) {
        // Filter out non-assignment work items (e.g., quizzes, materials)
        if (work.workType !== 'ASSIGNMENT' && work.workType !== 'COURSEWORK') {
          continue;
        }

        // Defensive guards: DB insert requires googleClassroomId, courseId, and title
        if (!work?.id || !course?.id) {
          continue;
        }
        if (typeof work?.title !== 'string' || !work.title.trim()) {
          continue;
        }

        const assignment = {
          googleClassroomId: work.id,
          courseId: course.id,
          courseName: course.name,
          title: work.title,
          description: work.description || '',
          dueDate: work.dueDate
            ? new Date(
                `${work.dueDate.year}-${String(work.dueDate.month).padStart(
                  2,
                  '0'
                )}-${String(work.dueDate.day).padStart(2, '0')}`
              )
            : null,
          dueTime: work.dueTime
            ? work.dueTime.hours + ':' + String(work.dueTime.minutes).padStart(2, '0')
            : null,
          creationTime: new Date(work.creationTime),
          updateTime: new Date(work.updateTime),
          state: work.state,
          alternateLink: work.alternateLink,
        };

        allAssignments.push(assignment);
      }
    }

    return allAssignments;
  } catch (err) {
    console.error('Error syncing assignments:', err);
    throw err;
  }
};

module.exports = {
  getAuthorizationUrl,
  getAccessToken,
  getAuthenticatedClient,
  getCourses,
  getCoursework,
  getSubmissions,
  syncAllAssignments,
};
