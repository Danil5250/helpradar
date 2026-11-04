package ua.helpradar.app.data.network.api

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query
import ua.helpradar.app.data.network.dto.GeocodingResultDto

interface GeocodingApiService {

    @GET("api/geocoding/reverse")
    suspend fun reverseGeocode(
        @Query("lat") lat: Double,
        @Query("lon") lon: Double
    ): Response<GeocodingResultDto>

    @GET("api/geocoding/search")
    suspend fun searchAddress(
        @Query("q") query: String
    ): Response<List<GeocodingResultDto>>
}