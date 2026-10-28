package ua.helpradar.app.data.network.dto

import com.google.gson.annotations.SerializedName

data class AnnouncementListResponse(
    @SerializedName("items") val items: List<AnnouncementResponseDto>,
    @SerializedName("page") val page: Int,
    @SerializedName("pageSize") val pageSize: Int,
    @SerializedName("hasMore") val hasMore: Boolean
)

data class AnnouncementAuthorDto(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String?,
    @SerializedName("firstName") val firstName: String?,
    @SerializedName("lastName") val lastName: String?,
    @SerializedName("rating") val rating: Double?
)

data class AnnouncementCategoryDto(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String
)

data class AnnouncementResponseDto(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String?,
    @SerializedName("excerpt") val excerpt: String?,
    @SerializedName("category") val category: AnnouncementCategoryDto?,
    @SerializedName("type") val type: String?,
    @SerializedName("distanceKm") val distanceKm: Double?,
    @SerializedName("datePosted") val datePosted: String?,
    @SerializedName("createdAt") val createdAt: String?,
    @SerializedName("author") val author: AnnouncementAuthorDto?,
    @SerializedName("isUrgent") val isUrgent: Boolean = false
)

data class CreateAnnouncementRequest(
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("categoryId") val categoryId: Int,
    @SerializedName("address") val address: String,
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("expiryDays") val expiryDays: Int = 14,
    @SerializedName("isUrgent") val isUrgent: Boolean = false
)