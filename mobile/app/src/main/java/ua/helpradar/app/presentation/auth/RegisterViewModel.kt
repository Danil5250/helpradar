package ua.helpradar.app.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.core.util.PatternsCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.dto.RegisterRequest
import ua.helpradar.app.data.repository.AuthRepository

class RegisterViewModel(
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterFormState())
    val uiState: StateFlow<RegisterFormState> = _uiState.asStateFlow()

    private val nameRegex = Regex("^[a-zA-Zа-яА-ЯіІїЇєЄґҐ'’\\-\\s]{2,50}$")

    fun onFirstNameChange(value: String) = _uiState.update { it.copy(firstName = value, firstNameError = null) }
    fun onLastNameChange(value: String) = _uiState.update { it.copy(lastName = value, lastNameError = null) }
    fun onEmailChange(value: String) = _uiState.update { it.copy(email = value, emailError = null) }
    fun onPasswordChange(value: String) = _uiState.update { it.copy(password = value, passwordError = null) }
    fun onConfirmPasswordChange(value: String) = _uiState.update { it.copy(confirmPassword = value, confirmPasswordError = null) }

    fun onRegionSelect(regionName: String) {
        val cities = regionsWithCities[regionName] ?: emptyList()
        _uiState.update {
            it.copy(
                region = regionName,
                regionError = null,
                availableCities = cities,
                city = "",
                cityError = null
            )
        }
    }

    fun onCitySelect(cityName: String) {
        _uiState.update { it.copy(city = cityName, cityError = null) }
    }

    fun onPhoneNumberChange(value: String) = _uiState.update { it.copy(phoneNumber = value) }
    fun onRoleSelect(role: UserRole) = _uiState.update { it.copy(selectedRole = role, roleError = null) }
    fun onTermsChange(checked: Boolean) = _uiState.update { it.copy(agreedToTerms = checked, termsError = null) }
    fun onAgeChange(checked: Boolean) = _uiState.update { it.copy(isAgeConfirmed = checked, termsError = null) }

    fun submitRegistration() {
        val state = _uiState.value

        val trimmedFirstName = state.firstName.trim()
        val trimmedLastName = state.lastName.trim()
        val trimmedEmail = state.email.trim()

        val firstNameValid = trimmedFirstName.matches(nameRegex)
        val lastNameValid = trimmedLastName.matches(nameRegex)
        val emailValid = PatternsCompat.EMAIL_ADDRESS.matcher(trimmedEmail).matches()
        val passwordValid = state.password.length in 8..64 &&
                state.password.any { it.isDigit() } &&
                state.password.any { it.isLetter() }
        val passwordsMatch = state.password == state.confirmPassword
        val regionValid = state.region.isNotBlank()
        val cityValid = state.city.isNotBlank()
        val roleSelected = state.selectedRole != null
        val legalConsent = state.agreedToTerms && state.isAgeConfirmed

        if (!firstNameValid || !lastNameValid || !emailValid || !passwordValid || !passwordsMatch || !regionValid || !cityValid || !roleSelected || !legalConsent) {
            _uiState.update {
                it.copy(
                    firstNameError = if (!firstNameValid) {
                        if (trimmedFirstName.length !in 2..50) "Ім'я повинно містити від 2 до 50 символів"
                        else "Ім'я не повинно містити цифр або заборонених символів"
                    } else null,
                    lastNameError = if (!lastNameValid) {
                        if (trimmedLastName.length !in 2..50) "Прізвище повинно містити від 2 до 50 символів"
                        else "Прізвище не повинно містити цифр або заборонених символів"
                    } else null,
                    emailError = if (!emailValid) "Введіть дійсну адресу електронної пошти" else null,
                    passwordError = if (!passwordValid) "Пароль має містити 8–64 символи, літеру та цифру" else null,
                    confirmPasswordError = if (!passwordsMatch) "Паролі не збігаються" else null,
                    regionError = if (!regionValid) "Оберіть область" else null,
                    cityError = if (!cityValid) "Оберіть місто або населений пункт" else null,
                    roleError = if (!roleSelected) "Будь ласка, оберіть вашу роль" else null,
                    termsError = if (!legalConsent) "Необхідно погодитися з умовами та підтвердити вік 18+" else null
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, generalError = null) }

            val backendRole = when (state.selectedRole) {
                UserRole.VOLUNTEER -> "volunteer"
                UserRole.PERSON_IN_NEED -> "person_in_need"
                null -> "person_in_need"
            }

            val request = RegisterRequest(
                firstName = trimmedFirstName,
                lastName = trimmedLastName,
                email = trimmedEmail,
                password = state.password,
                passwordConfirm = state.confirmPassword,
                role = backendRole,
                region = state.region.trim().ifEmpty { null },
                city = state.city.trim(),
                phoneNumber = state.phoneNumber.trim().ifEmpty { null },
                termsAccepted = true,
                ageConfirmed = true
            )

            when (val result = authRepository.register(request)) {
                is Resource.Success -> {
                    _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                }
                is Resource.Error -> {
                    _uiState.update {
                        if (result.code == 409) {
                            it.copy(
                                isLoading = false,
                                emailError = "Користувач з таким email вже існує"
                            )
                        } else {
                            it.copy(
                                isLoading = false,
                                generalError = result.message
                            )
                        }
                    }
                }
            }
        }
    }
}