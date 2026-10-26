package ua.helpradar.app.presentation.feed

enum class AnnouncementType {
    REQUEST,
    OFFER
}

data class AnnouncementItem(
    val id: Int,
    val title: String,
    val description: String,
    val categoryName: String,
    val type: AnnouncementType,
    val distanceKm: Double,
    val postedTimeAgo: String,
    val authorName: String,
    val authorRating: Double,
    val isUrgent: Boolean = false
)