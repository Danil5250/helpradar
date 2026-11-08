package ua.helpradar.app.data.repository

import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.LoginRequest
import ua.helpradar.app.data.network.dto.RegisterRequest
import ua.helpradar.app.data.network.dto.ForgotPasswordRequest

class AuthRepository {
    suspend fun login(email: String, password: String): Resource<String> {
        return try {
            val response = ApiClient.authService.login(LoginRequest(email, password))
            val body = response.body()
            if (response.isSuccessful && body != null) {
                // Зберігаємо сесію, роль та аватар увійшовшого користувача
                body.user?.let { user ->
                    SessionManager.currentUserRole = user.role
                    SessionManager.currentUserName = "${user.firstName} ${user.lastName}".trim()
                    SessionManager.currentUserId = user.id
                    SessionManager.currentUserAvatarUrl = user.avatarUrl
                }

                val token = body.token.orEmpty()
                Resource.Success(token)
            } else {
                val msg = when (response.code()) {
                    401 -> "Невірний email або пароль"
                    403 -> "Акаунт не активовано. Будь ласка, підтвердіть вашу пошту."
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
                    401 -> "Невірний email або пароль"
                    403 -> "Акаунт не активовано. Будь ласка, підтвердіть вашу пошту."
                    429 -> "Забагато спроб. Спробуйте пізніше."
                    else -> "Помилка реєстрації (${response.code()})"
                }
                Resource.Error(errorMsg, response.code())
            }
        } catch (_: Exception) {
            Resource.Error("Немає зв'язку з сервером")
        }
    }

    suspend fun forgotPassword(email: String): Resource<String> {
        return try {
            val response = ApiClient.authService.forgotPassword(ForgotPasswordRequest(email = email))
            val body = response.body()

            if (response.isSuccessful) {
                val message = body?.message
                    ?: "Якщо ця пошта зареєстрована, ми надіслали інструкції для відновлення пароля."
                Resource.Success(message)
            } else {
                val errorMsg = when (response.code()) {
                    400 -> "Введіть дійсну адресу електронної пошти."
                    429 -> "Забагато спроб відновлення. Спробуйте пізніше."
                    503 -> "Поштовий сервіс тимчасово недоступний. Спробуйте через кілька хвилин."
                    else -> "Помилка надсилання запиту (${response.code()})"
                }
                Resource.Error(errorMsg, response.code())
            }
        } catch (_: Exception) {
            Resource.Error("Немає зв'язку з сервером")
        }
    }

    fun logout() {
        SessionManager.clear()
        ApiClient.clearCookies()
    }
}