package ua.helpradar.app.presentation.feed

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import ua.helpradar.app.presentation.request.defaultCategories
import ua.helpradar.app.ui.theme.CharcoalDark
import ua.helpradar.app.ui.theme.DeepSage
import ua.helpradar.app.ui.theme.DesertSand
import ua.helpradar.app.ui.theme.OliveGreen
import ua.helpradar.app.ui.theme.RadarOrange
import ua.helpradar.app.ui.theme.TacticalOlive

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    onCreateRequestClick: () -> Unit,
    viewModel: FeedViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        containerColor = DesertSand,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "HelpRadar Оголошення",
                        color = CharcoalDark,
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DesertSand)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateRequestClick,
                containerColor = RadarOrange,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
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
            // Рядок пошуку
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = viewModel::onSearchQueryChange,
                placeholder = { Text("Пошук потреб або допомоги...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = DeepSage) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
            )

            // Перемикач типу: Усі / Потребую допомоги / Пропоную
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = state.selectedType == null,
                    onClick = { viewModel.onTypeSelect(null) },
                    label = { Text("Усі") }
                )
                FilterChip(
                    selected = state.selectedType == AnnouncementType.REQUEST,
                    onClick = { viewModel.onTypeSelect(AnnouncementType.REQUEST) },
                    label = { Text("Потреби") }
                )
                FilterChip(
                    selected = state.selectedType == AnnouncementType.OFFER,
                    onClick = { viewModel.onTypeSelect(AnnouncementType.OFFER) },
                    label = { Text("Пропозиції") }
                )
            }

            // Горизонтальний скрол категорій
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
                            selectedContainerColor = TacticalOlive,
                            selectedLabelColor = Color.White
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
                        text = "Оголошень за вашим запитом не знайдено",
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

@Composable
fun AnnouncementCard(item: AnnouncementItem) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Верхній рядок: бейдж категорії + бейдж "Терміново"
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Категорія
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

                // Терміновість
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
                color = Color.DarkGray,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )

            HorizontalDivider(color = DesertSand, thickness = 1.dp)

            // Нижня інформаційна панель
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Локація та час
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

                // Автор та рейтинг
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

            // Кнопка взаємодії
            Button(
                onClick = { /* Відкриття деталей оголошення UC-07 */ },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (item.type == AnnouncementType.REQUEST) OliveGreen else TacticalOlive
                ),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth().height(42.dp)
            ) {
                Text(
                    text = if (item.type == AnnouncementType.REQUEST) "Допомогти" else "Зв'язатися",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp
                )
            }
        }
    }
}