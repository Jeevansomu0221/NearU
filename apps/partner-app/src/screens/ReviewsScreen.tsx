import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getPartnerReviews,
  type PartnerOrderReview,
  type PartnerReviewsResponse
} from "../api/partner.api";
import { usePartnerTheme } from "../context/PartnerThemeContext";
import type { PartnerTheme } from "../theme";

const formatDateTime = (value?: string) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatMoney = (amount?: number) => `Rs ${Math.round(Number(amount || 0)).toLocaleString("en-IN")}`;

const renderStars = (rating: number) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((score) => (
      <Ionicons
        key={score}
        name={score <= rating ? "star" : "star-outline"}
        size={14}
        color={score <= rating ? "#F59E0B" : "#CBD5E1"}
      />
    ))}
  </View>
);

export default function ReviewsScreen() {
  const { theme } = usePartnerTheme();
  const themedStyles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<Pick<PartnerReviewsResponse, "rating" | "ratingCount" | "total"> | null>(null);
  const [reviews, setReviews] = useState<PartnerOrderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadReviews = useCallback(async (pageToLoad = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else if (!append && pageToLoad === 1) {
        setLoading(true);
      }

      const response = await getPartnerReviews({ page: pageToLoad, limit: 20 });
      const responseData = response.data;

      if (!responseData?.success || !responseData.data) {
        throw new Error(responseData?.message || "Failed to load reviews");
      }

      const payload = responseData.data;
      setSummary({
        rating: payload.rating,
        ratingCount: payload.ratingCount,
        total: payload.total
      });
      setReviews((current) => (append ? [...current, ...payload.reviews] : payload.reviews));
      setPage(pageToLoad);
      setHasMore(Boolean(payload.hasMore));
    } catch (error) {
      console.log("Failed to load partner reviews", error);
      if (!append) {
        setReviews([]);
        setSummary(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReviews(1, false);
    }, [loadReviews])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews(1, false);
  };

  const loadMore = () => {
    if (loadingMore || loading || !hasMore) return;
    loadReviews(page + 1, true);
  };

  const renderReview = ({ item }: { item: PartnerOrderReview }) => (
    <View style={themedStyles.reviewCard}>
      <View style={themedStyles.reviewTopRow}>
        <View style={themedStyles.reviewTopLeft}>
          <Text style={themedStyles.reviewOrder}>Order #{item.orderNumber}</Text>
          <Text style={themedStyles.reviewCustomer}>{item.customerName}</Text>
        </View>
        {renderStars(item.rating)}
      </View>

      {item.itemsSummary ? <Text style={themedStyles.reviewItems}>{item.itemsSummary}</Text> : null}

      {item.comment ? (
        <Text style={themedStyles.reviewComment}>{item.comment}</Text>
      ) : (
        <Text style={themedStyles.reviewCommentMuted}>No written feedback.</Text>
      )}

      <View style={themedStyles.reviewFooter}>
        <Text style={themedStyles.reviewDate}>{formatDateTime(item.submittedAt)}</Text>
        {typeof item.grandTotal === "number" ? (
          <Text style={themedStyles.reviewTotal}>{formatMoney(item.grandTotal)}</Text>
        ) : null}
      </View>
    </View>
  );

  if (loading && reviews.length === 0) {
    return (
      <View style={[themedStyles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={themedStyles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        renderItem={renderReview}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 16,
          flexGrow: reviews.length === 0 ? 1 : undefined
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        ListHeaderComponent={
          <View style={themedStyles.heroCard}>
            <Text style={themedStyles.heroLabel}>Customer reviews</Text>
            <View style={themedStyles.heroRatingRow}>
              <Ionicons name="star" size={22} color="#F59E0B" />
              <Text style={themedStyles.heroRating}>{summary?.rating?.toFixed(1) || "4.0"}</Text>
            </View>
            <Text style={themedStyles.heroSub}>
              {summary?.ratingCount || summary?.total || 0} review
              {(summary?.ratingCount || summary?.total || 0) === 1 ? "" : "s"} from delivered orders
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={themedStyles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={34} color="#94A3B8" />
            <Text style={themedStyles.emptyTitle}>No reviews yet</Text>
            <Text style={themedStyles.emptyText}>
              When customers rate a delivered order, their feedback will show up here.
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity style={themedStyles.loadMoreButton} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Text style={themedStyles.loadMoreText}>Load more reviews</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2
  }
});

const createStyles = (theme: PartnerTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.colors.muted
    },
    heroCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 18,
      marginBottom: 14
    },
    heroLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.4
    },
    heroRatingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 10
    },
    heroRating: {
      fontSize: 28,
      fontWeight: "900",
      color: theme.colors.primaryDark
    },
    heroSub: {
      marginTop: 6,
      fontSize: 13,
      color: theme.colors.muted
    },
    reviewCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      marginBottom: 10
    },
    reviewTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12
    },
    reviewTopLeft: {
      flex: 1
    },
    reviewOrder: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.colors.primaryDark
    },
    reviewCustomer: {
      marginTop: 2,
      fontSize: 12,
      color: theme.colors.muted
    },
    reviewItems: {
      marginTop: 10,
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary
    },
    reviewComment: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.primaryDark
    },
    reviewCommentMuted: {
      marginTop: 10,
      fontSize: 13,
      color: theme.colors.muted,
      fontStyle: "italic"
    },
    reviewFooter: {
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    reviewDate: {
      fontSize: 11,
      color: theme.colors.muted
    },
    reviewTotal: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.colors.primaryDark
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingTop: 48
    },
    emptyTitle: {
      marginTop: 12,
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.primaryDark
    },
    emptyText: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      color: theme.colors.muted
    },
    loadMoreButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14
    },
    loadMoreText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.primary
    }
  });
