package ua.helpradar.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.navigation.compose.rememberNavController
import ua.helpradar.app.navigation.AppNavHost
import ua.helpradar.app.ui.theme.HelpRadarTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            HelpRadarTheme {
                val navController = rememberNavController()
                AppNavHost(navController = navController)
            }
        }
    }
}