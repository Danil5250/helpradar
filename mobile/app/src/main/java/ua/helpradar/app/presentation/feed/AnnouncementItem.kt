package ua.helpradar.app.presentation.feed

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

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
    val authorId: Int? = null,
    val authorName: String,
    val authorRating: Double,
    val isUrgent: Boolean = false,
    val createdDateFormatted: String? = null,
    val expiryDateFormatted: String? = null
)

// Допоміжний метод для форматування ISO-дати бекенду ("2026-11-08T14:30:00Z" -> "08.11.2026")
fun formatIsoDate(isoString: String?): String? {
    if (isoString.isNullOrBlank()) return null
    return try {
        val parsed = ZonedDateTime.parse(isoString)
        val formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy", Locale.getDefault())
        parsed.format(formatter)
    } catch (_: Exception) {
        // Якщо це вже дата у форматі YYYY-MM-DD
        isoString.take(10)
    }
}