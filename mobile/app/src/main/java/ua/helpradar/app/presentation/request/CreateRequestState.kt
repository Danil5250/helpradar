package ua.helpradar.app.presentation.request

import android.net.Uri
import ua.helpradar.app.data.network.dto.CategoryDto

data class CreateRequestFormState(
    val title: String = "",
    val description: String = "",
    val categories: List<CategoryDto> = emptyList(),
    val selectedCategory: CategoryDto? = null,
    val location: String = "Харків",
    val expiryDays: Int = 14,
    val isUrgent: Boolean = false,
    val isVolunteer: Boolean = false,
    val selectedPhotos: List<Uri> = emptyList(),

    val isCategoriesLoading: Boolean = false,
    val titleError: String? = null,
    val descriptionError: String? = null,
    val categoryError: String? = null,
    val locationError: String? = null,
    val photoError: String? = null, // <-- ось цей обов'язковий параметр

    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val generalError: String? = null
)