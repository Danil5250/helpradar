package ua.helpradar.app.data

import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Response
import ua.helpradar.app.data.local.SessionManager
import ua.helpradar.app.data.network.Resource
import ua.helpradar.app.data.network.api.AnnouncementApiService
import ua.helpradar.app.data.network.api.AuthApiService
import ua.helpradar.app.data.network.api.ProfileApiService
import ua.helpradar.app.data.network.dto.AnnouncementApiItem
import ua.helpradar.app.data.network.dto.AnnouncementListResponse
import ua.helpradar.app.data.network.dto.AuthResponse
import ua.helpradar.app.data.network.dto.AuthorDto
import ua.helpradar.app.data.network.dto.CategoryDto
import ua.helpradar.app.data.network.dto.ProfileResponse
import ua.helpradar.app.data.network.dto.UserDto
import ua.helpradar.app.data.repository.AnnouncementRepository
import ua.helpradar.app.data.repository.AuthRepository
import ua.helpradar.app.data.repository.ProfileRepository
import ua.helpradar.app.presentation.feed.AnnouncementType
import ua.helpradar.app.presentation.feed.formatIsoDate

class RepositoryTest {
    @Before
    fun clearSessionBeforeTest() {
        SessionManager.clear()
    }

    @After
    fun clearSessionAfterTest() {
        SessionManager.clear()
    }

    @Test
    fun authRepositoryPersistsUserDetailsOnSuccessfulLogin() = runTest {
        val api = mockk<AuthApiService>()
        val user = UserDto(
            id = 27,
            firstName = "Олена",
            lastName = "Петренко",
            email = "olena@example.com",
            role = "volunteer",
            city = "Київ",
            avatarUrl = null
        )
        coEvery { api.login(any()) } returns Response.success(
            AuthResponse(user, "session-token", null, null)
        )

        val result = AuthRepository(api).login("olena@example.com", "password")

        assertEquals(Resource.Success("session-token"), result)
        assertEquals(27, SessionManager.currentUserId)
        assertEquals("Олена Петренко", SessionManager.currentUserName)
        assertTrue(SessionManager.isVolunteer)
        assertTrue(SessionManager.isLoggedIn)
    }

    @Test
    fun authRepositoryTranslatesUnauthorizedResponse() = runTest {
        val api = mockk<AuthApiService>()
        coEvery { api.login(any()) } returns Response.error(
            401,
            """{"message":"Unauthorized"}""".toResponseBody("application/json".toMediaType())
        )

        val result = AuthRepository(api).login("user@example.com", "wrong")

        assertEquals(Resource.Error("Невірний email або пароль", 401), result)
    }

    @Test
    fun announcementRepositoryMapsApiItemsAndDateFallbacks() = runTest {
        val api = mockk<AnnouncementApiService>()
        val announcement = AnnouncementApiItem(
            id = 4,
            type = "HelpOffer",
            title = "Теплий одяг",
            description = null,
            excerpt = "Є речі для родини",
            category = CategoryDto(2, "Одяг"),
            isUrgent = true,
            datePosted = "сьогодні",
            createdAt = "2026-11-08T14:30:00Z",
            author = AuthorDto(9, "Іван")
        )
        coEvery { api.getAnnouncements(any(), any(), any(), any()) } returns Response.success(
            AnnouncementListResponse(listOf(announcement), page = 1, pageSize = 10, hasMore = false)
        )

        val result = AnnouncementRepository(api).getAnnouncements()

        assertTrue(result is Resource.Success)
        val mapped = (result as Resource.Success).data.single()
        assertEquals(4, mapped.id)
        assertEquals("Є речі для родини", mapped.description)
        assertEquals("Одяг", mapped.categoryName)
        assertEquals(AnnouncementType.OFFER, mapped.type)
        assertEquals("Іван", mapped.authorName)
        assertEquals("08.11.2026", mapped.createdDateFormatted)
        assertTrue(mapped.isUrgent)
    }

    @Test
    fun announcementRepositoryReturnsHttpErrorForFailedCategoryRequest() = runTest {
        val api = mockk<AnnouncementApiService>()
        coEvery { api.getCategories() } returns Response.error(
            503,
            """{"message":"Unavailable"}""".toResponseBody("application/json".toMediaType())
        )

        assertEquals(
            Resource.Error("Не вдалося завантажити категорії", 503),
            AnnouncementRepository(api).getCategories()
        )
    }

    @Test
    fun profileRepositoryUpdatesSessionAndReportsHttpErrors() = runTest {
        val api = mockk<ProfileApiService>()
        val profile = ProfileResponse(
            id = 31,
            firstName = "Марія",
            lastName = "Іваненко",
            email = "maria@example.com",
            role = "volunteer"
        )
        coEvery { api.getProfile() } returns Response.success(profile)
        val repository = ProfileRepository(api)

        assertEquals(Resource.Success(profile), repository.getProfile())
        assertEquals(31, SessionManager.currentUserId)
        assertEquals("Марія Іваненко", SessionManager.currentUserName)
        assertTrue(SessionManager.isVolunteer)

        coEvery { api.getProfile() } returns Response.error(
            500,
            """{"message":"Failure"}""".toResponseBody("application/json".toMediaType())
        )
        assertEquals(Resource.Error("Не вдалося завантажити профіль", 500), repository.getProfile())
    }

    @Test
    fun dateFormatterHandlesNullAndMalformedInput() {
        assertEquals(null, formatIsoDate(null))
        assertEquals(null, formatIsoDate(" "))
        assertEquals("2026-11-08", formatIsoDate("2026-11-08-not-an-iso-date"))
    }
}
