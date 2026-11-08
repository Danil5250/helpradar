package ua.helpradar.app.presentation.profile

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