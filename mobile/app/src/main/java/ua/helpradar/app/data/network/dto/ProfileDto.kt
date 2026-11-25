package ua.helpradar.app.data.network.dto

import com.google.gson.annotations.SerializedName

data class ProfileResponse(
    @SerializedName("id") val id: Int,
    @SerializedName("firstName") val firstName: String,
    @SerializedName("lastName") val lastName: String,
    @SerializedName("email") val email: String,
    @SerializedName("pendingEmail") val pendingEmail: String? = null,
    @SerializedName("role") val role: String,
    @SerializedName("phoneNumber") val phoneNumber: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    @SerializedName("city") val city: String? = null,
    @SerializedName("region") val region: String? = null,
    @SerializedName("street") val street: String? = null,
    @SerializedName("aboutMe") val aboutMe: String? = null,
    @SerializedName("supports") val supports: List<String> = emptyList(),
    @SerializedName("rating") val rating: Double? = null,
    @SerializedName("reviewsCount") val reviewsCount: Int = 0,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class UpdateProfileRequest(
    @SerializedName("firstName") val firstName: String? = null,
    @SerializedName("lastName") val lastName: String? = null,
    @SerializedName("phoneNumber") val phoneNumber: String? = null,
    @SerializedName("city") val city: String? = null,
    @SerializedName("region") val region: String? = null,
    @SerializedName("street") val street: String? = null,
    @SerializedName("aboutMe") val aboutMe: String? = null
)

data class ProfileUpdatedResponse(
    @SerializedName("code") val code: String,
    @SerializedName("message") val message: String,
    @SerializedName("profile") val profile: ProfileResponse
)

data class UploadAvatarResponse(
    @SerializedName("code") val code: String,
    @SerializedName("message") val message: String,
    @SerializedName("avatarUrl") val avatarUrl: String
)

data class PublicProfileResponse(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String? = null,
    @SerializedName("firstName") val firstName: String? = null,
    @SerializedName("lastName") val lastName: String? = null,
    @SerializedName("role") val role: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    @SerializedName("rating") val rating: Double? = null,
    @SerializedName("reviewsCount") val reviewsCount: Int? = null,
    @SerializedName("city") val city: String? = null,
    @SerializedName("district") val district: String? = null,
    @SerializedName("supportTypes") val supportTypes: List<String>? = null,
    @SerializedName("workingDays") val workingDays: List<String>? = null,
    @SerializedName("workingHours") val workingHours: String? = null
)

data class CommentAuthorDto(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String? = null,
    @SerializedName("firstName") val firstName: String? = null,
    @SerializedName("lastName") val lastName: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null
)

data class UserCommentDto(
    @SerializedName("id") val id: Int,
    @SerializedName("rating") val rating: Int,
    @SerializedName("description") val description: String? = null,
    @SerializedName("dateCreated") val dateCreated: String? = null,
    @SerializedName("announcementId") val announcementId: Int? = null,
    @SerializedName("author") val author: CommentAuthorDto? = null
)

data class CommentsPageResponse(
    @SerializedName("items") val items: List<UserCommentDto> = emptyList(),
    @SerializedName("page") val page: Int = 1,
    @SerializedName("pageSize") val pageSize: Int = 10,
    @SerializedName("hasMore") val hasMore: Boolean = false
)

data class CreateCommentRequest(
    @SerializedName("rating") val rating: Int,
    @SerializedName("description") val description: String
)

data class CommentSavedResponse(
    @SerializedName("code") val code: String? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("comment") val comment: UserCommentDto? = null
)