package ua.helpradar.app.presentation.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
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
import ua.helpradar.app.ui.theme.BorderSand
import ua.helpradar.app.ui.theme.CharcoalDark
import ua.helpradar.app.ui.theme.DeepSage
import ua.helpradar.app.ui.theme.DesertSand
import ua.helpradar.app.ui.theme.OliveGreen
import ua.helpradar.app.ui.theme.PlaceholderSage

@Composable
fun ForgotPasswordScreen(
    viewModel: ForgotPasswordViewModel = viewModel(),
    onNavigateBackToLogin: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        containerColor = DesertSand
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            // Логотип HelpRadar
            Image(
                painter = painterResource(id = R.drawable.helpradar_logo),
                contentDescription = "HelpRadar Logo",
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(16.dp))
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Назва екрану
            Text(
                text = "Відновлення пароля",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = CharcoalDark,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Підказка для користувача
            Text(
                text = if (state.isSubmitted)
                    "Інструкції надіслано на вказану пошту"
                else
                    "Введіть адресу електронної пошти, пов'язану з вашим акаунтом, щоб отримати посилання для скидання пароля",
                fontSize = 14.sp,
                color = DeepSage,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Блок перевірки
            if (state.isSubmitted) {
                // Блок успішного повідомлення
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = state.successMessage ?: "Перевірте поштову скриньку.",
                        color = CharcoalDark,
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(16.dp)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = onNavigateBackToLogin,
                    colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .shadow(2.dp, RoundedCornerShape(12.dp)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Повернутися до входу", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            } else {
                // Форма вводу
                CustomLabel("Електронна пошта")
                CustomInputField(
                    value = state.email,
                    onValueChange = viewModel::onEmailChange,
                    placeholder = "you@example.com",
                    keyboardType = KeyboardType.Email,
                    errorMessage = state.emailError
                )

                state.generalError?.let {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Кнопка для оновлення пароля
                Button(
                    onClick = viewModel::submitForgotPassword,
                    enabled = !state.isLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .shadow(2.dp, RoundedCornerShape(12.dp)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text(
                            text = "Надіслати посилання",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Перехід до логіну
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Згадали пароль? ", color = CharcoalDark, fontSize = 14.sp)
                    Text(
                        text = "Увійти",
                        color = CharcoalDark,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        modifier = Modifier.clickable { onNavigateBackToLogin() }
                    )
                }
            }
        }
    }
}

// TODO: Існує сенс винести в окремий файл і зробити пабліком. Дублюється в LoginScreen і RegisterScreen.
@Composable
private fun CustomLabel(text: String) {
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
private fun CustomInputField(
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