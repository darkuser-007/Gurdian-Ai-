package com.guardianai.app

import android.content.Context

/**
 * Device-local storage for the user's explicit caller blocklist.
 * Always copy SharedPreferences string sets before mutating them.
 */
object BlocklistStore {
    private const val PREFERENCES = "guardian_call_screening"
    private const val BLOCKED_NUMBERS = "blocked_numbers"

    private fun preferences(context: Context) =
        context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    fun getBlockedNumbers(context: Context): Set<String> =
        preferences(context).getStringSet(BLOCKED_NUMBERS, emptySet()).orEmpty().toSet()

    fun add(context: Context, rawNumber: String): Boolean {
        if (!PhoneNumberNormalizer.isValid(rawNumber)) return false
        val normalized = PhoneNumberNormalizer.normalize(rawNumber)
        val updated = getBlockedNumbers(context).toMutableSet()
        if (!updated.add(normalized)) return false
        preferences(context).edit().putStringSet(BLOCKED_NUMBERS, updated).apply()
        return true
    }

    fun remove(context: Context, normalizedNumber: String) {
        val updated = getBlockedNumbers(context).toMutableSet()
        if (updated.remove(normalizedNumber)) {
            preferences(context).edit().putStringSet(BLOCKED_NUMBERS, updated).apply()
        }
    }

    fun clear(context: Context) {
        preferences(context).edit().remove(BLOCKED_NUMBERS).apply()
    }

    fun isBlocked(context: Context, incomingNumber: String?): Boolean {
        if (incomingNumber.isNullOrBlank() || !PhoneNumberNormalizer.isValid(incomingNumber)) return false
        return getBlockedNumbers(context).contains(PhoneNumberNormalizer.normalize(incomingNumber))
    }
}
