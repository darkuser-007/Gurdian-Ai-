package com.guardianai.app

import android.telecom.Call
import android.telecom.CallScreeningService

/**
 * Receives call metadata from Android Telecom after the user grants the
 * ROLE_CALL_SCREENING role. No audio is captured or analyzed here.
 */
class GuardianCallScreeningService : CallScreeningService() {
    override fun onScreenCall(callDetails: Call.Details) {
        val shouldReject = try {
            val incoming = callDetails.callDirection == Call.Details.DIRECTION_INCOMING
            val phoneNumber = callDetails.handle?.schemeSpecificPart
            incoming && BlocklistStore.isBlocked(this, phoneNumber)
        } catch (_: Exception) {
            // Fail open: a local metadata/storage error must not reject a call.
            false
        }

        val response = CallResponse.Builder()
            .setDisallowCall(shouldReject)
            .setRejectCall(shouldReject)
            // Keep rejected calls visible in Android's call history.
            .setSkipCallLog(false)
            .setSkipNotification(false)
            .build()

        respondToCall(callDetails, response)
    }
}
