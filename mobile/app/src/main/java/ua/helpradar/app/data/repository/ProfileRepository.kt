package ua.helpradar.app.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.api.ProfileApiService
import ua.helpradar.app.data.network.dto.*
import java.io.ByteArrayOutputStream
import java.util.concurrent.ConcurrentHashMap

class ProfileRepository(
    private val api: ProfileApiService = ApiClient.profileService
) {
    suspend fun getProfile(): Resource<ProfileResponse> {
        return try {
            val response = api.getProfile()
            val body = response.body()
            if (response.isSuccessful && body != null) {
                SessionManager.currentUserName = "${body.firstName} ${body.lastName}".trim()
                SessionManager.currentUserRole = body.role
                SessionManager.currentUserId = body.id
                SessionManager.currentUserAvatarUrl = body.avatarUrl
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
                SessionManager.currentUserAvatarUrl = updated.avatarUrl
                Resource.Success(updated)
            } else {
                Resource.Error("Помилка збереження профілю", response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.localizedMessage ?: "Помилка мережі")
        }
    }

    suspend fun uploadAvatar(context: Context, imageUri: Uri): Resource<String> {
        return try {
            val inputStream = context.contentResolver.openInputStream(imageUri)
                ?: return Resource.Error("Не вдалося прочитати вибране зображення")

            val originalBitmap = inputStream.use { BitmapFactory.decodeStream(it) }
                ?: return Resource.Error("Непідтримуваний формат зображення")

            val outputStream = ByteArrayOutputStream()
            originalBitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
            val bytes = outputStream.toByteArray()

            val requestBody = bytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData(
                "avatar",
                "avatar_${System.currentTimeMillis()}.jpg",
                requestBody
            )

            val response = api.uploadAvatar(part)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                SessionManager.currentUserAvatarUrl = body.avatarUrl
                Resource.Success(body.avatarUrl)
            } else {
                Resource.Error(
                    parseErrorMessage(response.errorBody()?.string(), "Не вдалося оновити аватар (${response.code()})"),
                    response.code()
                )
            }
        } catch (e: Exception) {
            Resource.Error(e.localizedMessage ?: "Помилка завантаження аватара")
        }
    }

    companion object {
        private val userRatingCache = ConcurrentHashMap<Int, Double>()

        fun getCachedRating(userId: Int): Double? = userRatingCache[userId]

        fun cacheRating(userId: Int, rating: Double?) {
            if (rating != null) {
                userRatingCache[userId] = rating
            }
        }
    }

    suspend fun getPublicProfile(userId: Int): Resource<PublicProfileResponse> {
        return try {
            val response = api.getPublicProfile(userId)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                cacheRating(userId, body.rating)
                Resource.Success(body)
            } else {
                Resource.Error(
                    parseErrorMessage(response.errorBody()?.string(), "Не вдалося завантажити профіль користувача"),
                    response.code()
                )
            }
        } catch (e: Exception) {
            Resource.Error("Помилка з'єднання: ${e.localizedMessage ?: "невідома помилка"}")
        }
    }

    suspend fun getUserComments(userId: Int, page: Int = 1, pageSize: Int = 10): Resource<CommentsPageResponse> {
        return try {
            val response = api.getUserComments(userId, page, pageSize)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Resource.Success(body)
            } else {
                Resource.Error(
                    parseErrorMessage(response.errorBody()?.string(), "Не вдалося завантажити відгуки"),
                    response.code()
                )
            }
        } catch (e: Exception) {
            Resource.Error("Помилка з'єднання: ${e.localizedMessage ?: "невідома помилка"}")
        }
    }

    suspend fun createUserComment(userId: Int, rating: Int, comment: String): Resource<CommentSavedResponse> {
        return try {
            val response = api.createUserComment(
                userId,
                CreateCommentRequest(rating = rating, comment = comment.trim())
            )
            val body = response.body()
            if (response.isSuccessful && body != null) {
                cacheRating(userId, body.rating)
                Resource.Success(body)
            } else {
                val localizedError = when (response.code()) {
                    404 -> "Ви можете залишити відгук лише після підтвердженої взаємодії з цим волонтером"
                    403 -> "Недостатньо прав для додавання відгуку"
                    409 -> "Ви вже залишали відгук цьому волонтеру"
                    400 -> "Перевірте коректність оцінки та тексту відгуку"
                    401 -> "Увійдіть в акаунт, щоб залишити відгук"
                    else -> parseErrorMessage(response.errorBody()?.string(), "Не вдалося залишити відгук")
                }
                Resource.Error(localizedError, response.code())
            }
        } catch (e: Exception) {
            Resource.Error("Помилка з'єднання з сервером")
        }
    }

    suspend fun deleteComment(commentId: Int, targetUserId: Int): Resource<CommentSavedResponse> {
        return try {
            val response = api.deleteComment(commentId)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                cacheRating(targetUserId, body.rating)
                Resource.Success(body)
            } else {
                Resource.Error(
                    parseErrorMessage(response.errorBody()?.string(), "Не вдалося видалити відгук"),
                    response.code()
                )
            }
        } catch (e: Exception) {
            Resource.Error("Помилка з'єднання: ${e.localizedMessage ?: "невідома помилка"}")
        }
    }

    private fun parseErrorMessage(errorJson: String?, fallback: String): String {
        if (errorJson.isNullOrBlank()) return fallback
        return try {
            val obj = JSONObject(errorJson)
            val rawMessage = obj.optString("message").trim()
            when {
                rawMessage.isEmpty() -> fallback
                rawMessage.equals("The requested resource was not found.", ignoreCase = true) ->
                    "Запитуваний ресурс не знайдено"
                rawMessage.equals("Please correct the highlighted fields.", ignoreCase = true) ->
                    "Перевірте правильність заповнення полів"
                rawMessage.equals("Unauthorized", ignoreCase = true) ->
                    "Необхідна авторизація"
                rawMessage.equals("Forbidden", ignoreCase = true) ->
                    "Доступ заборонено"
                else -> rawMessage
            }
        } catch (_: Exception) {
            fallback
        }
    }
}