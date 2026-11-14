package ua.helpradar.app.presentation.details

import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import ua.helpradar.app.MainDispatcherRule
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.AnnouncementDetailsDto
import ua.helpradar.app.data.repository.AnnouncementRepository

class AnnouncementDetailsViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun detailsLoadSuccessAndErrorUpdateLoadingState() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<AnnouncementRepository>()
        val details = mockk<AnnouncementDetailsDto>()
        coEvery { repository.getAnnouncementDetails(5) } returns Resource.Success(details)
        coEvery { repository.getAnnouncementDetails(6) } returns Resource.Error("Не знайдено")
        val viewModel = AnnouncementDetailsViewModel(repository)

        assertTrue(viewModel.uiState.value.isLoading)
        viewModel.loadDetails(5)
        advanceUntilIdle()
        assertEquals(details, viewModel.uiState.value.announcement)
        assertFalse(viewModel.uiState.value.isLoading)
        assertNull(viewModel.uiState.value.errorMessage)

        viewModel.loadDetails(6)
        advanceUntilIdle()
        assertEquals("Не знайдено", viewModel.uiState.value.errorMessage)
        assertFalse(viewModel.uiState.value.isLoading)
        coVerify(exactly = 1) { repository.getAnnouncementDetails(5) }
        coVerify(exactly = 1) { repository.getAnnouncementDetails(6) }
    }
}
