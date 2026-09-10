import React, { useState } from "react";
import { ScrollView, View, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Screen, BodyText, Card, Button, Badge, LoadingView, EmptyState } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { colors, spacing, radius } from "@/theme";

interface Message {
  id: string;
  senderRole: string;
  body: string;
  createdAt: string;
}
interface Conversation {
  id: string;
  subject: string | null;
  status: "OPEN" | "CLOSED";
  messages: Message[];
}

export default function SupportScreen() {
  const { data, loading, error, reload } = useResource(
    () => api.get<{ conversation: Conversation | null }>("/api/support"),
    [],
  );
  const conversation = data?.conversation ?? null;
  const isOpen = conversation?.status === "OPEN";

  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const start = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    setSendError(null);
    try {
      await api.post("/api/support", { subject: subject.trim() || null, message: draft.trim() });
      setDraft("");
      setSubject("");
      await reload();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Could not start conversation");
    } finally {
      setBusy(false);
    }
  };

  const reply = async () => {
    if (!draft.trim() || !conversation) return;
    setBusy(true);
    setSendError(null);
    try {
      await api.post(`/api/support/${conversation.id}/messages`, { message: draft.trim() });
      setDraft("");
      await reload();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Could not send message");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Support" />
      {loading ? (
        <LoadingView />
      ) : error ? (
        <EmptyState title="Couldn't load Support" subtitle={error} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            {conversation && (
              <Card style={{ marginBottom: spacing.md }}>
                <View style={styles.rowBetween}>
                  <BodyText style={{ fontWeight: "700" }}>{conversation.subject || "Your conversation"}</BodyText>
                  <Badge tone={isOpen ? "neutral" : "success"}>{isOpen ? "Open" : "Closed"}</Badge>
                </View>
                <View style={{ marginTop: spacing.sm }}>
                  {conversation.messages.map((m) => (
                    <View
                      key={m.id}
                      style={[styles.bubble, m.senderRole === "member" ? styles.mine : styles.theirs]}
                    >
                      <BodyText style={{ color: m.senderRole === "member" ? colors.white : colors.text }}>
                        {m.body}
                      </BodyText>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {sendError && <BodyText style={{ color: colors.danger, marginBottom: spacing.sm }}>{sendError}</BodyText>}

            {!conversation || !isOpen ? (
              <Card>
                {conversation && !isOpen && (
                  <BodyText muted style={{ marginBottom: spacing.sm }}>
                    That conversation is closed. Start a new one below.
                  </BodyText>
                )}
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Subject (optional)"
                  placeholderTextColor={colors.muted}
                />
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="How can we help?"
                  placeholderTextColor={colors.muted}
                  multiline
                />
                <Button style={{ marginTop: spacing.sm }} loading={busy} disabled={!draft.trim()} onPress={start}>
                  Start Conversation
                </Button>
              </Card>
            ) : (
              <View style={styles.replyRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Type a message…"
                  placeholderTextColor={colors.muted}
                />
                <Button loading={busy} disabled={!draft.trim()} onPress={reply}>Send</Button>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bubble: { borderRadius: radius.card, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.xs, maxWidth: "85%" },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.border },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  replyRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
});
