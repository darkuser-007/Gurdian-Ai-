package com.guardianai.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CallScreeningPolicyTest {
    private val blocklist = setOf("+919876543210", "02012345678")

    @Test
    fun rejectsOnlyIncomingExactNumberMatches() {
        assertTrue(CallScreeningPolicy.shouldReject(true, "+91 98765 43210", blocklist))
        assertTrue(CallScreeningPolicy.shouldReject(true, "020 1234 5678", blocklist))
    }

    @Test
    fun allowsOutgoingCallsEvenWhenNumberIsBlocked() {
        assertFalse(CallScreeningPolicy.shouldReject(false, "+919876543210", blocklist))
    }

    @Test
    fun allowsUnknownPrivateAndMalformedNumbers() {
        assertFalse(CallScreeningPolicy.shouldReject(true, null, blocklist))
        assertFalse(CallScreeningPolicy.shouldReject(true, "private", blocklist))
        assertFalse(CallScreeningPolicy.shouldReject(true, "12345", blocklist))
    }

    @Test
    fun allowsNumbersNotPresentInTheBlocklist() {
        assertFalse(CallScreeningPolicy.shouldReject(true, "+919876543211", blocklist))
    }
}
