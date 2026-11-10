package ua.helpradar.app.presentation.details

import android.content.Intent
import android.location.Geocoder
import android.net.Uri
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
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
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
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.SubcomposeAsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.ui.theme.*
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnnouncementDetailsScreen(
    announcementId: Int,
    onNavigateBack: () -> Unit,
    viewModel: AnnouncementDetailsViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    var fullScreenPhotoUrl by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(announcementId) {
        viewModel.loadDetails(announcementId)
    }

    fullScreenPhotoUrl?.let { photoUrl ->
        Dialog(
            onDismissRequest = { fullScreenPhotoUrl = null },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.95f))
            ) {
                SubcomposeAsyncImage(
                    model = photoUrl,
                    contentDescription = "Повне фото",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                )

                IconButton(
                    onClick = { fullScreenPhotoUrl = null },
                    modifier = Modifier
                        .statusBarsPadding()
                        .align(Alignment.TopEnd)
                        .padding(16.dp)
                        .size(40.dp)
                        .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Закрити",
                        tint = Color.White
                    )
                }
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
                            text = "Деталі оголошення",
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
            when {
                state.isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = OliveGreen
                    )
                }
                state.errorMessage != null -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = state.errorMessage ?: "Помилка завантаження",
                            fontFamily = Montserrat,
                            color = CharcoalDark,
                            fontSize = 15.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = { viewModel.loadDetails(announcementId) },
                            colors = ButtonDefaults.buttonColors(containerColor = OliveGreen)
                        ) {
                            Text("Спробувати знову", color = Color.White)
                        }
                    }
                }
                state.announcement != null -> {
                    val item = state.announcement!!

                    // Підтримка різних форматів типу оголошення з бекенду
                    val isOffer = item.type.equals("help_offer", ignoreCase = true) ||
                            item.type.equals("HelpOffer", ignoreCase = true) ||
                            item.type.equals("offer", ignoreCase = true)

                    // Визначення назви адреси/міста за координатами через Geocoder
                    var resolvedAddress by remember(item.id) {
                        mutableStateOf(item.exactLocation?.address)
                    }

                    LaunchedEffect(item.id, item.approxLocation, item.exactLocation) {
                        if (resolvedAddress.isNullOrBlank()) {
                            val targetLat = item.exactLocation?.latitude ?: item.approxLocation?.latitude
                            val targetLng = item.exactLocation?.longitude ?: item.approxLocation?.longitude

                            if (targetLat != null && targetLng != null && targetLat != 0.0 && targetLng != 0.0) {
                                withContext(Dispatchers.IO) {
                                    try {
                                        val geocoder = Geocoder(context, Locale.Builder().setLanguage("uk").setRegion("UA").build())
                                        @Suppress("DEPRECATION")
                                        val addresses = geocoder.getFromLocation(targetLat, targetLng, 1)
                                        if (!addresses.isNullOrEmpty()) {
                                            val addr = addresses[0]
                                            val locality = addr.locality ?: addr.subAdminArea ?: addr.adminArea
                                            val street = addr.thoroughfare
                                            resolvedAddress = when {
                                                street != null && locality != null -> "$street, $locality"
                                                locality != null -> locality
                                                else -> addr.getAddressLine(0)
                                            }
                                        }
                                    } catch (_: Exception) {
                                        // Без з'єднання залишаємо приблизний текст
                                    }
                                }
                            }
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // 1. Теги типу, категорії та терміновості
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = if (isOffer) OliveGreen else DeepSage.copy(alpha = 0.2f)
                            ) {
                                Text(
                                    text = if (isOffer) "Пропозиція" else "Потреба",
                                    fontFamily = Montserrat,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isOffer) Color.White else CharcoalDark,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }

                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = DeepSage.copy(alpha = 0.12f)
                            ) {
                                Text(
                                    text = item.category.name,
                                    fontFamily = Montserrat,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = DeepSage,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }

                            if (item.isUrgent) {
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = RadarOrange.copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = "Терміново",
                                        fontFamily = Montserrat,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = RadarOrange,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }

                        // 2. Заголовок та опис
                        Text(
                            text = item.title,
                            fontFamily = KharkivTone,
                            fontSize = 20.sp,
                            color = CharcoalDark
                        )

                        Text(
                            text = item.description,
                            fontFamily = Montserrat,
                            fontSize = 14.sp,
                            color = CharcoalDark.copy(alpha = 0.85f),
                            lineHeight = 20.sp
                        )

                        // 3. Галерея фотографій з відкриттям на весь екран
                        if (item.photos.isNotEmpty()) {
                            Text(
                                text = "Фотографії (натисніть для збільшення)",
                                fontFamily = KharkivTone,
                                fontSize = 14.sp,
                                color = CharcoalDark
                            )
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                item.photos.forEach { photo ->
                                    val fullPhotoUrl = if (photo.url.startsWith("http")) photo.url else "http://10.0.2.2:3000${photo.url}"
                                    SubcomposeAsyncImage(
                                        model = fullPhotoUrl,
                                        contentDescription = "Фото оголошення",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .size(110.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .border(1.dp, BorderSand, RoundedCornerShape(10.dp))
                                            .clickable {
                                                fullScreenPhotoUrl = fullPhotoUrl
                                            }
                                    )
                                }
                            }
                        }

                        // 4. Блок автора з надійним відображенням аватара (ініціалу)
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = androidx.compose.foundation.BorderStroke(1.dp, BorderSand),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                val authorInitial = item.author.name.trim().take(1).uppercase().ifEmpty { "U" }
                                val rawAvatarUrl = item.author.avatarUrl?.trim()
                                val hasCustomAvatar = !rawAvatarUrl.isNullOrBlank() && !rawAvatarUrl.contains("default")

                                val fullAvatarUrl = if (hasCustomAvatar) {
                                    if (rawAvatarUrl!!.startsWith("http")) rawAvatarUrl else "http://10.0.2.2:3000$rawAvatarUrl"
                                } else null

                                if (fullAvatarUrl != null) {
                                    SubcomposeAsyncImage(
                                        model = fullAvatarUrl,
                                        contentDescription = "Аватар автора",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .size(46.dp)
                                            .clip(CircleShape),
                                        error = {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxSize()
                                                    .background(TacticalOlive.copy(alpha = 0.5f)),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    text = authorInitial,
                                                    fontFamily = Montserrat,
                                                    fontWeight = FontWeight.Bold,
                                                    color = CharcoalDark,
                                                    fontSize = 17.sp
                                                )
                                            }
                                        }
                                    )
                                } else {
                                    Box(
                                        modifier = Modifier
                                            .size(46.dp)
                                            .clip(CircleShape)
                                            .background(TacticalOlive.copy(alpha = 0.5f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = authorInitial,
                                            fontFamily = Montserrat,
                                            fontWeight = FontWeight.Bold,
                                            color = CharcoalDark,
                                            fontSize = 17.sp
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.author.name,
                                        fontFamily = Montserrat,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                        color = CharcoalDark
                                    )
                                    if (item.author.rating != null) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Default.Star,
                                                contentDescription = null,
                                                tint = Color(0xFFFFB300),
                                                modifier = Modifier.size(14.dp)
                                            )
                                            Spacer(modifier = Modifier.width(3.dp))
                                            Text(
                                                text = String.format(Locale.US, "%.1f", item.author.rating),
                                                fontFamily = Montserrat,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Medium,
                                                color = CharcoalDark
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // 5. Блок місцезнаходження (реальне місто чи адреса)
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = androidx.compose.foundation.BorderStroke(1.dp, BorderSand),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.LocationOn,
                                    contentDescription = null,
                                    tint = RadarOrange,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "Місцезнаходження",
                                        fontFamily = Montserrat,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = CharcoalDark
                                    )
                                    Text(
                                        text = resolvedAddress ?: "Україна",
                                        fontFamily = Montserrat,
                                        fontSize = 13.sp,
                                        color = CharcoalDark.copy(alpha = 0.8f)
                                    )
                                }
                            }
                        }

                        // 6. Кнопки «Маршрут» та «Поділитися»
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            val targetLat = item.exactLocation?.latitude ?: item.approxLocation?.latitude
                            val targetLng = item.exactLocation?.longitude ?: item.approxLocation?.longitude

                            OutlinedButton(
                                onClick = {
                                    if (targetLat != null && targetLng != null) {
                                        val geoUri = Uri.parse("geo:$targetLat,$targetLng?q=$targetLat,$targetLng(${Uri.encode(item.title)})")
                                        val mapIntent = Intent(Intent.ACTION_VIEW, geoUri)
                                        context.startActivity(mapIntent)
                                    }
                                },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Navigation, contentDescription = null, tint = DeepSage, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Маршрут", fontFamily = Montserrat, fontSize = 13.sp, color = CharcoalDark)
                            }

                            OutlinedButton(
                                onClick = {
                                    val sendIntent = Intent().apply {
                                        action = Intent.ACTION_SEND
                                        putExtra(Intent.EXTRA_TEXT, "HelpRadar: ${item.title}\nКатегорія: ${item.category.name}\nМісце: ${resolvedAddress ?: ""}\nДолучайтеся до взаємодопомоги!")
                                        type = "text/plain"
                                    }
                                    context.startActivity(Intent.createChooser(sendIntent, "Поділитися оголошенням"))
                                },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = null, tint = DeepSage, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Поділитися", fontFamily = Montserrat, fontSize = 13.sp, color = CharcoalDark)
                            }
                        }

                        // 7. Головна кнопка взаємодії (SRS 3.2.7.3, 3.2.10, 3.2.16)
                        val isCurrentAuthor = item.isOwner || (SessionManager.currentUserId != null && SessionManager.currentUserId == item.author.id)

                        if (!isCurrentAuthor) {
                            if (isOffer) {
                                // Якщо це пропозиція допомоги — будь-хто, крім автора, може зв'язатися з волонтером
                                Button(
                                    onClick = {
                                        // TODO: відкриття чату з волонтером (SRS 3.2.16)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = DeepSage),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(48.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.Chat,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Зв'язатися з волонтером",
                                        fontFamily = Montserrat,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                        color = Color.White
                                    )
                                }
                            } else {
                                // Якщо це потреба — показуємо кнопку «Допомогти»
                                Button(
                                    onClick = {
                                        // TODO: відгукнутися на допомогу / відкрити чат (SRS 3.2.10)
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(48.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.Chat,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Допомогти",
                                        fontFamily = Montserrat,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                        color = Color.White
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(20.dp))
                    }
                }
            }
        }
    }
}