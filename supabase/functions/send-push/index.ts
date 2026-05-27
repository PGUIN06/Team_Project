// supabase/functions/send-push/index.ts
// Database Webhook 2개(messages INSERT / pot_members INSERT)가 호출하는 통합 Edge Function.
// 본인이 일으킨 이벤트는 본인에게 푸시 안 감 (actor 제외 필터).
//
// Deploy: Supabase Dashboard → Edge Functions → Create new (또는 supabase CLI)
// Verify JWT: OFF (Webhook이 service_role key로 호출하므로 별도 검증 불필요)
//
// 환경변수 (자동 주입): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: any;
  old_record: any;
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    if (payload.type !== "INSERT") {
      return jsonResponse({ skipped: `type=${payload.type}` });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (payload.table === "messages") {
      await handleNewMessage(supabase, payload.record);
    } else if (payload.table === "pot_members") {
      await handleNewMember(supabase, payload.record);
    } else {
      return jsonResponse({ skipped: `table=${payload.table}` });
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("[send-push] fatal:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// --- 새 메시지 푸시 ---
async function handleNewMessage(supabase: any, record: any) {
  const { pot_id, user_id: actorUserId, content } = record;
  if (!pot_id || !actorUserId) return;

  // 팟 정보 + 멤버(작성자 제외) + 작성자 닉네임 병렬 조회
  const [potResult, membersResult, actorResult] = await Promise.all([
    supabase.from("pots").select("id, name, emoji").eq("id", pot_id).maybeSingle(),
    supabase.from("pot_members").select("user_id").eq("pot_id", pot_id).neq("user_id", actorUserId),
    supabase.from("profiles").select("nickname").eq("id", actorUserId).maybeSingle(),
  ]);

  const pot = potResult.data;
  const members = membersResult.data ?? [];
  const senderName = actorResult.data?.nickname || "익명";
  if (!pot || members.length === 0) return;

  const userIds = members.map((m: any) => m.user_id);
  const { data: tokenRows } = await supabase
    .from("user_push_tokens")
    .select("token")
    .in("user_id", userIds);
  const tokens = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);
  if (tokens.length === 0) return;

  // 메시지 미리보기 (50자 자르기)
  const preview = content && content.length > 50 ? content.slice(0, 50) + "…" : (content || "");

  await sendExpoPush(tokens, {
    title: `${pot.emoji || "🍽️"} ${pot.name}`,
    body: `${senderName}: ${preview}`,
    data: { type: "message", potId: pot.id },
  });
}

// --- 새 멤버 참여 푸시 ---
async function handleNewMember(supabase: any, record: any) {
  const { pot_id, user_id: newMemberUserId } = record;
  if (!pot_id || !newMemberUserId) return;

  const [potResult, membersResult, newMemberResult] = await Promise.all([
    supabase.from("pots").select("id, name, emoji").eq("id", pot_id).maybeSingle(),
    supabase.from("pot_members").select("user_id").eq("pot_id", pot_id).neq("user_id", newMemberUserId),
    supabase.from("profiles").select("nickname").eq("id", newMemberUserId).maybeSingle(),
  ]);

  const pot = potResult.data;
  const members = membersResult.data ?? [];
  const newMemberName = newMemberResult.data?.nickname || "익명";
  // pot 없거나, 새 멤버 외 다른 멤버가 0명이면(즉 방장 자신이 만든 팟 첫 가입) 푸시 X
  if (!pot || members.length === 0) return;

  const userIds = members.map((m: any) => m.user_id);
  const { data: tokenRows } = await supabase
    .from("user_push_tokens")
    .select("token")
    .in("user_id", userIds);
  const tokens = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);
  if (tokens.length === 0) return;

  await sendExpoPush(tokens, {
    title: `${pot.emoji || "🍽️"} ${pot.name}`,
    body: `${newMemberName}님이 참여했어요`,
    data: { type: "new_member", potId: pot.id },
  });
}

// --- Expo Push API 호출 (최대 100개 배치) ---
async function sendExpoPush(
  tokens: string[],
  message: { title: string; body: string; data: any },
) {
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100));
  }
  for (const chunk of chunks) {
    const messages = chunk.map((token) => ({
      to: token,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data,
    }));
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    const result = await response.json().catch(() => ({}));
    console.log("[send-push] expo response:", JSON.stringify(result));
  }
}
