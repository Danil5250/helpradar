package ua.helpradar.app.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.api.ProfileApiService
import ua.helpradar.app.data.network.dto.ProfileResponse
import ua.helpradar.app.data.network.dto.UpdateProfileRequest
import java.io.ByteArrayOutputStream

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

    suspend fun uploadAvatar(context: Context, imageUri: Uri): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val contentResolver = context.contentResolver
            val inputStream = contentResolver.openInputStream(imageUri)
                ?: return@withContext Resource.Error("Неможливо відкрити файл")
            val originalBitmap = BitmapFactory.decodeStream(inputStream)
                ?: return@withContext Resource.Error("Помилка декодування зображення")

            val outputStream = ByteArrayOutputStream()
            originalBitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
            val compressedBytes = outputStream.toByteArray()

            val requestBody = compressedBytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
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
                Resource.Error("Не вдалося оновити аватар: ${response.code()}", response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.localizedMessage ?: "Помилка при завантаженні аватара")
        }
    }
}