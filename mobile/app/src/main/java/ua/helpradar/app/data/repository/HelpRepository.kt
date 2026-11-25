package ua.helpradar.app.data.repository

import org.json.JSONObject
import retrofit2.Response
import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.api.HelpApiService
import ua.helpradar.app.data.network.dto.HelpConnectionDto
import ua.helpradar.app.data.network.dto.HelpOverviewResponse
import ua.helpradar.app.data.network.dto.RequestHelpBody

class HelpRepository(
    private val api: HelpApiService = ApiClient.helpService
) {
    suspend fun getAnnouncementHelp(announcementId: Int): Resource<HelpOverviewResponse> {
        return try {
            val response = api.getAnnouncementHelp(announcementId)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Resource.Success(body)
            } else {
                Resource.Error(
                    parseError(response.errorBody()?.string(), "Не вдалося завантажити статус допомоги"),
                    response.code()
                )
            }
        } catch (e: Exception) {
            Resource.Error("Помилка з'єднання з сервером")
        }
    }

    suspend fun respondToRequest(announcementId: Int): Resource<HelpConnectionDto> =
        executeConnectionCall { api.respondToRequest(announcementId) }

    suspend fun receiveOffer(announcementId: Int): Resource<HelpConnectionDto> =
        executeConnectionCall { api.receiveOffer(announcementId) }

    suspend fun requestHelpWithAnnouncement(offerId: Int, requestId: Int): Resource<HelpConnectionDto> =
        executeConnectionCall { api.requestHelpWithAnnouncement(offerId, RequestHelpBody(requestId)) }

    suspend fun performAction(connectionId: Int, action: String): Resource<HelpConnectionDto> =
        executeConnectionCall { api.performAction(connectionId, action) }

    private suspend fun executeConnectionCall(
        call: suspend () -> Response<HelpConnectionDto>
    ): Resource<HelpConnectionDto> {
        return try {
            val response = call()
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Resource.Success(body)
            } else {
                val localized = when (response.code()) {
                    403 -> "Ця дія недоступна для вашої ролі або акаунта"
                    404 -> "Оголошення або заявку не знайдено"
                    409 -> "Заявка вже існує або дія неможлива для поточного статусу"
                    400 -> parseError(response.errorBody()?.string(), "Некоректні дані запиту")
                    else -> parseError(response.errorBody()?.string(), "Не вдалося виконати дію")
                }
                Resource.Error(localized, response.code())
            }
        } catch (e: Exception) {
            Resource.Error("Помилка з'єднання з сервером")
        }
    }

    private fun parseError(errorJson: String?, fallback: String): String {
        if (errorJson.isNullOrBlank()) return fallback
        return try {
            val msg = JSONObject(errorJson).optString("message").trim()
            ProfileRepository.localizeBackendMessage(msg, fallback)
        } catch (_: Exception) {
            fallback
        }
    }
}