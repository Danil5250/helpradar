package ua.helpradar.app.presentation.request

import android.annotation.SuppressLint
import android.content.Context
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.CategoryDto
import ua.helpradar.app.data.network.dto.CreateAnnouncementRequest
import ua.helpradar.app.data.repository.AnnouncementRepository
import java.util.Locale

class CreateRequestViewModel(
    private val repository: AnnouncementRepository = AnnouncementRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        CreateRequestFormState(
            isVolunteer = SessionManager.isVolunteer
        )
    )
    val uiState: StateFlow<CreateRequestFormState> = _uiState.asStateFlow()

    private val maxPhotoSizeBytes = 10 * 1024 * 1024L
    private val allowedMimeTypes = setOf("image/jpeg", "image/png", "image/webp")

    init {
        loadCategories()
    }

    fun loadCategories() {
        viewModelScope.launch {
            _uiState.update { it.copy(isCategoriesLoading = true) }
            when (val result = repository.getCategories()) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            categories = result.data,
                            isCategoriesLoading = false
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isCategoriesLoading = false) }
                }
            }
        }
    }

    fun onTitleChange(value: String) = _uiState.update { it.copy(title = value, titleError = null) }
    fun onDescriptionChange(value: String) = _uiState.update { it.copy(description = value, descriptionError = null) }
    fun onCategorySelect(category: CategoryDto) = _uiState.update { it.copy(selectedCategory = category, categoryError = null) }
    fun onLocationChange(value: String) = _uiState.update { it.copy(location = value, locationError = null) }
    fun onExpiryDaysChange(days: Int) = _uiState.update { it.copy(expiryDays = days) }
    fun onUrgentToggle(urgent: Boolean) = _uiState.update { it.copy(isUrgent = urgent) }

    @SuppressLint("MissingPermission")
    fun fetchCurrentLocation(context: Context) {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        if (locationManager == null) {
            _uiState.update {
                it.copy(
                    isLocating = false,
                    locationError = "Служба геолокації недоступна. Введіть адресу вручну"
                )
            }
            return
        }

        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

        if (!isGpsEnabled && !isNetworkEnabled) {
            _uiState.update {
                it.copy(
                    isLocating = false,
                    locationError = "GPS вимкнено на пристрої. Увімкніть його або введіть адресу вручну"
                )
            }
            return
        }

        _uiState.update { it.copy(isLocating = true, locationError = null) }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val provider = if (isGpsEnabled) LocationManager.GPS_PROVIDER else LocationManager.NETWORK_PROVIDER
                locationManager.getCurrentLocation(
                    provider,
                    null,
                    context.mainExecutor
                ) { location ->
                    if (location != null) {
                        applyLocation(context, location.latitude, location.longitude)
                    } else {
                        fallbackToLastKnownOrCurrent(context, locationManager)
                    }
                }
            } else {
                fallbackToLastKnownOrCurrent(context, locationManager)
            }
        } catch (_: Exception) {
            fallbackToLastKnownOrCurrent(context, locationManager)
        }
    }

    @SuppressLint("MissingPermission")
    private fun fallbackToLastKnownOrCurrent(context: Context, locationManager: LocationManager) {
        val providers = locationManager.getProviders(true)
        var bestLocation: Location? = null
        for (p in providers) {
            val loc = locationManager.getLastKnownLocation(p) ?: continue
            if (bestLocation == null || loc.accuracy < bestLocation.accuracy) {
                bestLocation = loc
            }
        }

        if (bestLocation != null) {
            applyLocation(context, bestLocation.latitude, bestLocation.longitude)
        } else {
            // Замість Києва виставляємо явну помилку користувачу
            _uiState.update {
                it.copy(
                    isLocating = false,
                    locationError = "Не вдалося визначити координати. Введіть адресу вручну"
                )
            }
        }
    }

    private fun applyLocation(context: Context, lat: Double, lon: Double) {
        _uiState.update {
            it.copy(
                latitude = lat,
                longitude = lon
            )
        }
        resolveAddressFromCoordinates(context, lat, lon)
    }

    private fun resolveAddressFromCoordinates(context: Context, lat: Double, lon: Double) {
        viewModelScope.launch {
            var resolvedAddress: String? = null
            try {
                resolvedAddress = withContext(Dispatchers.IO) {
                    val geocoder = Geocoder(context, Locale("uk", "UA"))
                    @Suppress("DEPRECATION")
                    val list = geocoder.getFromLocation(lat, lon, 1)
                    if (!list.isNullOrEmpty()) {
                        val addr = list[0]
                        val city = addr.locality ?: addr.adminArea ?: ""
                        val street = addr.thoroughfare ?: ""
                        val house = addr.subThoroughfare ?: ""
                        listOf(city, street, house)
                            .filter { it.isNotBlank() }
                            .joinToString(", ")
                            .ifEmpty { addr.getAddressLine(0) }
                    } else null
                }
            } catch (_: Exception) {
                resolvedAddress = null
            }

            if (resolvedAddress != null) {
                _uiState.update {
                    it.copy(
                        location = resolvedAddress,
                        isLocating = false,
                        locationError = null
                    )
                }
            } else {
                // Якщо координати є, але geocoder не знайшов текстову адресу
                _uiState.update {
                    it.copy(
                        isLocating = false,
                        locationError = "Адресу за координатами не знайдено. Введіть назву населеного пункту вручну"
                    )
                }
            }
        }
    }

    fun onAddPhotos(context: Context, uris: List<Uri>) {
        val contentResolver = context.contentResolver
        for (uri in uris) {
            val mimeType = contentResolver.getType(uri)
            if (mimeType != null && mimeType !in allowedMimeTypes) {
                _uiState.update {
                    it.copy(photoError = "Дозволені лише формати JPEG, PNG або WebP (SRS 3.2.4.5)")
                }
                return
            }
            if (getFileSize(context, uri) > maxPhotoSizeBytes) {
                _uiState.update {
                    it.copy(photoError = "Розмір фото не повинен перевищувати 10 МБ (SRS 3.2.4.5)")
                }
                return
            }
        }
        _uiState.update {
            val updated = (it.selectedPhotos + uris).distinct().take(5)
            it.copy(selectedPhotos = updated, photoError = null)
        }
    }

    fun onRemovePhoto(uri: Uri) {
        _uiState.update {
            it.copy(
                selectedPhotos = it.selectedPhotos.filter { item -> item != uri },
                photoError = null
            )
        }
    }

    private fun getFileSize(context: Context, uri: Uri): Long {
        return try {
            context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (sizeIndex != -1 && cursor.moveToFirst()) {
                    cursor.getLong(sizeIndex)
                } else {
                    0L
                }
            } ?: 0L
        } catch (_: Exception) {
            0L
        }
    }

    fun submitRequest(context: Context) {
        val state = _uiState.value
        val isTitleValid = state.title.trim().length in 5..100
        val isDescValid = state.description.trim().length in 10..2000
        val category = state.selectedCategory
        val isCategoryValid = category != null
        val isLocationValid = state.location.trim().isNotEmpty()
        val hasOversizedPhotos = state.selectedPhotos.any { uri ->
            getFileSize(context, uri) > maxPhotoSizeBytes
        }

        if (!isTitleValid || !isDescValid || !isCategoryValid || !isLocationValid || hasOversizedPhotos) {
            _uiState.update {
                it.copy(
                    titleError = if (!isTitleValid) "Назва має містити від 5 до 100 символів" else null,
                    descriptionError = if (!isDescValid) "Опис має містити від 10 до 2000 символів" else null,
                    categoryError = if (!isCategoryValid) "Оберіть категорію допомоги" else null,
                    locationError = if (!isLocationValid) "Вкажіть адресу або населений пункт вручну" else null,
                    photoError = if (hasOversizedPhotos) "Розмір фото перевищує 10 МБ" else null
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, generalError = null) }
            val request = CreateAnnouncementRequest(
                title = state.title.trim(),
                description = state.description.trim(),
                categoryId = category.id,
                address = state.location.trim(),
                latitude = state.latitude ?: 0.0,
                longitude = state.longitude ?: 0.0,
                expiryDays = state.expiryDays,
                isUrgent = if (state.isVolunteer) false else state.isUrgent
            )

            when (val result = repository.createAnnouncement(request)) {
                is Resource.Success -> {
                    val announcementId = result.data.announcement.id
                    var photoErrorOccurred = false
                    for (photoUri in state.selectedPhotos) {
                        val uploadResult = repository.uploadPhoto(context, announcementId, photoUri)
                        if (uploadResult is Resource.Error) {
                            photoErrorOccurred = true
                        }
                    }
                    if (photoErrorOccurred) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isSuccess = false,
                                generalError = "Оголошення створено, але не всі фото вдалося завантажити"
                            )
                        }
                    } else {
                        _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                    }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLoading = false, generalError = result.message) }
                }
            }
        }
    }
}