package ua.helpradar.app.presentation.request

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.net.Uri
import android.view.MotionEvent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Search
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
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.SubcomposeAsyncImage
import coil.compose.rememberAsyncImagePainter
import org.osmdroid.config.Configuration
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker
import ua.helpradar.app.ui.theme.*
import java.util.Locale

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
    var isFullScreenMapOpen by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        Configuration.getInstance().load(context, context.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
        Configuration.getInstance().userAgentValue = context.packageName
        if (CreateRequestViewModel.itemToEdit != null || state.editingAnnouncementId != null) {
            viewModel.loadCategories(context)
        }
    }

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

    // Повноекранний модальний вибір точки на мапі
    if (isFullScreenMapOpen) {
        FullScreenLocationPickerDialog(
            initialLat = state.latitude,
            initialLon = state.longitude,
            resolvedAddress = state.location,
            isLocating = state.isLocating,
            onPointSelected = { lat, lon ->
                viewModel.onMapLocationSelected(context, lat, lon)
            },
            onRequestGps = {
                locationPermissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
            },
            onDismiss = { isFullScreenMapOpen = false }
        )
    }

    Scaffold(
        containerColor = DesertSand,
        topBar = {
            val isEdit = state.editingAnnouncementId != null
            TopAppBar(
                title = {
                    Text(
                        text = when {
                            isEdit -> "Редагувати оголошення"
                            isVolunteer -> "Створити пропозицію допомоги"
                            else -> "Створити запит про допомогу"
                        },
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

            // Блок вибору тривалості / подовження оголошення
            val isEditMode = state.editingAnnouncementId != null
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = if (isEditMode) "Подовжити термін актуальності" else "Термін актуальності оголошення *",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = CharcoalDark
                )

                if (isEditMode && state.currentExpiresAtFormatted != null) {
                    Text(
                        text = "Поточний термін дії до: ${state.currentExpiresAtFormatted}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = OliveGreen
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    state.availableExpiryDays.forEach { days ->
                        val isSelected = if (isEditMode) state.extendDays == days else state.expiryDays == days
                        val prefix = if (isEditMode) "+" else ""
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.onExpiryDaysChange(days) },
                            label = {
                                Text(
                                    text = "$prefix$days ${if (days == 3) "дні" else "днів"}",
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
                    text = if (isEditMode) {
                        if (state.extendDays != null)
                            "Обрано подовження на +${state.extendDays} ${if (state.extendDays == 3) "дні" else "днів"} (натисніть ще раз, щоб скасувати)"
                        else
                            "Оберіть кількість днів, щоб подовжити оголошення, або залиште без змін"
                    } else {
                        "Після завершення строку ви зможете продовжити оголошення ще на 14 днів."
                    },
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            // Блок додавання / редагування фотографій
            val totalPhotosCount = state.existingPhotos.size + state.selectedPhotos.size
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Фотографії ($totalPhotosCount/5)",
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
                    if (totalPhotosCount < 5) {
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

                    // Наявні фотографії оголошення (із сервера)
                    state.existingPhotos.forEach { photo ->
                        val fullPhotoUrl = if (photo.url.startsWith("http")) photo.url else "http://10.0.2.2:3000${photo.url}"
                        Box(
                            modifier = Modifier
                                .size(80.dp)
                                .clip(RoundedCornerShape(10.dp))
                        ) {
                            SubcomposeAsyncImage(
                                model = fullPhotoUrl,
                                contentDescription = "Наявне фото",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                            IconButton(
                                onClick = { viewModel.onRemoveExistingPhoto(photo.id) },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(24.dp)
                                    .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Видалити фото", tint = Color.White, modifier = Modifier.size(16.dp))
                            }
                        }
                    }

                    // Нові локальні фотографії (з галереї)
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

            // Поле 4: Адреса / локація + Інтерактивна міні-мапа
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = state.location,
                    onValueChange = viewModel::onLocationChange,
                    label = { Text(if (isVolunteer) "Місто / район надання допомоги *" else "Населений пункт / адреса *") },
                    placeholder = { Text("Натисніть на мапу нижче або введіть місто") },
                    trailingIcon = {
                        if (state.isLocating) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = OliveGreen
                            )
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (state.location.isNotBlank()) {
                                    IconButton(onClick = { viewModel.searchAddressOnMap(context) }) {
                                        Icon(
                                            imageVector = Icons.Default.Search,
                                            contentDescription = "Знайти введену адресу на мапі",
                                            tint = DeepSage
                                        )
                                    }
                                }
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
                        }
                    },
                    isError = state.locationError != null,
                    supportingText = {
                        if (state.locationError != null) {
                            Text(state.locationError!!, color = MaterialTheme.colorScheme.error)
                        } else {
                            Text(
                                "Торкніться точки на мапі нижче, щоб точно вказати місце, або скористайтесь GPS",
                                fontSize = 11.sp
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                // Інтерактивна міні-мапа вибору локації
                InlineLocationPickerMap(
                    latitude = state.latitude,
                    longitude = state.longitude,
                    onPointSelected = { lat, lon ->
                        viewModel.onMapLocationSelected(context, lat, lon)
                    },
                    onExpandClick = { isFullScreenMapOpen = true }
                )
            }

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

            // Кнопка публікації / збереження змін
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
                        text = when {
                            isEditMode -> "Зберегти зміни"
                            isVolunteer -> "Опублікувати пропозицію"
                            else -> "Опублікувати запит"
                        },
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@SuppressLint("ClickableViewAccessibility")
@Composable
private fun InlineLocationPickerMap(
    latitude: Double?,
    longitude: Double?,
    onPointSelected: (Double, Double) -> Unit,
    onExpandClick: () -> Unit
) {
    val hasCoordinates = latitude != null && longitude != null && latitude != 0.0 && longitude != 0.0
    var lastCenteredCoords by remember { mutableStateOf<Pair<Double, Double>?>(null) }

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        modifier = Modifier
            .fillMaxWidth()
            .height(190.dp)
            .border(1.dp, BorderSand, RoundedCornerShape(12.dp))
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AndroidView(
                factory = { ctx ->
                    MapView(ctx).apply {
                        setTileSource(TileSourceFactory.MAPNIK)
                        setMultiTouchControls(true)
                        setOnTouchListener { v, event ->
                            when (event.action) {
                                MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                                    v.parent?.requestDisallowInterceptTouchEvent(true)
                                }
                                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                                    v.parent?.requestDisallowInterceptTouchEvent(false)
                                }
                            }
                            false
                        }

                        if (hasCoordinates) {
                            controller.setZoom(15.0)
                            controller.setCenter(GeoPoint(latitude!!, longitude!!))
                        } else {
                            controller.setZoom(5.5)
                            controller.setCenter(GeoPoint(49.0, 31.5))
                        }
                    }
                },
                update = { mapView ->
                    mapView.overlays.clear()

                    val eventsOverlay = MapEventsOverlay(object : MapEventsReceiver {
                        override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean {
                            if (p != null) {
                                onPointSelected(p.latitude, p.longitude)
                            }
                            return true
                        }

                        override fun longPressHelper(p: GeoPoint?): Boolean = false
                    })
                    mapView.overlays.add(eventsOverlay)

                    if (hasCoordinates) {
                        val currentPair = Pair(latitude!!, longitude!!)
                        val geoPoint = GeoPoint(latitude, longitude)

                        val marker = Marker(mapView).apply {
                            position = geoPoint
                            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                            title = "Обране місце"
                        }
                        mapView.overlays.add(marker)

                        if (lastCenteredCoords != currentPair) {
                            lastCenteredCoords = currentPair
                            val targetZoom = if (mapView.zoomLevelDouble < 12.0) 15.0 else mapView.zoomLevelDouble
                            mapView.controller.animateTo(geoPoint, targetZoom, 600L)
                        }
                    }

                    mapView.invalidate()
                },
                modifier = Modifier.fillMaxSize()
            )

            // Підказка у верхньому лівому кутку мапи
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = CharcoalDark.copy(alpha = 0.78f),
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = RadarOrange,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (hasCoordinates) {
                            String.format(Locale.US, "%.4f, %.4f", latitude, longitude)
                        } else {
                            "Натисніть на мапу, щоб поставити точку"
                        },
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Кнопка відкриття повноекранної мапи
            IconButton(
                onClick = onExpandClick,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
                    .size(34.dp)
                    .background(Color.White.copy(alpha = 0.92f), CircleShape)
                    .border(1.dp, BorderSand, CircleShape)
            ) {
                Icon(
                    imageVector = Icons.Default.Fullscreen,
                    contentDescription = "Розгорнути мапу",
                    tint = CharcoalDark,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun FullScreenLocationPickerDialog(
    initialLat: Double?,
    initialLon: Double?,
    resolvedAddress: String,
    isLocating: Boolean,
    onPointSelected: (Double, Double) -> Unit,
    onRequestGps: () -> Unit,
    onDismiss: () -> Unit
) {
    val hasCoordinates = initialLat != null && initialLon != null && initialLat != 0.0 && initialLon != 0.0
    var lastCenteredCoords by remember { mutableStateOf<Pair<Double, Double>?>(null) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Scaffold(
            containerColor = DesertSand,
            topBar = {
                Surface(color = DesertSand, shadowElevation = 2.dp) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = onDismiss) {
                                Icon(Icons.Default.Close, contentDescription = "Закрити", tint = CharcoalDark)
                            }
                            Text(
                                text = "Оберіть точку на мапі",
                                fontFamily = KharkivTone,
                                fontSize = 17.sp,
                                color = CharcoalDark
                            )
                        }
                        IconButton(onClick = onRequestGps) {
                            Icon(Icons.Default.MyLocation, contentDescription = "Моє місцезнаходження", tint = OliveGreen)
                        }
                    }
                }
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                AndroidView(
                    factory = { ctx ->
                        MapView(ctx).apply {
                            setTileSource(TileSourceFactory.MAPNIK)
                            setMultiTouchControls(true)
                            if (hasCoordinates) {
                                controller.setZoom(15.0)
                                controller.setCenter(GeoPoint(initialLat!!, initialLon!!))
                            } else {
                                controller.setZoom(6.0)
                                controller.setCenter(GeoPoint(49.0, 31.5))
                            }
                        }
                    },
                    update = { mapView ->
                        mapView.overlays.clear()
                        val eventsOverlay = MapEventsOverlay(object : MapEventsReceiver {
                            override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean {
                                if (p != null) {
                                    onPointSelected(p.latitude, p.longitude)
                                }
                                return true
                            }

                            override fun longPressHelper(p: GeoPoint?): Boolean = false
                        })
                        mapView.overlays.add(eventsOverlay)

                        if (hasCoordinates) {
                            val currentPair = Pair(initialLat!!, initialLon!!)
                            val geoPoint = GeoPoint(initialLat, initialLon)
                            val marker = Marker(mapView).apply {
                                position = geoPoint
                                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                                title = "Обрана локація"
                            }
                            mapView.overlays.add(marker)

                            if (lastCenteredCoords != currentPair) {
                                lastCenteredCoords = currentPair
                                val targetZoom = if (mapView.zoomLevelDouble < 12.0) 15.0 else mapView.zoomLevelDouble
                                mapView.controller.animateTo(geoPoint, targetZoom, 600L)
                            }
                        }
                        mapView.invalidate()
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Нижня панель із підтвердженням адреси
                Card(
                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(8.dp),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = RadarOrange)
                            Spacer(modifier = Modifier.width(8.dp))
                            if (isLocating) {
                                Text("Визначаємо адресу...", fontSize = 14.sp, color = DeepSage)
                            } else {
                                Text(
                                    text = resolvedAddress.ifBlank { "Торкніться будь-якого місця на мапі" },
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = CharcoalDark
                                )
                            }
                        }

                        Button(
                            onClick = onDismiss,
                            colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Підтвердити локацію", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}