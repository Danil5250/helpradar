package ua.helpradar.app.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import ua.helpradar.app.data.network.dto.PublicProfileResponse
import ua.helpradar.app.data.network.dto.UserCommentDto
import ua.helpradar.app.presentation.feed.formatIsoDate
import ua.helpradar.app.ui.theme.*
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun PublicProfileScreen(
    userId: Int,
    onBackClick: () -> Unit,
    viewModel: PublicProfileViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(userId) {
        viewModel.load(userId, forceReload = true)
    }

    Scaffold(
        containerColor = DesertSand,
        topBar = {
            Surface(color = DesertSand) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 8.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = onBackClick) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Назад",
                                tint = CharcoalDark
                            )
                        }
                        Text(
                            text = "Профіль користувача",
                            fontFamily = KharkivTone,
                            fontSize = 20.sp,
                            color = CharcoalDark
                        )
                    }
                    HorizontalDivider(color = BorderSand.copy(alpha = 0.6f), thickness = 1.dp)
                }
            }
        }
    ) { paddingValues ->
        when {
            state.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = OliveGreen)
                }
            }
            state.errorMessage != null && state.profile == null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = state.errorMessage ?: "Не вдалося завантажити профіль",
                        fontFamily = Montserrat,
                        color = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = { viewModel.load(userId, forceReload = true) },
                        colors = ButtonDefaults.buttonColors(containerColor = OliveGreen)
                    ) {
                        Text("Спробувати ще", color = Color.White, fontFamily = Montserrat)
                    }
                }
            }
            state.profile != null -> {
                val profile = state.profile!!
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    item(key = "profile_header") {
                        PublicProfileHeaderCard(profile = profile)
                    }

                    item(key = "reviews_title") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Відгуки (${profile.reviewsCount ?: state.comments.size})",
                                fontFamily = KharkivTone,
                                fontSize = 18.sp,
                                color = CharcoalDark
                            )
                        }
                    }

                    if (state.isLoadingComments) {
                        item(key = "comments_loading") {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 16.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(color = OliveGreen, modifier = Modifier.size(28.dp))
                            }
                        }
                    } else if (state.comments.isEmpty()) {
                        item(key = "comments_empty") {
                            Card(
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.75f)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, BorderSand, RoundedCornerShape(14.dp))
                            ) {
                                Text(
                                    text = "Поки що немає відгуків про цього користувача.",
                                    fontFamily = Montserrat,
                                    fontSize = 14.sp,
                                    color = DeepSage,
                                    modifier = Modifier.padding(16.dp)
                                )
                            }
                        }
                    } else {
                        items(state.comments, key = { it.id }) { comment ->
                            ReviewItemCard(comment = comment)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PublicProfileHeaderCard(profile: PublicProfileResponse) {
    val fullName = profile.name?.takeIf { it.isNotBlank() }
        ?: listOfNotNull(profile.firstName, profile.lastName)
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .ifBlank { "Користувач #${profile.id}" }

    val fallbackLetter = fullName.firstOrNull()?.uppercaseChar()?.toString() ?: "U"
    val fullAvatarUrl = remember(profile.avatarUrl) {
        val raw = profile.avatarUrl?.trim()
        if (!raw.isNullOrBlank() && !raw.contains("default")) {
            if (raw.startsWith("http")) raw else "http://10.0.2.2:3000$raw"
        } else null
    }
    var avatarLoaded by remember(fullAvatarUrl) { mutableStateOf(false) }

    val isVolunteer = profile.role?.equals("Volunteer", ignoreCase = true) == true
    val locationText = listOfNotNull(profile.city, profile.district)
        .filter { it.isNotBlank() }
        .joinToString(", ")

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.88f)),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderSand, RoundedCornerShape(16.dp))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(TacticalOlive.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center
                ) {
                    if (!avatarLoaded) {
                        Text(
                            text = fallbackLetter,
                            fontFamily = Montserrat,
                            fontWeight = FontWeight.Bold,
                            fontSize = 24.sp,
                            color = CharcoalDark
                        )
                    }
                    if (fullAvatarUrl != null) {
                        AsyncImage(
                            model = fullAvatarUrl,
                            contentDescription = "Аватар",
                            contentScale = ContentScale.Crop,
                            onSuccess = { avatarLoaded = true },
                            onError = { avatarLoaded = false },
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }

                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = fullName,
                        fontFamily = KharkivTone,
                        fontSize = 19.sp,
                        color = CharcoalDark,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (isVolunteer) OliveGreen else DeepSage.copy(alpha = 0.2f)
                    ) {
                        Text(
                            text = if (isVolunteer) "Волонтер" else "Потребую допомоги",
                            fontFamily = Montserrat,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isVolunteer) Color.White else CharcoalDark,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            tint = RadarOrange,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = String.format(Locale.US, "%.1f", profile.rating ?: 0.0),
                            fontFamily = Montserrat,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = CharcoalDark
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "(${profile.reviewsCount ?: 0} відгуків)",
                            fontFamily = Montserrat,
                            fontSize = 12.sp,
                            color = DeepSage
                        )
                    }
                }
            }

            if (locationText.isNotEmpty() || !profile.workingDays.isNullOrEmpty() || !profile.workingHours.isNullOrBlank()) {
                HorizontalDivider(color = BorderSand.copy(alpha = 0.6f))
            }

            if (locationText.isNotEmpty()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = OliveGreen,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = locationText,
                        fontFamily = Montserrat,
                        fontSize = 13.sp,
                        color = CharcoalDark
                    )
                }
            }

            if (!profile.workingDays.isNullOrEmpty()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = DeepSage,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Дні допомоги: ${profile.workingDays.joinToString(", ")}",
                        fontFamily = Montserrat,
                        fontSize = 13.sp,
                        color = CharcoalDark
                    )
                }
            }

            if (!profile.workingHours.isNullOrBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.AccessTime,
                        contentDescription = null,
                        tint = RadarOrange,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Години: ${profile.workingHours}",
                        fontFamily = Montserrat,
                        fontSize = 13.sp,
                        color = CharcoalDark
                    )
                }
            }

            if (!profile.supportTypes.isNullOrEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Напрями допомоги:",
                        fontFamily = Montserrat,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        color = DeepSage
                    )
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        profile.supportTypes.forEach { type ->
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = SelectedRoleBg
                            ) {
                                Text(
                                    text = type,
                                    fontFamily = Montserrat,
                                    fontSize = 12.sp,
                                    color = CharcoalDark,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReviewItemCard(comment: UserCommentDto) {
    val authorName = comment.author?.name?.takeIf { it.isNotBlank() }
        ?: listOfNotNull(comment.author?.firstName, comment.author?.lastName)
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .ifBlank { "Користувач" }

    val formattedDate = remember(comment.dateCreated) {
        formatIsoDate(comment.dateCreated) ?: ""
    }

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.85f)),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderSand, RoundedCornerShape(14.dp))
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = authorName,
                        fontFamily = Montserrat,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = CharcoalDark
                    )
                    if (formattedDate.isNotEmpty()) {
                        Text(
                            text = formattedDate,
                            fontFamily = Montserrat,
                            fontSize = 11.sp,
                            color = DeepSage
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    (1..5).forEach { star ->
                        Icon(
                            imageVector = if (star <= comment.rating) Icons.Filled.Star else Icons.Outlined.StarBorder,
                            contentDescription = null,
                            tint = RadarOrange,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            if (!comment.description.isNullOrBlank()) {
                Text(
                    text = comment.description,
                    fontFamily = Montserrat,
                    fontSize = 14.sp,
                    color = CharcoalDark.copy(alpha = 0.9f)
                )
            }
        }
    }
}