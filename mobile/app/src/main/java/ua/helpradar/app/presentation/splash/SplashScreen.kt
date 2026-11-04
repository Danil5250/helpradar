package ua.helpradar.app.presentation.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import ua.helpradar.app.R
import ua.helpradar.app.ui.theme.CharcoalDark
import ua.helpradar.app.ui.theme.DesertSand
import ua.helpradar.app.ui.theme.KharkivTone
import ua.helpradar.app.ui.theme.Montserrat
import ua.helpradar.app.ui.theme.RadarOrange

@Composable
fun SplashScreen(
    onSplashFinished: () -> Unit
) {
    val scale = remember { Animatable(0.8f) }
    val alpha = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        // М'яка анімація появи лелеки
        scale.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 800)
        )
        alpha.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 600)
        )
        // Затримка перед переходом до головного екрана
        delay(1200)
        onSplashFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DesertSand),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .scale(scale.value)
                .alpha(alpha.value)
                .padding(24.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.img_mascot_boxes),
                contentDescription = "HelpRadar Маскот",
                modifier = Modifier
                    .fillMaxWidth(0.75f)
                    .heightIn(max = 260.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "HelpRadar",
                fontFamily = KharkivTone,
                fontSize = 32.sp,
                color = CharcoalDark,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Разом до взаємодопомоги",
                fontFamily = Montserrat,
                fontSize = 14.sp,
                color = RadarOrange,
                fontWeight = FontWeight.Medium
            )
        }
    }
}