package ua.helpradar.app.presentation.feed

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import ua.helpradar.app.R
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.ui.theme.*
import ua.helpradar.app.util.ShareUtils.shareAnnouncement

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    onCreateRequestClick: () -> Unit,
    onProfileClick: () -> Unit,
    onMapClick: () -> Unit = {},
    onSignOutClick: () -> Unit = {},
    viewModel: FeedViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()
    var selectedDrawerItem by remember { mutableStateOf("Announcements") }

    // Динамічна літера для аватара замість статичної "Д"
    val avatarLetter = remember(SessionManager.currentUserName) {
        val name = SessionManager.currentUserName.trim()
        if (name.isNotEmpty()) {
            name.first().uppercaseChar().toString()
        } else {
            "U"
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = DesertSand,
                modifier = Modifier.width(300.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    IconButton(onClick = { coroutineScope.launch { drawerState.close() } }) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Закрити меню",
                            tint = CharcoalDark
                        )
                    }

                    Image(
                        painter = painterResource(id = R.drawable.helpradar_logo),
                        contentDescription = "HelpRadar Logo",
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(10.dp))
                    )

                    // Аватар у бічній шторці (при кліку переходить до профілю)
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(TacticalOlive.copy(alpha = 0.5f))
                            .clickable {
                                coroutineScope.launch { drawerState.close() }
                                onProfileClick()
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = avatarLetter,
                            fontFamily = Montserrat,
                            fontWeight = FontWeight.Bold,
                            color = CharcoalDark,
                            fontSize = 15.sp
                        )
                    }
                }

                HorizontalDivider(color = BorderSand.copy(alpha = 0.5f), thickness = 1.dp)

                Spacer(modifier = Modifier.height(16.dp))

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    DrawerItem(
                        icon = Icons.Default.LocationOn,
                        title = "Мапа",
                        isSelected = selectedDrawerItem == "Map",
                        onClick = {
                            selectedDrawerItem = "Map"
                            coroutineScope.launch { drawerState.close() }
                            onMapClick()
                        }
                    )

                    DrawerItem(
                        icon = Icons.Default.Search,
                        title = "Оголошення",
                        isSelected = selectedDrawerItem == "Announcements",
                        onClick = {
                            selectedDrawerItem = "Announcements"
                            coroutineScope.launch { drawerState.close() }
                        }
                    )

                    DrawerItem(
                        icon = Icons.AutoMirrored.Filled.Chat,
                        title = "Чат",
                        isSelected = selectedDrawerItem == "Chat",
                        onClick = {
                            selectedDrawerItem = "Chat"
                            coroutineScope.launch { drawerState.close() }
                        }
                    )

                    DrawerItem(
                        icon = Icons.Default.Person,
                        title = "Профіль",
                        isSelected = selectedDrawerItem == "Profile",
                        onClick = {
                            selectedDrawerItem = "Profile"
                            coroutineScope.launch { drawerState.close() }
                            onProfileClick()
                        }
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    NavigationDrawerItem(
                        icon = {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error
                            )
                        },
                        label = {
                            Text(
                                text = "Вийти з акаунта",
                                fontFamily = Montserrat,
                                color = MaterialTheme.colorScheme.error,
                                fontWeight = FontWeight.SemiBold
                            )
                        },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            onSignOutClick()
                        },
                        colors = NavigationDrawerItemDefaults.colors(unselectedContainerColor = Color.Transparent)
                    )
                }
            }
        }
    ) {
        Scaffold(
            containerColor = DesertSand,
            topBar = {
                Surface(
                    color = DesertSand,
                    shadowElevation = 0.dp
                ) {
                    Column {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .statusBarsPadding()
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                IconButton(onClick = { coroutineScope.launch { drawerState.open() } }) {
                                    Icon(
                                        imageVector = Icons.Default.Menu,
                                        contentDescription = "Меню",
                                        tint = CharcoalDark
                                    )
                                }

                                Image(
                                    painter = painterResource(id = R.drawable.helpradar_logo),
                                    contentDescription = "HelpRadar Logo",
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                )
                            }

                            // Аватар у правому верхньому кутку
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(TacticalOlive.copy(alpha = 0.5f))
                                    .clickable { onProfileClick() },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = avatarLetter,
                                    fontFamily = Montserrat,
                                    fontWeight = FontWeight.Bold,
                                    color = CharcoalDark,
                                    fontSize = 15.sp
                                )
                            }
                        }

                        HorizontalDivider(color = BorderSand.copy(alpha = 0.6f), thickness = 1.dp)
                    }
                }
            },
            floatingActionButton = {
                FloatingActionButton(
                    onClick = onCreateRequestClick,
                    containerColor = RadarOrange,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = "Створити запит")
                }
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Пошук
                OutlinedTextField(
                    value = state.searchQuery,
                    onValueChange = viewModel::onSearchQueryChange,
                    placeholder = {
                        Text(
                            text = "Пошук потреб або допомоги...",
                            fontFamily = Montserrat,
                            color = PlaceholderSage,
                            fontSize = 14.sp
                        )
                    },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = DeepSage) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White.copy(alpha = 0.8f),
                        unfocusedContainerColor = Color.White.copy(alpha = 0.8f),
                        focusedBorderColor = OliveGreen,
                        unfocusedBorderColor = BorderSand
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                )

                // Фільтри типу + фільтр "Мої оголошення"
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = state.selectedType == null && !state.onlyMyAnnouncements,
                        onClick = {
                            viewModel.onToggleOnlyMy(false)
                            viewModel.onTypeSelect(null)
                        },
                        label = { Text("Усі", fontFamily = Montserrat) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = OliveGreen,
                            selectedLabelColor = Color.White,
                            containerColor = Color.White.copy(alpha = 0.6f)
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = state.selectedType == null && !state.onlyMyAnnouncements,
                            borderColor = BorderSand,
                            selectedBorderColor = OliveGreen
                        )
                    )

                    FilterChip(
                        selected = state.selectedType == AnnouncementType.REQUEST && !state.onlyMyAnnouncements,
                        onClick = {
                            viewModel.onToggleOnlyMy(false)
                            viewModel.onTypeSelect(AnnouncementType.REQUEST)
                        },
                        label = { Text("Потреби", fontFamily = Montserrat) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = OliveGreen,
                            selectedLabelColor = Color.White,
                            containerColor = Color.White.copy(alpha = 0.6f)
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = state.selectedType == AnnouncementType.REQUEST && !state.onlyMyAnnouncements,
                            borderColor = BorderSand,
                            selectedBorderColor = OliveGreen
                        )
                    )

                    FilterChip(
                        selected = state.selectedType == AnnouncementType.OFFER && !state.onlyMyAnnouncements,
                        onClick = {
                            viewModel.onToggleOnlyMy(false)
                            viewModel.onTypeSelect(AnnouncementType.OFFER)
                        },
                        label = { Text("Пропозиції", fontFamily = Montserrat) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = OliveGreen,
                            selectedLabelColor = Color.White,
                            containerColor = Color.White.copy(alpha = 0.6f)
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = state.selectedType == AnnouncementType.OFFER && !state.onlyMyAnnouncements,
                            borderColor = BorderSand,
                            selectedBorderColor = OliveGreen
                        )
                    )

                    FilterChip(
                        selected = state.onlyMyAnnouncements,
                        onClick = { viewModel.onToggleOnlyMy(!state.onlyMyAnnouncements) },
                        label = { Text("Мої оголошення", fontFamily = Montserrat, fontWeight = FontWeight.SemiBold) },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = if (state.onlyMyAnnouncements) Color.White else DeepSage
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = RadarOrange,
                            selectedLabelColor = Color.White,
                            containerColor = Color.White.copy(alpha = 0.7f)
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = state.onlyMyAnnouncements,
                            borderColor = BorderSand,
                            selectedBorderColor = RadarOrange
                        )
                    )
                }

                // Динамічні категорії з бекенду
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    state.categories.forEach { category ->
                        val isSelected = state.selectedCategory == category.name
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.onCategorySelect(category.name) },
                            label = { Text(category.name, fontFamily = Montserrat, fontSize = 13.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = OliveGreen,
                                selectedLabelColor = Color.White,
                                containerColor = Color.White.copy(alpha = 0.6f)
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = isSelected,
                                borderColor = BorderSand,
                                selectedBorderColor = OliveGreen
                            )
                        )
                    }
                }

                // Відображення контенту
                when {
                    state.isLoading -> {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = OliveGreen)
                        }
                    }
                    state.errorMessage != null -> {
                        FeedErrorView(
                            errorMessage = state.errorMessage ?: "Не вдалося завантажити оголошення",
                            onRetry = { viewModel.loadFeed() }
                        )
                    }
                    state.announcements.isEmpty() -> {
                        FeedEmptyView(
                            message = if (state.onlyMyAnnouncements) "У вас немає власних оголошень" else "Оголошень не знайдено",
                            subMessage = if (state.onlyMyAnnouncements)
                                "Ви ще не публікували оголошень. Натисніть кнопку «+» нижче, щоб створити перше."
                            else
                                "За вибраними критеріями немає оголошень. Спробуйте змінити фільтри або створіть власне"
                        )
                    }
                    else -> {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            items(state.announcements, key = { it.id }) { item ->
                                AnnouncementCard(item = item)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DrawerItem(
    icon: ImageVector,
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    NavigationDrawerItem(
        icon = {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isSelected) Color.White else CharcoalDark
            )
        },
        label = {
            Text(
                text = title,
                fontFamily = Montserrat,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) Color.White else CharcoalDark
            )
        },
        selected = isSelected,
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        colors = NavigationDrawerItemDefaults.colors(
            selectedContainerColor = OliveGreen,
            unselectedContainerColor = Color.Transparent
        ),
        modifier = Modifier.height(48.dp)
    )
}

