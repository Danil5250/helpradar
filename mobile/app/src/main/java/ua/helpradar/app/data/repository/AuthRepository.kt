package ua.helpradar.app.data.repository

import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.dto.LoginRequest

class AuthRepository {
    suspend fun login(email: String, password: String): Resource<String> {
        return try {
            val response = ApiClient.authService.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val token = response.body()?.token.orEmpty()
                Resource.Success(token)
            } else {
                val msg = when (response.code()) {
                    401 -> "Невірний email або пароль"
                    429 -> "Забагато спроб. Спробуйте пізніше."
                    else -> "Помилка сервера (${response.code()})"
                }
                Resource.Error(msg, response.code())
            }
        } catch (_: Exception) {
            Resource.Error("Немає зв'язку з сервером")
        }
    }
}