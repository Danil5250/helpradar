package ua.helpradar.app.util

import android.content.Context
import android.content.Intent
import ua.helpradar.app.presentation.feed.AnnouncementItem
import ua.helpradar.app.presentation.feed.AnnouncementType

object ShareUtils {

    /**
     * Формує текст для поширення за вимогами SRS 3.2.24.3:
     * - Заголовок, категорія, приблизна локація/відстань
     * - Посилання на веб-сторінку оголошення
     * - Захист приватності: точна адреса і телефон НЕ включаються.
     */
    fun shareAnnouncement(context: Context, item: AnnouncementItem) {
        val typeLabel = if (item.type == AnnouncementType.OFFER) "Пропозиція допомоги" else "Потреба в допомозі"
        val urgentTag = if (item.isUrgent) "ТЕРМІНОВО!" else ""

        // Посилання на публічну веб-сторінку оголошення (SRS 3.2.24)
        val webUrl = "https://helpradar.ua/announcements/${item.id}"

        val shareText = """
            $typeLabel$urgentTag: ${item.title}
            
            Категорія: ${item.categoryName}
            Автор: ${item.authorName}
            
            $webUrl
            
            Знайдено через платформу взаємодопомоги HelpRadar
        """.trimIndent()

        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_TEXT, shareText)
            putExtra(Intent.EXTRA_SUBJECT, item.title)
            type = "text/plain"
        }

        // Запуск системного меню вибору програми
        val shareIntent = Intent.createChooser(sendIntent, "Поділитися оголошенням")
        context.startActivity(shareIntent)
    }
}