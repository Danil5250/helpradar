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
import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.CategoryDto
import ua.helpradar.app.data.network.dto.CreateAnnouncementRequest
import ua.helpradar.app.data.repository.AnnouncementRepository
import ua.helpradar.app.presentation.feed.formatIsoDate
import java.util.Locale

class CreateRequestViewModel(
    private val repository: AnnouncementRepository = AnnouncementRepository()
) : ViewModel() {

    companion object {
        var itemToEdit: ua.helpradar.app.presentation.feed.AnnouncementItem? = null
    }

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

    fun setEditMode(
        id: Int,
        title: String,
        description: String,
        categoryName: String,
        isUrgent: Boolean,
        location: String,
        lat: Double? = null,
        lon: Double? = null
    ) {
        _uiState.update { current ->
            val matchingCategory = current.categories.find { it.name.equals(categoryName, ignoreCase = true) }
            current.copy(
                editingAnnouncementId = id,
                title = title.trim(),
                description = description.trim(),
                selectedCategory = matchingCategory ?: current.selectedCategory,
                location = location,
                latitude = lat,
                longitude = lon,
                expiryDays = 14,
                extendDays = null,
                isUrgent = isUrgent
            )
        }
    }

    fun loadCategories(context: Context? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isCategoriesLoading = true) }
            when (val result = repository.getCategories()) {
                is Resource.Success -> {
                    val loadedCategories = result.data
                    _uiState.update {
                        it.copy(
                            categories = loadedCategories,
                            isCategoriesLoading = false
                        )
                    }
                    itemToEdit?.let { item ->
                        setEditMode(
                            id = item.id,
                            title = item.title,
                            description = item.description,
                            location = "",
                            categoryName = item.categoryName,
                            isUrgent = item.isUrgent,
                            lat = item.latitude,
                            lon = item.longitude
                        )
                        itemToEdit = null
                        loadAnnouncementDetailsForEdit(item.id, context)
                    }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isCategoriesLoading = false) }
                }
            }
        }
    }

    fun loadAnnouncementDetailsForEdit(announcementId: Int, context: Context?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLocating = true) }
            when (val result = repository.getAnnouncementDetails(announcementId)) {
                is Resource.Success -> {
                    val details = result.data
                    val lat = details.exactLocation?.latitude ?: details.approxLocation?.latitude ?: _uiState.value.latitude
                    val lon = details.exactLocation?.longitude ?: details.approxLocation?.longitude ?: _uiState.value.longitude
                    val savedAddress = details.exactLocation?.address
                    val formattedExpiry = formatIsoDate(details.expiresAt)

                    _uiState.update {
                        it.copy(
                            latitude = lat,
                            longitude = lon,
                            location = savedAddress ?: it.location,
                            existingPhotos = details.photos,
                            deletedPhotoIds = emptySet(),
                            currentExpiresAtFormatted = formattedExpiry,
                            extendDays = null
                        )
                    }

                    if (!savedAddress.isNullOrBlank()) {
                        _uiState.update { it.copy(isLocating = false) }
                    } else if (lat != null && lon != null && lat != 0.0 && lon != 0.0 && context != null) {
                        resolveAddressFromCoordinates(context, lat, lon)
                    } else {
                        _uiState.update { it.copy(isLocating = false) }
                    }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLocating = false) }
                }
            }
        }
    }

    fun onTitleChange(value: String) = _uiState.update { it.copy(title = value, titleError = null) }
    fun onDescriptionChange(value: String) = _uiState.update { it.copy(description = value, descriptionError = null) }
    fun onCategorySelect(category: CategoryDto) = _uiState.update { it.copy(selectedCategory = category, categoryError = null) }
    fun onLocationChange(value: String) = _uiState.update { it.copy(location = value, locationError = null) }
    fun onUrgentToggle(urgent: Boolean) = _uiState.update { it.copy(isUrgent = urgent) }

    fun onExpiryDaysChange(days: Int) {
        _uiState.update { current ->
            if (current.editingAnnouncementId != null) {
                val nextExtend = if (current.extendDays == days) null else days
                current.copy(extendDays = nextExtend)
            } else {
                current.copy(expiryDays = days)
            }
        }
    }

    /**
     * Викликається при натисканні на мапу: зберігає точні координати та визначає адресу
     */
    fun onMapLocationSelected(context: Context, lat: Double, lon: Double) {
        _uiState.update {
            it.copy(
                latitude = lat,
                longitude = lon,
                isLocating = true,
                locationError = null
            )
        }
        resolveAddressFromCoordinates(context, lat, lon)
    }

    /**
     * Пошук координат за введеною назвою міста/адреси, щоб перемістити маркер на мапі
     */
    fun searchAddressOnMap(context: Context) {
        val query = _uiState.value.location.trim()
        if (query.isEmpty()) {
            _uiState.update { it.copy(locationError = "Введіть назву міста або вулицю для пошуку") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLocating = true, locationError = null) }
            val coords = withContext(Dispatchers.IO) {
                try {
                    val response = ApiClient.geocodingService.searchAddress(query)
                    val first = response.body()?.firstOrNull()
                    val lat = first?.lat?.toDoubleOrNull()
                    val lon = first?.lon?.toDoubleOrNull()
                    if (response.isSuccessful && lat != null && lon != null) {
                        Pair(lat, lon)
                    } else null
                } catch (_: Exception) {
                    null
                } ?: try {
                    val geocoder = Geocoder(context, Locale.Builder().setLanguage("uk").setRegion("UA").build())
                    @Suppress("DEPRECATION")
                    val results = geocoder.getFromLocationName(query, 1)
                    if (!results.isNullOrEmpty()) {
                        Pair(results[0].latitude, results[0].longitude)
                    } else null
                } catch (_: Exception) {
                    null
                }
            }

            if (coords != null) {
                _uiState.update {
                    it.copy(
                        latitude = coords.first,
                        longitude = coords.second,
                        isLocating = false,
                        locationError = null
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        isLocating = false,
                        locationError = "Не вдалося знайти «$query» на мапі. Позначте точку вручну"
                    )
                }
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun fetchCurrentLocation(context: Context) {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        if (locationManager == null) {
            _uiState.update {
                it.copy(
                    isLocating = false,
                    locationError = "Служба геолокації недоступна. Позначте точку на мапі"
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
                    locationError = "GPS вимкнено. Увімкніть його або позначте точку на мапі"
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
            _uiState.update {
                it.copy(
                    isLocating = false,
                    locationError = "Не вдалося визначити GPS. Позначте точку на мапі нижче"
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
            val resolvedAddress = withContext(Dispatchers.IO) {
                val backendAddr = try {
                    val response = ApiClient.geocodingService.reverseGeocode(lat, lon)
                    val body = response.body()
                    if (response.isSuccessful && body != null) {
                        val addrMap = body.address
                        if (addrMap != null) {
                            val city = (addrMap["city"] ?: addrMap["town"] ?: addrMap["village"] ?: addrMap["state"])?.toString().orEmpty()
                            val road = addrMap["road"]?.toString().orEmpty()
                            val house = addrMap["house_number"]?.toString().orEmpty()
                            listOf(city, road, house)
                                .filter { it.isNotBlank() }
                                .joinToString(", ")
                                .ifEmpty { body.displayName }
                        } else {
                            body.displayName
                        }
                    } else null
                } catch (_: Exception) {
                    null
                }

                if (!backendAddr.isNullOrBlank()) return@withContext backendAddr

                try {
                    val geocoder = Geocoder(context, Locale.Builder().setLanguage("uk").setRegion("UA").build())
                    @Suppress("DEPRECATION")
                    val list = geocoder.getFromLocation(lat, lon, 1)
                    if (!list.isNullOrEmpty()) {
                        val addr = list[0]
                        val city = addr.locality ?: addr.subAdminArea ?: addr.adminArea ?: ""
                        val street = addr.thoroughfare ?: ""
                        val house = addr.subThoroughfare ?: ""
                        listOf(city, street, house)
                            .filter { it.isNotBlank() }
                            .joinToString(", ")
                            .ifEmpty { addr.getAddressLine(0) }
                    } else null
                } catch (_: Exception) {
                    null
                }
            }

            if (!resolvedAddress.isNullOrBlank()) {
                _uiState.update {
                    it.copy(
                        location = resolvedAddress,
                        isLocating = false,
                        locationError = null
                    )
                }
            } else {
                val coordsFallback = String.format(Locale.US, "%.5f, %.5f", lat, lon)
                _uiState.update {
                    it.copy(
                        location = it.location.ifBlank { coordsFallback },
                        isLocating = false,
                        locationError = null
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
        _uiState.update { current ->
            val maxNewAllowed = (5 - current.existingPhotos.size).coerceAtLeast(0)
            val updated = (current.selectedPhotos + uris).distinct().take(maxNewAllowed)
            current.copy(selectedPhotos = updated, photoError = null)
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

    fun onRemoveExistingPhoto(photoId: Int) {
        _uiState.update { current ->
            current.copy(
                existingPhotos = current.existingPhotos.filter { it.id != photoId },
                deletedPhotoIds = current.deletedPhotoIds + photoId,
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
                    locationError = if (!isLocationValid) "Оберіть точку на мапі або вкажіть адресу" else null,
                    photoError = if (hasOversizedPhotos) "Розмір фото перевищує 10 МБ" else null
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, generalError = null) }
            val editId = state.editingAnnouncementId

            val request = CreateAnnouncementRequest(
                title = state.title.trim(),
                description = state.description.trim(),
                categoryId = category.id,
                address = state.location.trim(),
                latitude = state.latitude ?: 0.0,
                longitude = state.longitude ?: 0.0,
                expiryDays = if (editId != null) null else state.expiryDays,
                isUrgent = if (state.isVolunteer) false else state.isUrgent
            )

            val result = if (editId != null) {
                repository.updateAnnouncement(editId, request)
            } else {
                repository.createAnnouncement(request)
            }

            when (result) {
                is Resource.Success -> {
                    val targetAnnouncementId = editId ?: result.data.announcement.id

                    // 1. Подовження строку актуальності (якщо обрано при редагуванні)
                    if (editId != null && state.extendDays != null && state.extendDays > 0) {
                        val extendResult = repository.extendAnnouncement(editId, state.extendDays)
                        if (extendResult is Resource.Error) {
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    generalError = extendResult.message
                                )
                            }
                            return@launch
                        }
                    }

                    // 2. Видалення старих фотографій, прибраних користувачем
                    var photoErrorOccurred = false
                    for (photoId in state.deletedPhotoIds) {
                        val deleteResult = repository.deletePhoto(targetAnnouncementId, photoId)
                        if (deleteResult is Resource.Error) {
                            photoErrorOccurred = true
                        }
                    }

                    // 3. Завантаження нових фотографій
                    for (photoUri in state.selectedPhotos) {
                        val uploadResult = repository.uploadPhoto(context, targetAnnouncementId, photoUri)
                        if (uploadResult is Resource.Error) {
                            photoErrorOccurred = true
                        }
                    }

                    if (photoErrorOccurred) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isSuccess = false,
                                generalError = "Зміни збережено, але не всі операції з фото виконано"
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