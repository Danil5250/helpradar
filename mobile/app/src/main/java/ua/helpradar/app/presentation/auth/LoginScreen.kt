package ua.helpradar.app.presentation.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import ua.helpradar.app.R
import ua.helpradar.app.ui.theme.*

@Composable
fun LoginScreen(
    onNavigateToRegister: () -> Unit,
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    var isPasswordVisible by remember { mutableStateOf(false) }

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            onLoginSuccess()
        }
    }

    Scaffold(
        containerColor = DesertSand
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))

            // Векторний логотип HelpRadar
            Image(
                painter = painterResource(id = R.drawable.helpradar_logo),
                contentDescription = "HelpRadar Logo",
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(16.dp))
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Заголовок
            Text(
                text = "Вхід у HelpRadar",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = CharcoalDark,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Підзаголовок
            Text(
                text = "Увійдіть для взаємодопомоги та перегляду потреб",
                fontSize = 14.sp,
                color = DeepSage,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 12.dp)
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Загальна помилка сервера / блокування
            state.generalError?.let {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                ) {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(12.dp),
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }

            // Поле Email
            LoginLabel("Електронна пошта")
            LoginInputField(
                value = state.email,
                onValueChange = viewModel::onEmailChange,
                placeholder = "you@example.com",
                keyboardType = KeyboardType.Email,
                errorMessage = state.emailError
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Поле Пароль
            LoginLabel("Пароль")
            LoginInputField(
                value = state.password,
                onValueChange = viewModel::onPasswordChange,
                placeholder = "Введіть ваш пароль",
                isPassword = true,
                isPasswordVisible = isPasswordVisible,
                onTogglePassword = { isPasswordVisible = !isPasswordVisible },
                errorMessage = state.passwordError
            )

            // Посилання "Забули пароль?"
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp, bottom = 20.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Text(
                    text = "Забули пароль?",
                    color = OliveGreen,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable { }
                )
            }

            // Кнопка входу
            Button(
                onClick = viewModel::submitLogin,
                enabled = !state.isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .shadow(elevation = 2.dp, shape = RoundedCornerShape(12.dp)),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Text(
                        text = "Увійти",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Перехід на реєстрацію
            Row(
                modifier = Modifier.padding(bottom = 32.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Не маєте акаунта? ", color = CharcoalDark, fontSize = 14.sp)
                Text(
                    text = "Зареєструватися",
                    color = CharcoalDark,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.clickable { onNavigateToRegister() }
                )
            }
        }
    }
}

@Composable
private fun LoginLabel(text: String) {
    Text(
        text = text,
        fontSize = 14.sp,
        fontWeight = FontWeight.Medium,
        color = CharcoalDark,
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 6.dp)
    )
}

@Composable
private fun LoginInputField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    errorMessage: String? = null,
    isPassword: Boolean = false,
    isPasswordVisible: Boolean = false,
    onTogglePassword: (() -> Unit)? = null,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = {
                Text(
                    text = placeholder,
                    color = PlaceholderSage,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Normal
                )
            },
            singleLine = true,
            visualTransformation = if (isPassword && !isPasswordVisible) PasswordVisualTransformation() else VisualTransformation.None,
            trailingIcon = if (isPassword && onTogglePassword != null) {
                {
                    IconButton(onClick = onTogglePassword) {
                        Icon(
                            imageVector = if (isPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = null,
                            tint = DeepSage
                        )
                    }
                }
            } else null,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Color.White.copy(alpha = 0.8f),
                unfocusedContainerColor = Color.White.copy(alpha = 0.8f),
                focusedBorderColor = if (errorMessage != null) MaterialTheme.colorScheme.error else OliveGreen,
                unfocusedBorderColor = if (errorMessage != null) MaterialTheme.colorScheme.error else BorderSand,
                focusedTextColor = CharcoalDark,
                unfocusedTextColor = CharcoalDark
            ),
            modifier = Modifier.fillMaxWidth()
        )
        if (errorMessage != null) {
            Text(
                text = errorMessage,
                color = MaterialTheme.colorScheme.error,
                fontSize = 12.sp,
                modifier = Modifier.padding(start = 6.dp, top = 2.dp)
            )
        }
    }
}