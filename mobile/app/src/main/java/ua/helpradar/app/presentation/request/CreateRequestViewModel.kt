package ua.helpradar.app.presentation.request

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class CreateRequestViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(CreateRequestFormState())
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

            delay(1200)

            _uiState.update { it.copy(isLoading = false, isSuccess = true) }
        }
    }
}