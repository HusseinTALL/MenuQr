/**
 * Review Types for MenuQR Frontend
 */

// Review status
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

// Review image
export interface ReviewImage {
  url: string;
  publicId: string;
}

// Review response from restaurant
export interface ReviewResponse {
  content: string;
  respondedAt: string;
  respondedBy: {
    _id: string;
    name: string;
  };
}

// Customer info in review
export interface ReviewCustomer {
  _id: string;
  name: string;
  phone?: string;
}

// Dish info in review
export interface ReviewDish {
  _id: string;
  name: {
    fr: string;
    en?: string;
  };
  slug: string;
  image?: string;
}

// Review interface
export interface Review {
  _id: string;
  restaurantId: string;
  dishId?: string;
  orderId?: string;
  customerId: ReviewCustomer;
  dish?: ReviewDish;

  // Evaluation
  rating: number;
  title?: string;
  comment?: string;

  // Photos
  images: ReviewImage[];

  // Response
  response?: ReviewResponse;

  // Moderation
  status: ReviewStatus;
  moderatedAt?: string;
  moderatedBy?: string;
  rejectionReason?: string;

  // Engagement
  helpfulCount: number;
  reportCount: number;
  hasVotedHelpful?: boolean;

  // Metadata
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

// Rating distribution
export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

// Review stats
export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: RatingDistribution;
  responseRate: number;
  recentReviews?: Review[];
}

// Admin review stats
export interface AdminReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  averageRating: number;
  responseRate: number;
  todayCount: number;
  weekCount: number;
}

// Pagination
export interface ReviewPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Paginated reviews response
export interface PaginatedReviews {
  reviews: Review[];
  pagination: ReviewPagination;
}

// Create review DTO
export interface CreateReviewDTO {
  restaurantId: string;
  dishId?: string;
  orderId?: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: ReviewImage[];
}

// Update review DTO
export interface UpdateReviewDTO {
  rating?: number;
  title?: string;
  comment?: string;
  images?: ReviewImage[];
}

// Can review check result
export interface CanReviewResult {
  canReview: boolean;
  reason?: string;
  isVerifiedPurchase: boolean;
}

// Review query params
export interface ReviewQueryParams {
  page?: number;
  limit?: number;
  rating?: number;
  sort?: 'recent' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful';
}

// Admin review query params
export interface AdminReviewQueryParams extends ReviewQueryParams {
  status?: ReviewStatus;
  dishId?: string;
  customerId?: string;
  hasResponse?: boolean;
  isVerifiedPurchase?: boolean;
}

// Helpful vote response
export interface HelpfulVoteResponse {
  helpfulCount: number;
  hasVoted: boolean;
}

// Dish review stats (for menu display)
export interface DishReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: RatingDistribution;
  lastReviewAt?: string;
}
