import { GoogleGenAI } from "@google/genai";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  sendAssignmentCreatedEmail,
  sendTaAssignmentCreatedEmail,
  sendAssignmentGradedEmail,
} from "../email";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ==========================================
// 1. IMPLEMENT YOUR FUNCTIONS
// ==========================================

async function searchUsers(teamId, query, role = "both") {
  const client = await clientPromise;
  const db = client.db();

  const team = await db
    .collection("teams")
    .findOne({ _id: new ObjectId(teamId) });
  if (!team) return { error: "Team not found" };

  let userIds = [];
  if (role === "student") userIds = team.students;
  else if (role === "editor") userIds = team.editors;
  else userIds = [...new Set([...team.students, ...team.editors])];

  const objectIds = userIds.map((id) => new ObjectId(id));

  const users = await db
    .collection("users")
    .find({
      _id: { $in: objectIds },
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
    .project({ _id: 1, name: 1, email: 1 })
    .toArray();

  return users;
}

async function getTeamMeetingTimes(teamId) {
  const client = await clientPromise;
  const db = client.db();

  const team = await db
    .collection("teams")
    .findOne({ _id: new ObjectId(teamId) });
  if (!team) return { error: "Team not found" };

  return team.meetingTimes || [];
}

async function createAssignment(args) {
  const {
    teamId,
    assignedTo,
    start,
    end,
    ta,
    status,
    notes,
    startTime,
    endTime,
    type,
    createdBy,
  } = args;

  const client = await clientPromise;
  const db = client.db();

  const team = await db
    .collection("teams")
    .findOne({ _id: new ObjectId(teamId) });
  if (!team) return { error: "Team not found" };

  // If createdBy is not provided, use the first editor as a fallback
  const creatorId = createdBy || team.editors[0];

  // Helper to parse wall time as America/Los_Angeles
  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    // If the user provided a timezone, respect it.
    // Otherwise, construct a Date object from the wall time string.
    // In this environment (America/Los_Angeles), new Date("YYYY-MM-DDTHH:mm:ss")
    // will correctly interpret it as local wall time.
    return new Date(timeStr);
  };

  const assignment = {
    teamId: new ObjectId(teamId),
    createdBy: new ObjectId(creatorId),
    assignedTo: new ObjectId(assignedTo),
    start,
    end,
    ta: ta ? new ObjectId(ta) : null,
    status: status || "pending",
    grade: null,
    notes: notes ?? "",
    startTime: parseTime(startTime),
    endTime: parseTime(endTime),
    type: type || "Memorization",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("assignments").insertOne(assignment);
  const assignmentId = result.insertedId;

  // Update references
  await db
    .collection("teams")
    .updateOne(
      { _id: new ObjectId(teamId) },
      { $push: { assignments: assignmentId } },
    );
  await db
    .collection("users")
    .updateOne(
      { _id: new ObjectId(assignedTo) },
      { $push: { assignments: assignmentId } },
    );
  if (ta) {
    await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(ta) },
        { $push: { taAssignments: assignmentId } },
      );
  }

  // Notifications
  try {
    const student = await db
      .collection("users")
      .findOne({ _id: new ObjectId(assignedTo) });
    const creator = await db
      .collection("users")
      .findOne({ _id: new ObjectId(creatorId) });
    if (student && student.email) {
      await sendAssignmentCreatedEmail(
        { ...assignment, _id: assignmentId },
        student,
        team,
        creator,
      );
    }
    if (ta) {
      const taUser = await db
        .collection("users")
        .findOne({ _id: new ObjectId(ta) });
      if (taUser && taUser.email) {
        await sendTaAssignmentCreatedEmail(
          { ...assignment, _id: assignmentId },
          taUser,
          student,
          team,
          creator,
        );
      }
    }
  } catch (e) {
    console.error("Failed to send notification emails:", e);
  }

  return { success: true, assignmentId };
}

async function searchAssignments(args) {
  const { teamId, assignedTo, ta, date, type } = args;
  const client = await clientPromise;
  const db = client.db();

  const query = { teamId: new ObjectId(teamId) };
  if (assignedTo) query.assignedTo = new ObjectId(assignedTo);
  if (ta) query.ta = new ObjectId(ta);
  if (type) query.type = type;

  if (date) {
    // Treat date as local day in America/Los_Angeles
    const startOfDay = new Date(date + "T00:00:00");
    const endOfDay = new Date(date + "T23:59:59");
    query.startTime = { $gte: startOfDay, $lte: endOfDay };
  }

  const assignments = await db
    .collection("assignments")
    .find(query)
    .sort({ startTime: 1 })
    .toArray();
  return assignments;
}

