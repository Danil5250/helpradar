package ua.helpradar.app.data.network.dto

import com.google.gson.annotations.SerializedName

data class CategoryDto(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String
)

data class CategoriesResponseDto(
    @SerializedName("items") val items: List<CategoryDto>
)

data class AuthorDto(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("rating") val rating: Double? = null
)

data class AnnouncementApiItem(
    @SerializedName("id") val id: Int,
    @SerializedName("type") val type: String,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String?,
    @SerializedName("excerpt") val excerpt: String?,
    @SerializedName("category") val category: CategoryDto,
    @SerializedName("isUrgent") val isUrgent: Boolean,
    @SerializedName("datePosted") val datePosted: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("expiresAt") val expiresAt: String? = null,
    @SerializedName("distanceKm") val distanceKm: Double? = null,
    @SerializedName("author") val author: AuthorDto? = null,
    @SerializedName("status") val status: String? = "Active"
)

data class AnnouncementListResponse(
    @SerializedName("items") val items: List<AnnouncementApiItem>,
    @SerializedName("page") val page: Int,
    @SerializedName("pageSize") val pageSize: Int,
    @SerializedName("hasMore") val hasMore: Boolean
)

data class CreateAnnouncementRequest(
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String,
    @SerializedName("categoryId") val categoryId: Int,
    @SerializedName("address") val address: String? = null,
    @SerializedName("latitude") val latitude: Double? = null,
    @SerializedName("longitude") val longitude: Double? = null,
    @SerializedName("expiryDays") val expiryDays: Int = 14,
    @SerializedName("isUrgent") val isUrgent: Boolean = false
)

data class AnnouncementIdDto(
    @SerializedName("id") val id: Int
)

data class CreateAnnouncementResponse(
    @SerializedName("code") val code: String,
    @SerializedName("message") val message: String?,
    @SerializedName("announcement") val announcement: AnnouncementIdDto
)

data class PhotoDto(
    @SerializedName("id") val id: Int,
    @SerializedName("url") val url: String
)

data class PhotoUploadResponse(
    @SerializedName("photo") val photo: PhotoDto
)