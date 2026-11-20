package ua.helpradar.app.presentation.map

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.drawable.BitmapDrawable
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.provider.Settings
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.osmdroid.config.Configuration
import org.osmdroid.events.DelayedMapListener
import org.osmdroid.events.MapListener
import org.osmdroid.events.ScrollEvent
import org.osmdroid.events.ZoomEvent
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
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.tan

private data class AnnouncementCluster(
    val center: GeoPoint,
    val items: List<AnnouncementItem>
)

// Збереження останньої позиції камери та обраного радіуса при переході в деталі оголошення
private object MapCameraMemory {
    var lastCameraCenter: GeoPoint? = null
    var lastZoom: Double? = null
    var lastSearchCenter: GeoPoint? = null
    var lastRadiusKm: Int? = 10
}

private val DEFAULT_UKRAINE_CENTER = GeoPoint(49.9935, 36.2304)

private fun isLocationEnabled(context: Context): Boolean {
    val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        ?: return false
    return try {
        locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    } catch (_: Exception) {
        false
    }
}

private fun hasLocationPermission(context: Context): Boolean {
    val hasFine = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
    val hasCoarse = ContextCompat.checkSelfPermission(
        context,
        Manifest.permission.ACCESS_COARSE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
    return hasFine || hasCoarse
}

private fun zoomForRadiusKm(radiusKm: Int?): Double {
    return when (radiusKm) {
        1 -> 14.5
        3 -> 13.0
        5 -> 12.2
        10 -> 11.2
        25 -> 10.0
        50 -> 9.0
        null -> 6.2
        else -> 11.2
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    onNavigateBack: () -> Unit,
    onAnnouncementClick: (Int) -> Unit = {},
    feedViewModel: FeedViewModel = viewModel()
) {
    val state by feedViewModel.uiState.collectAsState()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val coroutineScope = rememberCoroutineScope()

    var mapViewRef by remember { mutableStateOf<MapView?>(null) }
    var userLocationOverlay by remember { mutableStateOf<MyLocationNewOverlay?>(null) }

    var selectedCluster by remember { mutableStateOf<List<AnnouncementItem>>(emptyList()) }
    var selectedClusterIndex by remember { mutableIntStateOf(0) }

    var searchCenterPoint by remember { mutableStateOf<GeoPoint?>(MapCameraMemory.lastSearchCenter) }
    var currentZoom by remember {
        mutableDoubleStateOf(MapCameraMemory.lastZoom ?: zoomForRadiusKm(MapCameraMemory.lastRadiusKm))
    }

    // Радіуси пошуку згідно з SRS 3.2.19.2 (null = вся мапа)
    val availableRadii = listOf(null, 1, 3, 5, 10, 25, 50)
    var selectedRadiusKm by remember { mutableStateOf<Int?>(MapCameraMemory.lastRadiusKm) }

    var searchQuery by remember { mutableStateOf("") }
    var isSearching by remember { mutableStateOf(false) }

    var locationErrorBanner by remember { mutableStateOf<String?>(null) }
    var isPermissionDenied by remember { mutableStateOf(false) }

    val blueArrowBitmap = remember { createBlueArrowBitmap() }
    val blueDotBitmap = remember { createBlueDotBitmap() }

    fun refreshLocationStatus() {
        val permGranted = hasLocationPermission(context)
        val gpsOn = isLocationEnabled(context)
        isPermissionDenied = !permGranted
        locationErrorBanner = when {
            !permGranted -> "Не вдалося визначити місцезнаходження: доступ до геолокації заборонено."
            !gpsOn -> "Не вдалося завантажити поточну геолокацію: GPS вимкнено на пристрої."
            else -> null
        }
    }

    // Конфігурація osmdroid
    LaunchedEffect(Unit) {
        Configuration.getInstance().load(context, context.getSharedPreferences("osmdroid", Context.MODE_PRIVATE))
        Configuration.getInstance().userAgentValue = context.packageName
        refreshLocationStatus()
    }

    // Перевірка стану GPS при поверненні з налаштувань
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                refreshLocationStatus()
                if (hasLocationPermission(context) && isLocationEnabled(context)) {
                    userLocationOverlay?.enableMyLocation()
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Запит дозволів на геолокацію
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        refreshLocationStatus()
        if (granted && isLocationEnabled(context)) {
            userLocationOverlay?.enableMyLocation()
            userLocationOverlay?.runOnFirstFix {
                val loc = userLocationOverlay?.myLocation
                if (loc != null) {
                    val hadSavedCamera = MapCameraMemory.lastCameraCenter != null
                    if (searchCenterPoint == null) {
                        searchCenterPoint = loc
                        MapCameraMemory.lastSearchCenter = loc
                    }
                    if (!hadSavedCamera) {
                        val targetZoom = zoomForRadiusKm(selectedRadiusKm)
                        MapCameraMemory.lastCameraCenter = loc
                        MapCameraMemory.lastZoom = targetZoom
                        coroutineScope.launch(Dispatchers.Main) {
                            currentZoom = targetZoom
                            mapViewRef?.controller?.animateTo(loc, targetZoom, 900L)
                        }
                    }
                }
            }
        } else if (searchCenterPoint == null && MapCameraMemory.lastCameraCenter == null) {
            searchCenterPoint = DEFAULT_UKRAINE_CENTER
            mapViewRef?.controller?.setCenter(DEFAULT_UKRAINE_CENTER)
        }
    }

    LaunchedEffect(Unit) {
        if (!hasLocationPermission(context)) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        } else if (!isLocationEnabled(context) && searchCenterPoint == null && MapCameraMemory.lastCameraCenter == null) {
            searchCenterPoint = DEFAULT_UKRAINE_CENTER
        }
    }

    // Звільнення ресурсів osmdroid при закритті екрана мапи (зі збереженням камери)
    DisposableEffect(Unit) {
        onDispose {
            mapViewRef?.let { mv ->
                val center = mv.mapCenter
                MapCameraMemory.lastCameraCenter = GeoPoint(center.latitude, center.longitude)
                MapCameraMemory.lastZoom = mv.zoomLevelDouble
            }
            MapCameraMemory.lastSearchCenter = searchCenterPoint
            MapCameraMemory.lastRadiusKm = selectedRadiusKm

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
                MapCameraMemory.lastSearchCenter = point
                val targetZoom = zoomForRadiusKm(selectedRadiusKm)
                currentZoom = targetZoom
                MapCameraMemory.lastCameraCenter = point
                MapCameraMemory.lastZoom = targetZoom
                mapViewRef?.controller?.animateTo(point, targetZoom, 900L)
            } else {
                Toast.makeText(context, "Місто чи адресу «$cityName» не знайдено", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // Фільтрація оголошень за радіусом (SRS 3.2.19)
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

    // Групування маркерів, які візуально зливаються на поточному масштабі
    val clusters = remember(filteredAnnouncements, currentZoom) {
        clusterAnnouncements(filteredAnnouncements, currentZoom)
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

                        val initialZoom = MapCameraMemory.lastZoom ?: zoomForRadiusKm(selectedRadiusKm)
                        val initialCenter = MapCameraMemory.lastCameraCenter
                            ?: searchCenterPoint
                            ?: DEFAULT_UKRAINE_CENTER
                        controller.setZoom(initialZoom)
                        controller.setCenter(initialCenter)

                        addMapListener(
                            DelayedMapListener(
                                object : MapListener {
                                    override fun onScroll(event: ScrollEvent?): Boolean {
                                        val c = mapCenter
                                        MapCameraMemory.lastCameraCenter = GeoPoint(c.latitude, c.longitude)
                                        return false
                                    }

                                    override fun onZoom(event: ZoomEvent?): Boolean {
                                        val z = event?.zoomLevel ?: zoomLevelDouble
                                        MapCameraMemory.lastZoom = z
                                        if (abs(z - currentZoom) >= 0.3) {
                                            currentZoom = z
                                        }
                                        return false
                                    }
                                },
                                120L
                            )
                        )

                        val myLoc = MyLocationNewOverlay(GpsMyLocationProvider(ctx), this).apply {
                            if (hasLocationPermission(ctx) && isLocationEnabled(ctx)) {
                                enableMyLocation()
                            }
                            setDirectionIcon(blueArrowBitmap)
                            setDirectionAnchor(0.5f, 0.5f)
                            setPersonIcon(blueDotBitmap)
                            setPersonAnchor(0.5f, 0.5f)
                            runOnFirstFix {
                                val loc = myLocation
                                if (loc != null) {
                                    val hadSavedCamera = MapCameraMemory.lastCameraCenter != null
                                    if (searchCenterPoint == null) {
                                        searchCenterPoint = loc
                                        MapCameraMemory.lastSearchCenter = loc
                                    }
                                    if (!hadSavedCamera) {
                                        val targetZoom = zoomForRadiusKm(selectedRadiusKm)
                                        MapCameraMemory.lastCameraCenter = loc
                                        MapCameraMemory.lastZoom = targetZoom
                                        coroutineScope.launch(Dispatchers.Main) {
                                            currentZoom = targetZoom
                                            controller.animateTo(loc, targetZoom, 900L)
                                        }
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

                    // Малюємо коло радіуса (SRS 3.2.19.4)
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

                    // Відображаємо одиничні маркери або кластери об'єднаних оголошень
                    clusters.forEach { cluster ->
                        val marker = Marker(mapView).apply {
                            position = cluster.center
                            if (cluster.items.size > 1) {
                                title = "Оголошень у зоні: ${cluster.items.size}"
                                icon = BitmapDrawable(
                                    mapView.context.resources,
                                    createClusterBitmap(cluster.items.size)
                                )
                                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                            } else {
                                val single = cluster.items.first()
                                title = single.title
                                snippet = single.description
                                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                            }

                            setOnMarkerClickListener { _, _ ->
                                selectedCluster = cluster.items
                                selectedClusterIndex = 0
                                MapCameraMemory.lastCameraCenter = position
                                MapCameraMemory.lastZoom = mapView.zoomLevelDouble
                                mapView.controller.animateTo(position)
                                true
                            }
                        }
                        mapView.overlays.add(marker)
                    }

                    mapView.invalidate()
                },
                modifier = Modifier.fillMaxSize()
            )

            // Верхній блок: Пошук міста + Фільтр радіуса + Повідомлення про помилку геолокації
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

                // Вибір радіуса пошуку з автоматичним підлаштуванням масштабу
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
                            onClick = {
                                selectedRadiusKm = radius
                                MapCameraMemory.lastRadiusKm = radius
                                val targetZoom = zoomForRadiusKm(radius)
                                currentZoom = targetZoom
                                MapCameraMemory.lastZoom = targetZoom
                                val focusCenter = searchCenterPoint
                                    ?: mapViewRef?.mapCenter?.let { GeoPoint(it.latitude, it.longitude) }
                                if (focusCenter != null) {
                                    MapCameraMemory.lastCameraCenter = focusCenter
                                    mapViewRef?.controller?.animateTo(focusCenter, targetZoom, 650L)
                                } else {
                                    mapViewRef?.controller?.setZoom(targetZoom)
                                }
                            },
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

                // Попередження/помилка, якщо геолокацію вимкнено або дозвіл не надано
                locationErrorBanner?.let { errorText ->
                    Card(
                        shape = RoundedCornerShape(10.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.WarningAmber,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = errorText,
                                fontFamily = Montserrat,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.weight(1f)
                            )
                            TextButton(
                                onClick = {
                                    if (isPermissionDenied) {
                                        permissionLauncher.launch(
                                            arrayOf(
                                                Manifest.permission.ACCESS_FINE_LOCATION,
                                                Manifest.permission.ACCESS_COARSE_LOCATION
                                            )
                                        )
                                    } else {
                                        context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
                                    }
                                },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "Увімкнути",
                                    fontFamily = Montserrat,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = CharcoalDark.copy(alpha = 0.82f),
                    modifier = Modifier.align(Alignment.Start)
                ) {
                    Text(
                        text = if (selectedRadiusKm != null)
                            "Знайдено: ${filteredAnnouncements.size} в радіусі $selectedRadiusKm км • приблизні зони"
                        else
                            "Всього оголошень: ${filteredAnnouncements.size} • приблизні зони",
                        fontFamily = Montserrat,
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            // Кнопка центрування на GPS
            val hasPopup = selectedCluster.isNotEmpty()
            FloatingActionButton(
                onClick = {
                    refreshLocationStatus()
                    if (!hasLocationPermission(context)) {
                        permissionLauncher.launch(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            )
                        )
                        return@FloatingActionButton
                    }
                    if (!isLocationEnabled(context)) {
                        Toast.makeText(
                            context,
                            "Увімкніть геолокацію (GPS) у налаштуваннях пристрою",
                            Toast.LENGTH_LONG
                        ).show()
                        return@FloatingActionButton
                    }
                    val myLoc = userLocationOverlay?.myLocation
                    if (myLoc != null) {
                        searchCenterPoint = myLoc
                        MapCameraMemory.lastSearchCenter = myLoc
                        val targetZoom = zoomForRadiusKm(selectedRadiusKm ?: 5)
                        currentZoom = targetZoom
                        MapCameraMemory.lastCameraCenter = myLoc
                        MapCameraMemory.lastZoom = targetZoom
                        mapViewRef?.controller?.animateTo(myLoc, targetZoom, 800L)
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
                    .padding(
                        end = 16.dp,
                        bottom = when {
                            selectedCluster.size > 1 -> 255.dp
                            hasPopup -> 215.dp
                            else -> 24.dp
                        }
                    )
                    .size(48.dp)
            ) {
                Icon(Icons.Default.MyLocation, contentDescription = "Моє місцезнаходження", tint = OliveGreen)
            }

            // Спливаюча картка вибраного оголошення / групи оголошень (Popup Preview)
            AnimatedVisibility(
                visible = selectedCluster.isNotEmpty(),
                enter = slideInVertically { it },
                exit = slideOutVertically { it },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp)
            ) {
                if (selectedCluster.isNotEmpty()) {
                    val safeIndex = selectedClusterIndex.coerceIn(0, selectedCluster.lastIndex)
                    val currentItem = selectedCluster[safeIndex]

                    MapAnnouncementPopupCard(
                        item = currentItem,
                        currentIndex = safeIndex,
                        totalCount = selectedCluster.size,
                        onPrevious = {
                            selectedClusterIndex = if (safeIndex - 1 < 0) selectedCluster.lastIndex else safeIndex - 1
                        },
                        onNext = {
                            selectedClusterIndex = (safeIndex + 1) % selectedCluster.size
                        },
                        onClose = {
                            selectedCluster = emptyList()
                            selectedClusterIndex = 0
                        },
                        onDetailsClick = {
                            mapViewRef?.let { mv ->
                                val c = mv.mapCenter
                                MapCameraMemory.lastCameraCenter = GeoPoint(c.latitude, c.longitude)
                                MapCameraMemory.lastZoom = mv.zoomLevelDouble
                            }
                            MapCameraMemory.lastSearchCenter = searchCenterPoint
                            MapCameraMemory.lastRadiusKm = selectedRadiusKm
                            onAnnouncementClick(currentItem.id)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun MapAnnouncementPopupCard(
    item: AnnouncementItem,
    currentIndex: Int,
    totalCount: Int,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
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
            if (totalCount > 1) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DesertSand, RoundedCornerShape(10.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onPrevious,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ChevronLeft,
                            contentDescription = "Попереднє оголошення",
                            tint = CharcoalDark
                        )
                    }

                    Text(
                        text = "Оголошення ${currentIndex + 1} з $totalCount у цій зоні",
                        fontFamily = Montserrat,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = CharcoalDark
                    )

                    IconButton(
                        onClick = onNext,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = "Наступне оголошення",
                            tint = CharcoalDark
                        )
                    }
                }
            }

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
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .weight(1f)
                        .padding(end = 8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = if (isOffer) OliveGreen else RadarOrange,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${item.authorName} • приблизна зона",
                        fontFamily = Montserrat,
                        fontSize = 11.sp,
                        color = CharcoalDark.copy(alpha = 0.85f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
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

private fun geoToPixel(lat: Double, lon: Double, zoom: Double): Pair<Double, Double> {
    val scale = 256.0 * 2.0.pow(zoom)
    val x = (lon + 180.0) / 360.0 * scale
    val clampedLat = lat.coerceIn(-85.0511, 85.0511)
    val latRad = Math.toRadians(clampedLat)
    val y = (1.0 - ln(tan(latRad) + 1.0 / cos(latRad)) / Math.PI) / 2.0 * scale
    return Pair(x, y)
}

private fun clusterAnnouncements(
    items: List<AnnouncementItem>,
    zoom: Double,
    thresholdPx: Double = 110.0
): List<AnnouncementCluster> {
    val validItems = items.filter {
        it.latitude != null && it.longitude != null && it.latitude != 0.0 && it.longitude != 0.0
    }
    if (validItems.isEmpty()) return emptyList()

    val projected = validItems.map { item ->
        item to geoToPixel(item.latitude!!, item.longitude!!, zoom)
    }

    val visited = BooleanArray(projected.size)
    val clusters = mutableListOf<AnnouncementCluster>()

    for (i in projected.indices) {
        if (visited[i]) continue
        visited[i] = true
        val (baseItem, basePx) = projected[i]
        val group = mutableListOf(baseItem)

        for (j in i + 1 until projected.size) {
            if (visited[j]) continue
            val (candItem, candPx) = projected[j]
            val dx = basePx.first - candPx.first
            val dy = basePx.second - candPx.second
            if (hypot(dx, dy) <= thresholdPx) {
                visited[j] = true
                group.add(candItem)
            }
        }

        val avgLat = group.map { it.latitude!! }.average()
        val avgLon = group.map { it.longitude!! }.average()
        clusters.add(AnnouncementCluster(GeoPoint(avgLat, avgLon), group))
    }

    return clusters
}

private fun createClusterBitmap(count: Int): Bitmap {
    val size = 84
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    val outerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#444A5D23")
        style = Paint.Style.FILL
    }
    val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.parseColor("#4A5D23")
        style = Paint.Style.FILL
    }
    val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = 4f
    }
    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = android.graphics.Color.WHITE
        textSize = 30f
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
    }

    val center = size / 2f
    canvas.drawCircle(center, center, center - 2f, outerPaint)
    val innerRadius = center - 10f
    canvas.drawCircle(center, center, innerRadius, fillPaint)
    canvas.drawCircle(center, center, innerRadius, strokePaint)

    val textY = center - (textPaint.descent() + textPaint.ascent()) / 2f
    canvas.drawText(count.toString(), center, textY, textPaint)
    return bitmap
}

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