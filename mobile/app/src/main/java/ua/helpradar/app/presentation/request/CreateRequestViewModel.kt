package ua.helpradar.app.presentation.request

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.CreateAnnouncementRequest
import ua.helpradar.app.data.repository.AnnouncementRepository

class CreateRequestViewModel(
    private val repository: AnnouncementRepository = AnnouncementRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        CreateRequestFormState(
            isVolunteer = SessionManager.isVolunteer
        )
    )
    val uiState: StateFlow<CreateRequestFormState> = _uiState.asStateFlow()

    fun onTitleChange(value: String) = _uiState.update { it.copy(title = value, titleError = null) }
    fun onDescriptionChange(value: String) = _uiState.update { it.copy(description = value, descriptionError = null) }
    fun onCategorySelect(category: HelpCategoryItem) = _uiState.update { it.copy(selectedCategory = category, categoryError = null) }
    fun onLocationChange(value: String) = _uiState.update { it.copy(location = value, locationError = null) }
    fun onExpiryDaysChange(days: Int) = _uiState.update { it.copy(expiryDays = days) }
    fun onUrgentToggle(urgent: Boolean) = _uiState.update { it.copy(isUrgent = urgent) }

    fun submitRequest() {
        val state = _uiState.value

        val isTitleValid = state.title.trim().length in 5..100
        val isDescValid = state.description.trim().length in 10..2000
        val isCategoryValid = state.selectedCategory != null
        val isLocationValid = state.location.trim().isNotEmpty()

        if (!isTitleValid || !isDescValid || !isCategoryValid || !isLocationValid) {
            _uiState.update {
                it.copy(
                    titleError = if (!isTitleValid) "Назва має містити від 5 до 100 символів" else null,
                    descriptionError = if (!isDescValid) "Опис має містити від 10 до 2000 символів" else null,
                    categoryError = if (!isCategoryValid) "Оберіть категорію допомоги" else null,
                    locationError = if (!isLocationValid) "Вкажіть адресу або населений пункт" else null
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, generalError = null) }

            val request = CreateAnnouncementRequest(
                title = state.title.trim(),
                description = state.description.trim(),
                categoryId = state.selectedCategory!!.id,
                address = state.location.trim(),
                latitude = 50.4501,
                longitude = 30.5234,
                expiryDays = state.expiryDays,
                isUrgent = if (state.isVolunteer) false else state.isUrgent
            )

            when (val result = repository.createAnnouncement(request)) {
                is Resource.Success -> {
                    _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLoading = false, generalError = result.message) }
                }
            }
        }
    }
}