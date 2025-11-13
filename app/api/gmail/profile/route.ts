import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorised", { status: 401 });
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2.setCredentials({
    access_token: (session as any).access_token,
    refresh_token: (session as any).refresh_token,
  });

  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2 });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const emailAddress = profile.data?.emailAddress ?? session.user?.email ?? "";

    if (!emailAddress) {
      return Response.json(
        { error: "Email address unavailable" },
        { status: 404 },
      );
    }

    return Response.json({ email: emailAddress });
  } catch (error) {
    console.error("Failed to fetch Gmail profile", error);
    return Response.json({ error: "Failed to fetch Gmail profile" }, { status: 500 });
  }
}
