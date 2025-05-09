import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from '@/lib/mongodb';
import { 
  sendAssignmentCreatedEmail, 
  sendAssignmentUpdatedEmail, 
  sendAssignmentGradedEmail, 
  sendAssignmentDeletedEmail,
  sendTaAssignmentCreatedEmail,
  sendTaAssignmentDeletedEmail,
  sendTaAssignmentUpdatedEmail
} from '@/lib/email';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const userId = session.user.id || session.user.sub;

    const body = await request.json();
    const {
      assignedTo,
      start,
      end,
      ta,
      status,
      grade,
      notes,
      startTime,
      endTime,
      type
    } = body;

    if (!assignedTo || !start || !end || !status || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const team = await db.collection('teams').findOne({ _id: new ObjectId(teamId) });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const isEditor = team.editors.includes(userId);
    const isSelfAssignment = assignedTo === userId;

    if (!isEditor && !isSelfAssignment) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create assignment
    const assignment = {
      teamId: new ObjectId(teamId),
      createdBy: new ObjectId(userId),
      assignedTo: new ObjectId(assignedTo),
      start,
      end,
      ta: ta ? new ObjectId(ta) : null,
      status,
      grade: grade ?? null,
      notes: notes ?? "",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      type: type || "Memorization", // Default to Memorization if not specified
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('assignments').insertOne(assignment);

    // Update references for efficient queries
    await db.collection('teams').updateOne(
      { _id: new ObjectId(teamId) },
      { $push: { assignments: result.insertedId } }
    );
    await db.collection('users').updateOne(
      { _id: new ObjectId(assignedTo) },
      { $push: { assignments: result.insertedId } }
    );
    if (ta) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(ta) },
        { $push: { taAssignments: result.insertedId } }
      );
    }

    // Get student and creator info for email
    const student = await db.collection('users').findOne({ _id: new ObjectId(assignedTo) });
    const creator = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    // Send email notification to student
    if (student && student.email) {
      const assignmentWithId = { ...assignment, _id: result.insertedId };
      await sendAssignmentCreatedEmail(assignmentWithId, student, team, creator);
    }

    // Send email notification to TA if assigned
    if (ta) {
      const taUser = await db.collection('users').findOne({ _id: new ObjectId(ta) });
      if (taUser && taUser.email) {
        const assignmentWithId = { ...assignment, _id: result.insertedId };
        await sendTaAssignmentCreatedEmail(assignmentWithId, taUser, student, team, creator);
      }
    }

    return NextResponse.json({ success: true, assignmentId: result.insertedId });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}



