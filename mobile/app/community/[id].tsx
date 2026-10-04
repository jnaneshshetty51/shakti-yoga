import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, BodyText, Card, LoadingView, EmptyState, Heading } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ReactionPills, ReactionPickerModal, type AllowedReaction } from "@/components/ReactionPicker";
import { MemberProfileModal } from "@/components/MemberProfileModal";
import { api, ApiError } from "@/lib/api";
import { colors, spacing, radius, shadows } from "@/theme";

interface PostDetail {
  id: string;
  body: string;
  imageUrl: string | null;
  author: string;
  authorId: string;
  avatarUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  mine: boolean;
  liked: boolean;
  userReaction: string | null;
  reactionCounts: Record<string, number>;
}

interface CommentItem {
  id: string;
  body: string;
  parentId: string | null;
  author: string;
  authorId: string;
  avatarUrl: string | null;
  createdAt: string;
  mine: boolean;
  replies: CommentItem[];
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & Popovers
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Comment input
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchPostAndComments = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [postRes, commentsRes] = await Promise.all([
        api.get<{ post: PostDetail }>(`/api/community/posts/${id}`),
        api.get<{ comments: CommentItem[] }>(`/api/community/posts/${id}/comments`),
      ]);
      setPost(postRes.post);
      setComments(commentsRes.comments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this post.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPostAndComments();
  }, [fetchPostAndComments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPostAndComments();
  };

  const handleReaction = async (rx: AllowedReaction = "❤️") => {
    if (!post) return;
    const isTogglingOff = post.userReaction === rx;
    const prevReaction = post.userReaction;
    const prevCounts = { ...post.reactionCounts };
    const prevLikeCount = post.likeCount;

    // Optimistic update
    const newCounts = { ...prevCounts };
    if (prevReaction) {
      newCounts[prevReaction] = Math.max(0, (newCounts[prevReaction] || 1) - 1);
    }
    if (!isTogglingOff) {
      newCounts[rx] = (newCounts[rx] || 0) + 1;
    }

    setPost({
      ...post,
      userReaction: isTogglingOff ? null : rx,
      liked: !isTogglingOff,
      likeCount: isTogglingOff ? prevLikeCount - 1 : prevReaction ? prevLikeCount : prevLikeCount + 1,
      reactionCounts: newCounts,
    });

    try {
      const res = await api.post<{
        on: boolean;
        reaction: string | null;
        likeCount: number;
        reactionCounts: Record<string, number>;
      }>(`/api/community/posts/${post.id}/like`, { reaction: rx });

      setPost((prev) =>
        prev
          ? {
              ...prev,
              userReaction: res.reaction,
              liked: res.on,
              likeCount: res.likeCount,
              reactionCounts: res.reactionCounts,
            }
          : null,
      );
    } catch {
      // Revert
      setPost((prev) =>
        prev
          ? {
              ...prev,
              userReaction: prevReaction,
              liked: Boolean(prevReaction),
              likeCount: prevLikeCount,
              reactionCounts: prevCounts,
            }
          : null,
      );
    }
  };

