package ua.helpradar.app.presentation.request

import android.net.Uri
import ua.helpradar.app.data.network.dto.AnnouncementPhotoDto
import ua.helpradar.app.data.network.dto.CategoryDto

data class CreateRequestFormState(
        val editingAnnouncementId: Int? = null,
        val title: String = "",
        val description: String = "",
        val location: String = "",
        val latitude: Double? = null,
        val longitude: Double? = null,
        val isLocating: Boolean = false,
        val selectedCategory: CategoryDto? = null,
        val categories: List<CategoryDto> = emptyList(),
        val isCategoriesLoading: Boolean = false,
        val existingPhotos: List<AnnouncementPhotoDto> = emptyList(),
        val deletedPhotoIds: Set<Int> = emptySet(),
        val selectedPhotos: List<Uri> = emptyList(),
        val isUrgent: Boolean = false,
        val expiryDays: Int = 14,
        val extendDays: Int? = null,
        val currentExpiresAtFormatted: String? = null,
        val availableExpiryDays: List<Int> = listOf(3, 5, 7, 14),
        val isVolunteer: Boolean = false,
        val isLoading: Boolean = false,
        val isSuccess: Boolean = false,
        val titleError: String? = null,
        val descriptionError: String? = null,
        val categoryError: String? = null,
        val locationError: String? = null,
        val photoError: String? = null,
        val generalError: String? = null
)