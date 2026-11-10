package ua.helpradar.app.presentation.details

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.AnnouncementDetailsDto
import ua.helpradar.app.data.repository.AnnouncementRepository

data class AnnouncementDetailsUiState(
    val isLoading: Boolean = true,
    val announcement: AnnouncementDetailsDto? = null,
    val errorMessage: String? = null
)

class AnnouncementDetailsViewModel(
    private val repository: AnnouncementRepository = AnnouncementRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(AnnouncementDetailsUiState())
    val uiState: StateFlow<AnnouncementDetailsUiState> = _uiState.asStateFlow()

    fun loadDetails(announcementId: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = repository.getAnnouncementDetails(announcementId)) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            announcement = result.data,
                            errorMessage = null
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = result.message
                        )
                    }
                }
            }
        }
    }
}