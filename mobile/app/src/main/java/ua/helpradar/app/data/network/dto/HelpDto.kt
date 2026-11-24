package ua.helpradar.app.data.network.dto

import com.google.gson.annotations.SerializedName

data class HelpPersonDto(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String = "",
    @SerializedName("avatarUrl") val avatarUrl: String? = null
)

data class HelpRequestSummaryDto(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String = "",
    @SerializedName("status") val status: String? = null,
    @SerializedName("announcementDeleted") val announcementDeleted: Boolean = false
)

data class HelpShortAnnouncementDto(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String = ""
)

data class HelpConnectionDto(
    @SerializedName("id") val id: Int,
    @SerializedName("status") val status: String,
    @SerializedName("initiatedBy") val initiatedBy: String? = null,
    @SerializedName("isDirect") val isDirect: Boolean = false,
    @SerializedName("dateCreated") val dateCreated: String? = null,
    @SerializedName("request") val request: HelpRequestSummaryDto? = null,
    @SerializedName("requester") val requester: HelpPersonDto,
    @SerializedName("volunteer") val volunteer: HelpPersonDto,
    @SerializedName("actions") val actions: List<String> = emptyList(),
    @SerializedName("contactPhone") val contactPhone: String? = null,
    @SerializedName("canReview") val canReview: Boolean = false,
    @SerializedName("hasReview") val hasReview: Boolean = false
)

data class HelpOverviewResponse(
    @SerializedName("canRespond") val canRespond: Boolean = false,
    @SerializedName("canReceiveOffer") val canReceiveOffer: Boolean = false,
    @SerializedName("requests") val requests: List<HelpShortAnnouncementDto> = emptyList(),
    @SerializedName("connections") val connections: List<HelpConnectionDto> = emptyList()
)

data class MyHelpResponse(
    @SerializedName("items") val items: List<HelpConnectionDto> = emptyList()
)

data class RequestHelpBody(
    @SerializedName("requestId") val requestId: Int
)