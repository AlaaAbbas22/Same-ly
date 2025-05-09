import { Resend } from 'resend';
import surahData from './surah.json';

const resend = new Resend('re_Ca5CxPow_A7fKyeTP4bsUUYnPPRpR4av9');

// Helper function to format surah information
const formatSurahInfo = (surahObj) => {
  if (!surahObj || typeof surahObj !== 'object') return 'Unknown';
  
  try {
    // Get surah name from local data
    const surahNumber = parseInt(surahObj.surah) - 1;
    if (surahData[surahNumber]) {
      const surahName = surahData[surahNumber].surahName;
      const arabicName = surahData[surahNumber].surahNameArabic;
      return `Surah ${surahObj.surah}. ${surahName} (${arabicName}): Verse ${surahObj.verse}`;
    }
    
    // Fallback if surah not found
    return `Surah ${surahObj.surah}: Verse ${surahObj.verse}`;
  } catch (err) {
    console.error("Error getting surah data:", err);
    return `Surah ${surahObj.surah}: Verse ${surahObj.verse}`;
  }
};

// Email templates
const getAssignmentCreatedTemplate = (assignment, student, team, creator) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">New Assignment Created</h1>
    <p>Hello ${student.name},</p>
    <p>You have been assigned a new task in team <strong>${team.name}</strong>.</p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #444;">Assignment Details:</h3>
      <ul style="list-style-type: none; padding-left: 0;">
        <li><strong>Type:</strong> ${assignment.type}</li>
        <li><strong>Start:</strong> ${formatSurahInfo(assignment.start)}</li>
        <li><strong>End:</strong> ${formatSurahInfo(assignment.end)}</li>
        <li><strong>Start Time:</strong> ${new Date(assignment.startTime).toLocaleString()}</li>
        <li><strong>End Time:</strong> ${new Date(assignment.endTime).toLocaleString()}</li>
        <li><strong>Status:</strong> ${assignment.status}</li>
        ${assignment.notes ? `<li><strong>Notes:</strong> ${assignment.notes}</li>` : ''}
      </ul>
    </div>
    
    <p>This assignment was created by ${creator.name}.</p>
    <p>Please log in to your account to view more details and start working on your assignment.</p>
    
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/teams/${team._id}/myassignments/${assignment._id}" 
         style="background-color: #4a5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        View Assignment
      </a>
    </div>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
      This is an automated message from سمّعلي (Same'ly). Please do not reply to this email.
    </p>
  </div>
  `;
};

const getAssignmentUpdatedTemplate = (assignment, student, team, updater) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Assignment Updated</h1>
    <p>Hello ${student.name},</p>
    <p>Your assignment in team <strong>${team.name}</strong> has been updated.</p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #444;">Updated Assignment Details:</h3>
      <ul style="list-style-type: none; padding-left: 0;">
        <li><strong>Type:</strong> ${assignment.type}</li>
        <li><strong>Start:</strong> ${formatSurahInfo(assignment.start)}</li>
        <li><strong>End:</strong> ${formatSurahInfo(assignment.end)}</li>
        <li><strong>Start Time:</strong> ${new Date(assignment.startTime).toLocaleString()}</li>
        <li><strong>End Time:</strong> ${new Date(assignment.endTime).toLocaleString()}</li>
        <li><strong>Status:</strong> ${assignment.status}</li>
        ${assignment.notes ? `<li><strong>Notes:</strong> ${assignment.notes}</li>` : ''}
      </ul>
    </div>
    
    <p>This assignment was updated by ${updater.name}.</p>
    <p>Please log in to your account to view the complete details.</p>
    
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/teams/${team._id}/myassignments/${assignment._id}" 
         style="background-color: #4a5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        View Assignment
      </a>
    </div>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
      This is an automated message from سمّعلي (Same'ly). Please do not reply to this email.
    </p>
  </div>
  `;
};

