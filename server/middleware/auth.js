import { clerkClient, verifyToken } from "@clerk/express";

export const clerkAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const verified = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        clockSkewInMs: 60000
      });
      req.auth = () => ({ userId: verified.sub });
    } catch (error) {
      req.auth = () => ({ userId: null });
    }
  } else {
    req.auth = () => ({ userId: null });
  }
  next();
};

export const protectAdmin = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    
    if (!userId) {
      return res.json({ success: false, message: "not authorized" });
    }

    const user = await clerkClient.users.getUser(userId);
    if (user.privateMetadata.role !== "admin") {
      return res.json({ success: false, message: "not authorized" });
    }

    next();
    
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "not authorized" });
  }
};
