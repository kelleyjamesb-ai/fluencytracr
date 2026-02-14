"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPRESSION_THRESHOLDS = exports.ALLOWED_METRIC_NAMES = void 0;
exports.ALLOWED_METRIC_NAMES = [
    "licenses_assigned",
    "licenses_unassigned",
    "licenses_assigned_by_group",
    "daily_active_users",
    "weekly_active_users",
    "monthly_active_users",
    "active_users_percent_of_assigned",
    "usage_trend_direction",
    "total_sessions",
    "avg_sessions_per_active_user",
    "median_sessions_per_active_user",
    "usage_frequency_band_rare_count",
    "usage_frequency_band_occasional_count",
    "usage_frequency_band_regular_count",
    "usage_frequency_band_habitual_count",
    "session_duration_band_short_count",
    "session_duration_band_medium_count",
    "session_duration_band_long_count",
    "plugins_extensions_enabled",
    "feature_adoption_over_time_index",
    "usage_share_app_word_percent",
    "usage_share_app_outlook_percent",
    "usage_share_app_excel_percent",
    "usage_share_app_powerpoint_percent",
    "usage_share_app_teams_percent",
    "usage_share_app_docs_percent",
    "usage_share_app_gmail_percent",
    "usage_share_app_sheets_percent",
    "usage_share_app_slides_percent",
    "first_use_date",
    "time_to_second_use_median_days",
    "retention_30d_percent",
    "retention_60d_percent",
    "retention_90d_percent",
    "dropoff_after_activation_percent",
    "week_over_week_usage_growth_percent",
    "month_over_month_usage_growth_percent",
    "adoption_delta_post_training_percent",
    "adoption_delta_post_feature_rollout_percent",
    "novelty_decay_index",
    "teams_with_any_ai_usage_percent",
    "usage_concentration_index",
    "active_ai_users",
    "repeat_usage_in_same_workflow_percent",
    "feature_adoption_trend_direction"
];
/**
 * Suppression thresholds for k-anonymity privacy protection.
 * Groups with fewer members than these thresholds have their data suppressed.
 *
 * Note: Different thresholds are used in different contexts:
 * - MIN_GROUP_SIZE_TEAM: Used for team-level aggregations
 * - MIN_GROUP_SIZE_BEHAVIORAL: Used for behavioral signal suppression (k=5)
 * - MIN_GROUP_SIZE_DEFAULT: Default org-level suppression (k=10)
 */
exports.SUPPRESSION_THRESHOLDS = {
    /** Minimum team size for privacy (matches Python src/fluency_service.py:15) */
    MIN_GROUP_SIZE_TEAM: 3,
    /** Behavioral signals suppression threshold (k=5) */
    MIN_GROUP_SIZE_BEHAVIORAL: 5,
    /** Default org-level suppression threshold (k=10) */
    MIN_GROUP_SIZE_DEFAULT: 10
};
