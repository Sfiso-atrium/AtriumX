// supabase/functions/send-chat-image/index.ts
//
// Sends a one-time-view photo in a 1:1 trade chat. Same shape as
// moderate-group-image: the browser never uploads to Storage itself, it
// sends the photo here first, and it is only stored - and the chat message
// only created - if Sightengine's nudity model says it's clean.
//
// auth: 'user' - called with the sender's own session. That session is
// used for the conversation lookup and for inserting the message, so the
// existing RLS rules (must be in the conversation, conversation not closed
// by an admin, Noticeboard businesses can't reply) apply exactly as they
// do for a text message. The upload itself uses the service role because
// the chat-images bucket has no client-side insert policy on purpose -
// that is what makes this moderation step impossible to skip.
//
// The photo is removed again by delete-chat-image once the recipient has
// seen it (see migration 049).

import { withSupabase } from "jsr:@supabase/server@^1";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Blocking on raw OR partial, same as the group chat gate.
const NUDITY_THRESHOLD = 0.5;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_CAPTION = 500;
const IMAGE_PLACEHOLDER = "📷 Photo";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const sightengineUser = Deno.env.get("SIGHTENGINE_API_USER");
    const sightengineSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
    if (!sightengineUser || !sightengineSecret) {
      return Response.json({ error: "Image moderation isn't configured." }, { status: 500 });
    }

    const { conversationId, imageBase64, fileName, caption } = await req.json();
    if (!conversationId || !imageBase64 || !fileName) {
      return Response.json({ error: "Missing image data." }, { status: 400 });
    }
    const userId = ctx.userClaims!.id;

    // RLS scopes this to conversations the caller is actually in.
    const { data: conv } = await ctx.supabase
      .from("conversations")
      .select("id, is_closed_by_admin")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) {
      return Response.json({ error: "Conversation not found." }, { status: 404 });
    }
    if (conv.is_closed_by_admin) {
      return Response.json({ error: "This conversation is no longer available." }, { status: 403 });
    }

    let binary: Uint8Array;
    try {
      binary = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    } catch {
      return Response.json({ error: "That image couldn't be read." }, { status: 400 });
    }
    if (binary.length > MAX_BYTES) {
      return Response.json({ error: "That image is too large." }, { status: 413 });
    }
    // The app converts everything to JPEG before sending; anything else
    // (e.g. a format the browser couldn't convert) is refused here.
    if (!(binary[0] === 0xff && binary[1] === 0xd8 && binary[2] === 0xff)) {
      return Response.json({ error: "Please choose a JPEG, PNG or WebP photo." }, { status: 415 });
    }

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
      // Fail CLOSED, same as the group chat gate.
      return Response.json(
        { error: "Couldn't verify this image right now — try again in a moment." },
        { status: 502 },
      );
    }

    if (nudity.raw >= NUDITY_THRESHOLD || nudity.partial >= NUDITY_THRESHOLD) {
      return Response.json({ error: "This image was blocked by content moderation." }, { status: 422 });
    }

    const path = `${conversationId}/${userId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await admin.storage
      .from("chat-images")
      .upload(path, binary, { contentType: "image/jpeg" });
    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 400 });
    }

    const text = typeof caption === "string" ? caption.trim().slice(0, MAX_CAPTION) : "";
    const { error: insertError } = await ctx.supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: text || IMAGE_PLACEHOLDER,
        image_path: path,
      });
    if (insertError) {
      // Don't leave an orphaned file behind if the message was refused.
      await admin.storage.from("chat-images").remove([path]);
      return Response.json({ error: insertError.message }, { status: 400 });
    }

    return Response.json({ ok: true });
  }),
};
