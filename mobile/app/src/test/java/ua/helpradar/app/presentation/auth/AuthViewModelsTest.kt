package ua.helpradar.app.presentation.auth

import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import ua.helpradar.app.MainDispatcherRule
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.RegisterRequest
import ua.helpradar.app.data.repository.AuthRepository

class AuthViewModelsTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun loginRejectsInvalidEmailWithoutCallingRepository() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<AuthRepository>()
        val viewModel = LoginViewModel(repository)
        viewModel.onEmailChange("not-an-email")
        viewModel.onPasswordChange("password")

        viewModel.submitLogin()
        advanceUntilIdle()

        assertNotNull(viewModel.uiState.value.emailError)
        assertFalse(viewModel.uiState.value.isLoading)
        coVerify(exactly = 0) { repository.login(any(), any()) }
    }

    @Test
    fun loginTrimsEmailAndExposesSuccessfulState() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<AuthRepository>()
        coEvery { repository.login("user@example.com", "password") } returns Resource.Success("token")
        val viewModel = LoginViewModel(repository)
        viewModel.onEmailChange(" user@example.com ")
        viewModel.onPasswordChange("password")

        viewModel.submitLogin()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isSuccess)
        assertFalse(viewModel.uiState.value.isLoading)
        coVerify(exactly = 1) { repository.login("user@example.com", "password") }
    }

    @Test
    fun loginSurfacesRepositoryError() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<AuthRepository>()
        coEvery { repository.login(any(), any()) } returns Resource.Error("Невірний пароль")
        val viewModel = LoginViewModel(repository)
        viewModel.onEmailChange("user@example.com")
        viewModel.onPasswordChange("password")

        viewModel.submitLogin()
        advanceUntilIdle()

        assertEquals("Невірний пароль", viewModel.uiState.value.generalError)
        assertFalse(viewModel.uiState.value.isLoading)
        assertFalse(viewModel.uiState.value.isSuccess)
    }

    @Test
    fun registrationValidatesRequiredFieldsBeforeNetworkCall() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<AuthRepository>()
        val viewModel = RegisterViewModel(repository)

        viewModel.submitRegistration()
        advanceUntilIdle()

        assertNotNull(viewModel.uiState.value.firstNameError)
        assertNotNull(viewModel.uiState.value.emailError)
        assertNotNull(viewModel.uiState.value.termsError)
        coVerify(exactly = 0) { repository.register(any()) }
    }

    @Test
    fun registrationSendsTrimmedFieldsAndRole() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<AuthRepository>()
        coEvery { repository.register(any()) } returns Resource.Success("registered")
        val viewModel = RegisterViewModel(repository)
        viewModel.onFirstNameChange(" Олена ")
        viewModel.onLastNameChange(" Петренко ")
        viewModel.onEmailChange(" olena@example.com ")
        viewModel.onPasswordChange("password1")
        viewModel.onConfirmPasswordChange("password1")
        viewModel.onRegionSelect("Київська область")
        viewModel.onCitySelect("Київ")
        viewModel.onRoleSelect(UserRole.VOLUNTEER)
        viewModel.onTermsChange(true)
        viewModel.onAgeChange(true)

        viewModel.submitRegistration()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isSuccess)
        coVerify {
            repository.register(
                match<RegisterRequest> {
                    it.firstName == "Олена" &&
                        it.lastName == "Петренко" &&
                        it.email == "olena@example.com" &&
                        it.role == "volunteer" &&
                        it.city == "Київ" &&
                        it.termsAccepted && it.ageConfirmed
                }
            )
        }
    }

    @Test
    fun registrationMapsConflictToEmailError() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<AuthRepository>()
        coEvery { repository.register(any()) } returns Resource.Error("conflict", 409)
        val viewModel = RegisterViewModel(repository)
        viewModel.onFirstNameChange("Олена")
        viewModel.onLastNameChange("Петренко")
        viewModel.onEmailChange("olena@example.com")
        viewModel.onPasswordChange("password1")
        viewModel.onConfirmPasswordChange("password1")
        viewModel.onRegionSelect("Київська область")
        viewModel.onCitySelect("Київ")
        viewModel.onRoleSelect(UserRole.PERSON_IN_NEED)
        viewModel.onTermsChange(true)
        viewModel.onAgeChange(true)

        viewModel.submitRegistration()
        advanceUntilIdle()

        assertNotNull(viewModel.uiState.value.emailError)
        assertFalse(viewModel.uiState.value.isLoading)
    }

    @Test
    fun forgotPasswordValidatesEmailAndShowsSuccessMessage() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<AuthRepository>()
        val viewModel = ForgotPasswordViewModel(repository)
        viewModel.submitForgotPassword()
        assertNotNull(viewModel.uiState.value.emailError)
        coVerify(exactly = 0) { repository.forgotPassword(any()) }

        coEvery { repository.forgotPassword("user@example.com") } returns Resource.Success("Перевірте пошту")
        viewModel.onEmailChange(" user@example.com ")
        viewModel.submitForgotPassword()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.isSubmitted)
        assertEquals("Перевірте пошту", viewModel.uiState.value.successMessage)
        assertNull(viewModel.uiState.value.generalError)
    }

    @Test
    fun forgotPasswordShowsNetworkError() = runTest(mainDispatcherRule.dispatcher) {
        val repository = mockk<AuthRepository>()
        coEvery { repository.forgotPassword(any()) } returns Resource.Error("Спробуйте пізніше")
        val viewModel = ForgotPasswordViewModel(repository)
        viewModel.onEmailChange("user@example.com")

        viewModel.submitForgotPassword()
        advanceUntilIdle()

        assertEquals("Спробуйте пізніше", viewModel.uiState.value.generalError)
        assertFalse(viewModel.uiState.value.isLoading)
    }
}
