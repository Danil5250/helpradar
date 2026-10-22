package ua.helpradar.app.presentation.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Handshake
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
fun RegisterScreen(
    onNavigateToLogin: () -> Unit,
    onRegistrationSuccess: () -> Unit,
    viewModel: RegisterViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    var isPasswordVisible by remember { mutableStateOf(false) }
    var isConfirmPasswordVisible by remember { mutableStateOf(false) }

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            onRegistrationSuccess()
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

            Spacer(modifier = Modifier.height(12.dp))

            // Доданий векторний логотип HelpRadar
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
                text = "Приєднуйтесь до HelpRadar",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = CharcoalDark,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Підзаголовок
            Text(
                text = "Створіть обліковий запис для надання або отримання допомоги",
                fontSize = 14.sp,
                color = DeepSage,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 12.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Поле 1: Ім'я
            CustomLabel("Ім'я")
            CustomInputField(
                value = state.firstName,
                onValueChange = viewModel::onFirstNameChange,
                placeholder = "Ваше ім'я",
                errorMessage = state.firstNameError
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Поле 2: Прізвище
            CustomLabel("Прізвище")
            CustomInputField(
                value = state.lastName,
                onValueChange = viewModel::onLastNameChange,
                placeholder = "Ваше прізвище",
                errorMessage = state.lastNameError
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Поле 3: Email
            CustomLabel("Електронна пошта")
            CustomInputField(
                value = state.email,
                onValueChange = viewModel::onEmailChange,
                placeholder = "you@example.com",
                keyboardType = KeyboardType.Email,
                errorMessage = state.emailError
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Поле 4: Пароль
            CustomLabel("Пароль")
            CustomInputField(
                value = state.password,
                onValueChange = viewModel::onPasswordChange,
                placeholder = "Від 8 символів (літера та цифра)",
                isPassword = true,
                isPasswordVisible = isPasswordVisible,
                onTogglePassword = { isPasswordVisible = !isPasswordVisible },
                errorMessage = state.passwordError
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Поле 5: Підтвердження пароля
            CustomLabel("Підтвердження пароля")
            CustomInputField(
                value = state.confirmPassword,
                onValueChange = viewModel::onConfirmPasswordChange,
                placeholder = "Повторіть пароль",
                isPassword = true,
                isPasswordVisible = isConfirmPasswordVisible,
                onTogglePassword = { isConfirmPasswordVisible = !isConfirmPasswordVisible },
                errorMessage = state.confirmPasswordError
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Поле 6: Місто
            CustomLabel("Місто або населений пункт")
            CustomInputField(
                value = state.city,
                onValueChange = viewModel::onCityChange,
                placeholder = "Харків"
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Блок вибору ролі "Я хочу..."
            CustomLabel("Я хочу...")
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                FigmaRoleCard(
                    title = "Волонтер",
                    subtitle = "Допомагати іншим",
                    isSelected = state.selectedRole == UserRole.VOLUNTEER,
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Handshake,
                            contentDescription = null,
                            tint = if (state.selectedRole == UserRole.VOLUNTEER) OliveGreen else CharcoalDark,
                            modifier = Modifier.size(28.dp)
                        )
                    },
                    modifier = Modifier.weight(1f),
                    onClick = { viewModel.onRoleSelect(UserRole.VOLUNTEER) }
                )
                FigmaRoleCard(
                    title = "Потребую допомоги",
                    subtitle = "Отримати підтримку",
                    isSelected = state.selectedRole == UserRole.PERSON_IN_NEED,
                    icon = {
                        Icon(
                            painter = painterResource(id = R.drawable.hands_emoji),
                            contentDescription = null,
                            tint = if (state.selectedRole == UserRole.PERSON_IN_NEED) OliveGreen else CharcoalDark,
                            modifier = Modifier.size(28.dp)
                        )
                    },
                    modifier = Modifier.weight(1f),
                    onClick = { viewModel.onRoleSelect(UserRole.PERSON_IN_NEED) }
                )
            }
            state.roleError?.let {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Чекбокси
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = state.agreedToTerms,
                    onCheckedChange = viewModel::onTermsChange,
                    colors = CheckboxDefaults.colors(checkedColor = OliveGreen)
                )
                Text(
                    text = "Погоджуюся з Умовами та Політикою конфіденційності",
                    fontSize = 12.sp,
                    color = CharcoalDark
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = state.isAgeConfirmed,
                    onCheckedChange = viewModel::onAgeChange,
                    colors = CheckboxDefaults.colors(checkedColor = OliveGreen)
                )
                Text(
                    text = "Мені виповнилося 18 років",
                    fontSize = 12.sp,
                    color = CharcoalDark
                )
            }
            state.termsError?.let {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Головна кнопка створення акаунта
            Button(
                onClick = viewModel::submitRegistration,
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
                        text = "Створити акаунт",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Перехід на екран входу
            Row(
                modifier = Modifier.padding(bottom = 32.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Вже маєте акаунт? ", color = CharcoalDark, fontSize = 14.sp)
                Text(
                    text = "Увійти",
                    color = CharcoalDark,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.clickable { onNavigateToLogin() }
                )
            }
        }
    }
}

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

@Composable
private fun FigmaRoleCard(
    title: String,
    subtitle: String,
    isSelected: Boolean,
    icon: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val bgColor = if (isSelected) SelectedRoleBg else Color.White.copy(alpha = 0.6f)
    val borderColor = if (isSelected) OliveGreen else BorderSand

    Card(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .border(width = 1.dp, color = borderColor, shape = RoundedCornerShape(12.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp, horizontal = 12.dp),
            horizontalAlignment = Alignment.Start,
            verticalArrangement = Arrangement.Center
        ) {
            icon()
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = CharcoalDark
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitle,
                fontSize = 12.sp,
                color = DeepSage
            )
        }
    }
}