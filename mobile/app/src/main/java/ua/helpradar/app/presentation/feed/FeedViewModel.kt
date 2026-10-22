package ua.helpradar.app.presentation.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.presentation.request.defaultCategories

data class FeedUiState(
    val searchQuery: String = "",
    val selectedCategory: String? = null,
    val selectedType: AnnouncementType? = null,
    val announcements: List<AnnouncementItem> = emptyList(),
    val isLoading: Boolean = false
)

class FeedViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(FeedUiState())
    val uiState: StateFlow<FeedUiState> = _uiState.asStateFlow()

    // Тестові дані згідно з категоріями Appendix A.2
    private val mockAnnouncements = listOf(
        AnnouncementItem(
            id = 1,
            title = "Потрібні теплі ковдри та обігрівач",
            description = "Для літньої людини, мікрорайон Таврійський. Опалення поки нестабільне.",
            categoryName = "Одяг та базові речі",
            type = AnnouncementType.REQUEST,
            distanceKm = 1.2,
            postedTimeAgo = "15 хв тому",
            authorName = "Олена М.",
            authorRating = 4.9,
            isUrgent = true
        ),
        AnnouncementItem(
            id = 2,
            title = "Доставка питної води у бутлях",
            description = "Маю авто з великим багажником, можу привезти воду тим, хто не може дійти до свердловини.",
            categoryName = "Продукти та вода",
            type = AnnouncementType.OFFER,
            distanceKm = 3.5,
            postedTimeAgo = "1 год тому",
            authorName = "Сергій В.",
            authorRating = 5.0,
            isUrgent = false
        ),
        AnnouncementItem(
            id = 3,
            title = "Терміново потрібен L-тироксин 100",
            description = "Немає в наявності в найближчих аптеках. Потрібна хоча б одна пластинка.",
            categoryName = "Ліки та охорона здоров'я",
            type = AnnouncementType.REQUEST,
            distanceKm = 0.8,
            postedTimeAgo = "25 хв тому",
            authorName = "Надія П.",
            authorRating = 4.8,
            isUrgent = true
        ),
        AnnouncementItem(
            id = 4,
            title = "Допомога з ремонтом вікон після вибухової хвилі",
            description = "Є плівка, OSB-плити та інструменти. Допоможу закрити віконні отвори безкоштовно.",
            categoryName = "Побутовий ремонт",
            type = AnnouncementType.OFFER,
            distanceKm = 4.1,
            postedTimeAgo = "3 год тому",
            authorName = "Микола К.",
            authorRating = 4.95,
            isUrgent = false
        )
    )

    init {
        loadFeed()
    }

    private fun loadFeed() {
        _uiState.update { it.copy(announcements = mockAnnouncements) }
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

        val filtered = mockAnnouncements.filter { item ->
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