import axios from "axios";
import { jwtVerify, createRemoteJWKSet } from "jose";
import "dotenv/config";

const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_DISCOVERY_URL = process.env.OAUTH_DISCOVERY_URL;

let oidcConfig = null;

export async function getOIDCConfig() {
    if (oidcConfig) return oidcConfig;
    const response = await axios.get(OAUTH_DISCOVERY_URL);
    oidcConfig = response.data;
    return oidcConfig;
}

export async function verifyIDToken(token) {
    const config = await getOIDCConfig();
    const JWKS = createRemoteJWKSet(new URL(config.jwks_uri));
    const verified = await jwtVerify(token, JWKS, {
        issuer: config.issuer,
        audience: OAUTH_CLIENT_ID,
    });
    return verified.payload;
}
