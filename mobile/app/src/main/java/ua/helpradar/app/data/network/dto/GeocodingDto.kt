package ua.helpradar.app.data.network.dto

import com.google.gson.annotations.SerializedName

data class GeocodingResultDto(
    @SerializedName("display_name") val displayName: String?,
    @SerializedName("lat") val lat: String?,
    @SerializedName("lon") val lon: String?,
    @SerializedName("address") val address: Map<String, Any>?
)