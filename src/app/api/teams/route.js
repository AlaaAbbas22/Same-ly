import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET handler to fetch teams for the current user
export async function GET() {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const client = await clientPromise;
    const db = client.db();
    const userId = session.user.id;
    
    // Find teams where the user is an editor
    const editingTeams = await db.collection('teams')
      .find({ 
        editors: userId 
      })
      .toArray();
    
    // Find teams where the user is a student
    const studentTeams = await db.collection('teams')
      .find({ 
        students: userId,
        editors: { $ne: userId } // Exclude teams where user is also an editor
      })
      .toArray();
    
    return NextResponse.json({ 
      editingTeams, 
      studentTeams 
    });
    
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// POST handler to create a new team
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const client = await clientPromise;
    const db = client.db();
    const userId = session.user.id;
    
    // Parse the request body
    const { name, description } = await request.json();
    
    // Validate the team name
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }
    
    // Create the new team
    const result = await db.collection('teams').insertOne({
      name,
      description: description || '',
      editors: [userId], // Add current user as an editor
      students: [],
      createdAt: new Date(),
      createdBy: userId
    });
    
    // Get the newly created team
    const team = await db.collection('teams').findOne({ _id: result.insertedId });
    
    return NextResponse.json(team);
    
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}