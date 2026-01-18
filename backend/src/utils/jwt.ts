import jwt from "jsonwebtoken";

export const generateToken = (userId: string, role: string) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};
