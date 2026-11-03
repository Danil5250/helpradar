package ua.helpradar.app.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.api.AnnouncementApiService
import ua.helpradar.app.data.network.dto.*
import ua.helpradar.app.presentation.feed.AnnouncementItem
import ua.helpradar.app.presentation.feed.AnnouncementType
import java.io.ByteArrayOutputStream

class AnnouncementRepository(
    private val api: AnnouncementApiService = ApiClient.announcementApiService
) {

    suspend fun getCategories(): Resource<List<CategoryDto>> {
        return try {
            val response = api.getCategories()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!.items)
            } else {
                Resource.Error("Не вдалося завантажити категорії", response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.localizedMessage ?: "Помилка мережі при завантаженні категорій")
        }
    }

    suspend fun getAnnouncements(): Resource<List<AnnouncementItem>> {
        return try {
            val response = api.getAnnouncements()
            if (response.isSuccessful && response.body() != null) {
                val items = response.body()!!.items.map { dto ->
                    AnnouncementItem(
                        id = dto.id,
                        title = dto.title,
                        description = dto.description ?: dto.excerpt ?: "",
                        categoryName = dto.category.name,
                        type = if (dto.type.equals("HelpOffer", ignoreCase = true)) {
                            AnnouncementType.OFFER
                        } else {
                            AnnouncementType.REQUEST
                        },
                        distanceKm = dto.distanceKm ?: 0.0,
                        postedTimeAgo = "нещодавно",
                        authorName = dto.author?.name ?: "Користувач",
                        authorRating = dto.author?.rating ?: 5.0,
                        isUrgent = dto.isUrgent
                    )
                }
                Resource.Success(items)
            } else {
                Resource.Error("Помилка завантаження оголошень: ${response.code()}", response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.localizedMessage ?: "Не вдалося отримати оголошення з сервера")
        }
    }

    suspend fun createAnnouncement(request: CreateAnnouncementRequest): Resource<CreateAnnouncementResponse> {
        return try {
            val response = api.createAnnouncement(request)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error("Помилка створення оголошення: ${response.code()}", response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.localizedMessage ?: "Помилка зв'язку із сервером")
        }
    }

    suspend fun uploadPhoto(context: Context, announcementId: Int, imageUri: Uri): Resource<Unit> {
        return try {
            val contentResolver = context.contentResolver
            val inputStream = contentResolver.openInputStream(imageUri)
                ?: return Resource.Error("Неможливо прочитати файл")

            // Стискаємо великі фотографії перед відправкою, щоб уникнути помилки 500 через ліміт розміру
            val originalBitmap = BitmapFactory.decodeStream(inputStream)
            val outputStream = ByteArrayOutputStream()
            originalBitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
            val compressedBytes = outputStream.toByteArray()

            val requestBody = compressedBytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData(
                "photo",
                "upload_${System.currentTimeMillis()}.jpg",
                requestBody
            )

            val response = api.addPhoto(announcementId, part)
            if (response.isSuccessful) {
                Resource.Success(Unit)
            } else {
                Resource.Error("Не вдалося завантажити фото: ${response.code()}", response.code())
            }
        } catch (e: Exception) {
            Resource.Error(e.localizedMessage ?: "Помилка при завантаженні фото")
        }
    }
}