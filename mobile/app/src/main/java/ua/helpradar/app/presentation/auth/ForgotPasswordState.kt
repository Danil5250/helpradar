package ua.helpradar.app.presentation.auth

data class ForgotPasswordState(
    val email: String = "",
    val emailError: String? = null,
    val isLoading: Boolean = false,
    val isSubmitted: Boolean = false, // коли лист успішно "відправлено"
    val successMessage: String? = null,
    val generalError: String? = null
)