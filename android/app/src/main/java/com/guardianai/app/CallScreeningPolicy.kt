package com.guardianai.app

/**
 * Pure policy for call screening. It deliberately blocks only exact matches
 * from the user's local list and otherwise fails open.
 */
object CallScreeningPolicy {
    fun shouldReject(
        isIncomingCall: Boolean,
        incomingNumber: String?,
        blockedNumbers: Set<String>
    ): Boolean {
        if (!isIncomingCall || incomingNumber.isNullOrBlank()) return false
        if (!PhoneNumberNormalizer.isValid(incomingNumber)) return false
        return blockedNumbers.any { PhoneNumberNormalizer.matches(it, incomingNumber) }
    }
}
