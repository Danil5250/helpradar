package ua.helpradar.app.presentation.request

import android.Manifest
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.rememberAsyncImagePainter
import ua.helpradar.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateRequestScreen(
    onNavigateBack: () -> Unit,
    onRequestCreated: () -> Unit,
    viewModel: CreateRequestViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var isCategoryDropdownExpanded by remember { mutableStateOf(false) }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = 5)
    ) { uris: List<Uri> ->
        if (uris.isNotEmpty()) {
            viewModel.onAddPhotos(context, uris)
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (fineGranted || coarseGranted) {
            viewModel.fetchCurrentLocation(context)
        } else {
            viewModel.onLocationChange(state.location)
        }
    }

    val isVolunteer = state.isVolunteer

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
                        text = if (isVolunteer) "Створити пропозицію допомоги" else "Створити запит про допомогу",
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
            if (!isVolunteer) {
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
            } else {
                Card(
                    colors = CardDefaults.cardColors(containerColor = OliveGreen.copy(alpha = 0.15f)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = OliveGreen,
                            modifier = Modifier.size(26.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Опишіть ресурси, транспорт чи послуги, якими ви готові поділитися безоплатно.",
                            color = CharcoalDark,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Поле 1: Назва
            OutlinedTextField(
                value = state.title,
                onValueChange = viewModel::onTitleChange,
                label = { Text(if (isVolunteer) "Заголовок пропозиції *" else "Короткий заголовок потреби *") },
                placeholder = {
                    Text(
                        if (isVolunteer) "Наприклад: Можу підвезти продукти на авто"
                        else "Наприклад: Потрібні теплі ковдри"
                    )
                },
                isError = state.titleError != null,
                supportingText = state.titleError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Поле 2: Категорія
            ExposedDropdownMenuBox(
                expanded = isCategoryDropdownExpanded,
                onExpandedChange = { isCategoryDropdownExpanded = !isCategoryDropdownExpanded }
            ) {
                OutlinedTextField(
                    value = state.selectedCategory?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Категорія допомоги *") },
                    placeholder = {
                        Text(if (state.isCategoriesLoading) "Завантаження категорій..." else "Оберіть категорію")
                    },
                    trailingIcon = {
                        if (state.isCategoriesLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = isCategoryDropdownExpanded)
                        }
                    },
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
                    state.categories.forEach { category ->
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
                placeholder = {
                    Text(
                        if (isVolunteer) "Вкажіть доступний час, спосіб зв'язку чи деталі вашої допомоги..."
                        else "Опишіть ситуацію, необхідну кількість чи особливості..."
                    )
                },
                isError = state.descriptionError != null,
                supportingText = state.descriptionError?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp),
                maxLines = 6
            )

            // Блок вибору тривалості оголошення (Пункт 2)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Термін актуальності оголошення *",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = CharcoalDark
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    state.availableExpiryDays.forEach { days ->
                        val isSelected = state.expiryDays == days
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.onExpiryDaysChange(days) },
                            label = {
                                Text(
                                    text = "$days ${if (days == 3) "дні" else "днів"}",
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = OliveGreen,
                                selectedLabelColor = Color.White
                            ),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                Text(
                    text = "Після завершення строку ви зможете продовжити оголошення ще на 14 днів.",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            // Блок додавання фотографій
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Фотографії (до 5 шт.)",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = CharcoalDark
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (state.selectedPhotos.size < 5) {
                        OutlinedButton(
                            onClick = {
                                photoPickerLauncher.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                )
                            },
                            modifier = Modifier.size(80.dp),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(Icons.Default.AddPhotoAlternate, contentDescription = "Додати фото", tint = OliveGreen)
                                Text("Додати", fontSize = 11.sp, color = OliveGreen)
                            }
                        }
                    }
                    state.selectedPhotos.forEach { uri ->
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(RoundedCornerShape(10.dp))
                        ) {
                            Image(
                                painter = rememberAsyncImagePainter(uri),
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                            IconButton(
                                onClick = { viewModel.onRemovePhoto(uri) },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(24.dp)
                                    .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Видалити", tint = Color.White, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }
                state.photoError?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }
            }

            // Поле 4: Адреса / локація (Пункт 1: без підстановки Києва)
            OutlinedTextField(
                value = state.location,
                onValueChange = viewModel::onLocationChange,
                label = { Text(if (isVolunteer) "Місто / район надання допомоги *" else "Населений пункт / адреса *") },
                placeholder = { Text("Введіть адресу або вкажіть вручну") },
                trailingIcon = {
                    if (state.isLocating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = OliveGreen
                        )
                    } else {
                        IconButton(
                            onClick = {
                                locationPermissionLauncher.launch(
                                    arrayOf(
                                        Manifest.permission.ACCESS_FINE_LOCATION,
                                        Manifest.permission.ACCESS_COARSE_LOCATION
                                    )
                                )
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.MyLocation,
                                contentDescription = "Визначити поточне місцезнаходження",
                                tint = OliveGreen
                            )
                        }
                    }
                },
                isError = state.locationError != null,
                supportingText = {
                    if (state.locationError != null) {
                        Text(state.locationError!!, color = MaterialTheme.colorScheme.error)
                    } else {
                        Text(
                            if (isVolunteer) "Натисніть на значок для автовизначення міста або введіть його вручну"
                            else "Натисніть на значок для визначення поточної адреси або введіть її вручну",
                            fontSize = 11.sp
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Терміновість (тільки для запитів)
            if (!isVolunteer) {
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
                            Text(
                                "Виділити оголошення червоним маячком для швидкого реагування",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }
                    }
                }
            }

            state.generalError?.let {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            // Кнопка публікації
            Button(
                onClick = { viewModel.submitRequest(context) },
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
                    Text(
                        text = if (isVolunteer) "Опублікувати пропозицію" else "Опублікувати запит",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}