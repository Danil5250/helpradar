package ua.helpradar.app.presentation.request

data class HelpCategoryItem(
    val id: Int,
    val name: String
)

val defaultCategories = listOf(
    HelpCategoryItem(1, "Продукти та вода"),
    HelpCategoryItem(2, "Ліки та охорона здоров'я"),
    HelpCategoryItem(3, "Транспорт та евакуація"),
    HelpCategoryItem(4, "Тимчасове житло"),
    HelpCategoryItem(5, "Одяг та базові речі"),
    HelpCategoryItem(6, "Психологічна допомога"),
    HelpCategoryItem(7, "Допомога тваринам"),
    HelpCategoryItem(8, "Побутовий ремонт"),
    HelpCategoryItem(9, "Юридична допомога"),
    HelpCategoryItem(10, "Догляд за дітьми"),
    HelpCategoryItem(11, "Інша взаємодопомога")
)

data class CreateRequestFormState(
    val title: String = "",
    val description: String = "",
    val selectedCategory: HelpCategoryItem? = null,
    val location: String = "Харків",
    val expiryDays: Int = 14,
    val isUrgent: Boolean = false,

    val titleError: String? = null,
    val descriptionError: String? = null,
    val categoryError: String? = null,
    val locationError: String? = null,

    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val generalError: String? = null
)