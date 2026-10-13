/**
 * Employer access rules.
 *
 * An employer may only see a student's personal details (name, visa type,
 * work eligibility, term letter) once the student has ACCEPTED their access
 * request. Searching by University ID or sending a request is not enough.
 */


// Returns the employer's link to this student, or null if there isn't one:
export async function findRelationship(prisma, studentId, employerUserId) {
  return prisma.studentEmployer.findUnique({
    where: {
      studentId_employerId: {
        studentId,
        employerId: employerUserId,
      },
    },
  });
}


// True only when the student has accepted this employer:
export async function hasActiveAccess(prisma, studentId, employerUserId) {
  const relationship = await findRelationship(prisma, studentId, employerUserId);
  return relationship?.status === "ACTIVE";
}
