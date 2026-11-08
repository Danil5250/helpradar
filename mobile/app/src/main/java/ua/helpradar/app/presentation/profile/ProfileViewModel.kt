package ua.helpradar.app.presentation.profile

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.ProfileResponse
import ua.helpradar.app.data.network.dto.UpdateProfileRequest
import ua.helpradar.app.data.repository.ProfileRepository

data class ProfileUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val isAvatarUploading: Boolean = false,
    val profile: ProfileResponse? = null,
    val isEditing: Boolean = false,
    val editFirstName: String = "",
    val editLastName: String = "",
    val editPhone: String = "",
    val editCity: String = "",
    val editAboutMe: String = "",
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class ProfileViewModel(
    private val repository: ProfileRepository = ProfileRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    private val maxAvatarSizeBytes = 5 * 1024 * 1024L
    private val allowedMimeTypes = setOf("image/jpeg", "image/png", "image/webp")

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val res = repository.getProfile()) {
                is Resource.Success -> {
                    val p = res.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            profile = p,
                            editFirstName = p.firstName,
                            editLastName = p.lastName,
                            editPhone = p.phoneNumber.orEmpty(),
                            editCity = p.city.orEmpty(),
                            editAboutMe = p.aboutMe.orEmpty()
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLoading = false, errorMessage = res.message) }
                }
            }
        }
    }

    fun startEditing() {
        val p = _uiState.value.profile ?: return
        _uiState.update {
            it.copy(
                isEditing = true,
                editFirstName = p.firstName,
                editLastName = p.lastName,
                editPhone = p.phoneNumber.orEmpty(),
                editCity = p.city.orEmpty(),
                editAboutMe = p.aboutMe.orEmpty(),
                errorMessage = null,
                successMessage = null
            )
        }
    }

    fun cancelEditing() {
        _uiState.update { it.copy(isEditing = false, errorMessage = null) }
    }

    fun onFirstNameChange(v: String) = _uiState.update { it.copy(editFirstName = v) }
    fun onLastNameChange(v: String) = _uiState.update { it.copy(editLastName = v) }
    fun onPhoneChange(v: String) = _uiState.update { it.copy(editPhone = v) }
    fun onCityChange(v: String) = _uiState.update { it.copy(editCity = v) }
    fun onAboutMeChange(v: String) = _uiState.update { it.copy(editAboutMe = v) }

    fun onAvatarSelected(context: Context, uri: Uri) {
        val mimeType = context.contentResolver.getType(uri)
        if (mimeType != null && mimeType !in allowedMimeTypes) {
            _uiState.update {
                it.copy(errorMessage = "Дозволені лише формати JPEG, PNG або WebP (SRS 3.2.12.5)")
            }
            return
        }

        val size = try {
            context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (sizeIndex != -1 && cursor.moveToFirst()) cursor.getLong(sizeIndex) else 0L
            } ?: 0L
        } catch (_: Exception) {
            0L
        }

        if (size > maxAvatarSizeBytes) {
            _uiState.update {
                it.copy(errorMessage = "Розмір зображення не повинен перевищувати 5 МБ (SRS 3.2.12.5)")
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isAvatarUploading = true, errorMessage = null, successMessage = null) }
            when (val res = repository.uploadAvatar(context, uri)) {
                is Resource.Success -> {
                    _uiState.update { state ->
                        state.copy(
                            isAvatarUploading = false,
                            profile = state.profile?.copy(avatarUrl = res.data),
                            successMessage = "Аватар успішно оновлено!"
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(isAvatarUploading = false, errorMessage = res.message)
                    }
                }
            }
        }
    }

    fun saveProfile() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null, successMessage = null) }
            val req = UpdateProfileRequest(
                firstName = state.editFirstName.trim(),
                lastName = state.editLastName.trim(),
                phoneNumber = state.editPhone.trim(),
                city = state.editCity.trim(),
                aboutMe = state.editAboutMe.trim()
            )
            when (val res = repository.updateProfile(req)) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            isEditing = false,
                            profile = res.data,
                            successMessage = "Профіль успішно оновлено!"
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isSaving = false, errorMessage = res.message) }
                }
            }
        }
    }
}