package ua.helpradar.app.data.local

object SessionManager {
    // Роль користувача: "person_in_need" або "volunteer"
    var currentUserRole: String = "person_in_need"
    var currentUserName: String = ""
    var currentUserLastName: String = ""
    var currentUserEmail: String = ""
    var currentUserId: Int? = null

    val isVolunteer: Boolean
        get() = currentUserRole.equals("volunteer", ignoreCase = true)

    val userInitial: String
        get() = currentUserName.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "К"

    fun clear() {
        currentUserRole = "person_in_need"
        currentUserName = ""
        currentUserLastName = ""
        currentUserEmail = ""
        currentUserId = null
    }
}