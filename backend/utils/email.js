const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendResetEmail = async (toEmail, resetToken, baseUrl) => {
  const resetLink = `${baseUrl}/forgot-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'TaskKeeper - Password Reset',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a2332; border-radius: 8px; color: #fff;">
        <h1 style="color: #0896ee; text-align: center; margin-bottom: 20px;">TaskKeeper</h1>
        <h2 style="text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
        <p style="color: #ccc; line-height: 1.6;">You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #0896ee; color: white; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px;">Reset Password</a>
        </div>
        <p style="color: #999; font-size: 13px;">This link expires in 1 hour.</p>
        <p style="color: #999; font-size: 13px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const sendTaskCreatedEmail = async (toEmail, task) => {
  const deadlineText = task.deadline
    ? new Date(task.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'No deadline set';

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'TaskKeeper - Created Task!',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a2332; border-radius: 8px; color: #fff;">
        <h1 style="color: #0896ee; text-align: center; margin-bottom: 20px;">TaskKeeper</h1>
        <h2 style="text-align: center; margin-bottom: 20px; color: #2ecc71;">Created Task!</h2>
        <div style="background: #0f1419; border: 1px solid #2a3a4a; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="color: #0896ee; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">${task.taskName}</p>
          <p style="color: #ccc; line-height: 1.6; margin: 0 0 10px 0;">${task.taskDescription || 'No description provided'}</p>
          <p style="color: #999; font-size: 14px; margin: 0;">📅 Deadline: ${deadlineText}</p>
        </div>
        <p style="color: #999; font-size: 13px; text-align: center;">Stay on top of your tasks with TaskKeeper!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const sendDeadlineReminderEmail = async (toEmail, task) => {
  const deadlineText = new Date(task.deadline).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'DEADLINE REMINDER FOR TASKKEEPER!',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a2332; border-radius: 8px; color: #fff;">
        <h1 style="color: #0896ee; text-align: center; margin-bottom: 20px;">TaskKeeper</h1>
        <h2 style="text-align: center; margin-bottom: 10px; color: #e74c3c;">⚠️ DEADLINE REMINDER!</h2>
        <p style="text-align: center; color: #f1c40f; margin-bottom: 20px;">The following task is due tomorrow!</p>
        <div style="background: #0f1419; border: 1px solid #e74c3c; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="color: #e74c3c; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">${task.task_name}</p>
          <p style="color: #ccc; line-height: 1.6; margin: 0 0 10px 0;">${task.task_description || 'No description provided'}</p>
          <p style="color: #f1c40f; font-size: 14px; font-weight: 600; margin: 0;">📅 Deadline: ${deadlineText}</p>
        </div>
        <p style="color: #999; font-size: 13px; text-align: center;">Don't forget to complete this task before the deadline!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const sendWelcomeEmail = async (toEmail, username) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'Welcome to TaskKeeper!',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a2332; border-radius: 8px; color: #fff;">
        <h1 style="color: #0896ee; text-align: center; margin-bottom: 20px;">TaskKeeper</h1>
        <h2 style="text-align: center; margin-bottom: 20px; color: #2ecc71;">Welcome, ${username}!</h2>
        <p style="color: #ccc; line-height: 1.6; text-align: center;">Your account has been created successfully. You're all set to start organizing your tasks, tracking deadlines, and staying on top of what matters.</p>
        <div style="background: #0f1419; border: 1px solid #2a3a4a; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="color: #0896ee; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Get started:</p>
          <p style="color: #ccc; margin: 0;">Create your first task and set a deadline to stay organized.</p>
        </div>
        <p style="color: #999; font-size: 13px; text-align: center;">Thank you for choosing TaskKeeper!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail, sendTaskCreatedEmail, sendDeadlineReminderEmail, sendWelcomeEmail };
