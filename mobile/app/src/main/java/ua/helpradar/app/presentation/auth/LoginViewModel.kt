package ua.helpradar.app.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(LoginFormState())
    val uiState: StateFlow<LoginFormState> = _uiState.asStateFlow()

    private var failedAttempts = 0

    fun onEmailChange(value: String) {
        _uiState.update { it.copy(email = value, emailError = null, generalError = null) }
    }

    fun onPasswordChange(value: String) {
        _uiState.update { it.copy(password = value, passwordError = null, generalError = null) }
    }

    fun submitLogin() {
        val state = _uiState.value

        val emailTrimmed = state.email.trim()
        val isEmailEmpty = emailTrimmed.isEmpty()
        val isPasswordEmpty = state.password.isEmpty()

        if (isEmailEmpty || isPasswordEmpty) {
            _uiState.update {
                it.copy(
                    emailError = if (isEmailEmpty) "Введіть адресу електронної пошти" else null,
                    passwordError = if (isPasswordEmpty) "Введіть пароль" else null
                )
            }
            return
        }

        val isEmailFormatValid = android.util.Patterns.EMAIL_ADDRESS.matcher(emailTrimmed).matches()
        if (!isEmailFormatValid) {
            _uiState.update { it.copy(emailError = "Введіть дійсну адресу електронної пошти") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, generalError = null) }

            // Імітація виклику API бекенду
            delay(1000)

            // Демонстраційний сценарій перевірки (поки бекенд розробляється)
            if (state.password.length < 8) {
                failedAttempts++
                val errorMsg = if (failedAttempts >= 5) {
                    "Забагато спроб. Спробуйте знову через 15 хвилин."
                } else {
                    "Невірний email або пароль"
                }
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        generalError = errorMsg
                    )
                }
            } else {
                failedAttempts = 0
                _uiState.update { it.copy(isLoading = false, isSuccess = true) }
            }
        }
    }
}