async function gradeAssignment(args) {
  const { assignmentId, grade, status, notes, gradedBy, teamId } = args;
  const client = await clientPromise;
  const db = client.db();

  const updateData = {
    grade: parseFloat(grade),
    status: status || "graded",
    notes: notes ?? "",
    updatedAt: new Date(),
    gradedBy: gradedBy ? new ObjectId(gradedBy) : null,
    gradedAt: new Date(),
  };

  const result = await db
    .collection("assignments")
    .findOneAndUpdate(
      { _id: new ObjectId(assignmentId) },
      { $set: updateData },
      { returnDocument: "after" },
    );

  const assignment = result.value || result;
  if (!assignment) return { error: "Assignment not found" };

  // Notifications
  try {
    const team = await db
      .collection("teams")
      .findOne({ _id: new ObjectId(teamId || assignment.teamId) });
    const student = await db
      .collection("users")
      .findOne({ _id: new ObjectId(assignment.assignedTo) });
    const grader = await db.collection("users").findOne({
      _id: new ObjectId(gradedBy || team.editors[0]),
    });

    if (student && student.email && team && grader) {
      await sendAssignmentGradedEmail(assignment, student, team, grader);
    }
  } catch (e) {
    console.error("Failed to send grading notification email:", e);
  }

  return { success: true, assignment };
}

function greetTheWorld(name) {
  console.log("greetTheWorld");
  return `Hello, ${name}! 🌍`;
}

// ==========================================
// 2. REGISTER AVAILABLE TOOLS
// ==========================================

const tools = [
  {
    functionDeclarations: [
      {
        name: "greet_the_world",
        description:
          "Call this function whenever the user asks you to greet the world.",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the person to greet.",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "search_users",
        description:
          "Search for users (students or teachers) in a team by name or email.",
        parameters: {
          type: "object",
          properties: {
            teamId: {
              type: "string",
              description: "The ID of the team to search in.",
            },
            query: {
              type: "string",
              description: "The name or email to search for.",
            },
            role: {
              type: "string",
              enum: ["student", "editor", "both"],
              description: "The role to filter by (default is 'both').",
            },
          },
          required: ["teamId", "query"],
        },
      },
      {
        name: "get_team_meeting_times",
        description: "Get the weekly meeting schedule for a team.",
        parameters: {
          type: "object",
          properties: {
            teamId: {
              type: "string",
              description: "The ID of the team.",
            },
          },
          required: ["teamId"],
        },
      },
      {
        name: "create_assignment",
        description: "Create a new assignment for a student in a team.",
        parameters: {
          type: "object",
          properties: {
            teamId: {
              type: "string",
              description: "The ID of the team.",
            },
            assignedTo: {
              type: "string",
              description: "The ID of the student being assigned.",
            },
            ta: {
              type: "string",
              description: "The ID of the teacher/TA observing the assignment.",
            },
            start: {
              type: "object",
              description: "The start point (e.g., {surah: 1, verse: 1}).",
              properties: {
                surah: { type: "integer" },
                verse: { type: "integer" },
              },
            },
            end: {
              type: "object",
              description: "The end point (e.g., {surah: 1, verse: 7}).",
              properties: {
                surah: { type: "integer" },
                verse: { type: "integer" },
              },
            },
            status: {
              type: "string",
              description: "The initial status (default 'pending').",
              default: "pending",
            },
            notes: {
              type: "string",
              description: "Any additional notes.",
            },
            startTime: {
              type: "string",
              description: "The ISO string for the start time.",
            },
            endTime: {
              type: "string",
              description: "The ISO string for the end time.",
            },
            type: {
              type: "string",
              enum: ["Memorization", "Revision", "Recitation", "Arabic"],
              description: "The type of assignment (default 'Memorization').",
            },
          },
          required: [
            "teamId",
            "assignedTo",
            "start",
            "end",
            "status",
            "startTime",
            "endTime",
          ],
        },
      },
      {
        name: "search_assignments",
        description:
          "Find existing assignments for a team, filtered by student, TA, date, or type.",
        parameters: {
          type: "object",
          properties: {
            teamId: {
              type: "string",
              description: "The ID of the team.",
            },
            assignedTo: {
              type: "string",
              description: "The ID of the student.",
            },
            ta: {
              type: "string",
              description: "The ID of the teacher/TA.",
            },
            date: {
              type: "string",
              description:
                "The ISO date string to search for assignments (e.g., '2023-10-27').",
            },
            type: {
              type: "string",
              enum: ["Memorization", "Revision", "Recitation", "Arabic"],
              description: "The type of assignment.",
            },
          },
          required: ["teamId"],
        },
      },
      {
        name: "grade_assignment",
        description: "Grade an existing assignment.",
        parameters: {
          type: "object",
          properties: {
            assignmentId: {
              type: "string",
              description: "The ID of the assignment to grade.",
            },
            teamId: {
              type: "string",
              description: "The ID of the team.",
            },
            grade: {
              type: "number",
              description: "The grade percentage (0-100).",
            },
            status: {
              type: "string",
              description: "The new status (e.g., 'graded', 'Completed').",
              default: "graded",
            },
            notes: {
              type: "string",
              description: "Feedback or notes for the student.",
            },
            gradedBy: {
              type: "string",
              description: "The ID of the teacher grading the assignment.",
            },
          },
          required: ["assignmentId", "grade"],
        },
      },
    ],
  },
];

