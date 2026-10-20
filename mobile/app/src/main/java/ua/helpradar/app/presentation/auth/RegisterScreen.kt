package ua.helpradar.app.presentation.auth

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import ua.helpradar.app.ui.theme.CharcoalDark
import ua.helpradar.app.ui.theme.DesertSand
import ua.helpradar.app.ui.theme.OliveGreen
import ua.helpradar.app.ui.theme.RadarOrange

@OptIn(ExperimentalMaterial3Api::class)
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
        containerColor = DesertSand,
        topBar = {
            TopAppBar(
                title = { Text("Реєстрація у HelpRadar", color = CharcoalDark, fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DesertSand)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(
                text = "Створіть обліковий запис для надання або отримання допомоги",
                fontSize = 14.sp,
                color = CharcoalDark
            )

            // Ім'я та Прізвище
            OutlinedTextField(
                value = state.firstName,
                onValueChange = viewModel::onFirstNameChange,
                label = { Text("Ім'я") },
                isError = state.firstNameError != null,
                supportingText = state.firstNameError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = state.lastName,
                onValueChange = viewModel::onLastNameChange,
                label = { Text("Прізвище") },
                isError = state.lastNameError != null,
                supportingText = state.lastNameError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Email
            OutlinedTextField(
                value = state.email,
                onValueChange = viewModel::onEmailChange,
                label = { Text("Електронна пошта") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                isError = state.emailError != null,
                supportingText = state.emailError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Пароль
            OutlinedTextField(
                value = state.password,
                onValueChange = viewModel::onPasswordChange,
                label = { Text("Пароль (від 8 символів, літера і цифра)") },
                visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                        Icon(
                            imageVector = if (isPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = null
                        )
                    }
                },
                isError = state.passwordError != null,
                supportingText = state.passwordError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Підтвердження пароля
            OutlinedTextField(
                value = state.confirmPassword,
                onValueChange = viewModel::onConfirmPasswordChange,
                label = { Text("Повторіть пароль") },
                visualTransformation = if (isConfirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { isConfirmPasswordVisible = !isConfirmPasswordVisible }) {
                        Icon(
                            imageVector = if (isConfirmPasswordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = null
                        )
                    }
                },
                isError = state.confirmPasswordError != null,
                supportingText = state.confirmPasswordError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Місто
            OutlinedTextField(
                value = state.city,
                onValueChange = viewModel::onCityChange,
                label = { Text("Місто") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Вибір ролі
            Text("Оберіть вашу роль:", fontWeight = FontWeight.SemiBold, color = CharcoalDark)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                RoleSelectionCard(
                    title = "Потребую допомоги",
                    isSelected = state.selectedRole == UserRole.PERSON_IN_NEED,
                    modifier = Modifier.weight(1f),
                    onClick = { viewModel.onRoleSelect(UserRole.PERSON_IN_NEED) }
                )
                RoleSelectionCard(
                    title = "Волонтер",
                    isSelected = state.selectedRole == UserRole.VOLUNTEER,
                    modifier = Modifier.weight(1f),
                    onClick = { viewModel.onRoleSelect(UserRole.VOLUNTEER) }
                )
            }
            state.roleError?.let {
                Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
            }

            // Чекбокси
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = state.agreedToTerms,
                    onCheckedChange = viewModel::onTermsChange
                )
                Text("Погоджуюся з Умовами використання та Політикою конфіденційності", fontSize = 12.sp, color = CharcoalDark)
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = state.isAgeConfirmed,
                    onCheckedChange = viewModel::onAgeChange
                )
                Text("Мені вже виповнилося 18 років", fontSize = 12.sp, color = CharcoalDark)
            }
            state.termsError?.let {
                Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
            }

            // Кнопка реєстрації
            Button(
                onClick = viewModel::submitRegistration,
                enabled = !state.isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(10.dp)
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Text("Зареєструватися", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Перехід на екран логіну
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Вже маєте акаунт? ", color = CharcoalDark, fontSize = 14.sp)
                Text(
                    text = "Увійти",
                    color = RadarOrange,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.clickable { onNavigateToLogin() }
                )
            }
        }
    }
}

@Composable
fun RoleSelectionCard(
    title: String,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) OliveGreen else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = title,
                fontWeight = FontWeight.Medium,
                fontSize = 14.sp,
                color = if (isSelected) Color.White else CharcoalDark
            )
        }
    }
}