package ua.helpradar.app.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object Register : Screen("register")
    object Feed : Screen("feed")
    object CreateRequest : Screen("create_request")
}