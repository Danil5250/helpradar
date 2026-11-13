package ua.helpradar.app.presentation.map

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.location.Geocoder
import android.location.Location
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polygon
import org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider
import org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay
import ua.helpradar.app.presentation.feed.AnnouncementItem
import ua.helpradar.app.presentation.feed.AnnouncementType
import ua.helpradar.app.presentation.feed.FeedViewModel
import ua.helpradar.app.ui.theme.*
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    onNavigateBack: () -> Unit,
    onAnnouncementClick: (Int) -> Unit = {},
    feedViewModel: FeedViewModel = viewModel()
) {
    val state by feedViewModel.uiState.collectAsState()
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var mapViewRef by remember { mutableStateOf<MapView?>(null) }
    var userLocationOverlay by remember { mutableStateOf<MyLocationNewOverlay?>(null) }
    var selectedAnnouncement by remember { mutableStateOf<AnnouncementItem?>(null) }

    var searchCenterPoint by remember { mutableStateOf<GeoPoint?>(null) }

    // Радіуси пошуку згідно з SRS 3.2.19.2 (null = вся мапа)[cite: 13]
    val availableRadii = listOf(null, 1, 3, 5, 10, 25, 50)
    var selectedRadiusKm by remember { mutableStateOf<Int?>(10) }

    var searchQuery by remember { mutableStateOf("") }
    var isSearching by remember { mutableStateOf(false) }

    val blueArrowBitmap = remember { createBlueArrowBitmap() }
    val blueDotBitmap = remember { createBlueDotBitmap() }

    // Конфігурація osmdroid
    LaunchedEffect(Unit) {
        Configuration.getInstance().load(context, context.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
        Configuration.getInstance().userAgentValue = context.packageName
    }

    // Запит дозволів на геолокацію
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) {
            userLocationOverlay?.enableMyLocation()
            userLocationOverlay?.enableFollowLocation()
            userLocationOverlay?.runOnFirstFix {
                val loc = userLocationOverlay?.myLocation
                if (loc != null) {
                    searchCenterPoint = loc
                    coroutineScope.launch(Dispatchers.Main) {
                        mapViewRef?.controller?.animateTo(loc, 14.0, 1000L)
                    }
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!hasFine && !hasCoarse) {
            permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }
    }

    // Звільнення ресурсів osmdroid при закритті екрана мапи
    DisposableEffect(Unit) {
        onDispose {
            userLocationOverlay?.disableMyLocation()
            userLocationOverlay?.disableFollowLocation()
            mapViewRef?.onPause()
            mapViewRef?.onDetach()
        }
    }

    fun searchCity(cityName: String) {
        if (cityName.isBlank()) return
        isSearching = true
        coroutineScope.launch {
            val point = withContext(Dispatchers.IO) {
                try {
                    val geocoder = Geocoder(context, Locale.Builder().setLanguage("uk").setRegion("UA").build())
                    @Suppress("DEPRECATION")
                    val results = geocoder.getFromLocationName(cityName, 1)
                    if (!results.isNullOrEmpty()) {
                        GeoPoint(results[0].latitude, results[0].longitude)
                    } else null
                } catch (_: Exception) {
                    null
                }
            }
            isSearching = false
            if (point != null) {
                searchCenterPoint = point
                mapViewRef?.controller?.animateTo(point, 13.0, 1000L)
            } else {
                Toast.makeText(context, "Місто чи адресу «$cityName» не знайдено", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // Фільтрація оголошень за радіусом (SRS 3.2.19)[cite: 13]
    val filteredAnnouncements = remember(state.announcements, searchCenterPoint, selectedRadiusKm) {
        val center = searchCenterPoint
        val radius = selectedRadiusKm
        if (center == null || radius == null) {
            state.announcements
        } else {
            state.announcements.filter { item ->
                val lat = item.latitude
                val lon = item.longitude
                if (lat != null && lon != null && lat != 0.0 && lon != 0.0) {
                    val distanceMeters = FloatArray(1)
                    Location.distanceBetween(center.latitude, center.longitude, lat, lon, distanceMeters)
                    distanceMeters[0] <= radius * 1000
                } else false
            }
        }
    }

    Scaffold(
        containerColor = DesertSand,
        topBar = {
            Surface(color = DesertSand, shadowElevation = 0.dp) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = onNavigateBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Назад",
                                tint = CharcoalDark
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Мапа взаємодопомоги",
                            fontFamily = KharkivTone,
                            fontSize = 18.sp,
                            color = CharcoalDark
                        )
                    }
                    HorizontalDivider(color = BorderSand.copy(alpha = 0.6f), thickness = 1.dp)
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
                        controller.setZoom(13.0)

                        val myLoc = MyLocationNewOverlay(GpsMyLocationProvider(ctx), this).apply {
                            enableMyLocation()
                            setDirectionIcon(blueArrowBitmap)
                            setDirectionAnchor(0.5f, 0.5f)
                            setPersonIcon(blueDotBitmap)
                            setPersonAnchor(0.5f, 0.5f)

                            runOnFirstFix {
                                val loc = myLocation
                                if (loc != null) {
                                    if (searchCenterPoint == null) {
                                        searchCenterPoint = loc
                                    }
                                    coroutineScope.launch(Dispatchers.Main) {
                                        controller.animateTo(loc, 14.0, 1000L)
                                    }
                                }
                            }
                        }
                        overlays.add(myLoc)
                        userLocationOverlay = myLoc
                        mapViewRef = this
                    }
                },
                update = { mapView ->
                    mapViewRef = mapView

                    val myLocOverlay = userLocationOverlay
                    mapView.overlays.clear()
                    if (myLocOverlay != null) {
                        mapView.overlays.add(myLocOverlay)
                    }

                    // Малюємо коло радіуса (SRS 3.2.19.4)[cite: 13]
                    val center = searchCenterPoint
                    val radius = selectedRadiusKm
                    if (center != null && radius != null) {
                        val circlePoints = Polygon.pointsAsCircle(center, (radius * 1000).toDouble())
                        val circleOverlay = Polygon(mapView).apply {
                            points = circlePoints
                            fillPaint.color = 0x221B5E20.toInt()
                            outlinePaint.color = 0x882E7D32.toInt()
                            outlinePaint.strokeWidth = 3f
                        }
                        mapView.overlays.add(circleOverlay)
                    }

                    // Відображаємо маркери оголошень[cite: 10]
                    filteredAnnouncements.forEach { item ->
                        val lat = item.latitude
                        val lon = item.longitude
                        if (lat != null && lon != null && lat != 0.0 && lon != 0.0) {
                            val marker = Marker(mapView).apply {
                                position = GeoPoint(lat, lon)
                                title = item.title
                                snippet = item.description
                                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)

                                setOnMarkerClickListener { _, _ ->
                                    selectedAnnouncement = item
                                    mapView.controller.animateTo(position)
                                    true
                                }
                            }
                            mapView.overlays.add(marker)
                        }
                    }
                    mapView.invalidate()
                },
                modifier = Modifier.fillMaxSize()
            )

            // Верхній блок: Пошук міста + Фільтр радіуса
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.95f)),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = null,
                            tint = DeepSage,
                            modifier = Modifier.padding(start = 6.dp)
                        )
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Пошук міста (напр. Київ, Львів, Миколаїв)", fontSize = 13.sp, color = PlaceholderSage) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent
                            ),
                            modifier = Modifier.weight(1f)
                        )
                        if (isSearching) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = OliveGreen)
                        } else if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = {
                                searchCity(searchQuery)
                            }) {
                                Icon(Icons.Default.LocationOn, contentDescription = "Знайти", tint = RadarOrange)
                            }
                        }
                    }
                }

                // Вибір радіуса пошуку (1, 3, 5, 10, 25, 50 км)[cite: 13]
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    availableRadii.forEach { radius ->
                        val isSelected = selectedRadiusKm == radius
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedRadiusKm = radius },
                            label = {
                                Text(
                                    text = if (radius == null) "Вся мапа" else "$radius км",
                                    fontFamily = Montserrat,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = OliveGreen,
                                selectedLabelColor = Color.White,
                                containerColor = Color.White.copy(alpha = 0.9f)
                            )
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = CharcoalDark.copy(alpha = 0.8f),
                    modifier = Modifier.align(Alignment.Start)
                ) {
                    Text(
                        text = if (selectedRadiusKm != null)
                            "Знайдено: ${filteredAnnouncements.size} в радіусі $selectedRadiusKm км"
                        else
                            "Всього оголошень: ${filteredAnnouncements.size}",
                        fontFamily = Montserrat,
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            // Кнопка центрування на GPS
            FloatingActionButton(
                onClick = {
                    val myLoc = userLocationOverlay?.myLocation
                    if (myLoc != null) {
                        searchCenterPoint = myLoc
                        mapViewRef?.controller?.animateTo(myLoc, 15.0, 800L)
                    } else {
                        Toast.makeText(context, "Визначаємо GPS координати...", Toast.LENGTH_SHORT).show()
                        userLocationOverlay?.enableMyLocation()
                    }
                },
                containerColor = Color.White,
                contentColor = CharcoalDark,
                shape = CircleShape,
                elevation = FloatingActionButtonDefaults.elevation(4.dp),
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 16.dp, bottom = if (selectedAnnouncement != null) 210.dp else 24.dp)
                    .size(48.dp)
            ) {
                Icon(Icons.Default.MyLocation, contentDescription = "Моє місцезнаходження", tint = OliveGreen)
            }

            // Спливаюча картка вибраного оголошення (Popup Preview)[cite: 10]
            AnimatedVisibility(
                visible = selectedAnnouncement != null,
                enter = slideInVertically { it },
                exit = slideOutVertically { it },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
            ) {
                selectedAnnouncement?.let { item ->
                    MapAnnouncementPopupCard(
                        item = item,
                        onClose = { selectedAnnouncement = null },
                        onDetailsClick = { onAnnouncementClick(item.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun MapAnnouncementPopupCard(
    item: AnnouncementItem,
    onClose: () -> Unit,
    onDetailsClick: () -> Unit
) {
    val isOffer = item.type == AnnouncementType.OFFER

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderSand, RoundedCornerShape(16.dp))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (isOffer) OliveGreen else DeepSage.copy(alpha = 0.2f)
                    ) {
                        Text(
                            text = if (isOffer) "Пропозиція" else "Потреба",
                            fontFamily = Montserrat,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isOffer) Color.White else CharcoalDark,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = DeepSage.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = item.categoryName,
                            fontFamily = Montserrat,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = DeepSage,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }

                IconButton(onClick = onClose, modifier = Modifier.size(24.dp)) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Закрити",
                        tint = CharcoalDark
                    )
                }
            }

            Text(
                text = item.title,
                fontFamily = KharkivTone,
                fontSize = 16.sp,
                color = CharcoalDark,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = item.description,
                fontFamily = Montserrat,
                fontSize = 13.sp,
                color = CharcoalDark.copy(alpha = 0.75f),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = if (isOffer) OliveGreen else RadarOrange,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = item.authorName,
                        fontFamily = Montserrat,
                        fontSize = 12.sp,
                        color = CharcoalDark
                    )
                }

                Button(
                    onClick = onDetailsClick,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isOffer) DeepSage else OliveGreen
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "Детальніше",
                        fontFamily = Montserrat,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = Color.White
                    )
                }
            }
        }
    }
}

// Генерація векторної синьої стрілки напрямку з білою обводкою
private fun createBlueArrowBitmap(): Bitmap {
    val size = 64
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    val arrowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#1976D2")
        style = Paint.Style.FILL
    }

    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = 3f
        strokeJoin = Paint.Join.ROUND
    }

    val path = Path().apply {
        moveTo(size / 2f, 4f)
        lineTo(size - 8f, size - 8f)
        lineTo(size / 2f, size - 18f)
        lineTo(8f, size - 8f)
        close()
    }

    canvas.drawPath(path, arrowPaint)
    canvas.drawPath(path, strokePaint)

    return bitmap
}

// Генерація синьої крапки користувача в стані спокою
private fun createBlueDotBitmap(): Bitmap {
    val size = 48
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#1976D2")
        style = Paint.Style.FILL
    }
    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = 4f
    }

    val center = size / 2f
    val radius = center - 4f
    canvas.drawCircle(center, center, radius, fillPaint)
    canvas.drawCircle(center, center, radius, strokePaint)

    return bitmap
}