package ua.helpradar.app.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.PublicProfileResponse
import ua.helpradar.app.data.network.dto.UserCommentDto
import ua.helpradar.app.data.repository.ProfileRepository

data class PublicProfileUiState(
    val isLoading: Boolean = true,
    val profile: PublicProfileResponse? = null,
    val comments: List<UserCommentDto> = emptyList(),
    val isLoadingComments: Boolean = false,
    val errorMessage: String? = null,
    val selectedRating: Int = 5,
    val commentText: String = "",
    val isSubmittingReview: Boolean = false,
    val reviewError: String? = null,
    val reviewSuccessMessage: String? = null,
    val deletingCommentId: Int? = null
) {
    val isOwnProfile: Boolean
        get() = profile?.id != null && profile.id == SessionManager.currentUserId

    val isVolunteer: Boolean
        get() = profile?.role?.equals("Volunteer", ignoreCase = true) == true

    val canLeaveReview: Boolean
        get() = profile != null && !isOwnProfile && isVolunteer && SessionManager.isLoggedIn
}

class PublicProfileViewModel(
    private val repository: ProfileRepository = ProfileRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(PublicProfileUiState())
    val uiState: StateFlow<PublicProfileUiState> = _uiState.asStateFlow()

    private var loadedUserId: Int? = null

    fun load(userId: Int, forceReload: Boolean = false) {
        if (!forceReload && loadedUserId == userId && _uiState.value.profile != null) return
        loadedUserId = userId

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    errorMessage = null,
                    reviewError = null,
                    reviewSuccessMessage = null
                )
            }

            when (val profileRes = repository.getPublicProfile(userId)) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            profile = profileRes.data,
                            isLoadingComments = true
                        )
                    }
                    loadComments(userId)
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = profileRes.message
                        )
                    }
                }
            }
        }
    }

    private suspend fun loadComments(userId: Int) {
        when (val commentsRes = repository.getUserComments(userId)) {
            is Resource.Success -> {
                _uiState.update {
                    it.copy(
                        isLoadingComments = false,
                        comments = commentsRes.data.items
                    )
                }
            }
            is Resource.Error -> {
                _uiState.update {
                    it.copy(
                        isLoadingComments = false
                    )
                }
            }
        }
    }

    fun onRatingSelect(rating: Int) {
        _uiState.update {
            it.copy(
                selectedRating = rating.coerceIn(1, 5),
                reviewError = null,
                reviewSuccessMessage = null
            )
        }
    }

    fun onCommentTextChange(text: String) {
        _uiState.update {
            it.copy(
                commentText = text,
                reviewError = null,
                reviewSuccessMessage = null
            )
        }
    }

    fun submitReview() {
        val userId = loadedUserId ?: return
        val currentState = _uiState.value
        val trimmed = currentState.commentText.trim()

        if (trimmed.isEmpty()) {
            _uiState.update { it.copy(reviewError = "Введіть текст відгуку") }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isSubmittingReview = true,
                    reviewError = null,
                    reviewSuccessMessage = null
                )
            }

            when (val res = repository.createUserComment(userId, currentState.selectedRating, trimmed)) {
                is Resource.Success -> {
                    val updatedProfile = _uiState.value.profile?.copy(
                        rating = res.data.rating ?: _uiState.value.profile?.rating,
                        reviewsCount = res.data.reviewsCount ?: _uiState.value.profile?.reviewsCount
                    )
                    _uiState.update {
                        it.copy(
                            isSubmittingReview = false,
                            profile = updatedProfile,
                            commentText = "",
                            selectedRating = 5,
                            reviewSuccessMessage = "Відгук успішно опубліковано"
                        )
                    }
                    loadComments(userId)
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

    fun deleteReview(commentId: Int) {
        val userId = loadedUserId ?: return
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    deletingCommentId = commentId,
                    reviewError = null,
                    reviewSuccessMessage = null
                )
            }

            when (val res = repository.deleteComment(commentId, userId)) {
                is Resource.Success -> {
                    val updatedProfile = _uiState.value.profile?.copy(
                        rating = res.data.rating ?: _uiState.value.profile?.rating,
                        reviewsCount = res.data.reviewsCount ?: _uiState.value.profile?.reviewsCount
                    )
                    _uiState.update {
                        it.copy(
                            deletingCommentId = null,
                            profile = updatedProfile,
                            comments = it.comments.filterNot { c -> c.id == commentId },
                            reviewSuccessMessage = "Відгук видалено"
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update {
                        it.copy(
                            deletingCommentId = null,
                            reviewError = res.message
                        )
                    }
                }
            }
        }
    }
}