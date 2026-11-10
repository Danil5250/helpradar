package ua.helpradar.app.data.network.dto

import com.google.gson.annotations.SerializedName

data class GetAnnouncementResponseDto(
    @SerializedName("announcement") val announcement: AnnouncementDetailsDto
)

data class AnnouncementDetailsDto(
    @SerializedName("id") val id: Int,
    @SerializedName("type") val type: String, // "help_request" або "help_offer"
    @SerializedName("status") val status: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("category") val category: CategorySimpleDto,
    @SerializedName("isUrgent") val isUrgent: Boolean,
    @SerializedName("datePosted") val datePosted: String?,
    @SerializedName("expiresAt") val expiresAt: String?,
    @SerializedName("createdAt") val createdAt: String?,
    @SerializedName("viewsCount") val viewsCount: Int = 0,
    @SerializedName("responsesCount") val responsesCount: Int = 0,
    @SerializedName("author") val author: AnnouncementAuthorDto,
    @SerializedName("photos") val photos: List<AnnouncementPhotoDto> = emptyList(),
    @SerializedName("approxLocation") val approxLocation: ApproxLocationDto?,
    @SerializedName("isOwner") val isOwner: Boolean = false,
    @SerializedName("exactLocation") val exactLocation: ExactLocationDto? = null,
    @SerializedName("allowedActions") val allowedActions: List<String> = emptyList(),
    @SerializedName("republishUntil") val republishUntil: String? = null,
    @SerializedName("canReview") val canReview: Boolean = false
)

data class CategorySimpleDto(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String
)

data class AnnouncementAuthorDto(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("rating") val rating: Double?
)

data class AnnouncementPhotoDto(
    @SerializedName("id") val id: Int,
    @SerializedName("url") val url: String
)

data class ExactLocationDto(
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("address") val address: String?
)