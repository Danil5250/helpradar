package ua.helpradar.app.presentation.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.CategoryDto
import ua.helpradar.app.data.repository.AnnouncementRepository

data class FeedUiState(
    val searchQuery: String = "",
    val categories: List<CategoryDto> = emptyList(),
    val isCategoriesLoading: Boolean = false,
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

    // Зберігаємо сирі дані з бекенду для локальної фільтрації за категорією/пошуком
    private var rawBackendAnnouncements: List<AnnouncementItem> = emptyList()

    init {
        loadFeed()
        loadCategories()
    }

    fun loadFeed() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = repository.getAnnouncements()) {
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
}