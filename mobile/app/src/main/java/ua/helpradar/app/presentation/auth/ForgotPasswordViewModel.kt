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
import ua.helpradar.app.data.repository.AuthRepository

class ForgotPasswordViewModel(
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(ForgotPasswordState())
    val uiState: StateFlow<ForgotPasswordState> = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.update { it.copy(email = value, emailError = null, generalError = null) }
    }

    fun submitForgotPassword() {
        val state = _uiState.value
        val emailTrimmed = state.email.trim()

        if (emailTrimmed.isEmpty()) {
            _uiState.update { it.copy(emailError = "Введіть адресу електронної пошти") }
            return
        }

        val isEmailFormatValid = PatternsCompat.EMAIL_ADDRESS.matcher(emailTrimmed).matches()
        if (!isEmailFormatValid) {
            _uiState.update { it.copy(emailError = "Введіть дійсну адресу електронної пошти") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, generalError = null) }

            when (val result = authRepository.forgotPassword(emailTrimmed)) {
                is Resource.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isSubmitted = true,
                            successMessage = result.data
                        )
                    }
                }
                is Resource.Error -> {
                    _uiState.update {
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
