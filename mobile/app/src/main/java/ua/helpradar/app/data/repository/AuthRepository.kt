package ua.helpradar.app.data.repository

import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.dto.LoginRequest
import ua.helpradar.app.data.network.dto.RegisterRequest

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

    suspend fun register(request: RegisterRequest): Resource<String> {
        return try {
            val response = ApiClient.authService.register(request)
            if (response.isSuccessful && response.body() != null) {
                val message = response.body()?.message ?: "Реєстрація успішна!"
                Resource.Success(message)
            } else {
                val errorMsg = when (response.code()) {
                    409 -> "Користувач з таким email вже існує"
                    400 -> "Перевірте правильність заповнених даних"
                    else -> "Помилка реєстрації (${response.code()})"
                }
                Resource.Error(errorMsg, response.code())
            }
        } catch (_: Exception) {
            Resource.Error("Немає зв'язку з сервером")
        }
    }
}