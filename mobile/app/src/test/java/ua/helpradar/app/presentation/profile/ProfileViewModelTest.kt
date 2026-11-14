package ua.helpradar.app.presentation.profile

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
import ua.helpradar.app.data.network.dto.ProfileResponse
import ua.helpradar.app.data.network.dto.UpdateProfileRequest
import ua.helpradar.app.data.repository.ProfileRepository

class ProfileViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun profileLoadsEditsAndSavesTrimmedValues() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<ProfileRepository>()
        val original = profile(firstName = "Олена", city = "Київ", aboutMe = "Привіт")
        val updated = profile(firstName = "Олена Марія", city = "Львів")
        coEvery { repository.getProfile() } returns Resource.Success(original)
        coEvery { repository.updateProfile(any()) } returns Resource.Success(updated)
        val viewModel = ProfileViewModel(repository)
        advanceUntilIdle()

        assertEquals(original, viewModel.uiState.value.profile)
        viewModel.startEditing()
        viewModel.onFirstNameChange(" Олена Марія ")
        viewModel.onCityChange(" Львів ")
        viewModel.onAboutMeChange("  Допомагаю людям  ")
        viewModel.saveProfile()
        advanceUntilIdle()

        assertEquals(updated, viewModel.uiState.value.profile)
        assertFalse(viewModel.uiState.value.isSaving)
        assertFalse(viewModel.uiState.value.isEditing)
        assertEquals("Профіль успішно оновлено!", viewModel.uiState.value.successMessage)
        coVerify {
            repository.updateProfile(
                match<UpdateProfileRequest> {
                    it.firstName == "Олена Марія" &&
                        it.city == "Львів" &&
                        it.aboutMe == "Допомагаю людям"
                }
            )
        }
    }

    @Test
    fun profileSaveErrorIsExposed() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<ProfileRepository>()
        coEvery { repository.getProfile() } returns Resource.Success(profile(firstName = "Олена"))
        coEvery { repository.updateProfile(any()) } returns Resource.Error("Збереження не вдалося")
        val viewModel = ProfileViewModel(repository)
        advanceUntilIdle()

        viewModel.startEditing()
        viewModel.saveProfile()
        advanceUntilIdle()

        assertEquals("Збереження не вдалося", viewModel.uiState.value.errorMessage)
        assertFalse(viewModel.uiState.value.isSaving)
        assertTrue(viewModel.uiState.value.isEditing)
    }

    @Test
    fun profileLoadErrorIsExposed() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<ProfileRepository>()
        coEvery { repository.getProfile() } returns Resource.Error("Профіль недоступний")
        val viewModel = ProfileViewModel(repository)
        advanceUntilIdle()

        assertEquals("Профіль недоступний", viewModel.uiState.value.errorMessage)
        assertFalse(viewModel.uiState.value.isLoading)
    }

    private fun profile(
        firstName: String,
        city: String? = null,
        aboutMe: String? = null
    ) = ProfileResponse(
        id = 1,
        firstName = firstName,
        lastName = "Петренко",
        email = "user@example.com",
        role = "person_in_need",
        city = city,
        aboutMe = aboutMe
    )
}
