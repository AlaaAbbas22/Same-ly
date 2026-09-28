import { connectToDatabase } from "@/lib/db";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/email";
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

    // Check if user already exists in users collection
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 422 }
      );
    }

    // Check if user is already in the otps collection awaiting verification
    const existingOtpUser = await db.collection("otps").findOne({ email });
    if (existingOtpUser) {
      // For simplicity, we'll just resend OTP or inform user to check email
      // In a real app, you might want to rate-limit or allow OTP resend requests
      await sendOtpEmail(email, name, existingOtpUser.otp);
      return NextResponse.json(
        { message: "User awaiting verification. OTP re-sent to your email." },
        { status: 200 }
      );
    }

    const hashedPassword = await hash(password, 12);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    const result = await db.collection("otps").insertOne({
      name,
      email,
      password: hashedPassword,
      birthDate: new Date(birthDate),
      createdAt: new Date(),
      otp,
      otpExpires,
    });

    // Send OTP email
    await sendOtpEmail(email, name, otp);

    return NextResponse.json(
      { message: "User registered. Please check your email for OTP verification.", userId: result.insertedId.toString() },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}