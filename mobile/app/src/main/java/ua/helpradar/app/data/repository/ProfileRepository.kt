package ua.helpradar.app.data.repository

import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.api.ProfileApiService
import ua.helpradar.app.data.network.dto.ProfileResponse
import ua.helpradar.app.data.network.dto.UpdateProfileRequest

class ProfileRepository(
    private val api: ProfileApiService = ApiClient.profileService
) {
    suspend fun getProfile(): Resource<ProfileResponse> {
        return try {
            val response = api.getProfile()
            val body = response.body()
            if (response.isSuccessful && body != null) {
                // Синхронізуємо SessionManager з реальними даними
                SessionManager.currentUserName = "${body.firstName} ${body.lastName}".trim()
                SessionManager.currentUserRole = body.role
                SessionManager.currentUserId = body.id
                Resource.Success(body)
            } else {
                Resource.Error("Не вдалося завантажити профіль", response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.localizedMessage ?: "Помилка мережі")
        }
    }

    suspend fun updateProfile(request: UpdateProfileRequest): Resource<ProfileResponse> {
        return try {
            val response = api.updateProfile(request)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                val updated = body.profile
                SessionManager.currentUserName = "${updated.firstName} ${updated.lastName}".trim()
                Resource.Success(updated)
            } else {
                Resource.Error("Помилка збереження профілю", response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.localizedMessage ?: "Помилка мережі")
        }
    }
}