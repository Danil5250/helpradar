package ua.helpradar.app.presentation.request

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import ua.helpradar.app.ui.theme.CharcoalDark
import ua.helpradar.app.ui.theme.DesertSand
import ua.helpradar.app.ui.theme.OliveGreen
import ua.helpradar.app.ui.theme.RadarOrange

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateRequestScreen(
    onNavigateBack: () -> Unit,
    onRequestCreated: () -> Unit,
    viewModel: CreateRequestViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    var isCategoryDropdownExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            onRequestCreated()
        }
    }

    Scaffold(
        containerColor = DesertSand,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Створити запит про допомогу",
                        color = CharcoalDark,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Назад",
                            tint = CharcoalDark
                        )
                    }
                },
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
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Попередження 112 з розділу 3.2.4.3
            Card(
                colors = CardDefaults.cardColors(containerColor = RadarOrange.copy(alpha = 0.15f)),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.WarningAmber,
                        contentDescription = null,
                        tint = RadarOrange,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "У разі загрози життю або здоров'ю негайно телефонуйте 112!",
                        color = CharcoalDark,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            // Поле 1: Назва
            OutlinedTextField(
                value = state.title,
                onValueChange = viewModel::onTitleChange,
                label = { Text("Короткий заголовок потреби *") },
                placeholder = { Text("Наприклад: Потрібні теплі ковдри") },
                isError = state.titleError != null,
                supportingText = state.titleError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Поле 2: Вибір категорії
            ExposedDropdownMenuBox(
                expanded = isCategoryDropdownExpanded,
                onExpandedChange = { isCategoryDropdownExpanded = !isCategoryDropdownExpanded }
            ) {
                OutlinedTextField(
                    value = state.selectedCategory?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Категорія допомоги *") },
                    placeholder = { Text("Оберіть категорію") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isCategoryDropdownExpanded) },
                    isError = state.categoryError != null,
                    supportingText = state.categoryError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor()
                )

                ExposedDropdownMenu(
                    expanded = isCategoryDropdownExpanded,
                    onDismissRequest = { isCategoryDropdownExpanded = false }
                ) {
                    defaultCategories.forEach { category ->
                        DropdownMenuItem(
                            text = { Text(category.name) },
                            onClick = {
                                viewModel.onCategorySelect(category)
                                isCategoryDropdownExpanded = false
                            }
                        )
                    }
                }
            }

            // Поле 3: Детальний опис
            OutlinedTextField(
                value = state.description,
                onValueChange = viewModel::onDescriptionChange,
                label = { Text("Детальний опис *") },
                placeholder = { Text("Опишіть ситуацію, необхідну кількість чи особливості...") },
                isError = state.descriptionError != null,
                supportingText = state.descriptionError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp),
                maxLines = 6
            )

            // Поле 4: Адреса / населений пункт
            OutlinedTextField(
                value = state.location,
                onValueChange = viewModel::onLocationChange,
                label = { Text("Населений пункт / адреса *") },
                isError = state.locationError != null,
                supportingText = {
                    if (state.locationError != null) {
                        Text(state.locationError!!, color = MaterialTheme.colorScheme.error)
                    } else {
                        Text("Точна адреса буде видима лише підтвердженому волонтеру", fontSize = 11.sp)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Чекбокс: Терміновість
            Card(
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.7f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { viewModel.onUrgentToggle(!state.isUrgent) }
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = state.isUrgent,
                        onCheckedChange = viewModel::onUrgentToggle,
                        colors = CheckboxDefaults.colors(checkedColor = RadarOrange)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Терміновий запит", fontWeight = FontWeight.Bold, color = CharcoalDark)
                        Text("Виділити оголошення червоним маячком для швидкого реагування", fontSize = 12.sp, color = Color.Gray)
                    }
                }
            }

            // Кнопка публікації
            Button(
                onClick = viewModel::submitRequest,
                enabled = !state.isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp, bottom = 28.dp)
                    .height(52.dp),
                shape = RoundedCornerShape(10.dp)
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Text("Опублікувати запит", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}