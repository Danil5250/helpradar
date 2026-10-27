package ua.helpradar.app.data.network.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

import ua.helpradar.app.data.network.dto.LoginRequest
import ua.helpradar.app.data.network.dto.AuthResponse
import ua.helpradar.app.data.network.dto.RegisterRequest
import ua.helpradar.app.data.network.dto.RegisterResponse

interface AuthApiService {
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<RegisterResponse>
}