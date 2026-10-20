package ua.helpradar.app.presentation.auth

enum class UserRole {
    VOLUNTEER,
    PERSON_IN_NEED
}

data class RegisterFormState(
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val city: String = "",
    val phoneNumber: String = "",
    val selectedRole: UserRole? = null,
    val agreedToTerms: Boolean = false,
    val isAgeConfirmed: Boolean = false,

    val firstNameError: String? = null,
    val lastNameError: String? = null,
    val emailError: String? = null,
    val passwordError: String? = null,
    val confirmPasswordError: String? = null,
    val roleError: String? = null,
    val termsError: String? = null,

    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val generalError: String? = null
)