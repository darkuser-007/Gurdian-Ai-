package com.guardianai.app

/**
 * Conservative exact-match normalization. Fuzzy suffix matching is avoided so
 * a similarly ending number is never blocked by accident.
 */
object PhoneNumberNormalizer {
    fun normalize(raw: String): String {
        val trimmed = raw.trim()
        val digits = trimmed.filter(Char::isDigit)
        val prefix = if (trimmed.startsWith("+")) "+" else ""
        return prefix + digits
    }

    fun isValid(raw: String): Boolean {
        val normalized = normalize(raw)
        val digitCount = normalized.count(Char::isDigit)
        return digitCount in 7..15 && normalized.any(Char::isDigit)
    }

    fun matches(blockedNumber: String, incomingNumber: String): Boolean {
        if (!isValid(blockedNumber) || !isValid(incomingNumber)) return false
        return normalize(blockedNumber) == normalize(incomingNumber)
    }
}