const getAssignmentGradedTemplate = (assignment, student, team, grader) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Assignment Graded</h1>
    <p>Hello ${student.name},</p>
    <p>Your assignment in team <strong>${team.name}</strong> has been graded.</p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #444;">Assignment Results:</h3>
      <ul style="list-style-type: none; padding-left: 0;">
        <li><strong>Type:</strong> ${assignment.type}</li>
        <li><strong>Grade:</strong> <span style="font-size: 18px; font-weight: bold; color: ${assignment.grade >= 70 ? '#4caf50' : '#f44336'};">${assignment.grade}%</span></li>
        <li><strong>Status:</strong> ${assignment.status}</li>
        ${assignment.notes ? `<li><strong>Feedback:</strong> ${assignment.notes}</li>` : ''}
      </ul>
    </div>
    
    <p>This assignment was graded by ${grader.name}.</p>
    <p>Please log in to your account to view the complete details and feedback.</p>
    
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/teams/${team._id}/myassignments/${assignment._id}" 
         style="background-color: #4a5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        View Assignment Details
      </a>
    </div>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
      This is an automated message from سمّعلي (Same'ly). Please do not reply to this email.
    </p>
  </div>
  `;
};

const getAssignmentDeletedTemplate = (assignment, student, team, deleter) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Assignment Deleted</h1>
    <p>Hello ${student.name},</p>
    <p>An assignment in team <strong>${team.name}</strong> has been deleted.</p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #444;">Deleted Assignment Details:</h3>
      <ul style="list-style-type: none; padding-left: 0;">
        <li><strong>Type:</strong> ${assignment.type}</li>
        <li><strong>Start:</strong> ${formatSurahInfo(assignment.start)}</li>
        <li><strong>End:</strong> ${formatSurahInfo(assignment.end)}</li>
      </ul>
    </div>
    
    <p>This assignment was deleted by ${deleter.name}.</p>
    <p>If you have any questions, please contact your team administrator.</p>
    
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/teams/${team._id}/myassignments" 
         style="background-color: #4a5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Go to My Assignments
      </a>
    </div>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
      This is an automated message from سمّعلي (Same'ly). Please do not reply to this email.
    </p>
  </div>
  `;
};

// TA Email Templates
const getTaAssignmentCreatedTemplate = (assignment, ta, student, team, creator) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">New Assignment to Supervise</h1>
    <p>Hello ${ta.name},</p>
    <p>You have been assigned as a teaching assistant for a new assignment in team <strong>${team.name}</strong>.</p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #444;">Assignment Details:</h3>
      <ul style="list-style-type: none; padding-left: 0;">
        <li><strong>Student:</strong> ${student.name} (${student.email})</li>
        <li><strong>Type:</strong> ${assignment.type}</li>
        <li><strong>Start:</strong> ${formatSurahInfo(assignment.start)}</li>
        <li><strong>End:</strong> ${formatSurahInfo(assignment.end)}</li>
        <li><strong>Start Time:</strong> ${new Date(assignment.startTime).toLocaleString()}</li>
        <li><strong>End Time:</strong> ${new Date(assignment.endTime).toLocaleString()}</li>
        <li><strong>Status:</strong> ${assignment.status}</li>
        ${assignment.notes ? `<li><strong>Notes:</strong> ${assignment.notes}</li>` : ''}
      </ul>
    </div>
    
    <p>This assignment was created by ${creator.name}.</p>
    <p>Please log in to your account to view more details and supervise this assignment.</p>
    
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/teams/${team._id}/myta/${assignment._id}" 
         style="background-color: #4a5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        View Assignment
      </a>
    </div>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
      This is an automated message from سمّعلي (Same'ly). Please do not reply to this email.
    </p>
  </div>
  `;
};

const getTaAssignmentUpdatedTemplate = (assignment, ta, student, team, updater) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Assignment Updated</h1>
    <p>Hello ${ta.name},</p>
    <p>An assignment you're supervising in team <strong>${team.name}</strong> has been updated.</p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #444;">Updated Assignment Details:</h3>
      <ul style="list-style-type: none; padding-left: 0;">
        <li><strong>Student:</strong> ${student.name} (${student.email})</li>
        <li><strong>Type:</strong> ${assignment.type}</li>
        <li><strong>Start:</strong> ${formatSurahInfo(assignment.start)}</li>
        <li><strong>End:</strong> ${formatSurahInfo(assignment.end)}</li>
        <li><strong>Start Time:</strong> ${new Date(assignment.startTime).toLocaleString()}</li>
        <li><strong>End Time:</strong> ${new Date(assignment.endTime).toLocaleString()}</li>
        <li><strong>Status:</strong> ${assignment.status}</li>
        ${assignment.notes ? `<li><strong>Notes:</strong> ${assignment.notes}</li>` : ''}
      </ul>
    </div>
    
    <p>This assignment was updated by ${updater.name}.</p>
    <p>Please log in to your account to view the complete details.</p>
    
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/teams/${team._id}/myta/${assignment._id}" 
         style="background-color: #4a5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        View Assignment
      </a>
    </div>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
      This is an automated message from سمّعلي (Same'ly). Please do not reply to this email.
    </p>
  </div>
  `;
};

