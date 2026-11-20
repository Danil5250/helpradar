package ua.helpradar.app.presentation.profile

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.SubcomposeAsyncImage
import coil.request.ImageRequest
import ua.helpradar.app.presentation.feed.AnnouncementItem
import ua.helpradar.app.presentation.feed.AnnouncementType
import ua.helpradar.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onNavigateBack: () -> Unit,
    onAnnouncementClick: (Int) -> Unit = {},
    viewModel: ProfileViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val profile = state.profile
    val context = LocalContext.current

    val avatarPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            viewModel.uploadAvatar(context, uri)
        }
    }

    val initialLetter = remember(profile?.firstName, profile?.lastName, profile?.email) {
        val first = profile?.firstName?.trim()?.firstOrNull()?.uppercaseChar()
        val last = profile?.lastName?.trim()?.firstOrNull()?.uppercaseChar()
        when {
            first != null && last != null -> "$first$last"
            first != null -> first.toString()
            else -> profile?.email?.firstOrNull()?.uppercaseChar()?.toString() ?: "U"
        }
    }

    val fullAvatarUrl = remember(profile?.avatarUrl) {
        val raw = profile?.avatarUrl?.trim()
        if (!raw.isNullOrBlank() && !raw.contains("default")) {
            if (raw.startsWith("http")) raw else "http://10.0.2.2:3000$raw"
        } else null
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
                            text = "Особистий кабінет",
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
        if (state.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = OliveGreen)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Аватар профілю з можливістю зміни фото у режимі редагування
                Box(
                    contentAlignment = Alignment.BottomEnd,
                    modifier = Modifier.size(96.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(92.dp)
                            .align(Alignment.Center)
                            .clip(CircleShape)
                            .background(TacticalOlive)
                            .clickable(enabled = state.isEditing && !state.isUploadingAvatar) {
                                avatarPickerLauncher.launch("image/*")
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        if (fullAvatarUrl != null) {
                            SubcomposeAsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(fullAvatarUrl)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = "Аватар користувача",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                                error = {
                                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                        Text(
                                            text = initialLetter,
                                            fontFamily = Montserrat,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            fontSize = 32.sp,
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                },
                                loading = {
                                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                        CircularProgressIndicator(
                                            color = Color.White,
                                            strokeWidth = 2.dp,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                }
                            )
                        } else {
                            Text(
                                text = initialLetter,
                                fontFamily = Montserrat,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 32.sp,
                                textAlign = TextAlign.Center
                            )
                        }

                        if (state.isUploadingAvatar) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Black.copy(alpha = 0.45f)),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(
                                    color = Color.White,
                                    strokeWidth = 2.5.dp,
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                        }
                    }

                    if (state.isEditing) {
                        Surface(
                            shape = CircleShape,
                            color = RadarOrange,
                            shadowElevation = 3.dp,
                            modifier = Modifier
                                .size(30.dp)
                                .border(2.dp, DesertSand, CircleShape)
                                .clickable(enabled = !state.isUploadingAvatar) {
                                    avatarPickerLauncher.launch("image/*")
                                }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.CameraAlt,
                                    contentDescription = "Змінити аватар",
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }

                if (state.isEditing) {
                    TextButton(
                        onClick = { avatarPickerLauncher.launch("image/*") },
                        enabled = !state.isUploadingAvatar,
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = null,
                            tint = OliveGreen,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (state.isUploadingAvatar) "Завантаження фото..." else "Змінити фото профілю",
                            fontFamily = Montserrat,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            color = OliveGreen
                        )
                    }
                }

                Text(
                    text = "${profile?.firstName.orEmpty()} ${profile?.lastName.orEmpty()}".trim().ifEmpty { "Користувач" },
                    fontFamily = Montserrat,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = CharcoalDark
                )

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (profile?.role.equals("Volunteer", ignoreCase = true)) OliveGreen else RadarOrange.copy(alpha = 0.2f)
                ) {
                    Text(
                        text = if (profile?.role.equals("Volunteer", ignoreCase = true)) "Волонтер" else "Потребую допомоги",
                        fontFamily = Montserrat,
                        fontWeight = FontWeight.SemiBold,
                        color = if (profile?.role.equals("Volunteer", ignoreCase = true)) Color.White else RadarOrange,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }

                if (state.successMessage != null) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = OliveGreen.copy(alpha = 0.15f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = state.successMessage!!,
                            color = OliveGreen,
                            fontFamily = Montserrat,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }

                if (state.errorMessage != null) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.error.copy(alpha = 0.15f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = state.errorMessage!!,
                            color = MaterialTheme.colorScheme.error,
                            fontFamily = Montserrat,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }

                if (!state.isEditing) {
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.85f)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, BorderSand, RoundedCornerShape(14.dp))
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            InfoRow(icon = Icons.Default.Email, label = "Email", value = profile?.email ?: "—")
                            InfoRow(icon = Icons.Default.Phone, label = "Телефон", value = profile?.phoneNumber?.ifEmpty { "Не вказано" } ?: "Не вказано")
                            InfoRow(icon = Icons.Default.LocationOn, label = "Місто", value = profile?.city?.ifEmpty { "Не вказано" } ?: "Не вказано")
                            if (profile?.rating != null) {
                                InfoRow(icon = Icons.Default.Star, label = "Рейтинг", value = "${profile.rating} (${profile.reviewsCount} відгуків)")
                            }
                            if (!profile?.aboutMe.isNullOrBlank()) {
                                HorizontalDivider(color = BorderSand.copy(alpha = 0.5f))
                                Text(
                                    text = "Про мене:",
                                    fontFamily = Montserrat,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                    color = DeepSage
                                )
                                Text(
                                    text = profile.aboutMe,
                                    fontFamily = Montserrat,
                                    fontSize = 14.sp,
                                    color = CharcoalDark
                                )
                            }
                        }
                    }

                    Button(
                        onClick = { viewModel.startEditing() },
                        colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Edit, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Редагувати профіль", fontFamily = Montserrat, fontWeight = FontWeight.Bold, color = Color.White)
                    }

                    // Блок "Мої оголошення" згідно з макетом Figma
                    MyAnnouncementsProfileCard(
                        announcements = state.myAnnouncements,
                        isLoading = state.isLoadingAnnouncements,
                        onAnnouncementClick = onAnnouncementClick
                    )
                } else {
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.9f)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, BorderSand, RoundedCornerShape(14.dp))
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = state.editFirstName,
                                onValueChange = viewModel::onFirstNameChange,
                                label = { Text("Ім'я") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = state.editLastName,
                                onValueChange = viewModel::onLastNameChange,
                                label = { Text("Прізвище") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = state.editPhone,
                                onValueChange = viewModel::onPhoneChange,
                                label = { Text("Номер телефону") },
                                placeholder = { Text("+380...") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = state.editCity,
                                onValueChange = viewModel::onCityChange,
                                label = { Text("Населений пункт") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = state.editAboutMe,
                                onValueChange = viewModel::onAboutMeChange,
                                label = { Text("Про себе") },
                                minLines = 3,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = { viewModel.cancelEditing() },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                        ) {
                            Text("Скасувати", fontFamily = Montserrat, color = CharcoalDark)
                        }
                        Button(
                            onClick = { viewModel.saveProfile() },
                            enabled = !state.isSaving,
                            colors = ButtonDefaults.buttonColors(containerColor = RadarOrange),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                        ) {
                            if (state.isSaving) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                            } else {
                                Text("Зберегти", fontFamily = Montserrat, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }

                    // Блок "Мої оголошення" також доступний під формою редагування профілю
                    MyAnnouncementsProfileCard(
                        announcements = state.myAnnouncements,
                        isLoading = state.isLoadingAnnouncements,
                        onAnnouncementClick = onAnnouncementClick
                    )
                }
            }
        }
    }
}

