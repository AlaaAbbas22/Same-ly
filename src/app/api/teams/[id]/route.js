import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { ObjectId } from 'mongodb';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from '@/lib/mongodb';

// Get a single team with populated members
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }
    
    // Convert string ID to MongoDB ObjectId
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid team ID format' }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db();
    
    // Get the team
    const team = await db.collection('teams').findOne({ _id: objectId });
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    // Check if user is a member of the team
    const userId = session.user.id || session.user.sub;
    const isEditor = team.editors.includes(userId);
    const isStudent = team.students.includes(userId);
    
    // If user is not a member, return limited information
    if (!isEditor && !isStudent) {
      return NextResponse.json({
        _id: team._id,
        name: team.name,
        description: team.description,
        editors: [],
        students: []
      });
    }
    
    // Fetch editor user details
    const editorIds = team.editors.map(id => new ObjectId(id));
    const editors = await db.collection('users').find({ 
      _id: { $in: editorIds } 
    }).project({ 
      _id: 1,
      name: 1,
      email: 1
    }).toArray();
    
    // Fetch student user details
    const studentIds = team.students.map(id => new ObjectId(id));
    const students = await db.collection('users').find({ 
      _id: { $in: studentIds } 
    }).project({ 
      _id: 1,
      name: 1,
      email: 1
    }).toArray();
    
    // Return the team with populated editor and student arrays
    return NextResponse.json({
      ...team,
      editors,
      students
    });
    
  } catch (error) {
    console.error('Error fetching team details:', error);
    return NextResponse.json({ error: 'Failed to fetch team details' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, meetingTimes } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Team ID and new name are required' }, { status: 400 });
    }

    if (meetingTimes !== undefined) {
      if (!Array.isArray(meetingTimes)) {
        return NextResponse.json({ error: 'meetingTimes must be an array' }, { status: 400 });
      }

      for (const slot of meetingTimes) {
        const dayOfWeek = Number(slot?.dayOfWeek);
        if (
          !Number.isInteger(dayOfWeek) ||
          dayOfWeek < 0 ||
          dayOfWeek > 6 ||
          typeof slot?.startTime !== 'string' ||
          typeof slot?.endTime !== 'string' ||
          !/^\d{2}:\d{2}$/.test(slot.startTime) ||
          !/^\d{2}:\d{2}$/.test(slot.endTime) ||
          slot.endTime <= slot.startTime
        ) {
          return NextResponse.json({
            error: 'Each meeting time needs a day (0-6), startTime, and endTime (HH:MM) with end after start',
          }, { status: 400 });
        }
      }
    }

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid team ID format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const team = await db.collection('teams').findOne({ _id: objectId });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is an editor of the team
    const userId = session.user.id || session.user.sub;
    const isEditor = team.editors.includes(userId);

    if (!isEditor) {
      return NextResponse.json({ error: 'Forbidden: Only editors can update team details' }, { status: 403 });
    }

    const updateFields = { name };
    if (meetingTimes !== undefined) {
      updateFields.meetingTimes = meetingTimes.map((slot) => ({
        dayOfWeek: Number(slot.dayOfWeek),
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
    }

    const result = await db.collection('teams').updateOne(
      { _id: objectId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Team not found or no changes made' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Team settings updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating team details:', error);
    return NextResponse.json({ error: 'Failed to update team details' }, { status: 500 });
  }
}