const getTaAssignmentDeletedTemplate = (assignment, ta, student, team, deleter) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <h1 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Assignment Deleted</h1>
    <p>Hello ${ta.name},</p>
    <p>An assignment you were supervising in team <strong>${team.name}</strong> has been deleted.</p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3 style="margin-top: 0; color: #444;">Deleted Assignment Details:</h3>
      <ul style="list-style-type: none; padding-left: 0;">
        <li><strong>Student:</strong> ${student.name} (${student.email})</li>
        <li><strong>Type:</strong> ${assignment.type}</li>
        <li><strong>Start:</strong> ${formatSurahInfo(assignment.start)}</li>
        <li><strong>End:</strong> ${formatSurahInfo(assignment.end)}</li>
      </ul>
    </div>
    
    <p>This assignment was deleted by ${deleter.name}.</p>
    <p>If you have any questions, please contact your team administrator.</p>
    
    <div style="margin-top: 20px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/teams/${team._id}/myta" 
         style="background-color: #4a5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Go to My Students' Assignments
      </a>
    </div>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
      This is an automated message from سمّعلي (Same'ly). Please do not reply to this email.
    </p>
  </div>
  `;
};

// TA Email sending functions
export const sendTaAssignmentCreatedEmail = async (assignment, ta, student, team, creator) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'سمّعلي (Same\'ly) <onboarding@resend.dev>',
      to: ta.email,
      subject: `New Assignment to Supervise in ${team.name}`,
      html: getTaAssignmentCreatedTemplate(assignment, ta, student, team, creator),
    });

    if (error) {
      console.error('Error sending TA assignment created email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending TA assignment created email:', error);
    return { success: false, error };
  }
};

export const sendTaAssignmentUpdatedEmail = async (assignment, ta, student, team, updater) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'سمّعلي (Same\'ly) <onboarding@resend.dev>',
      to: ta.email,
      subject: `Assignment Updated in ${team.name}`,
      html: getTaAssignmentUpdatedTemplate(assignment, ta, student, team, updater),
    });

    if (error) {
      console.error('Error sending TA assignment updated email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending TA assignment updated email:', error);
    return { success: false, error };
  }
};

export const sendTaAssignmentDeletedEmail = async (assignment, ta, student, team, deleter) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'سمّعلي (Same\'ly) <onboarding@resend.dev>',
      to: ta.email,
      subject: `Assignment Deleted in ${team.name}`,
      html: getTaAssignmentDeletedTemplate(assignment, ta, student, team, deleter),
    });

    if (error) {
      console.error('Error sending TA assignment deleted email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending TA assignment deleted email:', error);
    return { success: false, error };
  }
};

export const sendAssignmentCreatedEmail = async (assignment, student, team, creator) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'سمّعلي (Same\'ly) <onboarding@resend.dev>',
      to: student.email,
      subject: `New Assignment in ${team.name}`,
      html: getAssignmentCreatedTemplate(assignment, student, team, creator),
    });

    if (error) {
      console.error('Error sending assignment created email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending assignment created email:', error);
    return { success: false, error };
  }
};

export const sendAssignmentUpdatedEmail = async (assignment, student, team, updater) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'سمّعلي (Same\'ly) <onboarding@resend.dev>',
      to: student.email,
      subject: `Assignment Updated in ${team.name}`,
      html: getAssignmentUpdatedTemplate(assignment, student, team, updater),
    });

    if (error) {
      console.error('Error sending assignment updated email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending assignment updated email:', error);
    return { success: false, error };
  }
};

export const sendAssignmentGradedEmail = async (assignment, student, team, grader) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'سمّعلي (Same\'ly) <onboarding@resend.dev>',
      to: student.email,
      subject: `Assignment Graded in ${team.name}`,
      html: getAssignmentGradedTemplate(assignment, student, team, grader),
    });

    if (error) {
      console.error('Error sending assignment graded email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending assignment graded email:', error);
    return { success: false, error };
  }
};

export const sendAssignmentDeletedEmail = async (assignment, student, team, deleter) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'سمّعلي (Same\'ly) <onboarding@resend.dev>',
      to: student.email,
      subject: `Assignment Deleted in ${team.name}`,
      html: getAssignmentDeletedTemplate(assignment, student, team, deleter),
    });

    if (error) {
      console.error('Error sending assignment deleted email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending assignment deleted email:', error);
    return { success: false, error };
  }
};