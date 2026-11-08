package ua.helpradar.app.data.network.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import ua.helpradar.app.data.network.dto.ProfileResponse
import ua.helpradar.app.data.network.dto.ProfileUpdatedResponse
import ua.helpradar.app.data.network.dto.UpdateProfileRequest

interface ProfileApiService {
    @GET("api/profile")
    suspend fun getProfile(): Response<ProfileResponse>

    @PATCH("api/profile")
    suspend fun updateProfile(
        @Body request: UpdateProfileRequest
    ): Response<ProfileUpdatedResponse>
}