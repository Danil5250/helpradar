package ua.helpradar.app.presentation.feed

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ua.helpradar.app.R
import ua.helpradar.app.ui.theme.*

@Composable
fun FeedEmptyView(
    message: String = "Оголошень поки немає",
    subMessage: String = "Спробуйте змінити фільтри або створіть власне оголошення"
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.img_mascot_empty),
            contentDescription = null,
            modifier = Modifier.size(200.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = message,
            fontFamily = KharkivTone,
            fontSize = 20.sp,
            color = CharcoalDark,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = subMessage,
            fontFamily = Montserrat,
            fontSize = 14.sp,
            color = CharcoalDark.copy(alpha = 0.7f),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun FeedErrorView(
    errorMessage: String = "Не вдалося завантажити оголошення",
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.img_mascot_error),
            contentDescription = null,
            modifier = Modifier.size(200.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Щось пішло не так...",
            fontFamily = KharkivTone,
            fontSize = 20.sp,
            color = CharcoalDark,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = errorMessage,
            fontFamily = Montserrat,
            fontSize = 14.sp,
            color = CharcoalDark.copy(alpha = 0.7f),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(20.dp))
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
            shape = RoundedCornerShape(10.dp)
        ) {
            Text(
                text = "Спробувати знову",
                fontFamily = Montserrat,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
        }
    }
}