  const handleReportPost = () => {
    if (!post) return;
    Alert.alert("Report Post", "Flag this post for review by the community team?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/api/community/posts/${post.id}/report`, { reason: "Inappropriate" });
            Alert.alert("Reported", "Thank you. Our team will review this post.");
          } catch {
            Alert.alert("Error", "Could not submit report.");
          }
        },
      },
    ]);
  };

  const handleDeletePost = () => {
    if (!post) return;
    Alert.alert("Delete Post", "Are you sure you want to remove your post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del(`/api/community/posts/${post.id}`);
            router.back();
          } catch {
            Alert.alert("Error", "Could not delete post.");
          }
        },
      },
    ]);
  };

  const handleSendComment = async () => {
    if (!post) return;
    const body = commentText.trim();
    if (!body) return;

    setSubmittingComment(true);
    try {
      const res = await api.post<{ comment: CommentItem }>(`/api/community/posts/${post.id}/comments`, {
        body,
        parentId: replyingTo?.id,
      });

      setCommentText("");
      setReplyingTo(null);

      if (replyingTo) {
        // Append to parent's replies
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyingTo.id ? { ...c, replies: [...(c.replies || []), res.comment] } : c,
          ),
        );
      } else {
        // Append top level
        setComments((prev) => [...prev, res.comment]);
      }

      setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : null));
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "Couldn't send comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string, isReply = false, parentId?: string) => {
    if (!post) return;
    Alert.alert("Delete Comment", "Remove your comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del(`/api/community/posts/${post.id}/comments/${commentId}`);
            if (isReply && parentId) {
              setComments((prev) =>
                prev.map((c) =>
                  c.id === parentId
                    ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) }
                    : c,
                ),
              );
            } else {
              setComments((prev) => prev.filter((c) => c.id !== commentId));
            }
            setPost((prev) => (prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : null));
          } catch {
            Alert.alert("Error", "Could not delete comment.");
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title="Discussion" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {loading ? (
          <LoadingView />
        ) : error || !post ? (
          <EmptyState
            title="Could not load discussion"
            subtitle={error || "This post may have been removed."}
            onRetry={fetchPostAndComments}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
          >
            {/* Post Card */}
            <Card style={styles.postCard}>
              <View style={styles.authorRow}>
                <Pressable
                  onPress={() => setSelectedProfileId(post.authorId)}
                  style={styles.authorPressable}
                >
                  {post.avatarUrl ? (
                    <Image source={{ uri: post.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <BodyText style={{ color: colors.white, fontWeight: "700" }}>
                        {post.author.charAt(0).toUpperCase()}
                      </BodyText>
                    </View>
                  )}
                  <View>
                    <BodyText style={{ fontWeight: "700" }}>{post.author}</BodyText>
                    <BodyText muted style={{ fontSize: 12 }}>{timeAgo(post.createdAt)}</BodyText>
                  </View>
                </Pressable>

                <View style={styles.menuActions}>
                  {post.mine ? (
                    <Pressable onPress={handleDeletePost} hitSlop={8} style={styles.menuBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  ) : (
                    <Pressable onPress={handleReportPost} hitSlop={8} style={styles.menuBtn}>
                      <Ionicons name="flag-outline" size={17} color={colors.muted} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Image-only posts store a single-space placeholder server-side */}
              {post.body.trim() ? <BodyText style={styles.postText}>{post.body}</BodyText> : null}

              {post.imageUrl && (
                <Image source={{ uri: post.imageUrl }} style={styles.fullPostImage} resizeMode="cover" />
              )}

              {/* Reaction Pills Section */}
              <View style={styles.reactionSection}>
                <ReactionPills
                  reactions={post.reactionCounts}
                  userReaction={post.userReaction}
                  likeCount={post.likeCount}
                  onToggleReaction={(rx) => handleReaction(rx)}
                  onOpenPicker={() => setPickerVisible(true)}
                />
              </View>
            </Card>

            {/* Comments Section Title */}
            <View style={styles.sectionHeader}>
              <Heading size="sm">Comments ({post.commentCount})</Heading>
            </View>

            {/* Comments Thread List */}
            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.muted} />
                <BodyText muted style={{ marginTop: spacing.xs, fontSize: 14 }}>
                  No comments yet. Be the first to share your thoughts!
                </BodyText>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentThread}>
                  {/* Top Level Comment */}
                  <View style={styles.commentBox}>
                    <Pressable
                      onPress={() => setSelectedProfileId(comment.authorId)}
                      style={styles.commentAuthor}
                    >
                      {comment.avatarUrl ? (
                        <Image source={{ uri: comment.avatarUrl }} style={styles.commentAvatar} />
                      ) : (
                        <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                          <BodyText style={{ color: colors.white, fontSize: 11, fontWeight: "700" }}>
                            {comment.author.charAt(0).toUpperCase()}
                          </BodyText>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={styles.commentNameRow}>
                          <BodyText style={{ fontWeight: "700", fontSize: 13 }}>{comment.author}</BodyText>
                          <BodyText muted style={{ fontSize: 11 }}>{timeAgo(comment.createdAt)}</BodyText>
                        </View>
                        <BodyText style={styles.commentBody}>{comment.body}</BodyText>
                      </View>
                    </Pressable>

                    {/* Actions on comment */}
                    <View style={styles.commentActions}>
                      <Pressable
                        onPress={() => setReplyingTo({ id: comment.id, author: comment.author })}
                        style={styles.commentActionBtn}
                        hitSlop={6}
                      >
                        <Ionicons name="return-down-forward" size={13} color={colors.primary} />
                        <BodyText style={styles.actionBtnText}>Reply</BodyText>
                      </Pressable>
                      {comment.mine && (
                        <Pressable
                          onPress={() => handleDeleteComment(comment.id)}
                          style={styles.commentActionBtn}
                          hitSlop={6}
                        >
                          <Ionicons name="trash-outline" size={12} color={colors.danger} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {/* Nested Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <View style={styles.repliesList}>
                      {comment.replies.map((reply) => (
                        <View key={reply.id} style={styles.replyBox}>
                          <Pressable
                            onPress={() => setSelectedProfileId(reply.authorId)}
                            style={styles.commentAuthor}
                          >
                            {reply.avatarUrl ? (
                              <Image source={{ uri: reply.avatarUrl }} style={styles.replyAvatar} />
                            ) : (
                              <View style={[styles.replyAvatar, styles.avatarPlaceholder]}>
                                <BodyText style={{ color: colors.white, fontSize: 10, fontWeight: "700" }}>
                                  {reply.author.charAt(0).toUpperCase()}
                                </BodyText>
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <View style={styles.commentNameRow}>
                                <BodyText style={{ fontWeight: "700", fontSize: 12 }}>{reply.author}</BodyText>
                                <BodyText muted style={{ fontSize: 10 }}>{timeAgo(reply.createdAt)}</BodyText>
                              </View>
                              <BodyText style={styles.replyBody}>{reply.body}</BodyText>
                            </View>
                          </Pressable>
                          {reply.mine && (
                            <Pressable
                              onPress={() => handleDeleteComment(reply.id, true, comment.id)}
                              style={styles.replyDeleteBtn}
                              hitSlop={6}
                            >
                              <Ionicons name="trash-outline" size={11} color={colors.danger} />
                            </Pressable>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Comment Input Composer (Sticky Bottom) */}
        {post && (
          <View style={styles.composerBar}>
            {replyingTo && (
              <View style={styles.replyingBanner}>
                <BodyText style={styles.replyingText}>
                  Replying to <BodyText style={{ fontWeight: "700" }}>{replyingTo.author}</BodyText>
                </BodyText>
                <Pressable onPress={() => setReplyingTo(null)} hitSlop={6}>
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                placeholder={replyingTo ? `Reply to ${replyingTo.author}...` : "Write a comment..."}
                placeholderTextColor={colors.muted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={1000}
              />
              <Pressable
                onPress={handleSendComment}
                disabled={submittingComment || !commentText.trim()}
                style={[
                  styles.sendBtn,
                  commentText.trim() ? styles.sendBtnActive : styles.sendBtnDisabled,
                ]}
                hitSlop={6}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={commentText.trim() ? colors.white : colors.muted}
                />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Popovers / Modals */}
      <ReactionPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleReaction}
        currentReaction={post?.userReaction}
      />

      <MemberProfileModal
        memberId={selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  postCard: {
    padding: spacing.md,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  menuActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  menuBtn: {
    padding: spacing.xs,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
    color: colors.text,
  },
  fullPostImage: {
    width: "100%",
    height: 240,
    borderRadius: radius.control,
    marginTop: spacing.md,
  },
  reactionSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyComments: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  commentThread: {
    marginBottom: spacing.md,
  },
  commentBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    ...shadows.subtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  commentAuthor: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commentBody: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
    color: colors.text,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  commentActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  actionBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  repliesList: {
    marginLeft: spacing.lg,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.sage,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  replyBox: {
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  replyBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    color: colors.text,
  },
  replyDeleteBtn: {
    padding: 4,
  },
  composerBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.card,
  },
  replyingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.sage,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.control,
    marginBottom: spacing.xs,
  },
  replyingText: {
    fontSize: 12,
    color: colors.sageText,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inputField: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxHeight: 90,
    fontSize: 14,
    color: colors.text,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
});
