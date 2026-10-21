package ua.helpradar.app.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class RegisterViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterFormState())
    val uiState: StateFlow<RegisterFormState> = _uiState.asStateFlow()

    fun onFirstNameChange(value: String) = _uiState.update { it.copy(firstName = value, firstNameError = null) }
    fun onLastNameChange(value: String) = _uiState.update { it.copy(lastName = value, lastNameError = null) }
    fun onEmailChange(value: String) = _uiState.update { it.copy(email = value, emailError = null) }
    fun onPasswordChange(value: String) = _uiState.update { it.copy(password = value, passwordError = null) }
    fun onConfirmPasswordChange(value: String) = _uiState.update { it.copy(confirmPassword = value, confirmPasswordError = null) }
    fun onCityChange(value: String) = _uiState.update { it.copy(city = value) }
    fun onPhoneNumberChange(value: String) = _uiState.update { it.copy(phoneNumber = value) }
    fun onRoleSelect(role: UserRole) = _uiState.update { it.copy(selectedRole = role, roleError = null) }
    fun onTermsChange(checked: Boolean) = _uiState.update { it.copy(agreedToTerms = checked, termsError = null) }
    fun onAgeChange(checked: Boolean) = _uiState.update { it.copy(isAgeConfirmed = checked, termsError = null) }

    fun submitRegistration() {
        val state = _uiState.value

        val firstNameValid = state.firstName.trim().length in 2..50
        val lastNameValid = state.lastName.trim().length in 2..50
        val emailValid = android.util.Patterns.EMAIL_ADDRESS.matcher(state.email.trim()).matches()
        val passwordValid = state.password.length in 8..64 &&
                state.password.any { it.isDigit() } &&
                state.password.any { it.isLetter() }
        val passwordsMatch = state.password == state.confirmPassword
        val roleSelected = state.selectedRole != null
        val legalConsent = state.agreedToTerms && state.isAgeConfirmed

        if (!firstNameValid || !lastNameValid || !emailValid || !passwordValid || !passwordsMatch || !roleSelected || !legalConsent) {
            _uiState.update {
                it.copy(
                    firstNameError = if (!firstNameValid) "Ім'я повинно містити від 2 до 50 символів" else null,
                    lastNameError = if (!lastNameValid) "Прізвище повинно містити від 2 до 50 символів" else null,
                    emailError = if (!emailValid) "Введіть дійсну адресу електронної пошти" else null,
                    passwordError = if (!passwordValid) "Пароль має містити 8–64 символи, літеру та цифру" else null,
                    confirmPasswordError = if (!passwordsMatch) "Паролі не збігаються" else null,
                    roleError = if (!roleSelected) "Будь ласка, оберіть вашу роль" else null,
                    termsError = if (!legalConsent) "Необхідно погодитися з умовами та підтвердити вік 18+" else null
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, generalError = null) }

            // Імітація запиту доки бекенд розробляється
            delay(1200)

            _uiState.update { it.copy(isLoading = false, isSuccess = true) }
        }
    }
}