package ua.helpradar.app.presentation.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.CategoryDto
import ua.helpradar.app.data.repository.AnnouncementRepository
import ua.helpradar.app.data.repository.ProfileRepository

data class FeedUiState(
    val searchQuery: String = "",
    val categories: List<CategoryDto> = emptyList(),
    val isCategoriesLoading: Boolean = false,
    val selectedCategory: String? = null,
    val selectedType: AnnouncementType? = null,
    val onlyMyAnnouncements: Boolean = false,
    val announcements: List<AnnouncementItem> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val userAvatarUrl: String? = SessionManager.currentUserAvatarUrl,
    val userName: String = SessionManager.currentUserName
)

class FeedViewModel(
    private val repository: AnnouncementRepository = AnnouncementRepository(),
    private val profileRepository: ProfileRepository = ProfileRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(FeedUiState())
    val uiState: StateFlow<FeedUiState> = _uiState.asStateFlow()

    private var rawBackendAnnouncements: List<AnnouncementItem> = emptyList()

    init {
        loadFeed()
        loadCategories()
        syncUserProfile() // Фонове підтягування аватара та імені в SessionManager
    }

    private fun syncUserProfile() {
        viewModelScope.launch {
            when (val res = profileRepository.getProfile()) {
                is Resource.Success -> {
                    res.data?.let { profile ->
                        _uiState.update {
                            it.copy(
                                userAvatarUrl = profile.avatarUrl,
                                userName = "${profile.firstName} ${profile.lastName}".trim()
                            )
                        }
                    }
                }
                else -> {}
            }
        }
    }

    fun loadFeed() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val result = if (_uiState.value.onlyMyAnnouncements) {
                repository.getMyAnnouncements()
            } else {
                repository.getAnnouncements()
            }
            when (result) {
                is Resource.Success -> {
                    rawBackendAnnouncements = result.data
                    applyFilters()
                    _uiState.update { it.copy(isLoading = false) }
                }
                is Resource.Error -> {
                    rawBackendAnnouncements = emptyList()
                    _uiState.update {
                        it.copy(
                            announcements = emptyList(),
                            isLoading = false,
                            errorMessage = result.message
                        )
                    }
                }
            }
        }
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

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        applyFilters()
    }

    fun onCategorySelect(categoryName: String?) {
        _uiState.update {
            it.copy(selectedCategory = if (it.selectedCategory == categoryName) null else categoryName)
        }
        applyFilters()
    }

    fun onTypeSelect(type: AnnouncementType?) {
        _uiState.update {
            it.copy(selectedType = if (it.selectedType == type) null else type)
        }
        applyFilters()
    }

    private fun applyFilters() {
        val query = _uiState.value.searchQuery.trim().lowercase()
        val category = _uiState.value.selectedCategory
        val type = _uiState.value.selectedType
        val filtered = rawBackendAnnouncements.filter { item ->
            val matchesQuery = query.isEmpty() ||
                    item.title.lowercase().contains(query) ||
                    item.description.lowercase().contains(query)
            val matchesCategory = category == null || item.categoryName.equals(category, ignoreCase = true)
            val matchesType = type == null || item.type == type
            matchesQuery && matchesCategory && matchesType
        }
        _uiState.update { it.copy(announcements = filtered) }
    }

    fun onToggleOnlyMy(onlyMy: Boolean) {
        _uiState.update { it.copy(onlyMyAnnouncements = onlyMy) }
        loadFeed()
    }

    fun onCloseAnnouncement(id: Int) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = repository.closeAnnouncement(id)) {
                is Resource.Success -> {
                    loadFeed()
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLoading = false, errorMessage = result.message) }
                }
            }
        }
    }
}