import { verifyIDToken } from "../utils/oidc.js";

export async function authMiddleware(req, res, next) {
    const token = req.cookies.id_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        const payload = await verifyIDToken(token);
        req.user = { userId: payload.sub, userName: payload.name, email: payload.email };
        return next();
    } catch (err) {
        res.clearCookie("id_token");
        return res.status(401).json({ error: "Invalid token" });
    }
}

export async function socketVerify(token) {
    if (!token) throw new Error("No token");
    const payload = await verifyIDToken(token);
    return { userId: payload.sub, userName: payload.name };
}
