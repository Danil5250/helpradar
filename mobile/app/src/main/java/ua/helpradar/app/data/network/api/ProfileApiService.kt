package ua.helpradar.app.data.network.api

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import ua.helpradar.app.data.network.dto.ProfileResponse
import ua.helpradar.app.data.network.dto.ProfileUpdatedResponse
import ua.helpradar.app.data.network.dto.UpdateProfileRequest
import ua.helpradar.app.data.network.dto.UploadAvatarResponse

interface ProfileApiService {
    @GET("api/profile")
    suspend fun getProfile(): Response<ProfileResponse>

    @PATCH("api/profile")
    suspend fun updateProfile(
        @Body request: UpdateProfileRequest
    ): Response<ProfileUpdatedResponse>

    @Multipart
    @POST("api/profile/avatar")
    suspend fun uploadAvatar(
        @Part avatar: MultipartBody.Part
    ): Response<UploadAvatarResponse>
}