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

data class RegisterRequest(
    @SerializedName("firstName") val firstName: String,
    @SerializedName("lastName") val lastName: String,
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String,
    @SerializedName("passwordConfirm") val passwordConfirm: String,
    @SerializedName("role") val role: String,
    @SerializedName("city") val city: String,
    @SerializedName("termsAccepted") val termsAccepted: Boolean = true,
    @SerializedName("ageConfirmed") val ageConfirmed: Boolean = true,
    @SerializedName("region") val region: String? = null,
    @SerializedName("phoneNumber") val phoneNumber: String? = null
)

data class RegisterResponse(
    @SerializedName("code") val code: String?,
    @SerializedName("message") val message: String?,
    @SerializedName("emailQueued") val emailQueued: Boolean?
)