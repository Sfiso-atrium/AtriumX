// supabase/functions/moderate-group-image/index.ts
//
// Gatekeeper for study group image sharing. The browser no longer uploads
// directly to Storage — it sends the image here first. This function
// checks it against Sightengine's nudity model, and ONLY if it comes back
// clean does it get uploaded and the chat message created. If it's
// flagged, nothing is written anywhere — not Storage, not the messages
// table.
//
// auth: 'user' — called by the sender's own browser with their normal
// session, so ctx.supabase is scoped to their identity and enforces the
// exact same RLS policies a direct client upload always did (member-only
// bucket, own-subfolder, group membership on the message insert). This
// function only adds the moderation check in between — it doesn't bypass
// or duplicate any existing security rule.

import { withSupabase } from "jsr:@supabase/server@^1";

// Sightengine returns three probabilities (raw / partial / safe) that sum
// to ~1. Blocking on raw OR partial — not just raw — is intentional: this
// is a study group chat, there's no legitimate reason for lingerie/bikini
// content ("partial") to be shared here either.
const NUDITY_THRESHOLD = 0.5;

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const sightengineUser = Deno.env.get("SIGHTENGINE_API_USER");
    const sightengineSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
    if (!sightengineUser || !sightengineSecret) {
      return Response.json({ error: "Image moderation isn't configured." }, { status: 500 });
    }

    const { groupId, imageBase64, fileName } = await req.json();
    if (!groupId || !imageBase64 || !fileName) {
      return Response.json({ error: "Missing image data." }, { status: 400 });
    }

    const binary = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

    // Ask Sightengine before this image touches Storage at all.
    const form = new FormData();
    form.append("media", new Blob([binary], { type: "image/jpeg" }), fileName);
    form.append("models", "nudity-2.1");
    form.append("api_user", sightengineUser);
    form.append("api_secret", sightengineSecret);

    let nudity: { raw: number; partial: number; safe: number };
    try {
      const modRes = await fetch("https://api.sightengine.com/1.0/check.json", {
        method: "POST",
        body: form,
      });
      const modJson = await modRes.json();
      if (modJson.status !== "success" || !modJson.nudity) {
        throw new Error("unexpected moderation response");
      }
      nudity = modJson.nudity;
    } catch {
      // Fail CLOSED: if the moderation check itself can't be completed,
      // the image is not uploaded. Safer default for a student platform —
      // a rare "try again" beats an unverified image getting through
      // during a moderation-service outage.
      return Response.json(
        { error: "Couldn't verify this image right now — try again in a moment." },
        { status: 502 }
      );
    }

    if (nudity.raw >= NUDITY_THRESHOLD || nudity.partial >= NUDITY_THRESHOLD) {
      return Response.json(
        { error: "This image was blocked by content moderation." },
        { status: 422 }
      );
    }

    // Clean — now actually store it, using the caller's own RLS-scoped
    // client so group membership and bucket ownership rules apply exactly
    // as they always did.
    const path = `${groupId}/${ctx.userClaims!.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await ctx.supabase.storage
      .from("study-group-images")
      .upload(path, binary, { contentType: "image/jpeg" });
    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 400 });
    }

    const { error: insertError } = await ctx.supabase
      .from("study_group_messages")
      .insert({ group_id: groupId, sender_id: ctx.userClaims!.id, image_url: path });
    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 400 });
    }

    return Response.json({ ok: true, path });
  }),
};
