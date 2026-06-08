import { AuditActorType, Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function logAudit(params: {
  actorType: AuditActorType;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorType: params.actorType,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValueJson: params.oldValue as Prisma.InputJsonValue | undefined,
      newValueJson: params.newValue as Prisma.InputJsonValue | undefined,
    },
  });
}