@Composable
fun AnnouncementCard(item: AnnouncementItem) {
    val isOffer = item.type == AnnouncementType.OFFER
    val context = LocalContext.current

    val cardBgColor = if (isOffer) SelectedRoleBg.copy(alpha = 0.9f) else Color.White.copy(alpha = 0.85f)
    val cardBorderColor = if (isOffer) OliveGreen.copy(alpha = 0.4f) else BorderSand

    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = cardBgColor),
        modifier = Modifier
            .fillMaxWidth()
            .border(width = 1.dp, color = cardBorderColor, shape = RoundedCornerShape(14.dp))
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Верхній рядок: Тип, Категорія, Терміновість
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
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = DeepSage,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }

                if (item.isUrgent && !isOffer) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = RadarOrange.copy(alpha = 0.15f)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.WarningAmber,
                                contentDescription = null,
                                tint = RadarOrange,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Терміново",
                                fontFamily = Montserrat,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = RadarOrange
                            )
                        }
                    }
                }
            }

            // Заголовок
            Text(
                text = item.title,
                fontFamily = KharkivTone,
                fontSize = 17.sp,
                fontWeight = FontWeight.Normal,
                color = CharcoalDark,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            // Опис
            Text(
                text = item.description,
                fontFamily = Montserrat,
                fontSize = 14.sp,
                color = CharcoalDark.copy(alpha = 0.8f),
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )

            // Блок дат створення та закінчення строку
            if (item.createdDateFormatted != null || item.expiryDateFormatted != null) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = BorderSand.copy(alpha = 0.35f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        item.createdDateFormatted?.let { created ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Event,
                                    contentDescription = null,
                                    tint = DeepSage,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Створено: $created",
                                    fontFamily = Montserrat,
                                    fontSize = 11.sp,
                                    color = CharcoalDark
                                )
                            }
                        }

                        item.expiryDateFormatted?.let { expiry ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.AccessTime,
                                    contentDescription = null,
                                    tint = RadarOrange,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Діє до: $expiry",
                                    fontFamily = Montserrat,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = RadarOrange
                                )
                            }
                        }
                    }
                }
            }

            HorizontalDivider(color = BorderSand.copy(alpha = 0.6f), thickness = 1.dp)

            // Нижня частина
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
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${item.distanceKm} км • ${item.postedTimeAgo}",
                        fontFamily = Montserrat,
                        fontSize = 12.sp,
                        color = CharcoalDark
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = item.authorName,
                        fontFamily = Montserrat,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = CharcoalDark
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = RadarOrange,
                        modifier = Modifier.size(15.dp)
                    )
                    Text(
                        text = item.authorRating.toString(),
                        fontFamily = Montserrat,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = CharcoalDark
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Головна кнопка
                Button(
                    onClick = { },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isOffer) DeepSage else OliveGreen
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                ) {
                    Text(
                        text = if (isOffer) "Зв'язатися з волонтером" else "Допомогти",
                        fontFamily = Montserrat,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Color.White
                    )
                }

                // Кнопка нативного поширення (SRS 3.2.24)
                OutlinedButton(
                    onClick = {
                        shareAnnouncement(context, item)
                    },
                    shape = RoundedCornerShape(10.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderSand),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = Color.White.copy(alpha = 0.8f)
                    ),
                    contentPadding = PaddingValues(0.dp),
                    modifier = Modifier.size(44.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Share,
                        contentDescription = "Поділитися",
                        tint = DeepSage,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}