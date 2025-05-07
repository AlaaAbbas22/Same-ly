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