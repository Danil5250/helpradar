package ua.helpradar.app.presentation.details

import android.content.Intent
import android.location.Geocoder
import android.net.Uri
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.StarBorder
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
import ua.helpradar.app.data.network.ApiClient
import ua.helpradar.app.data.network.dto.HelpConnectionDto
import ua.helpradar.app.data.repository.ProfileRepository
import ua.helpradar.app.ui.theme.*
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnnouncementDetailsScreen(
    announcementId: Int,
    onNavigateBack: () -> Unit,
    onAuthorClick: (Int) -> Unit = {},
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

                    val isOffer = item.type.equals("help_offer", ignoreCase = true) ||
                            item.type.equals("HelpOffer", ignoreCase = true) ||
                            item.type.equals("offer", ignoreCase = true)

                    var authorRating by remember(item.author.id, item.author.rating) {
                        mutableStateOf(
                            item.author.rating ?: ProfileRepository.getCachedRating(item.author.id)
                        )
                    }

                    LaunchedEffect(item.author.id) {
                        if (authorRating == null) {
                            try {
                                val resp = ApiClient.profileService.getPublicProfile(item.author.id)
                                val r = resp.body()?.rating
                                if (resp.isSuccessful && r != null) {
                                    ProfileRepository.cacheRating(item.author.id, r)
                                    authorRating = r
                                }
                            } catch (_: Exception) {
                            }
                        }
                    }

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

                        // 3. Галерея фотографій
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

                        // 4. Клікабельний блок автора
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, BorderSand),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { onAuthorClick(item.author.id) }
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
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        if (authorRating != null) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Icon(
                                                    imageVector = Icons.Default.Star,
                                                    contentDescription = null,
                                                    tint = RadarOrange,
                                                    modifier = Modifier.size(14.dp)
                                                )
                                                Spacer(modifier = Modifier.width(3.dp))
                                                Text(
                                                    text = String.format(Locale.US, "%.1f", authorRating),
                                                    fontFamily = Montserrat,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = CharcoalDark
                                                )
                                            }
                                        }
                                        Text(
                                            text = "Переглянути профіль",
                                            fontFamily = Montserrat,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = OliveGreen
                                        )
                                    }
                                }

                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                    contentDescription = "Відкрити профіль",
                                    tint = DeepSage
                                )
                            }
                        }

                        // 5. Блок місцезнаходження
                        val isExactLocation = item.exactLocation != null
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, BorderSand),
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
                                        text = if (isExactLocation) "Місцезнаходження" else "Місцезнаходження (приблизна зона)",
                                        fontFamily = Montserrat,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = CharcoalDark
                                    )
                                    Text(
                                        text = resolvedAddress ?: "Україна",
                                        fontFamily = Montserrat,
                                        fontSize = 13.sp,
                                        color = CharcoalDark.copy(alpha = 0.85f)
                                    )
                                    if (!isExactLocation) {
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = "З міркувань безпеки точну адресу автор повідомляє в чаті",
                                            fontFamily = Montserrat,
                                            fontSize = 11.sp,
                                            color = DeepSage
                                        )
                                    }
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

                        // 7. Панель взаємодії / відгуків на допомогу
                        val isCurrentAuthor = item.isOwner || (SessionManager.currentUserId != null && SessionManager.currentUserId == item.author.id)
                        if (SessionManager.isLoggedIn) {
                            HelpInteractionSection(
                                isCurrentAuthor = isCurrentAuthor,
                                isOffer = isOffer,
                                state = state,
                                onSelectRequest = viewModel::onSelectUserRequest,
                                onRespondToRequest = viewModel::respondToRequest,
                                onReceiveOffer = viewModel::receiveOffer,
                                onAction = viewModel::performConnectionAction,
                                onParticipantClick = onAuthorClick,
                                onReviewRatingChange = viewModel::onReviewRatingChange,
                                onReviewTextChange = viewModel::onReviewTextChange,
                                onSubmitReview = viewModel::submitReview
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun HelpInteractionSection(
    isCurrentAuthor: Boolean,
    isOffer: Boolean,
    state: AnnouncementDetailsUiState,
    onSelectRequest: (Int?) -> Unit,
    onRespondToRequest: () -> Unit,
    onReceiveOffer: () -> Unit,
    onAction: (Int, String) -> Unit,
    onParticipantClick: (Int) -> Unit,
    onReviewRatingChange: (Int) -> Unit,
    onReviewTextChange: (String) -> Unit,
    onSubmitReview: (Int?) -> Unit
) {
    val overview = state.helpOverview
    val connections = overview?.connections.orEmpty()
    val currentUserId = SessionManager.currentUserId
    val context = LocalContext.current

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = SelectedRoleBg.copy(alpha = 0.85f)),
        border = BorderStroke(1.dp, OliveGreen.copy(alpha = 0.45f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = if (isCurrentAuthor) "Відгуки на оголошення" else if (isOffer) "Отримати допомогу" else "Запропонувати допомогу",
                fontFamily = KharkivTone,
                fontSize = 17.sp,
                color = CharcoalDark
            )

            if (state.helpFeedbackMessage != null) {
                Text(
                    text = state.helpFeedbackMessage,
                    fontFamily = Montserrat,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = OliveGreen
                )
            }

            if (state.helpErrorMessage != null) {
                Text(
                    text = state.helpErrorMessage,
                    fontFamily = Montserrat,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.error
                )
            }

            if (state.isHelpLoading && overview == null) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = OliveGreen, modifier = Modifier.size(26.dp))
                }
            } else {
                if (connections.isNotEmpty()) {
                    connections.forEach { connection ->
                        HelpConnectionCard(
                            connection = connection,
                            currentUserId = currentUserId,
                            isActionLoading = state.actionInProgressId == connection.id,
                            reviewRating = state.reviewRating,
                            reviewText = state.reviewText,
                            isSubmittingReview = state.isSubmittingReview,
                            reviewError = state.reviewError,
                            reviewSuccess = state.reviewSuccess,
                            onReviewRatingChange = onReviewRatingChange,
                            onReviewTextChange = onReviewTextChange,
                            onSubmitReview = { onSubmitReview(connection.volunteer.id) },
                            onAction = { action -> onAction(connection.id, action) },
                            onParticipantClick = onParticipantClick,
                            onCallClick = { phone ->
                                val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
                                context.startActivity(dialIntent)
                            }
                        )
                    }
                } else if (isCurrentAuthor) {
                    Text(
                        text = "Поки що немає відгуків на це оголошення.",
                        fontFamily = Montserrat,
                        fontSize = 13.sp,
                        color = DeepSage
                    )
                }

                if (overview?.canRespond == true) {
                    Button(
                        onClick = onRespondToRequest,
                        enabled = !state.isSubmittingHelp,
                        colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        if (state.isSubmittingHelp) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(20.dp)
                            )
                        } else {
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

                if (overview?.canReceiveOffer == true) {
                    val userRequests = overview.requests
                    if (userRequests.isNotEmpty()) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                text = "Прикріпити ваш активний запит (необов'язково):",
                                fontFamily = Montserrat,
                                fontSize = 12.sp,
                                color = DeepSage
                            )
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                FilterChip(
                                    selected = state.selectedUserRequestId == null,
                                    onClick = { onSelectRequest(null) },
                                    label = { Text("Без прив'язки", fontFamily = Montserrat, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = DeepSage,
                                        selectedLabelColor = Color.White
                                    )
                                )
                                userRequests.forEach { req ->
                                    FilterChip(
                                        selected = state.selectedUserRequestId == req.id,
                                        onClick = { onSelectRequest(req.id) },
                                        label = { Text(req.title, fontFamily = Montserrat, fontSize = 12.sp) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = DeepSage,
                                            selectedLabelColor = Color.White
                                        )
                                    )
                                }
                            }
                        }
                    }

                    Button(
                        onClick = onReceiveOffer,
                        enabled = !state.isSubmittingHelp,
                        colors = ButtonDefaults.buttonColors(containerColor = DeepSage),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        if (state.isSubmittingHelp) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(20.dp)
                            )
                        } else {
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
                    }
                }

                if (!isCurrentAuthor && overview != null && !overview.canRespond && !overview.canReceiveOffer && connections.isEmpty()) {
                    Text(
                        text = if (isOffer)
                            "Звернення за пропозиціями волонтерів доступне для користувачів із роллю «Потребую допомоги»."
                        else
                            "Відгукнутися на запит про допомогу можуть користувачі з роллю «Волонтер».",
                        fontFamily = Montserrat,
                        fontSize = 13.sp,
                        color = DeepSage
                    )
                }
            }
        }
    }
}

