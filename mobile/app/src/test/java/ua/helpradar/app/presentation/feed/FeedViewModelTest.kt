package ua.helpradar.app.presentation.feed

import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import ua.helpradar.app.MainDispatcherRule
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.CategoryDto
import ua.helpradar.app.data.repository.AnnouncementRepository
import ua.helpradar.app.data.repository.ProfileRepository

class FeedViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun feedLoadsAndAppliesSearchCategoryAndTypeFilters() = runTest(mainDispatcherRule.dispatcher) {
        val announcementRepository = mockk<AnnouncementRepository>()
        val profileRepository = mockk<ProfileRepository>()
        val items = listOf(
            item(1, "Терміново потрібна їжа", "Допомога родині", "Їжа", AnnouncementType.REQUEST),
            item(2, "Пропоную одяг", "Є теплі речі", "Одяг", AnnouncementType.OFFER)
        )
        coEvery { announcementRepository.getAnnouncements() } returns Resource.Success(items)
        coEvery { announcementRepository.getCategories() } returns Resource.Success(listOf(CategoryDto(1, "Їжа")))
        coEvery { profileRepository.getProfile() } returns Resource.Error("Offline")
        val viewModel = FeedViewModel(announcementRepository, profileRepository)
        advanceUntilIdle()

        assertEquals(items, viewModel.uiState.value.announcements)
        assertEquals(listOf(CategoryDto(1, "Їжа")), viewModel.uiState.value.categories)
        viewModel.onSearchQueryChange(" РОДИНІ ")
        viewModel.onCategorySelect("їжа")
        viewModel.onTypeSelect(AnnouncementType.REQUEST)

        assertEquals(listOf(1), viewModel.uiState.value.announcements.map { it.id })
        viewModel.onSearchQueryChange("відсутнє")
        assertTrue(viewModel.uiState.value.announcements.isEmpty())
    }

    @Test
    fun feedErrorClearsItemsAndOnlyMineUsesOwnEndpoint() = runTest(mainDispatcherRule.dispatcher) {
        val announcementRepository = mockk<AnnouncementRepository>()
        val profileRepository = mockk<ProfileRepository>()
        coEvery { announcementRepository.getAnnouncements() } returns Resource.Error("Сервер недоступний")
        coEvery { announcementRepository.getMyAnnouncements() } returns Resource.Success(listOf(item(9)))
        coEvery { announcementRepository.getCategories() } returns Resource.Error("Categories unavailable")
        coEvery { profileRepository.getProfile() } returns Resource.Error("Offline")
        val viewModel = FeedViewModel(announcementRepository, profileRepository)
        advanceUntilIdle()

        assertEquals("Сервер недоступний", viewModel.uiState.value.errorMessage)
        assertTrue(viewModel.uiState.value.announcements.isEmpty())
        assertFalse(viewModel.uiState.value.isLoading)
        viewModel.onToggleOnlyMy(true)
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.onlyMyAnnouncements)
        assertEquals(listOf(9), viewModel.uiState.value.announcements.map { it.id })
        coVerify(exactly = 1) { announcementRepository.getMyAnnouncements() }
    }

    private fun item(
        id: Int,
        title: String = "Допомога",
        description: String = "Потрібна допомога",
        category: String = "Інше",
        type: AnnouncementType = AnnouncementType.REQUEST
    ) = AnnouncementItem(
        id = id,
        title = title,
        description = description,
        categoryName = category,
        type = type,
        distanceKm = 0.0,
        postedTimeAgo = "сьогодні",
        authorId = null,
        authorName = "Користувач",
        authorRating = 5.0
    )
}
