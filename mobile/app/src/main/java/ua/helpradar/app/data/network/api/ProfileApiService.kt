package ua.helpradar.app.data.network.api

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*
import ua.helpradar.app.data.network.dto.*

interface ProfileApiService {
    @GET("api/profile")
    suspend fun getProfile(): Response<ProfileResponse>

    @PATCH("api/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ProfileUpdatedResponse>

    @Multipart
    @POST("api/profile/avatar")
    suspend fun uploadAvatar(@Part file: MultipartBody.Part): Response<UploadAvatarResponse>

    @GET("api/users/{id}")
    suspend fun getPublicProfile(@Path("id") userId: Int): Response<PublicProfileResponse>

    @GET("api/users/{id}/comments")
    suspend fun getUserComments(
        @Path("id") userId: Int,
        @Query("page") page: Int = 1
    ): Response<CommentsPageResponse>

    @POST("api/announcements/{id}/comments")
    suspend fun createAnnouncementComment(
        @Path("id") announcementId: Int,
        @Body request: CreateCommentRequest
    ): Response<CommentSavedResponse>

    @DELETE("api/comments/{id}")
    suspend fun deleteComment(@Path("id") commentId: Int): Response<CommentSavedResponse>
}