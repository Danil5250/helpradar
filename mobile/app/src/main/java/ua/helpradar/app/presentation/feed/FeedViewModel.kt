package ua.helpradar.app.presentation.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.repository.AnnouncementRepository

data class FeedUiState(
    val searchQuery: String = "",
    val selectedCategory: String? = null,
    val selectedType: AnnouncementType? = null,
    val announcements: List<AnnouncementItem> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

class FeedViewModel(
    private val repository: AnnouncementRepository = AnnouncementRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(FeedUiState())
    val uiState: StateFlow<FeedUiState> = _uiState.asStateFlow()

    private var allLoadedAnnouncements = listOf<AnnouncementItem>()

    init {
        loadFeed()
    }

    fun loadFeed() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = repository.getAnnouncements()) {
                is Resource.Success -> {
                    val serverItems = result.data.orEmpty().map { dto ->
                        val authorDisplayName = dto.author?.name
                            ?: listOfNotNull(dto.author?.firstName, dto.author?.lastName).joinToString(" ").ifEmpty { "Користувач" }

                        AnnouncementItem(
                            id = dto.id,
                            title = dto.title,
                            description = dto.excerpt ?: dto.description ?: "",
                            categoryName = dto.category?.name ?: "Загальне",
                            type = if (dto.type.equals("HelpOffer", ignoreCase = true) || dto.type.equals("offer", ignoreCase = true)) {
                                AnnouncementType.OFFER
                            } else {
                                AnnouncementType.REQUEST
                            },
                            distanceKm = dto.distanceKm ?: 0.0,
                            postedTimeAgo = "Нещодавно",
                            authorName = authorDisplayName,
                            authorRating = dto.author?.rating ?: 5.0,
                            isUrgent = dto.isUrgent
                        )
                    }
                    allLoadedAnnouncements = serverItems
                    _uiState.update { it.copy(isLoading = false, announcements = serverItems) }
                }
                is Resource.Error -> {
                    _uiState.update { it.copy(isLoading = false, errorMessage = result.message) }
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

        val filtered = allLoadedAnnouncements.filter { item ->
            val matchesQuery = query.isEmpty() ||
                    item.title.lowercase().contains(query) ||
                    item.description.lowercase().contains(query)
            val matchesCategory = category == null || item.categoryName == category
            val matchesType = type == null || item.type == type

            matchesQuery && matchesCategory && matchesType
        }

        _uiState.update { it.copy(announcements = filtered) }
    }
}