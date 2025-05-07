import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from '@/lib/mongodb';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id || session.user.sub;

    const client = await clientPromise;
    const db = client.db();

    // Find teams where user is editor
    const teams = await db.collection('teams').find({ editors: userId }).toArray();
    const teamIds = teams.map(t => t._id);

    let assignments = [];
    if (teamIds.length > 0) {
      // If user is editor, show all assignments for those teams
      assignments = await db.collection('assignments').find({
        teamId: { $in: teamIds }
      }).toArray();
    } else {
      // Otherwise, show assignments where user is TA
      assignments = await db.collection('assignments').find({
        ta: userId
      }).toArray();
    }

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching TA assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}