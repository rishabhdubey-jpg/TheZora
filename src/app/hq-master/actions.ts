"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function verifySuperAdmin() {
  const session = await getSession();
  if (!session) return false;

  const studio = await prisma.studio.findUnique({
    where: { id: session.studioId },
    select: { isSuperAdmin: true },
  });

  return studio?.isSuperAdmin === true;
}

export async function approveStudio(studioId: string) {
  if (!(await verifySuperAdmin())) {
    throw new Error("Unauthorized");
  }

  await prisma.studio.update({
    where: { id: studioId },
    data: { accountStatus: "ACTIVE" },
  });

  revalidatePath("/hq-master");
}

export async function blockStudio(studioId: string) {
  if (!(await verifySuperAdmin())) {
    throw new Error("Unauthorized");
  }

  await prisma.studio.update({
    where: { id: studioId },
    data: { accountStatus: "BLOCKED" },
  });

  revalidatePath("/hq-master");
}
