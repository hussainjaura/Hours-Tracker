
// I made this acknowledgement.js so that the employer can see what acknowledgement mean and when student deletes
// adds otr updates his terms the employer would have to acknowledge them again:


// this checks if a term edit actually changed anything the employer would care about:
export function termDetailsChanged(oldData, newData) {
  const sameDate = (a, b) => new Date(a).getTime() === new Date(b).getTime();

  return (
    oldData.name !== newData.name ||
    oldData.academicYear !== newData.academicYear ||
    oldData.courseLevel !== newData.courseLevel ||
    !sameDate(oldData.startDate, newData.startDate) ||
    !sameDate(oldData.endDate, newData.endDate)
  );
}


// this clears every employer acknowledgement for a student after their terms change:
// it also writes one audit log per employer so the history shows why it was cleared:
export async function resetAcknowledgements(prisma, student, performedBy, reason) {
  const acknowledged = await prisma.studentEmployer.findMany({
    where: { studentId: student.id, acknowledgedAt: { not: null } },
  });

  // nothing to clear if no employer has acknowledged yet:
  if (acknowledged.length === 0) {
    return 0;
  }

  await prisma.studentEmployer.updateMany({
    where: { id: { in: acknowledged.map((rel) => rel.id) } },
    data: { acknowledgedAt: null, acknowledgedBy: null },
  });

  // this records the old acknowledgement in the audit trail so nothing is lost:
  for (const rel of acknowledged) {
    await prisma.auditLog.create({
      data: {
        action: "ACKNOWLEDGEMENT_RESET",
        entityType: "StudentEmployer",
        entityId: rel.id,
        performedBy,
        universityId: student.universityId,
        metadata: {
          reason,
          employerId: rel.employerId,
          previousAcknowledgedAt: rel.acknowledgedAt,
          previousAcknowledgedBy: rel.acknowledgedBy,
        },
      },
    });
  }

  return acknowledged.length;
}


// this finds which relationships lost their acknowledgement because the student changed their dates:
// it only counts resets after the link started, so an old reset does not show on a new request:
export async function findResetNotices(prisma, relationships) {
  const waiting = relationships.filter((rel) => !rel.acknowledgedAt);
  if (waiting.length === 0) {
    return {};
  }

  const resets = await prisma.auditLog.findMany({
    where: {
      action: "ACKNOWLEDGEMENT_RESET",
      entityType: "StudentEmployer",
      entityId: { in: waiting.map((rel) => rel.id) },
    },
    orderBy: { createdAt: "desc" },
  });

  // this keeps only the newest reset for each relationship:
  const notices = {};
  for (const rel of waiting) {
    const latest = resets.find((log) => log.entityId === rel.id && log.createdAt >= rel.linkedAt);
    if (latest) {
      notices[rel.id] = { resetAt: latest.createdAt, reason: latest.metadata?.reason || null };
    }
  }
  return notices;
}
