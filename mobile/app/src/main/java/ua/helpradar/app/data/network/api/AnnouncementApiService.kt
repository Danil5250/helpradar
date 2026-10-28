package ua.helpradar.app.data.network.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query
import ua.helpradar.app.data.network.dto.AnnouncementListResponse
import ua.helpradar.app.data.network.dto.AnnouncementResponseDto
import ua.helpradar.app.data.network.dto.CreateAnnouncementRequest

interface AnnouncementApiService {

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
    ): Response<AnnouncementResponseDto>
}