@Composable
private fun MyAnnouncementsProfileCard(
    announcements: List<AnnouncementItem>,
    isLoading: Boolean,
    onAnnouncementClick: (Int) -> Unit
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.85f)),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderSand, RoundedCornerShape(14.dp))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Мої оголошення",
                fontFamily = Montserrat,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp,
                color = CharcoalDark
            )

            when {
                isLoading -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = OliveGreen, modifier = Modifier.size(24.dp))
                    }
                }
                announcements.isEmpty() -> {
                    Text(
                        text = "У вас поки немає створених оголошень.",
                        fontFamily = Montserrat,
                        fontSize = 13.sp,
                        color = DeepSage
                    )
                }
                else -> {
                    announcements.forEach { item ->
                        ProfileAnnouncementItemRow(
                            item = item,
                            onClick = { onAnnouncementClick(item.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileAnnouncementItemRow(
    item: AnnouncementItem,
    onClick: () -> Unit
) {
    val isOffer = item.type == AnnouncementType.OFFER
    val isClosed = item.status.equals("Closed", ignoreCase = true) ||
            item.status.equals("Resolved", ignoreCase = true)

    val statusText = when {
        item.status.equals("Closed", ignoreCase = true) -> "Закрито"
        item.status.equals("Resolved", ignoreCase = true) -> "Вирішено"
        else -> "Активне"
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = DesertSand.copy(alpha = 0.65f),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderSand.copy(alpha = 0.7f), RoundedCornerShape(12.dp))
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = item.title,
                    fontFamily = Montserrat,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = CharcoalDark,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .weight(1f)
                        .padding(end = 8.dp)
                )

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = if (isOffer) OliveGreen.copy(alpha = 0.16f) else RadarOrange.copy(alpha = 0.16f)
                ) {
                    Text(
                        text = if (isOffer) "Пропозиція" else "Потреба",
                        fontFamily = Montserrat,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 11.sp,
                        color = if (isOffer) OliveGreen else RadarOrange,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = TacticalOlive.copy(alpha = 0.35f)
                    ) {
                        Text(
                            text = item.categoryName,
                            fontFamily = Montserrat,
                            fontWeight = FontWeight.Medium,
                            fontSize = 11.sp,
                            color = CharcoalDark,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (isClosed) Color.Gray.copy(alpha = 0.18f) else DeepSage.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = statusText,
                            fontFamily = Montserrat,
                            fontWeight = FontWeight.Medium,
                            fontSize = 11.sp,
                            color = if (isClosed) Color.DarkGray else DeepSage,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }

                if (!item.createdDateFormatted.isNullOrBlank()) {
                    Text(
                        text = item.createdDateFormatted,
                        fontFamily = Montserrat,
                        fontSize = 11.sp,
                        color = DeepSage
                    )
                }
            }
        }
    }
}

@Composable
private fun InfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = DeepSage, modifier = Modifier.size(18.dp))
        Column {
            Text(text = label, fontFamily = Montserrat, fontSize = 11.sp, color = DeepSage)
            Text(text = value, fontFamily = Montserrat, fontSize = 14.sp, color = CharcoalDark, fontWeight = FontWeight.Medium)
        }
    }
}