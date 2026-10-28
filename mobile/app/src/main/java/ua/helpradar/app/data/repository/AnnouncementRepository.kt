package ua.helpradar.app.data.repository

import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.AnnouncementResponseDto
import ua.helpradar.app.data.network.dto.CreateAnnouncementRequest

class AnnouncementRepository {

    suspend fun getAnnouncements(page: Int = 1, sort: String = "newest"): Resource<List<AnnouncementResponseDto>> {
        return try {
            val response = ApiClient.announcementService.getAnnouncements(page = page, sort = sort)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!.items)
            } else {
                Resource.Error("Помилка завантаження стрічки (${response.code()})", response.code())
            }
        } catch (_: Exception) {
            Resource.Error("Немає зв'язку з сервером")
        }
    }

    suspend fun createAnnouncement(request: CreateAnnouncementRequest): Resource<AnnouncementResponseDto> {
        return try {
            val response = ApiClient.announcementService.createAnnouncement(request)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                // Читаємо реальне повідомлення від NestJS
                val errorBody = response.errorBody()?.string().orEmpty()
                val errorMsg = when {
                    response.code() == 401 -> "Необхідно увійти в акаунт"
                    response.code() == 403 -> {
                        // Якщо бекенд повернув JSON з полем message, виводимо його
                        if (errorBody.contains("message")) {
                            errorBody
                        } else {
                            "Дія заборонена для вашої ролі (403)"
                        }
                    }
                    response.code() == 400 -> "Перевірте правильність заповнення форми"
                    else -> "Помилка створення оголошення (${response.code()})"
                }
                Resource.Error(errorMsg, response.code())
            }
        } catch (_: Exception) {
            Resource.Error("Немає зв'язку з сервером")
        }
    }
}