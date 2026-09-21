// supabase/functions/delete-chat-image/index.ts
//
// Removes a one-time-view chat photo from Storage after the recipient has
// seen it. Called by the delete_chat_image_after_seen trigger (migration
// 049) via pg_net the moment messages.image_seen_at is set - never by a
// browser.
//
// Secured the same way as send-message-push: a shared secret header
// checked against the CRON_SECRET Edge Function secret, proving the
// caller is our own trusted Postgres.
//
// Safe to run more than once: if the file is already gone, or the message
// has no image left, it does nothing. If removing the file fails, the row
// is left untouched (image_path still set) so the next "seen" call retries.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messageId: string | undefined;
  try {
    ({ message_id: messageId } = await req.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!messageId) {
    return Response.json({ error: "message_id is required" }, { status: 400 });
  }

  const { data: msg, error: readError } = await supabase
    .from("messages")
    .select("id, image_path, image_seen_at")
    .eq("id", messageId)
    .maybeSingle();
  if (readError) {
    return Response.json({ error: readError.message }, { status: 500 });
  }

  // Only ever delete a photo that has really been marked as seen.
  if (!msg || !msg.image_path || !msg.image_seen_at) {
    return Response.json({ ok: true, skipped: true });
  }

  const { error: removeError } = await supabase.storage
    .from("chat-images")
    .remove([msg.image_path]);
  if (removeError) {
    return Response.json({ error: removeError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("messages")
    .update({ image_path: null, image_deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("image_path", msg.image_path);
  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true, deleted: true });
});
