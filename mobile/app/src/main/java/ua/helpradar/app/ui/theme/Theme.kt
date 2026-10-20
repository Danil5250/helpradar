package ua.helpradar.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = TacticalOlive,
    secondary = DeepSage,
    tertiary = RadarOrange,
    background = CharcoalDark,
    surface = CharcoalDark,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = DesertSand,
    onSurface = DesertSand
)

private val LightColorScheme = lightColorScheme(
    primary = OliveGreen,
    secondary = DeepSage,
    tertiary = RadarOrange,
    background = DesertSand,
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = CharcoalDark,
    onSurface = CharcoalDark
)

@Composable
fun HelpRadarTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}