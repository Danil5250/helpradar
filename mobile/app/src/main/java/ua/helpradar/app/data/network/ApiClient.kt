package ua.helpradar.app.data.network

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import ua.helpradar.app.data.network.api.AnnouncementApiService
import ua.helpradar.app.data.network.api.AuthApiService
import ua.helpradar.app.data.network.api.GeocodingApiService
import ua.helpradar.app.data.network.api.ProfileApiService

object ApiClient {
    // Якщо запускаєте на Android емуляторі, використовуйте 10.0.2.2 замість localhost,
    // оскільки localhost всередині емулятора вказує на сам віртуальний телефон.
    private const val BASE_URL = "http://10.0.2.2:3000/"

    private val cookieStore = mutableMapOf<String, List<Cookie>>()

    private val cookieJar = object : CookieJar {
        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            cookieStore[url.host] = cookies
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> {
            return cookieStore[url.host] ?: emptyList()
        }
    }

    fun clearCookies() {
        cookieStore.clear()
    }

    private val logging = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .cookieJar(cookieJar)
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .header("Origin", "http://localhost:3000")
                .build()
            chain.proceed(request)
        }
        .addInterceptor(logging)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .client(okHttpClient)
        .build()

    val authService: AuthApiService by lazy {
        retrofit.create(AuthApiService::class.java)
    }

    val announcementApiService: AnnouncementApiService by lazy {
        retrofit.create(AnnouncementApiService::class.java)
    }

    val geocodingService: GeocodingApiService by lazy {
        retrofit.create(GeocodingApiService::class.java)
    }

    val profileService: ProfileApiService by lazy {
        retrofit.create(ProfileApiService::class.java)
    }

    fun resolveMediaUrl(url: String?): String? {
        if (url.isNullOrBlank()) return null
        return if (url.startsWith("http://") || url.startsWith("https://")) {
            url
        } else {
            // Додаємо хост бекенду (для емулятора Android це 10.0.2.2:3000)
            "http://10.0.2.2:3000${if (url.startsWith("/")) "" else "/"}$url"
        }
    }
}