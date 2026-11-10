package ua.helpradar.app.data.network.api

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*
import ua.helpradar.app.data.network.dto.*

interface AnnouncementApiService {

    @GET("api/categories")
    suspend fun getCategories(): Response<CategoriesResponseDto>

    @GET("api/announcements")
    suspend fun getAnnouncements(
        @Query("page") page: Int = 1,
        @Query("sort") sort: String = "newest",
        @Query("lat") lat: Double? = null,
        @Query("lng") lng: Double? = null
    ): Response<AnnouncementListResponse>

    @POST("api/announcements")
    suspend fun createAnnouncement(
        @Body request: CreateAnnouncementRequest
    ): Response<CreateAnnouncementResponse>

    @GET("api/announcements/mine")
    suspend fun getMyAnnouncements(): Response<AnnouncementListResponse>

    @Multipart
    @POST("api/announcements/{id}/photos")
    suspend fun addPhoto(
        @Path("id") id: Int,
        @Part photo: MultipartBody.Part
    ): Response<PhotoUploadResponse>

    @PATCH("api/announcements/{id}")
    suspend fun updateAnnouncement(
        @Path("id") id: Int,
        @Body request: CreateAnnouncementRequest
    ): Response<CreateAnnouncementResponse>

    @POST("api/announcements/{id}/close")
    suspend fun closeAnnouncement(@Path("id") id: Int): Response<Unit>

    @GET("api/announcements/{id}")
    suspend fun getAnnouncementDetails(
        @Path("id") id: Int
    ): Response<GetAnnouncementResponseDto>
}