// Map tool names to actual implementations
const availableFunctions = {
  greet_the_world: (args) => greetTheWorld(args.name),
  search_users: (args) => searchUsers(args.teamId, args.query, args.role),
  get_team_meeting_times: (args) => getTeamMeetingTimes(args.teamId),
  create_assignment: (args) => createAssignment(args),
  search_assignments: (args) => searchAssignments(args),
  grade_assignment: (args) => gradeAssignment(args),
};

const model = "gemini-3.1-flash-lite";
const MAX_TOOL_ROUNDS = 16;

// ==========================================
// 3. THE AGENT LOOP
// ==========================================

export async function runAgent(
  message,
  onProgress = async () => {},
  username = null,
) {
  const knownUsers = {
    AlaaOraby22: "Alaa Abbas",
    abdelrahman_MH: "Abdelrahman Helal",
    amran510: "Amran Alsaidy",
    Aadani7: "Abdulelah",
  };
  const teacherName = knownUsers[username] || username || "Unknown User";

  try {
    const systemInstruction = `
You are a Telegram agent for Samely, an app for managing Quran memorization assignments.
The default team ID is 6ab47ec9285ceb4eb644a9fb.

When a user wants to create an assignment:
0. The teacher's name is "${teacherName}". Create the assignments with them as the teacher if they don't mention another teacher.
1. Search for the student and teacher (TA) by name or email using search_users if you don't have their IDs.
2. Continuity: If you just graded an assignment and are now creating a new one for the same student, you MUST assign the same teacher (TA) who was on the graded assignment to the new one.
3. Date Resolution: If the user says a relative date like "next Monday", "tomorrow", or "next time":
   - Use get_team_meeting_times to find the team's schedule.
   - The meeting times (startTime/endTime) returned by get_team_meeting_times are in "HH:mm" format in America/Los_Angeles time.
   - "Next time" means the very next available meeting slot from the schedule that is strictly in the future (after the current moment).
   - dayOfWeek: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.
   - Current reference time: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} (Local Time).
   - IMPORTANT: When providing startTime and endTime to create_assignment, use the format "YYYY-MM-DDTHH:mm:ss" (e.g., "2026-11-02T18:30:00"). 
   - NEVER append "Z" or any timezone offset like "+00:00" or "-08:00". 
   - The system is configured to treat your input as "America/Los_Angeles" wall time automatically. If you add "Z", it will be shifted by 8 hours and appear at the wrong time (e.g., 10:30 AM).
4. Assignments involve Quranic verses:
   - "start" and "end" are objects like { "surah": 1, "verse": 1 }.
   - Arabic Assignments: If the user does not specify a Surah and Verse for an "Arabic" type assignment, you MUST default both "start" and "end" to { "surah": 1, "verse": 1 }.
4. Assignment constraints:
   - The default status for new assignments is "pending".
   - Allowed assignment types are: "Memorization", "Revision", "Recitation", "Arabic".
5. When finding assignments to grade:
   - Use search_assignments.
   - If the user doesn't specify a day, default to today's date in America/Los_Angeles.
   - Filter by student name (search for their ID first) and assignment type if provided.
6. When grading an assignment:
   - Use grade_assignment.
   - You need the assignmentId (get this from search_assignments).
   - The grade should be a number (percentage).
7. When you have all the info, use the appropriate tool.
`;

    // Keep track of the entire conversation for this request
    const contents = [
      {
        role: "user",
        parts: [{ text: systemInstruction + "\n\nUser request: " + message }],
      },
    ];

    // Keep asking Gemini what to do next

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      await onProgress?.(
        round === 0
          ? "Understanding your request..."
          : "Reviewing results and deciding the next step...",
      );

      const response = await ai.models.generateContent(
        {
          model,
          contents,
          config: { tools },
        },
        { timeout_ms: 60000 },
      );

      const calls = response.functionCalls ?? [];

      // Gemini is done
      if (calls.length === 0) {
        return response.text ?? "Task completed.";
      }

      const modelContent = response.candidates?.[0]?.content;

      if (!modelContent) {
        throw new Error("Gemini returned no candidate content.");
      }

      contents.push(modelContent);

      const functionResponses = [];

      for (const call of calls) {
        const name = call.name;

        if (!name || !availableFunctions[name]) {
          throw new Error(`Unknown function: ${name}`);
        }

        await onProgress?.(`Running ${name.replaceAll("_", " ")}...`);

        console.log(`Executing tool: ${name}`);

        const result = await availableFunctions[name](call.args ?? {});

        await onProgress?.(`Finished ${name.replaceAll("_", " ")}.`);

        functionResponses.push({
          functionResponse: {
            name,
            id: call.id,
            response: { result },
          },
        });
      }

      contents.push({
        role: "user",
        parts: functionResponses,
      });
    }

    return "I reached the maximum number of tool rounds. Please try a more specific request.";
  } catch (error) {
    console.error("Agent error:", error);

    return "Sorry, something went wrong while processing your request.";
  }
}
