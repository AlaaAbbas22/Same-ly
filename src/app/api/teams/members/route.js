import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ObjectId } from 'mongodb';

// Add a member to a team
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { teamId, email, userId, role } = await request.json();
    
    if (!teamId || (!email && !userId) || !role) {
      return NextResponse.json({ 
        error: 'Team ID, user email or ID, and role are required' 
      }, { status: 400 });
    }
    
    if (role !== 'editor' && role !== 'student') {
      return NextResponse.json({ 
        error: 'Role must be either "editor" or "student"' 
      }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    
    console.log(session.user.id)
    // Check if the current user is an editor of the team
    const team = await db.collection('teams').findOne({ 
      _id: new ObjectId(teamId),
      editors: session.user.id
    });
    
    if (!team) {
      return NextResponse.json({ 
        error: 'You do not have permission to add members to this team' 
      }, { status: 403 });
    }
    
    // Find the user by email or ID
    let user;
    if (email) {
      user = await db.collection('users').findOne({ email });
    } else {
      user = await db.collection('users').findOne({ _id: userId });
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    const userIdToAdd = user._id.toString();
    
    // Check if user is already a member of the team in the specified role
    if (role === 'editor' && team.editors.includes(userIdToAdd)) {
      return NextResponse.json({ 
        error: 'User is already an editor of this team' 
      }, { status: 400 });
    }
    
    if (role === 'student' && team.students.includes(userIdToAdd)) {
      return NextResponse.json({ 
        error: 'User is already a student in this team' 
      }, { status: 400 });
    }
    
    // Update the team with the new member
    const fieldToUpdate = role === 'editor' ? 'editors' : 'students';
    await db.collection('teams').updateOne(
      { _id: new ObjectId(teamId) },
      { $addToSet: { [fieldToUpdate]: userIdToAdd } }
    );
    
    // Update the user's teams array
    const userFieldToUpdate = role === 'editor' ? 'editingTeams' : 'studentTeams';
    await db.collection('users').updateOne(
      { _id: userIdToAdd },
      { $addToSet: { [userFieldToUpdate]: teamId } }
    );
    
    return NextResponse.json({ 
      success: true,
      message: `User added as ${role} successfully` 
    });
    
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
  }
}

// Remove a member from a team
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { teamId, userId, email, role } = await request.json();
    
    if (!teamId || (!userId && !email) || !role) {
      return NextResponse.json({ 
        error: 'Team ID, user ID or email, and role are required' 
      }, { status: 400 });
    }
    
    if (role !== 'editor' && role !== 'student') {
      return NextResponse.json({ 
        error: 'Role must be either "editor" or "student"' 
      }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    
    // Check if the current user is an editor of the team
    const team = await db.collection('teams').findOne({ 
      _id: new ObjectId(teamId),
      editors: session.user.id
    });
    
    if (!team) {
      return NextResponse.json({ 
        error: 'You do not have permission to remove members from this team' 
      }, { status: 403 });
    }
    
    // Find the user by email or ID if email is provided
    let userIdToRemove = userId;
    if (email) {
      const user = await db.collection('users').findOne({ email });
      if (!user) {
        return NextResponse.json({ 
          error: 'User not found' 
        }, { status: 404 });
      }
      userIdToRemove = user._id.toString();
    }
    
    // Update the team by removing the member
    const fieldToUpdate = role === 'editor' ? 'editors' : 'students';
    await db.collection('teams').updateOne(
      { _id: new ObjectId(teamId) },
      { $pull: { [fieldToUpdate]: userIdToRemove } }
    );
    
    // Update the user's teams array
    const userFieldToUpdate = role === 'editor' ? 'editingTeams' : 'studentTeams';
    await db.collection('users').updateOne(
      { _id: userIdToRemove },
      { $pull: { [userFieldToUpdate]: teamId } }
    );
    
    return NextResponse.json({ 
      success: true,
      message: `User removed as ${role} successfully` 
    });
    
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}