import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { teamId } = await request.json();
    
    if (!teamId) {
      return NextResponse.json({ 
        error: 'Team ID is required' 
      }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    
    // Check if the team exists
    const team = await db.collection('teams').findOne({ 
      _id: new ObjectId(teamId)
    });
    
    if (!team) {
      return NextResponse.json({ 
        error: 'Team not found' 
      }, { status: 404 });
    }
    
    // Check if user is already a member of the team
    const isEditor = team.editors.includes(session.user.id);
    const isStudent = team.students.includes(session.user.id);
    
    if (isEditor || isStudent) {
      return NextResponse.json({ 
        error: 'You are already a member of this team' 
      }, { status: 400 });
    }
    
    // Add user as a student
    await db.collection('teams').updateOne(
      { _id: new ObjectId(teamId) },
      { $addToSet: { students: session.user.id } }
    );
    
    // Update the user's teams array
    await db.collection('users').updateOne(
      { _id: new ObjectId(session.user.id) },
      { $addToSet: { studentTeams: teamId } }
    );
    
    return NextResponse.json({ 
      success: true,
      message: 'Successfully joined the team as a student'
    });
    
  } catch (error) {
    console.error('Error joining team:', error);
    return NextResponse.json({ error: 'Failed to join team' }, { status: 500 });
  }
}