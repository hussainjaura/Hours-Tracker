import prisma from "../prisma.js";

// this stops the important actions until the user has verified their email:
// it runs after authenticate, so req.user is already the logged in user:
export async function requireVerifiedEmail(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { emailVerifiedAt: true },
    });

    // the error code lets the website show a "verify your email" message:
    if (!user?.emailVerifiedAt) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Please verify your email address first. Use the link we emailed you, or send a new one from the banner at the top of your dashboard.",
          code: "EMAIL_NOT_VERIFIED",
        },
      });
    }

    next();
  } catch (error) {
    console.error("VERIFIED EMAIL CHECK ERROR:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
