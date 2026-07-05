import { google } from 'googleapis';
import { Readable } from 'stream';
import { env, GOOGLE_SCOPES } from './env';

// Builds an OAuth2 client bound to this deployment's redirect URI.
export function oauthClient() {
  return new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    env.redirectUri
  );
}

// URL the user is sent to in order to grant access.
export function buildAuthUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

// Exchanges an authorization code for tokens + verified user profile.
export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  profile: GoogleProfile;
}> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  if (!tokens.id_token) {
    throw new Error('No id_token returned from Google');
  }
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.googleClientId,
  });
  const p = ticket.getPayload();
  if (!p || !p.sub || !p.email) {
    throw new Error('Invalid id_token payload');
  }

  return {
    accessToken: tokens.access_token || '',
    refreshToken: tokens.refresh_token || undefined,
    profile: {
      sub: p.sub,
      email: p.email,
      name: p.name || p.email,
      picture: p.picture,
    },
  };
}

// Uploads a PDF buffer to the user's Google Drive, returns file id + web link.
export async function uploadPdfToDrive(
  accessToken: string,
  fileName: string,
  pdf: Buffer
): Promise<{ fileId: string; webViewLink: string }> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'application/pdf',
    },
    media: {
      mimeType: 'application/pdf',
      body: Readable.from(pdf),
    },
    fields: 'id, webViewLink',
  });

  const fileId = res.data.id;
  if (!fileId) {
    throw new Error('Drive upload did not return a file id');
  }

  // Make the file readable by anyone with the link so the returned link works.
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return {
    fileId,
    webViewLink:
      res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
  };
}
