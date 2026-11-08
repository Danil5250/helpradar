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