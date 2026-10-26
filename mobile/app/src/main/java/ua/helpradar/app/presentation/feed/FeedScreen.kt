package ua.helpradar.app.presentation.feed

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import ua.helpradar.app.R
import ua.helpradar.app.presentation.request.defaultCategories
import ua.helpradar.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    onCreateRequestClick: () -> Unit,
    onSignOutClick: () -> Unit = {},
    viewModel: FeedViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()
    var selectedDrawerItem by remember { mutableStateOf("Announcements") }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = DesertSand,
                modifier = Modifier.width(300.dp)
            ) {
                // Шапка бургер-меню
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

                    // Круглий аватар користувача
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(TacticalOlive.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Д",
                            fontWeight = FontWeight.Bold,
                            color = CharcoalDark,
                            fontSize = 15.sp
                        )
                    }
                }

                HorizontalDivider(color = BorderSand.copy(alpha = 0.5f), thickness = 1.dp)

                Spacer(modifier = Modifier.height(16.dp))

                // Пункти навігації
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
                        }
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Кнопка виходу з акаунта
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
                // Кастомний верхній бар за новим дизайном
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

                            // Аватар користувача
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(TacticalOlive.copy(alpha = 0.5f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Д",
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
                // Поле пошуку з напівпрозорим фоном
                OutlinedTextField(
                    value = state.searchQuery,
                    onValueChange = viewModel::onSearchQueryChange,
                    placeholder = {
                        Text("Пошук потреб або допомоги...", color = PlaceholderSage, fontSize = 14.sp)
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

                // Фільтр: Усі / Потреби / Пропозиції
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = state.selectedType == null,
                        onClick = { viewModel.onTypeSelect(null) },
                        label = { Text("Усі") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = OliveGreen,
                            selectedLabelColor = Color.White,
                            containerColor = Color.White.copy(alpha = 0.6f)
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = state.selectedType == null,
                            borderColor = BorderSand,
                            selectedBorderColor = OliveGreen
                        )
                    )
                    FilterChip(
                        selected = state.selectedType == AnnouncementType.REQUEST,
                        onClick = { viewModel.onTypeSelect(AnnouncementType.REQUEST) },
                        label = { Text("Потреби") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = OliveGreen,
                            selectedLabelColor = Color.White,
                            containerColor = Color.White.copy(alpha = 0.6f)
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = state.selectedType == AnnouncementType.REQUEST,
                            borderColor = BorderSand,
                            selectedBorderColor = OliveGreen
                        )
                    )
                    FilterChip(
                        selected = state.selectedType == AnnouncementType.OFFER,
                        onClick = { viewModel.onTypeSelect(AnnouncementType.OFFER) },
                        label = { Text("Пропозиції") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = OliveGreen,
                            selectedLabelColor = Color.White,
                            containerColor = Color.White.copy(alpha = 0.6f)
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = state.selectedType == AnnouncementType.OFFER,
                            borderColor = BorderSand,
                            selectedBorderColor = OliveGreen
                        )
                    )
                }

                // Горизонтальні категорії
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    defaultCategories.forEach { category ->
                        val isSelected = state.selectedCategory == category.name
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.onCategorySelect(category.name) },
                            label = { Text(category.name, fontSize = 13.sp) },
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

                // Список карток оголошень
                if (state.announcements.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Оголошень не знайдено",
                            color = DeepSage,
                            fontSize = 15.sp
                        )
                    }
                } else {
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
    Card(
        shape = RoundedCornerShape(14.dp),
        // Напівпрозорий білий фон за дизайном Figma
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.8f)),
        modifier = Modifier
            .fillMaxWidth()
            .border(width = 1.dp, color = BorderSand, shape = RoundedCornerShape(14.dp))
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Верхній рядок: категорія та терміновість
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = DeepSage.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = item.categoryName,
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
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
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
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold,
                color = CharcoalDark,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            // Опис
            Text(
                text = item.description,
                fontSize = 14.sp,
                color = CharcoalDark.copy(alpha = 0.8f),
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )

            HorizontalDivider(color = BorderSand.copy(alpha = 0.6f), thickness = 1.dp)

            // Інфопанель (дистанція, автор, рейтинг)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = OliveGreen,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${item.distanceKm} км • ${item.postedTimeAgo}",
                        fontSize = 12.sp,
                        color = CharcoalDark
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = item.authorName,
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
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = CharcoalDark
                    )
                }
            }

            // Кнопка однакового темно-зеленого кольору OliveGreen
            Button(
                onClick = { /* Дія перегляду деталей оголошення */ },
                colors = ButtonDefaults.buttonColors(containerColor = OliveGreen),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
            ) {
                Text(
                    text = if (item.type == AnnouncementType.REQUEST) "Допомогти" else "Зв'язатися",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color.White
                )
            }
        }
    }
}