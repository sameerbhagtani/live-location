import { getOIDCConfig, verifyIDToken } from "../utils/oidc.js";
import "dotenv/config";
import axios from "axios";

const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

export async function login(req, res) {
    const config = await getOIDCConfig();
    const params = new URLSearchParams({
        client_id: OAUTH_CLIENT_ID,
        redirect_uri: OAUTH_REDIRECT_URI,
        response_type: "code",
        scope: "openid profile email",
        state: Math.random().toString(36).substring(7),
    });
    return res.redirect(`${config.authorization_endpoint}?${params}`);
}

export async function callback(req, res) {
    const code = req.query.code;
    if (!code)
        return res.status(400).json({ error: "Missing authorization code" });

    const config = await getOIDCConfig();
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", String(code));
    params.append("client_id", OAUTH_CLIENT_ID);
    params.append("client_secret", OAUTH_CLIENT_SECRET);
    params.append("redirect_uri", OAUTH_REDIRECT_URI);

    const tokenResponse = await axios.post(
        config.token_endpoint,
        params.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const { id_token } = tokenResponse.data;
    const payload = await verifyIDToken(id_token);

    res.cookie("id_token", id_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600 * 1000,
    });
    return res.redirect("/");
}

export async function me(req, res) {
    return res.json(req.user || null);
}

export async function logout(req, res) {
    res.clearCookie("id_token");
    return res.redirect("/");
}
