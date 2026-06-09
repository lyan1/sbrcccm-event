import { prisma } from "./db";

export async function upsertEventLocation(name: string, address: string) {
  const trimmedName = name.trim();
  const trimmedAddress = address.trim();
  if (!trimmedName || !trimmedAddress) return;

  await prisma.eventLocation.upsert({
    where: { name: trimmedName },
    create: { name: trimmedName, address: trimmedAddress },
    update: { address: trimmedAddress },
  });
}
