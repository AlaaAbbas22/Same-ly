import { connectToDatabase } from "@/lib/db";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, birthDate } = body;

    // Validation
    if (!name || !email || !password || !birthDate) {
      return NextResponse.json(
        { message: "Invalid input" },
        { status: 422 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { message: "Invalid email" },
        { status: 422 }
      );
    }

    if (password.trim().length < 7) {
      return NextResponse.json(
        { message: "Password should be at least 7 characters long" },
        { status: 422 }
      );
    }

    const { db } = await connectToDatabase();

    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 422 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      birthDate: new Date(birthDate),
      createdAt: new Date(),
    });

    return NextResponse.json(
      { message: "User created", userId: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}