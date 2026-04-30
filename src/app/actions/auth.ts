"use server";

import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function logoutStudio() {
  const cookieStore = await cookies();
  cookieStore.delete("studio_session");
  redirect("/login");
}

export async function signupStudio(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Missing required fields" };
  }

  try {
    const existingStudio = await prisma.studio.findUnique({
      where: { email },
    });

    if (existingStudio) {
      return { error: "Studio with this email already exists" };
    }

    const hashedPassword = await hash(password, 10);

    const studio = await prisma.studio.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    await setSessionCookie({ studioId: studio.id, email: studio.email });
  } catch (error: any) {
    return { error: error.message || "Failed to create studio" };
  }

  redirect("/admin");
}

export async function loginStudio(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Missing email or password" };
  }

  try {
    const studio = await prisma.studio.findUnique({
      where: { email },
    });

    if (!studio || !studio.password) {
      return { error: "Invalid email or password" };
    }

    const isMatch = await compare(password, studio.password);

    if (!isMatch) {
      return { error: "Invalid email or password" };
    }

    await setSessionCookie({ studioId: studio.id, email: studio.email });
  } catch (error: any) {
    return { error: error.message || "Login failed" };
  }

  redirect("/admin");
}
