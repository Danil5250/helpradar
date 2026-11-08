package ua.helpradar.app.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object Register : Screen("register")
    object ForgotPassword : Screen("forgot_password")
    object Feed : Screen("feed")
    object CreateRequest : Screen("create_request")
    object Profile : Screen("profile")
}