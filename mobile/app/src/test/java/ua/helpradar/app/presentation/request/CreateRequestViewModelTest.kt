package ua.helpradar.app.presentation.request

import android.content.Context
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import ua.helpradar.app.MainDispatcherRule
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.AnnouncementIdDto
import ua.helpradar.app.data.network.dto.CategoryDto
import ua.helpradar.app.data.network.dto.CreateAnnouncementResponse
import ua.helpradar.app.data.repository.AnnouncementRepository

class CreateRequestViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Before
    fun resetSession() {
        SessionManager.clear()
    }

    @After
    fun clearSession() {
        SessionManager.clear()
        CreateRequestViewModel.itemToEdit = null
    }

    @Test
    fun invalidFormSetsFieldErrorsAndDoesNotSubmit() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<AnnouncementRepository>()
        coEvery { repository.getCategories() } returns Resource.Success(emptyList())
        val viewModel = CreateRequestViewModel(repository)
        advanceUntilIdle()

        viewModel.submitRequest(mockk<Context>(relaxed = true))
        advanceUntilIdle()

        assertNotNull(viewModel.uiState.value.titleError)
        assertNotNull(viewModel.uiState.value.descriptionError)
        assertNotNull(viewModel.uiState.value.categoryError)
        assertNotNull(viewModel.uiState.value.locationError)
        coVerify(exactly = 0) { repository.createAnnouncement(any()) }
    }

    @Test
    fun successfulSubmissionSendsTrimmedRequestAndUpdatesState() = runTest(mainDispatcherRule.dispatcher) {
        val category = CategoryDto(id = 3, name = "Їжа")
        val repository = mockk<AnnouncementRepository>()
        coEvery { repository.getCategories() } returns Resource.Success(listOf(category))
        coEvery { repository.createAnnouncement(any()) } returns Resource.Success(
            CreateAnnouncementResponse("created", null, AnnouncementIdDto(42))
        )
        val viewModel = CreateRequestViewModel(repository)
        advanceUntilIdle()
        viewModel.onTitleChange("  Допомога  ")
        viewModel.onDescriptionChange("  Потрібна допомога родині  ")
        viewModel.onCategorySelect(category)
        viewModel.onLocationChange("  Київ  ")
        viewModel.onUrgentToggle(true)

        viewModel.submitRequest(mockk<Context>(relaxed = true))
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isSuccess)
        assertFalse(viewModel.uiState.value.isLoading)
        coVerify {
            repository.createAnnouncement(
                match {
                    it.title == "Допомога" &&
                        it.description == "Потрібна допомога родині" &&
                        it.categoryId == category.id &&
                        it.address == "Київ" &&
                        it.isUrgent
                }
            )
        }
    }

    @Test
    fun submissionErrorIsDisplayedAndEditModePreservesCategory() = runTest(mainDispatcherRule.dispatcher) {
        val category = CategoryDto(id = 8, name = "Ліки")
        val repository = mockk<AnnouncementRepository>()
        coEvery { repository.getCategories() } returns Resource.Success(listOf(category))
        coEvery { repository.updateAnnouncement(any(), any()) } returns Resource.Error("Немає доступу")
        val viewModel = CreateRequestViewModel(repository)
        advanceUntilIdle()
        viewModel.setEditMode(
            id = 12,
            title = "  Потрібні ліки ",
            description = "  Опис оголошення довший за десять символів ",
            categoryName = "ЛІКИ",
            isUrgent = true,
            location = "Одеса"
        )

        assertEquals(category, viewModel.uiState.value.selectedCategory)
        assertEquals("Потрібні ліки", viewModel.uiState.value.title)
        viewModel.submitRequest(mockk<Context>(relaxed = true))
        advanceUntilIdle()

        assertEquals("Немає доступу", viewModel.uiState.value.generalError)
        assertFalse(viewModel.uiState.value.isLoading)
        coVerify(exactly = 1) { repository.updateAnnouncement(12, any()) }
        coVerify(exactly = 0) { repository.createAnnouncement(any()) }
    }
}