export async function GET(request, {params}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id || session.user.sub;
    const { id: teamId } = await params;

    const client = await clientPromise;
    const db = client.db();

    const assignments = await db.collection('assignments').aggregate([
        {
          $match: {
            assignedTo: new ObjectId(userId),
            teamId: new ObjectId(teamId)
          }
        },
        {
          $lookup: {
            from: 'users',            // users collection
            localField: 'ta',         // field in assignments
            foreignField: '_id',      // field in users
            as: 'taInfo'              // will be an array
          }
        },
        {
          $unwind: {
            path: '$taInfo',
            preserveNullAndEmptyArrays: true  // in case ta is missing
          }
        },
        {
          $addFields: {
            ta: {
              name: '$taInfo.name',
              email: '$taInfo.email'
            }
          }
        },
        {
          $project: {
            taInfo: 0 // remove the original taInfo array
          }
        }
      ]).toArray();
      

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

// Update assignment information
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const userId = session.user.id || session.user.sub;

    const body = await request.json();
    const {
      assignmentId,
      assignedTo,
      start,
      end,
      ta,
      status,
      notes,
      startTime,
      endTime,
      type
    } = body;

    if (!assignmentId || !assignedTo || !start || !end || !status || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Verify team exists
    const team = await db.collection('teams').findOne({ _id: new ObjectId(teamId) });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get the assignment
    const assignment = await db.collection('assignments').findOne({ 
      _id: new ObjectId(assignmentId),
      teamId: new ObjectId(teamId)
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check permissions
    const isEditor = team.editors.includes(userId);
    const isAssignmentTA = assignment.ta && assignment.ta.toString() === userId;

    if (!isEditor && !isAssignmentTA) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepare update data
    const updateData = {
      assignedTo: new ObjectId(assignedTo),
      start,
      end,
      ta: ta ? new ObjectId(ta) : null,
      status,
      notes: notes ?? "",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      type: type || "Memorization", // Default to Memorization if not specified
      updatedAt: new Date()
    };

    // Update assignment
    await db.collection('assignments').updateOne(
      { _id: new ObjectId(assignmentId) },
      { $set: updateData }
    );

    // If TA has changed, update references
    if (ta && (!assignment.ta || assignment.ta.toString() !== ta)) {
      // Remove reference from old TA if exists
      if (assignment.ta) {
        await db.collection('users').updateOne(
          { _id: assignment.ta },
          { $pull: { taAssignments: new ObjectId(assignmentId) } }
        );
      }
      
      // Add reference to new TA
      await db.collection('users').updateOne(
        { _id: new ObjectId(ta) },
        { $addToSet: { taAssignments: new ObjectId(assignmentId) } }
      );
    }

    // If assignedTo has changed, update references
    if (assignment.assignedTo.toString() !== assignedTo) {
      // Remove reference from old assignee
      await db.collection('users').updateOne(
        { _id: assignment.assignedTo },
        { $pull: { assignments: new ObjectId(assignmentId) } }
      );
      
      // Add reference to new assignee
      await db.collection('users').updateOne(
        { _id: new ObjectId(assignedTo) },
        { $addToSet: { assignments: new ObjectId(assignmentId) } }
      );
    }

    // Get student and updater info for email
    const student = await db.collection('users').findOne({ _id: new ObjectId(assignedTo) });
    const updater = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    // Send email notification
    if (student && student.email) {
      const updatedAssignment = { ...assignment, ...updateData, _id: new ObjectId(assignmentId) };
      await sendAssignmentUpdatedEmail(updatedAssignment, student, team, updater);
    }
    
    // Send email notification to TA if assigned
    if (ta) {
      const taUser = await db.collection('users').findOne({ _id: new ObjectId(ta) });
      if (taUser && taUser.email) {
        const updatedAssignment = { ...assignment, ...updateData, _id: new ObjectId(assignmentId) };
        await sendTaAssignmentUpdatedEmail(updatedAssignment, taUser, student, team, updater);
      }
    }

    return NextResponse.json({ success: true, message: 'Assignment updated successfully' });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}

// Grade an assignment
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const userId = session.user.id || session.user.sub;

    const body = await request.json();
    const { assignmentId, grade, status, notes } = body;

    if (!assignmentId || grade === undefined || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Verify team exists
    const team = await db.collection('teams').findOne({ _id: new ObjectId(teamId) });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get the assignment
    const assignment = await db.collection('assignments').findOne({ 
      _id: new ObjectId(assignmentId),
      teamId: new ObjectId(teamId)
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check permissions
    const isEditor = team.editors.includes(userId);
    const isAssignmentTA = assignment.ta && assignment.ta.toString() === userId;

    if (!isEditor && !isAssignmentTA) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update assignment with grade
    const updateData = { 
      grade, 
      status,
      notes: notes ?? assignment.notes ?? "",
      updatedAt: new Date(),
      gradedBy: new ObjectId(userId),
      gradedAt: new Date()
    };
    
    await db.collection('assignments').updateOne(
      { _id: new ObjectId(assignmentId) },
      { $set: updateData }
    );

    // Get student and grader info for email
    const student = await db.collection('users').findOne({ _id: assignment.assignedTo });
    const grader = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    // Send email notification
    if (student && student.email) {
      const gradedAssignment = { ...assignment, ...updateData };
      await sendAssignmentGradedEmail(gradedAssignment, student, team, grader);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Assignment graded successfully' 
    });
  } catch (error) {
    console.error('Error grading assignment:', error);
    return NextResponse.json({ error: 'Failed to grade assignment' }, { status: 500 });
  }
}


// Delete an assignment
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: teamId } = await params;
    const userId = session.user.id || session.user.sub;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Verify team exists
    const team = await db.collection('teams').findOne({ _id: new ObjectId(teamId) });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get the assignment
    const assignment = await db.collection('assignments').findOne({ 
      _id: new ObjectId(assignmentId),
      teamId: new ObjectId(teamId)
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Check permissions
    const isEditor = team.editors.includes(userId);
    const isAssignmentTA = assignment.ta && assignment.ta.toString() === userId;

    if (!isEditor && !isAssignmentTA) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get student and deleter info for email before deleting
    const student = await db.collection('users').findOne({ _id: assignment.assignedTo });
    const deleter = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    // Send email notification
    if (student && student.email) {
      await sendAssignmentDeletedEmail(assignment, student, team, deleter);
    }

    // Send email notification to TA if assigned
    if (assignment.ta) {
      const taUser = await db.collection('users').findOne({ _id: assignment.ta });
      if (taUser && taUser.email) {
        await sendTaAssignmentDeletedEmail(assignment, taUser, student, team, deleter);
      }
    }

    // Delete the assignment
    await db.collection('assignments').deleteOne({ _id: new ObjectId(assignmentId) });

    // Remove references from team
    await db.collection('teams').updateOne(
      { _id: new ObjectId(teamId) },
      { $pull: { assignments: new ObjectId(assignmentId) } }
    );

    // Remove references from assigned student
    await db.collection('users').updateOne(
      { _id: assignment.assignedTo },
      { $pull: { assignments: new ObjectId(assignmentId) } }
    );

    // Remove references from TA if exists
    if (assignment.ta) {
      await db.collection('users').updateOne(
        { _id: assignment.ta },
        { $pull: { taAssignments: new ObjectId(assignmentId) } }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Assignment deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}

