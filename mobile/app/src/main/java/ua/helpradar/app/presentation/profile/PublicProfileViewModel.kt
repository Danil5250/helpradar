package ua.helpradar.app.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.PublicProfileResponse
import ua.helpradar.app.data.network.dto.UserCommentDto
import ua.helpradar.app.data.repository.ProfileRepository

data class PublicProfileUiState(
    val isLoading: Boolean = true,
    val profile: PublicProfileResponse? = null,
    val comments: List<UserCommentDto> = emptyList(),
    val isLoadingComments: Boolean = false,
    val errorMessage: String? = null
)

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
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }

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
                    it.copy(isLoadingComments = false)
                }
            }
        }
    }
}