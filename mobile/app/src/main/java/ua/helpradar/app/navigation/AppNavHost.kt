package ua.helpradar.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.repository.AuthRepository
import ua.helpradar.app.presentation.auth.ForgotPasswordScreen
import ua.helpradar.app.presentation.auth.LoginScreen
import ua.helpradar.app.presentation.auth.RegisterScreen
import ua.helpradar.app.presentation.feed.FeedScreen
import ua.helpradar.app.presentation.profile.ProfileScreen
import ua.helpradar.app.presentation.request.CreateRequestScreen
import ua.helpradar.app.presentation.splash.SplashScreen

@Composable
fun AppNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route,
        modifier = modifier
    ) {
        // Стартовий екран із лелекою
        composable(Screen.Splash.route) {
            SplashScreen(
                onSplashFinished = {
                    val nextScreen = if (SessionManager.isLoggedIn) {
                        Screen.Feed.route
                    } else {
                        Screen.Login.route
                    }
                    navController.navigate(nextScreen) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToRegister = {
                    navController.navigate(Screen.Register.route)
                },
                onLoginSuccess = {
                    navController.navigate(Screen.Feed.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToForgotPassword = {
                    navController.navigate(Screen.ForgotPassword.route)
                }
            )
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                onNavigateToLogin = {
                    navController.popBackStack()
                },
                onRegistrationSuccess = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Register.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.ForgotPassword.route) {
            ForgotPasswordScreen(
                onNavigateBackToLogin = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.Feed.route) {
            FeedScreen(
                onCreateRequestClick = {
                    navController.navigate(Screen.CreateRequest.route)
                },
                onProfileClick = {
                    navController.navigate(Screen.Profile.route)
                },
                onSignOutClick = {
                    AuthRepository().logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.CreateRequest.route) {
            CreateRequestScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onRequestCreated = {
                    navController.navigate(Screen.Feed.route) {
                        popUpTo(Screen.Feed.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Profile.route) {
            ProfileScreen(
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}