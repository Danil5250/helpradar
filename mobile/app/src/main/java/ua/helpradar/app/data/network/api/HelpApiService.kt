package ua.helpradar.app.data.network.api

import retrofit2.Response
import retrofit2.http.*
import ua.helpradar.app.data.network.dto.*

interface HelpApiService {
    @GET("api/help")
    suspend fun getMyHelp(): Response<MyHelpResponse>

    @GET("api/announcements/{id}/help")
    suspend fun getAnnouncementHelp(
        @Path("id") announcementId: Int
    ): Response<HelpOverviewResponse>

    @POST("api/announcements/{id}/respond")
    suspend fun respondToRequest(
        @Path("id") announcementId: Int
    ): Response<HelpConnectionDto>

    @POST("api/announcements/{id}/receive-help")
    suspend fun receiveOffer(
        @Path("id") announcementId: Int
    ): Response<HelpConnectionDto>

    @POST("api/announcements/{id}/request-help")
    suspend fun requestHelpWithAnnouncement(
        @Path("id") offerId: Int,
        @Body request: RequestHelpBody
    ): Response<HelpConnectionDto>

    @POST("api/help/{id}/{action}")
    suspend fun performAction(
        @Path("id") connectionId: Int,
        @Path("action") action: String
    ): Response<HelpConnectionDto>
}