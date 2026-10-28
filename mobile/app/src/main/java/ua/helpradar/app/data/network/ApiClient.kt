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

object ApiClient {
    private const val BASE_URL = "http://localhost:3000/"

    private val cookieJar = object : CookieJar {
        private val cookieStore = mutableMapOf<String, List<Cookie>>()

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            cookieStore[url.host] = cookies
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> {
            return cookieStore[url.host] ?: emptyList()
        }
    }

    private val logging = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .cookieJar(cookieJar)
        // Додаємо інтерсептор для Origin та заголовків
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .header("Origin", "http://localhost:3000") // Дозволений Origin для бекенду
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

    val authService: AuthApiService = retrofit.create(AuthApiService::class.java)
    val announcementService: AnnouncementApiService = retrofit.create(AnnouncementApiService::class.java)
}