@Composable
private fun HelpConnectionCard(
    connection: HelpConnectionDto,
    currentUserId: Int?,
    isActionLoading: Boolean,
    reviewRating: Int,
    reviewText: String,
    isSubmittingReview: Boolean,
    reviewError: String?,
    reviewSuccess: String?,
    onReviewRatingChange: (Int) -> Unit,
    onReviewTextChange: (String) -> Unit,
    onSubmitReview: () -> Unit,
    onAction: (String) -> Unit,
    onParticipantClick: (Int) -> Unit,
    onCallClick: (String) -> Unit
) {
    val normalizedStatus = connection.status.lowercase(Locale.US)
    val statusLabel = when (normalizedStatus) {
        "pending" -> "Очікує підтвердження"
        "accepted", "in_progress", "inprogress" -> "Прийнято в роботу"
        "completed" -> "Допомогу завершено"
        "declined", "rejected" -> "Відхилено"
        "withdrawn" -> "Відкликано"
        "cancelled", "canceled" -> "Скасовано"
        else -> connection.status
    }

    val statusColor = when (normalizedStatus) {
        "pending" -> RadarOrange
        "accepted", "in_progress", "inprogress", "completed" -> OliveGreen
        else -> DeepSage
    }

    val otherPerson = if (currentUserId != null && connection.requester.id == currentUserId) {
        connection.volunteer
    } else {
        connection.requester
    }
    val otherRoleLabel = if (otherPerson.id == connection.volunteer.id) "Волонтер" else "Отримувач"

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, BorderSand),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = otherPerson.name.ifBlank { "Користувач #${otherPerson.id}" },
                        fontFamily = Montserrat,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = OliveGreen,
                        modifier = Modifier.clickable { onParticipantClick(otherPerson.id) }
                    )
                    Text(
                        text = otherRoleLabel,
                        fontFamily = Montserrat,
                        fontSize = 11.sp,
                        color = DeepSage
                    )
                }

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = statusColor.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = statusLabel,
                        fontFamily = Montserrat,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = statusColor,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            if (connection.request != null && connection.request.title.isNotBlank()) {
                Text(
                    text = "Запит: ${connection.request.title}",
                    fontFamily = Montserrat,
                    fontSize = 12.sp,
                    color = CharcoalDark.copy(alpha = 0.85f)
                )
            }

            if (!connection.contactPhone.isNullOrBlank()) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = OliveGreen.copy(alpha = 0.1f),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onCallClick(connection.contactPhone) }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Phone,
                            contentDescription = null,
                            tint = OliveGreen,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Телефон для зв'язку: ${connection.contactPhone}",
                            fontFamily = Montserrat,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = CharcoalDark
                        )
                    }
                }
            }

            if (connection.canReview && !connection.hasReview && reviewSuccess == null) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SelectedRoleBg.copy(alpha = 0.7f), RoundedCornerShape(10.dp))
                        .border(1.dp, OliveGreen.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Оцініть роботу волонтера",
                        fontFamily = KharkivTone,
                        fontSize = 15.sp,
                        color = CharcoalDark
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        (1..5).forEach { star ->
                            IconButton(
                                onClick = { onReviewRatingChange(star) },
                                modifier = Modifier.size(34.dp)
                            ) {
                                Icon(
                                    imageVector = if (star <= reviewRating) Icons.Filled.Star else Icons.Outlined.StarBorder,
                                    contentDescription = "Оцінка $star",
                                    tint = RadarOrange,
                                    modifier = Modifier.size(26.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "$reviewRating / 5",
                            fontFamily = Montserrat,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = CharcoalDark
                        )
                    }

                    OutlinedTextField(
                        value = reviewText,
                        onValueChange = onReviewTextChange,
                        placeholder = {
                            Text(
                                text = "Поділіться враженням про допомогу волонтера...",
                                fontFamily = Montserrat,
                                fontSize = 13.sp,
                                color = PlaceholderSage
                            )
                        },
                        minLines = 2,
                        maxLines = 4,
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                            focusedBorderColor = OliveGreen,
                            unfocusedBorderColor = BorderSand
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (reviewError != null) {
                        Text(
                            text = reviewError,
                            fontFamily = Montserrat,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.error
                        )
                    }

                    Button(
                        onClick = onSubmitReview,
                        enabled = !isSubmittingReview,
                        colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                    ) {
                        if (isSubmittingReview) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(18.dp)
                            )
                        } else {
                            Text(
                                text = "Опублікувати відгук",
                                fontFamily = Montserrat,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = Color.White
                            )
                        }
                    }
                }
            } else if (connection.hasReview || reviewSuccess != null) {
                Text(
                    text = reviewSuccess ?: "Ви вже залишили відгук за цією допомогою",
                    fontFamily = Montserrat,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = OliveGreen
                )
            }

            if (isActionLoading) {
                CircularProgressIndicator(
                    color = OliveGreen,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(22.dp)
                )
            } else if (connection.actions.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    connection.actions.forEach { action ->
                        val (label, isPrimary, isDestructive) = when (action) {
                            "accept" -> Triple("Прийняти", true, false)
                            "complete" -> Triple("Підтвердити", true, false)
                            "decline" -> Triple("Відхилити", false, true)
                            "withdraw" -> Triple("Відкликати", false, true)
                            "cancel" -> Triple("Скасувати", false, true)
                            else -> Triple(action, false, false)
                        }

                        if (isPrimary) {
                            Button(
                                onClick = { onAction(action) },
                                colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp)
                            ) {
                                Text(
                                    text = label,
                                    fontFamily = Montserrat,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Color.White,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        } else {
                            OutlinedButton(
                                onClick = { onAction(action) },
                                border = BorderStroke(
                                    1.dp,
                                    if (isDestructive) MaterialTheme.colorScheme.error else BorderSand
                                ),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp)
                            ) {
                                Text(
                                    text = label,
                                    fontFamily = Montserrat,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                    color = if (isDestructive) MaterialTheme.colorScheme.error else CharcoalDark,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}