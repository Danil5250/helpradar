package ua.helpradar.app.presentation.details

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.AnnouncementDetailsDto
import ua.helpradar.app.data.network.dto.HelpOverviewResponse
import ua.helpradar.app.data.repository.AnnouncementRepository
import ua.helpradar.app.data.repository.HelpRepository
import ua.helpradar.app.data.repository.ProfileRepository

data class AnnouncementDetailsUiState(
    val isLoading: Boolean = true,
    val announcement: AnnouncementDetailsDto? = null,
    val errorMessage: String? = null,
    val helpOverview: HelpOverviewResponse? = null,
    val isHelpLoading: Boolean = false,
    val selectedUserRequestId: Int? = null,
    val isSubmittingHelp: Boolean = false,
    val actionInProgressId: Int? = null,
    val helpFeedbackMessage: String? = null,
    val helpErrorMessage: String? = null,
    val reviewRating: Int = 5,
    val reviewText: String = "",
    val isSubmittingReview: Boolean = false,
    val reviewError: String? = null,
    val reviewSuccess: String? = null
)

class AnnouncementDetailsViewModel(
    private val repository: AnnouncementRepository = AnnouncementRepository(),
    private val helpRepository: HelpRepository = HelpRepository(),
    private val profileRepository: ProfileRepository = ProfileRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(AnnouncementDetailsUiState())
    val uiState: StateFlow<AnnouncementDetailsUiState> = _uiState.asStateFlow()

    private var currentAnnouncementId: Int? = null

    fun loadDetails(announcementId: Int) {
        currentAnnouncementId = announcementId
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    errorMessage = null,
                    helpErrorMessage = null,
                    helpFeedbackMessage = null
                )
            }

            when (val result = repository.getAnnouncementDetails(announcementId)) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            announcement = result.data
                        )
                    }
                    if (SessionManager.isLoggedIn) {
                        loadHelpOverview(announcementId)
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

    private suspend fun loadHelpOverview(announcementId: Int) {
        _uiState.update { it.copy(isHelpLoading = true) }
        when (val helpRes = helpRepository.getAnnouncementHelp(announcementId)) {
            is Resource.Success -> {
                val data = helpRes.data
                _uiState.update { state ->
                    val validSelectedId = state.selectedUserRequestId?.takeIf { id ->
                        data.requests.any { it.id == id }
                    }
                    state.copy(
                        isHelpLoading = false,
                        helpOverview = data,
                        selectedUserRequestId = validSelectedId
                    )
                }
            }
            is Resource.Error -> {
                _uiState.update {
                    it.copy(
                        isHelpLoading = false,
                        helpErrorMessage = helpRes.message
                    )
                }
            }
        }
    }

    fun onSelectUserRequest(requestId: Int?) {
        _uiState.update {
            it.copy(
                selectedUserRequestId = requestId,
                helpErrorMessage = null,
                helpFeedbackMessage = null
            )
        }
    }

    fun respondToRequest() {
        val announcementId = currentAnnouncementId ?: return
        submitHelpCall(
            successText = "Пропозицію допомоги надіслано",
            call = { helpRepository.respondToRequest(announcementId) }
        )
    }

    fun receiveOffer() {
        val announcementId = currentAnnouncementId ?: return
        val selectedReqId = _uiState.value.selectedUserRequestId
        submitHelpCall(
            successText = "Запит на допомогу надіслано волонтеру",
            call = {
                if (selectedReqId != null) {
                    helpRepository.requestHelpWithAnnouncement(announcementId, selectedReqId)
                } else {
                    helpRepository.receiveOffer(announcementId)
                }
            }
        )
    }

    private fun submitHelpCall(
        successText: String,
        call: suspend () -> Resource<*>
    ) {
        val announcementId = currentAnnouncementId ?: return
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isSubmittingHelp = true,
                    helpErrorMessage = null,
                    helpFeedbackMessage = null
                )
            }

            when (val res = call()) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmittingHelp = false,
                            selectedUserRequestId = null,
                            helpFeedbackMessage = successText
                        )
                    }
                    loadHelpOverview(announcementId)
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            isSubmittingHelp = false,
                            helpErrorMessage = res.message
                        )
                    }
                }
            }
        }
    }

    fun performConnectionAction(connectionId: Int, action: String) {
        val announcementId = currentAnnouncementId ?: return
        val successText = when (action) {
            "accept" -> "Заявку прийнято"
            "decline" -> "Заявку відхилено"
            "withdraw" -> "Заявку відкликано"
            "cancel" -> "Взаємодію скасовано"
            "complete" -> "Допомогу підтверджено! Тепер можна залишити відгук волонтеру"
            else -> "Статус оновлено"
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    actionInProgressId = connectionId,
                    helpErrorMessage = null,
                    helpFeedbackMessage = null
                )
            }

            when (val res = helpRepository.performAction(connectionId, action)) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            actionInProgressId = null,
                            helpFeedbackMessage = successText
                        )
                    }
                    loadHelpOverview(announcementId)
                    when (val detailsRes = repository.getAnnouncementDetails(announcementId)) {
                        is Resource.Success -> _uiState.update { it.copy(announcement = detailsRes.data) }
                        else -> Unit
                    }
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            actionInProgressId = null,
                            helpErrorMessage = res.message
                        )
                    }
                }
            }
        }
    }
    fun onReviewRatingChange(rating: Int) {
        _uiState.update {
            it.copy(
                reviewRating = rating.coerceIn(1, 5),
                reviewError = null,
                reviewSuccess = null
            )
        }
    }

    fun onReviewTextChange(text: String) {
        _uiState.update {
            it.copy(
                reviewText = text,
                reviewError = null,
                reviewSuccess = null
            )
        }
    }

    fun submitReview(volunteerUserId: Int?) {
        val announcementId = currentAnnouncementId ?: return
        val currentState = _uiState.value
        val trimmed = currentState.reviewText.trim()

        if (trimmed.isEmpty()) {
            _uiState.update { it.copy(reviewError = "Введіть текст відгуку") }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isSubmittingReview = true,
                    reviewError = null,
                    reviewSuccess = null
                )
            }

            when (val res = profileRepository.createAnnouncementComment(
                announcementId = announcementId,
                volunteerUserId = volunteerUserId,
                rating = currentState.reviewRating,
                description = trimmed
            )) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isSubmittingReview = false,
                            reviewText = "",
                            reviewRating = 5,
                            reviewSuccess = "Дякуємо! Ваш відгук опубліковано"
                        )
                    }
                    loadHelpOverview(announcementId)
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            isSubmittingReview = false,
                            reviewError = res.message
                        )
                    }
                }
            }
        }
    }
}