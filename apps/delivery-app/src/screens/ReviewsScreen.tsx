import React, { useCallback, useState } from "react";
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
  getDeliveryReviews,
  type DeliveryOrderReview,
  type DeliveryReviewsResponse
} from "../api/delivery.api";

const GREEN_PRIMARY = "#16A34A";
const GREEN_DEEP = "#14532D";

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
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<Pick<DeliveryReviewsResponse, "rating" | "ratingCount" | "total"> | null>(
    null
  );
  const [reviews, setReviews] = useState<DeliveryOrderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadReviews = useCallback(async (pageToLoad = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else if (pageToLoad === 1) {
        setLoading(true);
      }

      const response = await getDeliveryReviews({ page: pageToLoad, limit: 20 });
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to load reviews");
      }

      const payload = response.data;
      setSummary({
        rating: payload.rating,
        ratingCount: payload.ratingCount,
        total: payload.total
      });
      setReviews((current) => (append ? [...current, ...payload.reviews] : payload.reviews));
      setPage(pageToLoad);
      setHasMore(Boolean(payload.hasMore));
    } catch (error) {
      console.log("Failed to load delivery reviews", error);
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

  const renderReview = ({ item }: { item: DeliveryOrderReview }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewTopRow}>
        <View style={styles.reviewTopLeft}>
          <Text style={styles.reviewOrder}>Order #{item.orderNumber}</Text>
          <Text style={styles.reviewCustomer}>{item.customerName}</Text>
          {item.restaurantName ? (
            <Text style={styles.reviewRestaurant}>{item.restaurantName}</Text>
          ) : null}
        </View>
        {renderStars(item.rating)}
      </View>

      {item.comment ? (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      ) : (
        <Text style={styles.reviewCommentMuted}>No written feedback.</Text>
      )}

      <Text style={styles.reviewDate}>{formatDateTime(item.submittedAt)}</Text>
    </View>
  );

  if (loading && reviews.length === 0) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GREEN_PRIMARY} />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[GREEN_PRIMARY]} />
        }
        ListHeaderComponent={
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Customer delivery ratings</Text>
            <View style={styles.heroRatingRow}>
              <Ionicons name="star" size={22} color="#F59E0B" />
              <Text style={styles.heroRating}>{(summary?.rating || 0).toFixed(1)}</Text>
            </View>
            <Text style={styles.heroSub}>
              {summary?.ratingCount || summary?.total || 0} rating
              {(summary?.ratingCount || summary?.total || 0) === 1 ? "" : "s"} from delivered orders
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={34} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No delivery reviews yet</Text>
            <Text style={styles.emptyText}>
              When customers rate your delivery, their feedback will appear here and update your rating.
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore} disabled={loadingMore}>
              {loadingMore ? (
                <ActivityIndicator color={GREEN_PRIMARY} />
              ) : (
                <Text style={styles.loadMoreText}>Load more reviews</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#667085"
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    padding: 18,
    marginBottom: 14
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#667085",
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
    color: GREEN_DEEP
  },
  heroSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#667085"
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E7EC",
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
    color: GREEN_DEEP
  },
  reviewCustomer: {
    marginTop: 2,
    fontSize: 12,
    color: "#667085"
  },
  reviewRestaurant: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: GREEN_PRIMARY
  },
  reviewComment: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: GREEN_DEEP
  },
  reviewCommentMuted: {
    marginTop: 10,
    fontSize: 13,
    color: "#98A2B3",
    fontStyle: "italic"
  },
  reviewDate: {
    marginTop: 12,
    fontSize: 11,
    color: "#98A2B3"
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
    color: GREEN_DEEP
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: "#667085"
  },
  loadMoreButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: GREEN_PRIMARY
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2
  }
});
