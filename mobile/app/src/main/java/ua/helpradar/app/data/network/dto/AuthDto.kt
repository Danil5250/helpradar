package ua.helpradar.app.data.network.dto

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class UserDto(
    @SerializedName("id") val id: Int,
    @SerializedName("firstName") val firstName: String,
    @SerializedName("lastName") val lastName: String,
    @SerializedName("email") val email: String,
    @SerializedName("role") val role: String,
    @SerializedName("city") val city: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?
)

data class AuthResponse(
    @SerializedName("user") val user: UserDto?,
    @SerializedName("token") val token: String,
    @SerializedName("message") val message: String?,
    @SerializedName("expiresAt") val expiresAt: String?
)